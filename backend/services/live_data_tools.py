"""
Live Data Tools — Function Calling cho dữ liệu real-time từ Supabase.

Các hàm này được Gemini gọi qua Function Calling (KHÔNG phải Google Search Grounding).
Function Calling chỉ tính token thông thường, không phát sinh phí riêng.

Bốn functions:
  1. get_ve_gia_va_con_cho()       — giá vé hiện tại
  2. get_su_kien_sap_dien_ra()     — sự kiện sắp diễn ra từ hôm nay
  3. get_trien_lam_dang_dien_ra()  — triển lãm đang active
  4. get_danh_gia_trung_binh(object_id) — điểm đánh giá trung bình
"""
from datetime import date
from cachetools import TTLCache
from core.supabase_client import supabase_admin

# Cache in-memory 60 giây để trả lời siêu tốc (< 1ms)
_live_cache = TTLCache(maxsize=100, ttl=60)


def get_thong_ke_tong_quan() -> dict:
    """
    Tra cứu số liệu thống kê tổng quan THẬT của bảo tàng từ Supabase.
    Dùng khi người dùng hỏi về số lượng hiện vật, triển lãm, sự kiện...
    KHÔNG bao giờ tự bịa số liệu — luôn lấy từ dữ liệu thật.
    """
    hit = _live_cache.get("thong_ke")
    if hit:
        return hit
    try:
        stats = {}

        # Đếm tổng số hiện vật
        r = supabase_admin.table("hien_vat").select("id", count="exact").execute()
        stats["tong_hien_vat"] = r.count if r.count is not None else len(r.data or [])

        # Đếm hiện vật đang trưng bày
        r2 = supabase_admin.table("hien_vat").select("id", count="exact").eq("status", "Đang trưng bày").execute()
        stats["hien_vat_dang_trung_bay"] = r2.count if r2.count is not None else len(r2.data or [])

        # Đếm triển lãm
        r3 = supabase_admin.table("trien_lam").select("id", count="exact").execute()
        stats["tong_trien_lam"] = r3.count if r3.count is not None else len(r3.data or [])

        # Đếm sự kiện
        r4 = supabase_admin.table("su_kien").select("id", count="exact").execute()
        stats["tong_su_kien"] = r4.count if r4.count is not None else len(r4.data or [])

        # Đếm danh mục
        r5 = supabase_admin.table("danh_muc").select("id, name, count").execute()
        danh_muc_list = []
        for dm in (r5.data or []):
            danh_muc_list.append({
                "name": dm.get("name", ""),
                "count": dm.get("count", 0)
            })
        stats["danh_muc"] = danh_muc_list
        stats["tong_danh_muc"] = len(danh_muc_list)

        # Đếm phòng trưng bày
        r6 = supabase_admin.table("phong_trung_bay").select("id", count="exact").execute()
        stats["tong_phong"] = r6.count if r6.count is not None else len(r6.data or [])

        # Bài viết đã xuất bản
        r7 = supabase_admin.table("bai_viet").select("id", count="exact").eq("status", "Đã xuất bản").execute()
        stats["bai_viet_xuat_ban"] = r7.count if r7.count is not None else len(r7.data or [])

        res = {
            "status": "ok",
            "data_source": "Supabase — dữ liệu thật, không ước tính",
            "stats": stats,
            "summary": (
                f"Bảo tàng hiện có {stats['tong_hien_vat']} hiện vật "
                f"({stats['hien_vat_dang_trung_bay']} đang trưng bày), "
                f"{stats['tong_trien_lam']} triển lãm, "
                f"{stats['tong_su_kien']} sự kiện, "
                f"{stats['tong_phong']} phòng trưng bày, "
                f"{stats['tong_danh_muc']} danh mục hiện vật."
            )
        }
        _live_cache["thong_ke"] = res
        return res
    except Exception as e:
        return {"status": "error", "message": str(e)}

