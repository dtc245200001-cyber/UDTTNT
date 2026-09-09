import sys
sys.path.append("d:/UDTTNT/backend")
import asyncio
from services.gemini import gemini_service
from google.genai import types

async def test():
    config = types.GenerateContentConfig(
        tools=[gemini_service._execute_with_fallback.__globals__['TOOL_DECLARATIONS']],
        tool_config=types.ToolConfig(
            function_calling_config=types.FunctionCallingConfig(mode="ANY")
        ),
        max_output_tokens=1536,
    )
    gemini_service._initialize_current_client()
    
    stream = await gemini_service.client.aio.models.generate_content_stream(
        model="gemini-3.5-flash",
        contents="Bạn đang có các loại vé nào?",
        config=config
    )
    
    async for chunk in stream:
        print("CHUNK:", chunk)

asyncio.run(test())
