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


def _extract_related_items(intent: str, direct_data: dict) -> list:
    """
    Trích xuất danh sách thẻ liên quan từ dữ liệu DB thật theo intent.
    Mỗi item có dạng: {"type": "gallery"|"exhibition"|"event"|"ticket", "name", ...}
    - Chuyên đề đã diễn ra: lấy các chuyên đề có trạng thái "Đã diễn ra" / "Đã kết thúc"
    - Chuyên đề đang diễn ra: lấy các chuyên đề đang hoạt động
    - Triển lãm đã kết thúc: lấy các triển lãm đã kết thúc
    - Triển lãm đang diễn ra: lấy các triển lãm đang mở
    - Sự kiện: lấy sắp diễn ra hoặc đã diễn ra tùy intent
    """
    if not isinstance(direct_data, dict) or direct_data.get("status") not in ("ok", "no_data"):
        return []

    ENDED_KEYWORDS = ("đã diễn ra", "đã kết thúc", "kết thúc", "da dien ra", "da ket thuc")

    def is_ended(status_str: str) -> bool:
        return any(k in (status_str or "").lower() for k in ENDED_KEYWORDS)

    items = []

    if intent in ("chuyen_de_da_dien_ra", "chuyen_de_da_ket_thuc"):
        for g in (direct_data.get("galleries") or []):
            if not g.get("name"):
                continue
            items.append({
                "type": "gallery",
                "id": g.get("id"),
                "name": g.get("name", ""),
                "location": g.get("location", ""),
                "status": g.get("status", "Đã diễn ra"),
                "image": g.get("image", ""),
                "description": g.get("description", "") or g.get("detailed_content", ""),
                "start_date": g.get("start_date", ""),
                "end_date": g.get("end_date", ""),
                "detailed_content": g.get("detailed_content", ""),
                "gallery_images": g.get("gallery_images", []),
                "highlight_artifacts": g.get("highlight_artifacts", []),
            })
            if len(items) >= 6:
                break

    elif intent in ("chuyen_de", "chuyen_de_trung_bay", "chuyen_de_dang_dien_ra"):
        for g in (direct_data.get("galleries") or []):
            if not g.get("name"):
                continue
            # Chỉ hiện chuyên đề đang hoạt động
            if is_ended(g.get("status", "")):
                continue
            items.append({
                "type": "gallery",
                "id": g.get("id"),
                "name": g.get("name", ""),
                "location": g.get("location", ""),
                "status": g.get("status", "Đang diễn ra"),
                "image": g.get("image", ""),
                "description": g.get("description", "") or g.get("detailed_content", ""),
                "start_date": g.get("start_date", ""),
                "end_date": g.get("end_date", ""),
                "detailed_content": g.get("detailed_content", ""),
                "gallery_images": g.get("gallery_images", []),
                "highlight_artifacts": g.get("highlight_artifacts", []),
            })
            if len(items) >= 5:
                break

    elif intent in ("trien_lam_da_ket_thuc", "trien_lam_da_dien_ra"):
        for ex in (direct_data.get("exhibitions") or []):
            if not ex.get("name"):
                continue
            items.append({
                "type": "exhibition",
                "id": ex.get("id"),
                "name": ex.get("name", ""),
                "location": ex.get("location", ""),
                "start_date": ex.get("start_date", ""),
                "end_date": ex.get("end_date", ""),
                "status": ex.get("status", "Đã kết thúc"),
                "artifacts_count": ex.get("artifacts_count", 0),
                "image": ex.get("image", ""),
                "description": ex.get("description", ""),
            })
            if len(items) >= 5:
                break

    elif intent in ("trien_lam", "trien_lam_dang_dien_ra"):
        for ex in (direct_data.get("exhibitions") or []):
            if not ex.get("name"):
                continue
            # Chỉ hiện triển lãm đang diễn ra
            if is_ended(ex.get("status", "")):
                continue
            items.append({
                "type": "exhibition",
                "id": ex.get("id"),
                "name": ex.get("name", ""),
                "location": ex.get("location", ""),
                "start_date": ex.get("start_date", ""),
                "end_date": ex.get("end_date", ""),
                "status": ex.get("status", "Đang diễn ra"),
                "artifacts_count": ex.get("artifacts_count", 0),
                "image": ex.get("image", ""),
                "description": ex.get("description", ""),
            })
            if len(items) >= 5:
                break

    elif intent in ("su_kien_da_dien_ra",):
        for ev in (direct_data.get("events") or [])[:5]:
            if ev.get("title"):
                items.append({
                    "type": "event",
                    "id": ev.get("id"),
                    "name": ev.get("title", ""),
                    "date": ev.get("date", ""),
                    "time": ev.get("time", ""),
                    "location": ev.get("location", ""),
                    "status": "Đã diễn ra",
                    "image": ev.get("image", ""),
                    "description": ev.get("description", ""),
                })

    elif intent in ("su_kien", "su_kien_sap_dien_ra"):
        for ev in (direct_data.get("events") or [])[:5]:
            if ev.get("title"):
                items.append({
                    "type": "event",
                    "id": ev.get("id"),
                    "name": ev.get("title", ""),
                    "date": ev.get("date", ""),
                    "time": ev.get("time", ""),
                    "location": ev.get("location", ""),
                    "status": "Sắp diễn ra",
                    "seats_remaining": ev.get("seats_remaining", 0),
                    "image": ev.get("image", ""),
                    "description": ev.get("description", ""),
                })

    elif intent in ("gia_ve", "ve_tham_quan"):
        for t in (direct_data.get("tickets") or [])[:5]:
            if t.get("name"):
                items.append({
                    "type": "ticket",
                    "id": t.get("id"),
                    "name": t.get("name", ""),
                    "price": t.get("price", 0),
                    "image": t.get("image", ""),
                    "description": t.get("description", ""),
                })

    return items


