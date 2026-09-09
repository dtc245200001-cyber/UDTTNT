"""
RAG Pipeline — Điều phối luồng xử lý hội thoại thông minh.

Ba nhánh xử lý:
  1. Chitchat / xã giao → Gemini trả lời luôn (không RAG, không function)
  2. Dữ liệu real-time (vé, sự kiện hôm nay...) → Function Calling
  3. Kiến thức bảo tàng tĩnh → RAG ChromaDB → Gemini tổng hợp
"""
import re
from functools import lru_cache
from services.embedding import get_embedding, get_embedding_async
from services.vector_db import vector_db_service
from services.gemini import gemini_service


# ── Từ khóa phân loại câu hỏi ──────────────────────────────────────────────

# Từ khóa chỉ định cần dữ liệu REAL-TIME (qua Function Calling)
REALTIME_KEYWORDS = [
    # Giá vé
    "giá vé", "mua vé", "vé tham quan", "bao nhiêu tiền", "phí vào cửa",
    "miễn phí", "vé trẻ em", "vé người lớn", "vé học sinh", "vé sinh viên",
    # Sự kiện
    "sự kiện hôm nay", "sự kiện sắp tới", "sự kiện sắp diễn ra",
    "lịch sự kiện", "có sự kiện gì", "tuần này có gì", "workshop",
    "tọa đàm", "hội thảo", "sự kiện nào", "sắp có gì",
    # Triển lãm hiện tại
    "triển lãm đang", "đang triển lãm", "triển lãm hiện tại", "triển lãm nào đang",
    "hiện đang trưng bày", "đang mở cửa", "triển lãm nào mở",
    # Đánh giá
    "đánh giá", "rating", "điểm đánh giá", "mọi người nghĩ gì",
    "khách tham quan nói gì", "nhận xét",
    # Thống kê số lượng
    "bao nhiêu hiện vật", "tổng số hiện vật", "có bao nhiêu",
    "số lượng hiện vật", "số hiện vật", "thống kê bảo tàng",
    "bao nhiêu phòng", "bao nhiêu triển lãm", "bao nhiêu sự kiện",
    "danh mục nào nhiều nhất", "hiện vật nào nhiều nhất", "tổng hợp",
    "bảo tàng có bao nhiêu", "số sản phẩm", "bảo tàng đang có",
]

# Từ khóa chỉ định cần tra cứu TĨNH từ ChromaDB (bảo tàng, hiện vật...)
MUSEUM_KEYWORDS = [
    "trống", "hiện vật", "bảo vật", "cổ vật", "giờ mở cửa",
    "mở cửa", "địa chỉ", "cơ sở", "triều", "vua", "kháng chiến", "trưng bày",
    "triển lãm", "đông sơn", "ngọc lũ", "cảnh thịnh", "đào thịnh", "đường kách mệnh",
    "chúa nguyễn", "lê lợi", "quang trung", "hồ chí minh", "tiền sử", "ngô quyền",
    "lý", "trần", "lê", "nguyễn", "tây sơn", "phòng trưng bày", "niên đại",
    "chất liệu", "nguồn gốc", "khai quật", "văn hóa", "lịch sử", "bảo tàng",
    "hiện vật nào", "tham quan", "lộ trình", "gợi ý tham quan", "nên xem gì",
    "bài viết", "danh mục",
]


@lru_cache(maxsize=200)
def get_cached_chitchat_response(text: str) -> str | None:
    """
    Cache trả lời nhanh cho các câu chào hỏi/cảm ơn phổ biến.
    Chỉ dùng cho các câu hỏi ngắn đã có sẵn logic ở _fallback_response.
    """
    clean = text.lower().strip()
    
    # Chỉ cache câu rất ngắn để an toàn
    if len(clean.split()) > 5:
        return None

    if any(word == clean or word + " bạn" == clean or word + " ạ" == clean for word in ["chào", "hello", "hi", "hey"]):
        return "Chào bạn 👋 Hôm nay mình có thể giúp gì cho bạn?"

    if any(word == clean or word + " bạn" == clean or word + " ạ" == clean for word in ["cảm ơn", "cám ơn", "thanks", "thank"]):
        return "Không có gì nhé 😊 Rất vui được hỗ trợ bạn!"

    if any(word == clean or word + " quá" == clean for word in ["chán", "buồn"]):
        return (
            "Vậy để mình tìm cách làm bạn đỡ chán nhé 😄 "
            "Bạn muốn nghe một câu chuyện lịch sử thú vị "
            "hay khám phá một hiện vật đặc biệt?"
        )

    return None


