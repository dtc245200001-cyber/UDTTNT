"""
FastAPI dependencies xác thực người dùng.
- get_current_user(): verify Bearer token qua Supabase Auth, trả thông tin user đáng tin cậy.
- require_admin(): dependency phụ, chặn nếu role != 'admin'.
"""

from fastapi import Depends, HTTPException, Request, status
from pydantic import BaseModel
from typing import Optional

from core.supabase_client import supabase_admin


class AuthenticatedUser(BaseModel):
    """Thông tin người dùng đã xác thực, gắn vào mỗi request."""
    id: str
    auth_user_id: str
    email: str
    name: str
    role: str
    role_label: str
    status: Optional[str] = "Hoạt động"


async def get_current_user(request: Request) -> AuthenticatedUser:
    """
    FastAPI dependency: Đọc Bearer token từ header, verify qua Supabase Auth,
    sau đó query bảng nguoi_dung bằng service_role client để lấy role thật.
    """
    # 1. Đọc header Authorization
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token xác thực không được cung cấp.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = auth_header.removeprefix("Bearer ").strip()
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token xác thực trống.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 2. Verify token qua Supabase Auth (KHÔNG tự decode JWT thủ công)
    try:
        user_response = supabase_admin.auth.get_user(token)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token không hợp lệ hoặc đã hết hạn: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user_response or not user_response.user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Không thể xác thực người dùng từ token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    auth_user_id = user_response.user.id

    # 3. Query bảng nguoi_dung bằng service_role client để lấy role thật
    result = supabase_admin.table("nguoi_dung").select("*").eq(
        "auth_user_id", auth_user_id
    ).execute()

    if not result.data or len(result.data) == 0:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Người dùng không tồn tại trong hệ thống.",
        )

    db_user = result.data[0]

    # Chuẩn hoá role
    raw_role = str(db_user.get("role", "")).lower()
    if raw_role == "admin" or "quản trị" in raw_role:
        normalized_role = "admin"
    elif raw_role == "staff" or "nhân viên" in raw_role:
        normalized_role = "staff"
    else:
        normalized_role = "visitor"

    role_label = db_user.get("role_label") or (
        "Quản trị viên" if normalized_role == "admin"
        else "Nhân viên" if normalized_role == "staff"
        else "Khách tham quan"
    )

    return AuthenticatedUser(
        id=db_user["id"],
        auth_user_id=auth_user_id,
        email=db_user.get("email", ""),
        name=db_user.get("name", ""),
        role=normalized_role,
        role_label=role_label,
        status=db_user.get("status", "Hoạt động"),
    )


async def require_admin(
    current_user: AuthenticatedUser = Depends(get_current_user),
) -> AuthenticatedUser:
    """Dependency phụ: chặn nếu role != 'admin'."""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không có quyền quản trị để thực hiện thao tác này.",
        )
    return current_user
