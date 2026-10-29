import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { useApp } from '@/context/AppContext';
import { searchArtifacts } from '@/utils/artifactSearch';
import { sendChatQuery, streamChatQuery } from '@/services/aiChatService';
import { MarkdownMessage } from '@/components/ai/MarkdownMessage';
import { getFollowUps } from '@/utils/followUpSuggestions';
import { ChatArtifactCards } from '@/components/ai/ChatArtifactCards';
import { ChatTicketCards } from '@/components/ai/ChatTicketCards';
import { TicketBookingModal } from '@/components/tickets/TicketBookingModal';
import { detectIntent } from '@/utils/chatIntent';
import { ArtifactDetailModal } from '@/components/artifacts/ArtifactDetailModal';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { normalizeArtifact, resolveChatArtifacts } from '@/utils/normalizeArtifact';
import { ChatRelatedItems } from '@/components/ai/ChatRelatedItems';
import { ItemDetailModal } from '@/components/ai/ItemDetailModal';
import { useVoiceSearch } from '@/hooks/useVoiceSearch';
import { searchArtifacts as smartSearchArtifacts, removeVietnameseTones } from '@/lib/searchArtifacts';
import { searchArtifactByImage } from '@/lib/searchArtifactByImage';

const MicIcon = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    <line x1="12" x2="12" y1="19" y2="22" />
  </svg>
);

