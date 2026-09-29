import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot, Send, Plus, MessageSquare, User, Sparkles, Copy, Check, BookOpen, RefreshCw, ChevronDown, ChevronUp, Compass } from 'lucide-react';
import { sendChatQuery, streamChatQuery } from '@/services/aiChatService';
import { MarkdownMessage } from '@/components/ai/MarkdownMessage';
import { ChatArtifactCards } from '@/components/ai/ChatArtifactCards';
import { ArtifactDetailModal } from '@/components/artifacts/ArtifactDetailModal';
import { searchArtifacts } from '@/utils/artifactSearch';
import { getFollowUps } from '@/utils/followUpSuggestions';
import { useApp } from '@/context/AppContext';

export const AiAssistant = () => {
  const navigate = useNavigate();
  const { artifacts, events, tickets } = useApp();
  const [selectedArtifact, setSelectedArtifact] = useState(null);
  const [streamingText, setStreamingText] = useState('');
  const [streamingMsgId, setStreamingMsgId] = useState(null);
  const abortStreamRef = useRef(null);
  const [chatHistory, setChatHistory] = useState([
    { id: 1, title: 'Tìm hiểu Trống đồng Cảnh Thịnh', date: 'Hôm nay' },
    { id: 2, title: 'Gợi ý lộ trình tham quan 1 ngày', date: 'Hôm nay' },
    { id: 3, title: 'Bảo vật Quốc gia thời Đông Sơn', date: 'Hôm qua' },
  ]);

  const [activeChatId, setActiveChatId] = useState(1);
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'ai',
      text: 'Xin chào bạn! Mình là **Trợ lý AI của Bảo tàng Lịch sử Quốc gia Việt Nam** 🏛️✨\n\nMình rất vui được đồng hành cùng bạn khám phá lịch sử, hiện vật và văn hóa dân tộc. Bạn có thể thoải mái:\n- 💬 Trò chuyện, đặt câu hỏi lịch sử hoặc nhờ mình gợi ý lộ trình tham quan phù hợp.\n- 🏺 Khám phá chi tiết các **Bảo vật Quốc gia** và cổ vật quý giá qua các triều đại.\n- 🎫 Tra cứu giờ mở cửa, giá vé và các dịch vụ tham quan.\n\nHãy nhập câu hỏi hoặc chọn một trong các gợi ý bên dưới để cùng bắt đầu nhé! 😊',
      sources: [],
    },
  ]);

  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [expandedSources, setExpandedSources] = useState({});
  const chatEndRef = useRef(null);

  const currentSuggests = React.useMemo(() => {
    if (messages.length <= 1) return getFollowUps({});
    const lastAiMsg = [...messages].reverse().find(m => m.sender === 'ai');
    const lastUserMsg = [...messages].reverse().find(m => m.sender === 'user');
    return getFollowUps({
      userText: lastUserMsg?.text,
      aiText: lastAiMsg?.text,
      artifacts: lastAiMsg?.artifacts,
      history: messages
    });
  }, [messages]);

  const handlePromptClick = (prompt) => {
    if (prompt === "Đặt vé ngay") {
      navigate("/tickets");
      return;
    }
    handleSend(prompt);
  };

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = async (customQuery) => {
    const query = (customQuery || input).trim();
    if (!query || isTyping) return;

    if (abortStreamRef.current) {
      abortStreamRef.current();
      abortStreamRef.current = null;
    }

    const userMsgId = Date.now();
    const aiMsgId = Date.now() + 1;
    const userMsg = {
      id: userMsgId,
      sender: 'user',
      text: query,
      sources: [],
      artifacts: [],
    };

    const currentHistory = [...messages, userMsg];
    setMessages(currentHistory);
    if (!customQuery) setInput('');
    setIsTyping(true);
    setStreamingText('');
    setStreamingMsgId(aiMsgId);

    let fullText = '';
    let artifactIds = [];

    const abort = streamChatQuery(
      query,
      messages,
      (chunk) => {
        fullText += chunk;
        setStreamingText(fullText);
      },
      // onDone callback
      () => {
        const aiMsgText = fullText.trim();
        const isErrorString = aiMsgText.includes('Mình đang gặp một chút gián đoạn khi kết nối với AI');
        
        if (isErrorString) {
          abortStreamRef.current = null;
          throw new Error('AI_CONNECTION_ERROR');
        }

        const mappedArtifacts = artifactIds.map(id => artifacts.find(a => a.id === id)).filter(Boolean);
        const aiMsg = {
          id: aiMsgId,
          sender: 'ai',
          text: fullText || '...',
          sources: [],
          artifacts: mappedArtifacts,
        };
        setMessages((prev) => [...prev, aiMsg]);
        setStreamingText('');
        setStreamingMsgId(null);
        setIsTyping(false);
        abortStreamRef.current = null;
      },
      // onError callback
      async (errMsg) => {
        console.warn('[AiAssistant] Stream lỗi, fallback non-stream:', errMsg);
        setStreamingText('');
        setStreamingMsgId(null);

        try {
          const res = await sendChatQuery(query, messages);
          if (res.success && res.answer && !res.answer.includes('Mình đang gặp một chút gián đoạn khi kết nối với AI')) {
            const mappedArtifacts = (res.artifactIds || []).map(id => artifacts.find(a => a.id === id)).filter(Boolean);
            const aiMsg = {
              id: aiMsgId,
              sender: 'ai',
              text: res.answer,
              sources: res.sources || [],
              artifacts: mappedArtifacts,
            };
            setMessages((prev) => [...prev, aiMsg]);
          } else {
            const localResult = searchArtifacts(artifacts, query, { events, tickets });
            const aiMsg = {
              id: aiMsgId,
              sender: 'ai',
              text: localResult.message,
              sources: (localResult.matchedArtifacts || []).map((art) => ({
                title: art.name,
                category: art.period || 'Hiện vật bảo tàng',
                snippet: art.description,
                period: art.period || '',
              })),
              artifacts: localResult.matchedArtifacts || [],
            };
            setMessages((prev) => [...prev, aiMsg]);
          }
        } catch (err) {
          console.error(err);
          const aiMsg = {
            id: aiMsgId,
            sender: 'ai',
            text: 'Đã xảy ra lỗi kết nối. Vui lòng kiểm tra lại dịch vụ backend.',
            sources: [],
            artifacts: [],
          };
          setMessages((prev) => [...prev, aiMsg]);
        } finally {
          setIsTyping(false);
          abortStreamRef.current = null;
        }
      },
      (ids) => {
        artifactIds = ids;
      }
    );

    abortStreamRef.current = abort;
  };

  const startNewChat = () => {
    const newId = Date.now();
    setChatHistory([
      { id: newId, title: 'Cuộc trò chuyện mới', date: 'Vừa xong' },
      ...chatHistory,
    ]);
    setActiveChatId(newId);
    setMessages([
      {
        id: 1,
        sender: 'ai',
        text: 'Xin chào bạn! Hôm nay bạn muốn cùng mình tìm hiểu về hiện vật hay câu chuyện lịch sử nào nhé? 😊',
        sources: [],
      },
    ]);
  };

  const handleCopy = (id, text) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleSource = (id) => {
    setExpandedSources((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="space-y-4 animate-fadeIn max-w-7xl mx-auto">
      <ArtifactDetailModal
        artifact={selectedArtifact}
        isOpen={!!selectedArtifact}
        onClose={() => setSelectedArtifact(null)}
      />
      <div className="text-xs font-semibold text-gray-500">
        Khám phá / <span className="text-museum-brown font-bold">Trợ lý AI Di sản (RAG)</span>
      </div>

      {/* 2-Column AI Layout */}
      <div className="bg-white rounded-3xl shadow-xl border border-museum-gold/30 overflow-hidden flex flex-col md:flex-row h-[78vh]">
        {/* Left History Sidebar */}
        <div className="w-full md:w-72 bg-museum-ivory border-r border-museum-gold/20 p-4 flex flex-col justify-between">
          <div>
            <button
              onClick={startNewChat}
              className="w-full py-3 px-4 bg-museum-brown hover:bg-museum-brown-dk text-white text-xs font-bold rounded-2xl flex items-center justify-center gap-2 shadow-md transition-all mb-4 border border-museum-gold/40 cursor-pointer"
            >
              <Plus className="w-4 h-4 text-museum-gold-lt" />
              <span>+ Cuộc trò chuyện mới</span>
            </button>

            <div className="text-[11px] font-extrabold text-museum-brown uppercase tracking-wider mb-2.5 px-1 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-museum-gold" />
              Lịch sử trò chuyện
            </div>
            <div className="space-y-1.5 overflow-y-auto max-h-[48vh] pr-1">
              {chatHistory.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveChatId(item.id)}
                  className={`w-full text-left px-3.5 py-3 rounded-xl text-xs flex items-center gap-2.5 transition-all cursor-pointer ${
                    activeChatId === item.id
                      ? 'bg-museum-cream font-bold text-museum-brown shadow-xs border border-museum-gold/40'
                      : 'text-gray-700 hover:bg-white/80'
                  }`}
                >
                  <MessageSquare className="w-4 h-4 text-museum-gold flex-shrink-0" />
                  <div className="truncate flex-1">
                    <div className="truncate font-medium">{item.title}</div>
                    <div className="text-[10px] text-gray-400 font-normal">{item.date}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="p-3.5 bg-museum-cream/80 rounded-2xl border border-museum-gold/30 text-center shadow-xs">
            <Sparkles className="w-5 h-5 text-museum-gold mx-auto mb-1.5" />
            <p className="text-xs font-bold text-museum-brown">Trợ Lý AI Tương Tác Tự Nhiên</p>
            <p className="text-[11px] text-gray-600 mt-0.5">Tích hợp RAG ChromaDB & Gemini</p>
          </div>
        </div>

        {/* Main Right Chat Container */}
        <div className="flex-1 flex flex-col justify-between bg-white min-w-0">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-museum-brown flex items-center justify-center text-museum-gold-lt shadow-md">
                <Bot className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-base text-museum-brown">Trợ lý AI Bảo Tàng Quốc Gia</h3>
                  <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                    RAG Trực Tuyến
                  </span>
                </div>
                <p className="text-xs text-gray-500 font-medium">
                  Trò chuyện tự nhiên & giải đáp di sản lịch sử Việt Nam 24/7
                </p>
              </div>
            </div>
          </div>

          {/* Messages Scroll View */}
          <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-museum-ivory/40">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex items-start gap-3 ${
                  msg.sender === 'user' ? 'flex-row-reverse' : ''
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-2xl flex items-center justify-center text-xs flex-shrink-0 shadow-xs ${
                    msg.sender === 'user'
                      ? 'bg-museum-brown text-white'
                      : 'bg-museum-cream text-museum-gold border border-museum-gold/30'
                  }`}
                >
                  {msg.sender === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
                </div>

                <div className="flex flex-col max-w-[82%]">
                  <div
                    className={`p-4 rounded-3xl text-xs sm:text-sm leading-relaxed shadow-xs ${
                      msg.sender === 'user'
                        ? 'bg-museum-brown text-white rounded-tr-none font-medium'
                        : 'bg-white text-gray-800 rounded-tl-none border border-museum-gold/20 font-normal'
                    }`}
                  >
                    {msg.sender === 'user' ? (
                      <p className="whitespace-pre-wrap">{msg.text}</p>
                    ) : (
                      <>
                        <MarkdownMessage content={msg.text} />
                        <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-end">
                          <button
                            onClick={() => handleCopy(msg.id, msg.text)}
                            className="flex items-center gap-1.5 text-xs text-museum-brown hover:text-museum-gold font-semibold transition-colors px-2 py-1 rounded-lg hover:bg-museum-cream/50 cursor-pointer"
                          >
                            {copiedId === msg.id ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                                <span className="text-emerald-600">Đã sao chép</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5 text-museum-gold" />
                                <span>Sao chép</span>
                              </>
                            )}
                          </button>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Sources display */}
                  {msg.sender === 'ai' && msg.sources && msg.sources.length > 0 && (
                    <div className="mt-2 bg-museum-cream/60 border border-museum-gold/30 rounded-2xl p-3 text-xs">
                      <button
                        onClick={() => toggleSource(msg.id)}
                        className="w-full flex items-center justify-between font-bold text-xs text-museum-brown hover:text-museum-gold transition-colors cursor-pointer"
                      >
                        <span className="flex items-center gap-1.5">
                          <BookOpen className="w-4 h-4 text-museum-gold" />
                          <span>Tài liệu tham chiếu RAG ({msg.sources.length})</span>
                        </span>
                        {expandedSources[msg.id] ? (
                          <ChevronUp className="w-4 h-4 text-museum-gold" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-museum-gold" />
                        )}
                      </button>

                      {expandedSources[msg.id] && (
                        <div className="mt-2 space-y-2 pt-2 border-t border-museum-gold/20">
                          {msg.sources.map((src, idx) => (
                            <div key={idx} className="bg-white p-2.5 rounded-xl border border-museum-gold/20 text-xs">
                              <div className="flex items-center justify-between font-bold text-museum-brown">
                                <span>{src.title}</span>
                                {src.relevance && (
                                  <span className="text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                                    {src.relevance}% khớp
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-gray-600 mt-1 italic">
                                "{src.snippet}"
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <ChatArtifactCards 
                    artifacts={msg.artifacts} 
                    onViewDetail={setSelectedArtifact} 
                  />

                  {/* NÚT KỂ CHI TIẾT HƠN */}
                  {msg.sender === 'ai' && (msg.sources?.length > 0 || msg.artifacts?.length > 0) && idx > 0 && messages[idx - 1]?.text && !String(messages[idx - 1].text).toLowerCase().includes('chi tiết') && !isTyping && (
                    <div className="mt-2 text-right">
                      <button
                        onClick={() => handleSend(`Kể chi tiết hơn về: ${messages[idx - 1].text}`)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-semibold text-museum-brown bg-museum-gold/10 hover:bg-museum-gold/20 border border-museum-gold/30 transition-colors cursor-pointer"
                      >
                        <span>Kể chi tiết hơn</span>
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {streamingMsgId && streamingText && (
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-2xl bg-museum-cream flex items-center justify-center text-museum-gold border border-museum-gold/30 flex-shrink-0">
                  <Bot className="w-5 h-5" />
                </div>
                <div className="flex flex-col max-w-[82%]">
                  <div className="p-4 rounded-3xl rounded-tl-none text-xs sm:text-sm leading-relaxed shadow-xs bg-white text-gray-800 border border-museum-gold/20 font-normal">
                    <MarkdownMessage content={streamingText} />
                    <span className="inline-block w-1.5 h-3.5 ml-0.5 bg-museum-gold rounded-sm animate-pulse align-middle" />
                  </div>
                </div>
              </div>
            )}

            {isTyping && !streamingText && (
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl bg-museum-cream flex items-center justify-center text-museum-gold border border-museum-gold/30">
                  <Bot className="w-5 h-5" />
                </div>
                <div className="bg-white px-4 py-3 rounded-2xl border border-museum-gold/20 shadow-xs flex items-center gap-2 text-xs font-semibold text-museum-brown">
                  <RefreshCw className="w-4 h-4 animate-spin text-museum-gold" />
                  <span>Trợ lý AI đang suy nghĩ và tra cứu tư liệu...</span>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Quick Prompts & Input */}
          <div className="p-4 border-t border-gray-100 bg-white space-y-3">
            <div className="flex flex-wrap gap-2">
              {currentSuggests.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => handlePromptClick(prompt)}
                  className="text-xs px-3.5 py-1.5 rounded-full border border-museum-gold/30 text-museum-brown bg-museum-cream/40 hover:bg-museum-gold hover:text-white transition-all font-medium shadow-2xs cursor-pointer"
                >
                  {prompt}
                </button>
              ))}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Trò chuyện, hỏi về hiện vật, triều đại, giờ mở cửa, giá vé..."
                className="flex-1 px-5 py-3.5 bg-gray-50 text-xs sm:text-sm text-gray-800 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-museum-gold focus:bg-white transition-all shadow-inner"
                disabled={isTyping}
              />
              <button
                type="submit"
                disabled={!input.trim() || isTyping}
                className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-md flex-shrink-0 cursor-pointer ${
                  !input.trim() || isTyping
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-museum-brown hover:bg-museum-brown-dk text-white active:scale-95'
                }`}
                title="Gửi câu hỏi"
              >
                <Send className="w-5 h-5 text-museum-gold-lt" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
