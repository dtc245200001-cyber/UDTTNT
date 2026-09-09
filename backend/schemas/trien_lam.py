"""
Pydantic schemas cho module Trien Lam.
"""

from pydantic import BaseModel, Field
from typing import Optional


# ── Response schemas ───────────────────────────────────────────────────────

class TrienLamOut(BaseModel):
    """Schema trả về thông tin 1 triển lãm."""
    id: str
    name: str
    status: str
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    location: Optional[str] = None
    image: Optional[str] = None
    description: Optional[str] = None
    artifacts_count: Optional[int] = 0
    visitors_count: Optional[int] = 0
    created_at: Optional[str] = None

    model_config = {"from_attributes": True}


# ── Request schemas ────────────────────────────────────────────────────────

class TrienLamCreate(BaseModel):
    """Schema tạo triển lãm mới."""
    name: str = Field(..., min_length=1, max_length=255)
    status: Optional[str] = "Đang diễn ra"
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    location: Optional[str] = None
    image: Optional[str] = None
    description: Optional[str] = None
    artifacts_count: Optional[int] = 0
    visitors_count: Optional[int] = 0


class TrienLamUpdate(BaseModel):
    """Schema cập nhật triển lãm."""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    status: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    location: Optional[str] = None
    image: Optional[str] = None
    description: Optional[str] = None
    artifacts_count: Optional[int] = None
    visitors_count: Optional[int] = None
