"""
Router quản lý người dùng — prefix /api/users
Tất cả endpoint yêu cầu quyền admin.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from typing import List

from core.auth import AuthenticatedUser, require_admin
from core.supabase_client import supabase_admin
from schemas.users import UserOut, UserRoleUpdate, UserStatusUpdate, UserCreate

router = APIRouter(prefix="/api/users", tags=["Users"])


# ── Helpers ────────────────────────────────────────────────────────────────

def _normalize_role(raw_role: str, email: str = "") -> str:
    """Chuẩn hoá role từ database."""
    role = raw_role.lower() if raw_role else "visitor"
    if role == "admin" or "quản trị" in role or email.lower() == "admin@gmail.com":
        return "admin"
    if role == "staff" or "nhân viên" in role:
        return "staff"
    return "visitor"


def _get_role_label(role: str) -> str:
    """Trả về nhãn tiếng Việt cho role."""
    return {
        "admin": "Quản trị viên",
        "staff": "Nhân viên",
        "visitor": "Khách tham quan",
    }.get(role, "Khách tham quan")


def _db_row_to_user_out(row: dict) -> UserOut:
    """Chuyển đổi 1 row từ Supabase thành UserOut schema."""
    normalized_role = _normalize_role(row.get("role", ""), row.get("email", ""))
    return UserOut(
        id=row["id"],
        name=row.get("name", ""),
        email=row.get("email", ""),
        role=normalized_role,
        role_label=row.get("role_label") or _get_role_label(normalized_role),
        status=row.get("status", "Hoạt động"),
        avatar=row.get("avatar"),
        joined_at=row.get("joined_at"),
        auth_user_id=row.get("auth_user_id"),
    )


# ── Endpoints ──────────────────────────────────────────────────────────────

@router.get("/", response_model=List[UserOut])
async def list_users(
    admin: AuthenticatedUser = Depends(require_admin),
):
    """Lấy toàn bộ danh sách người dùng (chỉ admin)."""
    result = supabase_admin.table("nguoi_dung").select("*").order(
        "joined_at", desc=True
    ).execute()

    if not result.data:
        return []

    return [_db_row_to_user_out(row) for row in result.data]


@router.post("/", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def create_user(
    payload: UserCreate,
    admin: AuthenticatedUser = Depends(require_admin),
):
    """Tạo hồ sơ người dùng mới (admin tạo từ dashboard)."""
    from datetime import date

    role_label = _get_role_label(payload.role.value)

    # Kiểm tra email trùng
    existing = supabase_admin.table("nguoi_dung").select("id").eq(
        "email", payload.email.strip().lower()
    ).execute()

    if existing.data and len(existing.data) > 0:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Email '{payload.email}' đã tồn tại trong hệ thống.",
        )

    # Sinh ID duy nhất
    import uuid
    new_id = f"USR_{uuid.uuid4().hex[:8]}"

    new_user = {
        "id": new_id,
        "name": payload.name.strip(),
        "email": payload.email.strip().lower(),
        "role": payload.role.value,
        "role_label": role_label,
        "status": "Hoạt động",
        "avatar": payload.avatar or "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150",
        "joined_at": date.today().isoformat(),
    }

    result = supabase_admin.table("nguoi_dung").insert(new_user).execute()

    if not result.data or len(result.data) == 0:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Không thể tạo hồ sơ người dùng.",
        )

    return _db_row_to_user_out(result.data[0])


@router.patch("/{user_id}/role", response_model=UserOut)
async def update_user_role(
    user_id: str,
    payload: UserRoleUpdate,
    admin: AuthenticatedUser = Depends(require_admin),
):
    """Đổi role người dùng. CHẶN CỨNG: không cho tự đổi role chính mình."""
    # Chặn cứng: không cho admin tự đổi role chính mình
    if user_id == admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Không được phép tự thay đổi quyền của chính mình.",
        )

    new_role = payload.role.value
    role_label = _get_role_label(new_role)

    result = supabase_admin.table("nguoi_dung").update(
        {"role": new_role, "role_label": role_label}
    ).eq("id", user_id).execute()

    if not result.data or len(result.data) == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Không tìm thấy người dùng với ID '{user_id}'.",
        )

    return _db_row_to_user_out(result.data[0])


@router.patch("/{user_id}/status", response_model=UserOut)
async def update_user_status(
    user_id: str,
    payload: UserStatusUpdate,
    admin: AuthenticatedUser = Depends(require_admin),
):
    """Khoá/mở khoá tài khoản người dùng."""
    result = supabase_admin.table("nguoi_dung").update(
        {"status": payload.status.value}
    ).eq("id", user_id).execute()

    if not result.data or len(result.data) == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Không tìm thấy người dùng với ID '{user_id}'.",
        )

    return _db_row_to_user_out(result.data[0])


@router.delete("/{user_id}", status_code=status.HTTP_200_OK)
async def delete_user(
    user_id: str,
    admin: AuthenticatedUser = Depends(require_admin),
):
    """Xoá người dùng. CHẶN CỨNG: không cho xoá chính mình."""
    # Chặn cứng: không cho admin xoá chính mình
    if user_id == admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Không được phép xoá tài khoản của chính mình.",
        )

    # Kiểm tra user tồn tại
    existing = supabase_admin.table("nguoi_dung").select("id, name, email").eq(
        "id", user_id
    ).execute()

    if not existing.data or len(existing.data) == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Không tìm thấy người dùng với ID '{user_id}'.",
        )

    target = existing.data[0]

    supabase_admin.table("nguoi_dung").delete().eq("id", user_id).execute()

    return {
        "success": True,
        "message": f"Đã xoá người dùng '{target.get('name', user_id)}' ({target.get('email', '')}).",
    }
