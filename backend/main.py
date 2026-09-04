import os
import sys
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from dotenv import load_dotenv

# Tải biến môi trường
load_dotenv()

from services.rag import rag_pipeline
from services.vector_db import vector_db_service
from scripts.init_vector_db import load_and_index_all_knowledge

app = FastAPI(
    title="Hệ Thống RAG Chatbot - Bảo Tàng Lịch Sử Quốc Gia Việt Nam",
    description="API cung cấp dịch vụ Trợ lý AI hỏi đáp tri thức di sản, hiện vật và lịch sử bảo tàng ứng dụng kiến trúc RAG.",
    version="1.0.0"
)

# Cấu hình CORS để Frontend React + Vite kết nối mượt mà
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Schema dữ liệu
class ChatRequest(BaseModel):
    message: str = Field(..., description="Nội dung câu hỏi của du khách")
    history: list[dict] = Field(default_factory=list, description="Lịch sử các lượt trò chuyện trước đó")

class ChatResponse(BaseModel):
    answer: str = Field(..., description="Câu trả lời từ Trợ lý AI")
    sources: list[dict] = Field(default_factory=list, description="Danh sách các tài liệu nguồn được RAG tham chiếu")

@app.on_event("startup")
async def startup_event():
    """Tự động kiểm tra và nạp kho tri thức nếu Vector DB còn trống"""
    total_docs = vector_db_service.count()
    print(f"🏛️ [Startup] Vector DB hiện có {total_docs} chunks tài liệu.")
    if total_docs == 0:
        print("🏛️ [Startup] Tiến hành nạp kho tri thức ban đầu vào ChromaDB...")
        load_and_index_all_knowledge()

@app.get("/")
def read_root():
    return {
        "status": "online",
        "service": "Museum AI RAG Backend",
        "version": "1.0.0",
        "docs_url": "/docs"
    }

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "vector_db_chunks": vector_db_service.count(),
        "gemini_configured": bool(os.getenv("GEMINI_API_KEY"))
    }

@app.post("/api/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    """
    Endpoint chính tiếp nhận câu hỏi và lịch sử trò chuyện của người dùng và sinh câu trả lời RAG
    """
    try:
        user_msg = request.message.strip()
        if not user_msg:
            raise HTTPException(status_code=400, detail="Nội dung tin nhắn không được để trống.")

        # Xử lý qua pipeline RAG
        result = rag_pipeline.process_chat(
            user_message=user_msg,
            history=request.history
        )
        return ChatResponse(
            answer=result["answer"],
            sources=result["sources"]
        )
    except Exception as e:
        print(f"❌ [API Error] /api/chat error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
