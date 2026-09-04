import os
import sys
import json

# Đảm bảo đường dẫn import từ backend
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(CURRENT_DIR)
sys.path.insert(0, BACKEND_DIR)

from services.vector_db import vector_db_service
from services.embedding import get_embeddings_batch

DATA_DIR = os.path.join(BACKEND_DIR, "data", "knowledge_base")

def load_and_index_all_knowledge():
    """
    Đọc tất cả các file dữ liệu trong backend/data/knowledge_base/,
    chia chunks, tạo vector embeddings và lưu vào ChromaDB.
    """
    print("=" * 60)
    print("🏛️ BẮT ĐẦU NẠP DỮ LIỆU TRI THỨC VÀO CHOMADB (RAG PIPELINE)...")
    print("=" * 60)

    # 1. Reset collection cũ để đảm bảo dữ liệu mới nhất
    vector_db_service.clear()

    all_docs = []
    all_metas = []
    all_ids = []

    files_to_load = [
        "museum_info.json",
        "dynasties_history.json",
        "artifacts.json",
        "exhibitions_events.json",
        "faq.json"
    ]

    for fname in files_to_load:
        fpath = os.path.join(DATA_DIR, fname)
        if not os.path.exists(fpath):
            print(f"[Warning] File không tồn tại: {fpath}")
            continue

        try:
            with open(fpath, "r", encoding="utf-8") as f:
                data = json.load(f)

            print(f"📖 Đang xử lý file '{fname}' ({len(data)} mục)...")

            for item in data:
                item_id = item.get("id", f"doc_{len(all_ids)}")
                title = item.get("title", item.get("name", "Tư liệu"))
                category = item.get("category", "Lịch sử")
                period = item.get("period", "")
                date_val = item.get("date", "")
                location = item.get("location", "")
                content = item.get("content", "")

                # Chuẩn bị văn bản hoàn chỉnh để embedding hiểu ngữ nghĩa sâu sắc
                full_text = f"Tiêu đề: {title}\nPhân loại: {category}"
                if period:
                    full_text += f"\nThời kỳ / Triều đại: {period}"
                if date_val:
                    full_text += f"\nNiên đại: {date_val}"
                if location:
                    full_text += f"\nNơi trưng bày: {location}"
                full_text += f"\nNội dung chi tiết: {content}"

                metadata = {
                    "id": item_id,
                    "title": str(title),
                    "category": str(category),
                    "period": str(period),
                    "date": str(date_val),
                    "location": str(location),
                    "source_file": fname
                }

                all_docs.append(full_text)
                all_metas.append(metadata)
                all_ids.append(item_id)

        except Exception as e:
            print(f"❌ Lỗi khi đọc file {fname}: {e}")

    print(f"\n⚡ Tổng số tài liệu/chunks chuẩn bị nạp: {len(all_docs)}")

    # 2. Tạo vector embeddings theo batch
    print("🔄 Đang tạo vector embeddings...")
    embeddings = get_embeddings_batch(all_docs)

    # 3. Lưu vào ChromaDB
    print("💾 Đang ghi vào ChromaDB persistent storage...")
    vector_db_service.add_documents(
        documents=all_docs,
        metadatas=all_metas,
        ids=all_ids,
        embeddings=embeddings
    )

    print("=" * 60)
    print(f"✅ HOÀN TẤT NẠP DỮ LIỆU! Tổng số chunks trong ChromaDB: {vector_db_service.count()}")
    print("=" * 60)

if __name__ == "__main__":
    load_and_index_all_knowledge()