def _extract_artifacts_for_all_intents(intent: str, direct_data: dict, text: str = "") -> list[str]:
    """
    Trích xuất artifact_ids chính xác từ Supabase cho MỌI mục liên quan:
    - Chuyên đề: tìm hiện vật theo Điện Biên, Gốm Bát Tràng, Rồng, Lý, Thi đua, Bình dân...
    - Triển lãm: tìm hiện vật theo chủ đề triển lãm (Thời Lý, Trang phục triều Nguyễn, Gốm Việt, Văn hóa Việt...)
    - Sự kiện: tìm hiện vật liên quan đến sự kiện (Trống đồng Đông Sơn, Gốm Chu Đậu, Thăng Long...)
    - Văn bản chung / chủ đề: quét từ khóa triều đại, chất liệu, văn hóa để lấy hiện vật tương ứng.
    """
    matched_ids = []
    try:
        from core.supabase_client import supabase_admin
        keywords = []

        # 1. Từ chuyên đề (galleries)
        for g in (direct_data.get("galleries") or []):
            gname = g.get("name", "")
            if "Điện Biên" in gname: keywords.append("Điện Biên")
            if "Bát Tràng" in gname or "Gốm" in gname: keywords.append("Bát Tràng")
            if "Rồng" in gname: keywords.append("Rồng")
            if "Lý" in gname: keywords.append("Lý")
            if "Thi đua" in gname: keywords.append("Thi đua")
            if "Bình dân" in gname: keywords.append("Bình dân")
            if "Non sông" in gname: keywords.append("Giải phóng")

        # 2. Từ triển lãm (exhibitions)
        for ex in (direct_data.get("exhibitions") or []):
            exname = ex.get("name", "")
            if "Lý" in exname: keywords.append("Lý")
            if "Nguyễn" in exname: keywords.append("Nguyễn")
            if "Gốm" in exname: keywords.append("Gốm")
            if "Tinh hoa" in exname or "Văn hóa Việt" in exname: keywords.append("Trống đồng")

        # 3. Từ sự kiện (events)
        for ev in (direct_data.get("events") or []):
            evname = ev.get("title") or ev.get("name") or ""
            if "Trống đồng" in evname or "Đông Sơn" in evname: keywords.append("Trống đồng")
            if "Gốm" in evname or "Chu Đậu" in evname: keywords.append("Gốm")
            if "Thăng Long" in evname: keywords.append("Thăng Long")

        # 4. Từ text truyền vào (câu hỏi hoặc câu trả lời)
        if text:
            norm_t = text.lower()
            if "lý" in norm_t: keywords.append("Lý")
            if "trần" in norm_t: keywords.append("Trần")
            if "nguyễn" in norm_t: keywords.append("Nguyễn")
            if "trống đồng" in norm_t or "đông sơn" in norm_t: keywords.append("Trống đồng")
            if "gốm" in norm_t or "bát tràng" in norm_t: keywords.append("Gốm")
            if "điện biên" in norm_t or "kháng chiến" in norm_t: keywords.append("Điện Biên")
            if "rồng" in norm_t: keywords.append("Rồng")

        # Query Supabase theo keywords
        for kw in set(keywords):
            res = supabase_admin.table("hien_vat").select("id").ilike("name", f"%{kw}%").limit(2).execute()
            for row in (res.data or []):
                aid = str(row.get("id"))
                if aid and aid not in matched_ids:
                    matched_ids.append(aid)
                if len(matched_ids) >= 6:
                    break
            if len(matched_ids) >= 6:
                break

        # Nếu vẫn chưa có gì, lấy các bảo vật quốc gia tiêu biểu
        if not matched_ids:
            res_feat = supabase_admin.table("hien_vat").select("id").eq("is_featured", True).limit(4).execute()
            for row in (res_feat.data or []):
                aid = str(row.get("id"))
                if aid and aid not in matched_ids:
                    matched_ids.append(aid)

    except Exception as e:
        logger.warning(f"Error extracting artifacts for all intents: {e}")
    return matched_ids[:6]


def _detect_query_scope(user_message: str, intent: str = "") -> str:
    """
    Xác định đúng phạm vi (scope) câu hỏi để đảm bảo tính tập trung, không hiển thị lẫn lộn:
    - 'event': Khi hỏi về sự kiện, tọa đàm, workshop, lịch diễn ra...
    - 'exhibition': Khi hỏi về triển lãm
    - 'gallery': Khi hỏi về chuyên đề trưng bày, phòng trưng bày
    - 'ticket': Khi hỏi về vé tham quan, giá vé
    - 'artifact': Khi hỏi về hiện vật, bảo vật, tìm kiếm vị trí/thuyết minh/chi tiết hiện vật
    """
    if intent:
        if "su_kien" in intent:
            return "event"
        if "trien_lam" in intent:
            return "exhibition"
        if "chuyen_de" in intent:
            return "gallery"
        if intent in ("gia_ve", "ve_tham_quan"):
            return "ticket"

    q = (user_message or "").lower()

    if any(k in q for k in ["su kien", "sự kiện", "toa dam", "tọa đàm", "workshop", "lich dien ra", "lịch diễn ra", "tham gia su kien"]):
        return "event"
    if any(k in q for k in ["trien lam", "triển lãm"]):
        return "exhibition"
    if any(k in q for k in ["chuyen de", "chuyên đề", "phong trung bay", "phòng trưng bày"]):
        return "gallery"
    if any(k in q for k in ["gia ve", "giá vé", "mua ve", "đặt vé", "loai ve", "loại vé"]):
        return "ticket"

    # Mặc định: Hỏi về Hiện vật
    return "artifact"


