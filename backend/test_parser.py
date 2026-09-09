import sys
sys.path.append("d:/UDTTNT/backend")
from services.gemini import gemini_service

text = """
```json
{
"name": "get_ve_gia_va_con_cho",
"arguments": {}
}
```
"""
calls = gemini_service._extract_function_calls_from_text(text)
print("Extracted:", calls)
if calls:
    print("Name:", calls[0].name)
    print("Args:", dict(calls[0].args) if calls[0].args else {})
