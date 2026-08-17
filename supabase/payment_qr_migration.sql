-- Migration: Tích hợp Thanh toán mã QR và Vé Điện tử cho Bảo tàng Quốc gia Việt Nam
-- File: supabase/payment_qr_migration.sql

-- 1. Cập nhật bổ sung các cột cho bảng dat_ve nếu chưa có
ALTER TABLE dat_ve ADD COLUMN IF NOT EXISTS total_price NUMERIC;
ALTER TABLE dat_ve ADD COLUMN IF NOT EXISTS qr_code TEXT;
ALTER TABLE dat_ve ADD COLUMN IF NOT EXISTS payment_status VARCHAR(100) DEFAULT 'Chờ thanh toán';
ALTER TABLE dat_ve ADD COLUMN IF NOT EXISTS payment_ref VARCHAR(100);
ALTER TABLE dat_ve ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

-- 2. Tạo bảng thanh_toan lưu vết các giao dịch QR thanh toán
CREATE TABLE IF NOT EXISTS thanh_toan (
    id VARCHAR(100) PRIMARY KEY,
    booking_id VARCHAR(100) REFERENCES dat_ve(id) ON DELETE CASCADE,
    order_code VARCHAR(100) UNIQUE NOT NULL,
    amount NUMERIC NOT NULL,
    payment_method VARCHAR(100) NOT NULL DEFAULT 'QR thanh toán',
    bank_id VARCHAR(50),
    account_no VARCHAR(100),
    account_name VARCHAR(255),
    transfer_content VARCHAR(255),
    status VARCHAR(100) DEFAULT 'Chờ thanh toán',
    transaction_ref VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    paid_at TIMESTAMPTZ
);

-- 3. Tạo bảng ve_dientu lưu thông tin vé tham quan sau khi thanh toán thành công
CREATE TABLE IF NOT EXISTS ve_dientu (
    id VARCHAR(100) PRIMARY KEY,
    booking_id VARCHAR(100) REFERENCES dat_ve(id) ON DELETE CASCADE,
    ticket_code VARCHAR(100) UNIQUE NOT NULL,
    ticket_type VARCHAR(255) NOT NULL,
    visit_date DATE NOT NULL,
    visitor_name VARCHAR(255) NOT NULL,
    status VARCHAR(100) DEFAULT 'Có hiệu lực',
    qr_ticket_data TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tạo Indexes phục vụ tra cứu nhanh
CREATE INDEX IF NOT EXISTS idx_thanh_toan_booking ON thanh_toan(booking_id);
CREATE INDEX IF NOT EXISTS idx_thanh_toan_order_code ON thanh_toan(order_code);
CREATE INDEX IF NOT EXISTS idx_ve_dientu_booking ON ve_dientu(booking_id);

-- 5. Bật Row Level Security (RLS)
ALTER TABLE thanh_toan ENABLE ROW LEVEL SECURITY;
ALTER TABLE ve_dientu ENABLE ROW LEVEL SECURITY;

-- Policy cho thanh_toan
DROP POLICY IF EXISTS "Public read thanh_toan" ON thanh_toan;
CREATE POLICY "Public read thanh_toan" ON thanh_toan FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public insert/update thanh_toan" ON thanh_toan;
CREATE POLICY "Public insert/update thanh_toan" ON thanh_toan FOR ALL USING (true) WITH CHECK (true);

-- Policy cho ve_dientu
DROP POLICY IF EXISTS "Public read ve_dientu" ON ve_dientu;
CREATE POLICY "Public read ve_dientu" ON ve_dientu FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public insert/update ve_dientu" ON ve_dientu;
CREATE POLICY "Public insert/update ve_dientu" ON ve_dientu FOR ALL USING (true) WITH CHECK (true);
