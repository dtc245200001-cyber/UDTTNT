import os
import sys
import requests
import io
from PIL import Image

sys.stdout.reconfigure(encoding='utf-8')


# Thêm đường dẫn để import từ backend
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from dotenv import load_dotenv
load_dotenv()

from core.supabase_client import supabase_admin
from services.image_search import image_feature_extractor

def test_image_search():
    print("1. Đang lấy 3 hiện vật đầu tiên từ Database...")
    result = supabase_admin.table('hien_vat').select('id, name, image').limit(3).execute()
    artifacts = result.data
    
    if not artifacts:
        print("Không tìm thấy hiện vật nào trong CSDL.")
        return

    # Lấy hiện vật đầu tiên làm mẫu
    target = artifacts[0]
    print(f"-> Chọn hiện vật: {target['name']}")
    print(f"-> URL ảnh: {target['image']}")
    
    print("\n2. Đang tải ảnh từ Internet...")
    try:
        response = requests.get(target['image'], timeout=10)
        image_bytes = response.content
        print("-> Tải ảnh thành công!")
    except Exception as e:
        print(f"Lỗi tải ảnh: {e}")
        return

    print("\n3. Trích xuất đặc trưng (ResNet50)...")
    vector = image_feature_extractor.extract_feature(image_bytes)
    if not vector:
        print("Lỗi trích xuất đặc trưng!")
        return
    print(f"-> Trích xuất thành công! Vector có độ dài: {len(vector)}")

    print("\n4. Lưu vector vào Database để test (Update bảng hien_vat)...")
    # Cập nhật thử vector cho hiện vật đầu tiên
    supabase_admin.table('hien_vat').update({'image_vector': vector}).eq('id', target['id']).execute()
    print("-> Đã lưu vector vào CSDL thành công.")

    print("\n5. Thử nghiệm tìm kiếm bằng hàm RPC match_artifacts_image...")
    rpc_result = supabase_admin.rpc(
        "match_artifacts_image",
        {
            "query_embedding": vector,
            "match_threshold": 0.8,
            "match_count": 5,
        },
    ).execute()

    print("\n--- KẾT QUẢ TÌM KIẾM ---")
    if rpc_result.data:
        for item in rpc_result.data:
            similarity = item.get('similarity', 0) * 100
            print(f"- {item['name']} (Độ giống: {similarity:.2f}%)")
    else:
        print("Không tìm thấy kết quả phù hợp (hoặc hàm RPC lỗi).")

if __name__ == "__main__":
    test_image_search()