def get_ve_gia_va_con_cho() -> dict:
    """
    Tra cứu danh sách loại vé tham quan và giá vé hiện tại.
    Bảng ve_tham_quan: id, name, price, description, active.
    """
    hit = _live_cache.get("ve_gia")
    if hit:
        return hit
    try:
        result = supabase_admin.table("ve_tham_quan").select(
            "id, name, price, description, active"
        ).eq("active", True).order("price").execute()

        tickets = result.data or []
        if not tickets:
            return {
                "status": "no_data",
                "message": "Hiện chưa có thông tin vé tham quan trong hệ thống.",
                "tickets": []
            }

        res = {
            "status": "ok",
            "tickets": [
                {
                    "name": t.get("name", ""),
                    "price": t.get("price", 0),
                    "description": t.get("description", ""),
                }
                for t in tickets
            ],
            "summary": f"Bảo tàng có {len(tickets)} loại vé. Giá từ {min(t.get('price', 0) for t in tickets):,.0f}đ đến {max(t.get('price', 0) for t in tickets):,.0f}đ."
        }
        _live_cache["ve_gia"] = res
        return res
    except Exception as e:
        return {"status": "error", "message": str(e), "tickets": []}


def get_su_kien_sap_dien_ra() -> dict:
    """
    Tra cứu danh sách sự kiện sắp diễn ra (từ hôm nay trở đi), sắp xếp gần nhất.
    Bảng su_kien: id, title, date, time, location, speaker, status, seats, registered, description, image.
    """
    hit = _live_cache.get("su_kien")
    if hit:
        return hit
    try:
        today = date.today().isoformat()

        result = supabase_admin.table("su_kien").select(
            "*"
        ).gte("date", today).order("date").limit(5).execute()

        events = result.data or []
        if not events:
            return {
                "status": "no_data",
                "message": f"Không có sự kiện nào sắp diễn ra từ ngày {today}.",
                "events": []
            }

        formatted = []
        for e in events:
            remaining = (e.get("seats", 0) or 0) - (e.get("registered", 0) or 0)
            formatted.append({
                "id": e.get("id"),
                "title": e.get("title", ""),
                "date": e.get("date", ""),
                "time": e.get("time", ""),
                "location": e.get("location", ""),
                "speaker": e.get("speaker", ""),
                "status": e.get("status", ""),
                "seats_remaining": max(0, remaining),
                "image": e.get("image", ""),
                "description": (e.get("description") or "")[:200],
            })

        res = {
            "status": "ok",
            "today": today,
            "events": formatted,
            "summary": f"Có {len(formatted)} sự kiện sắp diễn ra."
        }
        _live_cache["su_kien"] = res
        return res
    except Exception as e:
        return {"status": "error", "message": str(e), "events": []}


def get_trien_lam_dang_dien_ra() -> dict:
    """
    Tra cứu các triển lãm đang diễn ra (start_date <= hôm nay <= end_date)
    hoặc có status 'Đang diễn ra'.
    Bảng trien_lam: id, name, status, start_date, end_date, location, description, image.
    """
    hit = _live_cache.get("trien_lam")
    if hit:
        return hit
    try:
        today = date.today().isoformat()

        result = supabase_admin.table("trien_lam").select(
            "*"
        ).or_(
            f"status.eq.Đang diễn ra,and(start_date.lte.{today},end_date.gte.{today})"
        ).order("start_date").execute()

        exhibitions = result.data or []
        if not exhibitions:
            return {
                "status": "no_data",
                "message": "Hiện không có triển lãm nào đang diễn ra.",
                "exhibitions": []
            }

        res = {
            "status": "ok",
            "today": today,
            "exhibitions": [
                {
                    "id": ex.get("id"),
                    "name": ex.get("name", ""),
                    "status": ex.get("status", ""),
                    "start_date": ex.get("start_date", ""),
                    "end_date": ex.get("end_date", ""),
                    "location": ex.get("location", ""),
                    "artifacts_count": ex.get("artifacts_count", 0),
                    "image": ex.get("image", ""),
                    "description": (ex.get("description") or "")[:200],
                }
                for ex in exhibitions
            ],
            "summary": f"Có {len(exhibitions)} triển lãm đang diễn ra."
        }
        _live_cache["trien_lam"] = res
        return res
    except Exception as e:
        return {"status": "error", "message": str(e), "exhibitions": []}