def _match_all_related_items_from_text(text: str, query: str = "", intent: str = "") -> list:
    """
    Trích xuất các thẻ chuyên đề, triển lãm, sự kiện liên quan đúng theo phạm vi câu hỏi:
    - Nếu hỏi về HIỆN VẬT: Tuyệt đối KHÔNG trả về sự kiện/chuyên đề/triển lãm ngoài lề.
    - Nếu hỏi về SỰ KIỆN: Chỉ trả về thẻ sự kiện liên quan.
    - Nếu hỏi về CHUYÊN ĐỀ: Chỉ trả về thẻ chuyên đề liên quan.
    - Nếu hỏi về TRIỂN LÃM: Chỉ trả về thẻ triển lãm liên quan.
    """
    scope = _detect_query_scope(query, intent)
    if scope in ("artifact", "ticket"):
        return []

    try:
        from services.live_data_tools import (
            get_chuyen_de_trung_bay,
            get_trien_lam_dang_dien_ra,
            get_trien_lam_da_ket_thuc,
            get_su_kien_sap_dien_ra,
        )
        combined = f"{text} {query}".lower()
        matched = []
        seen_keys = set()

        # 1. Chuyên đề (chỉ khi hỏi về chuyên đề)
        if scope == "gallery":
            cd_data = get_chuyen_de_trung_bay()
            for g in (cd_data.get("galleries") or []):
                gname = (g.get("name") or "").lower()
                key_slugs = [gname]
                if "điện biên" in gname: key_slugs.append("điện biên")
                if "bát tràng" in gname: key_slugs.append("bát tràng")
                if "rồng" in gname: key_slugs.append("rồng")
                if "thiền môn" in gname: key_slugs.extend(["thiền môn", "phật giáo thời lý", "thời lý"])
                if "non sông" in gname: key_slugs.append("non sông")
                if "12 ngày đêm" in gname: key_slugs.append("12 ngày đêm")
                if "bình dân" in gname: key_slugs.append("bình dân")
                if "thi đua" in gname: key_slugs.append("thi đua")

                if any(k in combined for k in key_slugs):
                    gid = f"gallery_{g.get('id')}"
                    if gid not in seen_keys:
                        seen_keys.add(gid)
                        matched.append({
                            "type": "gallery",
                            "id": g.get("id"),
                            "name": g.get("name", ""),
                            "location": g.get("location", ""),
                            "status": g.get("status", "Đang diễn ra"),
                            "image": g.get("image", ""),
                            "description": g.get("description", "") or g.get("detailed_content", ""),
                            "start_date": g.get("start_date", ""),
                            "end_date": g.get("end_date", ""),
                            "detailed_content": g.get("detailed_content", ""),
                            "gallery_images": g.get("gallery_images", []),
                            "highlight_artifacts": g.get("highlight_artifacts", []),
                        })

        # 2. Triển lãm (chỉ khi hỏi về triển lãm)
        elif scope == "exhibition":
            tl_data = get_trien_lam_dang_dien_ra()
            tl_ended = get_trien_lam_da_ket_thuc()
            all_ex = (tl_data.get("exhibitions") or []) + (tl_ended.get("exhibitions") or [])
            for ex in all_ex:
                exname = (ex.get("name") or "").lower()
                ex_slugs = [exname]
                if "thời lý" in exname or "di sản thời lý" in exname: ex_slugs.extend(["thời lý", "nhà lý"])
                if "nguyễn" in exname or "trang phục" in exname: ex_slugs.extend(["nguyễn", "triều nguyễn", "nhà nguyễn", "áo dài"])
                if "gốm việt" in exname: ex_slugs.extend(["gốm việt", "đồ gốm", "gốm"])
                if "tinh hoa" in exname: ex_slugs.extend(["tinh hoa văn hóa", "bảo vật quốc gia"])

                if any(k in combined for k in ex_slugs):
                    exid = f"ex_{ex.get('id')}"
                    if exid not in seen_keys:
                        seen_keys.add(exid)
                        matched.append({
                            "type": "exhibition",
                            "id": ex.get("id"),
                            "name": ex.get("name", ""),
                            "location": ex.get("location", ""),
                            "start_date": ex.get("start_date", ""),
                            "end_date": ex.get("end_date", ""),
                            "status": ex.get("status", "Đang diễn ra"),
                            "artifacts_count": ex.get("artifacts_count", 0),
                            "image": ex.get("image", ""),
                            "description": ex.get("description", ""),
                        })

        # 3. Sự kiện (chỉ khi hỏi về sự kiện)
        elif scope == "event":
            sk_data = get_su_kien_sap_dien_ra()
            for ev in (sk_data.get("events") or []):
                evname = (ev.get("title") or ev.get("name") or "").lower()
                ev_slugs = [evname]
                if "trống đồng" in evname or "đông sơn" in evname: ev_slugs.extend(["trống đồng", "đông sơn"])
                if "gốm" in evname or "chu đậu" in evname: ev_slugs.extend(["chu đậu", "làm gốm"])
                if "thăng long" in evname: ev_slugs.extend(["thăng long", "đêm bảo tàng"])

                if any(k in combined for k in ev_slugs):
                    evid = f"ev_{ev.get('id')}"
                    if evid not in seen_keys:
                        seen_keys.add(evid)
                        matched.append({
                            "type": "event",
                            "id": ev.get("id"),
                            "name": ev.get("title", ""),
                            "date": ev.get("date", ""),
                            "time": ev.get("time", ""),
                            "location": ev.get("location", ""),
                            "status": "Sắp diễn ra",
                            "seats_remaining": ev.get("seats_remaining", 0),
                            "image": ev.get("image", ""),
                            "description": ev.get("description", ""),
                        })

        return matched[:6]
    except Exception as e:
        logger.warning(f"Error matching comprehensive related items: {e}")
        return []

