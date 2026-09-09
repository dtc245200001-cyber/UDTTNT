"""
Script đồng bộ dữ liệu từ Supabase → ChromaDB cho RAG pipeline.
Đọc trực tiếp từ các bảng thật trong Supabase, chuyển thành văn bản mô tả,
rồi nhúng vào ChromaDB. Bổ sung song song với dữ liệu tĩnh từ file JSON.

Chạy: python scripts/sync_supabase_to_vector_db.py
"""
import os
import sys

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(CURRENT_DIR)
sys.path.insert(0, BACKEND_DIR)

from dotenv import load_dotenv
load_dotenv(os.path.join(BACKEND_DIR, ".env"))

from core.supabase_client import supabase_admin
from services.vector_db import vector_db_service
from services.embedding import get_embeddings_batch


# ── Hàm chuyển từng bảng thành danh sách (doc_text, metadata, doc_id) ─────

def _sync_hien_vat() -> list[tuple[str, dict, str]]:
    """Đọc bảng hien_vat → tạo văn bản mô tả đầy đủ."""
    result = supabase_admin.table("hien_vat").select(
        "id, name, category, culture, period, material, dimensions, origin, location, status, description, ai_analysis, date_display"
    ).execute()

    items = []
    for row in (result.data or []):
        parts = [f"Tiêu đề: {row.get('name', '')}"]
        parts.append("Phân loại: Hiện vật bảo tàng")
        if row.get('category'):
            parts.append(f"Danh mục: {row['category']}")
        if row.get('culture'):
            parts.append(f"Nền văn hóa: {row['culture']}")
        if row.get('period'):
            parts.append(f"Thời kỳ / Niên đại: {row['period']}")
        if row.get('date_display'):
            parts.append(f"Niên đại hiển thị: {row['date_display']}")
        if row.get('material'):
            parts.append(f"Chất liệu: {row['material']}")
        if row.get('dimensions'):
            parts.append(f"Kích thước: {row['dimensions']}")
        if row.get('origin'):
            parts.append(f"Nguồn gốc / Nơi khai quật: {row['origin']}")
        if row.get('location'):
            parts.append(f"Vị trí trưng bày: {row['location']}")
        if row.get('status'):
            parts.append(f"Trạng thái: {row['status']}")
        if row.get('description'):
            parts.append(f"Mô tả: {row['description']}")
        if row.get('ai_analysis'):
            parts.append(f"Phân tích chuyên sâu: {row['ai_analysis']}")

        doc_text = "\n".join(parts)
        doc_id = f"hien_vat_{row['id']}"
        metadata = {
            "source_table": "hien_vat",
            "source_id": str(row["id"]),
            "title": str(row.get("name", "")),
            "category": str(row.get("category", "Hiện vật bảo tàng")),
            "period": str(row.get("period", "")),
            "location": str(row.get("location", "")),
        }
        items.append((doc_text, metadata, doc_id))
    return items


def _sync_trien_lam() -> list[tuple[str, dict, str]]:
    """Đọc bảng trien_lam → tạo văn bản mô tả."""
    result = supabase_admin.table("trien_lam").select(
        "id, name, status, start_date, end_date, location, description"
    ).execute()

    items = []
    for row in (result.data or []):
        parts = [f"Tiêu đề: {row.get('name', '')}"]
        parts.append("Phân loại: Triển lãm")
        if row.get('status'):
            parts.append(f"Trạng thái: {row['status']}")
        if row.get('start_date'):
            parts.append(f"Ngày bắt đầu: {row['start_date']}")
        if row.get('end_date'):
            parts.append(f"Ngày kết thúc: {row['end_date']}")
        if row.get('location'):
            parts.append(f"Địa điểm: {row['location']}")
        if row.get('description'):
            parts.append(f"Mô tả: {row['description']}")

        doc_text = "\n".join(parts)
        doc_id = f"trien_lam_{row['id']}"
        metadata = {
            "source_table": "trien_lam",
            "source_id": str(row["id"]),
            "title": str(row.get("name", "")),
            "category": "Triển lãm",
            "period": "",
            "location": str(row.get("location", "")),
        }
        items.append((doc_text, metadata, doc_id))
    return items


