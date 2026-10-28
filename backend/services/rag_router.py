"""
RAG Router 3 Vùng & Quyết định Chế độ (Museum vs General).
Tuân thủ đầy đủ các yêu cầu:
1. 3 Vùng:
   - Vùng 1 (< 0.30): Grounded pure Museum, temperature ~0.2.
   - Vùng 2 (0.30 - 0.42): Vùng xám, phân giải bằng DB Dynamic Keywords, Context hội thoại, Intent.
   - Vùng 3 (>= 0.42): Chắc chắn General, trả lời bằng kiến thức mở của LLM, không thẻ.
2. Từ khóa động từ DB:
   - dynamic_keyword_service nạp từ Supabase, không hardcode.
   - Loại tên < 2 từ và stopwords, chặn false positive do địa danh thế giới (Louvre...).
3. Câu nối tiếp:
   - Kế thừa chế độ museum khi lượt trước là museum VÀ có dấu hiệu tham chiếu.
   - Giữ artifact_id trong state.
4. Intent có cấu trúc đi thẳng DB:
   - list_featured, trien_lam_dang_dien_ra, thong_ke_bao_tang, gia_ve...
5. Ghi log quyết định ra file riêng (đã loại bỏ PII) khi RAG_ZONE_LOG=true.
"""
import os
import re
import sys
import json
import logging
from datetime import datetime
from typing import Dict, List, Optional, Tuple, Any

from core.config import settings
from services.dynamic_keywords import dynamic_keyword_service, strip_accents
from services.live_data_tools import (
    get_trien_lam_dang_dien_ra,
    get_thong_ke_tong_quan,
    get_ve_gia_va_con_cho,
    get_su_kien_sap_dien_ra,
    get_chuyen_de_trung_bay,
    get_danh_gia_tong_quan,
)

logger = logging.getLogger(__name__)

# File log riêng cho quyết định vùng
LOG_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "logs")
os.makedirs(LOG_DIR, exist_ok=True)
ZONE_LOG_PATH = os.path.join(LOG_DIR, "rag_zone_decisions.log")

# Dấu hiệu câu nối tiếp / tham chiếu ngữ cảnh
FOLLOWUP_PATTERNS = [
    r"\bcai nay\b", r"\bcai kia\b", r"\bcai do\b", r"\bno\b",
    r"\bvat nay\b", r"\bhien vat nay\b", r"\bbao vat nay\b",
    r"\bbuc nay\b", r"\btac pham nay\b", r"\btuong nay\b",
    r"\bcon cai kia\b", r"\bthe con\b", r"\bvay con\b", r"\bcon thi sao\b",
    r"\bo dau\b", r"\bo tang may\b", r"\bo phong nao\b", r"\bo ke nao\b",
    r"\blam bang gi\b", r"\bchat lieu gi\b",
    r"\bai lam ra\b", r"\bai tao tac\b", r"\bai sang tac\b", r"\btac gia\b",
    r"\bnien dai the nao\b", r"\bco tu khi nao\b", r"\bnam nao\b", r"\bthoi nao\b",
    r"\bke them di\b", r"\bke tiep di\b", r"\bke them\b", r"\bchi tiet hon\b",
    r"\bco chup anh duoc khong\b", r"\bgia bao nhieu\b"
]