_answer_cache = TTLCache(maxsize=200, ttl=600)


def _format_thong_ke_answer(direct_data: dict) -> str | None:
    """Trả lời thống kê trực tiếp từ DB, không qua LLM (nhanh + không rò JSON)."""
    if not isinstance(direct_data, dict):
        return None
    if direct_data.get("status") == "error":
        return "Mình không thể truy xuất số liệu chính xác lúc này."
    stats = direct_data.get("stats", {}) or {}
    tong = stats.get("tong_hien_vat")
    if tong is None:
        return None
    parts = [f"Bảo tàng hiện lưu giữ **{tong} hiện vật**"]
    sub = []
    if stats.get("hien_vat_dang_trung_bay") is not None:
        sub.append(f"{stats['hien_vat_dang_trung_bay']} đang trưng bày")
    if stats.get("tong_trien_lam") is not None:
        sub.append(f"{stats['tong_trien_lam']} triển lãm")
    if stats.get("tong_su_kien") is not None:
        sub.append(f"{stats['tong_su_kien']} sự kiện")
    if stats.get("tong_phong") is not None:
        sub.append(f"{stats['tong_phong']} phòng trưng bày")
    if stats.get("tong_danh_muc") is not None:
        sub.append(f"{stats['tong_danh_muc']} danh mục")
    text = parts[0]
    if sub:
        text += f" ({', '.join(sub)})"
    text += ". Bạn muốn khám phá khu nào trước?"
    return text


def _format_su_kien_answer(direct_data: dict) -> str | None:
    """Trả lời thông tin sự kiện trực tiếp từ DB, nhanh và thân thiện."""
    if not isinstance(direct_data, dict):
        return None
    events = direct_data.get("events") or []
    if not events:
        return "Hiện tại Bảo tàng chưa có sự kiện mới nào sắp diễn ra trong thời gian tới. Bạn theo dõi thêm thông tin trên website nhé!"
    lines = ["Bảo tàng hiện có các sự kiện sắp diễn ra nổi bật:"]
    for ev in events[:4]:
        title = ev.get("title") or ev.get("name") or ""
        date_str = ev.get("date", "")
        time_str = ev.get("time", "")
        loc = ev.get("location", "")
        time_part = f" (ngày {date_str}{f', lúc {time_str}' if time_str else ''})" if date_str else ""
        loc_part = f" tại {loc}" if loc else ""
        lines.append(f"- **{title}**{time_part}{loc_part}")
    lines.append("\nBạn có thể bấm vào các thẻ bên dưới để xem thông tin chi tiết và đăng ký tham gia nhé!")
    return "\n".join(lines)


def _format_chuyen_de_answer(direct_data: dict) -> str | None:
    """Trả lời thông tin chuyên đề trưng bày đang diễn ra trực tiếp từ DB."""
    if not isinstance(direct_data, dict):
        return None
    galleries = direct_data.get("galleries") or []
    active_g = [
        g for g in galleries 
        if not any(k in (g.get("status") or "").lower() for k in ("đã kết thúc", "đã diễn ra", "da ket thuc", "da dien ra"))
    ]
    if not active_g:
        active_g = galleries
    if not active_g:
        return "Hiện tại Bảo tàng chưa có thông tin chuyên đề trưng bày mới."
    lines = ["Bảo tàng hiện đang trưng bày các chuyên đề đặc sắc:"]
    for g in active_g[:4]:
        name = g.get("name") or ""
        loc = g.get("location") or ""
        loc_part = f" tại {loc}" if loc else ""
        lines.append(f"- **{name}**{loc_part}")
    lines.append("\nBạn có thể bấm vào các thẻ bên dưới để xem nội dung chi tiết từng chuyên đề nhé!")
    return "\n".join(lines)


def _format_chuyen_de_da_dien_ra_answer(direct_data: dict) -> str | None:
    """Trả lời thông tin các chuyên đề trưng bày đã diễn ra (đã kết thúc) trực tiếp từ DB."""
    if not isinstance(direct_data, dict):
        return None
    galleries = direct_data.get("galleries") or []
    if not galleries:
        return "Bảo tàng hiện chưa có ghi nhận thông tin chuyên đề trưng bày đã kết thúc trước đây."

    lines = ["Bảo tàng Lịch sử Quốc gia đã từng tổ chức các chuyên đề trưng bày đặc sắc sau (hiện đã kết thúc):"]
    for i, g in enumerate(galleries[:5], 1):
        name = g.get("name") or ""
        start = g.get("start_date") or ""
        end = g.get("end_date") or ""
        time_part = f" (từ {start} đến {end})" if (start and end) else (f" (năm {start[:4]})" if start else "")
        desc = g.get("description") or g.get("detailed_content") or ""
        short_desc = (desc[:140] + "...") if len(desc) > 140 else desc
        desc_part = f": {short_desc}" if short_desc else ""
        lines.append(f"{i}. **{name}**{time_part}{desc_part}")

    lines.append("\nBạn có thể xem các thẻ hiện vật và chuyên đề liên quan bên dưới để tìm hiểu chi tiết tư liệu quý của từng chuyên đề nhé!")
    return "\n".join(lines)


