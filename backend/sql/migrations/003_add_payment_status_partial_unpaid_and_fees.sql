-- =====================================================================
-- Migration: 003_add_payment_status_partial_unpaid_and_fees.sql
-- Deskripsi :
--   1. Memperluas ENUM status transaksi: 'paid', 'partial', 'unpaid', 'void', 'pending'
--      - 'paid'    : Selesai (Lunas)
--      - 'partial' : Belum Lunas (Bayar sebagian / ada sisa)
--      - 'unpaid'  : Belum Bayar (Belum ada pembayaran sama sekali / DP 0)
--      - 'void'    : Dibatalkan
--      - 'pending' : Menunggu Pembayaran (kompatibilitas lama)
--   2. Menambahkan kolom paid_amount (jumlah yang sudah dibayar)
--   3. Menambahkan kolom tax (PPN)
--   4. Menambahkan kolom extra_fee (Biaya Tambahan) dan extra_fee_note
-- Tanggal   : 2026-11-14
-- =====================================================================

USE be_rise_salon;

-- 1. Modifikasi ENUM status pada tabel transactions
ALTER TABLE transactions 
  MODIFY COLUMN status ENUM('paid','partial','unpaid','void','pending') NOT NULL DEFAULT 'paid';

-- 2. Tambah kolom paid_amount jika belum ada
SET @dbname = DATABASE();
SET @tablename = "transactions";

SET @col_paid_amount = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'paid_amount') > 0,
  "SELECT 1",
  "ALTER TABLE transactions ADD COLUMN paid_amount DECIMAL(14,2) NOT NULL DEFAULT 0 AFTER total;"
));
PREPARE stmt_paid FROM @col_paid_amount;
EXECUTE stmt_paid;
DEALLOCATE PREPARE stmt_paid;

-- 3. Tambah kolom tax (PPN) jika belum ada
SET @col_tax = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'tax') > 0,
  "SELECT 1",
  "ALTER TABLE transactions ADD COLUMN tax DECIMAL(14,2) NOT NULL DEFAULT 0 AFTER discount;"
));
PREPARE stmt_tax FROM @col_tax;
EXECUTE stmt_tax;
DEALLOCATE PREPARE stmt_tax;

-- 4. Tambah kolom extra_fee jika belum ada
SET @col_extra = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'extra_fee') > 0,
  "SELECT 1",
  "ALTER TABLE transactions ADD COLUMN extra_fee DECIMAL(14,2) NOT NULL DEFAULT 0 AFTER tax;"
));
PREPARE stmt_extra FROM @col_extra;
EXECUTE stmt_extra;
DEALLOCATE PREPARE stmt_extra;

-- 5. Tambah kolom extra_fee_note jika belum ada
SET @col_extra_note = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'extra_fee_note') > 0,
  "SELECT 1",
  "ALTER TABLE transactions ADD COLUMN extra_fee_note VARCHAR(100) NULL AFTER extra_fee;"
));
PREPARE stmt_extra_note FROM @col_extra_note;
EXECUTE stmt_extra_note;
DEALLOCATE PREPARE stmt_extra_note;

-- 6. Update data lama: jika status 'paid', pastikan paid_amount terisi sama dengan total
UPDATE transactions SET paid_amount = total WHERE status = 'paid' AND (paid_amount IS NULL OR paid_amount = 0);
