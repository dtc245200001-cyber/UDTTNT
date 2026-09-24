import os
import sys
import requests
import io
import time
from PIL import Image

sys.stdout.reconfigure(encoding='utf-8')

# Thêm đường dẫn để import từ backend
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from dotenv import load_dotenv
load_dotenv()

from core.supabase_client import supabase_admin
from services.image_search import image_feature_extractor

def sync_all_image_vectors():
    print("=" * 50)
    print("BẮT ĐẦU ĐỒNG BỘ VECTOR HÌNH ẢNH (IMAGE SEARCH)")
    print("=" * 50)
    
    # Lấy tất cả các hiện vật có ảnh nhưng chưa có vector
    # Để an toàn không bị quá tải bộ nhớ, chúng ta dùng filter is.null
    print("Đang truy vấn các hiện vật cần xử lý...")
    result = supabase_admin.table('hien_vat').select('id, name, image').is_('image_vector', 'null').not_.is_('image', 'null').execute()
    artifacts = result.data
    
    total = len(artifacts)
    if total == 0:
        print("Tất cả hiện vật đều đã có vector hình ảnh. Đồng bộ hoàn tất!")
        return

    print(f"Tìm thấy {total} hiện vật cần tạo vector.")
    
    success_count = 0
    error_count = 0

    for i, target in enumerate(artifacts):
        print(f"[{i+1}/{total}] Xử lý: {target['name']} ({target['id']})")
        
        try:
            # Tải ảnh
            image_url = target.get('image')
            if not image_url or not image_url.startswith('http'):
                print(f"  -> Lỗi: URL ảnh không hợp lệ.")
                error_count += 1
                continue
                
            response = requests.get(image_url, timeout=10)
            if response.status_code != 200:
                print(f"  -> Lỗi tải ảnh: HTTP {response.status_code}")
                error_count += 1
                continue
                
            image_bytes = response.content
            
            # Trích xuất đặc trưng
            vector = image_feature_extractor.extract_feature(image_bytes)
            if not vector:
                print("  -> Lỗi: Trích xuất đặc trưng thất bại.")
                error_count += 1
                continue
                
            # Lưu vào Database
            supabase_admin.table('hien_vat').update({'image_vector': vector}).eq('id', target['id']).execute()
            print("  -> Thành công.")
            success_count += 1
            
            # Ngủ 0.5s để tránh quá tải Rate Limit
            time.sleep(0.5)
            
        except Exception as e:
            print(f"  -> Exception: {e}")
            error_count += 1

    print("=" * 50)
    print("ĐỒNG BỘ HOÀN TẤT!")
    print(f"Thành công: {success_count} | Lỗi/Bỏ qua: {error_count}")
    print("=" * 50)

if __name__ == "__main__":
    if image_feature_extractor is None:
        print("Không thể tải mô hình AI.")
    else:
        sync_all_image_vectors()
