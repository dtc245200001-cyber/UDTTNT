"""
Cấu hình ứng dụng đọc từ biến môi trường qua pydantic-settings.
Raise lỗi rõ ràng nếu thiếu biến bắt buộc lúc khởi động.
"""

from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    """Quản lý cấu hình tập trung cho backend FastAPI."""

    # Supabase
    SUPABASE_URL: str = Field(
        default="https://yzscfptnwecjutaobyzm.supabase.co",
        description="URL của Supabase project"
    )
    SUPABASE_SERVICE_ROLE_KEY: str = Field(
        default="",
        description="Service Role Key (secret) – bypass RLS, chỉ dùng server-side"
    )
    SUPABASE_ANON_KEY: str = Field(
        default="sb_publishable_K2RJ1sdrokVsKi8x30_H1g__eESi7UN",
        description="Anon/Public key của Supabase"
    )

    # Frontend URL cho CORS
    FRONTEND_URL: str = Field(
        default="http://localhost:5173",
        description="URL frontend được phép gọi API (CORS)",
    )

    # Gemini API key cho RAG chatbot (giữ nguyên từ hệ thống cũ)
    GEMINI_API_KEY: str = Field(default="", description="Google Gemini API Key cho RAG")
    # NGUỒN CẤU HÌNH MODEL DUY NHẤT — services/gemini.py đọc từ đây, không os.getenv riêng
    GEMINI_MODEL_NAME: str = Field(default="gemini-3.5-flash", description="Model Gemini chính")
    GEMINI_FALLBACK_MODELS: str = Field(
        default="gemini-2.5-flash,gemini-2.5-flash-lite",
        description="Các model dự phòng, cách nhau bằng dấu phẩy",
    )

    # ── Timeout / retry / circuit breaker / hedge (Nhóm B) ──
    LLM_CALL_TIMEOUT_S: float = Field(default=15.0, description="Timeout mỗi lượt gọi LLM non-stream")
    LLM_FIRST_TOKEN_TIMEOUT_S: float = Field(default=6.0, description="Timeout chờ token đầu tiên khi stream")
    LLM_503_MAX_RETRIES: int = Field(default=1, description="Số lần retry khi 503 mỗi (model, key)")
    LLM_TOTAL_BUDGET_S: float = Field(default=30.0, description="Trần tổng thời gian thử mọi (model, key) cho 1 request")
    CIRCUIT_FAIL_THRESHOLD: int = Field(default=3, description="Số lỗi liên tiếp để đánh dấu (model, key) unhealthy")
    CIRCUIT_COOLDOWN_S: float = Field(default=120.0, description="Thời gian bỏ qua (model, key) unhealthy")
    HEDGE_DELAY_S: float = Field(default=3.0, description="Chờ token đầu bao lâu trước khi gọi song song dự phòng")
    STREAM_STATUS_DELAY_S: float = Field(default=3.0, description="Chờ bao lâu thì báo trạng thái đang xử lý khi stream")

    # ── RAG (Nhóm B/D) ──
    RAG_DISTANCE_THRESHOLD: float = Field(default=0.85, description="Ngưỡng distance ChromaDB (D: chờ duyệt mới đổi)")
    RAG_MAX_CONTEXT_CHARS: int = Field(default=4000, description="Trần độ dài context RAG nạp vào prompt")
    RAG_MAX_CHUNK_CHARS: int = Field(default=1200, description="Trần độ dài mỗi chunk RAG")

    # ── Cache (Nhóm B) ──
    EMBED_CACHE_SIZE: int = Field(default=500, description="Số vector embedding câu hỏi lưu cache")
    ANSWER_CACHE_SIZE: int = Field(default=200, description="Số câu trả lời tĩnh lưu cache")
    ANSWER_CACHE_TTL_S: float = Field(default=600.0, description="TTL cache câu trả lời (giây)")

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "case_sensitive": True,
        "extra": "ignore",
    }


# Singleton — tự raise ValidationError nếu thiếu biến bắt buộc
settings = Settings()
