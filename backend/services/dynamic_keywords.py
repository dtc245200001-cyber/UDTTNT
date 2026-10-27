"""
Dynamic Keywords Service:
Trích xuất tự động từ khóa thực thể từ Supabase (hien_vat, trien_lam, phong_trung_bay, danh_muc).
- Không hardcode danh sách hiện vật.
- Khớp cụm đầy đủ trên bản không dấu (word-boundary / phrase match).
- Loại bỏ các tên < 2 từ hoặc thuộc danh sách từ dừng/từ thông dụng (báo cáo cho người dùng).
- Chặn nhận diện nhầm khi câu nhắc tới bảo tàng/địa danh quốc tế (Louvre, Colosseum...).
- "bảo tàng" đứng một mình không đủ ép chế độ museum.
- Có cơ chế cache in-memory và hàm refresh_dynamic_keywords() khi dữ liệu thay đổi.
"""
import re
import unicodedata
import logging
from typing import Dict, List, Set, Tuple, Optional
from core.supabase_client import supabase_admin

logger = logging.getLogger(__name__)

# Danh sách bảo tàng / địa danh / di tích thế giới cần loại trừ (không ép museum trong nước)
FOREIGN_LANDMARKS = [
    "louvre", "british museum", "metropolitan", "vatican", "hermitage",
    "colosseum", "dau truong la ma", "kim tu thap", "thap eiffel", "eiffel",
    "mona lisa", "paris", "nuoc phap", "nhat ban", "rome", "tokyo", "london",
    "the chien thu hai", "chien tranh the gioi thu hai", "the chien 2", "ww2",
    "phuc hung", "claude monet", "leonardo da vinci", "van gogh"
]

# Stopwords tiếng Việt hoặc từ ngữ thông dụng 2 từ dễ gây false positive
GENERIC_2WORD_STOPWORDS = {
    "xe tang",      # AV049: Xe tăng (dễ nhầm với câu hỏi quân sự thế giới/game)
    "la ban",       # AV116: La bàn (dễ nhầm với câu hỏi định hướng, dã ngoại)
    "mui ten",      # AV215: Mũi tên (dễ nhầm với ký hiệu, toán học, đồ họa)
    "luoi cau",     # AV222: Lưỡi câu (dễ nhầm với câu cá giải trí)
    "lan huong",    # AV271: Lan Huong (tên người phổ biến)
    "tuong phat",   # AV145: Tượng Phật (khái niệm tôn giáo/chùa chiền chung)
    "mu rom",       # AV069: Mũ rơm (vật dụng dân gian chung)
    "cao co",       # AV058: Cào cỏ (dụng cụ làm nông chung)
    "mui khoan",    # AV084: Mũi khoan (dụng cụ kỹ thuật)
    "lu huong",     # AV167: Lư hương (đồ thờ cúng phổ biến)
    "tram cai",     # AV193: Trâm cài (phụ kiện tóc)
    "chuoi hat",    # AV198: Chuỗi hạt (trang sức/phụ kiện)
    "chan den",     # AV190: Chân đèn (vật dụng nội thất)
    "sung go",      # AV066: Súng gỗ (đồ chơi)
    "cuoc chim",    # AV086: Cuốc chim (dụng cụ lao động)
    "dan da",       # AV168: Đạn đá (khái niệm chung)
    "chau trong",   # AV185: Chậu trống
    "bang da",      # AV052: Băng da
    "buc theu",     # AV034: Bức thêu
    "riu bon",      # AV200: Rìu bôn
    "riu tay",      # AV205: Rìu tay
    "riu ngan",     # AV207: Rìu ngắn
    "thuyen tho",   # AV165: Thuyền thờ
}


def strip_accents(text: str) -> str:
    """Loại bỏ dấu tiếng Việt, đưa về chữ thường và chuẩn hóa khoảng trắng."""
    if not text:
        return ""
    text = unicodedata.normalize("NFD", text)
    text = "".join(c for c in text if unicodedata.category(c) != "Mn")
    text = text.replace("đ", "d").replace("Đ", "d")
    text = re.sub(r"[^\w\s]", " ", text)
    return " ".join(text.lower().split())


