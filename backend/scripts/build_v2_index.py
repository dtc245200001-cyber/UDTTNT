"""
Build collection V2 (mot lan duy nhat):
  - Doc 342 docs cu tu collection cu (documents + metadatas + ids giu nguyen)
  - Doc Supabase moi nhat (6 bang, gom hien_vat 272)
  - Append ban khong dau vao moi doc (Buoc 3)
  - Embed bang task_type moi (Buoc 1) -> ghi vao collection MOI cosine.
KHONG dung collection cu, KHONG doi code bot.
Chay:  python scripts/build_v2_index.py   (tu backend/)
Dung va bao cao sau khi xong (Buoc 4), do lai o Buoc 5.
"""
import os
import sys

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(CURRENT_DIR)
sys.path.insert(0, BACKEND_DIR)

from dotenv import load_dotenv
load_dotenv(os.path.join(BACKEND_DIR, ".env"))

import chromadb
from services.vector_db import CHROMA_DATA_PATH, vector_db_service
from services.embedding import get_embeddings_batch
from services.text_utils import remove_accents

NEW_COLLECTION = "museum_rag_knowledge_v2"


def append_unaccented(doc_text: str, title: str) -> str:
    """Buoc 3: them ban khong dau cua tieu de vao cuoi doc."""
    no_acc = remove_accents(f"{title or ''}").strip()
    if not no_acc:
        return doc_text
    return f"{doc_text}\nTừ khóa không dấu: {no_acc}"


def main():
    old_col = vector_db_service.collection
    old_data = old_col.get(include=["documents", "metadatas"])
    old_ids, old_docs, old_metas = old_data["ids"], old_data["documents"], old_data["metadatas"]
    print(f"[V2] Doc cu: {len(old_ids)} docs tu '{old_col.name}'.")

    # Supabase moi nhat
    from scripts.sync_supabase_to_vector_db import SYNC_FUNCTIONS
    new_docs, new_metas, new_ids = [], [], []
    for table_name, sync_fn in SYNC_FUNCTIONS.items():
        try:
            items = sync_fn()
            print(f"[V2] [{table_name}] doc duoc {len(items)} ban ghi.")
            for doc_text, metadata, doc_id in items:
                new_docs.append(doc_text)
                new_metas.append(metadata)
                new_ids.append(doc_id)
        except Exception as e:
            print(f"[V2] [{table_name}] bo qua — loi: {e}")

    # Gop: uu tien ban Supabase moi khi trung id
    merged = {}
    for doc_id, doc, meta in zip(old_ids, old_docs, old_metas):
        merged[doc_id] = (doc, meta)
    for doc_id, doc, meta in zip(new_ids, new_docs, new_metas):
        merged[doc_id] = (doc, meta)
    print(f"[V2] Tong sau khi gop (uu tien Supabase): {len(merged)} docs.")

    # Append khong dau
    final_ids, final_docs, final_metas = [], [], []
    for doc_id, (doc, meta) in merged.items():
        title = (meta or {}).get("title", "")
        final_ids.append(doc_id)
        final_docs.append(append_unaccented(doc, title))
        final_metas.append(meta)
    n_nodau = sum(1 for d in final_docs if "Từ khóa không dấu:" in d)
    print(f"[V2] Da append khong dau cho {n_nodau}/{len(final_docs)} docs.")

    # Embed (task_type moi, co retry + tien do trong get_embeddings_batch)
    print("[V2] Bat dau embed (uoc ~7-10 phut)...")
    embeddings = get_embeddings_batch(final_docs)

    # Ghi vao collection MOI (cosine)
    client = chromadb.PersistentClient(path=CHROMA_DATA_PATH)
    try:
        client.delete_collection(NEW_COLLECTION)
        print(f"[V2] Da xoa collection cu cung ten '{NEW_COLLECTION}' (neu co).")
    except Exception:
        pass
    new_col = client.get_or_create_collection(
        name=NEW_COLLECTION,
        metadata={"hnsw:space": "cosine",
                  "description": "RAG V2: task_type + khong dau + hien_vat"},
    )
    BATCH = 100
    for s in range(0, len(final_ids), BATCH):
        e = s + BATCH
        new_col.add(documents=final_docs[s:e], metadatas=final_metas[s:e],
                    ids=final_ids[s:e], embeddings=embeddings[s:e])
        print(f"[V2] Da ghi {min(e, len(final_ids))}/{len(final_ids)}.")
    print(f"[V2] HOAN TAT. Collection '{NEW_COLLECTION}' co {new_col.count()} chunks.")

    # Thong ke theo bang
    from collections import Counter
    c = Counter((m or {}).get("source_table", "?") for m in final_metas)
    print("[V2] Theo bang:", dict(c))


if __name__ == "__main__":
    main()
