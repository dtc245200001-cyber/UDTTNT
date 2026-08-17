-- Supabase SQL Migration: Counter Payment & QR Check-in System
-- Description: Adds schema fields for counter payments, check-in status, timestamps, staff audit, and HMAC QR signatures.

-- 1. Alter dat_ve table to add counter payment & check-in fields
ALTER TABLE dat_ve 
ADD COLUMN IF NOT EXISTS order_code VARCHAR(50) UNIQUE,
ADD COLUMN IF NOT EXISTS payment_method VARCHAR(20) DEFAULT 'online_qr',
ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS checkin_status VARCHAR(20) DEFAULT 'not_checked_in',
ADD COLUMN IF NOT EXISTS checkin_at TIMESTAMPTZ NULL,
ADD COLUMN IF NOT EXISTS checked_in_by VARCHAR(100) NULL,
ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ NULL,
ADD COLUMN IF NOT EXISTS confirmed_by VARCHAR(100) NULL,
ADD COLUMN IF NOT EXISTS visit_date DATE NULL,
ADD COLUMN IF NOT EXISTS qr_expire_at TIMESTAMPTZ NULL,
ADD COLUMN IF NOT EXISTS qr_signature TEXT NULL;

-- 2. Create indexes for high-speed scanning & check-in lookup
CREATE INDEX IF NOT EXISTS idx_dat_ve_order_code ON dat_ve(order_code);
CREATE INDEX IF NOT EXISTS idx_dat_ve_checkin_status ON dat_ve(checkin_status);
CREATE INDEX IF NOT EXISTS idx_dat_ve_payment_status ON dat_ve(payment_status);

-- 3. RLS Policy updates for Staff & Admin check-in operations
ALTER TABLE dat_ve ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view dat_ve" ON dat_ve;
CREATE POLICY "Public can view dat_ve" ON dat_ve FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public can insert dat_ve" ON dat_ve;
CREATE POLICY "Public can insert dat_ve" ON dat_ve FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Staff can update checkin status" ON dat_ve;
CREATE POLICY "Staff can update checkin status" ON dat_ve FOR UPDATE USING (true);
