"""
Script: sync_hien_vat_by_id.py
Mục đích: Đồng bộ hoặc cập nhật lại các hiện vật cụ thể theo source_id từ Supabase vào ChromaDB collection V2.
Đảm bảo id ổn định (hien_vat_<id>), không tạo trùng chunk khi bảo tàng cập nhật dữ liệu.

Sử dụng:
  python scripts/sync_hien_vat_by_id.py AV221 AV019 AV020
  python scripts/sync_hien_vat_by_id.py --all   # Đồng bộ lại toàn bộ 272 hiện vật
"""
import os
import sys
try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass
import argparse

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(CURRENT_DIR)
sys.path.insert(0, BACKEND_DIR)

from dotenv import load_dotenv
load_dotenv(os.path.join(BACKEND_DIR, ".env"))

import chromadb
from core.supabase_client import supabase_admin
from services.vector_db import CHROMA_DATA_PATH
from services.embedding import get_embeddings_batch
from services.text_utils import remove_accents

COLLECTION_NAME = "museum_rag_knowledge_v2"


def build_hien_vat_doc(row: dict) -> tuple[str, dict, str]:
    """Tạo doc_text, metadata và doc_id chuẩn từ 1 row hien_vat của Supabase."""
    raw_id = str(row["id"]).strip()
    doc_id = f"hien_vat_{raw_id}"

    title = row.get("name") or ""
    parts = [f"Tiêu đề: {title}"]
    parts.append("Phân loại: Hiện vật bảo tàng")
    if row.get("category"):
        parts.append(f"Danh mục: {row['category']}")
    if row.get("culture"):
        parts.append(f"Nền văn hóa: {row['culture']}")
    if row.get("period"):
        parts.append(f"Thời kỳ / Niên đại: {row['period']}")
    if row.get("date_display"):
        parts.append(f"Niên đại hiển thị: {row['date_display']}")
    if row.get("material"):
        parts.append(f"Chất liệu: {row['material']}")
    if row.get("dimensions"):
        parts.append(f"Kích thước: {row['dimensions']}")
    if row.get("origin"):
        parts.append(f"Nguồn gốc / Nơi khai quật: {row['origin']}")
    if row.get("location"):
        parts.append(f"Vị trí trưng bày: {row['location']}")
    if row.get("status"):
        parts.append(f"Trạng thái: {row['status']}")
    if row.get("description"):
        parts.append(f"Mô tả: {row['description']}")
    if row.get("ai_analysis"):
        parts.append(f"Phân tích chuyên sâu: {row['ai_analysis']}")

    # Bổ sung từ khóa không dấu để tối ưu tìm kiếm ngữ nghĩa tiếng Việt
    no_acc = remove_accents(title).strip()
    if no_acc:
        parts.append(f"Từ khóa không dấu: {no_acc}")

    doc_text = "\n".join(parts)

    metadata = {
        "source_table": "hien_vat",
        "source_id": raw_id,
        "title": title,
        "category": str(row.get("category") or "Hiện vật bảo tàng"),
        "period": str(row.get("period") or ""),
        "location": str(row.get("location") or ""),
    }

    return doc_text, metadata, doc_id


def sync_artifacts_by_ids(ids: list[str]):
    clean_ids = [i.replace("hien_vat_", "").strip() for i in ids if i.strip()]
    if not clean_ids:
        print("[Sync] Không có ID hiện vật nào được chỉ định.")
        return

    print(f"[Sync] Đang truy vấn {len(clean_ids)} hiện vật từ Supabase...")
    res = supabase_admin.table("hien_vat").select("*").in_("id", clean_ids).execute()
    rows = res.data or []

    found_ids = {r["id"] for r in rows}
    missing_ids = set(clean_ids) - found_ids
    if missing_ids:
        print(f"[Cảnh báo] Không tìm thấy các ID sau trong Supabase: {missing_ids}")

    if not rows:
        print("[Sync] Không có dữ liệu để đồng bộ.")
        return

    doc_texts, metadatas, doc_ids = [], [], []
    for r in rows:
        d_text, meta, d_id = build_hien_vat_doc(r)
        doc_texts.append(d_text)
        metadatas.append(meta)
        doc_ids.append(d_id)
        print(f"  -> Chuẩn bị: [{r['id']}] {r.get('name')} (doc_id: {d_id})")

    print(f"[Sync] Đang tạo embedding batch ({len(doc_texts)} docs)...")
    embeddings = get_embeddings_batch(doc_texts)

    print(f"[Sync] Đang kết nối ChromaDB tại '{CHROMA_DATA_PATH}'...")
    client = chromadb.PersistentClient(path=CHROMA_DATA_PATH)
    
    # Mở hoặc tạo collection V2 với metric cosine
    try:
        v2 = client.get_collection(COLLECTION_NAME)
    except Exception:
        v2 = client.create_collection(
            name=COLLECTION_NAME,
            metadata={"hnsw:space": "cosine", "description": "RAG V2: task_type + khong dau + hien_vat"}
        )

    # Upsert vào ChromaDB (id đã tồn tại sẽ ghi đè, không sinh trùng)
    v2.upsert(
        ids=doc_ids,
        documents=doc_texts,
        metadatas=metadatas,
        embeddings=embeddings
    )

    print(f"✅ ĐÃ ĐỒNG BỘ THÀNH CÔNG {len(doc_ids)} HIỆN VẬT VÀO '{COLLECTION_NAME}' (Tổng count: {v2.count()})")


def sync_all_artifacts():
    print("[Sync] Đang đọc toàn bộ hiện vật từ Supabase...")
    res = supabase_admin.table("hien_vat").select("id").execute()
    all_ids = [r["id"] for r in (res.data or [])]
    print(f"[Sync] Tìm thấy {len(all_ids)} hiện vật.")
    sync_artifacts_by_ids(all_ids)


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser(description="Đồng bộ hiện vật theo source_id vào ChromaDB V2")
    parser.add_argument("ids", nargs="*", help="Danh sách ID hiện vật (ví dụ: AV221 AV019)")
    parser.add_argument("--all", action="store_true", help="Đồng bộ toàn bộ bảng hien_vat")
    args = parser.parse_args()

    if args.all:
        sync_all_artifacts()
    elif args.ids:
        sync_artifacts_by_ids(args.ids)
    else:
        print("Vui lòng nhập ID hiện vật hoặc dùng cờ --all. Ví dụ:")
        print("  python scripts/sync_hien_vat_by_id.py AV221 AV019")
        print("  python scripts/sync_hien_vat_by_id.py --all")
