import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, Plus, MessageSquare, User, Sparkles } from 'lucide-react';
import { getMockAIResponse } from '@/data/aiResponses';

export const AiAssistant = () => {
  const [chatHistory, setChatHistory] = useState([
    { id: 1, title: 'Tìm hiểu hiện vật thời Lý', date: 'Hôm nay' },
    { id: 2, title: 'Lịch triển lãm tháng 8', date: 'Hôm qua' },
    { id: 3, title: 'Giờ mở cửa & Giá vé', date: '3 ngày trước' },
  ]);

  const [activeChatId, setActiveChatId] = useState(1);
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'ai',
      text: 'Xin chào! Tôi là Trợ lý AI Bảo tàng Việt Nam. Tôi có thể hỗ trợ bạn tra cứu lịch sử hiện vật, thông tin triển lãm, giá vé hoặc gợi ý lộ trình tham quan độc đáo!',
    },
  ]);

  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef(null);

  const quickPrompts = [
    'Tìm hiện vật',
    'Giới thiệu hiện vật',
    'Tìm triển lãm',
    'Gợi ý tham quan',
  ];

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = (customQuery) => {
    const query = customQuery || input;
    if (!query.trim() || isTyping) return;

    const userMsg = {
      id: Date.now(),
      sender: 'user',
      text: query.trim(),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!customQuery) setInput('');
    setIsTyping(true);

    setTimeout(() => {
      const responseText = getMockAIResponse(query);
      const aiMsg = {
        id: Date.now() + 1,
        sender: 'ai',
        text: responseText,
      };
      setMessages((prev) => [...prev, aiMsg]);
      setIsTyping(false);
    }, 800);
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
        text: 'Xin chào! Bạn muốn tìm hiểu thông tin gì về Bảo Tàng Việt Nam hôm nay?',
      },
    ]);
  };

  return (
    <div className="space-y-4 animate-fadeIn">
      <div className="text-xs font-semibold text-gray-400">
        Tổng quan / <span className="text-museum-brown font-bold">AI Trợ lý</span>
      </div>

      {/* 2-Column AI Layout */}
      <div className="bg-white rounded-2xl shadow-xs border border-gray-100 overflow-hidden flex flex-col md:flex-row h-[75vh]">
        {/* Left History Sidebar */}
        <div className="w-full md:w-64 bg-museum-ivory border-r border-gray-200 p-4 flex flex-col justify-between">
          <div>
            <button
              onClick={startNewChat}
              className="w-full py-2.5 px-4 bg-museum-brown hover:bg-museum-brown-dk text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-xs transition-colors mb-4"
            >
              <Plus className="w-4 h-4" />
              <span>+ Cuộc trò chuyện mới</span>
            </button>

            <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2 px-1">
              Lịch sử trò chuyện
            </div>
            <div className="space-y-1 overflow-y-auto max-h-[50vh]">
              {chatHistory.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveChatId(item.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl text-xs flex items-center gap-2.5 transition-colors ${
                    activeChatId === item.id
                      ? 'bg-museum-cream font-bold text-museum-brown shadow-xs border border-museum-gold/30'
                      : 'text-gray-600 hover:bg-white'
                  }`}
                >
                  <MessageSquare className="w-4 h-4 text-museum-gold flex-shrink-0" />
                  <span className="truncate flex-1">{item.title}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="p-3 bg-museum-cream/60 rounded-xl border border-museum-gold/20 text-center">
            <Sparkles className="w-5 h-5 text-museum-gold mx-auto mb-1" />
            <p className="text-[11px] font-bold text-museum-brown">Mô hình AI Bảo Tàng</p>
            <p className="text-[10px] text-gray-500">Tích hợp tri thức di sản Việt Nam</p>
          </div>
        </div>

        {/* Main Right Chat Container */}
        <div className="flex-1 flex flex-col justify-between bg-white min-w-0">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3 bg-white">
            <div className="w-10 h-10 rounded-xl bg-museum-cream flex items-center justify-center text-museum-gold shadow-xs">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-base text-museum-brown">Trợ lý AI Bảo Tàng</h3>
              <p className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Sẵn sàng giải đáp 24/7
              </p>
            </div>
          </div>

          {/* Messages Scroll View */}
          <div className="flex-1 p-6 overflow-y-auto space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex items-start gap-3 ${
                  msg.sender === 'user' ? 'flex-row-reverse' : ''
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-xs flex-shrink-0 shadow-xs ${
                    msg.sender === 'user'
                      ? 'bg-museum-brown text-white'
                      : 'bg-museum-cream text-museum-gold border border-museum-gold/30'
                  }`}
                >
                  {msg.sender === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
                </div>

                <div
                  className={`p-4 rounded-2xl text-xs sm:text-sm max-w-[80%] leading-relaxed whitespace-pre-line shadow-xs ${
                    msg.sender === 'user'
                      ? 'bg-museum-brown text-white rounded-tr-none font-medium'
                      : 'bg-museum-cream/70 text-gray-800 rounded-tl-none border border-museum-cream font-normal'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex items-center gap-3 text-museum-gold text-xs">
                <div className="w-9 h-9 rounded-full bg-museum-cream flex items-center justify-center">
                  <Bot className="w-5 h-5" />
                </div>
                <div className="bg-museum-cream/80 px-4 py-3 rounded-2xl flex items-center gap-1.5 shadow-xs">
                  <span className="w-2 h-2 bg-museum-gold rounded-full animate-bounce" />
                  <span className="w-2 h-2 bg-museum-gold rounded-full animate-bounce [animation-delay:0.2s]" />
                  <span className="w-2 h-2 bg-museum-gold rounded-full animate-bounce [animation-delay:0.4s]" />
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Quick Prompts & Input */}
          <div className="p-4 border-t border-gray-100 bg-museum-ivory/40 space-y-3">
            <div className="flex flex-wrap gap-2">
              {quickPrompts.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => handleSend(prompt)}
                  className="text-xs px-3.5 py-1.5 rounded-full border border-museum-gold/40 text-museum-brown bg-white hover:bg-museum-cream transition-colors font-medium shadow-xs"
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
                placeholder="Nhập thắc mắc của bạn về bảo tàng, hiện vật, triển lãm..."
                className="flex-1 px-5 py-3 bg-white text-xs sm:text-sm text-gray-800 rounded-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-museum-gold shadow-inner"
              />
              <button
                type="submit"
                className="w-11 h-11 bg-museum-brown hover:bg-museum-brown-dk text-white rounded-full flex items-center justify-center transition-colors shadow-md flex-shrink-0"
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