class DynamicKeywordService:
    def __init__(self):
        self.entities: List[Dict] = []
        self.excluded_entities: List[Dict] = []
        self._is_loaded = False

    def load_keywords(self, force_refresh: bool = False):
        """Tải toàn bộ thực thể từ Supabase, lọc và cache trong bộ nhớ."""
        if self._is_loaded and not force_refresh:
            return

        logger.info("[DynamicKeywords] Đang tải danh sách thực thể từ Supabase...")
        raw_items = []

        try:
            # 1. Hiện vật
            hv = supabase_admin.table("hien_vat").select("id, name").execute().data or []
            for r in hv:
                raw_items.append({"table": "hien_vat", "id": r["id"], "name": r["name"]})

            # 2. Triển lãm
            tl = supabase_admin.table("trien_lam").select("id, name").execute().data or []
            for r in tl:
                raw_items.append({"table": "trien_lam", "id": r["id"], "name": r["name"]})

            # 3. Phòng trưng bày
            ptb = supabase_admin.table("phong_trung_bay").select("id, name").execute().data or []
            for r in ptb:
                raw_items.append({"table": "phong_trung_bay", "id": r["id"], "name": r["name"]})

            # 4. Danh mục
            dm = supabase_admin.table("danh_muc").select("id, name").execute().data or []
            for r in dm:
                raw_items.append({"table": "danh_muc", "id": r["id"], "name": r["name"]})
        except Exception as e:
            logger.error(f"[DynamicKeywords] Lỗi kết nối Supabase khi tải thực thể: {e}")
            return

        valid_entities = []
        excluded_entities = []

        for item in raw_items:
            name = item["name"]
            
            # Tách thêm tên chính nếu có dấu gạch ngang hoặc hai chấm
            candidates = [name]
            for delim in [" - ", " – ", " — ", ": "]:
                if delim in name:
                    main_part = name.split(delim)[0].strip()
                    if len(main_part.split()) >= 2:
                        candidates.append(main_part)

            for cand_name in set(candidates):
                norm_name = strip_accents(cand_name)
                words = norm_name.split()

                # Quy tắc 1: Loại bỏ tên dưới 2 từ
                if len(words) < 2:
                    excluded_entities.append({
                        "table": item["table"],
                        "id": item["id"],
                        "name": cand_name,
                        "norm": norm_name,
                        "reason": "Dưới 2 từ (< 2 words)"
                    })
                    continue

                # Quy tắc 2: Loại bỏ từ nằm trong danh sách stopwords / từ thông dụng
                if norm_name in GENERIC_2WORD_STOPWORDS:
                    excluded_entities.append({
                        "table": item["table"],
                        "id": item["id"],
                        "name": cand_name,
                        "norm": norm_name,
                        "reason": "Từ thông dụng / Stopwords (nguy cơ false positive cao)"
                    })
                    continue

                valid_entities.append({
                    "table": item["table"],
                    "id": item["id"],
                    "name": name,
                    "matched_alias": cand_name,
                    "norm": norm_name,
                    "word_count": len(words)
                })

        # Sắp xếp các cụm từ dài hơn lên trước để ưu tiên greedy match
        valid_entities.sort(key=lambda x: x["word_count"], reverse=True)

        self.entities = valid_entities
        self.excluded_entities = excluded_entities
        self._is_loaded = True
        logger.info(f"[DynamicKeywords] Đã nạp {len(valid_entities)} thực thể hợp lệ, loại {len(excluded_entities)} thực thể.")

    def get_excluded_list(self) -> List[Dict]:
        """Trả về danh sách thực thể bị loại để báo cáo người dùng."""
        if not self._is_loaded:
            self.load_keywords()
        return self.excluded_entities

    def has_foreign_context(self, norm_query: str) -> bool:
        """Kiểm tra câu hỏi có chứa bảo tàng / địa danh quốc tế hay không."""
        for fl in FOREIGN_LANDMARKS:
            if re.search(rf"\b{re.escape(fl)}\b", norm_query):
                return True
        return False

    def match(self, query: str) -> Optional[Dict]:
        """
        Khớp từ khóa trong query theo cụm đầy đủ trên bản không dấu.
        Nếu câu có địa danh thế giới (Louvre, Colosseum...) và không nhắc bảo vật cụ thể, không ép museum.
        'bảo tàng' đứng một mình KHÔNG đủ ép museum.
        """
        if not self._is_loaded:
            self.load_keywords()

        norm_query = strip_accents(query)
        padded_query = f" {norm_query} "

        # Kiểm tra ngữ cảnh nước ngoài
        is_foreign = self.has_foreign_context(norm_query)

        # Duyệt qua các thực thể hợp lệ từ DB
        for ent in self.entities:
            pattern = rf"\b{re.escape(ent['norm'])}\b"
            if re.search(pattern, norm_query):
                # Nếu câu nhắc tới địa danh quốc tế nhưng lại khớp trúng một hiện vật thực sự dài (>= 3 từ)
                # ví dụ: "Bảo tàng Louvre có Trống đồng Ngọc Lũ không" -> vẫn nhận hiện vật
                if is_foreign and ent["word_count"] < 3:
                    continue
                return {
                    "matched": True,
                    "entity": ent,
                    "is_foreign": is_foreign
                }

        return None


# Singleton instance
dynamic_keyword_service = DynamicKeywordService()
