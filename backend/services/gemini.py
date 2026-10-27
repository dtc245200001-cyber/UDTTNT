"""
Gemini Service — Xử lý sinh câu trả lời với RAG, Function Calling và Streaming.
SDK: google-genai (from google import genai)
Model chính: gemini-3.5-flash (cấu hình duy nhất qua core.config.settings)

Không sử dụng bất kỳ tool nào có phí riêng:
  ❌ Google Search Grounding
  ❌ google_search / google_search_retrieval
  ❌ url_context / code_execution / grounding_maps
  ✅ Function Calling thông thường (chỉ tính token)

Nhom B: B1 circuit breaker (model,key), B2 timeout ngan + ngan sach tong +
  retry toi da 1, B6 prompt gon (~3.6k ky tu).
Nhom C: C1 chuoi fallback theo tang, C2 phan biet loi that/response rong,
  C3 status event khi first token cham.
"""
import os
import time
import asyncio
import json
import re
from datetime import datetime, timezone, timedelta
from dotenv import load_dotenv
from google import genai
from google.genai import types
from services.text_utils import matches_phrase
from services.constants import MUSEUM_KEYWORDS, REALTIME_KEYWORDS
from core.config import settings

load_dotenv()

# Model chính lấy từ NGUỒN DUY NHẤT: core.config.settings (đọc từ .env).
# A1: gemini-3.5-flash (gemini-3.8-flash liên tục 503/timeout — probe 2026-10-27).
MODEL_NAME = settings.GEMINI_MODEL_NAME or "gemini-3.5-flash-lite"

# B6: prompt gon (~3.6k ky tu, giam 71% so voi ~12.7k), giu NGUYEN moi quy tac.
SYSTEM_PROMPT = """Bạn là "Trợ lý AI Bảo tàng Quốc gia Việt Nam" — trợ lý trò chuyện tự nhiên (không phải chatbot FAQ), duy trì ngữ cảnh và dùng kiến thức bảo tàng khi cần.

========================
0. NGÀY GIỜ HIỆN TẠI
========================
Dùng ngày giờ trong "=== NGÀY GIỜ HIỆN TẠI ===" ở đầu prompt để trả lời câu hỏi thời gian. TUYỆT ĐỐI KHÔNG tự đoán ngày giờ từ dữ liệu huấn luyện.

========================
1. PHONG CÁCH
========================
Tự nhiên, thân thiện, dễ hiểu, linh hoạt, có cảm xúc vừa phải. Không máy móc, không lặp câu mở đầu. Không phải câu nào cũng cần nhắc bảo tàng hay cung cấp kiến thức. Tối đa 1 emoji, có thể không dùng.

========================
2. ĐỘ DÀI & CẤU TRÚC
========================
1. Câu đầu PHẢI trả lời trực tiếp. Cấm mở đầu vòng vo ("Nhắc đến...", "Đây là câu hỏi hay"...).
2. Mặc định tối đa 3 câu (~60 từ). Chỉ dài hơn khi người dùng nói rõ "chi tiết", "kể thêm", "phân tích", "giải thích kỹ".
3. Liệt kê: tối đa 3-4 gạch đầu dòng ngắn (mỗi dòng <15 từ). Không dùng tiêu đề (#).
4. In đậm (**...**) chỉ cho tên hiện vật hoặc con số quan trọng nhất (tối đa 2-3 chỗ).
5. Kết thúc bằng ĐÚNG MỘT câu mời tiếp ngắn nếu tự nhiên, không lặp công thức.
6. Vị trí HIỆN VẬT: nêu thẳng "Tầng X · Phòng Y · Kệ Z" ở câu đầu. Giá vé/giờ mở cửa: dòng số liệu ngắn, không lời dẫn.
7. Quy tắc "Mình chưa có thông tin này" CHỈ cho câu hỏi RÕ RÀNG về bảo tàng mà RAG/function đều không có (nói 1 câu + gợi ý hỏi quầy lễ tân, không bịa). Câu kiến thức chung/trò chuyện đời thường: trả lời thẳng bằng kiến thức nội tại theo mục 6, KHÔNG dùng câu này.

Ví dụ TỐT — User: "Trống đồng" → AI: "**Trống đồng Ngọc Lũ** là bảo vật quốc gia của văn hóa Đông Sơn, được đúc cách đây khoảng 2.500 năm. Mặt trống khắc cảnh chim lạc, người giã gạo, nhảy múa. Bạn muốn biết trống đang trưng bày ở đâu không?"
Ví dụ XẤU — "Nhắc đến trống đồng là nhắc đến một trong những niềm tự hào... (quá dài, vòng vo)"
Ví dụ TỐT — User: "Giá vé" → AI: "- Người lớn: 40.000đ\n- Sinh viên: 20.000đ\n- Trẻ em: 10.000đ"
Trò chuyện tự nhiên: User "Hôm nay tôi hơi chán." → AI: "Vậy để mình tìm cách làm bạn đỡ chán nhé 😄 Bạn muốn nghe một câu chuyện thú vị hay khám phá một hiện vật đặc biệt?" (Không biến mọi câu thành chuyện bảo tàng.)

========================
3. NGỮ CẢNH
========================
Luôn dùng lịch sử trò chuyện. Hiểu câu ngắn ("nó", "cái đó", "kể thêm đi", "tại sao?", "ở đâu?"...). Không bắt người dùng lặp lại thông tin đã cho.

========================
4. RAG (DỮ LIỆU TĨNH)
========================
Khi có RAG CONTEXT, ưu tiên thông tin trong RAG (hiện vật, triển lãm, phòng trưng bày, bài viết, danh mục, thông tin tổng quan bảo tàng). Không nói "theo RAG/database". Không trả nguyên văn toàn bộ RAG; chỉ dùng phần thực sự liên quan.

========================
5. FUNCTION CALLING (DỮ LIỆU REAL-TIME)
========================
Function nội bộ (không phải Google Search, không phí riêng). Chủ động gọi khi cần: giá vé → get_ve_gia_va_con_cho(); sự kiện → get_su_kien_sap_dien_ra(); triển lãm đang diễn ra → get_trien_lam_dang_dien_ra(); đánh giá hiện vật → get_danh_gia_trung_binh(object_id); số lượng/thống kê → get_thong_ke_tong_quan().
QUY TẮC QUAN TRỌNG NHẤT — SỐ LƯỢNG/THỐNG KÊ: LUÔN gọi get_thong_ke_tong_quan() TRƯỚC; TUYỆT ĐỐI KHÔNG tự bịa/ước tính; function lỗi thì nói thật "Mình không thể truy xuất số liệu chính xác lúc này."
KHÔNG gọi function cho chào hỏi, tâm sự, câu hỏi chung không liên quan bảo tàng.

========================
6. KIẾN THỨC CHUNG NGOÀI BẢO TÀNG
========================
Câu kiến thức chung (lịch sử, khoa học, văn hóa...) KHÔNG liên quan trực tiếp đến bảo tàng: trả lời bằng kiến thức nội tại, không cần function/RAG. Nếu là thông tin cụ thể VỀ BẢO TÀNG mà RAG/function đều không có: không bịa — nói "Mình chưa có thông tin này" và gợi ý hỏi quầy lễ tân.
"""

