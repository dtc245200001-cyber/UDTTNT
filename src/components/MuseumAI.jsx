import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { searchArtifacts } from '@/utils/artifactSearch';
import { Bot, Sparkles, X, Send, Eye, Calendar, MapPin, RefreshCw, MessageSquare } from 'lucide-react';

export const MuseumAI = () => {
  const navigate = useNavigate();
  const { artifacts } = useApp();

  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // 100% Public Suggested Questions for all visitors
  const suggestedPrompts = [
    'Trống đồng Cảnh Thịnh là gì?',
    'Cho tôi biết về các hiện vật thời Tây Sơn',
    'Hiện vật này được trưng bày ở đâu?',
    'Có những hiện vật nào liên quan đến Điện Biên Phủ?',
  ];

  // Initial welcome message (Public)
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'ai',
      text: 'Xin chào! Tôi có thể giúp bạn tìm hiểu về các hiện vật trong bảo tàng. Hãy nhập câu hỏi hoặc chọn một gợi ý bên dưới!',
      artifacts: [],
    },
  ]);

  const chatEndRef = useRef(null);

  // Auto-scroll chat area
  useEffect(() => {
    if (isOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isSearching]);

  const handleSendMessage = (queryText) => {
    const textToSend = queryText || inputText;
    if (!textToSend.trim() || isSearching) return;

    // User message
    const userMsg = {
      id: Date.now(),
      sender: 'user',
      text: textToSend,
      artifacts: [],
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!queryText) setInputText('');
    setIsSearching(true);

    // Simulate search & response without ANY auth requirement
    setTimeout(() => {
      const searchResult = searchArtifacts(artifacts, textToSend);

      const aiMsg = {
        id: Date.now() + 1,
        sender: 'ai',
        text: searchResult.message,
        artifacts: searchResult.matchedArtifacts || [],
      };

      setMessages((prev) => [...prev, aiMsg]);
      setIsSearching(false);
    }, 500);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleViewArtifactDetail = (artifact) => {
    setIsOpen(false);
    navigate(`/artifacts/${artifact.id}`);
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 select-none font-sans">
      {/* 1. FLOATING AI BUTTON (Visible to ALL visitors without login) */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="group relative flex items-center gap-2.5 px-4 py-3 bg-museum-brown hover:bg-museum-brown-dk text-white font-bold rounded-2xl shadow-2xl border border-museum-gold/40 transition-all duration-300 transform hover:scale-105 active:scale-95 cursor-pointer"
          title="Mở Trợ lý AI Bảo tàng (Công khai 24/7)"
        >
          <div className="relative">
            <div className="w-9 h-9 rounded-xl bg-museum-gold flex items-center justify-center text-white shadow-xs group-hover:rotate-12 transition-transform">
              <Bot className="w-5.5 h-5.5" />
            </div>
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-museum-gold-lt opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-museum-gold"></span>
            </span>
          </div>

          <div className="text-left hidden sm:block">
            <div className="text-xs font-extrabold text-museum-gold-lt uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" /> Trợ lý AI
            </div>
            <div className="text-[11px] text-museum-cream/90 font-medium">Khám phá bảo tàng</div>
          </div>
        </button>
      )}

      {/* 2. CHAT WINDOW (Public Q&A) */}
      {isOpen && (
        <div className="w-[calc(100vw-2.5rem)] sm:w-[380px] h-[520px] max-h-[85vh] bg-white rounded-3xl shadow-2xl border border-museum-gold/30 flex flex-col overflow-hidden animate-fadeIn">
          {/* Header */}
          <div className="bg-museum-brown text-white p-4 flex items-center justify-between shadow-md relative">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-museum-gold flex items-center justify-center text-white shadow-xs">
                <Bot className="w-5.5 h-5.5" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-white tracking-wide flex items-center gap-1.5">
                  🤖 Trợ lý Bảo tàng
                  <Sparkles className="w-3.5 h-3.5 text-museum-gold-lt" />
                </h3>
                <p className="text-[11px] text-museum-cream/80 font-normal">
                  Hỏi tôi về các hiện vật và lịch sử (Miễn phí & Công khai)
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 hover:bg-white/10 rounded-xl text-museum-cream hover:text-white transition-colors cursor-pointer"
              title="Đóng chat"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-museum-ivory/50">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                {/* Message Bubble */}
                <div
                  className={`max-w-[88%] p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-museum-brown text-white rounded-tr-none shadow-xs font-medium'
                      : 'bg-white text-gray-800 rounded-tl-none border border-gray-100 shadow-xs'
                  }`}
                >
                  <p>{msg.text}</p>

                  {/* Render Matched Artifact Cards */}
                  {msg.artifacts && msg.artifacts.length > 0 && (
                    <div className="mt-3 space-y-3 pt-2 border-t border-gray-100">
                      {msg.artifacts.map((art) => (
                        <div
                          key={art.id}
                          className="bg-museum-ivory rounded-xl p-3 border border-museum-gold/30 space-y-2 text-left shadow-xs"
                        >
                          <div className="aspect-[16/9] w-full rounded-lg overflow-hidden bg-gray-100 relative">
                            <img
                              src={art.image || './images/museum-hero.jpg'}
                              alt={art.name}
                              onError={(e) => {
                                e.target.src = './images/museum-hero.jpg';
                              }}
                              className="w-full h-full object-cover"
                            />
                            {art.period && (
                              <span className="absolute top-2 left-2 bg-museum-brown/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                                {art.period}
                              </span>
                            )}
                          </div>

                          <div>
                            <h4 className="font-bold text-xs text-museum-brown line-clamp-1">
                              {art.name}
                            </h4>
                            {art.date && (
                              <div className="text-[11px] text-museum-gold font-semibold flex items-center gap-1 mt-0.5">
                                <Calendar className="w-3 h-3" /> Niên đại: {art.date}
                              </div>
                            )}
                            {art.location && (
                              <div className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1 mt-0.5">
                                <MapPin className="w-3 h-3" /> Nơi trưng bày: {art.location}
                              </div>
                            )}
                            <p className="text-[11px] text-gray-600 line-clamp-2 mt-1 font-normal">
                              {art.description}
                            </p>
                          </div>

                          <button
                            onClick={() => handleViewArtifactDetail(art)}
                            className="w-full py-1.5 bg-museum-brown hover:bg-museum-brown-dk text-white font-bold text-[11px] rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5 text-museum-gold-lt" />
                            <span>Xem chi tiết hiện vật</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* AI Searching Status */}
            {isSearching && (
              <div className="flex items-center gap-2 text-xs font-semibold text-museum-brown italic bg-white p-3 rounded-2xl border border-museum-cream shadow-2xs w-fit">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-museum-gold" />
                <span>Đang tìm kiếm thông tin hiện vật...</span>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Suggested Prompts (Shown if <= 2 messages) */}
          {messages.length <= 2 && !isSearching && (
            <div className="px-3 py-2 bg-white border-t border-gray-100">
              <div className="text-[10px] font-extrabold text-museum-gold uppercase mb-1.5 px-1 flex items-center gap-1">
                <MessageSquare className="w-3 h-3" /> Gợi ý câu hỏi:
              </div>
              <div className="flex flex-wrap gap-1.5">
                {suggestedPrompts.map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(prompt)}
                    className="text-[11px] font-medium bg-museum-cream hover:bg-museum-gold hover:text-white text-museum-brown px-2.5 py-1 rounded-lg transition-colors text-left cursor-pointer"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Public Input Form */}
          <div className="p-3 bg-white border-t border-gray-100">
            <div className="flex items-center gap-2 bg-gray-50 rounded-2xl p-1.5 border border-gray-200 focus-within:border-museum-gold focus-within:bg-white transition-all">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Hỏi về hiện vật..."
                className="w-full px-3 py-1.5 bg-transparent text-xs text-gray-800 focus:outline-none"
              />
              <button
                onClick={() => handleSendMessage()}
                disabled={!inputText.trim() || isSearching}
                className={`p-2 rounded-xl text-white font-bold transition-colors cursor-pointer ${
                  !inputText.trim() || isSearching
                    ? 'bg-gray-300 cursor-not-allowed'
                    : 'bg-museum-brown hover:bg-museum-brown-dk shadow-xs'
                }`}
                title="Gửi câu hỏi"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