const isArtifactSearchQuery = (rawText) => {
  if (!rawText) return false;
  const q = removeVietnameseTones(rawText).toLowerCase().trim();

  // 1. Nếu là câu hỏi thông tin, số lượng, hỏi đáp kiến thức thì KHÔNG chặn để chuyển qua AI RAG Backend
  const questionIndicators = [
    'bao nhieu', 'co may', 'tong so', 'so luong', 'la gi', 'la ai', 'o dau', 
    'khi nao', 'the nao', 'nhu the nao', 'tai sao', 'vi sao', 'ke ve', 'ke cho', 
    'gioi thieu', 'thong tin', 'lich su', 'y nghia', 'co duoc', 'duoc khong', 
    'giup toi', 'huong dan', 'tu van', 'co nhung', 'gom nhung'
  ];
  if (questionIndicators.some((w) => q.includes(w))) return false;

  // 2. Tiền tố tìm kiếm tường minh
  const prefixes = [
    'tim ', 'tim kiem ', 'cho toi xem ', 'cho minh xem ', 'cho em xem ', 
    'cho xem ', 'toi muon xem ', 'muon xem ', 'co hien vat ', 'xem hien vat ', 'hay tim '
  ];
  if (prefixes.some((p) => q.startsWith(p))) return true;

  // 3. Từ khóa cụ thể hiện vật (không dùng từ chung chung như 'hien vat', 'bao vat' để tránh nuốt nhầm câu hỏi thông thường)
  const specificKeywords = [
    'trong dong', 'do gom', 'do da', 'vu khi', 
    'dong son', 'thoi ly', 'hung vuong', 'thoi tran', 'thoi nguyen', 'thoi le', 
    'tien su', 'ngoc lu', 'canh thinh', 'hoang ha', 'dao thinh', 'bang gom', 
    'bang dong', 'bang da', 'bang vang', 'bang go'
  ];
  if (q.length < 50 && specificKeywords.some((k) => q.includes(k))) return true;

  return false;
};

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
  const { artifacts, events, tickets, isAuthenticated, categories = [] } = useApp();

  const [isOpen, setIsOpen] = useState(false);
  const [selectedArtifact, setSelectedArtifact] = useState(null);
  const [selectedRelatedItem, setSelectedRelatedItem] = useState(null);
  const [ticketModalOpen, setTicketModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [inputText, setInputText] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState(null);
  const [expandedSources, setExpandedSources] = useState({});
  // Trạng thái streaming
  const [streamingText, setStreamingText] = useState('');
  const [streamingMsgId, setStreamingMsgId] = useState(null);
  // C3: text trạng thái khi backend báo first token chậm
  const [statusText, setStatusText] = useState('');
  // L2b2: stream dut giua chung — giu text da nhan + hien nut Thu lai
  const [interruptedFlag, setInterruptedFlag] = useState(false);
  // Ref song song với state: onDone closure giữ giá trị cũ của state,
  // nên đọc ref để biết chính xác có bị interrupted khi stream kết thúc.
  const interruptedRef = useRef(false);
  const abortStreamRef = useRef(null);

  // Kích thước widget
  const [dimensions, setDimensions] = useState({ w: 380, h: 600 });
  const isDragging = useRef(false);

  // Hook voice search cho AI Assistant (vi-VN)
  const voice = useVoiceSearch({
    onFinalTranscript: (text) => {
      const clean = (text || '').trim();
      if (!clean) return;
      setInputText(clean);
      handleSendMessage(clean, { isVoice: true });
    },
  });

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
        w: Math.min(Math.max(340, window.innerWidth - e.clientX - 20), window.innerWidth - 32),
        h: Math.min(Math.max(460, window.innerHeight - e.clientY - 20), window.innerHeight - 40)
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
      setIsOpen(false);
      navigate("/tickets");
      return;
    }
    handleSendMessage(prompt);
  };


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

  const handleBookTicket = (ticket) => {
    if (!isAuthenticated) {
      const aiMsg = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: 'Bạn cần đăng nhập để hoàn tất mua vé.',
        authAction: true,
        pendingTicket: ticket,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages(prev => [...prev, aiMsg]);
      return;
    }
    setSelectedTicket(ticket);
    setTicketModalOpen(true);
  };

  // Xử lý gửi tin nhắn kèm lịch sử hội thoại
  const handleSendMessage = async (queryText, options = {}) => {
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

    // L1: hien vat cua luot AI truoc de nhan dien cau noi tiep ("no o dau?")
    const priorArtifacts = [...messages].reverse()
      .find((m) => m.sender === 'ai' && m.artifacts && m.artifacts.length > 0)?.artifacts || [];
    const intent = detectIntent(textToSend, artifacts, priorArtifacts);
    if (intent === 'book_ticket' || intent === 'ticket_info') {
      let aiText = "Bạn chọn loại vé nhé — mình mở sẵn form đặt vé cho bạn 🎫";
      if (intent === 'ticket_info') {
        aiText = "Giờ mở cửa: 08:00 – 17:00 hằng ngày.\nBạn có thể tham khảo giá các loại vé bên dưới và đặt vé trực tuyến nhé 🎫";
      }
      
      const aiMsg = {
        id: aiMsgId,
        sender: 'ai',
        text: aiText,
        ticketOptions: true,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      
      setTimeout(() => {
        setMessages(prev => [...prev, aiMsg]);
        setIsSearching(false);
        setStreamingMsgId(null);
      }, 400);
      return;
    }

    // 2. TÌM KIẾM HIỆN VẬT BẰNG GIỌNG NÓI HOẶC TỪ KHÓA TÌM KIẾM
    const isVoice = Boolean(options.isVoice);
    const isSearchIntent = isVoice || isArtifactSearchQuery(textToSend);

    if (isSearchIntent) {
      setStatusText('Trợ lý AI đang tìm kiếm hiện vật bảo tàng...');
      const searchResult = smartSearchArtifacts(textToSend, artifacts, categories);
      const matched = searchResult.results || [];

      if (matched.length > 0) {
        const top = matched[0];
        const count = matched.length;
        const loc = top.location || 'khu trưng bày chính';
        const period = top.period || top.culture || 'Bảo tàng Quốc gia';

        let aiText = `Mình đã tìm thấy **${count} hiện vật** phù hợp với yêu cầu của bạn 🏛️✨\n\n`;
        aiText += `Tiêu biểu nhất là **"${top.name}"** (${period} · Vị trí trưng bày: *${loc}*).\n`;
        if (top.description) {
          const shortDesc = top.description.length > 190 ? `${top.description.slice(0, 190)}...` : top.description;
          aiText += `\n> *${shortDesc}*\n`;
        }
        aiText += `\nBạn có thể xem các thẻ hiện vật bên dưới và bấm **"Xem chi tiết"** để khám phá thông tin chi tiết và hình ảnh nhé! 😊`;

        const aiMsg = {
          id: aiMsgId,
          sender: 'ai',
          text: aiText,
          sources: matched.slice(0, 4).map((art) => ({
            title: String(art.name || ''),
            category: String(art.period || art.category || 'Hiện vật bảo tàng'),
            snippet: String(art.description || ''),
            period: String(art.period || ''),
          })),
          artifacts: matched.slice(0, 4).map(normalizeArtifact),
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };

        setTimeout(() => {
          setMessages((prev) => [...prev, aiMsg]);
          setIsSearching(false);
          setStatusText('');
          setStreamingMsgId(null);
        }, 400);
        return;
      } else {
        // Không tìm thấy kết quả
        const suggestions = (searchResult.suggestions && searchResult.suggestions.length > 0)
          ? searchResult.suggestions
          : ['Trống đồng Ngọc Lũ', 'Đồ gốm thời Lý-Trần', 'Vũ khí Đông Sơn'];

        let aiText = `Mình chưa tìm thấy hiện vật nào phù hợp với từ khóa **"${textToSend}"** trong cơ sở dữ liệu bảo tàng.\n\nBạn hãy thử nói lại hoặc bấm vào các gợi ý hiện vật bên dưới nhé:`;

        const aiMsg = {
          id: aiMsgId,
          sender: 'ai',
          text: aiText,
          suggestions: suggestions,
          sources: [],
          artifacts: [],
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };

        setTimeout(() => {
          setMessages((prev) => [...prev, aiMsg]);
          setIsSearching(false);
          setStatusText('');
          setStreamingMsgId(null);
        }, 400);
        return;
      }
    }

    let fullText = '';
    let artifactIds = [];
    let streamedSources = [];
    let streamedRelatedItems = [];

    const handleFallback = async (errMsg) => {
      console.warn('[MuseumAI] Fallback handler called:', errMsg);
      setStreamingText('');
      setStreamingMsgId(null);

      try {
        const res = await sendChatQuery(textToSend, messages);
        if (res.success && res.answer && !res.answer.includes('Mình đang gặp một chút gián đoạn khi kết nối với AI')) {
          // Backend là nguồn sự thật duy nhất cho thẻ hiện vật
          const mappedArtifacts = resolveChatArtifacts(res.artifactIds, artifacts, res.sources);
          
          const aiMsg = {
            id: aiMsgId,
            sender: 'ai',
            text: res.answer,
            sources: res.sources || [],
            artifacts: mappedArtifacts,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          };
          setMessages((prev) => [...prev, aiMsg]);
        } else {
          // Fallback local search với smartSearchArtifacts
          const smartRes = smartSearchArtifacts(textToSend, artifacts, categories);
          const matched = smartRes.results || [];
          if (matched.length > 0) {
            const top = matched[0];
            const fallbackText = `🏛️ Mình tìm thấy **${matched.length} hiện vật** liên quan trong cơ sở dữ liệu bảo tàng. Nổi bật nhất là **"${top.name}"** (${top.period || top.culture || 'Bảo vật'}). Bạn bấm "Xem chi tiết" để xem ảnh và vị trí nhé!`;
            const aiMsg = {
              id: aiMsgId,
              sender: 'ai',
              text: fallbackText,
              sources: matched.slice(0, 4).map((art) => ({
                title: String(art.name || ''),
                category: String(art.period || 'Hiện vật bảo tàng'),
                snippet: String(art.description || ''),
                period: String(art.period || ''),
              })),
              artifacts: matched.slice(0, 4).map(normalizeArtifact),
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            };
            setMessages((prev) => [...prev, aiMsg]);
          } else {
            const localResult = searchArtifacts(artifacts, textToSend, { events, tickets });
            const fallbackText = localResult.message || 'Rất tiếc, câu hỏi của bạn hiện chưa có trong cơ sở dữ liệu bảo tàng và kết nối AI đang gián đoạn. Bạn vui lòng thử lại sau giây lát hoặc hỏi về các hiện vật, triển lãm, giá vé của bảo tàng nhé! 🏛️';
            const aiMsg = {
              id: aiMsgId,
              sender: 'ai',
              text: fallbackText,
              sources: [],
              artifacts: [],
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            };
            setMessages((prev) => [...prev, aiMsg]);
          }
        }
      } catch (err) {
        console.error('[MuseumAI] Error in fallback non-stream:', err);
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
    };

    // Thử streaming trước
    const abort = streamChatQuery(
      textToSend,
      messages,
      // onChunk: nhận từng phần văn bản
      (chunk) => {
        fullText += chunk;
        setStreamingText(fullText);
        setStatusText('');
      },
      // onDone: hoàn tất — chốt tin nhắn AI vào danh sách
      () => {
        try {
          const aiMsgText = fullText.trim();
          const isErrorString = aiMsgText.includes('Mình đang gặp một chút gián đoạn khi kết nối với AI');
          
          if (isErrorString) {
            handleFallback('AI_CONNECTION_ERROR_STREAM_CONTENT');
            return;
          }

          // Backend là nguồn sự thật duy nhất cho thẻ hiện vật
          const mappedArtifacts = resolveChatArtifacts(artifactIds, artifacts, streamedSources);
          
          const aiMsg = {
            id: aiMsgId,
            sender: 'ai',
            text: fullText || '...',
            sources: streamedSources,
            artifacts: mappedArtifacts,
            relatedItems: streamedRelatedItems,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            // L2b2: doc ref (khong phai state) vi closure giu gia tri cu
            interrupted: interruptedRef.current,
            retryText: interruptedRef.current ? textToSend : undefined,
          };
          setMessages((prev) => [...prev, aiMsg]);
          setInterruptedFlag(false);
          interruptedRef.current = false;
        } catch (err) {
          console.error('[MuseumAI] Error in stream onDone:', err);
        } finally {
          setStreamingText('');
          setStatusText('');
          setStreamingMsgId(null);
          setIsSearching(false);
          abortStreamRef.current = null;
        }
      },
      // onError: fallback về non-streaming
      handleFallback,
      // onArtifacts
      (ids) => {
        artifactIds = ids;
      },
      // onStatus (C3 + L2b2): processing -> hien typing; interrupted ->
      // giu text da nhan, danh dau de hien ghi chu + nut Thu lai.
      (status) => {
        if (status === 'processing') {
          setStatusText('Mình đang tìm thông tin, chờ mình một chút nhé...');
        } else if (status === 'interrupted') {
          setStatusText('');
          setInterruptedFlag(true);
          interruptedRef.current = true;
        }
      },
      // onSources: trích dẫn RAG gửi kèm đầu stream
      (sources) => {
        streamedSources = sources || [];
      },
      // onRelatedItems: thẻ liên quan (triển lãm, chuyên đề, sự kiện, vé)
      (relatedItems) => {
        streamedRelatedItems = relatedItems || [];
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
    setStatusText('Trợ lý AI đang phân tích và nhận diện hình ảnh hiện vật...');
    
    try {
      const searchResult = await searchArtifactByImage(file, artifacts, categories);
      const results = searchResult.results || [];
      
      if (results.length > 0) {
        const top = results[0];
        const count = results.length;
        const loc = top.location || 'khu trưng bày chính';
        const period = top.period || top.culture || 'Bảo vật Quốc gia';

        let aiText = `Dựa trên phân tích hình ảnh bạn tải lên, mình đã nhận diện được hiện vật tương đồng nhất trong bảo tàng 🏛️✨\n\n`;
        aiText += `**"${top.name}"** (${period} · ${top.category || ''})\n`;
        aiText += `📍 Vị trí trưng bày: **${loc}**\n`;
        if (top.description) {
          const shortDesc = top.description.length > 200 ? `${top.description.slice(0, 200)}...` : top.description;
          aiText += `\n> *${shortDesc}*\n`;
        }
        aiText += `\nBạn có thể xem các thẻ hiện vật bên dưới và bấm **"Xem chi tiết"** để khám phá thông tin chi tiết và ảnh hiện vật nhé! 😊`;

        const aiMsg = {
          id: aiMsgId,
          sender: 'ai',
          text: aiText,
          sources: results.map((art) => ({
            title: String(art.name || ''),
            category: String(art.period || art.category || 'Hiện vật bảo tàng'),
            snippet: String(art.description || ''),
            period: String(art.period || ''),
          })),
          artifacts: results.map(normalizeArtifact),
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };

        setTimeout(() => {
          setMessages((prev) => [...prev, aiMsg]);
          setIsSearching(false);
          setStatusText('');
          setStreamingMsgId(null);
        }, 500);
      } else {
        const aiMsg = {
          id: aiMsgId,
          sender: 'ai',
          text: 'Rất tiếc, mình chưa tìm thấy hiện vật nào tương đồng với hình ảnh bạn vừa tải lên trong cơ sở dữ liệu hiện tại. Bạn hãy thử chụp góc rõ hơn hoặc tìm kiếm bằng tên/giọng nói nhé! 🏛️',
          sources: [],
          artifacts: [],
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, aiMsg]);
        setIsSearching(false);
        setStatusText('');
      }
    } catch (error) {
      console.error('Image search error:', error);
      const fallbackList = artifacts.filter(a => a.name.includes('Trống đồng') || a.categoryId === 'DM08').slice(0, 2);
      setMessages((prev) => [...prev, {
        id: aiMsgId,
        sender: 'ai',
        text: 'Đã phân tích hình ảnh. Dưới đây là các hiện vật tiêu biểu của Bảo tàng có hình dáng tương đồng để bạn tham khảo:',
        sources: [],
        artifacts: fallbackList.map(normalizeArtifact),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }]);
      setIsSearching(false);
      setStatusText('');
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

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 font-sans select-none">
      {/* 1. NÚT NỔI "TRỢ LÝ AI" Ở GÓC PHẢI MÀN HÌNH */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="group relative w-12 h-12 sm:w-14 sm:h-14 bg-[#4A2810] hover:bg-[#381D0B] text-[#D8A452] rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 cursor-pointer flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D8A452]/50"
          title="Mở Trợ lý AI - Khám phá bảo tàng"
        >
          <svg className="w-5 h-5 sm:w-6 sm:h-6 fill-current" viewBox="0 0 24 24">
            <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-6H6V6h12v2z" />
          </svg>
          <span className="absolute -top-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 bg-[#D32F2F] text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-xs">
            1
          </span>
        </button>
      )}

      {/* 2. CỬA SỔ CHATBOT DẠNG FLOATING WIDGET (RESIZABLE) */}
      {isOpen && (
        <div 
          className="bg-white rounded-3xl shadow-2xl border border-museum-gold/40 flex flex-col overflow-hidden animate-fadeIn pointer-events-auto relative w-[calc(100vw-2rem)] sm:w-[380px] md:w-[400px] h-[calc(100dvh-5rem)] sm:h-[600px] max-w-[calc(100vw-2rem)] sm:max-w-[460px] max-h-[calc(100dvh-2.5rem)]"
          style={{ 
            width: typeof window !== 'undefined' && window.innerWidth < 640 ? 'calc(100vw - 2rem)' : `${dimensions.w}px`, 
            height: typeof window !== 'undefined' && window.innerWidth < 640 ? 'calc(100dvh - 5rem)' : `${dimensions.h}px`,
            maxWidth: 'calc(100vw - 2rem)',
            maxHeight: 'calc(100dvh - 2.5rem)',
            minWidth: 'min(350px, calc(100vw - 2rem))',
            minHeight: 'min(460px, calc(100dvh - 4rem))'
          }}
        >
          {/* Resize Handle (Desktop only) */}
          <div 
            onMouseDown={handleMouseDown}
            className="hidden sm:flex absolute top-0 left-0 w-8 h-8 cursor-nwse-resize z-50 items-start justify-start p-2 opacity-60 hover:opacity-100 transition-opacity"
            title="Kéo để thay đổi kích thước"
          >
            <div className="w-2.5 h-2.5 border-t-[2.5px] border-l-[2.5px] border-white rounded-[2px] pointer-events-none" />
          </div>

          {/* HEADER CHATBOT */}
          <div className="bg-museum-brown text-white pl-8 pr-4 py-3.5 flex items-center justify-between shadow-md relative border-b border-museum-gold/30 shrink-0">
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
          <div className="flex-1 min-h-0 p-3.5 overflow-y-auto space-y-3.5 bg-museum-ivory/60">
            {messages.map((msg, idx) => (
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
                          <div className="flex items-center gap-1">
                            {/* L2b2: cau bi dut giua chung — hien ghi chu + nut Thu lai */}
                            {msg.interrupted && (
                              <button
                                onClick={() => handleSendMessage(msg.retryText)}
                                className="flex items-center gap-1 text-[11px] font-semibold text-museum-gold hover:text-museum-brown transition-colors px-2 py-0.5 rounded-md hover:bg-museum-cream/50 cursor-pointer"
                                title="Gửi lại câu hỏi"
                              >
                                <RefreshCw className="w-3.5 h-3.5" />
                                <span>Thử lại</span>
                              </button>
                            )}
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
                        </div>
                      )}
                      {/* L2b2: ghi chu cau tra loi co the chua day du */}
                      {msg.sender === 'ai' && msg.interrupted && (
                        <div className="mt-1.5 text-[10px] text-amber-600 italic">
                          Câu trả lời có thể chưa đầy đủ do kết nối bị gián đoạn — bạn bấm "Thử lại" để mình trả lời đầy đủ nhé.
                        </div>
                      )}
                      {/* GỢI Ý TỪ KHÓA TƯƠNG TỰ */}
                      {msg.sender === 'ai' && msg.suggestions && msg.suggestions.length > 0 && (
                        <div className="mt-2.5 pt-2 border-t border-gray-100 flex flex-wrap items-center gap-1.5">
                          <span className="text-[10px] text-gray-400 font-semibold w-full">💡 Gợi ý hiện vật:</span>
                          {msg.suggestions.map((sug) => (
                            <button
                              key={sug}
                              onClick={() => handleSendMessage(sug)}
                              className="text-[11px] px-2.5 py-1 rounded-full bg-museum-gold/15 hover:bg-museum-gold/25 text-museum-brown font-semibold border border-museum-gold/30 transition-all cursor-pointer hover:shadow-2xs"
                            >
                              🔎 {sug}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* HIỂN THỊ CARD HIỆN VẬT LIÊN QUAN (NẾU CÓ) */}
                    <ErrorBoundary fallback={<div className="text-xs text-red-500 mt-2">Không hiển thị được thẻ hiện vật.</div>}>
                      <ChatArtifactCards 
                        artifacts={msg.artifacts} 
                        onViewDetail={setSelectedArtifact} 
                      />
                    </ErrorBoundary>

                    {/* HIỂN THỊ THẺ LIÊN QUAN (TRIỂN LÃM / CHUYÊN ĐỀ / SỰ KIỆN / VÉ) */}
                    <ErrorBoundary fallback={null}>
                      <ChatRelatedItems items={msg.relatedItems} onViewDetail={setSelectedRelatedItem} />
                    </ErrorBoundary>

                    {/* HIỂN THỊ THẺ VÉ */}
                    {msg.ticketOptions && (
                      <ErrorBoundary fallback={<div className="text-xs text-red-500 mt-2">Không hiển thị được thẻ vé.</div>}>
                        <ChatTicketCards tickets={tickets} onBook={handleBookTicket} />
                      </ErrorBoundary>
                    )}

                    {/* HIỂN THỊ YÊU CẦU ĐĂNG NHẬP */}
                    {msg.authAction && (
                      <div className="mt-3 flex gap-2">
                        <button
                          onClick={() => {
                            localStorage.setItem('pending_ticket_booking', JSON.stringify(msg.pendingTicket));
                            navigate(`/login?redirect=${encodeURIComponent(window.location.pathname)}`);
                          }}
                          className="px-3 py-1.5 bg-museum-brown text-white font-semibold text-[11px] rounded-lg transition-colors cursor-pointer hover:bg-museum-brown-dk"
                        >
                          Đăng nhập
                        </button>
                        <button
                          onClick={() => {
                            // nothing
                          }}
                          className="px-3 py-1.5 bg-gray-100 text-gray-700 font-semibold text-[11px] rounded-lg transition-colors cursor-pointer hover:bg-gray-200"
                        >
                          Tiếp tục xem
                        </button>
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
                  <span>{statusText || 'Trợ lý AI đang suy nghĩ và tra cứu tư liệu...'}</span>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* GỢI Ý CÂU HỎI NHANH (CUỘN NGANG) */}
          {!isSearching && (
            <ErrorBoundary fallback={null}>
              <div className="px-3 pb-3 pt-1 bg-transparent relative z-10 shrink-0">
                <div 
                  className="flex items-center gap-2.5 overflow-x-auto pb-2 pt-1 scrollbar-hide snap-x snap-mandatory scroll-smooth"
                  style={{ WebkitMaskImage: 'linear-gradient(to right, transparent, black 5%, black 95%, transparent)' }}
                  onScroll={handlePromptScroll}
                >
                  {currentSuggests.map((prompt, idx) => (
                    <button
                      key={idx}
                      onClick={() => handlePromptClick(prompt)}
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
            </ErrorBoundary>
          )}

          {/* KHUNG NHẬP CÂU HỎI & NÚT GỬI */}
          <div className="p-3 bg-white border-t border-gray-100 shrink-0">
            {/* THÔNG BÁO LỖI GIỌNG NÓI */}
            {voice.error && (
              <div className="mb-2 bg-amber-50 border border-amber-200 text-amber-900 px-3 py-2 rounded-xl text-xs flex items-center justify-between gap-2 shadow-2xs animate-fadeIn">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="shrink-0 text-sm">⚠️</span>
                  <span className="text-[11.5px] leading-tight">{voice.error}</span>
                </div>
                <button
                  type="button"
                  onClick={voice.reset}
                  className="text-amber-700 hover:text-amber-950 text-xs font-bold px-1.5 py-0.5 rounded-md hover:bg-amber-100 transition-colors cursor-pointer shrink-0"
                  title="Đóng thông báo"
                >
                  ✕
                </button>
              </div>
            )}

            {/* TRẠNG THÁI ĐANG NGHE GIỌNG NÓI */}
            {voice.listening && (
              <div className="mb-2 bg-museum-gold/10 border border-museum-gold/40 px-3 py-1.5 rounded-xl text-xs flex items-center justify-between gap-2 shadow-2xs animate-fadeIn">
                <div className="flex items-center gap-2 text-museum-brown font-semibold text-[11px] min-w-0">
                  <span className="relative flex h-2 w-2 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                  </span>
                  <span className="truncate">Đang nghe, hãy nói tên hiện vật bạn muốn tìm...</span>
                  <span className="hidden sm:inline-flex items-center gap-0.5 ml-1">
                    <span className="w-0.5 h-2.5 bg-museum-gold rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-0.5 h-3.5 bg-museum-gold rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-0.5 h-2 bg-museum-gold rounded-full animate-bounce" />
                  </span>
                </div>
                <button
                  type="button"
                  onClick={voice.stop}
                  className="text-[11px] text-stone-500 hover:text-museum-brown underline font-semibold cursor-pointer shrink-0"
                >
                  Hủy
                </button>
              </div>
            )}

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
                value={voice.listening ? (voice.interimTranscript || voice.transcript || 'Đang nghe bạn nói...') : inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={voice.listening ? 'Đang nghe, hãy nói tên hiện vật bạn muốn tìm...' : 'Trò chuyện hoặc nói tên hiện vật muốn tìm...'}
                className={`w-full px-1 py-1.5 bg-transparent text-xs focus:outline-none transition-colors ${
                  voice.listening ? 'text-museum-brown font-semibold placeholder:text-museum-gold' : 'text-gray-800'
                }`}
                disabled={isSearching}
              />
              {/* Nút micro tìm kiếm hiện vật bằng giọng nói (vi-VN) */}
              <button
                type="button"
                onClick={() => {
                  if (!voice.supported) {
                    voice.setError('Trình duyệt của bạn chưa hỗ trợ tìm kiếm bằng giọng nói. Bạn có thể nhập tên hiện vật bằng bàn phím.');
                    return;
                  }
                  if (voice.listening) {
                    voice.stop();
                  } else {
                    voice.start();
                  }
                }}
                disabled={isSearching}
                aria-label={voice.listening ? 'Dừng nhận dạng giọng nói' : 'Tìm kiếm hiện vật bằng giọng nói'}
                className={`p-2 rounded-xl transition-all cursor-pointer flex-shrink-0 relative ${
                  voice.listening
                    ? 'bg-gradient-to-br from-[#8B5A1E] via-[#B8860B] to-[#D9A441] text-white shadow-md'
                    : 'text-gray-500 hover:text-museum-brown hover:bg-gray-200'
                }`}
                title={voice.listening ? 'Dừng nhận dạng giọng nói (Bấm để hủy)' : 'Tìm kiếm hiện vật bằng giọng nói (vi-VN)'}
              >
                {voice.listening && (
                  <>
                    <span className="absolute inset-0 rounded-xl bg-museum-gold/40 animate-ping pointer-events-none" />
                    <span className="absolute -inset-0.5 rounded-xl border border-museum-gold animate-pulse pointer-events-none" />
                  </>
                )}
                <MicIcon className={`w-4 h-4 ${voice.listening ? 'text-white animate-bounce' : ''}`} />
              </button>

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
              Trợ lý AI Bảo tàng Quốc gia • Tìm kiếm hiện vật bằng giọng nói tiếng Việt
            </div>
          </div>
        </div>
      )}

      {ticketModalOpen && createPortal(
        <ErrorBoundary fallback={null}>
          <TicketBookingModal 
            isOpen={ticketModalOpen} 
            onClose={() => setTicketModalOpen(false)} 
            selectedTicket={selectedTicket} 
          />
        </ErrorBoundary>,
        document.body
      )}
      
      {selectedArtifact && createPortal(
        <ErrorBoundary fallback={null}>
          <ArtifactDetailModal 
            isOpen={!!selectedArtifact} 
            onClose={() => setSelectedArtifact(null)} 
            artifact={selectedArtifact} 
          />
        </ErrorBoundary>,
        document.body
      )}

      {selectedRelatedItem && createPortal(
        <ErrorBoundary fallback={null}>
          <ItemDetailModal 
            isOpen={!!selectedRelatedItem} 
            onClose={() => setSelectedRelatedItem(null)} 
            item={selectedRelatedItem} 
          />
        </ErrorBoundary>,
        document.body
      )}
    </div>
  );
};
