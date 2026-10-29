"""
TTS tiếng Việt phía server (dự phòng khi máy khách không có giọng đọc tiếng Việt).

Dùng thư viện `edge-tts` (giọng neural của Microsoft: Hoài My / Nam Minh).
Miễn phí, không cần API key, nhưng backend cần có internet.

POST /api/tts   {text, voice?, rate?}  ->  audio/mpeg
GET  /api/tts/health                   ->  {"ok": bool, "detail": str}
"""
import asyncio
import hashlib
import time
from collections import defaultdict, deque

from cachetools import TTLCache
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import Response
from pydantic import BaseModel, Field

router = APIRouter(prefix="/api/tts", tags=["tts"])

ALLOWED_VOICES = {"vi-VN-HoaiMyNeural", "vi-VN-NamMinhNeural"}
DEFAULT_VOICE = "vi-VN-HoaiMyNeural"
MAX_CHARS = 1500
TIMEOUT_S = 25

_cache: TTLCache = TTLCache(maxsize=256, ttl=60 * 60)
_hits: dict = defaultdict(deque)
RATE_LIMIT = 40          # số yêu cầu
RATE_WINDOW_S = 60       # trong 60 giây / mỗi IP


class TtsRequest(BaseModel):
    text: str = Field(..., min_length=1)
    voice: str | None = None
    rate: float | None = Field(default=None, description="Tốc độ, 1.0 = bình thường (0.5 - 1.5)")


def _check_rate_limit(ip: str) -> None:
    now = time.monotonic()
    q = _hits[ip]
    while q and now - q[0] > RATE_WINDOW_S:
        q.popleft()
    if len(q) >= RATE_LIMIT:
        raise HTTPException(status_code=429, detail="Bạn yêu cầu đọc quá nhanh, vui lòng thử lại sau ít giây.")
    q.append(now)


def _rate_string(rate: float | None) -> str:
    r = 1.0 if rate is None else max(0.5, min(1.5, float(rate)))
    pct = round((r - 1.0) * 100)
    return f"{pct:+d}%"


async def _synthesize(text: str, voice: str, rate: str) -> bytes:
    try:
        import edge_tts  # import muộn để backend vẫn chạy khi chưa cài
    except ImportError:
        raise HTTPException(
            status_code=503,
            detail="Máy chủ chưa cài thư viện giọng đọc. Chạy: pip install edge-tts (trong venv của backend).",
        )

    async def _run() -> bytes:
        communicate = edge_tts.Communicate(text, voice, rate=rate)
        buf = bytearray()
        async for chunk in communicate.stream():
            if chunk.get("type") == "audio":
                buf.extend(chunk["data"])
        return bytes(buf)

    try:
        audio = await asyncio.wait_for(_run(), timeout=TIMEOUT_S)
    except asyncio.TimeoutError:
        raise HTTPException(status_code=504, detail="Dịch vụ giọng đọc phản hồi quá chậm.")
    except HTTPException:
        raise
    except Exception as e:  # lỗi mạng/dịch vụ
        raise HTTPException(
            status_code=502,
            detail=f"Không kết nối được dịch vụ giọng đọc (kiểm tra internet của máy chủ): {e}",
        )
    if not audio:
        raise HTTPException(status_code=502, detail="Dịch vụ giọng đọc không trả về âm thanh.")
    return audio


@router.post("")
@router.post("/", include_in_schema=False)
async def text_to_speech(body: TtsRequest, request: Request):
    text = " ".join(body.text.split())
    if not text:
        raise HTTPException(status_code=400, detail="Nội dung cần đọc không được để trống.")
    if len(text) > MAX_CHARS:
        raise HTTPException(status_code=413, detail=f"Nội dung quá dài (tối đa {MAX_CHARS} ký tự mỗi lần).")

    voice = body.voice if body.voice in ALLOWED_VOICES else DEFAULT_VOICE
    rate = _rate_string(body.rate)

    key = hashlib.sha256(f"{voice}|{rate}|{text}".encode("utf-8")).hexdigest()
    audio = _cache.get(key)
    if audio is None:
        ip = request.client.host if request.client else "unknown"
        _check_rate_limit(ip)
        audio = await _synthesize(text, voice, rate)
        _cache[key] = audio

    return Response(
        content=audio,
        media_type="audio/mpeg",
        headers={"Cache-Control": "private, max-age=3600"},
    )


@router.get("/health")
async def tts_health():
    try:
        import edge_tts  # noqa: F401
    except ImportError:
        return {"ok": False, "detail": "Chưa cài edge-tts. Chạy: pip install edge-tts"}
    return {"ok": True, "detail": "edge-tts đã sẵn sàng", "voices": sorted(ALLOWED_VOICES)}
