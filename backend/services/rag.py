"""
RAG Pipeline — Điều phối luồng xử lý hội thoại thông minh.

Ba nhánh xử lý:
  1. Chitchat / xã giao → Gemini trả lời luôn (không RAG, không function)
  2. Dữ liệu real-time (vé, sự kiện hôm nay...) → Function Calling
  3. Kiến thức bảo tàng tĩnh → RAG ChromaDB → Gemini tổng hợp

Nhom B: B3 song song hoa + dung chung helper, B4 bo qua RAG cho cau kien
thuc chung ro rang, B5 cache embedding + cache cau tra loi.
"""
import asyncio
import re
from functools import lru_cache
from cachetools import TTLCache
from core.config import settings
from services.embedding import get_embedding, get_embedding_async
from services.vector_db import vector_db_service
from services.gemini import gemini_service
from services.constants import REALTIME_KEYWORDS, MUSEUM_KEYWORDS
from services.text_utils import matches_phrase, remove_accents

# B4: dau hieu cau hoi kien thuc chung ro rang (da chuan hoa khong dau).
# Cau khop 1 trong cac dau hieu nay VA khong co tu khoa bao tang/realtime
# -> bo qua embed + Chroma, goi thang LLM.
GENERAL_KNOWLEDGE_MARKERS = [
    "bang may",          # "2+2 bang may"
    "la gi",             # "thu do cua ... la gi", "... la gi?"
    "dinh nghia",
    "giai thich",
    "thuyet ",           # "thuyet tuong doi..."
    "thoi tiet",
    "nguyen tac",
    "tai sao",
    "nhu the nao",
    "cua nuoc nao",
    "o dau",             # dia ly chung (khong keyword bao tang)
]
_ARITHMETIC_RE = None


def _get_arithmetic_re():
    global _ARITHMETIC_RE
    if _ARITHMETIC_RE is None:
        import re as _re
        _ARITHMETIC_RE = _re.compile(r"\d\s*[+\-*/^]\s*\d")
    return _ARITHMETIC_RE


# B5: cache embedding (TTL 1h) + cache cau tra loi tinh (TTL theo settings).
_embed_cache = TTLCache(maxsize=500, ttl=3600)
_answer_cache = TTLCache(maxsize=200, ttl=600)


def normalize_question(text: str) -> str:
    import re as _re
    q = (text or "").lower().strip()
    q = _re.sub(r"\s+", " ", q)
    q = _re.sub(r"[!?.,;:()\[\]]+", "", q).strip()
    return q


async def cached_get_embedding(text: str) -> list:
    key = normalize_question(text)
    try:
        hit = _embed_cache.get(key)
    except Exception:
        hit = None
    if hit is not None:
        return hit
    vec = await get_embedding_async(text)
    try:
        _embed_cache[key] = vec
    except Exception:
        pass
    return vec


