require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');

const app = express();
const UPLOAD_DIR = path.join(__dirname, 'uploads-be-rise-salon');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

app.use(cors({ origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : true }));
app.use(express.json({ limit: '1mb' }));
app.use('/uploads', express.static(UPLOAD_DIR));

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'be_rise_salon',
  waitForConnections: true, connectionLimit: 10,
  decimalNumbers: true, dateStrings: true,
});

/* ---------- helpers ---------- */
const q = async (sql, p = []) => (await pool.query(sql, p))[0];
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const fail = (status, message) => Object.assign(new Error(message), { status });
const clean = (v) => (typeof v === 'string' ? v.replace(/<[^>]*>/g, '').trim() : v);
const LIMITS = [10, 25, 50, 100];

const ownerOnly = (req, res, next) =>
  req.user.role === 'owner' ? next() : next(fail(403, 'Hanya owner yang boleh melakukan aksi ini'));

/* ---------- auth ---------- */
app.post('/api/auth/login', wrap(async (req, res) => {
  const username = clean(req.body.username), password = req.body.password;
  if (!username || !password) throw fail(400, 'Username dan password wajib diisi');
  const [u] = await q('SELECT * FROM users WHERE username = ? AND is_active = 1', [username]);
  if (!u || !(await bcrypt.compare(password, u.password_hash))) throw fail(401, 'Username atau password salah');
  const user = { id: u.id, name: u.name, role: u.role };
  const token = jwt.sign(user, process.env.JWT_SECRET || 'be-rise-salon-secret-key', { expiresIn: '12h' });
  res.json({ success: true, token, user });
}));

// Semua route di bawah wajib login. Semua DELETE WAJIB owner (aturan: kasir tidak bisa hapus apapun)
app.use('/api', (req, res, next) => {
  try {
    req.user = jwt.verify((req.headers.authorization || '').replace('Bearer ', ''), process.env.JWT_SECRET || 'be-rise-salon-secret-key');
    next();
  } catch { next(fail(401, 'Sesi berakhir, silakan login ulang')); }
});
app.use('/api', (req, res, next) => (req.method === 'DELETE' ? ownerOnly(req, res, next) : next()));
app.get('/api/auth/profile', (req, res) => res.json({ success: true, data: req.user }));

/* ---------- generic list (pagination, search, limit, sorting, filter) ---------- */
async function list(c, query) {
  const page = Math.max(parseInt(query.page) || 1, 1);
  const limit = LIMITS.includes(+query.limit) ? +query.limit : 10;
  const where = [], p = [];
  if (query.search) {
    where.push('(' + c.search.map((s) => `${s} LIKE ?`).join(' OR ') + ')');
    c.search.forEach(() => p.push(`%${query.search}%`));
  }
  for (const f of c.filters || []) {
    if (query[f] !== undefined && query[f] !== '') { where.push(`${f} = ?`); p.push(query[f]); }
  }
  const dc = c.dateCol || 'created_at';
  if (query.from) { where.push(`DATE(${dc}) >= ?`); p.push(query.from); }
  if (query.to) { where.push(`DATE(${dc}) <= ?`); p.push(query.to); }
  const sortBy = c.sort.includes(query.sortBy) ? query.sortBy : 'id';
  const order = query.order === 'asc' ? 'ASC' : 'DESC';
  const w = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const [{ total }] = await q(`SELECT COUNT(*) total FROM ${c.table} ${w}`, p);
  const data = await q(
    `SELECT ${c.select || '*'} FROM ${c.table} ${w} ORDER BY ${sortBy} ${order} LIMIT ? OFFSET ?`,
    [...p, limit, (page - 1) * limit]
  );
  return { success: true, data, pagination: { page, limit, total, totalPages: Math.max(Math.ceil(total / limit), 1) } };
}

async function build(c, body, isCreate) {
  const out = {};
  for (const f of c.fields) if (body[f] !== undefined) out[f] = body[f] === '' ? null : clean(body[f]);
  if (isCreate) for (const r of c.required) if (out[r] == null) throw fail(400, `Field "${r}" wajib diisi`);
  if (c.password) {
    if (body.password) {
      if (String(body.password).length < 6) throw fail(400, 'Password minimal 6 karakter');
      out.password_hash = await bcrypt.hash(String(body.password), 10);
    } else if (isCreate) throw fail(400, 'Password wajib diisi');
  }
  return out;
}

