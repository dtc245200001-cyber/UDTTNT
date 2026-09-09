"""
Khởi tạo Supabase client DUY NHẤT dùng SERVICE_ROLE_KEY.
Bypass RLS, chỉ sử dụng ở server-side.
KHÔNG BAO GIỜ log ra key này.
"""

from supabase import create_client, Client
from core.config import settings


def _create_admin_client() -> Client:
    """Tạo Supabase client với service_role key (bypass RLS) hoặc anon key."""
    key = settings.SUPABASE_SERVICE_ROLE_KEY or settings.SUPABASE_ANON_KEY
    return create_client(
        supabase_url=settings.SUPABASE_URL,
        supabase_key=key,
    )


# Singleton instance — dùng chung trong toàn bộ backend
supabase_admin: Client = _create_admin_client()
