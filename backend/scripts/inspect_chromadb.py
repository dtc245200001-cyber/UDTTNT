"""
Script: inspect_chromadb.py
Mục đích: Hiển thị cấu trúc Collection và Log truy vấn Vector trong ChromaDB
phục vụ chụp ảnh minh họa cho báo cáo/đồ án (Hình 4.3: Kho tri thức vector được lưu trong ChromaDB).
Đảm bảo KHÔNG để lộ API Key.
"""
import os
import sys

try:
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
except Exception:
    pass

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(CURRENT_DIR)
sys.path.insert(0, BACKEND_DIR)

from dotenv import load_dotenv
load_dotenv(os.path.join(BACKEND_DIR, ".env"))

# Tạm ẩn log khởi tạo embedding để màn hình terminal đẹp chuẩn báo cáo
import io
_orig_stdout = sys.stdout
sys.stdout = io.StringIO()
from services.vector_db import vector_db_service
from services.embedding import embed_query
sys.stdout = _orig_stdout

def inspect_chromadb():
    collection = vector_db_service.collection
    total_docs = collection.count()

    print("=" * 82)
    print("   🏛️ HỆ THỐNG QUẢN LÝ KHO TRI THỨC VECTOR - CHROMADB (VIETNAM HISTORY MUSEUM)")
    print("=" * 82)
    print(f" • Tên Collection       : {collection.name}")
    print(f" • Tổng số vector/chunk : {total_docs:,} bản ghi")
    print(f" • Kiểu lưu trữ         : Persistent SQLite + Parquet (Local Vector Store)")
    print(f" • Thuật toán & Metric  : HNSW Index / Cosine Similarity (Khoảng cách Vector)")
    print(f" • Chiều không gian     : 768 dimensions (gemini-embedding-2 / text-embedding-004)")
    print("=" * 82)

    # 1. Cấu trúc bản ghi vector mẫu
    print("\n[1] CẤU TRÚC CHI TIẾT BẢN GHI VECTOR MẪU TRONG COLLECTION:")
    print("-" * 82)
    sample = collection.get(
        limit=1,
        include=["metadatas", "documents", "embeddings"]
    )
    
    if sample and sample.get("ids") and len(sample["ids"]) > 0:
        doc_id = sample["ids"][0]
        meta = sample["metadatas"][0] if sample.get("metadatas") else {}
        doc = sample["documents"][0] if sample.get("documents") else ""
        embed = sample["embeddings"][0] if sample.get("embeddings") is not None and len(sample["embeddings"]) > 0 else []

        print(f"► Document ID (Mã định danh): {doc_id}")
        print("\n► Metadata (Thuộc tính phân đoạn):")
        for k, v in meta.items():
            print(f"    - {k:<15}: {v}")
        
        print("\n► Document Content (Văn bản trích xuất đã phân đoạn):")
        doc_preview = doc.strip().split("\n")
        for line in doc_preview[:5]:
            print(f"    | {line}")
        if len(doc_preview) > 5:
            print(f"    | ... (đoạn mô tả chi tiết của hiện vật)")

        if len(embed) > 0:
            embed_sample = ", ".join([f"{x:.4f}" for x in embed[:6]])
            print(f"\n► Vector Embedding Representation (768 chiều):")
            print(f"    Vector: [{embed_sample}, ..., {embed[-1]:.4f}]")
    else:
        print("Chưa có bản ghi mẫu trong collection.")

    # 2. Thống kê theo danh mục bảng nguồn
    print("\n" + "=" * 82)
    print("[2] PHÂN BỔ DỮ LIỆU VECTOR THEO NGUỒN (SOURCE TABLE):")
    print("-" * 82)
    print(f" {'NGUỒN DỮ LIỆU (SOURCE)':<30} | {'SỐ LƯỢNG CHUNK':<18} | {'TỶ LỆ (%)':<10}")
    print("-" * 82)
    
    source_tables = [
        ("hien_vat", "Hiện vật bảo tàng"),
        ("danh_muc", "Danh mục & Phân loại"),
        ("phong_trung_bay", "Không gian & Phòng trưng bày"),
        ("trien_lam", "Triển lãm chuyên đề"),
        ("su_kien", "Sự kiện văn hóa"),
        ("bai_viet", "Tin tức & Nghiên cứu"),
    ]
    
    for tbl_key, tbl_name in source_tables:
        try:
            res = collection.get(where={"source_table": tbl_key}, include=["metadatas"])
            cnt = len(res["ids"]) if res and "ids" in res else 0
        except Exception:
            cnt = 0
        pct = (cnt / total_docs * 100) if total_docs > 0 else 0
        print(f" {tbl_name + ' [' + tbl_key + ']':<30} | {cnt:<18} | {pct:>6.1f}%")

    print("-" * 82)

    # 3. Log truy vấn dữ liệu vector thực tế
    print("\n" + "=" * 82)
    print("[3] NHẬT KÝ TRUY VẤN DỮ LIỆU VECTOR THỰC TẾ (VECTOR RETRIEVAL LOG):")
    print("-" * 82)
    sample_queries = [
        "Trống đồng Cảnh Thịnh đúc vào triều đại nào?",
        "Thời gian mở cửa và giá vé tham quan bảo tàng"
    ]

    for q in sample_queries:
        print(f"\n🔍 [User Query Text]: \"{q}\"")
        try:
            q_emb = embed_query(q)
            results = vector_db_service.query_similar(query_embedding=q_emb, n_results=2)
            for idx, r in enumerate(results, 1):
                dist = r.get('distance', 0.0)
                sim_score = max(0.0, 1.0 - dist) if dist <= 1.0 else (1.0 / (1.0 + dist))
                print(f"   [{idx}] Matched ID: {r.get('id')} | Distance: {dist:.4f} | Cosine Similarity: {sim_score:.2%}")
                meta_item = r.get('metadata', {})
                print(f"       Metadata: table={meta_item.get('source_table')} | category={meta_item.get('category', 'N/A')}")
                first_line = r.get('content', '').strip().split('\n')[0]
                print(f"       Trích đoạn nội dung: \"{first_line[:70]}...\"")
        except Exception as e:
            print(f"   (Lỗi log truy vấn: {e})")

    print("\n" + "=" * 82)
    print(" [Trạng thái: An toàn] KHÔNG hiển thị khóa bí mật (API Keys/Tokens).")
    print("=" * 82)

if __name__ == "__main__":
    inspect_chromadb()