const R = {
  items: {
    table: 'items', search: ['name', 'category'], filters: ['type', 'category', 'is_active'],
    sort: ['id', 'name', 'price', 'stock', 'created_at'], ownerWrite: true,
    fields: ['name', 'type', 'category', 'price', 'cost', 'stock', 'commission_type', 'commission_value', 'is_active'],
    required: ['name', 'type', 'price'],
  },
  customers: {
    table: 'customers', search: ['name', 'phone', 'email'], sort: ['id', 'name', 'created_at'],
    fields: ['name', 'phone', 'email', 'address', 'notes'], required: ['name'],
  },
  staff: {
    table: 'staff', search: ['name', 'phone', 'position'], filters: ['is_active'], sort: ['id', 'name', 'created_at'],
    ownerWrite: true, fields: ['name', 'phone', 'position', 'is_active'], required: ['name'],
  },
  expenses: {
    table: 'expenses', search: ['title', 'category'], filters: ['category'], dateCol: 'expense_date',
    sort: ['id', 'amount', 'expense_date'], fields: ['title', 'category', 'amount', 'expense_date', 'notes'],
    required: ['title', 'amount', 'expense_date'],
  },
  reservations: {
    table: 'reservations', search: ['customer_name', 'phone'], filters: ['status', 'staff_id'], dateCol: 'reserved_at',
    sort: ['id', 'reserved_at', 'status'],
    select: `*, (SELECT name FROM staff WHERE id = reservations.staff_id) AS staff_name,
             (SELECT name FROM items WHERE id = reservations.item_id) AS item_name`,
    fields: ['customer_name', 'phone', 'item_id', 'staff_id', 'reserved_at', 'status', 'notes'],
    required: ['customer_name', 'reserved_at'],
  },
  users: {
    table: 'users', search: ['name', 'username'], filters: ['role'], sort: ['id', 'name', 'created_at'],
    select: 'id, name, username, role, is_active, created_at', ownerAll: true, password: true,
    fields: ['name', 'username', 'role', 'is_active'], required: ['name', 'username', 'role'],
  },
  transactions: {
    table: 'transactions', search: ['invoice_no', 'customer_name'], filters: ['payment_method', 'status'],
    sort: ['id', 'total', 'created_at'], readOnly: true,
  },
};

for (const [name, c] of Object.entries(R)) {
  const base = `/api/${name}`;
  const guardAll = c.ownerAll ? [ownerOnly] : [];
  const guardWrite = c.ownerWrite || c.ownerAll ? [ownerOnly] : [];
  app.get(base, ...guardAll, wrap(async (req, res) => res.json(await list(c, req.query))));
  if (c.readOnly) continue;
  app.post(base, ...guardWrite, wrap(async (req, res) => {
    const r = await q(`INSERT INTO ${c.table} SET ?`, [await build(c, req.body, true)]);
    res.status(201).json({ success: true, data: { id: r.insertId } });
  }));
  app.put(`${base}/:id`, ...guardWrite, wrap(async (req, res) => {
    const data = await build(c, req.body, false);
    if (!Object.keys(data).length) throw fail(400, 'Tidak ada data yang diubah');
    const r = await q(`UPDATE ${c.table} SET ? WHERE id = ?`, [data, req.params.id]);
    if (!r.affectedRows) throw fail(404, 'Data tidak ditemukan');
    res.json({ success: true });
  }));
  app.delete(`${base}/:id`, ...guardAll, wrap(async (req, res) => {
    if (name === 'users' && +req.params.id === req.user.id) throw fail(400, 'Tidak bisa menghapus akun sendiri');
    const r = await q(`DELETE FROM ${c.table} WHERE id = ?`, [req.params.id]);
    if (!r.affectedRows) throw fail(404, 'Data tidak ditemukan');
    res.json({ success: true });
  }));
}

/* ---------- stock ---------- */
app.post('/api/items/:id/stock', wrap(async (req, res) => {
  const qty = parseInt(req.body.qty);
  if (!qty) throw fail(400, 'Jumlah stok tidak valid');
  const r = await q("UPDATE items SET stock = stock + ? WHERE id = ? AND type = 'product' AND stock + ? >= 0", [qty, req.params.id, qty]);
  if (!r.affectedRows) throw fail(400, 'Produk tidak ditemukan atau stok tidak cukup');
  await q('INSERT INTO stock_logs SET ?', [{ item_id: req.params.id, qty, note: clean(req.body.note) || null, created_by: req.user.id }]);
  res.json({ success: true });
}));

