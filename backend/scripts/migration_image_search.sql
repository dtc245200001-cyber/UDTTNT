-- 1. Bật extension vector nếu chưa có (thường dự án bạn đã bật rồi)
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Thêm cột image_vector vào bảng hien_vat (kích thước 2048 cho ResNet50)
ALTER TABLE public.hien_vat ADD COLUMN IF NOT EXISTS image_vector vector(2048);

-- (Bỏ phần tạo Index HNSW vì pgvector giới hạn HNSW tối đa 2000 chiều, 
-- ResNet50 là 2048 chiều. Với dữ liệu bảo tàng dưới 10,000 hiện vật, 
-- tìm kiếm không cần Index vẫn cực kỳ nhanh).

-- 3. Tạo hàm RPC (Remote Procedure Call) để tìm kiếm ảnh tương đồng
CREATE OR REPLACE FUNCTION match_artifacts_image(
    query_embedding vector(2048),
    match_threshold float DEFAULT 0.7,
    match_count int DEFAULT 5
)
RETURNS TABLE (
    id VARCHAR(50),
    name VARCHAR(500),
    image TEXT,
    similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        hv.id,
        hv.name,
        hv.image,
        1 - (hv.image_vector <=> query_embedding) AS similarity
    FROM hien_vat hv
    WHERE hv.image_vector IS NOT NULL
      AND 1 - (hv.image_vector <=> query_embedding) > match_threshold
    ORDER BY hv.image_vector <=> query_embedding
    LIMIT match_count;
END;
$$;