def _format_trien_lam_answer(direct_data: dict) -> str | None:
    """Trả lời thông tin triển lãm đang diễn ra trực tiếp từ DB."""
    if not isinstance(direct_data, dict):
        return None
    exhibitions = direct_data.get("exhibitions") or []
    active_ex = [
        ex for ex in exhibitions 
        if not any(k in (ex.get("status") or "").lower() for k in ("đã kết thúc", "đã diễn ra", "da ket thuc", "da dien ra"))
    ]
    if not active_ex:
        active_ex = exhibitions
    if not active_ex:
        return "Hiện tại Bảo tàng chưa có triển lãm mới nào đang diễn ra."
    lines = ["Bảo tàng hiện đang diễn ra các triển lãm nổi bật:"]
    for ex in active_ex[:4]:
        name = ex.get("name") or ""
        loc = ex.get("location") or ""
        loc_part = f" tại {loc}" if loc else ""
        lines.append(f"- **{name}**{loc_part}")
    lines.append("\nBạn có thể bấm vào các thẻ bên dưới để xem chi tiết triển lãm nhé!")
    return "\n".join(lines)


def _format_trien_lam_da_ket_thuc_answer(direct_data: dict) -> str | None:
    """Trả lời thông tin các triển lãm đã kết thúc từ DB."""
    if not isinstance(direct_data, dict):
        return None
    exhibitions = direct_data.get("exhibitions") or []
    if not exhibitions:
        return "Bảo tàng hiện chưa có thông tin triển lãm đã kết thúc."

    lines = ["Bảo tàng Lịch sử Quốc gia đã từng tổ chức các triển lãm sau (hiện đã kết thúc):"]
    for i, ex in enumerate(exhibitions[:4], 1):
        name = ex.get("name") or ""
        start = ex.get("start_date") or ""
        end = ex.get("end_date") or ""
        time_part = f" (từ {start} đến {end})" if (start and end) else ""
        desc = ex.get("description") or ""
        short_desc = (desc[:140] + "...") if len(desc) > 140 else desc
        desc_part = f": {short_desc}" if short_desc else ""
        lines.append(f"{i}. **{name}**{time_part}{desc_part}")

    lines.append("\nBạn có thể bấm vào các thẻ bên dưới để xem lại thông tin triển lãm nhé!")
    return "\n".join(lines)


def _format_trien_lam_sap_dien_ra_answer(direct_data: dict) -> str | None:
    """Trả lời thông tin các triển lãm sắp diễn ra từ DB."""
    if not isinstance(direct_data, dict):
        return None
    exhibitions = direct_data.get("exhibitions") or []
    if not exhibitions:
        return "Hiện tại Bảo tàng chưa có triển lãm mới nào trong danh sách sắp diễn ra."

    lines = ["Bảo tàng Lịch sử Quốc gia sắp tổ chức các triển lãm đặc sắc sau:"]
    for i, ex in enumerate(exhibitions[:4], 1):
        name = ex.get("name") or ""
        start = ex.get("start_date") or ""
        end = ex.get("end_date") or ""
        loc = ex.get("location") or ""
        time_part = f" (dự kiến từ {start} đến {end})" if (start and end) else (f" (dự kiến từ {start})" if start else "")
        loc_part = f" tại {loc}" if loc else ""
        desc = ex.get("description") or ""
        short_desc = (desc[:140] + "...") if len(desc) > 140 else desc
        desc_part = f": {short_desc}" if short_desc else ""
        lines.append(f"{i}. **{name}**{time_part}{loc_part}{desc_part}")

    lines.append("\nBạn theo dõi thêm website để cập nhật lịch khai mạc và bấm vào các thẻ bên dưới để xem chi tiết nhé!")
    return "\n".join(lines)


def _format_su_kien_da_dien_ra_answer(direct_data: dict) -> str | None:
    """Trả lời thông tin sự kiện đã diễn ra từ DB."""
    if not isinstance(direct_data, dict):
        return None
    events = direct_data.get("events") or []
    if not events:
        return "Bảo tàng hiện chưa có thông tin sự kiện đã diễn ra trong danh mục."

    lines = ["Các sự kiện đã từng diễn ra tại Bảo tàng Lịch sử Quốc gia:"]
    for i, ev in enumerate(events[:4], 1):
        title = ev.get("title") or ev.get("name") or ""
        date_str = ev.get("date", "")
        time_part = f" (ngày {date_str})" if date_str else ""
        lines.append(f"{i}. **{title}**{time_part}")

    lines.append("\nBạn theo dõi thêm website để cập nhật lịch các sự kiện mới sắp diễn ra nhé!")
    return "\n".join(lines)