MUSEUM_GROUNDED_PROMPT = """Bạn là Trợ lý AI chính thức của Bảo tàng Lịch sử Quốc gia Việt Nam.
NGUYÊN TẮC BẮT BUỘC:
1. CHỈ ĐƯỢC trả lời dựa trên thông tin được cung cấp trong THÔNG TIN BẢO TÀNG TỪ RAG hoặc dữ liệu hệ thống.
2. TUYỆT ĐỐI KHÔNG tự bịa đặt, suy đoán hay sử dụng kiến thức bên ngoài về hiện vật, niên đại, chất liệu, kích thước, vị trí trưng bày, giá vé.
3. Nếu trong dữ liệu cung cấp KHÔNG CÓ thông tin để trả lời, bạn PHẢI nói thẳng:
   "Hiện tại hệ thống dữ liệu của Bảo tàng chưa có thông tin chi tiết về nội dung này. Bạn vui lòng liên hệ quầy thông tin/lễ tân của Bảo tàng để được hướng dẫn chi tiết nhé."
4. Trả lời chính xác, trang trọng, ngắn gọn, tự nhiên, nêu đúng tên và vị trí hiện vật nếu có trong dữ liệu.
"""

GENERAL_PROMPT = """Bạn là Trợ lý AI thông minh, hiểu biết và thân thiện.
Đây là câu hỏi kiến thức chung ngoài bảo tàng.
Hãy trả lời người dùng một cách chính xác, tự nhiên, đầy đủ bằng kiến thức tổng quát của bạn (văn hóa thế giới, khoa học, đời sống, lập trình, ẩm thực, địa lý...).
KHÔNG cần gò ép liên hệ hay nhắc đến Bảo tàng Lịch sử Quốc gia nếu người dùng không yêu cầu.
"""

GRAY_ZONE_HYBRID_PROMPT = """Bạn là Trợ lý AI của Bảo tàng Lịch sử Quốc gia Việt Nam.
NGUYÊN TẮC XỬ LÝ LAI:
1. Nếu câu hỏi liên quan đến Bảo tàng Lịch sử Quốc gia Việt Nam: CHỈ ĐƯỢC dùng thông tin có trong THÔNG TIN BẢO TÀNG TỪ RAG. Nếu thiếu thông tin, nói rõ chưa có dữ liệu và hướng dẫn hỏi quầy lễ tân; TUYỆT ĐỐI KHÔNG tự bịa hiện vật, vị trí, giá vé ngoài context.
2. Nếu câu hỏi là về kiến thức phổ thông, thế giới (địa danh quốc tế, tác phẩm nghệ thuật thế giới, khoa học, lịch sử thế giới...): Hãy trả lời tự do, chính xác bằng kiến thức tổng quát của bạn.
"""


# ── Khai báo Tool Declarations cho Gemini Function Calling ─────────────────

