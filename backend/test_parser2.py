import sys
sys.path.append("d:/UDTTNT/backend")
from google.genai import types

fc_part = types.Part.from_function_call(name="get_ve_gia_va_con_cho", args={})
print(fc_part)
