# Be Rise Salon — PWA Kasir, Reservasi & Komisi

Stack: React + Vite + JSX + PWA + TailwindCSS + Lucide + react-hot-toast | Express + MySQL (REST).

## Menjalankan
```bash
# 1. Database
mysql -u root -p < backend/sql/database.sql

# 2. Backend
cd backend && cp .env.example .env   # isi DB_* dan JWT_SECRET
npm install && npm run dev           # http://localhost:5000

# 3. Frontend
cd frontend && cp .env.example .env
npm install && npm run dev           # http://localhost:5173
```
Login awal: `owner / owner123` (dibuat otomatis, kelola & tambah pegawai di menu **Manajemen User**).

## Aturan bisnis
- **Komisi per produk/layanan**: diatur di menu Layanan/Item (none / % dari harga / nominal per qty). Nilai komisi di-snapshot saat transaksi; rekap di **Laporan & Komisi**. Tidak ada komisi per karyawan.
- **Kasir**: bebas input & edit pelanggan, transaksi, pengeluaran, reservasi, tambah stok. **Semua DELETE/void hanya owner** (dijaga di backend lewat middleware global, bukan hanya disembunyikan di UI).
- Create/edit item, staff, akun hanya owner.
- Upload: endpoint `POST /api/upload` (gambar, maks 2MB) menyimpan ke `backend/uploads-be-rise-salon/`.

## Struktur
`frontend/src/{utils (endpoints, api, request), hooks, components, pages}` — endpoint API hanya didefinisikan di `utils/endpoints.js`.
# be-rise-salon
