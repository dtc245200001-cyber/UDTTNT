import sys
import asyncio
sys.path.append("d:/UDTTNT/backend")
from services.gemini import gemini_service

async def test():
    gemini_service._initialize_current_client()
    stream = gemini_service.generate_response_stream(
        user_message="Bạn đang có các loại vé nào",
        use_tools=True
    )
    async for chunk in stream:
        print("YIELDED:", repr(chunk))

asyncio.run(test())