def get_danh_gia_trung_binh(object_id: str) -> dict:
    """
    Tra cứu điểm đánh giá trung bình của một hiện vật từ bảng danh_gia.
    Bảng danh_gia: id, artifact_id, artifact_name, rating, comment, author, date.

    Args:
        object_id: ID của hiện vật (artifact_id trong bảng danh_gia).
    """
    try:
        result = supabase_admin.table("danh_gia").select(
            "rating, comment, author, date, artifact_name"
        ).eq("artifact_id", object_id).order("date", desc=True).execute()

        reviews = result.data or []
        if not reviews:
            return {
                "status": "no_data",
                "object_id": object_id,
                "message": "Chưa có đánh giá nào cho hiện vật này.",
                "average_rating": None,
                "total_reviews": 0,
            }

        ratings = [r["rating"] for r in reviews if r.get("rating")]
        avg = sum(ratings) / len(ratings) if ratings else 0

        recent = reviews[:3]  # Lấy 3 đánh giá mới nhất để trích dẫn

        return {
            "status": "ok",
            "object_id": object_id,
            "artifact_name": reviews[0].get("artifact_name", ""),
            "average_rating": round(avg, 1),
            "total_reviews": len(reviews),
            "recent_comments": [
                {
                    "author": r.get("author", "Ẩn danh"),
                    "rating": r.get("rating"),
                    "comment": (r.get("comment") or "")[:150],
                    "date": r.get("date", ""),
                }
                for r in recent
            ],
        }
    except Exception as e:
        return {"status": "error", "object_id": object_id, "message": str(e)}


def get_chuyen_de_trung_bay() -> dict:
    """
    Tra cứu các chuyên đề trưng bày từ bảng phong_trung_bay trên Supabase.
    Bảng phong_trung_bay: id, name, location, status, description, image, start_date, end_date, etc.
    """
    hit = _live_cache.get("chuyen_de")
    if hit:
        return hit
    try:
        result = supabase_admin.table("phong_trung_bay").select("*").execute()

        items = result.data or []
        if not items:
            return {
                "status": "no_data",
                "message": "Hiện chưa có thông tin chuyên đề trưng bày.",
                "galleries": []
            }

        res = {
            "status": "ok",
            "galleries": [
                {
                    "id": g.get("id"),
                    "name": g.get("name", ""),
                    "location": g.get("location", ""),
                    "status": g.get("status", ""),
                    "image": g.get("image", ""),
                    "start_date": g.get("start_date", ""),
                    "end_date": g.get("end_date", ""),
                    "description": g.get("description", ""),
                    "detailed_content": g.get("detailed_content", ""),
                    "highlight_artifacts": g.get("highlight_artifacts", []),
                    "gallery_images": g.get("gallery_images", []),
                }
                for g in items
            ],
            "summary": f"Bảo tàng có {len(items)} chuyên đề trưng bày."
        }
        _live_cache["chuyen_de"] = res
        return res
    except Exception as e:
        return {"status": "error", "message": str(e), "galleries": []}


def get_chuyen_de_da_dien_ra() -> dict:
    """
    Tra cứu các chuyên đề trưng bày đã diễn ra (đã kết thúc) từ bảng phong_trung_bay.
    Lọc theo status 'Đã diễn ra' hoặc 'Đã kết thúc'.
    """
    hit = _live_cache.get("chuyen_de_da_dien_ra")
    if hit:
        return hit
    try:
        result = supabase_admin.table("phong_trung_bay").select("*").execute()
        items = result.data or []
        ended_items = [
            g for g in items
            if any(k in (g.get("status") or "").lower() for k in ("đã diễn ra", "đã kết thúc", "da dien ra", "da ket thuc"))
        ]
        if not ended_items:
            return {
                "status": "no_data",
                "message": "Hiện chưa có thông tin chuyên đề trưng bày đã kết thúc.",
                "galleries": []
            }
        res = {
            "status": "ok",
            "galleries": [
                {
                    "id": g.get("id"),
                    "name": g.get("name", ""),
                    "location": g.get("location", ""),
                    "status": g.get("status", "Đã diễn ra"),
                    "image": g.get("image", ""),
                    "start_date": g.get("start_date", ""),
                    "end_date": g.get("end_date", ""),
                    "description": g.get("description", ""),
                    "detailed_content": g.get("detailed_content", ""),
                    "highlight_artifacts": g.get("highlight_artifacts", []),
                    "gallery_images": g.get("gallery_images", []),
                }
                for g in ended_items
            ],
            "summary": f"Bảo tàng đã từng tổ chức {len(ended_items)} chuyên đề trưng bày đặc sắc."
        }
        _live_cache["chuyen_de_da_dien_ra"] = res
        return res
    except Exception as e:
        return {"status": "error", "message": str(e), "galleries": []}


