import os
import chromadb
from chromadb.config import Settings

# Đường dẫn lưu trữ Vector Database bền vững
CHROMA_DATA_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "chroma_db")
COLLECTION_NAME = "museum_rag_knowledge"

class VectorDBService:
    def __init__(self):
        os.makedirs(CHROMA_DATA_PATH, exist_ok=True)
        self.client = chromadb.PersistentClient(path=CHROMA_DATA_PATH)
        self.collection = self.client.get_or_create_collection(
            name=COLLECTION_NAME,
            metadata={"description": "Kho tri thức RAG Bảo tàng Lịch sử Quốc gia Việt Nam"}
        )

    def count(self) -> int:
        """Đếm số lượng văn bản/chunk đã được lưu trong Vector DB"""
        return self.collection.count()

    def clear(self):
        """Xóa toàn bộ collection để nạp lại dữ liệu mới khi cần"""
        self.client.delete_collection(COLLECTION_NAME)
        self.collection = self.client.get_or_create_collection(
            name=COLLECTION_NAME,
            metadata={"description": "Kho tri thức RAG Bảo tàng Lịch sử Quốc gia Việt Nam"}
        )

    def add_documents(
        self,
        documents: list[str],
        metadatas: list[dict],
        ids: list[str],
        embeddings: list[list[float]] = None
    ):
        """Thêm tài liệu và vector embedding vào ChromaDB"""
        if embeddings and len(embeddings) == len(documents):
            self.collection.add(
                documents=documents,
                metadatas=metadatas,
                ids=ids,
                embeddings=embeddings
            )
        else:
            self.collection.add(
                documents=documents,
                metadatas=metadatas,
                ids=ids
            )

    def query_similar(
        self,
        query_embedding: list[float] = None,
        query_text: str = None,
        n_results: int = 4
    ) -> list[dict]:
        """
        Tìm kiếm các đoạn văn bản tương đồng nhất với câu hỏi của người dùng.
        """
        total_docs = self.count()
        if total_docs == 0:
            return []

        limit = min(n_results, total_docs)

        if query_embedding:
            results = self.collection.query(
                query_embeddings=[query_embedding],
                n_results=limit,
                include=["documents", "metadatas", "distances"]
            )
        elif query_text:
            results = self.collection.query(
                query_texts=[query_text],
                n_results=limit,
                include=["documents", "metadatas", "distances"]
            )
        else:
            return []

        formatted_results = []
        if results and "documents" in results and results["documents"]:
            docs = results["documents"][0]
            metas = results["metadatas"][0] if "metadatas" in results else [{}] * len(docs)
            distances = results["distances"][0] if "distances" in results else [0.0] * len(docs)
            ids = results["ids"][0] if "ids" in results else [""] * len(docs)

            for i in range(len(docs)):
                formatted_results.append({
                    "id": ids[i],
                    "content": docs[i],
                    "metadata": metas[i],
                    "distance": distances[i]
                })

        return formatted_results

# Khởi tạo singleton instance
vector_db_service = VectorDBService()
