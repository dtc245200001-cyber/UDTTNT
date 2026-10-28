"""
RAG Pipeline — Điều phối luồng xử lý hội thoại thông minh 3 Vùng.

Các nhánh xử lý:
  1. Chitchat / xã giao → Gemini trực tiếp (không thẻ, không RAG)
  2. Intent có cấu trúc → Truy vấn trực tiếp DB Supabase (list_featured, trien_lam_dang_dien_ra...)
  3. Chế độ General (Zone 3 hoặc ngoài bảo tàng) → Kiến thức mở Gemini (temperature 0.7, không thẻ)
  4. Chế độ Museum (Zone 1 hoặc Zone 2 Vùng xám bảo tàng) → Grounded RAG V2 (temperature 0.2)
     + Ngữ cảnh rỗng: Báo chưa có dữ liệu và hướng dẫn hỏi lễ tân, KHÔNG bịa
     + Entity Linking: Gắn thẻ hiện vật chuẩn xác từ DB cho câu trả lời
"""
import asyncio
import json
import logging
import re
from functools import lru_cache
from cachetools import TTLCache

from core.config import settings
from services.embedding import get_embedding, get_embedding_async
from services.vector_db import vector_db_service
from services.gemini import (
    gemini_service,
    SYSTEM_PROMPT,
    MUSEUM_GROUNDED_PROMPT,
    GENERAL_PROMPT,
    GRAY_ZONE_HYBRID_PROMPT
)
from services.constants import REALTIME_KEYWORDS, MUSEUM_KEYWORDS
from services.text_utils import matches_phrase, remove_accents
from services.rag_router import RAGRouter, RouterDecision
from services.entity_linking import entity_linking_service

logger = logging.getLogger(__name__)

EMPTY_MUSEUM_NOTICE = (
    "Hiện tại hệ thống dữ liệu của Bảo tàng chưa có thông tin chi tiết về nội dung này. "
    "Bạn vui lòng liên hệ quầy thông tin/lễ tân của Bảo tàng để được hướng dẫn chi tiết nhé."
)

_embed_cache = TTLCache(maxsize=500, ttl=3600)
_answer_cache = TTLCache(maxsize=200, ttl=600)


def normalize_question(text: str) -> str:
    q = (text or "").lower().strip()
    q = re.sub(r"\s+", " ", q)
    q = re.sub(r"[!?.,;:()\[\]]+", "", q).strip()
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