class RAGPipeline:
    def __init__(self):
        self.vector_db = vector_db_service
        self.gemini = gemini_service

    def is_conversational_chitchat(self, text: str, history: list[dict] = None) -> bool:
        """
        Nhận diện câu chào hỏi, cảm ơn, tâm sự đời thường không cần gọi RAG hay function.
        """
        clean = text.lower().strip()
        clean_no_punct = re.sub(r'[^\w\s]', '', clean)
        words = clean_no_punct.split()

        clean_no_accents = self.remove_accents(clean_no_punct)

        # Ưu tiên kiểm tra museum/realtime keywords trước
        if any(kw in clean_no_punct or self.remove_accents(kw) in clean_no_accents for kw in MUSEUM_KEYWORDS + REALTIME_KEYWORDS):
            return False

        greetings = [
            "chào", "xin chào", "hello", "hi", "hey", "halo",
            "bạn là ai", "bạn tên gì", "tên bạn là gì",
            "bạn làm được gì", "giúp gì", "giới thiệu bản thân",
            "cảm ơn", "cám ơn", "thank", "thanks", "tạm biệt", "bye", "goodbye",
            "hôm nay thế nào", "khỏe không", "mấy tuổi", "tuyệt vời",
            "rất hay", "ok", "oke", "được rồi", "hay quá", "chán", "buồn", "vui"
        ]

        if len(words) <= 7 and any(g in clean_no_punct for g in greetings):
            return True

        return False

    def remove_accents(self, input_str: str) -> str:
        s1 = u'ÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚÝàáâãèéêìíòóôõùúýĂăĐđĨĩŨũƠơƯưẠạẢảẤấẦầẨẩẪẫẬậẮắẰằẲẳẴẵẶặẸẹẺẻẼẽẾếỀềỂểỄễỆệỈỉỊịỌọỎỏỐốỒồỔổỖỗỘộỚớỜờỞởỠỡỢợỤụỦủỨứỪừỬửỮữỰựỲỳỴỵỶỷỸỹ'
        s0 = u'AAAAEEEIIOOOOUUYaaaaeeeiioooouuyAaDdIiUuOoUuAaAaAaAaAaAaAaAaAaAaAaAaAaEeEeEeEeEeEeEeEeEeIiIiOoOoOoOoOoOoOoOoOoOoOoOoUuUuUuUuUuUuUuYyYyYyYy'
        s = ''
        for c in input_str:
            if c in s1:
                s += s0[s1.index(c)]
            else:
                s += c
        return s

    def needs_realtime_data(self, text: str) -> bool:
        """
        Kiểm tra xem câu hỏi có cần dữ liệu real-time qua Function Calling không.
        """
        clean = text.lower().strip()
        clean_no_punct = re.sub(r'[^\w\s]', '', clean)
        clean_no_accents = self.remove_accents(clean_no_punct)
        
        # Check both with accents and without accents
        return any(kw in clean_no_punct or self.remove_accents(kw) in clean_no_accents for kw in REALTIME_KEYWORDS)


    def build_search_query(self, user_message: str, history: list[dict] = None) -> str:
        """
        Tối ưu hóa câu truy vấn RAG khi người dùng dùng đại từ ngắn.
        """
        short_followup_patterns = [
            "nó", "cái đó", "cái này", "còn cái kia", "vậy à", "thế còn",
            "có gì thú vị", "kể thêm", "tại sao", "ở đâu", "cái nào hay",
            "giới thiệu một cái", "kể tiếp đi", "chi tiết hơn", "làm bằng gì", "năm nào"
        ]

        clean = user_message.lower().strip()
        is_short_followup = len(clean.split()) <= 6 and any(p in clean for p in short_followup_patterns)

        if is_short_followup and history and len(history) > 0:
            recent_context = []
            for item in history[-2:]:
                c = item.get("content", item.get("text", "")).strip()
                if c:
                    recent_context.append(c)
            expanded_query = f"{' '.join(recent_context)} {user_message}"
            return expanded_query[:300]

        return user_message

    async def process_chat(self, user_message: str, history: list[dict] = None) -> dict:
        """
        Quy trình xử lý hội thoại thông minh 3 nhánh:
          1. Chitchat → Gemini trực tiếp
          2. Real-time → Function Calling qua Gemini
          3. Tĩnh → RAG ChromaDB → Gemini
        """
        user_message = user_message.strip()
        if not user_message:
            return {
                "answer": "Chào bạn 👋 Hôm nay mình có thể giúp gì cho bạn?",
                "sources": []
            }

        # ── Nhánh 1: Chitchat ───────────────────────────────────────────────
        is_chitchat = self.is_conversational_chitchat(user_message, history)
        if is_chitchat:
            cached_ans = get_cached_chitchat_response(user_message)
            if cached_ans:
                return {"answer": cached_ans, "sources": []}
                
            answer = await self.gemini.generate_response(
                user_message=user_message,
                context="",
                history=history,
                is_chitchat=True,
            )
            return {"answer": answer, "sources": []}

        # ── Nhánh 2: Real-time data → Function Calling ──────────────────────
        if self.needs_realtime_data(user_message):
            print(f"[RAG] Phát hiện câu hỏi real-time → dùng Function Calling")
            answer = await self.gemini.generate_response_with_tools(
                user_message=user_message,
                context="",
                history=history,
                is_chitchat=False,
            )
            return {"answer": answer, "sources": []}

        # ── Nhánh 3: Tra cứu tĩnh → RAG ChromaDB ───────────────────────────
        search_query = self.build_search_query(user_message, history)
        query_embedding = await get_embedding_async(search_query)

        matched_chunks = self.vector_db.query_similar(
            query_embedding=query_embedding,
            query_text=search_query,
            n_results=6
        )

        DISTANCE_THRESHOLD = 1.9
        context_parts = []
        sources = []
        seen_titles = set()
        current_context_len = 0

        for chunk in matched_chunks:
            dist = chunk.get("distance", 0.0)
            meta = chunk.get("metadata", {})
            content = chunk.get("content", "")
            title = meta.get("title", meta.get("name", "Tư liệu Bảo tàng"))
            category = meta.get("category", "Tư liệu lịch sử")
            period = meta.get("period", "")

            if dist < DISTANCE_THRESHOLD:
                part_text = f"### {title} (Phân loại: {category})\n{content}"
                if current_context_len + len(part_text) > 6000:
                    break
                
                context_parts.append(part_text)
                current_context_len += len(part_text)

                if title not in seen_titles:
                    seen_titles.add(title)
                    snippet = content[:180] + ("..." if len(content) > 180 else "")
                    sources.append({
                        "id": chunk.get("id", ""),
                        "title": title,
                        "category": category,
                        "period": period,
                        "snippet": snippet,
                        "relevance": round(max(0.0, 1.0 - (dist / 2.0)) * 100, 1) if dist > 0 else 95.0
                    })

        context_str = "\n\n".join(context_parts)

        answer = await self.gemini.generate_response(
            user_message=user_message,
            context=context_str,
            history=history,
            is_chitchat=False,
        )

        # Làm sạch sources nếu không tìm thấy kết quả phù hợp
        if "chưa tìm thấy thông tin chính xác" in answer.lower() or "không có thông tin" in answer.lower():
            if len(sources) > 0 and sources[0].get("relevance", 0) < 65:
                sources = []

        return {"answer": answer, "sources": sources}

    async def process_chat_stream(
        self,
        user_message: str,
        history: list[dict] = None,
    ):
        """
        Giống process_chat() nhưng trả về generator để streaming.
        Yield từng text chunk.
        """
        user_message = user_message.strip()
        if not user_message:
            yield "Chào bạn 👋 Hôm nay mình có thể giúp gì cho bạn?"
            return

        is_chitchat = self.is_conversational_chitchat(user_message, history)
        if is_chitchat:
            cached_ans = get_cached_chitchat_response(user_message)
            if cached_ans:
                yield cached_ans
                return

        use_tools = self.needs_realtime_data(user_message)

        context_str = ""
        if not is_chitchat and not use_tools:
            search_query = self.build_search_query(user_message, history)
            query_embedding = await get_embedding_async(search_query)
            matched_chunks = self.vector_db.query_similar(
                query_embedding=query_embedding,
                query_text=search_query,
                n_results=6
            )
            DISTANCE_THRESHOLD = 1.9
            context_parts = []
            current_context_len = 0
            for chunk in matched_chunks:
                dist = chunk.get("distance", 0.0)
                meta = chunk.get("metadata", {})
                content = chunk.get("content", "")
                title = meta.get("title", "Tư liệu Bảo tàng")
                category = meta.get("category", "Tư liệu lịch sử")
                if dist < DISTANCE_THRESHOLD:
                    part_text = f"### {title} (Phân loại: {category})\n{content}"
                    if current_context_len + len(part_text) > 6000:
                        break
                    context_parts.append(part_text)
                    current_context_len += len(part_text)
            context_str = "\n\n".join(context_parts)

        async for chunk in self.gemini.generate_response_stream(
            user_message=user_message,
            context=context_str,
            history=history,
            is_chitchat=is_chitchat,
            use_tools=use_tools,
        ):
            yield chunk


# Khởi tạo singleton instance
rag_pipeline = RAGPipeline()