# Intent có cấu trúc (truy vấn trực tiếp CSDL Supabase theo dữ liệu thời gian thực)
STRUCTURED_INTENTS = {
    "list_featured": [
        r"\bhien vat tieu bieu\b", r"\bcac hien vat tieu bieu\b",
        r"\bnhung hien vat tieu bieu\b", r"\bbao vat quoc gia\b",
        r"\bbao vat tieu bieu\b", r"\bhien vat noi bat\b",
        r"\bhien vat dac sac\b", r"\btop hien vat\b",
        r"\bco nhung hien vat nao tieu bieu\b"
    ],
    "gia_ve": [
        r"\bgia ve\b", r"\bve tham quan\b", r"\bve bao nhieu tien\b",
        r"\bve bao nhieu\b", r"\bve dang ban\b", r"\bcac loai ve\b",
        r"\bnhung loai ve\b", r"\bloai ve\b", r"\bmua ve\b", r"\bdat ve\b",
        r"\bbang gia ve\b", r"\bhow much.*ticket\b", r"\bticket price\b",
        r"\bentrance fee\b", r"\bve cho hoc sinh\b", r"\bve sinh vien\b",
        r"\bve nguoi lon\b", r"\bve tre em\b", r"\bmien phi ve\b",
        r"\bbang ban nhung loai ve\b", r"\bco ban nhung loai ve\b"
    ],
    "trien_lam": [
        r"\btrien lam\b", r"\bcac trien lam\b", r"\bnhung trien lam\b",
        r"\bexhibition\b", r"\btrien lam nao\b"
    ],
    "su_kien": [
        r"\bsu kien\b", r"\bcac su kien\b", r"\bnhung su kien\b",
        r"\btoa dam\b", r"\bworkshop\b", r"\bevent\b", r"\blich su kien\b"
    ],
    "chuyen_de": [
        r"\bchuyen de\b", r"\bcac chuyen de\b", r"\bchuyen de trung bay\b",
        r"\btrung bay chuyen de\b", r"\bphong trung bay\b", r"\bkhong gian trung bay\b"
    ],
    "danh_gia": [
        r"\bdanh gia\b", r"\bnhan xet\b", r"\bfeedback\b", r"\breview\b",
        r"\bcam nhan cua khach\b", r"\bkhach tham quan noi gi\b",
        r"\bdu khach nhan xet\b"
    ],
    "thong_ke_bao_tang": [
        r"\bbao tang co bao nhieu hien vat\b", r"\bco bao nhieu hien vat\b",
        r"\btong so hien vat\b", r"\bbao nhieu phong trung bay\b",
        r"\bthong ke bao tang\b", r"\bquy mo bao tang\b"
    ],
    "gio_mo_cua": [
        r"\bgio mo cua\b", r"\bwhat are the opening hours\b",
        r"\bkhung gio nao\b", r"\bmo cua may gio\b", r"\bmo cua luc may gio\b",
        r"\bngay dong cua\b", r"\bmo cua nhung ngay nao\b"
    ],
    "noi_quy": [
        r"\bco duoc mang balo\b", r"\bdo an\b", r"\bchup anh\b", r"\bquay phim\b",
        r"\bnoi quy\b", r"\bquy dinh\b"
    ],
    "goi_y_tham_quan": [
        r"\bo day co gi hay\b", r"\bco gi hay de xem\b", r"\bnen xem gi\b",
        r"\bgoi y tham quan\b", r"\blo trinh tham quan\b", r"\bco gi dep de xem\b"
    ]
}


# Từ khóa chức danh chính trị / bộ máy nhà nước đương nhiệm
CURRENT_POLITICS_PATTERNS = [
    r"\bchu tich nuoc\b", r"\bthu tuong\b", r"\btong bi thu\b",
    r"\bchu tich quoc hoi\b", r"\bchinh phu\b", r"\bbo truong\b",
    r"\buy vien bo chinh tri\b", r"\bban bi thu\b"
]


class RouterDecision:
    def __init__(
        self,
        final_mode: str,            # "museum" | "general"
        zone: str,                  # "zone_1_museum" | "zone_2_gray" | "zone_3_general"
        top1_dist: float,
        top1_doc: str,
        intent: Optional[str] = None,
        is_followup: bool = False,
        matched_entity: Optional[Dict] = None,
        direct_data: Optional[Any] = None,
        reason: str = ""
    ):
        self.final_mode = final_mode
        self.zone = zone
        self.top1_dist = top1_dist
        self.top1_doc = top1_doc
        self.intent = intent
        self.is_followup = is_followup
        self.matched_entity = matched_entity
        self.direct_data = direct_data
        self.reason = reason

    def to_dict(self) -> Dict:
        return {
            "final_mode": self.final_mode,
            "zone": self.zone,
            "top1_dist": round(self.top1_dist, 4),
            "top1_doc": self.top1_doc,
            "intent": self.intent,
            "is_followup": self.is_followup,
            "matched_entity": self.matched_entity.get("name") if self.matched_entity else None,
            "reason": self.reason
        }