def is_general_knowledge_question(text: str) -> bool:
    """True neu cau ro rang la kien thuc chung VA khong lien quan bao tang."""
    if matches_phrase(text, MUSEUM_KEYWORDS + REALTIME_KEYWORDS):
        return False
    low = normalize_question(remove_accents(text.lower()))
    if _get_arithmetic_re().search(low):
        return True
    return any(m in low for m in GENERAL_KNOWLEDGE_MARKERS)


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

        clean_no_accents = remove_accents(clean_no_punct)

        # Ưu tiên kiểm tra museum/realtime keywords trước
        if matches_phrase(text, MUSEUM_KEYWORDS + REALTIME_KEYWORDS):
            return False
        # A4: "hôm nay thế nào" KHÔNG còn là chitchat — đó có thể là câu hỏi
        # thời tiết/realtime. Chitchat chỉ khớp các mẫu chào hỏi thực sự.
        greetings = [
            "chào", "xin chào", "hello", "hi", "hey", "halo",
            "bạn là ai", "bạn tên gì", "tên bạn là gì",
            "bạn làm được gì", "giúp gì", "giới thiệu bản thân",
            "cảm ơn", "cám ơn", "thank", "thanks", "tạm biệt", "bye", "goodbye",
            "khỏe không", "mấy tuổi", "tuyệt vời",
            "rất hay", "ok", "oke", "được rồi", "hay quá", "chán", "buồn", "vui"
        ]

        # Use matches_phrase instead of substring match
        if len(words) <= 7 and matches_phrase(text, greetings):
            return True

        return False

    def needs_realtime_data(self, text: str) -> bool:
        """
        Kiểm tra xem câu hỏi có cần dữ liệu real-time qua Function Calling không.
        """
        # Dùng matches_phrase thay vì substring
        return matches_phrase(text, REALTIME_KEYWORDS)

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

    async def _retrieve_context(
        self, user_message: str, history: list = None
    ) -> tuple:
        """B3/B4/B5: tra cuu RAG chung cho ca process_chat va process_chat_stream.

        Tra ve (context_str, sources, artifact_ids, min_dist, skipped).
        """
        if is_general_knowledge_question(user_message):
            print("[RAG] Cau kien thuc chung -> bo qua embed + Chroma, goi thang LLM.")
            return "", [], [], 10.0, True

        search_query = self.build_search_query(user_message, history)
        # B3: embed chay trong thread pool san; cau truc san de mo rong song song.
        query_embedding = await cached_get_embedding(search_query)

        matched_chunks = await asyncio.to_thread(
            self.vector_db.query_similar,
            query_embedding,
            search_query,
            6,
        )

        threshold = float(settings.RAG_DISTANCE_THRESHOLD or 0.85)
        max_chars = int(settings.RAG_MAX_CONTEXT_CHARS or 4000)
        max_chunk = int(settings.RAG_MAX_CHUNK_CHARS or 1200)
        context_parts = []
        sources = []
        seen_titles = set()
        current_len = 0
        artifact_ids = []

        if matched_chunks and matched_chunks[0].get("distance", 10.0) >= threshold:
            matched_chunks = []

        for chunk in matched_chunks:
            dist = chunk.get("distance", 0.0)
            if dist >= threshold:
                continue
            meta = chunk.get("metadata", {})
            content = (chunk.get("content", "") or "")[:max_chunk]
            title = meta.get("title", meta.get("name", "Tu lieu Bao tang"))
            category = meta.get("category", "Tu lieu lich su")
            period = meta.get("period", "")
            source_table = meta.get("source_table")
            source_id = meta.get("source_id")

            part = f"### {title} (Phan loai: {category})\n{content}"
            if current_len + len(part) > max_chars:
                break
            context_parts.append(part)
            current_len += len(part)

            if source_table == "hien_vat" and source_id and source_id not in artifact_ids:
                artifact_ids.append(source_id)
            if title not in seen_titles:
                seen_titles.add(title)
                snippet = content[:180] + ("..." if len(content) > 180 else "")
                sources.append({
                    "id": chunk.get("id", ""),
                    "title": title,
                    "category": category,
                    "period": period,
                    "snippet": snippet,
                    "relevance": round(max(0.0, 1.0 - (dist / 2.0)) * 100, 1) if dist > 0 else 95.0,
                    "source_table": source_table,
                    "source_id": source_id,
                })

        min_dist = 10.0
        for _m in (matched_chunks or []):
            try:
                _d = float(_m.get("distance", 10.0))
            except Exception:
                _d = 10.0
            if _d < min_dist:
                min_dist = _d

        return "\n\n".join(context_parts), sources, artifact_ids, min_dist, False

    def _answer_cache_get(self, user_message: str, history: list = None):
        if history:
            return None
        try:
            return _answer_cache.get(normalize_question(user_message))
        except Exception:
            return None

    def _answer_cache_set(self, user_message: str, answer: str, history: list = None):
        if history or not answer:
            return
        try:
            size = int(settings.ANSWER_CACHE_SIZE or 200)
            _answer_cache.maxsize = size
            _answer_cache[normalize_question(user_message)] = answer
        except Exception:
            pass

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

        # B5: cache cau tra loi tinh lap lai (chi khi khong co history)
        cached = self._answer_cache_get(user_message, history)
        if cached:
            print("[RAG] Answer cache HIT.")
            return {"answer": cached, "sources": [], "artifact_ids": []}

        # A4: xet realtime TRUOC chitchat
        # ── Nhánh 1: Real-time data → Function Calling ──────────────────────
        if self.needs_realtime_data(user_message):
            print(f"[RAG] Phát hiện câu hỏi real-time → dùng Function Calling")
            answer = await self.gemini.generate_response_with_tools(
                user_message=user_message,
                context="",
                history=history,
                is_chitchat=False,
            )
            return {"answer": answer, "sources": []}

        # ── Nhánh 2: Chitchat ───────────────────────────────────────────────
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

        # Nhanh 3: RAG (B3/B4/B5 qua _retrieve_context)
        context_str, sources, artifact_ids, _min_dist, _skipped = await self._retrieve_context(
            user_message, history
        )

        answer = await self.gemini.generate_response(
            user_message=user_message,
            context=context_str,
            history=history,
            is_chitchat=False,
        )

        # Lam sach sources neu mo hinh noi khong co thong tin nhung van co sources yeu
        low = answer.lower()
        if "chua tim thay thong tin chinh xac" in low or "khong co thong tin" in low:
            if len(sources) > 0 and sources[0].get("relevance", 0) < 65:
                sources = []
                artifact_ids = []

        # B5: luu cache cau tra loi tinh
        self._answer_cache_set(user_message, answer, history)

        return {"answer": answer, "sources": sources, "artifact_ids": artifact_ids[:4]}

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

        # A4: xet realtime TRUOC chitchat (giong process_chat)
        use_tools = self.needs_realtime_data(user_message)

        is_chitchat = False
        if not use_tools:
            is_chitchat = self.is_conversational_chitchat(user_message, history)
            if is_chitchat:
                cached_ans = get_cached_chitchat_response(user_message)
                if cached_ans:
                    yield cached_ans
                    return

        context_str = ""
        artifact_ids = []
        min_dist = 10.0
        if not is_chitchat and not use_tools:
            # B3/B4/B5: dung chung helper voi process_chat
            context_str, _sources, artifact_ids, min_dist, _skipped = await self._retrieve_context(
                user_message, history
            )

        async for chunk in self.gemini.generate_response_stream(
            user_message=user_message,
            context=context_str,
            history=history,
            is_chitchat=is_chitchat,
            use_tools=use_tools,
        ):
            yield chunk

        if not is_chitchat and not use_tools and artifact_ids:
            # Chỉ hiển thị thẻ hiện vật nếu có kết quả RAG thực sự sát (distance < 0.7)
            # để tránh hiện rác khi hỏi câu ngoài luồng.
            if min_dist < 0.7:
                yield {"artifact_ids": artifact_ids[:4]}


# Khởi tạo singleton instance
rag_pipeline = RAGPipeline()
