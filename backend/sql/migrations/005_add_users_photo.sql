-- =====================================================================
-- Migration: 005_add_users_photo.sql
-- Deskripsi : Menambahkan kolom `photo` pada tabel `users` untuk menyimpan
--             foto profil pengguna (kasir dan owner).
-- Tanggal   : 2026-11-14
-- =====================================================================

USE be_rise_salon;

SET @dbname = DATABASE();
SET @tablename = "users";
SET @col_user_photo = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'photo') > 0,
  "SELECT 1",
  "ALTER TABLE users ADD COLUMN photo VARCHAR(255) NULL AFTER role;"
));
PREPARE stmt_user_photo FROM @col_user_photo;
EXECUTE stmt_user_photo;
DEALLOCATE PREPARE stmt_user_photo;
