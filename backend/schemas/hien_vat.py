"""
Pydantic schemas cho module Hien Vat.
"""

from pydantic import BaseModel, Field
from typing import Optional


# ── Response schemas ───────────────────────────────────────────────────────

class HienVatOut(BaseModel):
    """Schema trả về thông tin 1 hiện vật."""
    id: str
    name: str
    category_id: Optional[str] = None
    category: Optional[str] = None
    culture: Optional[str] = None
    period: Optional[str] = None
    material: Optional[str] = None
    dimensions: Optional[str] = None
    origin: Optional[str] = None
    location: Optional[str] = None
    status: str
    image: Optional[str] = None
    description: Optional[str] = None
    ai_analysis: Optional[str] = None
    date_display: Optional[str] = None
    page_source: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

    model_config = {"from_attributes": True}


# ── Request schemas ────────────────────────────────────────────────────────

class HienVatCreate(BaseModel):
    """Schema tạo hiện vật mới."""
    name: str = Field(..., min_length=1, max_length=500)
    category_id: Optional[str] = None
    category: Optional[str] = None
    culture: Optional[str] = None
    period: Optional[str] = None
    material: Optional[str] = None
    dimensions: Optional[str] = None
    origin: Optional[str] = None
    location: Optional[str] = None
    status: Optional[str] = "Đang trưng bày"
    image: Optional[str] = None
    description: Optional[str] = None
    ai_analysis: Optional[str] = None
    date_display: Optional[str] = None
    page_source: Optional[str] = None


class HienVatUpdate(BaseModel):
    """Schema cập nhật hiện vật."""
    name: Optional[str] = Field(None, min_length=1, max_length=500)
    category_id: Optional[str] = None
    category: Optional[str] = None
    culture: Optional[str] = None
    period: Optional[str] = None
    material: Optional[str] = None
    dimensions: Optional[str] = None
    origin: Optional[str] = None
    location: Optional[str] = None
    status: Optional[str] = None
    image: Optional[str] = None
    description: Optional[str] = None
    ai_analysis: Optional[str] = None
    date_display: Optional[str] = None
    page_source: Optional[str] = None
