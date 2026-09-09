import os
import json
import sys

# === Windows UTF-8 Fix ===
# Uvicorn trên Windows chạy subprocess với codec CP1252 mặc định,
# gây UnicodeEncodeError khi print() chuỗi tiếng Việt.
# Reconfigure stdout/stderr sang UTF-8 để tránh lỗi này.
if sys.stdout.encoding and sys.stdout.encoding.lower() not in ('utf-8', 'utf8'):
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
        sys.stderr.reconfigure(encoding='utf-8', errors='replace')
    except AttributeError:
        pass  # Python < 3.7 không có reconfigure

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from dotenv import load_dotenv

# Tải biến môi trường
load_dotenv()

from core.config import settings
from routers.users import router as users_router
from services.rag import rag_pipeline
from services.vector_db import vector_db_service
from scripts.init_vector_db import load_and_index_all_knowledge

app = FastAPI(
    title="Hệ Thống API Quản Trị & Trợ Lý AI - Bảo Tàng Lịch Sử Quốc Gia Việt Nam",
    description="Core Backend API xử lý các tác vụ nâng cao: Trợ lý AI (RAG Chatbot), Quản trị người dùng và Xác thực bảo mật.",
    version="2.0.0"
)

# Cấu hình CORS — chỉ cho phép domain frontend cụ thể thay vì wildcard
allowed_origins = [
    settings.FRONTEND_URL,
]
# Cho phép cả localhost variants phổ biến khi dev
if "localhost" in settings.FRONTEND_URL:
    allowed_origins.extend([
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ])

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Gắn router
app.include_router(users_router)

from routers.auth import router as auth_router
app.include_router(auth_router)

from routers.hien_vat import router as hien_vat_router
app.include_router(hien_vat_router)

from routers.trien_lam import router as trien_lam_router
app.include_router(trien_lam_router)

# ── Schema dữ liệu ─────────────────────────────────────────────────────────

class ChatRequest(BaseModel):
    message: str = Field(..., description="Nội dung câu hỏi của du khách")
    history: list[dict] = Field(default_factory=list, description="Lịch sử các lượt trò chuyện trước đó")

class ChatResponse(BaseModel):
    answer: str = Field(..., description="Câu trả lời từ Trợ lý AI")
    sources: list[dict] = Field(default_factory=list, description="Danh sách các tài liệu nguồn được RAG tham chiếu")


# ── Startup: Nạp kho tri thức tự động ─────────────────────────────────────

@app.on_event("startup")
async def startup_event():
    """
    Tự động kiểm tra và nạp kho tri thức nếu Vector DB còn trống.
    Thứ tự:
      1. Nạp dữ liệu JSON tĩnh (init_vector_db.py)
      2. Đồng bộ thêm dữ liệu thật từ Supabase (sync_supabase_to_vector_db.py)
    """
    total_docs = vector_db_service.count()
    print(f"🏛️ [Startup] Vector DB hiện có {total_docs} chunks tài liệu.")
    if total_docs == 0:
        print("🏛️ [Startup] Tiến hành nạp kho tri thức ban đầu vào ChromaDB...")
        load_and_index_all_knowledge()

        # Đồng bộ thêm dữ liệu thật từ Supabase
        try:
            from scripts.sync_supabase_to_vector_db import sync_supabase_to_vector_db
            print("🔄 [Startup] Đồng bộ dữ liệu từ Supabase vào ChromaDB...")
            sync_supabase_to_vector_db()
        except Exception as e:
            print(f"⚠️  [Startup] Không thể sync Supabase (có thể chưa có dữ liệu): {e}")


# ── Base endpoints ──────────────────────────────────────────────────────────

@app.get("/")
def read_root():
    return {
        "status": "online",
        "service": "Museum Core Backend API",
        "version": "2.0.0",
        "docs_url": "/docs"
    }

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "vector_db_chunks": vector_db_service.count(),
        "gemini_configured": bool(os.getenv("GEMINI_API_KEY"))
    }


# ── Chat endpoints ──────────────────────────────────────────────────────────

@app.post("/api/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    """
    Endpoint chính (không streaming) — Giữ nguyên để tương thích.
    Hỗ trợ RAG ChromaDB + Function Calling cho dữ liệu real-time.
    """
    try:
        user_msg = request.message.strip()
        if not user_msg:
            raise HTTPException(status_code=400, detail="Nội dung tin nhắn không được để trống.")

        result = await rag_pipeline.process_chat(
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


@app.post("/api/chat/stream")
async def chat_stream_endpoint(request: ChatRequest):
    """
    Endpoint streaming — Trả lời từng phần khi Gemini sinh ra (typing effect).
    Dùng Server-Sent Events (SSE) format.
    Frontend đọc qua fetch() + ReadableStream.
    """
    try:
        user_msg = request.message.strip()
        if not user_msg:
            raise HTTPException(status_code=400, detail="Nội dung tin nhắn không được để trống.")

        async def generate_sse():
            try:
                async for chunk in rag_pipeline.process_chat_stream(
                    user_message=user_msg,
                    history=request.history,
                ):
                    if chunk:
                        # SSE format: "data: <payload>\n\n"
                        payload = json.dumps({"chunk": chunk}, ensure_ascii=False)
                        yield f"data: {payload}\n\n"

                # Gửi event kết thúc
                yield f"data: {json.dumps({'done': True})}\n\n"

            except Exception as e:
                error_payload = json.dumps({"error": str(e)}, ensure_ascii=False)
                yield f"data: {error_payload}\n\n"

        return StreamingResponse(
            generate_sse(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "X-Accel-Buffering": "no",
                "Connection": "keep-alive",
            }
        )
    except Exception as e:
        print(f"❌ [API Error] /api/chat/stream error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ── Admin utilities ─────────────────────────────────────────────────────────

@app.post("/api/admin/sync-rag")
async def sync_rag_endpoint():
    """
    Endpoint để Admin bấm tay đồng bộ lại toàn bộ dữ liệu từ Supabase vào ChromaDB.
    Không cần restart backend.
    """
    try:
        from scripts.sync_supabase_to_vector_db import sync_supabase_to_vector_db
        count = sync_supabase_to_vector_db()
        return {
            "success": True,
            "synced_documents": count,
            "total_chunks": vector_db_service.count(),
            "message": f"Đã đồng bộ {count} documents từ Supabase vào ChromaDB thành công!"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi khi đồng bộ: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