def get_trien_lam_da_ket_thuc() -> dict:
    """
    Tra cứu các triển lãm đã kết thúc từ bảng trien_lam.
    """
    hit = _live_cache.get("trien_lam_da_ket_thuc")
    if hit:
        return hit
    try:
        result = supabase_admin.table("trien_lam").select("*").execute()
        items = result.data or []
        ended_items = [
            ex for ex in items
            if any(k in (ex.get("status") or "").lower() for k in ("đã kết thúc", "đã diễn ra", "da ket thuc", "da dien ra"))
        ]
        if not ended_items:
            return {
                "status": "no_data",
                "message": "Hiện chưa có thông tin triển lãm đã kết thúc.",
                "exhibitions": []
            }
        res = {
            "status": "ok",
            "exhibitions": [
                {
                    "id": ex.get("id"),
                    "name": ex.get("name", ""),
                    "status": ex.get("status", "Đã kết thúc"),
                    "start_date": ex.get("start_date", ""),
                    "end_date": ex.get("end_date", ""),
                    "location": ex.get("location", ""),
                    "artifacts_count": ex.get("artifacts_count", 0),
                    "image": ex.get("image", ""),
                    "description": (ex.get("description") or "")[:200],
                }
                for ex in ended_items
            ],
            "summary": f"Có {len(ended_items)} triển lãm đã kết thúc."
        }
        _live_cache["trien_lam_da_ket_thuc"] = res
        return res
    except Exception as e:
        return {"status": "error", "message": str(e), "exhibitions": []}


def get_trien_lam_sap_dien_ra() -> dict:
    """
    Tra cứu các triển lãm sắp diễn ra từ bảng trien_lam.
    """
    hit = _live_cache.get("trien_lam_sap_dien_ra")
    if hit:
        return hit
    try:
        result = supabase_admin.table("trien_lam").select("*").execute()
        items = result.data or []
        upcoming_items = [
            ex for ex in items
            if any(k in (ex.get("status") or "").lower() for k in ("sắp diễn ra", "sap dien ra", "chuẩn bị", "chuan bi"))
        ]
        if not upcoming_items:
            return {
                "status": "no_data",
                "message": "Hiện chưa có triển lãm mới nào trong danh sách sắp diễn ra.",
                "exhibitions": []
            }
        res = {
            "status": "ok",
            "exhibitions": [
                {
                    "id": ex.get("id"),
                    "name": ex.get("name", ""),
                    "status": ex.get("status", "Sắp diễn ra"),
                    "start_date": ex.get("start_date", ""),
                    "end_date": ex.get("end_date", ""),
                    "location": ex.get("location", ""),
                    "artifacts_count": ex.get("artifacts_count", 0),
                    "image": ex.get("image", ""),
                    "description": (ex.get("description") or "")[:200],
                }
                for ex in upcoming_items
            ],
            "summary": f"Có {len(upcoming_items)} triển lãm sắp diễn ra."
        }
        _live_cache["trien_lam_sap_dien_ra"] = res
        return res
    except Exception as e:
        return {"status": "error", "message": str(e), "exhibitions": []}


