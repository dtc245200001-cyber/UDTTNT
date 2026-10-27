"""
Khởi tạo Supabase client DUY NHẤT dùng SERVICE_ROLE_KEY.
Bypass RLS, chỉ sử dụng ở server-side.
KHÔNG BAO GIỜ log ra key này.
"""

from typing import Any
from supabase import create_client, Client
from core.config import settings


class DummyQueryBuilder:
    def __init__(self, data=None):
        self._data = data if data is not None else []

    def __getattr__(self, name: str) -> Any:
        return self

    def __call__(self, *args, **kwargs) -> Any:
        return self

    def execute(self, *args, **kwargs) -> Any:
        class DummyResult:
            def __init__(self, data):
                self.data = data
                self.count = len(data)
        return DummyResult(self._data)


class DummySupabaseClient:
    """Mock fallback khi chưa có Supabase URL hoặc Supabase chưa kết nối được."""
    def __init__(self):
        self.is_mock = True

    def table(self, name: str):
        return DummyQueryBuilder([])

    def from_(self, name: str):
        return DummyQueryBuilder([])

    def rpc(self, fn: str, params: dict = None):
        return DummyQueryBuilder([])

    @property
    def auth(self):
        class DummyAuth:
            class DummyAdmin:
                def create_user(self, attributes):
                    class DummyUserObj:
                        id = f"USR-LOCAL-{attributes.get('email', 'user')}"
                    class DummyAuthResponse:
                        user = DummyUserObj()
                    return DummyAuthResponse()
            admin = DummyAdmin()

            def get_user(self, jwt):
                return None
        return DummyAuth()


def _create_admin_client() -> Any:
    """Tạo Supabase client an toàn. Nếu URL/key rỗng hoặc lỗi, fallback về DummyClient."""
    url = (settings.SUPABASE_URL or "").strip()
    key = (settings.SUPABASE_SERVICE_ROLE_KEY or settings.SUPABASE_ANON_KEY or "").strip()

    if not url or not url.startswith("http") or not key:
        print("⚠️  [Supabase] SUPABASE_URL hoặc KEY chưa được cấu hình. Backend đang chạy chế độ Local Fallback.")
        return DummySupabaseClient()

    try:
        client = create_client(supabase_url=url, supabase_key=key)
        return client
    except Exception as e:
        print(f"⚠️  [Supabase] Lỗi khởi tạo Supabase ({e}). Chuyển sang Dummy Client.")
        return DummySupabaseClient()


# Singleton instance — dùng chung trong toàn bộ backend
supabase_admin: Any = _create_admin_client()

