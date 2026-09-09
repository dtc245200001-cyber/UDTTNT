"""
Router quản lý Hiện vật — prefix /api/hien-vat
Yêu cầu quyền admin cho các thao tác ghi (INSERT, UPDATE, DELETE).
"""

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
import uuid

from core.auth import AuthenticatedUser, require_admin
from core.supabase_client import supabase_admin
from schemas.hien_vat import HienVatOut, HienVatCreate, HienVatUpdate
from services.vector_db import vector_db_service
from services.embedding import get_embedding

router = APIRouter(prefix="/api/hien-vat", tags=["Hiện Vật"])


# ── ChromaDB sync helper ────────────────────────────────────────────────────

def _sync_hien_vat_to_chroma(row: dict):
    """Tạo văn bản mô tả và upsert document hiện vật vào ChromaDB."""
    try:
        parts = [f"Tiêu đề: {row.get('name', '')}"]
        parts.append("Phân loại: Hiện vật bảo tàng")
        if row.get('category'): parts.append(f"Danh mục: {row['category']}")
        if row.get('culture'): parts.append(f"Nền văn hóa: {row['culture']}")
        if row.get('period'): parts.append(f"Thời kỳ / Niên đại: {row['period']}")
        if row.get('date_display'): parts.append(f"Niên đại hiển thị: {row['date_display']}")
        if row.get('material'): parts.append(f"Chất liệu: {row['material']}")
        if row.get('origin'): parts.append(f"Nguồn gốc: {row['origin']}")
        if row.get('location'): parts.append(f"Vị trí trưng bày: {row['location']}")
        if row.get('description'): parts.append(f"Mô tả: {row['description']}")
        if row.get('ai_analysis'): parts.append(f"Phân tích chuyên sâu: {row['ai_analysis']}")

        doc_text = "\n".join(parts)
        doc_id = f"hien_vat_{row['id']}"
        metadata = {
            "source_table": "hien_vat",
            "source_id": str(row["id"]),
            "title": str(row.get("name", "")),
            "category": str(row.get("category", "Hiện vật bảo tàng")),
            "period": str(row.get("period", "")),
            "location": str(row.get("location", "")),
        }
        embedding = get_embedding(doc_text)
        vector_db_service.upsert_document(doc_id, doc_text, metadata, embedding)
        print(f"[ChromaDB] Đã upsert hiện vật: {doc_id}")
    except Exception as e:
        print(f"[ChromaDB] Lỗi sync hiện vật {row.get('id')}: {e}")


# ── Helpers ────────────────────────────────────────────────────────────────

def _db_row_to_hien_vat_out(row: dict) -> HienVatOut:
    """Chuyển đổi 1 row từ Supabase thành HienVatOut schema."""
    return HienVatOut(
        id=row["id"],
        name=row.get("name", ""),
        category_id=row.get("category_id"),
        category=row.get("category"),
        culture=row.get("culture"),
        period=row.get("period"),
        material=row.get("material"),
        dimensions=row.get("dimensions"),
        origin=row.get("origin"),
        location=row.get("location"),
        status=row.get("status", "Đang trưng bày"),
        image=row.get("image"),
        description=row.get("description"),
        ai_analysis=row.get("ai_analysis"),
        date_display=row.get("date_display"),
        page_source=row.get("page_source"),
        created_at=row.get("created_at"),
        updated_at=row.get("updated_at"),
    )


# ── Endpoints ──────────────────────────────────────────────────────────────

@router.post("/", response_model=HienVatOut, status_code=status.HTTP_201_CREATED)
async def create_hien_vat(
    payload: HienVatCreate,
    background_tasks: BackgroundTasks,
    admin: AuthenticatedUser = Depends(require_admin),
):
    """Tạo hiện vật mới (chỉ admin). Tự động đồng bộ vào ChromaDB."""
    new_id = f"ART_{uuid.uuid4().hex[:8]}"

    new_hien_vat = payload.model_dump(exclude_unset=True)
    new_hien_vat["id"] = new_id

    result = supabase_admin.table("hien_vat").insert(new_hien_vat).execute()

    if not result.data or len(result.data) == 0:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Không thể tạo hiện vật mới.",
        )

    # Đồng bộ vào ChromaDB ở background (không block response)
    background_tasks.add_task(_sync_hien_vat_to_chroma, result.data[0])
    return _db_row_to_hien_vat_out(result.data[0])


@router.patch("/{hien_vat_id}", response_model=HienVatOut)
async def update_hien_vat(
    hien_vat_id: str,
    payload: HienVatUpdate,
    background_tasks: BackgroundTasks,
    admin: AuthenticatedUser = Depends(require_admin),
):
    """Cập nhật hiện vật (chỉ admin). Tự động đồng bộ lại ChromaDB."""
    update_data = payload.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Không có dữ liệu cập nhật.",
        )

    result = supabase_admin.table("hien_vat").update(update_data).eq("id", hien_vat_id).execute()

    if not result.data or len(result.data) == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Không tìm thấy hiện vật với ID '{hien_vat_id}'.",
        )

    background_tasks.add_task(_sync_hien_vat_to_chroma, result.data[0])
    return _db_row_to_hien_vat_out(result.data[0])


@router.delete("/{hien_vat_id}", status_code=status.HTTP_200_OK)
async def delete_hien_vat(
    hien_vat_id: str,
    background_tasks: BackgroundTasks,
    admin: AuthenticatedUser = Depends(require_admin),
):
    """Xóa hiện vật (chỉ admin). Tự động xóa khỏi ChromaDB."""
    existing = supabase_admin.table("hien_vat").select("id, name").eq("id", hien_vat_id).execute()

    if not existing.data or len(existing.data) == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Không tìm thấy hiện vật với ID '{hien_vat_id}'.",
        )

    target = existing.data[0]
    supabase_admin.table("hien_vat").delete().eq("id", hien_vat_id).execute()

    # Xóa khỏi ChromaDB ở background
    background_tasks.add_task(vector_db_service.delete_document, f"hien_vat_{hien_vat_id}")

    return {
        "success": True,
        "message": f"Đã xóa hiện vật '{target.get('name', hien_vat_id)}'.",
    }
