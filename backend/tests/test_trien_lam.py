"""
Test suite cho module Trien Lam API.
"""

import sys
import pytest
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient

# ── Mock các module nặng không liên quan ───────────
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
mock_settings.SUPABASE_SERVICE_ROLE_KEY = "fake"
mock_settings.SUPABASE_ANON_KEY = "fake"
mock_settings.FRONTEND_URL = "http://localhost:5173"
mock_settings.GEMINI_API_KEY = ""

mock_config_module = MagicMock()
mock_config_module.settings = mock_settings
sys.modules["core.config"] = mock_config_module

# Bây giờ import main
from core.auth import AuthenticatedUser, get_current_user
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

TRIEN_LAM_ROW = {
    "id": "EXB_12345678",
    "name": "Triển lãm Test",
    "status": "Đang diễn ra",
}


# ── Tests ─────────────────────────────────────────────────────────

def test_visitor_create_trien_lam_returns_403():
    """Token visitor gọi POST trien-lam → 403 Forbidden."""
    async def override_get_current_user():
        return VISITOR_USER

    app.dependency_overrides[get_current_user] = override_get_current_user

    try:
        client = TestClient(app)
        response = client.post("/api/trien-lam/", json={"name": "Test"})
        assert response.status_code == 403
    finally:
        app.dependency_overrides.pop(get_current_user, None)


def test_admin_create_trien_lam_returns_201():
    """Admin gọi POST trien-lam → 201 Created."""
    async def override_get_current_user():
        return ADMIN_USER

    app.dependency_overrides[get_current_user] = override_get_current_user

    mock_result = MagicMock()
    mock_result.data = [TRIEN_LAM_ROW]

    mock_insert = MagicMock()
    mock_insert.execute = MagicMock(return_value=mock_result)

    mock_table = MagicMock()
    mock_table.insert = MagicMock(return_value=mock_insert)

    with patch("routers.trien_lam.supabase_admin") as patched_sb:
        patched_sb.table = MagicMock(return_value=mock_table)

        try:
            client = TestClient(app)
            response = client.post("/api/trien-lam/", json={"name": "Triển lãm Test"})
            assert response.status_code == 201
            assert response.json()["name"] == "Triển lãm Test"
        finally:
            app.dependency_overrides.pop(get_current_user, None)