@lru_cache(maxsize=200)
def get_cached_chitchat_response(text: str) -> str | None:
    """Trả lời nhanh các câu chào hỏi/cảm ơn phổ biến."""
    clean = text.lower().strip()
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
        self.router = RAGRouter(vector_collection=self.vector_db.collection)
        self.entity_linking = entity_linking_service

    def is_conversational_chitchat(self, text: str, history: list[dict] = None) -> bool:
        """Nhận diện câu chào hỏi, cảm ơn, tâm sự không cần gọi RAG."""
        clean = text.lower().strip()
        clean_no_punct = re.sub(r'[^\w\s]', '', clean)
        words = clean_no_punct.split()

        if matches_phrase(text, MUSEUM_KEYWORDS + REALTIME_KEYWORDS):
            return False

        greetings = [
            "chào", "xin chào", "hello", "hi", "hey", "halo",
            "bạn là ai", "bạn tên gì", "tên bạn là gì",
            "bạn làm được gì", "giúp gì", "giới thiệu bản thân",
            "cảm ơn", "cám ơn", "thank", "thanks", "tạm biệt", "bye", "goodbye",
            "khỏe không", "mấy tuổi", "tuyệt vời",
            "rất hay", "ok", "oke", "được rồi", "hay quá", "chán", "buồn", "vui"
        ]

        if len(words) <= 7 and matches_phrase(text, greetings):
            return True
        return False

    def build_search_query(self, user_message: str, history: list[dict] = None) -> str:
        """Mở rộng query ngắn với ngữ cảnh gần nhất nếu có."""
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

    def format_featured_artifacts_answer(self, featured_items: list[dict]) -> tuple[str, list[str]]:
        """Dựng câu trả lời danh sách hiện vật tiêu biểu trực tiếp từ DB Supabase (is_featured = true)."""
        if not featured_items:
            return "Hiện tại danh sách hiện vật tiêu biểu đang được cập nhật.", []

        lines = ["🏛️ **Các bảo vật quốc gia và hiện vật tiêu biểu của Bảo tàng Lịch sử Quốc gia:**\n"]
        artifact_ids = []
        for i, item in enumerate(featured_items, 1):
            name = item.get("name", "")
            period = item.get("period", "")
            loc = item.get("location", "")
            desc = item.get("description", "")
            aid = item.get("id", "")
            artifact_ids.append(aid)

            period_str = f"Thời kỳ: {period}" if period else ""
            loc_str = f"Vị trí: {loc}" if loc else ""
            extra = " · ".join(filter(None, [period_str, loc_str]))

            line = f"{i}. **{name}**"
            if extra:
                line += f" ({extra})"
            if desc:
                short_desc = desc[:150] + ("..." if len(desc) > 150 else "")
                line += f"\n   - {short_desc}"
            lines.append(line)

        lines.append("\nBạn có muốn tìm hiểu chi tiết hơn về hiện vật nào trong số này không?")
        return "\n".join(lines), artifact_ids

    async def _retrieve_context(
        self, user_message: str, history: list = None
    ) -> tuple:
        """
        Truy xuất tài liệu từ collection V2 (cosine metric).
        Chỉ giữ các chunk có distance < zone_general_min (0.42).
        Trả về (context_str, sources, artifact_ids, min_dist, skipped).
        """
        search_query = self.build_search_query(user_message, history)
        query_embedding = await cached_get_embedding(search_query)

        matched_chunks = await asyncio.to_thread(
            self.vector_db.query_similar,
            query_embedding,
            search_query,
            6,
        )

        max_allowed_dist = float(getattr(settings, "RAG_ZONE_GENERAL_MIN", 0.42))
        max_chars = int(settings.RAG_MAX_CONTEXT_CHARS or 4000)
        max_chunk = int(settings.RAG_MAX_CHUNK_CHARS or 1200)

        context_parts = []
        sources = []
        seen_titles = set()
        current_len = 0
        retrieved_ids = []

        # Lọc theo ngưỡng cosine tối đa
        valid_chunks = [c for c in (matched_chunks or []) if float(c.get("distance", 10.0)) < max_allowed_dist]

        for chunk in valid_chunks:
            dist = float(chunk.get("distance", 0.0))
            meta = chunk.get("metadata", {})
            content = (chunk.get("content", "") or "")[:max_chunk]
            title = meta.get("title", meta.get("name", "Tư liệu Bảo tàng"))
            category = meta.get("category", "Tư liệu lịch sử")
            period = meta.get("period", "")
            source_table = meta.get("source_table")
            source_id = meta.get("source_id")

            part = f"### {title} (Phân loại: {category})\n{content}"
            if current_len + len(part) > max_chars:
                break
            context_parts.append(part)
            current_len += len(part)

            if source_table == "hien_vat" and source_id and source_id not in retrieved_ids:
                retrieved_ids.append(source_id)

            if title not in seen_titles:
                seen_titles.add(title)
                snippet = content[:180] + ("..." if len(content) > 180 else "")
                # Độ tương đồng cosine: (1.0 - dist) * 100%
                sources.append({
                    "id": chunk.get("id", ""),
                    "title": title,
                    "category": category,
                    "period": period,
                    "snippet": snippet,
                    "relevance": round(max(0.0, 1.0 - dist) * 100, 1),
                    "source_table": source_table,
                    "source_id": source_id,
                })

        min_dist = min([float(c.get("distance", 10.0)) for c in matched_chunks], default=10.0)
        return "\n\n".join(context_parts), sources, retrieved_ids, min_dist, False

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
            _answer_cache[normalize_question(user_message)] = answer
        except Exception:
            pass

    async def process_chat(self, user_message: str, history: list[dict] = None) -> dict:
        """Quy trình xử lý chat hoàn chỉnh với 3 Vùng và Entity Linking."""
        user_message = user_message.strip()
        if not user_message:
            return {
                "answer": "Chào bạn 👋 Hôm nay mình có thể giúp gì cho bạn?",
                "sources": [],
                "artifact_ids": []
            }

        # Cache HIT cho câu hỏi lặp lại không có history
        cached = self._answer_cache_get(user_message, history)
        if cached:
            return {"answer": cached, "sources": [], "artifact_ids": []}

        # ── 1. Định tuyến thông minh 3 Vùng ─────────────────────────────────
        decision: RouterDecision = await self.router.route_query(user_message, history=history)

        # ── 2. Xử lý Chào hỏi / Chitchat ────────────────────────────────────
        if self.is_conversational_chitchat(user_message, history):
            cached_ans = get_cached_chitchat_response(user_message)
            if cached_ans:
                return {"answer": cached_ans, "sources": [], "artifact_ids": []}

            answer = await self.gemini.generate_response(
                user_message=user_message,
                context="",
                history=history,
                is_chitchat=True,
            )
            return {"answer": answer, "sources": [], "artifact_ids": []}

        # ── 3. Intent có cấu trúc đi thẳng DB (không dùng similarity) ────────
        if decision.intent == "list_featured":
            featured = self.entity_linking.get_featured_artifacts(limit=8)
            ans, a_ids = self.format_featured_artifacts_answer(featured)
            return {"answer": ans, "sources": [], "artifact_ids": a_ids}

        LIVE_INTENT_LABELS = {
            "gia_ve": "BẢNG GIÁ VÀ CÁC LOẠI VÉ THAM QUAN ĐANG BÁN THẬT TỪ SUPABASE (BẢNG ve_tham_quan)",
            "trien_lam": "DANH SÁCH TRIỂN LÃM THẬT TỪ SUPABASE (BẢNG trien_lam)",
            "trien_lam_dang_dien_ra": "DANH SÁCH TRIỂN LÃM THẬT TỪ SUPABASE (BẢNG trien_lam)",
            "su_kien": "DANH SÁCH SỰ KIỆN SẮP DIỄN RA THẬT TỪ SUPABASE (BẢNG su_kien)",
            "chuyen_de": "DANH SÁCH CÁC CHUYÊN ĐỀ TRƯNG BÀY THẬT TỪ SUPABASE (BẢNG phong_trung_bay)",
            "danh_gia": "ĐÁNH GIÁ VÀ NHẬN XÉT THỰC TẾ CỦA DU KHÁCH TỪ SUPABASE (BẢNG danh_gia)",
            "thong_ke_bao_tang": "DỮ LIỆU THỐNG KÊ TỔNG QUAN THẬT TỪ SUPABASE",
        }

        if decision.intent in LIVE_INTENT_LABELS and decision.direct_data:
            label = LIVE_INTENT_LABELS[decision.intent]
            context_str = json.dumps(decision.direct_data, ensure_ascii=False, indent=2)
            prompt_context = (
                f"{label}:\n{context_str}\n\n"
                f"YÊU CẦU BẮT BUỘC:\n"
                f"- Trả lời chính xác, đầy đủ và trung thực dựa trên dữ liệu thật của hệ thống bảo tàng ở trên.\n"
                f"- Tuyệt đối không tự bịa đặt hoặc dùng số liệu/quy định cũ ngoài hệ thống."
            )
            answer = await self.gemini.generate_response(
                user_message=user_message,
                context=prompt_context,
                history=history,
                system_instruction=MUSEUM_GROUNDED_PROMPT,
                temperature=0.2
            )
            return {"answer": answer, "sources": [], "artifact_ids": []}

        # ── 4. Chế độ General (Zone 3 hoặc Vùng xám không liên quan bảo tàng) ─
        if decision.final_mode == "general":
            answer = await self.gemini.generate_response(
                user_message=user_message,
                context="",
                history=history,
                system_instruction=GENERAL_PROMPT,
                temperature=0.7
            )
            return {"answer": answer, "sources": [], "artifact_ids": []}

        # ── 5. Chế độ Museum (Zone 1 Grounded hoặc Zone 2 Gray Museum) ───────
        context_str, sources, retrieved_ids, min_dist, _ = await self._retrieve_context(
            user_message, history
        )

        # Xử lý ngữ cảnh rỗng (hỏi bảo tàng nhưng không có dữ liệu)
        if not context_str.strip() or min_dist >= float(getattr(settings, "RAG_ZONE_GENERAL_MIN", 0.42)):
            return {
                "answer": EMPTY_MUSEUM_NOTICE,
                "sources": [],
                "artifact_ids": []
            }

        # Lựa chọn Prompt và Temperature
        if decision.zone == "zone_2_gray":
            sys_inst = GRAY_ZONE_HYBRID_PROMPT
            temp = 0.3
        else:
            sys_inst = MUSEUM_GROUNDED_PROMPT
            temp = 0.2

        answer = await self.gemini.generate_response(
            user_message=user_message,
            context=context_str,
            history=history,
            system_instruction=sys_inst,
            temperature=temp
        )

        # Entity Linking trích xuất thẻ hiện vật
        low_ans = answer.lower()
        if "chua co thong tin" in low_ans or "khong co thong tin" in low_ans or "chua tim thay" in low_ans:
            sources = []
            artifact_ids = []
        else:
            prev_mode, prev_aid = self.router.check_previous_turn_mode(history)
            artifact_ids = self.entity_linking.resolve_artifact_ids(
                final_mode="museum",
                answer_text=answer,
                intent=decision.intent,
                retrieved_ids=retrieved_ids,
                context_id=prev_aid if decision.is_followup else None
            )

        self._answer_cache_set(user_message, answer, history)
        return {"answer": answer, "sources": sources, "artifact_ids": artifact_ids}

    async def process_chat_stream(
        self,
        user_message: str,
        history: list[dict] = None,
    ):
        """Streaming response có hỗ trợ 3 Vùng, SSE chunks và thẻ artifact."""
        user_message = user_message.strip()
        if not user_message:
            yield "Chào bạn 👋 Hôm nay mình có thể giúp gì cho bạn?"
            return

        # 1. Định tuyến 3 Vùng
        decision: RouterDecision = await self.router.route_query(user_message, history=history)

        # 2. Chitchat
        if self.is_conversational_chitchat(user_message, history):
            cached_ans = get_cached_chitchat_response(user_message)
            if cached_ans:
                yield cached_ans
                return
            async for chunk in self.gemini.generate_response_stream(
                user_message=user_message,
                context="",
                history=history,
                is_chitchat=True,
            ):
                yield chunk
            return

        # 3. Intent có cấu trúc
        if decision.intent == "list_featured":
            featured = self.entity_linking.get_featured_artifacts(limit=8)
            ans, a_ids = self.format_featured_artifacts_answer(featured)
            yield ans
            if a_ids:
                yield {"artifact_ids": a_ids}
            return

        LIVE_INTENT_LABELS = {
            "gia_ve": "BẢNG GIÁ VÀ CÁC LOẠI VÉ THAM QUAN ĐANG BÁN THẬT TỪ SUPABASE (BẢNG ve_tham_quan)",
            "trien_lam": "DANH SÁCH TRIỂN LÃM THẬT TỪ SUPABASE (BẢNG trien_lam)",
            "trien_lam_dang_dien_ra": "DANH SÁCH TRIỂN LÃM THẬT TỪ SUPABASE (BẢNG trien_lam)",
            "su_kien": "DANH SÁCH SỰ KIỆN SẮP DIỄN RA THẬT TỪ SUPABASE (BẢNG su_kien)",
            "chuyen_de": "DANH SÁCH CÁC CHUYÊN ĐỀ TRƯNG BÀY THẬT TỪ SUPABASE (BẢNG phong_trung_bay)",
            "danh_gia": "ĐÁNH GIÁ VÀ NHẬN XÉT THỰC TẾ CỦA DU KHÁCH TỪ SUPABASE (BẢNG danh_gia)",
            "thong_ke_bao_tang": "DỮ LIỆU THỐNG KÊ TỔNG QUAN THẬT TỪ SUPABASE",
        }

        if decision.intent in LIVE_INTENT_LABELS and decision.direct_data:
            label = LIVE_INTENT_LABELS[decision.intent]
            context_str = json.dumps(decision.direct_data, ensure_ascii=False, indent=2)
            prompt_context = (
                f"{label}:\n{context_str}\n\n"
                f"YÊU CẦU BẮT BUỘC:\n"
                f"- Trả lời chính xác, đầy đủ và trung thực dựa trên dữ liệu thật của hệ thống bảo tàng ở trên.\n"
                f"- Tuyệt đối không tự bịa đặt hoặc dùng số liệu/quy định cũ ngoài hệ thống."
            )
            async for chunk in self.gemini.generate_response_stream(
                user_message=user_message,
                context=prompt_context,
                history=history,
                system_instruction=MUSEUM_GROUNDED_PROMPT,
                temperature=0.2
            ):
                yield chunk
            return

        # 4. Chế độ General
        if decision.final_mode == "general":
            async for chunk in self.gemini.generate_response_stream(
                user_message=user_message,
                context="",
                history=history,
                system_instruction=GENERAL_PROMPT,
                temperature=0.7
            ):
                yield chunk
            return

        # 5. Chế độ Museum
        context_str, sources, retrieved_ids, min_dist, _ = await self._retrieve_context(
            user_message, history
        )

        if not context_str.strip() or min_dist >= float(getattr(settings, "RAG_ZONE_GENERAL_MIN", 0.42)):
            yield EMPTY_MUSEUM_NOTICE
            return

        if decision.zone == "zone_2_gray":
            sys_inst = GRAY_ZONE_HYBRID_PROMPT
            temp = 0.3
        else:
            sys_inst = MUSEUM_GROUNDED_PROMPT
            temp = 0.2

        # Gửi sources (trích dẫn RAG) ngay đầu stream để frontend hiển thị.
        # Client cũ không đọc key này thì bỏ qua — tương thích ngược.
        if sources:
            yield {"sources": sources}

        full_answer = []
        async for chunk in self.gemini.generate_response_stream(
            user_message=user_message,
            context=context_str,
            history=history,
            system_instruction=sys_inst,
            temperature=temp
        ):
            if isinstance(chunk, str):
                full_answer.append(chunk)
            yield chunk

        # Yield artifact cards at end of stream
        complete_text = "".join(full_answer)
        low_ans = complete_text.lower()
        if not ("chua co thong tin" in low_ans or "khong co thong tin" in low_ans or "chua tim thay" in low_ans):
            prev_mode, prev_aid = self.router.check_previous_turn_mode(history)
            artifact_ids = self.entity_linking.resolve_artifact_ids(
                final_mode="museum",
                answer_text=complete_text,
                intent=decision.intent,
                retrieved_ids=retrieved_ids,
                context_id=prev_aid if decision.is_followup else None
            )
            if artifact_ids:
                yield {"artifact_ids": artifact_ids}


# Khởi tạo singleton instance
rag_pipeline = RAGPipeline()