TOOL_DECLARATIONS = types.Tool(
    function_declarations=[
        types.FunctionDeclaration(
            name="get_thong_ke_tong_quan",
            description=(
                "Tra cứu số liệu thống kê THẬT của bảo tàng từ cơ sở dữ liệu. "
                "Gọi khi người dùng hỏi về số lượng hiện vật, bao nhiêu hiện vật, "
                "bao nhiêu triển lãm, bao nhiêu sự kiện, có bao nhiêu phòng, "
                "thống kê bảo tàng, danh mục nào nhiều nhất. "
                "PHẢI gọi function này thay vì tự ước tính hoặc bịa đặt."
            ),
            parameters=types.Schema(
                type=types.Type.OBJECT,
                properties={},
                required=[],
            ),
        ),
        types.FunctionDeclaration(
            name="get_ve_gia_va_con_cho",
            description=(
                "Tra cứu danh sách loại vé tham quan bảo tàng và giá vé hiện tại. "
                "Gọi khi người dùng hỏi về giá vé, mua vé, loại vé."
            ),
            parameters=types.Schema(
                type=types.Type.OBJECT,
                properties={},
                required=[],
            ),
        ),
        types.FunctionDeclaration(
            name="get_su_kien_sap_dien_ra",
            description=(
                "Tra cứu danh sách sự kiện sắp diễn ra tại bảo tàng từ hôm nay trở đi. "
                "Gọi khi người dùng hỏi về sự kiện, lịch sự kiện, hôm nay có gì, "
                "tuần này có gì, workshop, tọa đàm, triển lãm sắp tới."
            ),
            parameters=types.Schema(
                type=types.Type.OBJECT,
                properties={},
                required=[],
            ),
        ),
        types.FunctionDeclaration(
            name="get_trien_lam_dang_dien_ra",
            description=(
                "Tra cứu các triển lãm đang diễn ra tại bảo tàng hiện nay. "
                "Gọi khi người dùng hỏi triển lãm nào đang mở, có triển lãm gì hiện tại, "
                "đang trưng bày gì."
            ),
            parameters=types.Schema(
                type=types.Type.OBJECT,
                properties={},
                required=[],
            ),
        ),
        types.FunctionDeclaration(
            name="get_danh_gia_trung_binh",
            description=(
                "Tra cứu điểm đánh giá trung bình và các nhận xét của khách tham quan "
                "về một hiện vật cụ thể. Gọi khi người dùng hỏi 'hiện vật này được đánh giá "
                "thế nào', 'mọi người nghĩ gì về', 'rating của'."
            ),
            parameters=types.Schema(
                type=types.Type.OBJECT,
                properties={
                    "object_id": types.Schema(
                        type=types.Type.STRING,
                        description="ID của hiện vật trong hệ thống (ví dụ: ART_abc123)"
                    )
                },
                required=["object_id"],
            ),
        ),
    ]
)


