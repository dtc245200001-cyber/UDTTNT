import os
from dotenv import load_dotenv
from google import genai

load_dotenv()

api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    print("❌ Không tìm thấy GEMINI_API_KEY")
    exit()

print("✅ Đã đọc được API key")

client = genai.Client(api_key=api_key)

try:
    response = client.models.generate_content(
        model="gemini-3.6-flash",
        contents="Xin chào! Hãy trả lời bằng tiếng Việt và giới thiệu ngắn gọn bạn là ai."
    )

    print("\n========== GEMINI RESPONSE ==========")
    print(response.text)
    print("=====================================")

except Exception as e:
    print("\n❌ LỖI KHI GỌI GEMINI:")
    print(type(e).__name__)
    print(e)