def _sync_su_kien() -> list[tuple[str, dict, str]]:
    """Đọc bảng su_kien → tạo văn bản mô tả."""
    result = supabase_admin.table("su_kien").select(
        "id, title, date, time, location, speaker, status, seats, registered, description"
    ).execute()

    items = []
    for row in (result.data or []):
        parts = [f"Tiêu đề: {row.get('title', '')}"]
        parts.append("Phân loại: Sự kiện bảo tàng")
        if row.get('date'):
            parts.append(f"Ngày diễn ra: {row['date']}")
        if row.get('time'):
            parts.append(f"Giờ: {row['time']}")
        if row.get('location'):
            parts.append(f"Địa điểm: {row['location']}")
        if row.get('speaker'):
            parts.append(f"Diễn giả / Chủ trì: {row['speaker']}")
        if row.get('status'):
            parts.append(f"Trạng thái: {row['status']}")
        if row.get('seats') is not None:
            remaining = row.get('seats', 0) - row.get('registered', 0)
            parts.append(f"Số chỗ còn lại: {remaining}/{row['seats']}")
        if row.get('description'):
            parts.append(f"Mô tả: {row['description']}")

        doc_text = "\n".join(parts)
        doc_id = f"su_kien_{row['id']}"
        metadata = {
            "source_table": "su_kien",
            "source_id": str(row["id"]),
            "title": str(row.get("title", "")),
            "category": "Sự kiện",
            "period": str(row.get("date", "")),
            "location": str(row.get("location", "")),
        }
        items.append((doc_text, metadata, doc_id))
    return items


def _sync_phong_trung_bay() -> list[tuple[str, dict, str]]:
    """Đọc bảng phong_trung_bay → tạo văn bản mô tả."""
    result = supabase_admin.table("phong_trung_bay").select(
        "id, name, floor, description"
    ).execute()

    items = []
    for row in (result.data or []):
        parts = [f"Tiêu đề: {row.get('name', '')}"]
        parts.append("Phân loại: Phòng trưng bày")
        if row.get('floor'):
            parts.append(f"Tầng / Vị trí: {row['floor']}")
        if row.get('description'):
            parts.append(f"Mô tả: {row['description']}")

        doc_text = "\n".join(parts)
        doc_id = f"phong_trung_bay_{row['id']}"
        metadata = {
            "source_table": "phong_trung_bay",
            "source_id": str(row["id"]),
            "title": str(row.get("name", "")),
            "category": "Phòng trưng bày",
            "period": "",
            "location": str(row.get("floor", "")),
        }
        items.append((doc_text, metadata, doc_id))
    return items


def _sync_danh_muc() -> list[tuple[str, dict, str]]:
    """Đọc bảng danh_muc → tạo văn bản mô tả."""
    result = supabase_admin.table("danh_muc").select(
        "id, name, count, description"
    ).execute()

    items = []
    for row in (result.data or []):
        parts = [f"Tiêu đề: Danh mục {row.get('name', '')}"]
        parts.append("Phân loại: Danh mục hiện vật")
        if row.get('count') is not None:
            parts.append(f"Số hiện vật trong danh mục: {row['count']}")
        if row.get('description'):
            parts.append(f"Mô tả: {row['description']}")

        doc_text = "\n".join(parts)
        doc_id = f"danh_muc_{row['id']}"
        metadata = {
            "source_table": "danh_muc",
            "source_id": str(row["id"]),
            "title": str(row.get("name", "")),
            "category": "Danh mục",
            "period": "",
            "location": "",
        }
        items.append((doc_text, metadata, doc_id))
    return items