def log_zone_decision(query: str, decision: RouterDecision):
    """Ghi log quyết định định tuyến không chứa PII ra file log riêng."""
    zone_log_enabled = os.getenv("RAG_ZONE_LOG", "true").lower() in ("true", "1", "yes")
    if not zone_log_enabled:
        return

    try:
        now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        log_line = (
            f"[{now}] query_len={len(query)} | "
            f"dist={decision.top1_dist:.4f} | "
            f"zone={decision.zone} | "
            f"intent={decision.intent or 'none'} | "
            f"followup={decision.is_followup} | "
            f"mode={decision.final_mode} | "
            f"doc={decision.top1_doc[:35]} | "
            f"reason={decision.reason}\n"
        )
        # Giới hạn kích thước file log (~1MB): khi vượt thì chỉ giữ 500 dòng cuối.
        # Tránh file phình vô hạn vì mỗi câu chat ghi 1 dòng.
        try:
            if os.path.exists(ZONE_LOG_PATH) and os.path.getsize(ZONE_LOG_PATH) > 1_000_000:
                with open(ZONE_LOG_PATH, "r", encoding="utf-8") as f:
                    tail_lines = f.readlines()[-500:]
                with open(ZONE_LOG_PATH, "w", encoding="utf-8") as f:
                    f.writelines(tail_lines)
        except Exception:
            pass
        with open(ZONE_LOG_PATH, "a", encoding="utf-8") as f:
            f.write(log_line)
    except Exception as e:
        logger.warning(f"[RAGRouter] Không thể ghi log zone: {e}")