class GeminiService:

    def __init__(self):
        self.api_keys = []
        self.current_key_idx = 0
        self.client = None
        # B1 circuit breaker: {(model, key_idx): [fail_monotonic_ts, ...]}
        self._circuit_failures: dict = {}
        self._setup_client()

    def _setup_client(self):
        # NGUON DUY NHAT: settings (doc tu .env), co ho tro GEMINI_API_KEYS don.
        keys_str = settings.GEMINI_API_KEY or ""
        if not keys_str:
            keys_str = os.getenv("GEMINI_API_KEYS", "") or os.getenv("GEMINI_API_KEY", "")

        self.api_keys = [k.strip() for k in keys_str.split(",") if k.strip() and k.strip() != "YOUR_GEMINI_API_KEY_HERE"]

        if not self.api_keys:
            print("[Gemini] Chua cau hinh GEMINI_API_KEY hoac GEMINI_API_KEYS")
            return

        self._initialize_current_client()

    def _initialize_current_client(self):
        if not self.api_keys:
            return

        current_key = self.api_keys[self.current_key_idx]
        try:
            self.client = genai.Client(api_key=current_key)
            print(f"[Gemini] Client da san sang voi key {self.current_key_idx + 1}/{len(self.api_keys)}: {MODEL_NAME}")
        except Exception as e:
            print(f"[Gemini] Khong the khoi tao client voi key {self.current_key_idx + 1}: {e}")
            self.client = None

    def _switch_api_key(self):
        if len(self.api_keys) > 1:
            self.current_key_idx = (self.current_key_idx + 1) % len(self.api_keys)
            print(f"[Gemini] Doi sang API Key {self.current_key_idx + 1}/{len(self.api_keys)}...")
            self._initialize_current_client()

    def _get_thinking_config(self, model_name: str) -> types.ThinkingConfig | None:
        try:
            if "gemini-3" in model_name:
                return types.ThinkingConfig(thinking_level=types.ThinkingLevel.LOW)
            else:
                return types.ThinkingConfig(thinking_budget=0)
        except Exception:
            return None

    def _inject_thinking_config(self, kwargs: dict, model_name: str):
        thinking_config = self._get_thinking_config(model_name)
        if thinking_config:
            if 'config' in kwargs and kwargs['config'] is not None:
                kwargs['config'].thinking_config = thinking_config
            else:
                kwargs['config'] = types.GenerateContentConfig(thinking_config=thinking_config)

    def _get_models_to_try(self):
        # A1: MOT nguon cau hinh duy nhat = core.config.settings (doc tu .env).
        primary = MODEL_NAME
        fallback_str = settings.GEMINI_FALLBACK_MODELS or ""
        fallbacks = [m.strip() for m in fallback_str.split(",") if m.strip()]

        models_to_try = [primary] + fallbacks
        seen = set()
        return [x for x in models_to_try if not (x in seen or seen.add(x))]

    # ── B1/B2: circuit breaker + timeout/ngan sach retry ──
    def _circuit_key(self, model: str) -> tuple:
        return (model, self.current_key_idx)

    def _circuit_open(self, model: str) -> bool:
        """True neu (model,key) dang bi danh dau unhealthy (qua nhieu loi lien tiep)."""
        fails = self._circuit_failures.get(self._circuit_key(model), [])
        threshold = int(settings.CIRCUIT_FAIL_THRESHOLD or 3)
        if len(fails) < threshold:
            return False
        cooldown = float(settings.CIRCUIT_COOLDOWN_S or 120.0)
        if time.monotonic() - fails[-1] < cooldown:
            return True
        # Het cooldown: xoa lich su, cho thu lai
        self._circuit_failures.pop(self._circuit_key(model), None)
        return False

    def _circuit_record(self, model: str, ok: bool):
        key = self._circuit_key(model)
        if ok:
            self._circuit_failures.pop(key, None)
        else:
            threshold = int(settings.CIRCUIT_FAIL_THRESHOLD or 3)
            fails = self._circuit_failures.setdefault(key, [])
            fails.append(time.monotonic())
            self._circuit_failures[key] = fails[-threshold:]

    @staticmethod
    def _error_kind(e: BaseException) -> str:
        s = str(e).lower()
        if isinstance(e, asyncio.TimeoutError):
            return "timeout"
        if "404" in s or "not_found" in s:
            return "not_found"
        if "503" in s or "unavailable" in s:
            return "unavailable"
        if "429" in s or "quota" in s or "exhausted" in s or "resource_exhausted" in s:
            return "quota"
        return "other"

    async def _execute_with_fallback(self, **kwargs):
        models = self._get_models_to_try()
        last_exception = None
        n_keys = max(1, len(self.api_keys))
        max_retries = max(0, int(settings.LLM_503_MAX_RETRIES or 0))
        call_timeout = float(settings.LLM_CALL_TIMEOUT_S or 15.0)
        budget = float(settings.LLM_TOTAL_BUDGET_S or 30.0)
        deadline = time.monotonic() + budget

        for model in models:
            if self._circuit_open(model):
                print(f"[Gemini] Bo qua {model} (Key {self.current_key_idx + 1}): circuit OPEN.")
                continue
            tried_key = False
            for _ in range(n_keys):
                tried_key = True
                retry_count = 0
                while True:
                    if time.monotonic() >= deadline:
                        print(f"[Gemini] Het ngan sach {budget:.0f}s, dung thu.")
                        break
                    try:
                        kwargs['model'] = model
                        self._inject_thinking_config(kwargs, model)

                        t0 = time.perf_counter()
                        # Tran timeout tung luot goi boi ngan sach con lai.
                        this_timeout = max(0.5, min(call_timeout, deadline - time.monotonic()))
                        response = await asyncio.wait_for(
                            self.client.aio.models.generate_content(**kwargs),
                            timeout=this_timeout
                        )
                        t1 = time.perf_counter()
                        print(f"[Gemini] Model {model} tra loi sau {t1 - t0:.2f}s")
                        self._circuit_record(model, True)

                        return response
                    except Exception as e:
                        kind = self._error_kind(e)
                        print(f"[Gemini] Model {model} (Key {self.current_key_idx + 1}) loi {kind}: {e}")
                        last_exception = e
                        if kind == "not_found":
                            break
                        if kind in ("unavailable", "timeout") and retry_count < max_retries \
                                and time.monotonic() < deadline:
                            retry_count += 1
                            await asyncio.sleep(0.5 * retry_count)
                            continue
                        break

                # Doi key khi loi dang retry duoc (het quota/503/timeout)
                if last_exception and self._error_kind(last_exception) in ("quota", "unavailable", "timeout"):
                    if len(self.api_keys) > 1:
                        print("[Gemini] Doi API Key...")
                        self._switch_api_key()
                        continue
                break
            if tried_key:
                self._circuit_record(model, False)
            else:
                print(f"[Gemini] Roi vao fallback cho model {model} do loi khong the phuc hoi.")

        raise last_exception

    @staticmethod
    def _log_chunk_finish(chunk, tag: str):
        """L2b1: log finish_reason/finish_message neu chunk cuoi mang thong tin nay."""
        try:
            cands = getattr(chunk, "candidates", None)
            if not cands:
                return
            for c in cands:
                fr = getattr(c, "finish_reason", None)
                fm = getattr(c, "finish_message", None)
                if fr:
                    print(f"[Gemini Stream] {tag} finish_reason={fr} finish_message={fm}")
        except Exception:
            pass

    @staticmethod
    def _chunk_finish_reason(chunk):
        """Tra ve finish_reason (str) cua chunk, hoac None."""
        try:
            cands = getattr(chunk, "candidates", None)
            if not cands:
                return None
            for c in cands:
                fr = getattr(c, "finish_reason", None)
                if fr:
                    s = str(fr)
                    # "FinishReason.MAX_TOKENS" -> "MAX_TOKENS"
                    return s.split(".")[-1] if "." in s else s
            return None
        except Exception:
            return None

    async def _stream_with_fallback(self, **kwargs):
        # B1/B2: giong _execute_with_fallback nhung cho stream — timeout cho
        # token dau tien ngan (LLM_FIRST_TOKEN_TIMEOUT_S), retry toi da
        # LLM_503_MAX_RETRIES, co circuit breaker + ngan sach tong.
        models = self._get_models_to_try()
        last_exception = None
        n_keys = max(1, len(self.api_keys))
        max_retries = max(0, int(settings.LLM_503_MAX_RETRIES or 0))
        first_token_timeout = float(settings.LLM_FIRST_TOKEN_TIMEOUT_S or 6.0)
        budget = float(settings.LLM_TOTAL_BUDGET_S or 30.0)
        deadline = time.monotonic() + budget

        for model in models:
            if self._circuit_open(model):
                print(f"[Gemini Stream] Bo qua {model} (Key {self.current_key_idx + 1}): circuit OPEN.")
                continue
            tried_key = False
            for _ in range(n_keys):
                tried_key = True
                retry_count = 0
                while True:
                    if time.monotonic() >= deadline:
                        print(f"[Gemini Stream] Het ngan sach {budget:.0f}s, dung thu.")
                        break
                    try:
                        kwargs['model'] = model
                        self._inject_thinking_config(kwargs, model)

                        t0 = time.perf_counter()
                        this_timeout = max(0.5, min(first_token_timeout, deadline - time.monotonic()))
                        raw_stream = await asyncio.wait_for(
                            self.client.aio.models.generate_content_stream(**kwargs),
                            timeout=this_timeout,
                        )

                        try:
                            first_chunk = await asyncio.wait_for(
                                raw_stream.__anext__(), timeout=this_timeout)
                        except StopAsyncIteration:
                            # A2: stream rong chunk dau — ghi nhan loi de thu tiep,
                            # tuyet doi khong return im lang.
                            print(f"[Gemini Stream] Model {model} tra ve stream rong ngay chunk dau.")
                            last_exception = RuntimeError(f"Model {model} returned empty stream")
                            break

                        t1 = time.perf_counter()
                        print(f"[Gemini Stream] Model {model} bat dau tra loi sau {t1 - t0:.2f}s")
                        self._circuit_record(model, True)

                        # L2b1: dem chunk + log finish_reason de truy vet cat cau.
                        # L2b2: theo doi finish_reason cuoi — MAX_TOKENS hoac dut
                        # dot ngot (khong STOP) duoc bao len tren de xu ly tiep.
                        n_chunks = 0
                        last_finish = None
                        yield first_chunk
                        n_chunks += 1
                        self._log_chunk_finish(first_chunk, f"{model}/first")
                        last_finish = self._chunk_finish_reason(first_chunk) or last_finish
                        try:
                            async for chunk in raw_stream:
                                n_chunks += 1
                                self._log_chunk_finish(chunk, f"{model}/#{n_chunks}")
                                fr = self._chunk_finish_reason(chunk)
                                if fr:
                                    last_finish = fr
                                yield chunk
                        finally:
                            print(f"[Gemini Stream] Model {model} ket thuc stream: "
                                  f"{n_chunks} chunks, finish={last_finish}, "
                                  f"tong {time.perf_counter() - t0:.2f}s")
                        # L2b2: stream ket thuc ma khong STOP/MAX_TOKENS ro rang
                        # (dut dot ngot) -> danh dau de caller bao interrupted.
                        if last_finish not in ("STOP", "MAX_TOKENS"):
                            print(f"[Gemini Stream] CANH BAO dut stream dot ngot "
                                  f"(finish={last_finish}) — se thu model/key tiep theo.")
                            last_exception = RuntimeError(
                                f"Model {model} stream interrupted (finish={last_finish})")
                            break
                        if last_finish == "MAX_TOKENS":
                            # Bao len tren de tiep tuc viet tiep (continue), khong fallback.
                            yield {"stream_event": "max_tokens"}
                        return

                    except Exception as e:
                        kind = self._error_kind(e)
                        print(f"[Gemini Stream] Model {model} (Key {self.current_key_idx + 1}) loi {kind}: {e}")
                        last_exception = e
                        if kind == "not_found":
                            break
                        if kind in ("unavailable", "timeout") and retry_count < max_retries \
                                and time.monotonic() < deadline:
                            retry_count += 1
                            await asyncio.sleep(0.5 * retry_count)
                            continue
                        break

                if last_exception and self._error_kind(last_exception) in ("quota", "unavailable", "timeout"):
                    if len(self.api_keys) > 1:
                        print("[Gemini Stream] Doi API Key...")
                        self._switch_api_key()
                        continue
                break
            if tried_key:
                self._circuit_record(model, False)

        raise last_exception

    def _build_history(self, history):
        if not history:
            return ""

        history_turns = []

        for item in history[-8:]:
            role = item.get("role", "user")
            content = item.get("content", item.get("text", ""))

            if not content:
                continue

            content = str(content).strip()
            if not content:
                continue

            if role == "user":
                history_turns.append(f"Khách: {content}")
            elif role == "assistant" or role == "model":
                history_turns.append(f"Trợ lý: {content}")

        if not history_turns:
            return ""

        return "=== LỊCH SỬ GẦN ĐÂY ===\n" + "\n".join(history_turns)

    def _build_prompt(
        self,
        user_message: str,
        context: str,
        history: list[dict],
        is_chitchat: bool
    ) -> str:
        prompt_parts = []

        now = datetime.now(timezone(timedelta(hours=7)))
        weekdays = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"]
        weekday_str = weekdays[now.isoweekday() % 7]
        time_str = f"Hôm nay là {weekday_str}, ngày {now.strftime('%d')} tháng {now.strftime('%m')} năm {now.strftime('%Y')}, giờ hiện tại khoảng {now.strftime('%H:%M')} (giờ Việt Nam)."

        prompt_parts.append(
            "=== NGÀY GIỜ HIỆN TẠI ===\n"
            + time_str
        )

        history_text = self._build_history(history)
        if history_text:
            prompt_parts.append(history_text)

        if context and context.strip():
            prompt_parts.append(
                "=== THÔNG TIN BẢO TÀNG TỪ RAG ===\n"
                + context.strip()
            )
        elif not is_chitchat:
            prompt_parts.append(
                "=== THÔNG TIN BẢO TÀNG TỪ RAG ===\n"
                "(Câu hỏi này không cần dữ liệu bảo tàng — nếu là kiến thức chung, "
                "hãy trả lời trực tiếp bằng hiểu biết của bạn theo mục 6 KIẾN THỨC "
                "CHUNG NGOÀI BẢO TÀNG trong SYSTEM ROLE. Chỉ dùng câu \"Mình chưa có "
                "thông tin này\" khi câu hỏi RÕ RÀNG về bảo tàng.)"
            )

        prompt_parts.append(
            "=== TIN NHẮN HIỆN TẠI ===\n"
            + user_message.strip()
        )

        prompt_parts.append(
            "Hãy trả lời người dùng một cách tự nhiên, ngắn gọn, "
            "đúng ngữ cảnh và tuân thủ SYSTEM ROLE."
        )

        return "\n\n".join(prompt_parts)

    # ── 1. Phương thức generate thông thường (không streaming) ─────────────

    async def generate_response(
        self,
        user_message: str,
        context: str = "",
        history: list[dict] = None,
        is_chitchat: bool = False,
        system_instruction: str = None,
        temperature: float = None,
    ) -> str:
        # C2: client None = loi ky thuat that (log ro, khong gia vo response rong).
        if self.client is None:
            print("[Gemini Error] client is None (chua cau hinh API key) — tech fallback.")
            return self._fallback_response(user_message, context)

        full_prompt = self._build_prompt(user_message, context, history, is_chitchat)

        try:
            print("[Gemini] Dang gui yeu cau...")
            response = await self._execute_with_fallback(
                contents=full_prompt,
                config=types.GenerateContentConfig(
                    system_instruction=system_instruction or SYSTEM_PROMPT,
                    temperature=temperature,
                    max_output_tokens=500,
                )
            )

            text = self._safe_text(response)
            if text:
                print("[Gemini] Nhan duoc cau tra loi.")
                return text

            # C1 tang 3 / C2: response rong (khong exception) — thu lai 1 lan
            # voi prompt toi gian truoc khi chot fallback.
            print("[Gemini] Response rong — thu lai 1 lan voi prompt toi gian.")
            retry_text = await self._minimal_retry_answer(user_message, history)
            if retry_text:
                return retry_text

        except Exception as e:
            print(f"[Gemini Error]: {e}")

        return self._fallback_response(user_message, context)

    async def generate_response_with_tools(
        self,
        user_message: str,
        context: str = "",
        history: list[dict] = None,
        is_chitchat: bool = False,
    ) -> str:
        """
        Sinh câu trả lời với hỗ trợ Function Calling (2-lượt).
        """
        from services.live_data_tools import execute_function_call

        if self.client is None:
            return self._fallback_response(user_message, context)

        full_prompt = self._build_prompt(user_message, context, history, is_chitchat)

        try:
            # --- LƯỢT 1: Gửi cho Gemini với tool declarations ---
            response = await self._execute_with_fallback(
                contents=full_prompt,
                config=types.GenerateContentConfig(
                    system_instruction=SYSTEM_PROMPT,
                    tools=[TOOL_DECLARATIONS],
                    tool_config=types.ToolConfig(
                        function_calling_config=types.FunctionCallingConfig(mode="ANY")
                    ),
                    max_output_tokens=500,
                )
            )

            # Kiểm tra xem Gemini có gọi function không
            function_calls = []
            if response.candidates:
                for part in response.candidates[0].content.parts:
                    if hasattr(part, "function_call") and part.function_call:
                        function_calls.append(part.function_call)

            if not function_calls and response.text:
                parsed_calls = self._extract_function_calls_from_text(response.text)
                if parsed_calls:
                    function_calls = parsed_calls
                    # Sửa lại content của model để API không văng lỗi 400 ở Lượt 2
                    response.candidates[0].content.parts = [
                        types.Part.from_function_call(name=fc.name, args=fc.args)
                        for fc in parsed_calls
                    ]

            if not function_calls:
                # Gemini không cần gọi function → trả lời trực tiếp
                if response.text:
                    return response.text.strip()
                return self._fallback_response(user_message, context)

            # --- LƯỢT 2: Thực thi function và gửi kết quả lại Gemini ---
            function_results_parts = []
            for fc in function_calls:
                fn_name = fc.name
                fn_args = dict(fc.args) if fc.args else {}
                print(f"[Gemini] Gọi function: {fn_name}({fn_args})")

                result_str = execute_function_call(fn_name, fn_args)
                
                function_results_parts.append(
                    types.Part.from_function_response(
                        name=fn_name,
                        response={"result": result_str}
                    )
                )

            # Tái tạo conversation để Gemini tổng hợp câu trả lời cuối cùng
            contents = [
                types.Content(role="user", parts=[types.Part.from_text(text=full_prompt)]),
                response.candidates[0].content,  # Phần Gemini gọi function
                types.Content(role="user", parts=function_results_parts),
            ]

            final_response = await self._execute_with_fallback(
                contents=contents,
                config=types.GenerateContentConfig(
                    system_instruction=SYSTEM_PROMPT,
                    max_output_tokens=500,
                )
            )

            if final_response and final_response.text:
                print("[Gemini] Nhận được câu trả lời cuối (sau function calling).")
                return final_response.text.strip()

            return self._fallback_response(user_message, context)

        except Exception as e:
            print(f"[Gemini Function Calling Error]: {e}")
            # Fallback sang generate thông thường
            return await self.generate_response(user_message, context, history, is_chitchat)
    # ── 3. Phương thức Streaming ────────────────────────────────────────────

    async def generate_response_stream(
        self,
        user_message: str,
        context: str = "",
        history: list[dict] = None,
        is_chitchat: bool = False,
        use_tools: bool = False,
        system_instruction: str = None,
        temperature: float = None,
    ):
        """
        Sinh câu trả lời dạng streaming (yield từng chunk).
        C3: neu first token cham hon STREAM_STATUS_DELAY_S thi yield
        {"status": "processing"} TRUOC de frontend hien trang thai.
        """
        from services.live_data_tools import execute_function_call

        if self.client is None:
            yield self._fallback_response(user_message, context)
            return

        full_prompt = self._build_prompt(user_message, context, history, is_chitchat)
        status_delay = float(settings.STREAM_STATUS_DELAY_S or 3.0)

        async def _stream_texts(agen):
            """Lay text tu stream chunk, bo qua chunk rong/ValueError.
            Dict events (stream_event, status) duoc pass-through nguyen ven.
            """
            async for ch in agen:
                if isinstance(ch, dict):
                    yield ch  # pass-through: stream_event, status...
                    continue
                try:
                    t = ch.text
                except ValueError:
                    t = ""
                except Exception:
                    t = ""
                if t:
                    yield t

        async def _with_status_notice(agen):
            """C3: cho first token toi da status_delay; qua han thi yield
            {"status": "processing"} truoc roi tiep tuc stream that."""
            it = agen.__aiter__()
            first_task = asyncio.ensure_future(it.__anext__())
            done, _ = await asyncio.wait([first_task], timeout=status_delay)
            if not done:
                yield {"status": "processing"}
                try:
                    first = await first_task
                except StopAsyncIteration:
                    return
                yield first
            else:
                try:
                    yield done.pop().result()
                except StopAsyncIteration:
                    return
            while True:
                try:
                    yield await it.__anext__()
                except StopAsyncIteration:
                    return

        try:
            has_yielded = False
            # L2b2: tran cho ca qua trinh stream + viet tiep (khong de treo).
            deadline_stream = time.monotonic() + float(settings.LLM_TOTAL_BUDGET_S or 30.0) + 30.0
            if use_tools:
                # Lượt 1: Kiểm tra xem Gemini có gọi function không (không stream)
                response = await self._execute_with_fallback(
                    contents=full_prompt,
                    config=types.GenerateContentConfig(
                        system_instruction=SYSTEM_PROMPT,
                        tools=[TOOL_DECLARATIONS],
                        tool_config=types.ToolConfig(
                            function_calling_config=types.FunctionCallingConfig(mode="ANY")
                        ),
                        max_output_tokens=1536,
                    )
                )

                function_calls = []
                if response.candidates:
                    for part in response.candidates[0].content.parts:
                        if hasattr(part, "function_call") and part.function_call:
                            function_calls.append(part.function_call)

                if not function_calls and response.text:
                    parsed_calls = self._extract_function_calls_from_text(response.text)
                    if parsed_calls:
                        function_calls = parsed_calls
                        # Sửa lại content của model để API không văng lỗi 400 ở Lượt 2
                        response.candidates[0].content.parts = [
                            types.Part.from_function_call(name=fc.name, args=fc.args)
                            for fc in parsed_calls
                        ]

                if function_calls:
                    # Thực thi functions
                    function_results_parts = []
                    for fc in function_calls:
                        fn_name = fc.name
                        fn_args = dict(fc.args) if fc.args else {}
                        print(f"[Gemini Stream] Gọi function: {fn_name}({fn_args})")
                        result_str = execute_function_call(fn_name, fn_args)
                        function_results_parts.append(
                            types.Part.from_function_response(
                                name=fn_name,
                                response={"result": result_str}
                            )
                        )

                    contents = [
                        types.Content(role="user", parts=[types.Part.from_text(text=full_prompt)]),
                        response.candidates[0].content,
                        types.Content(role="user", parts=function_results_parts),
                    ]
                    # Lượt 2: Stream câu trả lời cuối sau khi có kết quả function
                    async for item in _stream_texts(_with_status_notice(
                        self._stream_with_fallback(
                            contents=contents,
                            config=types.GenerateContentConfig(
                                system_instruction=SYSTEM_PROMPT,
                                max_output_tokens=500,
                            ),
                        )
                    )):
                        if isinstance(item, dict):
                            yield item
                            continue
                        has_yielded = True
                        yield item

                    if not has_yielded:
                        yield self._fallback_response(user_message, context)
                    return

                # Không có function call → stream câu trả lời Gemini đã sinh
                try:
                    text = response.text
                except ValueError:
                    text = ""
                text = text.strip() if text else ""
                if text:
                    has_yielded = True
                    yield text
                else:
                    yield self._fallback_response(user_message, context)
                return

            # Stream thông thường (không tools)
            # L2b2: max_output_tokens=1024 (cau dai khong bi cat o 500);
            # gap MAX_TOKENS thi goi tiep "viet tiep" toi da 1 lan.
            async def _plain_stream(prompt_text):
                async for item in _with_status_notice(
                    _stream_texts(
                        self._stream_with_fallback(
                            contents=prompt_text,
                            config=types.GenerateContentConfig(
                                system_instruction=system_instruction or SYSTEM_PROMPT,
                                temperature=temperature,
                                max_output_tokens=1024,
                            ),
                        )
                    )
                ):
                    yield item

            hit_max_tokens = False
            async for item in _plain_stream(full_prompt):
                if isinstance(item, dict):
                    if item.get("stream_event") == "max_tokens":
                        hit_max_tokens = True
                        continue
                    # C3: forward event trang thai cho caller (rag/main -> SSE)
                    status_event_seen = True
                    yield item
                    continue
                text = self._safe_text(item)
                if text:
                    has_yielded = True
                    yield text

            if hit_max_tokens and time.monotonic() < deadline_stream:
                # L2b2: model bi cat o MAX_TOKENS — yeu cau viet tiep.
                print("[Gemini Stream] MAX_TOKENS — yeu cau model viet tiep.")
                cont_prompt = (full_prompt + "\n\n(Hay viet tiep cau tra loi dang do, "
                               "bat dau ngay tu cho vua dung, khong lap lai.)")
                async for item in _plain_stream(cont_prompt):
                    if isinstance(item, dict):
                        if item.get("stream_event") == "max_tokens":
                            continue
                        yield item
                        continue
                    text = self._safe_text(item)
                    if text:
                        has_yielded = True
                        yield text

            if not has_yielded:
                # C1 tang 3 cho stream: thu minimal retry truoc khi chot fallback
                retry_text = await self._minimal_retry_answer(user_message, history)
                if retry_text:
                    has_yielded = True
                    yield retry_text
            if not has_yielded:
                yield self._fallback_response(user_message, context)

        except Exception as e:
            # L2b1: log day du khi stream loi — dac biet sau khi da yield
            # (la truong hop "cat cau" o frontend).
            import traceback
            print(f"[Gemini Stream Error] model/key hien tai: "
                  f"(Key {self.current_key_idx + 1}); da_yield={has_yielded}; loi: {e}")
            traceback.print_exc()
            if not has_yielded:
                yield self._fallback_response(user_message, context)
            else:
                # Bao hieu dut giua chung thay vi dong im lang (frontend giu text + nut Thu lai)
                yield {"status": "interrupted", "error": str(e)[:200]}

    # ── Nhom C helpers ──
    MINIMAL_SYSTEM = (
        "Ban la tro ly AI than thien cua Bao tang Quoc gia Viet Nam. "
        "Tra loi ngan gon, dung cau hoi. Kien thuc chung: tra loi thang. "
        "Cau ve bao tang thieu du lieu: noi khong co thong tin, goi y hoi le tan."
    )

    @staticmethod
    def _safe_text(response) -> str:
        # Neu da la string (da duoc trich tu _stream_texts), giu nguyen khoang trang cho stream chunk
        if isinstance(response, str):
            return response
        try:
            t = response.text if response is not None else ""
        except ValueError:
            return ""
        except Exception:
            return ""
        return (t or "").strip()

    async def _minimal_retry_answer(self, user_message: str, history=None) -> str:
        """C1 tang 3: thu lai 1 lan voi prompt toi gian khi response rong."""
        try:
            short_prompt = (
                "Cau hoi: " + (user_message or "").strip()[:500]
                + "\nTra loi ngan gon (toi da 3 cau)."
            )
            resp = await self._execute_with_fallback(
                contents=short_prompt,
                config=types.GenerateContentConfig(
                    system_instruction=self.MINIMAL_SYSTEM,
                    max_output_tokens=300,
                ),
            )
            return self._safe_text(resp)
        except Exception as e:
            print(f"[Gemini Minimal Retry Error]: {e}")
            return ""

    def _is_tech_error_fallback(self, user_message: str, context: str) -> bool:
        """C2: True khi fallback mang y nghia loi ky thuat that."""
        if self.client is None:
            return True
        if context and context.strip():
            return False
        return not matches_phrase(user_message, MUSEUM_KEYWORDS + REALTIME_KEYWORDS)

    def _extract_function_calls_from_text(self, text: str) -> list:
        """
        Khắc phục triệt để lỗi Gemini trả về JSON string thay vì object function_call
        bằng cách parse chuỗi văn bản nếu chứa thông tin function.
        """
        calls = []
        if not text:
            return calls

        class MockFunctionCall:
            def __init__(self, name, args):
                self.name = name
                self.args = args

        # 1. Tìm trong block markdown ```json ... ```
        pattern = r'```(?:json)?\s*(\{.*?\})\s*```'
        matches = re.finditer(pattern, text, re.DOTALL)
        for m in matches:
            try:
                data = json.loads(m.group(1))
                if "name" in data and "arguments" in data:
                    calls.append(MockFunctionCall(data["name"], data["arguments"]))
            except Exception:
                pass

        # 2. Nếu toàn bộ text là JSON thuần
        if not calls and text.strip().startswith("{") and text.strip().endswith("}"):
            try:
                data = json.loads(text.strip())
                if "name" in data and "arguments" in data:
                    calls.append(MockFunctionCall(data["name"], data["arguments"]))
            except Exception:
                pass

        return calls

    def _fallback_response(
        self,
        user_message: str,
        context: str = ""
    ) -> str:

        clean = user_message.lower().strip()
        words = clean.split()

        # 1. Trả thông tin RAG trước nếu có context hoặc câu hỏi có keyword bảo tàng
        if context and context.strip() or matches_phrase(user_message, MUSEUM_KEYWORDS + REALTIME_KEYWORDS):
            if context and context.strip():
                first_context = context.split("\n\n### ")
                first_document = first_context[0].strip()
                if not first_document.startswith("### "):
                    first_document = "### " + first_document
                return (
                    "Mình tìm thấy thông tin liên quan này "
                    "trong dữ liệu của bảo tàng:\n\n"
                    + first_document
                )

        # 2. Xử lý chào hỏi (chỉ khi câu ngắn <= 4 từ và khớp toàn bộ/phrase)
        if len(words) <= 4:
            if matches_phrase(user_message, ["chào", "hello", "hi", "hey"]):
                return "Chào bạn 👋 Hôm nay mình có thể giúp gì cho bạn?"

            if matches_phrase(user_message, ["cảm ơn", "cám ơn", "thanks", "thank"]):
                return "Không có gì nhé 😊 Rất vui được hỗ trợ bạn!"

            if matches_phrase(user_message, ["chán", "buồn"]):
                return (
                    "Vậy để mình tìm cách làm bạn đỡ chán nhé 😄 "
                    "Bạn muốn nghe một câu chuyện lịch sử thú vị "
                    "hay khám phá một hiện vật đặc biệt?"
                )

        return (
            "Mình đang gặp một chút gián đoạn khi kết nối với AI. "
            "Bạn thử hỏi lại mình sau một chút nhé! 😊"
        )


gemini_service = GeminiService()
