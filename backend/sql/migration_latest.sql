-- =====================================================================
-- File Migrasi SQL Be Rise Salon (Update Lengkap Terbaru)
-- File ini dapat di-import langsung di phpMyAdmin, DBeaver, atau MySQL CLI:
--   mysql -u root -p be_rise_salon < backend/sql/migration_latest.sql
-- =====================================================================

USE be_rise_salon;

-- 1. Tambah kolom photo pada tabel staff (jika belum ada)
SET @staff_photo_exists := (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'staff' 
    AND COLUMN_NAME = 'photo'
);

SET @sql_staff_photo := IF(
  @staff_photo_exists = 0,
  'ALTER TABLE staff ADD COLUMN photo VARCHAR(255) NULL AFTER position;',
  'SELECT "Kolom photo pada tabel staff sudah ada";'
);
PREPARE stmt_photo FROM @sql_staff_photo;
EXECUTE stmt_photo;
DEALLOCATE PREPARE stmt_photo;

-- 2. Modifikasi kolom status transaksi untuk mendukung status lengkap:
--    'paid' (Selesai), 'partial' (Belum Lunas), 'unpaid' (Belum Bayar), 'void' (Dibatalkan), 'pending'
ALTER TABLE transactions 
  MODIFY COLUMN status ENUM('paid','partial','unpaid','void','pending') NOT NULL DEFAULT 'paid';

-- 3. Tambahkan kolom paid_amount (jumlah yang sudah dibayar)
SET @paid_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'transactions' AND COLUMN_NAME = 'paid_amount');
SET @sql_paid := IF(@paid_exists = 0, 'ALTER TABLE transactions ADD COLUMN paid_amount DECIMAL(14,2) NOT NULL DEFAULT 0 AFTER total;', 'SELECT 1;');
PREPARE stmt_paid FROM @sql_paid;
EXECUTE stmt_paid;
DEALLOCATE PREPARE stmt_paid;

-- 4. Tambahkan kolom tax (PPN)
SET @tax_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'transactions' AND COLUMN_NAME = 'tax');
SET @sql_tax := IF(@tax_exists = 0, 'ALTER TABLE transactions ADD COLUMN tax DECIMAL(14,2) NOT NULL DEFAULT 0 AFTER discount;', 'SELECT 1;');
PREPARE stmt_tax FROM @sql_tax;
EXECUTE stmt_tax;
DEALLOCATE PREPARE stmt_tax;

-- 5. Tambahkan kolom extra_fee (Biaya Tambahan) dan extra_fee_note
SET @fee_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'transactions' AND COLUMN_NAME = 'extra_fee');
SET @sql_fee := IF(@fee_exists = 0, 'ALTER TABLE transactions ADD COLUMN extra_fee DECIMAL(14,2) NOT NULL DEFAULT 0 AFTER tax;', 'SELECT 1;');
PREPARE stmt_fee FROM @sql_fee;
EXECUTE stmt_fee;
DEALLOCATE PREPARE stmt_fee;

SET @note_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'transactions' AND COLUMN_NAME = 'extra_fee_note');
SET @sql_note := IF(@note_exists = 0, 'ALTER TABLE transactions ADD COLUMN extra_fee_note VARCHAR(100) NULL AFTER extra_fee;', 'SELECT 1;');
PREPARE stmt_note FROM @sql_note;
EXECUTE stmt_note;
DEALLOCATE PREPARE stmt_note;

-- 6. Update data transaksi lama: jika status 'paid', pastikan paid_amount = total
UPDATE transactions SET paid_amount = total WHERE status = 'paid' AND (paid_amount IS NULL OR paid_amount = 0);
