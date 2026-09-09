"""
Test suite cho module Users API.
- Test 1: Gọi GET /api/users không có token → 401
- Test 2: Token user thường gọi PATCH role → 403
- Test 3: Admin đổi role người khác → 200

Sử dụng FastAPI dependency_overrides để tránh mock phức tạp ở module-level.
"""

import sys
import pytest
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient

# ── Mock các module nặng không liên quan (RAG, vector DB) ───────────
# Phải mock TRƯỚC khi import main.py
sys.modules["services.rag"] = MagicMock()
sys.modules["services.vector_db"] = MagicMock()
sys.modules["scripts.init_vector_db"] = MagicMock()

# Mock supabase_client module-level client creation
mock_supabase_admin = MagicMock()
mock_supabase_module = MagicMock()
mock_supabase_module.supabase_admin = mock_supabase_admin
sys.modules["core.supabase_client"] = mock_supabase_module

# Mock core.config
mock_settings = MagicMock()
mock_settings.SUPABASE_URL = "https://test.supabase.co"
mock_settings.SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlc3QiLCJyb2xlIjoic2VydmljZV9yb2xlIn0.fake"
mock_settings.SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlc3QiLCJyb2xlIjoiYW5vbiJ9.fake"
mock_settings.FRONTEND_URL = "http://localhost:5173"
mock_settings.GEMINI_API_KEY = ""

mock_config_module = MagicMock()
mock_config_module.settings = mock_settings
sys.modules["core.config"] = mock_config_module

# Bây giờ import main — sẽ dùng các mock ở trên
from core.auth import AuthenticatedUser, get_current_user, require_admin
from main import app

# ── Dữ liệu test ──────────────────────────────────────────────────

ADMIN_USER = AuthenticatedUser(
    id="USR000",
    auth_user_id="auth-admin-uuid-123",
    email="admin@gmail.com",
    name="Admin User",
    role="admin",
    role_label="Quản trị viên",
    status="Hoạt động",
)

VISITOR_USER = AuthenticatedUser(
    id="USR004",
    auth_user_id="auth-visitor-uuid-456",
    email="visitor@gmail.com",
    name="Visitor User",
    role="visitor",
    role_label="Khách tham quan",
    status="Hoạt động",
)

VISITOR_DB_ROW = {
    "id": "USR004",
    "auth_user_id": "auth-visitor-uuid-456",
    "name": "Visitor User",
    "email": "visitor@gmail.com",
    "role": "visitor",
    "role_label": "Khách tham quan",
    "status": "Hoạt động",
    "avatar": None,
    "joined_at": "2024-05-01",
}


# ── Test 1: Không có token → 401 ────────────────────────────────────

def test_no_token_returns_401():
    """Gọi GET /api/users mà không gửi token → phải trả 401."""
    # Không override dependency → get_current_user sẽ đọc header và fail
    client = TestClient(app)
    response = client.get("/api/users")
    assert response.status_code == 401
    assert "token" in response.json()["detail"].lower() or "xác thực" in response.json()["detail"].lower()


# ── Test 2: Token visitor gọi PATCH role → 403 ─────────────────────

def test_visitor_patch_role_returns_403():
    """Token của user visitor gọi PATCH role → 403 Forbidden."""
    # Override get_current_user → trả về visitor (bỏ qua verify token thật)
    async def override_get_current_user():
        return VISITOR_USER

    app.dependency_overrides[get_current_user] = override_get_current_user

    try:
        client = TestClient(app)
        response = client.patch(
            "/api/users/USR000/role",
            json={"role": "staff"},
        )
        assert response.status_code == 403
        assert "quyền" in response.json()["detail"].lower() or "quản trị" in response.json()["detail"].lower()
    finally:
        app.dependency_overrides.pop(get_current_user, None)


# ── Test 3: Admin đổi role người khác → 200 ─────────────────────────

def test_admin_change_other_role_returns_200():
    """Admin đổi role user khác → 200 OK."""
    # Override get_current_user → trả về admin
    async def override_get_current_user():
        return ADMIN_USER

    app.dependency_overrides[get_current_user] = override_get_current_user

    # Mock supabase_admin.table("nguoi_dung").update().eq().execute()
    updated_row = {**VISITOR_DB_ROW, "role": "staff", "role_label": "Nhân viên"}
    mock_result = MagicMock()
    mock_result.data = [updated_row]

    mock_eq = MagicMock()
    mock_eq.execute = MagicMock(return_value=mock_result)

    mock_update = MagicMock()
    mock_update.eq = MagicMock(return_value=mock_eq)

    mock_table = MagicMock()
    mock_table.update = MagicMock(return_value=mock_update)

    # Patch supabase_admin trong routers.users
    with patch("routers.users.supabase_admin") as patched_sb:
        patched_sb.table = MagicMock(return_value=mock_table)

        try:
            client = TestClient(app)
            response = client.patch(
                f"/api/users/{VISITOR_DB_ROW['id']}/role",
                json={"role": "staff"},
            )
            assert response.status_code == 200
            data = response.json()
            assert data["role"] == "staff"
            assert data["role_label"] == "Nhân viên"
        finally:
            app.dependency_overrides.pop(get_current_user, None)
