"""
Thêm tài liệu gợi ý tham quan và lộ trình vào collection museum_rag_knowledge_v2.
Nội dung hoàn toàn được tổng hợp từ 8 hiện vật tiêu biểu đã chốt trong seed,
không bịa thêm bất kỳ thông tin ngoài nào.
"""
import os
import sys

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(CURRENT_DIR)
sys.path.insert(0, BACKEND_DIR)

from dotenv import load_dotenv
load_dotenv(os.path.join(BACKEND_DIR, ".env"))

import chromadb
from services.vector_db import CHROMA_DATA_PATH
from services.embedding import get_embeddings_batch

COLLECTION_NAME = "museum_rag_knowledge_v2"

GUIDE_DOCS = [
    {
        "id": "guide_goi_y_tham_quan_01",
        "title": "Gợi ý tham quan bảo tàng: Ở đây có gì hay để xem và các hiện vật tiêu biểu",
        "content": (
            "Gợi ý tham quan bảo tàng: Ở đây có gì hay để xem và các hiện vật tiêu biểu.\n"
            "Khi đến tham quan bảo tàng, du khách có thể khám phá các hiện vật và bảo vật quốc gia tiêu biểu trải dài qua các thời kỳ lịch sử:\n"
            "1. Trống đồng Ngọc Lũ (Thời kỳ Cổ đại - Văn hóa Đông Sơn, khoảng 2.500 - 2.000 năm trước): Trưng bày tại Tầng 2 · Phòng C · Kệ 02.\n"
            "2. Trống đồng Cảnh Thịnh (Thời kỳ Trung đại - Triều Tây Sơn 1800): Trưng bày tại Tầng 1 · Phòng B · Kệ 01.\n"
            "3. Tác phẩm Đường Kách mệnh (Thời kỳ Cận đại - năm 1927 của Lãnh tụ Nguyễn Ái Quốc): Trưng bày tại Tầng 2 · Phòng B · Kệ 04.\n"
            "4. Đồ dùng sinh hoạt của Lãnh tụ Nguyễn Ái Quốc tại Pác Bó, Cao Bằng (1941): Trưng bày tại Tầng 3 · Phòng B · Kệ 03.\n"
            "5. Bia đàn Nam Giao thời Lê ở Hà Nội (Thời kỳ Trung đại - Triều Lê Trung Hưng 1679): Trưng bày tại Tầng 3 · Phòng D · Kệ 01.\n"
            "6. Cờ 'Đi là chiến thắng, đánh là diệt gọn' của Đoàn 559 (Thời kỳ Hiện đại - năm 1968): Trưng bày tại Tầng 3 · Phòng D · Kệ 03.\n"
            "7. Kỷ vật của Anh hùng liệt sĩ Lê Thị Riêng (Thời kỳ Hiện đại - năm 1968): Trưng bày tại Tầng 2 · Phòng A · Kệ 05.\n"
            "8. Kỷ vật thiêng liêng về thương binh, liệt sĩ: Trưng bày tại Tầng 1 · Phòng A · Kệ 02.\n"
            "Từ khóa không dấu: goi y tham quan o day co gi hay de xem co gi dep lo trinh tham quan bao tang hien vat tieu bieu noi bat"
        ),
        "source": "guide_tour"
    },
    {
        "id": "guide_lo_trinh_kham_pha_02",
        "title": "Lộ trình tham quan bảo tàng theo các thời kỳ lịch sử và vị trí các tầng",
        "content": (
            "Lộ trình tham quan bảo tàng theo các thời kỳ lịch sử và vị trí các tầng.\n"
            "Hướng dẫn lộ trình tham quan cho du khách theo dòng lịch sử và không gian trưng bày:\n"
            "- Tầng 1: Tham quan khu trưng bày Kỷ vật thương binh liệt sĩ (Phòng A · Kệ 02) và Bảo vật quốc gia Trống đồng Cảnh Thịnh thời Tây Sơn (Phòng B · Kệ 01).\n"
            "- Tầng 2: Chiêm ngưỡng Bảo vật quốc gia Trống đồng Ngọc Lũ văn hóa Đông Sơn (Phòng C · Kệ 02), kỷ vật Anh hùng Lê Thị Riêng (Phòng A · Kệ 05), và Bảo vật quốc gia Đường Kách mệnh năm 1927 (Phòng B · Kệ 04).\n"
            "- Tầng 3: Khám phá kỷ vật Pác Bó của Chủ tịch Hồ Chí Minh (Phòng B · Kệ 03), Bia đàn Nam Giao thời Lê (Phòng D · Kệ 01), và Cờ 'Đi là chiến thắng' của Đoàn 559 (Phòng D · Kệ 03).\n"
            "Từ khóa không dấu: lo trinh tham quan bao tang huong dan tham quan nen xem gi o bao tang vi tri cac phong tang 1 tang 2 tang 3"
        ),
        "source": "guide_tour"
    }
]

def add_guides():
    client = chromadb.PersistentClient(path=CHROMA_DATA_PATH)
    col = client.get_collection(COLLECTION_NAME)
    print(f"Collection {COLLECTION_NAME} hiện có {col.count()} chunks.")
    
    texts = [d["content"] for d in GUIDE_DOCS]
    ids = [d["id"] for d in GUIDE_DOCS]
    metas = [{"title": d["title"], "source_table": "guide", "source_file": "guide_tour"} for d in GUIDE_DOCS]
    
    print("Đang embed tài liệu hướng dẫn tham quan...")
    embeddings = get_embeddings_batch(texts)
    
    col.upsert(ids=ids, documents=texts, metadatas=metas, embeddings=embeddings)
    print(f"Đã upsert thành công {len(ids)} tài liệu hướng dẫn vào {COLLECTION_NAME}!")
    print(f"Tổng số chunks sau khi thêm: {col.count()}")

if __name__ == "__main__":
    add_guides()
