import sqlite3
import sys

# Fix encoding for Windows terminal
sys.stdout.reconfigure(encoding='utf-8')

conn = sqlite3.connect('./data/chroma_db/chroma.sqlite3')
c = conn.cursor()

# Count embeddings
c.execute("SELECT COUNT(*) FROM embeddings")
total = c.fetchone()[0]
print(f"=== TONG SO DOCUMENTS TRONG CHROMADB: {total} ===")

# Get collection info
c.execute("SELECT id, name FROM collections")
cols = c.fetchall()
print("\n=== COLLECTION ===")
for col_id, col_name in cols:
    print(f"  - '{col_name}' (ID: {col_id})")

# Get all distinct metadata keys
c.execute("SELECT DISTINCT key FROM embedding_metadata")
keys = [r[0] for r in c.fetchall()]
print(f"\n=== METADATA KEYS: {keys} ===")

# Get document samples
if "document" in keys:
    print("\n=== 10 DOCUMENTS MAU ===")
    c.execute("SELECT id, string_value FROM embedding_metadata WHERE key='document' LIMIT 10")
    docs = c.fetchall()
    for i, (eid, doc) in enumerate(docs):
        print(f"\n[{i+1}] {doc[:400]}")
        print("-" * 70)
else:
    # Show raw metadata samples
    print("\n=== RAW METADATA (10 rows) ===")
    c.execute("SELECT id, key, string_value FROM embedding_metadata LIMIT 30")
    rows = c.fetchall()
    for row in rows:
        val = (row[2] or "")[:200]
        print(f"  ID={row[0]} | key={row[1]} | val={val}")

# Get source types
if "source" in keys:
    c.execute("SELECT DISTINCT string_value FROM embedding_metadata WHERE key='source'")
    sources = [r[0] for r in c.fetchall()]
    print(f"\n=== NGUON DU LIEU (source): ===")
    for s in sources:
        print(f"  - {s}")

if "type" in keys:
    c.execute("SELECT string_value, COUNT(*) FROM embedding_metadata WHERE key='type' GROUP BY string_value")
    types = c.fetchall()
    print(f"\n=== PHAN LOAI DOCUMENT (type): ===")
    for t, cnt in types:
        print(f"  - '{t}': {cnt} documents")

conn.close()
