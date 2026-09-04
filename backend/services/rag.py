import re
from services.embedding import get_embedding
from services.vector_db import vector_db_service
from services.gemini import gemini_service

class RAGPipeline:
    def __init__(self):
        self.vector_db = vector_db_service
        self.gemini = gemini_service

    def is_conversational_chitchat(self, text: str, history: list[dict] = None) -> bool:
        """
        Nhận diện câu chào hỏi, cảm ơn, tâm sự đời thường không cần gọi RAG.
        """
        clean = text.lower().strip()
        clean_no_punct = re.sub(r'[^\w\s]', '', clean)
        words = clean_no_punct.split()

        # Từ khóa chỉ định rõ cần tra cứu bảo tàng/lịch sử
        museum_keywords = [
            "trống", "hiện vật", "bảo vật", "cổ vật", "vé", "giá vé", "giờ mở cửa",
            "mở cửa", "địa chỉ", "cơ sở", "triều", "vua", "kháng chiến", "trưng bày",
            "triển lãm", "đông sơn", "ngọc lũ", "cảnh thịnh", "đào thịnh", "đường kách mệnh",
            "chúa nguyễn", "lê lợi", "quang trung", "hồ chí minh", "tiền sử", "ngô quyền",
            "lý", "trần", "lê", "nguyễn", "tây sơn"
        ]

        if any(kw in clean_no_punct for kw in museum_keywords):
            return False

        # Các cụm từ xã giao thông thường
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

    def build_search_query(self, user_message: str, history: list[dict] = None) -> str:
        """
        Tối ưu hóa câu truy vấn RAG khi người dùng dùng đại từ ngắn (nó, cái đó, có gì thú vị, ở đâu...)
        bằng cách kết hợp với ngữ cảnh gần nhất trong lịch sử hội thoại.
        """
        short_followup_patterns = [
            "nó", "cái đó", "cái này", "còn cái kia", "vậy à", "thế còn",
            "có gì thú vị", "kể thêm", "tại sao", "ở đâu", "cái nào hay",
            "giới thiệu một cái", "kể tiếp đi", "chi tiết hơn", "làm bằng gì", "năm nào"
        ]

        clean = user_message.lower().strip()
        is_short_followup = len(clean.split()) <= 6 and any(p in clean for p in short_followup_patterns)

        if is_short_followup and history and len(history) > 0:
            # Lấy 1-2 tin nhắn gần nhất để làm giàu từ khóa tìm kiếm
            recent_context = []
            for item in history[-2:]:
                c = item.get("content", item.get("text", "")).strip()
                if c:
                    recent_context.append(c)
            expanded_query = f"{' '.join(recent_context)} {user_message}"
            return expanded_query[:300]

        return user_message

    def process_chat(self, user_message: str, history: list[dict] = None) -> dict:
        """
        Quy trình xử lý hội thoại thông minh:
        1. Phân biệt giao tiếp tự nhiên vs Tra cứu chuyên môn bảo tàng.
        2. Mở rộng câu truy vấn theo ngữ cảnh lịch sử hội thoại nếu có đại từ.
        3. Truy xuất RAG ChromaDB khi cần thiết.
        4. Gemini tổng hợp câu trả lời tự nhiên, thân thiện và chính xác.
        """
        user_message = user_message.strip()
        if not user_message:
            return {
                "answer": "Chào bạn 👋 Hôm nay mình có thể giúp gì cho bạn?",
                "sources": []
            }

        # 1. Kiểm tra xem có cần bỏ qua RAG cho câu xã giao / tâm sự không
        is_chitchat = self.is_conversational_chitchat(user_message, history)

        context_parts = []
        sources = []
        seen_titles = set()

        if not is_chitchat:
            # 2. Xây dựng câu truy vấn đã giải quyết đại từ ngữ cảnh
            search_query = self.build_search_query(user_message, history)
            query_embedding = get_embedding(search_query)

            matched_chunks = self.vector_db.query_similar(
                query_embedding=query_embedding,
                query_text=search_query,
                n_results=2
            )

            DISTANCE_THRESHOLD = 1.65

            for chunk in matched_chunks:
                dist = chunk.get("distance", 0.0)
                meta = chunk.get("metadata", {})
                content = chunk.get("content", "")
                title = meta.get("title", meta.get("name", "Tư liệu Bảo tàng"))
                category = meta.get("category", "Tư liệu lịch sử")
                period = meta.get("period", "")

                if dist < DISTANCE_THRESHOLD or len(context_parts) == 0:
                    context_parts.append(f"### {title} (Phân loại: {category})\n{content}")

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

        # 3. Gửi cho Gemini sinh câu trả lời tự nhiên
        answer = self.gemini.generate_response(
            user_message=user_message,
            context=context_str,
            history=history,
            is_chitchat=is_chitchat
        )

        # 4. Làm sạch danh sách sources nếu là cuộc trò chuyện xã giao hoặc không tìm thấy dữ liệu
        if is_chitchat or "chưa tìm thấy thông tin chính xác" in answer.lower() or "không có thông tin" in answer.lower():
            if len(sources) > 0 and sources[0].get("relevance", 0) < 65:
                sources = []

        return {
            "answer": answer,
            "sources": sources
        }

# Khởi tạo singleton instance
rag_pipeline = RAGPipeline()