def _format_gia_ve_answer(direct_data: dict) -> str | None:
    """Trả lời bảng giá vé trực tiếp từ DB."""
    if not isinstance(direct_data, dict):
        return None
    tickets = direct_data.get("tickets") or []
    if not tickets:
        return "Bảo tàng áp dụng vé vào cổng tham quan tiêu chuẩn. Bạn có thể tham khảo mục Vé tham quan nhé!"
    lines = ["Bảng giá vé tham quan Bảo tàng:"]
    for t in tickets[:5]:
        name = t.get("name") or ""
        price = t.get("price", 0)
        price_str = "Miễn phí" if price == 0 else f"{price:,.0f}đ"
        lines.append(f"- **{name}**: {price_str}")
    lines.append("\nBạn có thể đặt vé trực tiếp hoặc xem chi tiết ở mục Vé tham quan nhé!")
    return "\n".join(lines)


def _should_bypass_answer_cache(text: str) -> bool:
    """Số liệu live (số lượng, giá vé, triển lãm...) luôn đếm mới, không dùng cache."""
    norm = remove_accents(text or "").lower()
    keywords = (
        "bao nhieu", "tong ", "thong ke", "dem ", "con bao",
        "gia ve", "trien lam", "su kien", "danh muc",
        "phong trung bay", "dang trung bay", "dang dien ra",
    )
    return any(k in norm for k in keywords)


