"""
Pydantic schemas cho module Users.
Không trả thẳng raw dict từ Supabase — luôn serialize qua schema.
"""

from pydantic import BaseModel, Field, EmailStr
from typing import Optional, Literal
from enum import Enum


# ── Enums ──────────────────────────────────────────────────────────────────

class UserRole(str, Enum):
    admin = "admin"
    staff = "staff"
    visitor = "visitor"


class UserStatus(str, Enum):
    active = "Hoạt động"
    locked = "Tạm khóa"


# ── Response schemas ───────────────────────────────────────────────────────

class UserOut(BaseModel):
    """Schema trả về thông tin 1 người dùng."""
    id: str
    name: str
    email: str
    role: str
    role_label: str
    status: str
    avatar: Optional[str] = None
    joined_at: Optional[str] = None
    auth_user_id: Optional[str] = None

    model_config = {"from_attributes": True}


# ── Request schemas ────────────────────────────────────────────────────────

class UserRoleUpdate(BaseModel):
    """Schema cập nhật role."""
    role: UserRole


class UserStatusUpdate(BaseModel):
    """Schema cập nhật trạng thái tài khoản."""
    status: UserStatus


class UserCreate(BaseModel):
    """Schema tạo hồ sơ người dùng mới (admin tạo từ dashboard)."""
    name: str = Field(..., min_length=1, max_length=200)
    email: str = Field(..., min_length=5, max_length=200)
    role: UserRole = UserRole.visitor
    avatar: Optional[str] = None