/* ---------- transactions (kasir) ---------- */
app.post('/api/transactions', wrap(async (req, res) => {
  const { lines, payment_method = 'cash', notes = null } = req.body;
  if (!Array.isArray(lines) || !lines.length) throw fail(400, 'Keranjang kosong');
  if (!['cash', 'transfer', 'qris', 'debit'].includes(payment_method)) throw fail(400, 'Metode bayar tidak valid');
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    let subtotal = 0, commissionTotal = 0;
    const rows = [];
    for (const l of lines) {
      const qty = parseInt(l.qty);
      if (!(qty > 0)) throw fail(400, 'Qty tidak valid');
      const [[it]] = await conn.query('SELECT * FROM items WHERE id = ? AND is_active = 1 FOR UPDATE', [l.item_id]);
      if (!it) throw fail(400, 'Item tidak ditemukan / nonaktif');
      if (it.type === 'product') {
        if (it.stock < qty) throw fail(400, `Stok "${it.name}" tidak cukup`);
        await conn.query('UPDATE items SET stock = stock - ? WHERE id = ?', [qty, it.id]);
      }
      const sub = it.price * qty;
      // Komisi dihitung dari ITEM (bukan karyawan)
      const com = it.commission_type === 'percent' ? Math.round((sub * it.commission_value) / 100)
        : it.commission_type === 'fixed' ? Math.round(it.commission_value * qty) : 0;
      subtotal += sub; commissionTotal += com;
      rows.push([null, it.id, it.name, it.price, qty, sub, com]);
    }
    const discount = Math.min(Math.max(Number(req.body.discount) || 0, 0), subtotal);
    let customerName = 'Umum';
    if (req.body.customer_id) {
      const [[c]] = await conn.query('SELECT name FROM customers WHERE id = ?', [req.body.customer_id]);
      if (!c) throw fail(400, 'Pelanggan tidak ditemukan');
      customerName = c.name;
    }
    const [tx] = await conn.query('INSERT INTO transactions SET ?', [{
      invoice_no: 'TMP-' + Date.now(), customer_id: req.body.customer_id || null, customer_name: customerName,
      staff_id: req.body.staff_id || null, cashier_id: req.user.id, cashier_name: req.user.name,
      payment_method, subtotal, discount, total: subtotal - discount, commission_total: commissionTotal,
      notes: clean(notes) || null,
    }]);
    const invoice = `BRS-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(tx.insertId).padStart(5, '0')}`;
    await conn.query('UPDATE transactions SET invoice_no = ? WHERE id = ?', [invoice, tx.insertId]);
    await conn.query(
      'INSERT INTO transaction_items (transaction_id, item_id, item_name, price, qty, subtotal, commission) VALUES ?',
      [rows.map((r) => [tx.insertId, ...r.slice(1)])]
    );
    await conn.commit();
    res.status(201).json({ success: true, data: { id: tx.insertId, invoice_no: invoice } });
  } catch (e) { await conn.rollback(); throw e; } finally { conn.release(); }
}));

app.get('/api/transactions/:id', wrap(async (req, res) => {
  const [tx] = req.params.id === 'last'
    ? await q("SELECT * FROM transactions WHERE status = 'paid' ORDER BY id DESC LIMIT 1")
    : await q('SELECT * FROM transactions WHERE id = ?', [req.params.id]);
  if (!tx) throw fail(404, 'Transaksi tidak ditemukan');
  tx.lines = await q('SELECT * FROM transaction_items WHERE transaction_id = ?', [tx.id]);
  res.json({ success: true, data: tx });
}));

// Void transaksi (owner only lewat guard DELETE global) + kembalikan stok
app.delete('/api/transactions/:id', wrap(async (req, res) => {
  const r = await q("UPDATE transactions SET status = 'void' WHERE id = ? AND status = 'paid'", [req.params.id]);
  if (!r.affectedRows) throw fail(400, 'Transaksi tidak ditemukan atau sudah void');
  await q("UPDATE items i JOIN transaction_items t ON t.item_id = i.id SET i.stock = i.stock + t.qty WHERE t.transaction_id = ? AND i.type = 'product'", [req.params.id]);
  res.json({ success: true });
}));

