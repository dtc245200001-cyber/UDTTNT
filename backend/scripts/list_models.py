import os
from google import genai
from dotenv import load_dotenv

load_dotenv('backend/.env')
key = os.getenv('GEMINI_API_KEYS', '').split(',')[0]
if not key:
    key = os.getenv('GEMINI_API_KEY', '')

client = genai.Client(api_key=key.strip())
for m in client.models.list():
    if 'generateContent' in m.supported_actions:
        print(m.name)
