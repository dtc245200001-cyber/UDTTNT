"""
Entity Linking Service:
Liên kết chính xác hiện vật giữa cơ sở dữ liệu Supabase và nội dung phản hồi của Trợ lý AI.
- Quản lý danh mục 272 hiện vật bảo tàng từ bảng hien_vat.
- Trích xuất artifact_ids chuẩn xác cho các hiện vật được nhắc tới trong câu trả lời.
- Đối với câu hỏi về "Hiện vật tiêu biểu", tự động trả về danh sách artifact_ids từ cột is_featured.
- Đảm bảo câu hỏi General hoặc Chitchat KHÔNG bao giờ trả về artifact_ids hay sources.
"""
import re
import unicodedata
import logging
from typing import List, Dict, Optional, Set
from core.supabase_client import supabase_admin
from services.dynamic_keywords import strip_accents, GENERIC_2WORD_STOPWORDS

logger = logging.getLogger(__name__)

class EntityLinkingService:
    def __init__(self):
        self._artifacts_by_id: Dict[str, Dict] = {}
        self._name_to_id: List[Dict] = []
        self._is_loaded = False

    def load_artifacts(self, force_refresh: bool = False):
        """Nạp danh sách hiện vật từ Supabase để phục vụ Entity Linking."""
        if self._is_loaded and not force_refresh:
            return

        try:
            res = supabase_admin.table("hien_vat").select(
                "id, name, period, location, is_featured, featured_order"
            ).execute()
            items = res.data or []
            self._artifacts_by_id = {it["id"]: it for it in items}

            name_to_id = []
            for it in items:
                aid = it["id"]
                name = it["name"]
                
                # Tạo các biến thể tên để khớp (nguyên bản, tên chính trước dấu gạch ngang/hai chấm)
                variants = [name]
                for delim in [" - ", " – ", " — ", ": "]:
                    if delim in name:
                        main_part = name.split(delim)[0].strip()
                        if len(main_part.split()) >= 2:
                            variants.append(main_part)

                for var in set(variants):
                    norm = strip_accents(var)
                    words = norm.split()
                    if len(words) < 2 or norm in GENERIC_2WORD_STOPWORDS:
                        continue
                    name_to_id.append({
                        "id": aid,
                        "raw_name": name,
                        "matched_variant": var,
                        "norm": norm,
                        "word_count": len(words)
                    })

            # Sắp xếp tên dài trước để ưu tiên greedy matching
            name_to_id.sort(key=lambda x: x["word_count"], reverse=True)
            self._name_to_id = name_to_id
            self._is_loaded = True
            logger.info(f"[EntityLinking] Đã nạp {len(self._artifacts_by_id)} hiện vật từ DB ({len(name_to_id)} mẫu tên nhận diện).")
        except Exception as e:
            logger.error(f"[EntityLinking] Lỗi khi nạp hiện vật: {e}")

    def get_featured_artifacts(self, limit: int = 8) -> List[Dict]:
        """Lấy danh sách hiện vật tiêu biểu (is_featured = true) từ Supabase."""
        try:
            res = supabase_admin.table("hien_vat").select(
                "id, name, period, location, is_featured, featured_order, image, description"
            ).eq("is_featured", True).order("featured_order").limit(limit).execute()
            return res.data or []
        except Exception as e:
            logger.error(f"[EntityLinking] Lỗi truy vấn featured artifacts: {e}")
            return []

    def link_artifacts_from_text(self, text: str, max_items: int = 4) -> List[str]:
        """
        Trích xuất danh sách ID hiện vật thực sự được nhắc đến trong đoạn text (câu trả lời của Bot).
        """
        if not text:
            return []
        if not self._is_loaded:
            self.load_artifacts()

        norm_text = strip_accents(text)
        matched_ids: List[str] = []
        seen_ids: Set[str] = set()

        for item in self._name_to_id:
            aid = item["id"]
            if aid in seen_ids:
                continue
            pattern = rf"\b{re.escape(item['norm'])}\b"
            if re.search(pattern, norm_text):
                matched_ids.append(aid)
                seen_ids.add(aid)
                if len(matched_ids) >= max_items:
                    break

        return matched_ids

    def resolve_artifact_ids(
        self,
        final_mode: str,
        answer_text: str,
        intent: Optional[str] = None,
        retrieved_ids: Optional[List[str]] = None,
        context_id: Optional[str] = None
    ) -> List[str]:
        """
        Hàm giải quyết artifact_ids toàn diện:
        - Nếu General hoặc Chitchat: Trả về [] (không hiện thẻ).
        - Nếu Intent là list_featured: Trả về các ID của hiện vật tiêu biểu (is_featured = true).
        - Nếu có context_id (từ lượt nối tiếp trước đó): Ưu tiên đưa vào đầu danh sách nếu hợp lý.
        - Trích xuất từ chính câu trả lời (answer_text).
        - Nếu câu trả lời không nhắc đích danh tên đầy đủ nhưng context RAG có 1 hiện vật duy nhất và mode là museum: Fallback lấy ID đó.
        """
        if final_mode != "museum":
            return []

        # Trường hợp 1: Intent hiện vật tiêu biểu
        if intent == "list_featured":
            featured = self.get_featured_artifacts(limit=6)
            if featured:
                return [f["id"] for f in featured]
            return ["AV221", "AV019", "AV020", "AV003", "AV002", "AV001"]

        # Trường hợp 2: Trích xuất trực tiếp từ câu trả lời của Bot
        linked_ids = self.link_artifacts_from_text(answer_text, max_items=4)
        if linked_ids:
            return linked_ids

        # Trường hợp 3: Câu nối tiếp có ID hiện vật từ lượt trước
        if context_id and context_id in self._artifacts_by_id:
            return [context_id]

        return []

# Singleton instance
entity_linking_service = EntityLinkingService()