/* ---------- reports (owner) ---------- */
app.get('/api/reports/summary', ownerOnly, wrap(async (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const from = req.query.from || today.slice(0, 8) + '01', to = req.query.to || today;
  const [t] = await q(
    `SELECT COUNT(*) count, COALESCE(SUM(total),0) revenue, COALESCE(SUM(commission_total),0) commission
     FROM transactions WHERE status = 'paid' AND DATE(created_at) BETWEEN ? AND ?`, [from, to]);
  const [e] = await q('SELECT COALESCE(SUM(amount),0) expenses FROM expenses WHERE expense_date BETWEEN ? AND ?', [from, to]);
  const byItem = await q(
    `SELECT ti.item_name, SUM(ti.qty) qty, SUM(ti.subtotal) revenue, SUM(ti.commission) commission
     FROM transaction_items ti JOIN transactions tx ON tx.id = ti.transaction_id
     WHERE tx.status = 'paid' AND DATE(tx.created_at) BETWEEN ? AND ?
     GROUP BY ti.item_id, ti.item_name ORDER BY commission DESC, revenue DESC`, [from, to]);
  res.json({ success: true, data: { from, to, ...t, ...e, net: t.revenue - e.expenses - t.commission, byItem } });
}));

/* ---------- settings ---------- */
const SETTING_KEYS = ['salon_name', 'address', 'phone', 'receipt_footer'];
app.get('/api/settings', wrap(async (req, res) => {
  const rows = await q('SELECT * FROM settings');
  res.json({ success: true, data: Object.fromEntries(rows.map((r) => [r.key_name, r.setting_value])) });
}));
app.put('/api/settings', ownerOnly, wrap(async (req, res) => {
  const rows = SETTING_KEYS.filter((k) => req.body[k] !== undefined).map((k) => [k, clean(req.body[k])]);
  if (rows.length) await q('INSERT INTO settings (key_name, setting_value) VALUES ? ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)', [rows]);
  res.json({ success: true });
}));

/* ---------- secure upload (gambar saja, maks 2MB) ---------- */
const EXT = { 'image/png': '.png', 'image/jpeg': '.jpg', 'image/webp': '.webp' };
const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (r, f, cb) => cb(null, `${Date.now()}-${Math.round(Math.random() * 1e6)}${EXT[f.mimetype]}`),
  }),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (r, f, cb) => (EXT[f.mimetype] ? cb(null, true) : cb(fail(400, 'Hanya gambar PNG/JPG/WEBP'))),
});
app.post('/api/upload', upload.single('file'), (req, res, next) => {
  if (!req.file) return next(fail(400, 'File wajib diisi'));
  res.json({ success: true, data: { url: `/uploads/${req.file.filename}` } });
});

/* ---------- error handler ---------- */
app.use((err, req, res, next) => { // eslint-disable-line
  const map = {
    ER_DUP_ENTRY: [409, 'Data sudah ada (duplikat)'],
    ER_ROW_IS_REFERENCED_2: [409, 'Data masih dipakai oleh data lain'],
    ER_NO_REFERENCED_ROW_2: [400, 'Referensi data tidak valid'],
    LIMIT_FILE_SIZE: [400, 'File terlalu besar (maks 2MB)'],
  };
  const [status, message] = map[err.code] || (err.status ? [err.status, err.message] : [500, 'Terjadi kesalahan pada server']);
  if (status === 500) console.error(err);
  res.status(status).json({ success: false, message });
});

/* ---------- boot ---------- */
(async () => {
  const [{ n }] = await q('SELECT COUNT(*) n FROM users');
  if (!n) {
    await q('INSERT INTO users SET ?', [{
      name: 'Owner', role: 'owner', username: process.env.OWNER_USERNAME || 'owner',
      password_hash: await bcrypt.hash(process.env.OWNER_PASSWORD || 'owner123', 10),
    }]);
    console.log('Akun owner awal dibuat. Kelola akun pegawai di menu Manajemen User.');
  }
  app.listen(process.env.PORT || 5000, () => console.log(`Be Rise Salon API :${process.env.PORT || 5000}`));
})().catch((e) => { console.error('Gagal start:', e.message); process.exit(1); });