def get_su_kien_da_dien_ra() -> dict:
    """
    Tra cứu các sự kiện đã diễn ra từ bảng su_kien.
    """
    hit = _live_cache.get("su_kien_da_dien_ra")
    if hit:
        return hit
    try:
        today = date.today().isoformat()
        result = supabase_admin.table("su_kien").select(
            "id, name, title, date, time, location, status, image, description, speaker"
        ).or_(
            f"status.eq.Đã diễn ra,date.lt.{today}"
        ).order("date", desc=True).limit(6).execute()
        events = result.data or []
        if not events:
            return {
                "status": "no_data",
                "message": "Hiện chưa có sự kiện nào trong danh sách đã diễn ra.",
                "events": []
            }
        res = {
            "status": "ok",
            "events": [
                {
                    "id": ev.get("id"),
                    "title": ev.get("name") or ev.get("title") or "",
                    "date": ev.get("date", ""),
                    "time": ev.get("time", ""),
                    "location": ev.get("location", ""),
                    "speaker": ev.get("speaker", ""),
                    "status": ev.get("status", "Đã diễn ra"),
                    "image": ev.get("image", ""),
                    "description": (ev.get("description") or "")[:150],
                }
                for ev in events
            ],
            "summary": f"Có {len(events)} sự kiện đã từng diễn ra."
        }
        _live_cache["su_kien_da_dien_ra"] = res
        return res
    except Exception as e:
        return {"status": "error", "message": str(e), "events": []}


def get_danh_gia_tong_quan() -> dict:
    """
    Tra cứu các nhận xét, đánh giá của du khách về bảo tàng và hiện vật từ bảng danh_gia.
    Bảng danh_gia: id, author, rating, comment, artifact_name, date.
    """
    try:
        result = supabase_admin.table("danh_gia").select(
            "id, author, rating, comment, artifact_name, date"
        ).order("date", desc=True).limit(6).execute()

        reviews = result.data or []
        if not reviews:
            return {
                "status": "no_data",
                "message": "Hiện chưa có đánh giá nào từ du khách.",
                "reviews": []
            }

        ratings = [r["rating"] for r in reviews if r.get("rating")]
        avg = sum(ratings) / len(ratings) if ratings else 5.0

        return {
            "status": "ok",
            "average_rating": round(avg, 1),
            "total_reviews": len(reviews),
            "reviews": [
                {
                    "author": r.get("author", "Ẩn danh"),
                    "rating": r.get("rating", 5),
                    "comment": r.get("comment", ""),
                    "target": r.get("artifact_name") or "Bảo tàng Quốc gia",
                    "date": r.get("date", ""),
                }
                for r in reviews
            ],
            "summary": f"Bảo tàng có đánh giá trung bình {round(avg, 1)}/5 sao từ du khách."
        }
    except Exception as e:
        return {"status": "error", "message": str(e), "reviews": []}


# ── Mapping tên function → hàm Python (dùng trong vòng lặp function calling) ──
FUNCTION_MAP = {
    "get_thong_ke_tong_quan": get_thong_ke_tong_quan,
    "get_ve_gia_va_con_cho": get_ve_gia_va_con_cho,
    "get_su_kien_sap_dien_ra": get_su_kien_sap_dien_ra,
    "get_su_kien_da_dien_ra": get_su_kien_da_dien_ra,
    "get_trien_lam_dang_dien_ra": get_trien_lam_dang_dien_ra,
    "get_trien_lam_sap_dien_ra": get_trien_lam_sap_dien_ra,
    "get_trien_lam_da_ket_thuc": get_trien_lam_da_ket_thuc,
    "get_chuyen_de_trung_bay": get_chuyen_de_trung_bay,
    "get_chuyen_de_da_dien_ra": get_chuyen_de_da_dien_ra,
    "get_danh_gia_trung_binh": get_danh_gia_trung_binh,
    "get_danh_gia_tong_quan": get_danh_gia_tong_quan,
}


def execute_function_call(name: str, args: dict) -> str:
    """
    Thực thi function được Gemini yêu cầu và trả về kết quả dưới dạng chuỗi JSON.
    """
    import json

    fn = FUNCTION_MAP.get(name)
    if fn is None:
        return json.dumps({"error": f"Function '{name}' không tồn tại."}, ensure_ascii=False)

    try:
        result = fn(**args)
        return json.dumps(result, ensure_ascii=False, default=str)
    except Exception as e:
        return json.dumps({"error": str(e)}, ensure_ascii=False)
