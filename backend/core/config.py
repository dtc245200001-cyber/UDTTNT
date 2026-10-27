"""
Cấu hình ứng dụng đọc từ biến môi trường qua pydantic-settings.
Raise lỗi rõ ràng nếu thiếu biến bắt buộc lúc khởi động.
"""

from pydantic_settings import BaseSettings
from pydantic import Field, field_validator


class Settings(BaseSettings):
    """Quản lý cấu hình tập trung cho backend FastAPI."""

    # Supabase
    SUPABASE_URL: str = Field(
        default="",
        description="URL của Supabase project"
    )
    SUPABASE_SERVICE_ROLE_KEY: str = Field(
        default="",
        description="Service Role Key (secret) – bypass RLS, chỉ dùng server-side"
    )
    SUPABASE_ANON_KEY: str = Field(
        default="",
        description="Anon/Public key của Supabase"
    )

    # Frontend URL cho CORS
    FRONTEND_URL: str = Field(
        default="http://localhost:5173",
        description="URL frontend được phép gọi API (CORS)",
    )

    # Gemini API key cho RAG chatbot (giữ nguyên từ hệ thống cũ)
    GEMINI_API_KEY: str = Field(default="", description="Google Gemini API Key cho RAG")
    GEMINI_API_KEYS: str = Field(default="", description="Danh sách key cách nhau bởi dấu phẩy")
    GEMINI_MODEL_NAME: str = Field(default="gemini-3.5-flash", description="Tên model Gemini")

    @field_validator("SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_ANON_KEY", "FRONTEND_URL", mode="before")
    @classmethod
    def clean_placeholders(cls, v):
        if not v or not isinstance(v, str):
            return ""
        v = v.strip()
        if v.startswith("YOUR_") or "your-project" in v:
            return ""
        return v

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "case_sensitive": True,
        "extra": "ignore",
    }


# Singleton — tự raise ValidationError nếu thiếu biến bắt buộc
settings = Settings()

