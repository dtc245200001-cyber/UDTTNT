from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from core.supabase_client import supabase_admin
import time

router = APIRouter(prefix="/api/auth", tags=["Auth"])

class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str
    avatar: str = ""

@router.post("/register")
async def register_user(payload: RegisterRequest):
    email = payload.email.strip().lower()
    
    # 1. Kiểm tra tài khoản đã tồn tại trong database (nếu Supabase online)
    try:
        existing = supabase_admin.table("nguoi_dung").select("id").eq("email", email).execute()
        if existing.data and len(existing.data) > 0:
            raise HTTPException(status_code=400, detail="Địa chỉ email này đã được đăng ký trong hệ thống!")
    except HTTPException:
        raise
    except Exception as e:
        print(f"[Register] Supabase check notice: {e}")
        
    user_id = f"USR{int(time.time())}"
    try:
        # 2. Tạo người dùng trong auth.users nếu Supabase admin có sẵn
        auth_response = supabase_admin.auth.admin.create_user(
            {
                "email": email,
                "password": payload.password,
                "email_confirm": True,
                "user_metadata": {"name": payload.name.strip()}
            }
        )
        if hasattr(auth_response, "user") and hasattr(auth_response.user, "id"):
            user_id = auth_response.user.id
    except HTTPException:
        raise
    except Exception as e:
        error_msg = str(e)
        if "rate limit" in error_msg.lower():
            raise HTTPException(status_code=429, detail="Hệ thống đang quá tải yêu cầu đăng ký, vui lòng thử lại sau ít phút.")
        elif "already exists" in error_msg.lower() or "already registered" in error_msg.lower():
            raise HTTPException(status_code=400, detail="Địa chỉ email này đã được đăng ký trong hệ thống!")
        print(f"[Register] Supabase admin create_user fallback: {e}")
        
    update_payload = {}
    if payload.avatar:
        update_payload["avatar"] = payload.avatar
    if update_payload:
        try:
            supabase_admin.table("nguoi_dung").update(update_payload).eq("auth_user_id", user_id).execute()
        except Exception:
            pass
        
    final_user = {
        "id": user_id,
        "name": payload.name.strip(),
        "email": email,
        "role": "visitor",
        "role_label": "Khách tham quan",
        "status": "Hoạt động",
        "avatar": payload.avatar or "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150"
    }

    try:
        final_row = supabase_admin.table("nguoi_dung").select("*").eq("auth_user_id", user_id).execute()
        if final_row.data and len(final_row.data) > 0:
            final_user = final_row.data[0]
    except Exception:
        pass

    return {"success": True, "message": "Đăng ký thành công", "user": final_user}

