import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { searchArtifacts } from '@/utils/artifactSearch';
import { sendChatQuery, streamChatQuery } from '@/services/aiChatService';
import { MarkdownMessage } from '@/components/ai/MarkdownMessage';
import {
  Bot,
  Sparkles,
  X,
  Send,
  Eye,
  RefreshCw,
  Copy,
  Check,
  RotateCcw,
  BookOpen,
  ChevronDown,
  ChevronUp,
  User,
  Compass,
  ImagePlus
} from 'lucide-react';

export const MuseumAI = () => {
  const navigate = useNavigate();
  const { artifacts, events, tickets } = useApp();

  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState(null);
  const [expandedSources, setExpandedSources] = useState({});
  // Trạng thái streaming
  const [streamingText, setStreamingText] = useState('');
  const [streamingMsgId, setStreamingMsgId] = useState(null);
  const abortStreamRef = useRef(null);

  // Kích thước widget
  const [dimensions, setDimensions] = useState({ w: 380, h: 600 });
  const isDragging = useRef(false);

  const handleMouseDown = (e) => {
    e.preventDefault();
    isDragging.current = true;
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = (e) => {
    if (!isDragging.current) return;
    requestAnimationFrame(() => {
      setDimensions({
        w: Math.min(Math.max(380, window.innerWidth - e.clientX - 20), window.innerWidth * 0.95),
        h: Math.min(Math.max(600, window.innerHeight - e.clientY - 20), window.innerHeight * 0.9)
      });
    });
  };

  const handleMouseUp = () => {
    isDragging.current = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  // Hiệu ứng cuộn gợi ý
  const [activePromptIdx, setActivePromptIdx] = useState(0);

  const handlePromptScroll = (e) => {
    const container = e.target;
    const scrollLeft = container.scrollLeft;
    let minDiff = Infinity;
    let newActive = 0;
    Array.from(container.children).forEach((child, idx) => {
      const diff = Math.abs(child.offsetLeft - container.offsetLeft - scrollLeft);
      if (diff < minDiff) {
        minDiff = diff;
        newActive = idx;
      }
    });
    if (newActive !== activePromptIdx) {
      setActivePromptIdx(newActive);
    }
  };

  // Gợi ý câu hỏi tiêu biểu, gần gũi và thú vị
  const suggestedPrompts = [
    'Gợi ý lộ trình tham quan 1 ngày thú vị',
    'Trống đồng Cảnh Thịnh được đúc năm nào?',
    'Kể câu chuyện về cuốn sách Đường Kách mệnh',
    'Giá vé & giờ mở cửa đón khách',
  ];

  // Tin nhắn chào mừng ban đầu thân thiện, tự nhiên
  const initialWelcomeMessage = {
    id: 'welcome-1',
    sender: 'ai',
    text: `Xin chào bạn! Mình là **Trợ lý AI của Bảo tàng Lịch sử Quốc gia Việt Nam** 🏛️✨\n\nMình rất vui được đồng hành cùng bạn khám phá dòng chảy lịch sử và những bảo vật vô giá của dân tộc. Bạn có thể:\n- 💬 Trò chuyện, hỏi han lịch sử hoặc nhờ mình gợi ý lộ trình tham quan phù hợp.\n- 🏺 Khám phá chi tiết các **Bảo vật Quốc gia** (Trống đồng Đông Sơn, Cảnh Thịnh, Ấn vàng triều Nguyễn...).\n- 🎫 Tra cứu giờ mở cửa, giá vé và các sự kiện triển lãm nổi bật.\n\nHôm nay bạn muốn tìm hiểu điều gì, hay cần mình gợi ý một góc trưng bày thú vị nhé? 😊`,
    sources: [],
    artifacts: [],
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  };

  const [messages, setMessages] = useState([initialWelcomeMessage]);
  const chatEndRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);

  // Auto scroll xuống tin nhắn mới nhất
  useEffect(() => {
    if (isOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isSearching]);

  // Focus ô nhập khi mở widget
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 200);
    }
  }, [isOpen]);

  // Xử lý gửi tin nhắn kèm lịch sử hội thoại
  const handleSendMessage = async (queryText) => {
    const textToSend = (queryText || inputText).trim();
    if (!textToSend || isSearching) return;

    // Hủy stream cũ nếu đang chạy
    if (abortStreamRef.current) {
      abortStreamRef.current();
      abortStreamRef.current = null;
    }

    const userMsgId = `user-${Date.now()}`;
    const aiMsgId = `ai-${Date.now()}`;
    const userMsg = {
      id: userMsgId,
      sender: 'user',
      text: textToSend,
      sources: [],
      artifacts: [],
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const currentHistory = [...messages, userMsg];
    setMessages(currentHistory);
    if (!queryText) setInputText('');
    setIsSearching(true);
    setStreamingText('');
    setStreamingMsgId(aiMsgId);

    let fullText = '';

    // Thử streaming trước
    const abort = streamChatQuery(
      textToSend,
      messages,
      // onChunk: nhận từng phần văn bản
      (chunk) => {
        fullText += chunk;
        setStreamingText(fullText);
      },
      // onDone: hoàn tất — chốt tin nhắn AI vào danh sách
      () => {
        const aiMsg = {
          id: aiMsgId,
          sender: 'ai',
          text: fullText || '...',
          sources: [],
          artifacts: [],
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, aiMsg]);
        setStreamingText('');
        setStreamingMsgId(null);
        setIsSearching(false);
        abortStreamRef.current = null;
      },
      // onError: fallback về non-streaming
      async (errMsg) => {
        console.warn('[MuseumAI] Stream lỗi, fallback non-stream:', errMsg);
        setStreamingText('');
        setStreamingMsgId(null);

        try {
          const res = await sendChatQuery(textToSend, messages);
          if (res.success && res.answer) {
            const aiMsg = {
              id: aiMsgId,
              sender: 'ai',
              text: res.answer,
              sources: res.sources || [],
              artifacts: [],
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            };
            setMessages((prev) => [...prev, aiMsg]);
          } else {
            // Fallback local search
            const localResult = searchArtifacts(artifacts, textToSend, { events, tickets });
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
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            };
            setMessages((prev) => [...prev, aiMsg]);
          }
        } catch {
          setMessages((prev) => [
            ...prev,
            {
              id: aiMsgId,
              sender: 'ai',
              text: 'Rất tiếc, đã có chút gián đoạn kết nối. Bạn vui lòng thử lại sau giây lát nhé! 🏛️',
              sources: [],
              artifacts: [],
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            },
          ]);
        } finally {
          setIsSearching(false);
          abortStreamRef.current = null;
        }
      }
    );

    abortStreamRef.current = abort;
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const userMsgId = `user-${Date.now()}`;
    const aiMsgId = `ai-${Date.now()}`;

    // Reset input
    e.target.value = '';

    // Tạo URL để hiển thị ảnh tạm thời trên giao diện
    const imageUrl = URL.createObjectURL(file);

    const userMsg = {
      id: userMsgId,
      sender: 'user',
      text: 'Đang tìm kiếm thông tin về hình ảnh này...',
      imageUrl: imageUrl, // Lưu link ảnh để render
      sources: [],
      artifacts: [],
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsSearching(true);
    
    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const formData = new FormData();
      formData.append('file', file);
      
      // Thêm query parameter match_count=1 để chỉ lấy 1 kết quả duy nhất
      const response = await fetch(`${API_BASE_URL}/api/hien-vat/image-search?match_count=1`, {
        method: 'POST',
        body: formData,
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        const results = data.results || [];
        const aiMsg = {
          id: aiMsgId,
          sender: 'ai',
          text: results.length > 0 
            ? `Dựa trên hình ảnh bạn tải lên, tôi xác định đây là hiện vật:` 
            : 'Rất tiếc, tôi không tìm thấy hiện vật nào giống với hình ảnh bạn gửi.',
          sources: [],
          artifacts: results,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, aiMsg]);
      } else {
        throw new Error(data.detail || 'Lỗi tìm kiếm');
      }
    } catch (error) {
      console.error('Image search error:', error);
      setMessages((prev) => [...prev, {
        id: aiMsgId,
        sender: 'ai',
        text: 'Rất tiếc, có lỗi xảy ra khi xử lý hình ảnh của bạn.',
        sources: [],
        artifacts: [],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }]);
    } finally {
      setIsSearching(false);
    }
  };

  // Nút New Chat: Làm mới phiên trò chuyện
  const handleNewChat = () => {
    setMessages([
      {
        ...initialWelcomeMessage,
        id: `welcome-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
    setInputText('');
  };

  // Nút Copy câu trả lời
  const handleCopy = (msgId, text) => {
    navigator.clipboard.writeText(text);
    setCopiedMessageId(msgId);
    setTimeout(() => {
      setCopiedMessageId(null);
    }, 2000);
  };

  // Ẩn/Hiện nguồn RAG
  const toggleSourceExpand = (msgId) => {
    setExpandedSources((prev) => ({
      ...prev,
      [msgId]: !prev[msgId],
    }));
  };

  const handleViewArtifactDetail = (artifact) => {
    setIsOpen(false);
    navigate(`/artifacts/${artifact.id}`);
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 font-sans select-none">
      {/* 1. NÚT NỔI "TRỢ LÝ AI" Ở GÓC PHẢI MÀN HÌNH */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="group relative flex items-center gap-3 px-4 py-3 bg-museum-brown hover:bg-museum-brown-dk text-white font-bold rounded-2xl shadow-2xl border border-museum-gold/50 transition-all duration-300 transform hover:scale-105 active:scale-95 cursor-pointer"
          title="Mở Trợ lý AI - Khám phá bảo tàng (24/7)"
        >
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-museum-gold flex items-center justify-center text-white shadow-md group-hover:rotate-12 transition-transform duration-300">
              <Bot className="w-6 h-6" />
            </div>
            <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-museum-gold-lt opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-museum-gold-lt border-2 border-museum-brown"></span>
            </span>
          </div>

          <div className="text-left hidden sm:block">
            <div className="text-xs font-extrabold text-museum-gold-lt uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" /> TRỢ LÝ AI
            </div>
            <div className="text-[11px] text-museum-cream/90 font-medium">Khám phá bảo tàng</div>
          </div>
        </button>
      )}

      {/* 2. CỬA SỔ CHATBOT DẠNG FLOATING WIDGET (RESIZABLE) */}
      {isOpen && (
        <div 
          className="bg-white rounded-3xl shadow-2xl border border-museum-gold/40 flex flex-col overflow-hidden animate-fadeIn pointer-events-auto relative"
          style={{ 
            width: `${dimensions.w}px`, 
            height: `${dimensions.h}px`,
            minWidth: '380px',
            minHeight: '600px',
            maxWidth: 'calc(100vw - 2.5rem)',
            maxHeight: '90vh'
          }}
        >
          {/* Resize Handle */}
          <div 
            onMouseDown={handleMouseDown}
            className="absolute top-0 left-0 w-8 h-8 cursor-nwse-resize z-50 flex items-start justify-start p-2 opacity-60 hover:opacity-100 transition-opacity"
            title="Kéo để thay đổi kích thước"
          >
            <div className="w-2.5 h-2.5 border-t-[2.5px] border-l-[2.5px] border-white rounded-[2px] pointer-events-none" />
          </div>

          {/* HEADER CHATBOT */}
          <div className="bg-museum-brown text-white pl-8 pr-4 py-3.5 flex items-center justify-between shadow-md relative border-b border-museum-gold/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-museum-gold flex items-center justify-center text-white shadow-xs">
                <Bot className="w-6 h-6" />
              </div>
              <div className="text-left">
                <div className="flex items-center gap-1.5">
                  <h3 className="font-extrabold text-sm text-white tracking-wide">Trợ lý AI</h3>
                  <span className="bg-museum-gold/30 text-museum-gold-lt text-[10px] font-bold px-1.5 py-0.2 rounded-md border border-museum-gold/40 flex items-center gap-0.5">
                    <Sparkles className="w-2.5 h-2.5" /> RAG
                  </span>
                </div>
                <p className="text-[11px] text-museum-cream/90 font-normal">
                  Bảo tàng Quốc gia Việt Nam
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {/* Nút New Chat */}
              <button
                onClick={handleNewChat}
                className="p-1.5 hover:bg-white/15 rounded-xl text-museum-cream hover:text-white transition-colors cursor-pointer"
                title="Bắt đầu cuộc trò chuyện mới"
              >
                <RotateCcw className="w-4.5 h-4.5" />
              </button>

              {/* Nút Đóng */}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 hover:bg-white/15 rounded-xl text-museum-cream hover:text-white transition-colors cursor-pointer"
                title="Đóng cửa sổ chat"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* VÙNG DANH SÁCH TIN NHẮN (MESSAGES CONTAINER) */}
          <div className="flex-1 p-3.5 overflow-y-auto space-y-3.5 bg-museum-ivory/60">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div className="flex items-start gap-2 max-w-[92%]">
                  {msg.sender === 'ai' && (
                    <div className="w-7 h-7 rounded-lg bg-museum-brown flex items-center justify-center text-museum-gold-lt flex-shrink-0 mt-0.5 shadow-2xs">
                      <Bot className="w-4 h-4" />
                    </div>
                  )}

                  <div className="flex flex-col flex-1 min-w-0">
                    {/* KHỐI NỘI DUNG TIN NHẮN */}
                    <div
                      className={`p-3.5 rounded-2xl text-xs sm:text-[13px] leading-relaxed shadow-2xs relative group ${
                        msg.sender === 'user'
                          ? 'bg-museum-brown text-white rounded-tr-none font-medium ml-auto'
                          : 'bg-white text-gray-800 rounded-tl-none border border-museum-gold/20 font-normal'
                      }`}
                    >
                      {msg.sender === 'user' ? (
                        <div className="flex flex-col items-end gap-2">
                          {msg.imageUrl && (
                            <img 
                              src={msg.imageUrl} 
                              alt="Uploaded" 
                              className="max-w-[200px] max-h-[200px] object-cover rounded-lg border border-museum-gold/30 shadow-sm"
                            />
                          )}
                          <p className="whitespace-pre-wrap">{msg.text}</p>
                        </div>
                      ) : (
                        <MarkdownMessage content={msg.text} />
                      )}

                      {/* NÚT COPY CÂU TRẢ LỜI CHO TIN NHẮN AI */}
                      {msg.sender === 'ai' && (
                        <div className="mt-2.5 pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400">
                          <span className="text-[10px] text-gray-400">{msg.timestamp}</span>
                          <button
                            onClick={() => handleCopy(msg.id, msg.text)}
                            className="flex items-center gap-1 text-[11px] font-semibold text-museum-brown hover:text-museum-gold transition-colors px-2 py-0.5 rounded-md hover:bg-museum-cream/50 cursor-pointer"
                            title="Sao chép câu trả lời"
                          >
                            {copiedMessageId === msg.id ? (
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
                      )}
                    </div>



                    {/* HIỂN THỊ CARD HIỆN VẬT LIÊN QUAN (NẾU CÓ) */}
                    {msg.artifacts && msg.artifacts.length > 0 && (
                      <div className="mt-2 space-y-2">
                        {msg.artifacts.map((art) => (
                          <div
                            key={art.id}
                            className="bg-white rounded-xl p-2.5 border border-museum-gold/30 shadow-2xs text-left"
                          >
                            <div className="flex gap-2.5">
                              <img
                                src={art.image || './images/museum-hero.jpg'}
                                alt={art.name}
                                onError={(e) => {
                                  e.target.src = './images/museum-hero.jpg';
                                }}
                                className="w-14 h-14 object-cover rounded-lg flex-shrink-0 bg-gray-100"
                              />
                              <div className="flex-1 min-w-0">
                                <h4 className="font-bold text-xs text-museum-brown truncate">
                                  {art.name}
                                </h4>
                                {art.period && (
                                  <div className="text-[10px] text-museum-gold font-semibold truncate">
                                    {art.period}
                                  </div>
                                )}
                                <p className="text-[10px] text-gray-500 line-clamp-1 mt-0.5">
                                  {art.description}
                                </p>
                              </div>
                            </div>
                            <button
                              onClick={() => handleViewArtifactDetail(art)}
                              className="mt-2 w-full py-1 bg-museum-brown hover:bg-museum-brown-dk text-white font-bold text-[10px] rounded-md transition-colors flex items-center justify-center gap-1 cursor-pointer"
                            >
                              <Eye className="w-3 h-3 text-museum-gold-lt" />
                              <span>Xem chi tiết</span>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {msg.sender === 'user' && (
                    <div className="w-7 h-7 rounded-lg bg-museum-gold flex items-center justify-center text-white flex-shrink-0 mt-0.5 shadow-2xs">
                      <User className="w-4 h-4" />
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* STREAMING TYPING BUBBLE — hiển thị khi đang nhận chunk từ stream */}
            {streamingMsgId && streamingText && (
              <div className="flex items-start gap-2 max-w-[92%]">
                <div className="w-7 h-7 rounded-lg bg-museum-brown flex items-center justify-center text-museum-gold-lt flex-shrink-0 mt-0.5 shadow-2xs">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="flex flex-col flex-1 min-w-0">
                  <div className="p-3.5 rounded-2xl rounded-tl-none text-xs sm:text-[13px] leading-relaxed shadow-2xs bg-white text-gray-800 border border-museum-gold/20 font-normal">
                    <MarkdownMessage content={streamingText} />
                    <span className="inline-block w-1.5 h-3.5 ml-0.5 bg-museum-gold rounded-sm animate-pulse align-middle" />
                  </div>
                </div>
              </div>
            )}

            {/* LOADING ANIMATION (KHI AI ĐANG SUY NGHĨ / TÌM KIẾM RAG) */}
            {isSearching && !streamingText && (
              <div className="flex items-center gap-2 max-w-[85%]">
                <div className="w-7 h-7 rounded-lg bg-museum-brown flex items-center justify-center text-museum-gold-lt flex-shrink-0 shadow-2xs">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="bg-white p-3 rounded-2xl rounded-tl-none border border-museum-gold/30 shadow-2xs flex items-center gap-2 text-xs font-semibold text-museum-brown">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-museum-gold" />
                  <span>Trợ lý AI đang suy nghĩ và tra cứu tư liệu...</span>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* GỢI Ý CÂU HỎI NHANH (CUỘN NGANG) */}
          {!isSearching && (
            <div className="px-3 pb-3 pt-1 bg-transparent relative z-10">
              <div 
                className="flex items-center gap-2.5 overflow-x-auto pb-2 pt-1 scrollbar-hide snap-x snap-mandatory scroll-smooth"
                style={{ WebkitMaskImage: 'linear-gradient(to right, transparent, black 5%, black 95%, transparent)' }}
                onScroll={handlePromptScroll}
              >
                {suggestedPrompts.map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(prompt)}
                    className={`whitespace-nowrap snap-center shrink-0 text-[11.5px] font-medium px-4 py-2 rounded-2xl transition-all duration-300 cursor-pointer shadow-sm border ${
                      idx === activePromptIdx 
                        ? 'bg-museum-gold/20 text-museum-brown border-museum-gold/40 opacity-100 scale-105' 
                        : 'bg-white/50 text-museum-brown/60 border-transparent opacity-50 hover:opacity-100 hover:bg-museum-gold/10'
                    }`}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* KHUNG NHẬP CÂU HỎI & NÚT GỬI */}
          <div className="p-3 bg-white border-t border-gray-100">
            <div className="flex items-center gap-2 bg-gray-50 rounded-2xl p-1.5 border border-gray-200 focus-within:border-museum-gold focus-within:bg-white focus-within:ring-2 focus-within:ring-museum-gold/20 transition-all">
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleImageUpload} 
                accept="image/*" 
                className="hidden" 
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isSearching}
                className="p-2 rounded-xl text-gray-500 hover:text-museum-brown hover:bg-gray-200 transition-colors cursor-pointer flex-shrink-0"
                title="Tải ảnh lên để tìm kiếm hiện vật"
              >
                <ImagePlus className="w-4.5 h-4.5" />
              </button>
              <input
                ref={inputRef}
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Trò chuyện, tải ảnh lên để tìm kiếm..."
                className="w-full px-1 py-1.5 bg-transparent text-xs text-gray-800 focus:outline-none"
                disabled={isSearching}
              />
              <button
                onClick={() => handleSendMessage()}
                disabled={!inputText.trim() || isSearching}
                className={`p-2.5 rounded-xl text-white font-bold transition-all cursor-pointer flex-shrink-0 ${
                  !inputText.trim() || isSearching
                    ? 'bg-gray-300 cursor-not-allowed text-gray-400'
                    : 'bg-museum-brown hover:bg-museum-brown-dk active:scale-95 shadow-md text-museum-gold-lt'
                }`}
                title="Gửi câu hỏi (Enter)"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            <div className="text-[9px] text-gray-400 text-center mt-1.5 font-medium">
              Trợ lý AI Bảo tàng Quốc gia • Tích hợp RAG & Google Gemini
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
