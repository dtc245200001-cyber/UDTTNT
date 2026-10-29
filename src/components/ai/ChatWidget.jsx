import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, User } from 'lucide-react';
import { getMockAIResponse } from '@/data/aiResponses';
import { useVoiceSearch } from '@/hooks/useVoiceSearch';

const MicIcon = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    <line x1="12" x2="12" y1="19" y2="22" />
  </svg>
);

export const ChatWidget = () => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'ai',
      text: 'Xin chào! Tôi là trợ lý ảo của bảo tàng. Bạn cần tôi hỗ trợ thông tin gì?',
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef(null);

  const handleSend = (textToSend) => {
    const query = textToSend || input;
    if (!query.trim() || isTyping) return;

    const userMsg = {
      id: Date.now(),
      sender: 'user',
      text: query.trim(),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInput('');
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
    }, 750);
  };

  const voice = useVoiceSearch({
    onFinalTranscript: (text) => {
      if (!text.trim()) return;
      setInput(text);
      handleSend(text);
    },
  });

  const quickPrompts = [
    'Hiện vật thời Lý',
    'Triển lãm đang diễn ra',
    'Giờ mở cửa bảo tàng',
    'Giới thiệu về bảo tàng',
  ];

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  return (
    <div className="bg-white rounded-2xl p-5 shadow-xs border border-gray-100 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-gray-100">
        <div className="w-9 h-9 rounded-xl bg-museum-cream flex items-center justify-center text-museum-gold">
          <Bot className="w-5 h-5" />
        </div>
        <h3 className="font-bold text-xs uppercase tracking-wider text-museum-brown">TRỢ LÝ AI</h3>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto space-y-3 min-h-[220px] max-h-[280px] pr-1">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start gap-2.5 ${
              msg.sender === 'user' ? 'flex-row-reverse' : ''
            }`}
          >
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs flex-shrink-0 ${
                msg.sender === 'user'
                  ? 'bg-museum-brown text-white'
                  : 'bg-museum-cream text-museum-gold'
              }`}
            >
              {msg.sender === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>
            <div
              className={`p-3 rounded-2xl text-xs max-w-[85%] leading-relaxed whitespace-pre-line ${
                msg.sender === 'user'
                  ? 'bg-museum-brown text-white rounded-tr-none'
                  : 'bg-museum-cream/80 text-gray-800 rounded-tl-none border border-museum-cream'
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex items-center gap-2 text-museum-gold text-xs">
            <div className="w-7 h-7 rounded-full bg-museum-cream flex items-center justify-center">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-museum-cream/80 px-4 py-2 rounded-2xl flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-museum-gold rounded-full animate-bounce" />
              <span className="w-1.5 h-1.5 bg-museum-gold rounded-full animate-bounce [animation-delay:0.2s]" />
              <span className="w-1.5 h-1.5 bg-museum-gold rounded-full animate-bounce [animation-delay:0.4s]" />
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Quick Prompts */}
      <div className="flex flex-wrap gap-2 my-3">
        {quickPrompts.map((prompt) => (
          <button
            key={prompt}
            onClick={() => handleSend(prompt)}
            className="text-xs px-3 py-1.5 rounded-full border border-museum-gold/40 text-museum-brown bg-white hover:bg-museum-cream transition-colors font-medium"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Input Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="flex items-center gap-2 pt-2 border-t border-gray-100"
      >
        <input
          type="text"
          value={voice.listening ? (voice.interimTranscript || 'Đang nghe bạn nói...') : input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={voice.listening ? 'Đang nghe bạn nói...' : 'Nhập câu hỏi của bạn...'}
          className={`flex-1 px-4 py-2.5 text-xs rounded-full border transition-all ${
            voice.listening
              ? 'border-museum-gold bg-amber-50/50 text-museum-brown font-medium'
              : 'bg-gray-50 border-gray-200 focus:outline-none focus:ring-2 focus:ring-museum-gold focus:bg-white'
          }`}
        />

        {/* Voice mic button */}
        {voice.supported && (
          <button
            type="button"
            onClick={voice.listening ? voice.stop : voice.start}
            aria-label={voice.listening ? 'Dừng nhận giọng nói' : 'Nhập câu hỏi bằng giọng nói'}
            title={voice.listening ? 'Dừng nghe' : 'Nói câu hỏi (vi-VN)'}
            className={`min-w-[36px] min-h-[36px] w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer relative ${
              voice.listening
                ? 'bg-museum-gold text-white shadow-md animate-pulse'
                : 'bg-gray-100 hover:bg-museum-cream text-museum-brown'
            }`}
          >
            {voice.listening && (
              <span className="absolute inset-0 rounded-full bg-museum-gold/40 animate-ping pointer-events-none" />
            )}
            <MicIcon className={`w-4 h-4 ${voice.listening ? 'text-white' : 'text-museum-brown'}`} />
          </button>
        )}

        <button
          type="submit"
          className="w-9 h-9 bg-museum-brown hover:bg-museum-brown-dk text-white rounded-full flex items-center justify-center transition-colors shadow-sm cursor-pointer"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
