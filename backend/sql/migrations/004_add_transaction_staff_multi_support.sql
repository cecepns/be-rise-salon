-- =====================================================================
-- Migration: 004_add_transaction_staff_multi_support.sql
-- Deskripsi :
--   1. Menambahkan kolom `staff_names` pada tabel `transactions` untuk
--      menyimpan ringkasan nama pegawai (bisa lebih dari 1 orang).
--   2. Membuat tabel relasi `transaction_staff` untuk mencatat setiap pegawai
--      yang mengerjakan layanan/produk beserta bagi hasil komisinya.
--   3. Backfill data transaksi lama ke tabel `transaction_staff`.
-- Tanggal   : 2026-11-14
-- =====================================================================

USE be_rise_salon;

-- 1. Tambah kolom staff_names jika belum ada
SET @dbname = DATABASE();
SET @tablename = "transactions";
SET @col_staff_names = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'staff_names') > 0,
  "SELECT 1",
  "ALTER TABLE transactions ADD COLUMN staff_names VARCHAR(255) NULL AFTER staff_id;"
));
PREPARE stmt_staff_names FROM @col_staff_names;
EXECUTE stmt_staff_names;
DEALLOCATE PREPARE stmt_staff_names;

-- 2. Buat tabel relasi transaction_staff jika belum ada
CREATE TABLE IF NOT EXISTS transaction_staff (
  id INT AUTO_INCREMENT PRIMARY KEY,
  transaction_id INT NOT NULL,
  staff_id INT NOT NULL,
  staff_name VARCHAR(100) NOT NULL,
  commission DECIMAL(14,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX (transaction_id),
  INDEX (staff_id),
  FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
  FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE
);

-- 3. Backfill data untuk transaksi lama yang sudah memiliki staff_id
UPDATE transactions t 
JOIN staff s ON s.id = t.staff_id 
SET t.staff_names = s.name 
WHERE t.staff_id IS NOT NULL AND (t.staff_names IS NULL OR t.staff_names = '');

INSERT INTO transaction_staff (transaction_id, staff_id, staff_name, commission)
SELECT t.id, t.staff_id, s.name, t.commission_total
FROM transactions t
JOIN staff s ON s.id = t.staff_id
LEFT JOIN transaction_staff ts ON ts.transaction_id = t.id AND ts.staff_id = t.staff_id
WHERE t.staff_id IS NOT NULL AND ts.id IS NULL;
