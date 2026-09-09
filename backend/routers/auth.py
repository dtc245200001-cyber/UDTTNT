from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from core.supabase_client import supabase_admin
from datetime import date

router = APIRouter(prefix="/api/auth", tags=["Auth"])

class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str
    avatar: str = ""

@router.post("/register")
async def register_user(payload: RegisterRequest):
    email = payload.email.strip().lower()
    
    # 1. Check if email exists in nguoi_dung
    existing = supabase_admin.table("nguoi_dung").select("id").eq("email", email).execute()
    if existing.data and len(existing.data) > 0:
        raise HTTPException(status_code=400, detail="Địa chỉ email này đã được đăng ký trong hệ thống!")
        
    try:
        # 2. Create user in auth.users and auto-confirm
        auth_response = supabase_admin.auth.admin.create_user(
            {
                "email": email,
                "password": payload.password,
                "email_confirm": True,
                "user_metadata": {"name": payload.name.strip()}
            }
        )
        user_id = auth_response.user.id
    except Exception as e:
        error_msg = str(e)
        if "rate limit" in error_msg.lower():
            raise HTTPException(status_code=429, detail="Hệ thống đang quá tải yêu cầu đăng ký, vui lòng thử lại sau ít phút.")
        elif "already exists" in error_msg.lower() or "already registered" in error_msg.lower():
            raise HTTPException(status_code=400, detail="Địa chỉ email này đã được đăng ký trong hệ thống!")
        raise HTTPException(status_code=500, detail=error_msg)
        
    update_payload = {}
    if payload.avatar:
        update_payload["avatar"] = payload.avatar
    if update_payload:
        result = supabase_admin.table("nguoi_dung").update(update_payload).eq("auth_user_id", user_id).execute()
        
    # Lấy lại row thật (do trigger tạo) để trả về cho frontend
    final_row = supabase_admin.table("nguoi_dung").select("*").eq("auth_user_id", user_id).execute()
    return {"success": True, "message": "Đăng ký thành công", "user": final_row.data[0]}
