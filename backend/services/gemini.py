import os
import time
from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()

MODEL_NAME = "gemini-3.6-flash"
MAX_RETRIES = 3

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

User: "Cảm ơn bạn."
AI: "Không có gì nhé 😊"

Không tự động biến mọi cuộc trò chuyện thành câu hỏi về bảo tàng.

========================
3. DUY TRÌ NGỮ CẢNH
========================

Luôn sử dụng lịch sử cuộc trò chuyện được cung cấp.

Đặc biệt phải hiểu các câu ngắn như:
- "nó"
- "cái đó"
- "cái này"
- "còn cái kia?"
- "vậy à?"
- "thế còn..."
- "có gì thú vị?"
- "kể thêm đi"
- "tại sao?"
- "ở đâu?"
- "cái nào hay hơn?"
- "tôi thích cái này"
- "giới thiệu một cái đi"

Không yêu cầu người dùng lặp lại thông tin mà họ đã cung cấp.

========================
4. SỬ DỤNG RAG
========================

Khi được cung cấp RAG CONTEXT, hãy ưu tiên thông tin trong RAG.

RAG được dùng cho các thông tin cần chính xác từ dữ liệu bảo tàng như:
- Hiện vật.
- Tên hiện vật.
- Niên đại.
- Thời kỳ.
- Triều đại.
- Chất liệu.
- Nguồn gốc.
- Lịch sử.
- Triển lãm.
- Sự kiện.
- Địa điểm.
- Giờ mở cửa.
- Giá vé.
- Chính sách.
- Các thông tin khác có trong cơ sở dữ liệu bảo tàng.

========================
5. KHÔNG BỊA THÔNG TIN
========================

Nếu người dùng hỏi thông tin cụ thể về bảo tàng nhưng RAG không cung cấp thông tin đó:

- Không được tự bịa.
- Không được tự suy đoán thành sự thật.
- Hãy nói rằng bạn chưa tìm thấy thông tin chính xác trong dữ liệu hiện có.

========================
6. KẾT HỢP HỘI THOẠI VÀ RAG
========================

Nếu người dùng đang trò chuyện và sau đó hỏi về bảo tàng, hãy kết hợp:
- Lịch sử hội thoại.
- Sở thích của người dùng.
- Tin nhắn hiện tại.
- RAG CONTEXT.

Nếu người dùng dùng đại từ như "nó", "cái đó", "cái này", hãy dựa vào lịch sử hội thoại để xác định đối tượng.

========================
7. CÁCH TRẢ LỜI
========================

- Câu hỏi đơn giản → trả lời ngắn.
- Câu hỏi cần giải thích → giải thích rõ ràng.
- Người dùng muốn trò chuyện → trò chuyện tự nhiên.
- Người dùng muốn tìm hiểu sâu → cung cấp nhiều thông tin hơn.
- Không đọc lại toàn bộ RAG CONTEXT.
- Chỉ lấy thông tin cần thiết.
- Không nói "theo RAG", "RAG cho biết", "database cho biết".
- Không trả nguyên văn toàn bộ dữ liệu RAG cho người dùng.
- Khi có nhiều tài liệu RAG, chỉ sử dụng những phần thực sự liên quan đến câu hỏi.

========================
8. MỤC TIÊU
========================

Ưu tiên theo thứ tự:

1. Hiểu người dùng muốn gì.
2. Hiểu ngữ cảnh trước đó.
3. Trò chuyện tự nhiên.
4. Sử dụng RAG khi cần.
5. Đảm bảo thông tin bảo tàng chính xác.
6. Không bịa thông tin.
7. Không biến mọi cuộc trò chuyện thành câu hỏi về bảo tàng.
"""


class GeminiService:

    def __init__(self):
        self.client = None
        self._setup_client()

    def _setup_client(self):
        api_key = os.getenv("GEMINI_API_KEY", "").strip()

        if not api_key or api_key == "YOUR_GEMINI_API_KEY_HERE":
            print("[Gemini] Chưa cấu hình GEMINI_API_KEY")
            return

        try:
            self.client = genai.Client(api_key=api_key)
            print(f"[Gemini] Client đã sẵn sàng: {MODEL_NAME}")
        except Exception as e:
            print(f"[Gemini] Không thể khởi tạo client: {e}")
            self.client = None

    def _build_history(self, history):

        if not history:
            return ""

        history_turns = []

        for item in history[-8:]:

            role = item.get("role", "user")

            content = item.get(
                "content",
                item.get("text", "")
            )

            if not content:
                continue

            content = str(content).strip()

            if not content:
                continue

            if role in ["assistant", "ai", "model"]:
                role_name = "AI"
            else:
                role_name = "User"

            history_turns.append(
                f"{role_name}: {content}"
            )

        return "\n".join(history_turns)

    def generate_response(
        self,
        user_message: str,
        context: str = "",
        history: list[dict] = None,
        is_chitchat: bool = False
    ) -> str:

        if self.client is None:
            return self._fallback_response(
                user_message,
                context
            )

        history_text = self._build_history(history)

        prompt_parts = []

        if history_text:
            prompt_parts.append(
                "=== LỊCH SỬ CUỘC TRÒ CHUYỆN ===\n"
                + history_text
            )

        if context and context.strip():

            prompt_parts.append(
                "=== THÔNG TIN BẢO TÀNG TỪ RAG ===\n"
                + context.strip()
            )

        elif not is_chitchat:

            prompt_parts.append(
                "=== THÔNG TIN BẢO TÀNG TỪ RAG ===\n"
                "(Không tìm thấy tài liệu phù hợp trong cơ sở dữ liệu.)"
            )

        prompt_parts.append(
            "=== TIN NHẮN HIỆN TẠI ===\n"
            + user_message.strip()
        )

        prompt_parts.append(
            "Hãy trả lời người dùng một cách tự nhiên, "
            "đúng ngữ cảnh và tuân thủ SYSTEM ROLE."
        )

        full_prompt = "\n\n".join(prompt_parts)

        last_error = None

        # Thử tối đa 3 lần nếu Gemini tạm thời quá tải
        for attempt in range(1, MAX_RETRIES + 1):

            try:

                print(
                    f"[Gemini] Đang gửi yêu cầu "
                    f"(lần {attempt}/{MAX_RETRIES})..."
                )

                response = self.client.models.generate_content(
                    model=MODEL_NAME,
                    contents=full_prompt,
                    config=types.GenerateContentConfig(
    system_instruction=SYSTEM_PROMPT,
    thinking_config=types.ThinkingConfig(
        thinking_level="minimal"
    ),
    max_output_tokens=1536,
)
                )

                if response and response.text:

                    print("[Gemini] Nhận được câu trả lời.")

                    return response.text.strip()

                last_error = "Gemini không trả về nội dung."

            except Exception as e:

                last_error = e

                error_text = str(e)

                print(
                    f"[Gemini Error - lần {attempt}/{MAX_RETRIES}]: "
                    f"{error_text}"
                )

                # Chỉ retry các lỗi tạm thời
                temporary_errors = [
                    "503",
                    "UNAVAILABLE",
                    "429",
                    "RESOURCE_EXHAUSTED",
                    "500",
                    "INTERNAL"
                ]

                is_temporary = any(
                    error in error_text.upper()
                    for error in temporary_errors
                )

                if not is_temporary:
                    break

                if attempt < MAX_RETRIES:

                    wait_time = attempt * 2

                    print(
                        f"[Gemini] Lỗi tạm thời. "
                        f"Thử lại sau {wait_time} giây..."
                    )

                    time.sleep(wait_time)

        print(
            f"[Gemini] Không thể nhận câu trả lời sau "
            f"{MAX_RETRIES} lần thử."
        )

        return self._fallback_response(
            user_message,
            context
        )

    def _fallback_response(
        self,
        user_message: str,
        context: str = ""
    ) -> str:

        clean = user_message.lower().strip()

        if any(
            word in clean
            for word in ["chào", "hello", "hi", "hey"]
        ):
            return "Chào bạn 👋 Hôm nay mình có thể giúp gì cho bạn?"

        if any(
            word in clean
            for word in ["cảm ơn", "cám ơn", "thanks", "thank"]
        ):
            return "Không có gì nhé 😊 Rất vui được hỗ trợ bạn!"

        if any(
            word in clean
            for word in ["chán", "buồn"]
        ):
            return (
                "Vậy để mình tìm cách làm bạn đỡ chán nhé 😄 "
                "Bạn muốn nghe một câu chuyện lịch sử thú vị "
                "hay khám phá một hiện vật đặc biệt?"
            )

        # Nếu Gemini lỗi nhưng có RAG context,
        # chỉ lấy tài liệu đầu tiên thay vì trả toàn bộ database.
        if context and context.strip():

            first_context = context.split("\n\n### ")

            first_document = first_context[0].strip()

            if not first_document.startswith("### "):
                first_document = (
                    "### " + first_document
                )

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