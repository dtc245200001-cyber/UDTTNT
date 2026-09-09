import os
import sys
from dotenv import load_dotenv

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
load_dotenv()

from supabase import create_client, Client
from services.vector_db import vector_db_service

def verify_rag_coverage():
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

    if not url or not key:
        print("Lỗi: Thiếu SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY trong .env")
        return

    supabase: Client = create_client(url, key)

    tables = ["hien_vat", "trien_lam", "su_kien", "phong_trung_bay", "danh_muc", "bai_viet"]
    
    print("=" * 70)
    print(f"{'BẢNG (TABLE)':<20} | {'SỐ RECORD (SUPABASE)':<20} | {'SỐ CHUNK (CHROMADB)':<20}")
    print("=" * 70)

    for table in tables:
        # 1. Đếm record trong Supabase
        try:
            res = supabase.table(table).select("*", count="exact", head=True).execute()
            supa_count = res.count if res.count is not None else 0
        except Exception as e:
            supa_count = f"Lỗi: {e}"

        # 2. Đếm chunk trong ChromaDB
        try:
            # Truy vấn trực tiếp theo metadata source_table
            chroma_data = vector_db_service.collection.get(
                where={"source_table": table},
                include=["metadatas"]
            )
            chroma_count = len(chroma_data["ids"]) if chroma_data and "ids" in chroma_data else 0
        except Exception as e:
            chroma_count = f"Lỗi: {e}"

        print(f"{table:<20} | {str(supa_count):<20} | {str(chroma_count):<20}")

    print("=" * 70)
    print("Lưu ý: 1 Record trong Supabase có thể được tách (chunking) thành nhiều Chunk trong ChromaDB.")
    print("Nếu Số Chunk (ChromaDB) = 0 trong khi Số Record > 0, bảng đó đang bị LỆCH DỮ LIỆU (chưa được sync).")

if __name__ == "__main__":
    verify_rag_coverage()
