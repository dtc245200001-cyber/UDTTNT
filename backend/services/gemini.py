"""
Gemini Service — Xử lý sinh câu trả lời với RAG, Function Calling và Streaming.
SDK: google-genai (from google import genai)
Model: gemini-2.5-flash

Không sử dụng bất kỳ tool nào có phí riêng:
  ❌ Google Search Grounding
  ❌ google_search / google_search_retrieval
  ❌ url_context / code_execution / grounding_maps
  ✅ Function Calling thông thường (chỉ tính token)
"""
import os
import time
import asyncio
import json
import re
from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()

# Lấy tên model từ biến môi trường, mặc định dùng 3.5-flash
MODEL_NAME = os.getenv("GEMINI_MODEL_NAME", "gemini-3.5-flash")

SYSTEM_PROMPT = """Bạn là "Trợ lý AI Bảo tàng Quốc gia Việt Nam".

Bạn không phải chatbot FAQ. Bạn là một trợ lý AI có khả năng trò chuyện tự nhiên với người dùng, duy trì ngữ cảnh và sử dụng kiến thức bảo tàng khi cần.

========================
1. PHONG CÁCH GIAO TIẾP
========================

Hãy giao tiếp như một trợ lý thân thiện đang trò chuyện trực tiếp với người dùng.

Luôn:
- Tự nhiên.
- Thân thiện.
- Dễ hiểu.
- Linh hoạt theo cách nói của người dùng.
- Có cảm xúc vừa phải.
- Không trả lời máy móc.
- Không lặp lại câu mở đầu.
- Không phải câu nào cũng cần nhắc đến bảo tàng.
- Không phải câu nào cũng cần cung cấp kiến thức.
- Có thể dùng emoji phù hợp nhưng không lạm dụng.

========================
2. TRÒ CHUYỆN TỰ NHIÊN
========================

Bạn có thể trò chuyện với người dùng về các chủ đề thông thường.

Ví dụ:

User: "Xin chào"
AI: "Chào bạn 👋 Hôm nay mình có thể giúp gì cho bạn?"

User: "Hôm nay tôi hơi chán."
AI: "Vậy để mình tìm cách làm bạn đỡ chán nhé 😄 Bạn muốn nghe một câu chuyện thú vị hay khám phá một hiện vật đặc biệt?"

Không tự động biến mọi cuộc trò chuyện thành câu hỏi về bảo tàng.

========================
3. DUY TRÌ NGỮ CẢNH
========================

Luôn sử dụng lịch sử cuộc trò chuyện được cung cấp.

Đặc biệt phải hiểu các câu ngắn như: "nó", "cái đó", "cái này", "còn cái kia?",
"vậy à?", "thế còn...", "có gì thú vị?", "kể thêm đi", "tại sao?", "ở đâu?".

Không yêu cầu người dùng lặp lại thông tin mà họ đã cung cấp.

========================
4. SỬ DỤNG RAG (DỮ LIỆU TĨNH)
========================

Khi được cung cấp RAG CONTEXT, hãy ưu tiên thông tin trong RAG.

RAG được dùng cho:
- Hiện vật (tên, niên đại, chất liệu, nguồn gốc, lịch sử, vị trí trưng bày).
- Triển lãm (tên, chủ đề, mô tả).
- Phòng trưng bày, bài viết, danh mục.
- Thông tin tổng quan về bảo tàng.

========================
5. FUNCTION CALLING (DỮ LIỆU REAL-TIME)
========================

Bạn CÓ KHẢ NĂNG gọi các function nội bộ để lấy dữ liệu thời gian thực — đây là
function calling thông thường, KHÔNG phải Google Search, KHÔNG phát sinh phí riêng.

Hãy chủ động gọi function khi câu hỏi liên quan đến:
- Giá vé, loại vé → gọi get_ve_gia_va_con_cho()
- Sự kiện sắp tới, sự kiện hôm nay, lịch sự kiện → gọi get_su_kien_sap_dien_ra()
- Triển lãm đang diễn ra, triển lãm hiện tại → gọi get_trien_lam_dang_dien_ra()
- "Hiện vật này được đánh giá thế nào", điểm đánh giá → gọi get_danh_gia_trung_binh(object_id)
- Số lượng hiện vật, có bao nhiêu hiện vật/triển lãm/sự kiện, thống kê bảo tàng → gọi get_thong_ke_tong_quan()

========================
6. QUY TẮC TUYỆT ĐỐI — KHÔNG BỊA SỐ LIỆU
========================

**ĐÂY LÀ QUY TẮC QUAN TRỌNG NHẤT. KHÔNG ĐƯỢC VI PHẠM.**

Với bất kỳ câu hỏi nào về SỐ LƯỢNG hoặc THỐNG KÊ:
- "Bảo tàng có bao nhiêu hiện vật?"
- "Có bao nhiêu triển lãm?"
- "Bảo tàng đang trưng bày bao nhiêu sản phẩm?"

→ LUÔN LUÔN gọi get_thong_ke_tong_quan() TRƯỚC, rồi dùng số liệu từ kết quả.
→ TUYỆT ĐỐI KHÔNG tự bịa, ước tính, hay nói "khoảng X" mà không có dữ liệu thật.
→ Nếu function trả về lỗi, hãy nói thật: "Mình không thể truy xuất số liệu chính xác lúc này."

KHÔNG gọi function nếu câu hỏi là chào hỏi, tâm sự, hoặc câu hỏi chung không
liên quan đến dữ liệu bảo tàng (tránh tốn token oan).

========================
7. KIẾN THỨC CHUNG NGOÀI BẢO TÀNG
========================

Với câu hỏi kiến thức chung (lịch sử, khoa học, văn hóa...) KHÔNG liên quan trực
tiếp đến bảo tàng, hãy trả lời bằng kiến thức nội tại của bạn — không cần gọi
function hay RAG.

========================
8. KHÔNG BỊA THÔNG TIN
========================

Nếu người dùng hỏi thông tin cụ thể về bảo tàng nhưng RAG và function đều không
cung cấp:
- Không được tự bịa.
- Hãy nói rằng bạn chưa tìm thấy thông tin chính xác trong dữ liệu hiện có.

========================
9. CÁCH TRẢ LỜI
========================

- Câu hỏi đơn giản → trả lời ngắn.
- Câu hỏi cần giải thích → giải thích rõ ràng.
- Người dùng muốn trò chuyện → trò chuyện tự nhiên.
- Không nói "theo RAG", "RAG cho biết", "database cho biết".
- Không trả nguyên văn toàn bộ dữ liệu RAG cho người dùng.
- Khi có nhiều tài liệu RAG, chỉ dùng những phần thực sự liên quan.
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
        self._setup_client()

    def _setup_client(self):
        keys_str = os.getenv("GEMINI_API_KEYS", "")
        if not keys_str:
            keys_str = os.getenv("GEMINI_API_KEY", "")

        self.api_keys = [k.strip() for k in keys_str.split(",") if k.strip() and k.strip() != "YOUR_GEMINI_API_KEY_HERE"]

        if not self.api_keys:
            print("[Gemini] Chưa cấu hình GEMINI_API_KEY hoặc GEMINI_API_KEYS")
            return

        self._initialize_current_client()

    def _initialize_current_client(self):
        if not self.api_keys:
            return

        current_key = self.api_keys[self.current_key_idx]
        try:
            self.client = genai.Client(api_key=current_key)
            print(f"[Gemini] Client đã sẵn sàng với key {self.current_key_idx + 1}/{len(self.api_keys)}: {MODEL_NAME}")
        except Exception as e:
            print(f"[Gemini] Không thể khởi tạo client với key {self.current_key_idx + 1}: {e}")
            self.client = None

    def _switch_api_key(self):
        if len(self.api_keys) > 1:
            self.current_key_idx = (self.current_key_idx + 1) % len(self.api_keys)
            print(f"[Gemini] Đổi sang API Key {self.current_key_idx + 1}/{len(self.api_keys)}...")
            self._initialize_current_client()

    def _get_thinking_config(self, model_name: str) -> types.ThinkingConfig | None:
        try:
            if "gemini-3" in model_name:
                return types.ThinkingConfig(thinking_level=types.ThinkingLevel.LOW)
            else:
                return types.ThinkingConfig(thinking_budget=0)
        except Exception:
            # print(f"[Gemini] Lỗi cấu hình thinking_config cho model {model_name}: {e}")
            return None

    def _inject_thinking_config(self, kwargs: dict, model_name: str):
        thinking_config = self._get_thinking_config(model_name)
        if thinking_config:
            if 'config' in kwargs and kwargs['config'] is not None:
                kwargs['config'].thinking_config = thinking_config
            else:
                kwargs['config'] = types.GenerateContentConfig(thinking_config=thinking_config)

    async def _execute_with_fallback(self, **kwargs):
        models_to_try = [MODEL_NAME, "gemini-3.6-flash", "gemini-3.5-flash-lite"]
        seen = set()
        models = [x for x in models_to_try if not (x in seen or seen.add(x))]
        
        last_exception = None
        
        for model in models:
            for _ in range(max(1, len(self.api_keys))):
                try:
                    kwargs['model'] = model
                    self._inject_thinking_config(kwargs, model)
                    
                    t0 = time.perf_counter()
                    response = await asyncio.wait_for(
                        self.client.aio.models.generate_content(**kwargs),
                        timeout=15.0
                    )
                    t1 = time.perf_counter()
                    print(f"[Gemini] Model {model} trả lời sau {t1 - t0:.2f}s")
                    
                    return response
                except asyncio.TimeoutError:
                    print(f"[Gemini] Model {model} (Key {self.current_key_idx + 1}) lỗi Timeout (15s)")
                    last_exception = asyncio.TimeoutError(f"Model {model} timed out after 15s")
                    if len(self.api_keys) > 1:
                        print("[Gemini] Timeout! Chuyển API Key...")
                        self._switch_api_key()
                        continue
                    break
                except Exception as e:
                    print(f"[Gemini] Model {model} (Key {self.current_key_idx + 1}) lỗi: {e}")
                    last_exception = e
                    
                    error_str = str(e).lower()
                    if "429" in error_str or "quota" in error_str or "exhausted" in error_str or "503" in error_str:
                        if len(self.api_keys) > 1:
                            print("[Gemini] Hết Quota/Quá tải! Chuyển API Key...")
                            self._switch_api_key()
                            continue
                    break
                    
        raise last_exception

    async def _stream_with_fallback(self, **kwargs):
        models_to_try = [MODEL_NAME, "gemini-3.6-flash", "gemini-3.5-flash-lite"]
        seen = set()
        models = [x for x in models_to_try if not (x in seen or seen.add(x))]
        
        last_exception = None
        
        for model in models:
            for _ in range(max(1, len(self.api_keys))):
                try:
                    kwargs['model'] = model
                    self._inject_thinking_config(kwargs, model)
                    
                    t0 = time.perf_counter()
                    raw_stream = await asyncio.wait_for(
                        self.client.aio.models.generate_content_stream(**kwargs),
                        timeout=15.0
                    )
                    t1 = time.perf_counter()
                    print(f"[Gemini Stream] Model {model} bắt đầu trả lời sau {t1 - t0:.2f}s")
                    
                    async for chunk in raw_stream:
                        yield chunk
                    return
                    
                except asyncio.TimeoutError:
                    print(f"[Gemini Stream] Model {model} (Key {self.current_key_idx + 1}) lỗi Timeout (15s)")
                    last_exception = asyncio.TimeoutError(f"Model {model} stream timed out after 15s")
                    if len(self.api_keys) > 1:
                        print("[Gemini Stream] Timeout! Chuyển API Key...")
                        self._switch_api_key()
                        continue
                    break
                except Exception as e:
                    print(f"[Gemini Stream] Model {model} (Key {self.current_key_idx + 1}) lỗi: {e}")
                    last_exception = e
                    
                    error_str = str(e).lower()
                    if "429" in error_str or "quota" in error_str or "exhausted" in error_str or "503" in error_str:
                        if len(self.api_keys) > 1:
                            print("[Gemini Stream] Hết Quota/Quá tải! Chuyển API Key...")
                            self._switch_api_key()
                            continue
                    break
                    
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
                "hãy trả lời trực tiếp bằng hiểu biết của bạn theo mục 7 KIẾN THỨC "
                "CHUNG NGOÀI BẢO TÀNG trong SYSTEM ROLE.)"
            )

        prompt_parts.append(
            "=== TIN NHẮN HIỆN TẠI ===\n"
            + user_message.strip()
        )

        prompt_parts.append(
            "Hãy trả lời người dùng một cách tự nhiên, "
            "đúng ngữ cảnh và tuân thủ SYSTEM ROLE."
        )

        return "\n\n".join(prompt_parts)

    # ── 1. Phương thức generate thông thường (không streaming) ─────────────

    async def generate_response(
        self,
        user_message: str,
        context: str = "",
        history: list[dict] = None,
        is_chitchat: bool = False
    ) -> str:
        if self.client is None:
            return self._fallback_response(user_message, context)

        full_prompt = self._build_prompt(user_message, context, history, is_chitchat)

        try:
            print("[Gemini] Đang gửi yêu cầu (không retry MAX_RETRIES bên ngoài)...")
            response = await self._execute_with_fallback(
                contents=full_prompt,
                config=types.GenerateContentConfig(
                    system_instruction=SYSTEM_PROMPT,
                    max_output_tokens=1536,
                )
            )

            if response and response.text:
                print("[Gemini] Nhận được câu trả lời.")
                return response.text.strip()

        except Exception as e:
            print(f"[Gemini Error]: {e}")

        return self._fallback_response(user_message, context)

    # ── 2. Phương thức generate với Function Calling (2-lượt) ──────────────

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
                    max_output_tokens=1536,
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
                    max_output_tokens=1536,
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
    ):
        """
        Sinh câu trả lời dạng streaming (yield từng chunk).
        """
        from services.live_data_tools import execute_function_call

        if self.client is None:
            yield self._fallback_response(user_message, context)
            return

        full_prompt = self._build_prompt(user_message, context, history, is_chitchat)

        try:
            has_yielded = False
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
                    async for chunk in self._stream_with_fallback(
                        contents=contents,
                        config=types.GenerateContentConfig(
                            system_instruction=SYSTEM_PROMPT,
                            max_output_tokens=1536,
                        )
                    ):
                        try:
                            text = chunk.text
                        except ValueError:
                            text = ""
                        if text:
                            has_yielded = True
                            yield text
                            
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
            async for chunk in self._stream_with_fallback(
                contents=full_prompt,
                config=types.GenerateContentConfig(
                    system_instruction=SYSTEM_PROMPT,
                    max_output_tokens=1536,
                )
            ):
                try:
                    text = chunk.text
                except ValueError:
                    text = ""
                if text:
                    has_yielded = True
                    yield text
                    
            if not has_yielded:
                yield self._fallback_response(user_message, context)

        except Exception as e:
            print(f"[Gemini Stream Error]: {e}")
            if not has_yielded:
                yield self._fallback_response(user_message, context)

    # ── Fallback ────────────────────────────────────────────────────────────

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

        if any(word in clean for word in ["chào", "hello", "hi", "hey"]):
            return "Chào bạn 👋 Hôm nay mình có thể giúp gì cho bạn?"

        if any(word in clean for word in ["cảm ơn", "cám ơn", "thanks", "thank"]):
            return "Không có gì nhé 😊 Rất vui được hỗ trợ bạn!"

        if any(word in clean for word in ["chán", "buồn"]):
            return (
                "Vậy để mình tìm cách làm bạn đỡ chán nhé 😄 "
                "Bạn muốn nghe một câu chuyện lịch sử thú vị "
                "hay khám phá một hiện vật đặc biệt?"
            )

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

        return (
            "Mình đang gặp một chút gián đoạn khi kết nối với AI. "
            "Bạn thử hỏi lại mình sau một chút nhé! 😊"
        )


gemini_service = GeminiService()