def _build_live_prompt_context(intent: str, label: str, direct_data: dict) -> str:
    """Dựng prompt từ dữ liệu DB thật, cấm model nhả JSON thô ra UI."""
    no_json_rule = (
        "YÊU CẦU BẮT BUỘC:\n"
        "- Trả lời bằng câu văn tiếng Việt tự nhiên, ngắn gọn, tối đa 3 câu.\n"
        "- CẤM copy nguyên văn JSON, CẤM in các key kỹ thuật "
        "(status, data_source, stats, tong_hien_vat...) và CẤM nhắc tên bảng DB.\n"
        "- Chỉ nêu con số đã được diễn giải thành câu hoàn chỉnh."
    )
    if intent == "thong_ke_bao_tang" and isinstance(direct_data, dict):
        summary = direct_data.get("summary", "")
        stats = direct_data.get("stats", {}) or {}
        clean = {
            "tong_hien_vat": stats.get("tong_hien_vat"),
            "dang_trung_bay": stats.get("hien_vat_dang_trung_bay"),
            "tong_trien_lam": stats.get("tong_trien_lam"),
            "tong_su_kien": stats.get("tong_su_kien"),
            "tong_phong": stats.get("tong_phong"),
            "tong_danh_muc": stats.get("tong_danh_muc"),
        }
        context_str = json.dumps(clean, ensure_ascii=False, indent=2)
        example = (
            'Ví dụ cách trả lời đúng: "Bảo tàng hiện lưu giữ 274 hiện vật, '
            'trong đó 120 hiện vật đang trưng bày, cùng 5 triển lãm và 8 sự kiện. '
            'Bạn muốn khám phá khu nào trước?"'
        )
        if summary:
            example = f"Dữ liệu tóm tắt: {summary}\n" + example
        return f"{label}:\n{context_str}\n\n{example}\n\n{no_json_rule}"
    context_str = json.dumps(direct_data, ensure_ascii=False, indent=2)
    return (
        f"{label}:\n{context_str}\n\n"
        f"{no_json_rule}\n"
        f"- Trả lời chính xác, đầy đủ và trung thực dựa trên dữ liệu thật ở trên."
    )


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
        # (bỏ qua với câu hỏi số liệu live để luôn đếm mới từ DB)
        if not _should_bypass_answer_cache(user_message):
            cached = self._answer_cache_get(user_message, history)
            if cached:
                return {"answer": cached, "sources": [], "artifact_ids": []}

        if self.is_conversational_chitchat(user_message, history):
            cached_ans = get_cached_chitchat_response(user_message)
            if cached_ans:
                return {"answer": cached_ans, "sources": [], "artifact_ids": []}

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
            "trien_lam": "DANH SÁCH TRIỂN LÃM ĐANG DIỄN RA THẬT TỪ SUPABASE (BẢNG trien_lam)",
            "trien_lam_dang_dien_ra": "DANH SÁCH TRIỂN LÃM ĐANG DIỄN RA THẬT TỪ SUPABASE (BẢNG trien_lam)",
            "trien_lam_da_ket_thuc": "DANH SÁCH TRIỂN LÃM ĐÃ KẾT THÚC THẬT TỪ SUPABASE (BẢNG trien_lam)",
            "su_kien": "DANH SÁCH SỰ KIỆN SẮP DIỄN RA THẬT TỪ SUPABASE (BẢNG su_kien)",
            "su_kien_sap_dien_ra": "DANH SÁCH SỰ KIỆN SẮP DIỄN RA THẬT TỪ SUPABASE (BẢNG su_kien)",
            "su_kien_da_dien_ra": "DANH SÁCH SỰ KIỆN ĐÃ TỪNG DIỄN RA THẬT TỪ SUPABASE (BẢNG su_kien)",
            "chuyen_de": "DANH SÁCH CÁC CHUYÊN ĐỀ TRƯNG BÀY THẬT TỪ SUPABASE (BẢNG phong_trung_bay)",
            "chuyen_de_dang_dien_ra": "DANH SÁCH CÁC CHUYÊN ĐỀ TRƯNG BÀY ĐANG DIỄN RA THẬT TỪ SUPABASE (BẢNG phong_trung_bay)",
            "chuyen_de_da_dien_ra": "DANH SÁCH CÁC CHUYÊN ĐỀ TRƯNG BÀY ĐÃ DIỄN RA (ĐÃ KẾT THÚC) THẬT TỪ SUPABASE (BẢNG phong_trung_bay)",
            "danh_gia": "ĐÁNH GIÁ VÀ NHẬN XÉT THỰC TẾ CỦA DU KHÁCH TỪ SUPABASE (BẢNG danh_gia)",
            "thong_ke_bao_tang": "DỮ LIỆU THỐNG KÊ TỔNG QUAN THẬT TỪ SUPABASE",
        }

        if decision.intent in LIVE_INTENT_LABELS and decision.direct_data:
            direct_ans = None
            if decision.intent == "thong_ke_bao_tang":
                direct_ans = _format_thong_ke_answer(decision.direct_data)
            elif decision.intent in ("su_kien_da_dien_ra",):
                direct_ans = _format_su_kien_da_dien_ra_answer(decision.direct_data)
            elif decision.intent in ("su_kien", "su_kien_sap_dien_ra"):
                direct_ans = _format_su_kien_answer(decision.direct_data)
            elif decision.intent in ("chuyen_de_da_dien_ra", "chuyen_de_da_ket_thuc"):
                direct_ans = _format_chuyen_de_da_dien_ra_answer(decision.direct_data)
            elif decision.intent in ("chuyen_de", "chuyen_de_trung_bay", "chuyen_de_dang_dien_ra"):
                direct_ans = _format_chuyen_de_answer(decision.direct_data)
            elif decision.intent in ("trien_lam_da_ket_thuc", "trien_lam_da_dien_ra"):
                direct_ans = _format_trien_lam_da_ket_thuc_answer(decision.direct_data)
            elif decision.intent in ("trien_lam_sap_dien_ra",):
                direct_ans = _format_trien_lam_sap_dien_ra_answer(decision.direct_data)
            elif decision.intent in ("trien_lam", "trien_lam_dang_dien_ra"):
                direct_ans = _format_trien_lam_answer(decision.direct_data)
            elif decision.intent in ("gia_ve", "ve_tham_quan"):
                direct_ans = _format_gia_ve_answer(decision.direct_data)

            scope = _detect_query_scope(user_message, decision.intent)
            if scope in ("event", "exhibition", "gallery"):
                related_items = _extract_related_items(decision.intent, decision.direct_data)
                artifact_ids = []
            elif scope == "artifact":
                related_items = []
                artifact_ids = _extract_artifacts_for_all_intents(decision.intent, decision.direct_data)
            else:
                related_items = []
                artifact_ids = []

            if direct_ans:
                return {
                    "answer": direct_ans,
                    "sources": [],
                    "artifact_ids": artifact_ids,
                    "related_items": related_items
                }
            label = LIVE_INTENT_LABELS[decision.intent]
            prompt_context = _build_live_prompt_context(
                decision.intent, label, decision.direct_data
            )
            answer = await self.gemini.generate_response(
                user_message=user_message,
                context=prompt_context,
                history=history,
                system_instruction=MUSEUM_GROUNDED_PROMPT,
                temperature=0.2
            )
            return {"answer": answer, "sources": [], "artifact_ids": artifact_ids, "related_items": related_items}

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
        related_items = []
        if "chua co thong tin" in low_ans or "khong co thong tin" in low_ans or "chua tim thay" in low_ans:
            sources = []
            artifact_ids = []
            related_items = []
        else:
            scope = _detect_query_scope(user_message, decision.intent)
            if scope == "artifact":
                prev_mode, prev_aid = self.router.check_previous_turn_mode(history)
                artifact_ids = self.entity_linking.resolve_artifact_ids(
                    final_mode="museum",
                    answer_text=answer,
                    intent=decision.intent,
                    retrieved_ids=retrieved_ids,
                    context_id=prev_aid if decision.is_followup else None
                )
                related_items = []
            elif scope in ("event", "exhibition", "gallery"):
                artifact_ids = []
                related_items = _match_all_related_items_from_text(answer, user_message, decision.intent)
            else:
                artifact_ids = []
                related_items = []

        self._answer_cache_set(user_message, answer, history)
        return {"answer": answer, "sources": sources, "artifact_ids": artifact_ids, "related_items": related_items}

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

        if self.is_conversational_chitchat(user_message, history):
            cached_ans = get_cached_chitchat_response(user_message)
            if cached_ans:
                yield cached_ans
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
            "trien_lam": "DANH SÁCH TRIỂN LÃM ĐANG DIỄN RA THẬT TỪ SUPABASE (BẢNG trien_lam)",
            "trien_lam_dang_dien_ra": "DANH SÁCH TRIỂN LÃM ĐANG DIỄN RA THẬT TỪ SUPABASE (BẢNG trien_lam)",
            "trien_lam_da_ket_thuc": "DANH SÁCH TRIỂN LÃM ĐÃ KẾT THÚC THẬT TỪ SUPABASE (BẢNG trien_lam)",
            "su_kien": "DANH SÁCH SỰ KIỆN SẮP DIỄN RA THẬT TỪ SUPABASE (BẢNG su_kien)",
            "su_kien_sap_dien_ra": "DANH SÁCH SỰ KIỆN SẮP DIỄN RA THẬT TỪ SUPABASE (BẢNG su_kien)",
            "su_kien_da_dien_ra": "DANH SÁCH SỰ KIỆN ĐÃ TỪNG DIỄN RA THẬT TỪ SUPABASE (BẢNG su_kien)",
            "chuyen_de": "DANH SÁCH CÁC CHUYÊN ĐỀ TRƯNG BÀY THẬT TỪ SUPABASE (BẢNG phong_trung_bay)",
            "chuyen_de_dang_dien_ra": "DANH SÁCH CÁC CHUYÊN ĐỀ TRƯNG BÀY ĐANG DIỄN RA THẬT TỪ SUPABASE (BẢNG phong_trung_bay)",
            "chuyen_de_da_dien_ra": "DANH SÁCH CÁC CHUYÊN ĐỀ TRƯNG BÀY ĐÃ DIỄN RA (ĐÃ KẾT THÚC) THẬT TỪ SUPABASE (BẢNG phong_trung_bay)",
            "danh_gia": "ĐÁNH GIÁ VÀ NHẬN XÉT THỰC TẾ CỦA DU KHÁCH TỪ SUPABASE (BẢNG danh_gia)",
            "thong_ke_bao_tang": "DỮ LIỆU THỐNG KÊ TỔNG QUAN THẬT TỪ SUPABASE",
        }

        if decision.intent in LIVE_INTENT_LABELS and decision.direct_data:
            direct_ans = None
            if decision.intent == "thong_ke_bao_tang":
                direct_ans = _format_thong_ke_answer(decision.direct_data)
            elif decision.intent in ("su_kien_da_dien_ra",):
                direct_ans = _format_su_kien_da_dien_ra_answer(decision.direct_data)
            elif decision.intent in ("su_kien", "su_kien_sap_dien_ra"):
                direct_ans = _format_su_kien_answer(decision.direct_data)
            elif decision.intent in ("chuyen_de_da_dien_ra", "chuyen_de_da_ket_thuc"):
                direct_ans = _format_chuyen_de_da_dien_ra_answer(decision.direct_data)
            elif decision.intent in ("chuyen_de", "chuyen_de_trung_bay", "chuyen_de_dang_dien_ra"):
                direct_ans = _format_chuyen_de_answer(decision.direct_data)
            elif decision.intent in ("trien_lam_da_ket_thuc", "trien_lam_da_dien_ra"):
                direct_ans = _format_trien_lam_da_ket_thuc_answer(decision.direct_data)
            elif decision.intent in ("trien_lam_sap_dien_ra",):
                direct_ans = _format_trien_lam_sap_dien_ra_answer(decision.direct_data)
            elif decision.intent in ("trien_lam", "trien_lam_dang_dien_ra"):
                direct_ans = _format_trien_lam_answer(decision.direct_data)
            elif decision.intent in ("gia_ve", "ve_tham_quan"):
                direct_ans = _format_gia_ve_answer(decision.direct_data)

            scope = _detect_query_scope(user_message, decision.intent)
            if scope in ("event", "exhibition", "gallery"):
                related_items = _extract_related_items(decision.intent, decision.direct_data)
                artifact_ids = []
            elif scope == "artifact":
                related_items = []
                artifact_ids = _extract_artifacts_for_all_intents(decision.intent, decision.direct_data)
            else:
                related_items = []
                artifact_ids = []

            if direct_ans:
                yield direct_ans
                if artifact_ids:
                    yield {"artifact_ids": artifact_ids}
                if related_items:
                    yield {"related_items": related_items}
                return
            label = LIVE_INTENT_LABELS[decision.intent]
            prompt_context = _build_live_prompt_context(
                decision.intent, label, decision.direct_data
            )
            async for chunk in self.gemini.generate_response_stream(
                user_message=user_message,
                context=prompt_context,
                history=history,
                system_instruction=MUSEUM_GROUNDED_PROMPT,
                temperature=0.2
            ):
                yield chunk
            # Yield related items và artifact cards cho intent này
            if artifact_ids:
                yield {"artifact_ids": artifact_ids}
            if related_items:
                yield {"related_items": related_items}
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

        # Yield artifact cards hoặc related items ở cuối stream tùy theo phạm vi câu hỏi
        complete_text = "".join(full_answer)
        low_ans = complete_text.lower()
        if not ("chua co thong tin" in low_ans or "khong co thong tin" in low_ans or "chua tim thay" in low_ans):
            scope = _detect_query_scope(user_message, decision.intent)

            if scope == "artifact":
                prev_mode, prev_aid = self.router.check_previous_turn_mode(history)
                artifact_ids = self.entity_linking.resolve_artifact_ids(
                    final_mode="museum",
                    answer_text=complete_text,
                    intent=decision.intent,
                    retrieved_ids=retrieved_ids,
                    context_id=prev_aid if decision.is_followup else None
                )

                # Bổ sung artifact IDs theo chủ đề nếu danh sách còn ít
                if len(artifact_ids) < 3:
                    topic_aids = _extract_artifacts_for_all_intents("museum_topic", {}, complete_text + " " + user_message)
                    for aid in topic_aids:
                        if aid not in artifact_ids:
                            artifact_ids.append(aid)

                if artifact_ids:
                    yield {"artifact_ids": artifact_ids[:6]}

            elif scope in ("event", "exhibition", "gallery"):
                matched_items = _match_all_related_items_from_text(complete_text, user_message, decision.intent)
                if matched_items:
                    yield {"related_items": matched_items[:6]}


# Khởi tạo singleton instance
rag_pipeline = RAGPipeline()
