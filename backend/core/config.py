"""
Cấu hình ứng dụng đọc từ biến môi trường qua pydantic-settings.
Raise lỗi rõ ràng nếu thiếu biến bắt buộc lúc khởi động.
"""

from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    """Quản lý cấu hình tập trung cho backend FastAPI."""

    # Supabase
    SUPABASE_URL: str = Field(..., description="URL của Supabase project")
    SUPABASE_SERVICE_ROLE_KEY: str = Field(
        ..., description="Service Role Key (secret) – bypass RLS, chỉ dùng server-side"
    )
    SUPABASE_ANON_KEY: str = Field(..., description="Anon/Public key của Supabase")

    # Frontend URL cho CORS
    FRONTEND_URL: str = Field(
        default="http://localhost:5173",
        description="URL frontend được phép gọi API (CORS)",
    )

    # Gemini API key cho RAG chatbot (giữ nguyên từ hệ thống cũ)
    GEMINI_API_KEY: str = Field(default="", description="Google Gemini API Key cho RAG")
    GEMINI_MODEL_NAME: str = Field(default="gemini-3.5-flash", description="Tên model Gemini")

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "case_sensitive": True,
        "extra": "ignore",
    }


# Singleton — tự raise ValidationError nếu thiếu biến bắt buộc
settings = Settings()
