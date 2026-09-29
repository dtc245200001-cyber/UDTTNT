from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional, Any
from services.vector_db import vector_db_service
from services.embedding import get_embeddings_batch

router = APIRouter(
    prefix="/api/webhooks",
    tags=["Webhooks"]
)

class WebhookPayload(BaseModel):
    type: str
    table: str
    record: Optional[dict[str, Any]] = None
    old_record: Optional[dict[str, Any]] = None

# --- Định dạng Document tương tự sync_supabase_to_vector_db.py ---

def format_hien_vat(row: dict) -> tuple[str, dict]:
    parts = [f"Tiêu đề: {row.get('name', '')}"]
    parts.append("Phân loại: Hiện vật bảo tàng")
    if row.get('category'): parts.append(f"Danh mục: {row['category']}")
    if row.get('culture'): parts.append(f"Nền văn hóa: {row['culture']}")
    if row.get('period'): parts.append(f"Thời kỳ / Niên đại: {row['period']}")
    if row.get('date_display'): parts.append(f"Niên đại hiển thị: {row['date_display']}")
    if row.get('material'): parts.append(f"Chất liệu: {row['material']}")
    if row.get('dimensions'): parts.append(f"Kích thước: {row['dimensions']}")
    if row.get('origin'): parts.append(f"Nguồn gốc / Nơi khai quật: {row['origin']}")
    if row.get('location'): parts.append(f"Vị trí trưng bày: {row['location']}")
    if row.get('status'): parts.append(f"Trạng thái: {row['status']}")
    if row.get('description'): parts.append(f"Mô tả: {row['description']}")
    if row.get('ai_analysis'): parts.append(f"Phân tích chuyên sâu: {row['ai_analysis']}")

    metadata = {
        "source_table": "hien_vat",
        "source_id": str(row.get("id")),
        "title": str(row.get("name", "")),
        "category": str(row.get("category", "Hiện vật bảo tàng")),
        "period": str(row.get("period", "")),
        "location": str(row.get("location", "")),
    }
    return "\n".join(parts), metadata


def format_trien_lam(row: dict) -> tuple[str, dict]:
    parts = [f"Tiêu đề: {row.get('name', '')}"]
    parts.append("Phân loại: Triển lãm")
    if row.get('status'): parts.append(f"Trạng thái: {row['status']}")
    if row.get('start_date'): parts.append(f"Ngày bắt đầu: {row['start_date']}")
    if row.get('end_date'): parts.append(f"Ngày kết thúc: {row['end_date']}")
    if row.get('location'): parts.append(f"Địa điểm: {row['location']}")
    if row.get('description'): parts.append(f"Mô tả: {row['description']}")

    metadata = {
        "source_table": "trien_lam",
        "source_id": str(row.get("id")),
        "title": str(row.get("name", "")),
        "category": "Triển lãm",
        "period": "",
        "location": str(row.get("location", "")),
    }
    return "\n".join(parts), metadata


def format_su_kien(row: dict) -> tuple[str, dict]:
    parts = [f"Tiêu đề: {row.get('title', '')}"]
    parts.append("Phân loại: Sự kiện bảo tàng")
    if row.get('date'): parts.append(f"Ngày diễn ra: {row['date']}")
    if row.get('time'): parts.append(f"Giờ: {row['time']}")
    if row.get('location'): parts.append(f"Địa điểm: {row['location']}")
    if row.get('speaker'): parts.append(f"Diễn giả / Chủ trì: {row['speaker']}")
    if row.get('status'): parts.append(f"Trạng thái: {row['status']}")
    if row.get('seats') is not None:
        remaining = row.get('seats', 0) - row.get('registered', 0)
        parts.append(f"Số chỗ còn lại: {remaining}/{row['seats']}")
    if row.get('description'): parts.append(f"Mô tả: {row['description']}")

    metadata = {
        "source_table": "su_kien",
        "source_id": str(row.get("id")),
        "title": str(row.get("title", "")),
        "category": "Sự kiện",
        "period": str(row.get("date", "")),
        "location": str(row.get("location", "")),
    }
    return "\n".join(parts), metadata


