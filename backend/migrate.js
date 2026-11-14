require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const MIGRATIONS_DIR = path.join(__dirname, 'sql', 'migrations');

async function runMigrations() {
  console.log('🚀 Memulai migrasi database Be Rise Salon...\n');

  // Koneksi awal tanpa database untuk memastikan database ada
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true,
  });

  const dbName = process.env.DB_NAME || 'be_rise_salon';

  try {
    await conn.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    await conn.query(`USE \`${dbName}\`;`);

    // Buat tabel pencatat riwayat migrasi jika belum ada
    await conn.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Ambil daftar file migrasi yang sudah pernah dijalankan
    const [rows] = await conn.query('SELECT name FROM _migrations');
    const executed = new Set(rows.map((r) => r.name));

    // Baca direktori migrasi
    if (!fs.existsSync(MIGRATIONS_DIR)) {
      console.log('Direktori migrasi tidak ditemukan:', MIGRATIONS_DIR);
      return;
    }

    const files = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    let count = 0;
    for (const file of files) {
      if (executed.has(file)) {
        console.log(`  ⏭️  [Sudah] ${file}`);
        continue;
      }

      console.log(`  ⏳ [Menjalankan] ${file}...`);
      const filePath = path.join(MIGRATIONS_DIR, file);
      const sql = fs.readFileSync(filePath, 'utf-8');

      // Jalankan sql file
      await conn.query(sql);

      // Catat ke tabel _migrations
      await conn.query('INSERT INTO _migrations (name) VALUES (?)', [file]);
      console.log(`  ✅ [Selesai] ${file}`);
      count++;
    }

    console.log(`\n🎉 Migrasi selesai! Total migrasi baru yang diaplikasikan: ${count}`);
  } catch (err) {
    console.error('\n❌ Terjadi kesalahan saat migrasi:', err.message);
    process.exitCode = 1;
  } finally {
    await conn.end();
  }
}

runMigrations();

