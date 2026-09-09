"""
Router quản lý Triển lãm — prefix /api/trien-lam
Yêu cầu quyền admin cho các thao tác ghi (INSERT, UPDATE, DELETE).
"""

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
import uuid

from core.auth import AuthenticatedUser, require_admin
from core.supabase_client import supabase_admin
from schemas.trien_lam import TrienLamOut, TrienLamCreate, TrienLamUpdate
from services.vector_db import vector_db_service
from services.embedding import get_embedding

router = APIRouter(prefix="/api/trien-lam", tags=["Triển Lãm"])


# ── ChromaDB sync helper ────────────────────────────────────────────────────

def _sync_trien_lam_to_chroma(row: dict):
    """Tạo văn bản mô tả và upsert document triển lãm vào ChromaDB."""
    try:
        parts = [f"Tiêu đề: {row.get('name', '')}"]
        parts.append("Phân loại: Triển lãm")
        if row.get('status'): parts.append(f"Trạng thái: {row['status']}")
        if row.get('start_date'): parts.append(f"Ngày bắt đầu: {row['start_date']}")
        if row.get('end_date'): parts.append(f"Ngày kết thúc: {row['end_date']}")
        if row.get('location'): parts.append(f"Địa điểm: {row['location']}")
        if row.get('description'): parts.append(f"Mô tả: {row['description']}")

        doc_text = "\n".join(parts)
        doc_id = f"trien_lam_{row['id']}"
        metadata = {
            "source_table": "trien_lam",
            "source_id": str(row["id"]),
            "title": str(row.get("name", "")),
            "category": "Triển lãm",
            "period": "",
            "location": str(row.get("location", "")),
        }
        embedding = get_embedding(doc_text)
        vector_db_service.upsert_document(doc_id, doc_text, metadata, embedding)
        print(f"[ChromaDB] Đã upsert triển lãm: {doc_id}")
    except Exception as e:
        print(f"[ChromaDB] Lỗi sync triển lãm {row.get('id')}: {e}")


# ── Helpers ────────────────────────────────────────────────────────────────

def _db_row_to_trien_lam_out(row: dict) -> TrienLamOut:
    """Chuyển đổi 1 row từ Supabase thành TrienLamOut schema."""
    return TrienLamOut(
        id=row["id"],
        name=row.get("name", ""),
        status=row.get("status", "Đang diễn ra"),
        start_date=row.get("start_date"),
        end_date=row.get("end_date"),
        location=row.get("location"),
        image=row.get("image"),
        description=row.get("description"),
        artifacts_count=row.get("artifacts_count", 0),
        visitors_count=row.get("visitors_count", 0),
        created_at=row.get("created_at"),
    )


# ── Endpoints ──────────────────────────────────────────────────────────────

@router.post("/", response_model=TrienLamOut, status_code=status.HTTP_201_CREATED)
async def create_trien_lam(
    payload: TrienLamCreate,
    background_tasks: BackgroundTasks,
    admin: AuthenticatedUser = Depends(require_admin),
):
    """Tạo triển lãm mới (chỉ admin). Tự động đồng bộ vào ChromaDB."""
    new_id = f"EXB_{uuid.uuid4().hex[:8]}"

    new_trien_lam = payload.model_dump(exclude_unset=True)
    new_trien_lam["id"] = new_id

    result = supabase_admin.table("trien_lam").insert(new_trien_lam).execute()

    if not result.data or len(result.data) == 0:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Không thể tạo triển lãm mới.",
        )

    background_tasks.add_task(_sync_trien_lam_to_chroma, result.data[0])
    return _db_row_to_trien_lam_out(result.data[0])


@router.patch("/{trien_lam_id}", response_model=TrienLamOut)
async def update_trien_lam(
    trien_lam_id: str,
    payload: TrienLamUpdate,
    background_tasks: BackgroundTasks,
    admin: AuthenticatedUser = Depends(require_admin),
):
    """Cập nhật triển lãm (chỉ admin). Tự động đồng bộ lại ChromaDB."""
    update_data = payload.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Không có dữ liệu cập nhật.",
        )

    result = supabase_admin.table("trien_lam").update(update_data).eq("id", trien_lam_id).execute()

    if not result.data or len(result.data) == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Không tìm thấy triển lãm với ID '{trien_lam_id}'.",
        )

    background_tasks.add_task(_sync_trien_lam_to_chroma, result.data[0])
    return _db_row_to_trien_lam_out(result.data[0])


@router.delete("/{trien_lam_id}", status_code=status.HTTP_200_OK)
async def delete_trien_lam(
    trien_lam_id: str,
    background_tasks: BackgroundTasks,
    admin: AuthenticatedUser = Depends(require_admin),
):
    """Xóa triển lãm (chỉ admin). Tự động xóa khỏi ChromaDB."""
    existing = supabase_admin.table("trien_lam").select("id, name").eq("id", trien_lam_id).execute()

    if not existing.data or len(existing.data) == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Không tìm thấy triển lãm với ID '{trien_lam_id}'.",
        )

    target = existing.data[0]
    supabase_admin.table("trien_lam").delete().eq("id", trien_lam_id).execute()

    background_tasks.add_task(vector_db_service.delete_document, f"trien_lam_{trien_lam_id}")

    return {
        "success": True,
        "message": f"Đã xóa triển lãm '{target.get('name', trien_lam_id)}'.",
    }