def _sync_bai_viet() -> list[tuple[str, dict, str]]:
    """Đọc bảng bai_viet → tạo văn bản mô tả."""
    result = supabase_admin.table("bai_viet").select(
        "id, title, author, category, date, status, content"
    ).execute()

    items = []
    for row in (result.data or []):
        parts = [f"Tiêu đề: {row.get('title', '')}"]
        parts.append("Phân loại: Bài viết bảo tàng")
        if row.get('author'):
            parts.append(f"Tác giả: {row['author']}")
        if row.get('category'):
            parts.append(f"Chủ đề: {row['category']}")
        if row.get('date'):
            parts.append(f"Ngày đăng: {row['date']}")
        if row.get('content'):
            # Lấy tối đa 1000 ký tự nội dung để không bloat embedding
            summary = row['content'][:1000]
            parts.append(f"Nội dung: {summary}")

        doc_text = "\n".join(parts)
        doc_id = f"bai_viet_{row['id']}"
        metadata = {
            "source_table": "bai_viet",
            "source_id": str(row["id"]),
            "title": str(row.get("title", "")),
            "category": str(row.get("category", "Bài viết")),
            "period": str(row.get("date", "")),
            "location": "",
        }
        items.append((doc_text, metadata, doc_id))
    return items


# ── Hàm chính ─────────────────────────────────────────────────────────────

SYNC_FUNCTIONS = {
    "hien_vat": _sync_hien_vat,
    "trien_lam": _sync_trien_lam,
    "su_kien": _sync_su_kien,
    "phong_trung_bay": _sync_phong_trung_bay,
    "danh_muc": _sync_danh_muc,
    "bai_viet": _sync_bai_viet,
}


def sync_supabase_to_vector_db(clear_existing: bool = False) -> int:
    """
    Đồng bộ toàn bộ dữ liệu từ Supabase vào ChromaDB.

    Args:
        clear_existing: Nếu True, xóa sạch collection ChromaDB trước khi nạp lại.
                        Nếu False, upsert từng document (an toàn hơn khi chạy tăng dần).

    Returns:
        Tổng số document đã được nạp thành công.
    """
    print("=" * 60)
    print("🔄 BẮT ĐẦU ĐỒNG BỘ SUPABASE → CHROMADB...")
    print("=" * 60)

    all_docs, all_metas, all_ids = [], [], []

    for table_name, sync_fn in SYNC_FUNCTIONS.items():
        try:
            items = sync_fn()
            print(f"📦 [{table_name}] Đọc được {len(items)} bản ghi.")
            for doc_text, metadata, doc_id in items:
                all_docs.append(doc_text)
                all_metas.append(metadata)
                all_ids.append(doc_id)
        except Exception as e:
            print(f"⚠️  [{table_name}] Bỏ qua — lỗi: {e}")

    if not all_docs:
        print("⚠️  Không có dữ liệu nào từ Supabase để đồng bộ.")
        return 0

    print(f"\n⚡ Tổng số document chuẩn bị nhúng: {len(all_docs)}")

    # Xóa document cũ cùng ID trước khi thêm mới (upsert thủ công)
    # Không xóa toàn bộ collection để giữ lại dữ liệu JSON tĩnh
    print("🗑️  Xóa các document Supabase cũ (nếu có) để tránh trùng lặp...")
    try:
        # Xóa các ID đã có từ Supabase (prefix: table_name_)
        existing_ids_to_delete = [
            doc_id for doc_id in all_ids
            if any(doc_id.startswith(t + "_") for t in SYNC_FUNCTIONS.keys())
        ]
        if existing_ids_to_delete:
            # ChromaDB chỉ báo lỗi khi ID không tồn tại nên thử từng batch nhỏ
            try:
                vector_db_service.collection.delete(ids=existing_ids_to_delete)
                print(f"   Đã xóa {len(existing_ids_to_delete)} document cũ.")
            except Exception:
                pass  # Có thể chưa tồn tại, bỏ qua
    except Exception as e:
        print(f"⚠️  Không xóa được document cũ: {e}")

    # Tạo embeddings theo batch
    print("🔄 Đang tạo vector embeddings từ Gemini...")
    from services.embedding import get_embeddings_batch
    embeddings = get_embeddings_batch(all_docs)

    # Nạp vào ChromaDB
    print("💾 Đang ghi vào ChromaDB...")
    vector_db_service.add_documents(
        documents=all_docs,
        metadatas=all_metas,
        ids=all_ids,
        embeddings=embeddings,
    )

    total = vector_db_service.count()
    print("=" * 60)
    print(f"✅ ĐỒNG BỘ HOÀN TẤT! ChromaDB hiện có {total} chunks tổng cộng.")
    print("=" * 60)
    return len(all_docs)


if __name__ == "__main__":
    sync_supabase_to_vector_db()
