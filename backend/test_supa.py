import sys
import os

# Đảm bảo đường dẫn import từ backend
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, CURRENT_DIR)

from core.supabase_client import supabase_admin

try:
    ptb = supabase_admin.table('phong_trung_bay').select('*').execute()
    print("phong_trung_bay count:", len(ptb.data))
    if ptb.data:
        print("sample phong_trung_bay:", ptb.data[0])
    
    hv = supabase_admin.table('hien_vat').select('*').execute()
    print("hien_vat count:", len(hv.data))
    if hv.data:
        print("sample hien_vat:", hv.data[0])
except Exception as e:
    print("Error:", e)
