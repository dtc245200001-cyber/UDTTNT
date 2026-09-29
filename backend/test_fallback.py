import asyncio
from services.gemini import gemini_service
from services.rag import rag_pipeline

async def test_all():
    print("--- TEST is_conversational_chitchat ---")
    test_cases_chit = [
        ("toi muon tim hieu ve trong dong cua bao tang", False),
        ("trong dong", False),
        ("Toi muon dat ve tham quan", False),
        ("xin chao", True),
        ("hi", True),
        ("chào bạn", True),
        ("hello", True),
        ("hey", True),
        ("cảm ơn", True),
        ("thanks", True),
        ("thi cu", False),
        ("nghi le", False),
        ("vui long cho biet gio mo cua", False),
        ("hieu biet ve gom", False),
        ("tim hieu ve thanh guom", False)
    ]
    
    for text, expected in test_cases_chit:
        res = rag_pipeline.is_conversational_chitchat(text, [])
        status = "✅" if res == expected else "❌"
        print(f"{status} '{text}' -> {res} (Expected: {expected})")


    print("\n--- TEST _fallback_response ---")
    test_cases_fallback = [
        ("toi muon tim hieu ve trong dong cua bao tang", "", False),
        ("hi", "", True), # True means it should be a greeting
        ("thi cu", "", False),
        ("cảm ơn", "", True),
    ]

    for text, ctx, should_be_greeting in test_cases_fallback:
        res = gemini_service._fallback_response(text, ctx)
        is_greeting = "Chào bạn" in res or "Không có gì" in res
        status = "✅" if is_greeting == should_be_greeting else "❌"
        print(f"{status} '{text}' -> Is Greeting: {is_greeting} (Expected: {should_be_greeting})")
        
    print("\n--- TEST _fallback_response WITH CONTEXT ---")
    # Even if it's a greeting, if it has a context, or if it's an error + context
    res1 = gemini_service._fallback_response("hi", context="### Trống đồng Đông Sơn\nĐây là trống đồng.")
    # Because 'hi' is <= 4 words, wait! The logic in fallback:
    # 1. Trả thông tin RAG trước nếu có context hoặc câu hỏi có keyword bảo tàng
    # So if there is context, it should return context.
    print(f"Fallback with 'hi' and context -> {res1[:40]}...")
    
if __name__ == "__main__":
    asyncio.run(test_all())