def format_phong_trung_bay(row: dict) -> tuple[str, dict]:
    parts = [f"Tiêu đề: {row.get('name', '')}"]
    parts.append("Phân loại: Phòng trưng bày")
    if row.get('floor'): parts.append(f"Tầng / Vị trí: {row['floor']}")
    if row.get('description'): parts.append(f"Mô tả: {row['description']}")

    metadata = {
        "source_table": "phong_trung_bay",
        "source_id": str(row.get("id")),
        "title": str(row.get("name", "")),
        "category": "Phòng trưng bày",
        "period": "",
        "location": str(row.get("floor", "")),
    }
    return "\n".join(parts), metadata


def format_danh_muc(row: dict) -> tuple[str, dict]:
    parts = [f"Tiêu đề: Danh mục {row.get('name', '')}"]
    parts.append("Phân loại: Danh mục hiện vật")
    if row.get('count') is not None: parts.append(f"Số hiện vật: {row['count']}")
    if row.get('description'): parts.append(f"Mô tả: {row['description']}")

    metadata = {
        "source_table": "danh_muc",
        "source_id": str(row.get("id")),
        "title": str(row.get("name", "")),
        "category": "Danh mục",
        "period": "",
        "location": "",
    }
    return "\n".join(parts), metadata


def format_bai_viet(row: dict) -> tuple[str, dict]:
    parts = [f"Tiêu đề: {row.get('title', '')}"]
    parts.append("Phân loại: Bài viết bảo tàng")
    if row.get('author'): parts.append(f"Tác giả: {row['author']}")
    if row.get('category'): parts.append(f"Chủ đề: {row['category']}")
    if row.get('date'): parts.append(f"Ngày đăng: {row['date']}")
    if row.get('content'):
        summary = str(row['content'])[:1000]
        parts.append(f"Nội dung: {summary}")

    metadata = {
        "source_table": "bai_viet",
        "source_id": str(row.get("id")),
        "title": str(row.get("title", "")),
        "category": str(row.get("category", "Bài viết")),
        "period": str(row.get("date", "")),
        "location": "",
    }
    return "\n".join(parts), metadata


FORMATTERS = {
    "hien_vat": format_hien_vat,
    "trien_lam": format_trien_lam,
    "su_kien": format_su_kien,
    "phong_trung_bay": format_phong_trung_bay,
    "danh_muc": format_danh_muc,
    "bai_viet": format_bai_viet,
}

@router.post("/supabase")
async def supabase_webhook(payload: WebhookPayload):
    """
    Endpoint nhận Webhook từ Supabase mỗi khi có thay đổi trên Database.
    Hỗ trợ tự động cập nhật vào ChromaDB.
    """
    table = payload.table
    action = payload.type

    # Bỏ qua nếu bảng không liên quan đến RAG
    if table not in FORMATTERS:
        return {"status": "ignored", "message": f"Table {table} not indexed in RAG"}

    try:
        if action == "DELETE":
            if not payload.old_record or "id" not in payload.old_record:
                raise HTTPException(status_code=400, detail="Missing old_record or id in DELETE payload")
            
            doc_id = f"{table}_{payload.old_record['id']}"
            vector_db_service.delete_document(doc_id)
            print(f"🗑️ [Webhook] Deleted {doc_id} from ChromaDB")
            
            return {"status": "success", "action": "delete", "doc_id": doc_id}

        elif action in ["INSERT", "UPDATE"]:
            if not payload.record or "id" not in payload.record:
                raise HTTPException(status_code=400, detail="Missing record or id in payload")
            
            # Format dữ liệu
            formatter = FORMATTERS[table]
            doc_text, metadata = formatter(payload.record)
            doc_id = f"{table}_{payload.record['id']}"

            # Nhúng vector
            embeddings = get_embeddings_batch([doc_text])
            if not embeddings or len(embeddings) == 0:
                raise HTTPException(status_code=500, detail="Failed to generate embedding")
            
            # Upsert vào ChromaDB
            vector_db_service.upsert_document(
                doc_id=doc_id,
                document=doc_text,
                metadata=metadata,
                embedding=embeddings[0]
            )
            print(f"✅ [Webhook] Upserted {doc_id} to ChromaDB ({action})")
            
            return {"status": "success", "action": action.lower(), "doc_id": doc_id}

        else:
            return {"status": "ignored", "message": f"Action {action} not supported"}

    except Exception as e:
        print(f"❌ [Webhook] Error processing payload: {e}")
        raise HTTPException(status_code=500, detail=str(e))
