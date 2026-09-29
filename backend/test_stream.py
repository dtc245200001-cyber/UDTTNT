import sys
import asyncio
sys.path.append('d:/UDTTNT/backend')
from services.rag import rag_pipeline
from services.gemini import gemini_service

async def test():
    gemini_service._initialize_current_client()
    questions = [
        'Trống đồng',
        'Trống đồng Ngọc Lũ để ở đâu?',
        'Giá vé',
        'Xin chào',
        'Kể chi tiết hơn về trống đồng Ngọc Lũ',
        'Bảo tàng có bán vé máy bay không?'
    ]
    for q in questions:
        print('\n--- QUESTION:', q)
        stream = rag_pipeline.process_chat_stream(
            user_message=q,
            history=[]
        )
        full = ''
        async for chunk in stream:
            if isinstance(chunk, str):
                full += chunk
            else:
                print('YIELDED DICT:', chunk)
        
        words = len(full.split())
        sentences = len([s for s in full.split('.') if s.strip()])
        print('ANSWER:', full)
        print(f'[Stats] Words: {words}, Sentences: {sentences}')

asyncio.run(test())