class RAGRouter:
    def __init__(self, vector_collection = None):
        self.vector_collection = vector_collection
        self.zone_museum_max = float(os.getenv("RAG_ZONE_MUSEUM_MAX", 0.28))
        self.zone_general_min = float(os.getenv("RAG_ZONE_GENERAL_MIN", 0.42))

    def detect_structured_intent(self, norm_query: str) -> Optional[str]:
        """Phát hiện các intent có cấu trúc đi thẳng DB."""
        for intent_name, patterns in STRUCTURED_INTENTS.items():
            for pat in patterns:
                if re.search(pat, norm_query):
                    return intent_name
        return None

    def is_referential_followup(self, norm_query: str) -> bool:
        """Kiểm tra xem câu hỏi có dấu hiệu tham chiếu ngữ cảnh nối tiếp hay không."""
        words = norm_query.split()
        if len(words) > 12:
            return False
        for pat in FOLLOWUP_PATTERNS:
            if re.search(pat, norm_query):
                return True
        return False

    def check_previous_turn_mode(self, history: Optional[List[Dict]]) -> Tuple[bool, Optional[str]]:
        """
        Kiểm tra xem lượt trước có đang ở chế độ Museum không và ID hiện vật đang thảo luận (nếu có).
        """
        if not history:
            return False, None

        # Quét các lượt gần nhất trong history
        for item in reversed(history):
            role = item.get("role", "")
            content = item.get("content", item.get("text", ""))
            meta = item.get("meta", {})

            if role in ("assistant", "model", "bot"):
                # Nếu bot có lưu metadata về mode hoặc artifact_id
                if meta.get("mode") == "museum":
                    return True, meta.get("artifact_id")
                # Hoặc kiểm tra nội dung có nhắc về bảo tàng / hiện vật
                norm_c = strip_accents(content)
                if any(w in norm_c for w in ["bao tang", "hien vat", "bao vat", "trung bay", "phong c", "phong a"]):
                    return True, meta.get("artifact_id")

        return False, None

    async def route_query(
        self,
        query: str,
        query_embedding: Optional[List[float]] = None,
        history: Optional[List[Dict]] = None
    ) -> RouterDecision:
        """
        Điều phối định tuyến toàn diện:
        1. Kiểm tra kế thừa lượt nối tiếp
        2. Kiểm tra intent có cấu trúc đi thẳng DB
        3. Khớp từ khóa DB động (không hardcode)
        4. Tính khoảng cách vector Top-1 trên V2
        5. Phân định 3 vùng (Museum < 0.30, Gray 0.30-0.42, General >= 0.42)
        """
        norm_query = strip_accents(query)

        # ── 1. Kiểm tra câu nối tiếp ──
        prev_is_museum, prev_artifact_id = self.check_previous_turn_mode(history)
        has_followup_reference = self.is_referential_followup(norm_query)

        if prev_is_museum and has_followup_reference:
            # Kế thừa chế độ museum, giữ ngữ cảnh
            decision = RouterDecision(
                final_mode="museum",
                zone="zone_followup_context",
                top1_dist=0.0,
                top1_doc="Inherited from previous turn context",
                is_followup=True,
                reason="Câu nối tiếp có đại từ tham chiếu, kế thừa chế độ Museum từ lượt trước"
            )
            log_zone_decision(query, decision)
            return decision

        # ── 2. Kiểm tra Intent có cấu trúc đi thẳng DB ──
        intent = self.detect_structured_intent(norm_query)
        if intent:
            direct_data = None
            if intent in ("gia_ve", "ve_tham_quan"):
                direct_data = get_ve_gia_va_con_cho()
            elif intent in ("trien_lam", "trien_lam_dang_dien_ra"):
                direct_data = get_trien_lam_dang_dien_ra()
            elif intent in ("su_kien", "su_kien_sap_dien_ra"):
                direct_data = get_su_kien_sap_dien_ra()
            elif intent in ("chuyen_de", "chuyen_de_trung_bay"):
                direct_data = get_chuyen_de_trung_bay()
            elif intent in ("danh_gia", "review"):
                direct_data = get_danh_gia_tong_quan()
            elif intent == "thong_ke_bao_tang":
                direct_data = get_thong_ke_tong_quan()

            # Các intent không có direct_data (gio_mo_cua, noi_quy, goi_y_tham_quan):
            # KHÔNG đi thẳng DB mà đi qua nhánh museum RAG chuẩn bên dưới
            # (dữ liệu đã có trong ChromaDB: museum_info.json + guide docs).
            # Ghi zone/reason đúng để log không gây hiểu nhầm.
            uses_rag_fallback = direct_data is None
            decision = RouterDecision(
                final_mode="museum",
                zone="zone_rag_museum" if uses_rag_fallback else "zone_structured_intent",
                top1_dist=0.15,
                top1_doc=f"Structured Intent: {intent}",
                intent=intent,
                direct_data=direct_data,
                reason=(
                    f"Khớp Intent '{intent}' → qua RAG museum (dữ liệu tĩnh museum_info/guide)"
                    if uses_rag_fallback else
                    f"Khớp Intent có cấu trúc '{intent}' đi thẳng DB"
                )
            )
            log_zone_decision(query, decision)
            return decision

        # ── 3. Khớp từ khóa DB động ──
        entity_match = dynamic_keyword_service.match(query)
        if entity_match and entity_match.get("matched"):
            matched_ent = entity_match["entity"]
            decision = RouterDecision(
                final_mode="museum",
                zone="zone_dynamic_keyword",
                top1_dist=0.18,
                top1_doc=f"DB Entity: {matched_ent['name']}",
                matched_entity=matched_ent,
                reason=f"Khớp thực thể DB '{matched_ent['name']}' (bảng {matched_ent['table']})"
            )
            log_zone_decision(query, decision)
            return decision

        # ── 3.5. Kiểm tra câu hỏi chức danh / chính trị đương nhiệm ──
        has_politics = any(re.search(pat, norm_query) for pat in CURRENT_POLITICS_PATTERNS)
        has_museum_context = any(w in norm_query for w in [
            "bao tang", "trung bay", "trien lam", "hien vat", "tu lieu", "co vat",
            "tham quan", "ve", "phong ", "tang ", "ke ", "ho chi minh", "truong chinh",
            "ton duc thang", "vo nguyen giap"
        ])
        if has_politics and not has_museum_context:
            decision = RouterDecision(
                final_mode="general",
                zone="zone_3_general",
                top1_dist=0.50,
                top1_doc="Current Political Role Query",
                reason="Câu hỏi về chức danh / chính trị đương nhiệm (không kèm từ khóa bảo tàng) -> General"
            )
            log_zone_decision(query, decision)
            return decision

        # ── 4. Tra cứu Top-1 Vector Distance trên V2 ──
        if self.vector_collection is None:
            import chromadb
            client = chromadb.PersistentClient(path=os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "chroma_db"))
            self.vector_collection = client.get_collection("museum_rag_knowledge_v2")

        if query_embedding is None:
            from services.rag import cached_get_embedding
            query_embedding = await cached_get_embedding(query)

        res = self.vector_collection.query(
            query_embeddings=[query_embedding],
            n_results=1,
            include=["metadatas", "distances"]
        )

        top1_dist = float(res["distances"][0][0])
        meta = res["metadatas"][0][0]
        top1_doc = meta.get("title") or meta.get("name") or "Unknown Doc"

        # ── 5. Phân định theo 3 vùng ──

        # VÙNG 1: Chắc chắn Museum (dist < 0.30)
        if top1_dist < self.zone_museum_max:
            # Ngoại lệ an toàn: nếu câu nhắc địa danh thế giới (Louvre, Colosseum, Paris...)
            # và không khớp thực thể DB bảo tàng, không cho vào Zone 1
            if dynamic_keyword_service.has_foreign_context(norm_query):
                final_mode = "general"
                zone = "zone_2_gray"
                reason = "Khoảng cách thấp nhưng câu có địa danh thế giới, chuyển sang General"
            else:
                final_mode = "museum"
                zone = "zone_1_museum"
                reason = f"Distance ({top1_dist:.4f}) < {self.zone_museum_max:.2f} (Chắc chắn Museum)"

        # VÙNG 3: Chắc chắn General (dist >= 0.42)
        elif top1_dist >= self.zone_general_min:
            final_mode = "general"
            zone = "zone_3_general"
            reason = f"Distance ({top1_dist:.4f}) >= {self.zone_general_min:.2f} (Chắc chắn General)"

        # VÙNG 2: Vùng xám (0.30 <= dist < 0.42)
        else:
            zone = "zone_2_gray"
            # Kiểm tra ngữ cảnh nước ngoài
            if dynamic_keyword_service.has_foreign_context(norm_query):
                final_mode = "general"
                reason = f"Vùng xám ({top1_dist:.4f}) nhưng chứa địa danh/nhân vật quốc tế -> General"
            # Kiểm tra xem có từ khóa liên quan bảo tàng Việt Nam / du lịch bảo tàng
            elif any(w in norm_query for w in ["bao tang", "hien vat", "trien lam", "tham quan", "ve", "gio mo"]):
                final_mode = "museum"
                reason = f"Vùng xám ({top1_dist:.4f}) có yếu tố liên quan bảo tàng -> Museum (Prompt lai)"
            else:
                # Mặc định vùng xám không có dấu hiệu bảo tàng -> General
                final_mode = "general"
                reason = f"Vùng xám ({top1_dist:.4f}) không có dấu hiệu liên quan bảo tàng -> General"

        decision = RouterDecision(
            final_mode=final_mode,
            zone=zone,
            top1_dist=top1_dist,
            top1_doc=top1_doc,
            reason=reason
        )
        log_zone_decision(query, decision)
        return decision
