-- =====================================================================
-- Migration: 002_add_staff_photo_and_transaction_pending.sql
-- Deskripsi :
--   1. Menambahkan kolom `photo` pada tabel `staff` untuk foto profil/avatar stylist
--   2. Memperbarui ENUM `status` pada tabel `transactions` menjadi ('paid', 'void', 'pending')
--      untuk mendukung fitur Menunggu Pembayaran (Hold Order POS)
-- Tanggal   : 2026-11-14
-- =====================================================================

USE be_rise_salon;

-- 1. Tambah kolom photo ke tabel staff (aman jika sudah ada atau belum ada)
SET @dbname = DATABASE();
SET @tablename = "staff";
SET @columnname = "photo";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      TABLE_SCHEMA = @dbname
      AND TABLE_NAME = @tablename
      AND COLUMN_NAME = @columnname
  ) > 0,
  "SELECT 1 /* Kolom photo sudah ada */",
  "ALTER TABLE staff ADD COLUMN photo VARCHAR(255) NULL AFTER position;"
));
PREPARE alterStaffPhoto FROM @preparedStatement;
EXECUTE alterStaffPhoto;
DEALLOCATE PREPARE alterStaffPhoto;

-- 2. Modifikasi kolom status transaksi untuk mendukung nilai 'pending'
ALTER TABLE transactions 
  MODIFY COLUMN status ENUM('paid','void','pending') NOT NULL DEFAULT 'paid';

