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
  const user = { id: u.id, name: u.name, role: u.role, photo: u.photo || null };
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
app.get('/api/auth/profile', wrap(async (req, res) => {
  const [u] = await q('SELECT id, name, username, role, photo, is_active, created_at FROM users WHERE id = ?', [req.user.id]);
  res.json({ success: true, data: u || req.user });
}));

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
    if (query[f] !== undefined && query[f] !== '') {
      if (c.table === 'transactions' && f === 'status') {
        if (query.status === 'unpaid') {
          where.push("(status = 'unpaid' OR status = 'pending')");
        } else if (query.status === 'uncompleted') {
          where.push("(status = 'unpaid' OR status = 'pending' OR status = 'partial')");
        } else {
          where.push("status = ?");
          p.push(query.status);
        }
      } else {
        where.push(`${f} = ?`); p.push(query[f]);
      }
    }
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
    ownerWrite: true, fields: ['name', 'phone', 'position', 'photo', 'is_active'], required: ['name'],
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
    select: 'id, name, username, role, photo, is_active, created_at', ownerAll: true, password: true,
    fields: ['name', 'username', 'role', 'photo', 'is_active'], required: ['name', 'username', 'role'],
  },
  transactions: {
    table: 'transactions', search: ['invoice_no', 'customer_name', 'staff_names'], filters: ['payment_method', 'status'],
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
    const tax = Math.max(Number(req.body.tax) || 0, 0);
    const extra_fee = Math.max(Number(req.body.extra_fee) || 0, 0);
    const extra_fee_note = clean(req.body.extra_fee_note) || null;
    const total = Math.max(subtotal - discount + tax + extra_fee, 0);

    let customerName = 'Umum';
    if (req.body.customer_id) {
      const [[c]] = await conn.query('SELECT name FROM customers WHERE id = ?', [req.body.customer_id]);
      if (!c) throw fail(400, 'Pelanggan tidak ditemukan');
      customerName = c.name;
    }

    // Status & pembayaran:
    // instant_pay: boolean (default true)
    // Jika tidak langsung bayar: bisa belum bayar (paid_amount = 0) atau belum lunas (paid_amount > 0 tapi < total)
    const instantPay = req.body.instant_pay !== false && req.body.status !== 'pending' && req.body.status !== 'unpaid' && req.body.status !== 'partial';

    let paid_amount = 0;
    let status = 'paid';

    if (instantPay) {
      paid_amount = total;
      status = 'paid';
    } else {
      paid_amount = Math.max(Number(req.body.paid_amount) || 0, 0);
      if (paid_amount >= total && total > 0) {
        paid_amount = total;
        status = 'paid';
      } else if (paid_amount > 0) {
        status = 'partial'; // Belum Lunas
      } else {
        paid_amount = 0;
        status = req.body.status === 'pending' ? 'pending' : 'unpaid'; // Belum Bayar
      }
    }

    // Multi-staff support
    let staffIds = [];
    if (Array.isArray(req.body.staff_ids)) {
      staffIds = req.body.staff_ids.map(Number).filter((id) => id > 0);
    } else if (req.body.staff_id) {
      staffIds = [Number(req.body.staff_id)].filter((id) => id > 0);
    }
    // Deduplicate
    staffIds = [...new Set(staffIds)];

    let staffList = [];
    let staffNamesStr = null;
    let primaryStaffId = staffIds[0] || null;

    if (staffIds.length > 0) {
      const [fetchedStaff] = await conn.query(
        'SELECT id, name FROM staff WHERE id IN (?)',
        [staffIds]
      );
      staffList = fetchedStaff;
      staffNamesStr = staffList.map((s) => s.name).join(', ');
    }

    const txData = {
      invoice_no: 'TMP-' + Date.now(),
      customer_id: req.body.customer_id || null,
      customer_name: customerName,
      staff_id: primaryStaffId,
      staff_names: staffNamesStr,
      cashier_id: req.user.id,
      cashier_name: req.user.name,
      payment_method,
      subtotal,
      discount,
      tax,
      extra_fee,
      extra_fee_note,
      total,
      paid_amount,
      commission_total: commissionTotal,
      status,
      notes: clean(notes) || null,
    };

    if (req.body.created_at) {
      const d = new Date(req.body.created_at);
      if (!isNaN(d.getTime())) {
        txData.created_at = d.toISOString().slice(0, 19).replace('T', ' ');
      }
    }

    const [tx] = await conn.query('INSERT INTO transactions SET ?', [txData]);
    const invoice = `BRS-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(tx.insertId).padStart(5, '0')}`;
    await conn.query('UPDATE transactions SET invoice_no = ? WHERE id = ?', [invoice, tx.insertId]);
    await conn.query(
      'INSERT INTO transaction_items (transaction_id, item_id, item_name, price, qty, subtotal, commission) VALUES ?',
      [rows.map((r) => [tx.insertId, ...r.slice(1)])]
    );

    // Simpan ke transaction_staff & bagi rata komisi per staf
    if (staffList.length > 0) {
      const baseCom = Math.floor(commissionTotal / staffList.length);
      const rem = commissionTotal - (baseCom * staffList.length);
      const staffRows = staffList.map((s, idx) => [
        tx.insertId,
        s.id,
        s.name,
        baseCom + (idx === 0 ? rem : 0),
      ]);
      await conn.query(
        'INSERT INTO transaction_staff (transaction_id, staff_id, staff_name, commission) VALUES ?',
        [staffRows]
      );
    }

    await conn.commit();
    res.status(201).json({ success: true, data: { id: tx.insertId, invoice_no: invoice, status, total, paid_amount } });
  } catch (e) { await conn.rollback(); throw e; } finally { conn.release(); }
}));

app.get('/api/transactions/:id', wrap(async (req, res) => {
  const [tx] = req.params.id === 'last'
    ? await q("SELECT * FROM transactions WHERE status = 'paid' ORDER BY id DESC LIMIT 1")
    : await q('SELECT * FROM transactions WHERE id = ?', [req.params.id]);
  if (!tx) throw fail(404, 'Transaksi tidak ditemukan');
  tx.lines = await q('SELECT * FROM transaction_items WHERE transaction_id = ?', [tx.id]);
  const staffRows = await q('SELECT staff_id, staff_name, commission FROM transaction_staff WHERE transaction_id = ?', [tx.id]);
  if (staffRows.length > 0) {
    tx.staff = staffRows;
  } else if (tx.staff_id) {
    tx.staff = [{ staff_id: tx.staff_id, staff_name: tx.staff_names || tx.staff_name || 'Staff', commission: tx.commission_total }];
  } else {
    tx.staff = [];
  }
  res.json({ success: true, data: tx });
}));

// Bayar / lunasi transaksi (pending, unpaid, partial)
app.post('/api/transactions/:id/pay', wrap(async (req, res) => {
  const { payment_method = 'cash', notes = null } = req.body;
  if (!['cash', 'transfer', 'qris', 'debit'].includes(payment_method)) throw fail(400, 'Metode bayar tidak valid');
  const [tx] = await q("SELECT * FROM transactions WHERE id = ? AND status IN ('pending', 'unpaid', 'partial')", [req.params.id]);
  if (!tx) throw fail(404, 'Transaksi tidak ditemukan atau sudah lunas');

  const currentPaid = Number(tx.paid_amount || 0);
  const remaining = Math.max(Number(tx.total) - currentPaid, 0);

  // amount: nominal yang dibayarkan sekarang (default: seluruh sisa)
  const payNow = req.body.amount !== undefined ? Math.max(Number(req.body.amount) || 0, 0) : remaining;
  if (payNow <= 0 && remaining > 0) throw fail(400, 'Nominal pembayaran harus lebih besar dari 0');

  const newPaid = Math.min(currentPaid + payNow, Number(tx.total));
  const newStatus = newPaid >= Number(tx.total) ? 'paid' : 'partial';

  await q(
    "UPDATE transactions SET status = ?, paid_amount = ?, payment_method = ?, cashier_id = ?, cashier_name = ?, notes = COALESCE(?, notes) WHERE id = ?",
    [newStatus, newPaid, payment_method, req.user.id, req.user.name, clean(notes), tx.id]
  );
  res.json({
    success: true,
    data: {
      id: tx.id,
      invoice_no: tx.invoice_no,
      status: newStatus,
      paid_amount: newPaid,
      remaining: Math.max(Number(tx.total) - newPaid, 0),
    },
  });
}));

// Void transaksi (owner only lewat guard DELETE global) + kembalikan stok
app.delete('/api/transactions/:id', wrap(async (req, res) => {
  const r = await q("UPDATE transactions SET status = 'void' WHERE id = ? AND status IN ('paid', 'pending', 'unpaid', 'partial')", [req.params.id]);
  if (!r.affectedRows) throw fail(400, 'Transaksi tidak ditemukan atau sudah dibatalkan');
  await q("UPDATE items i JOIN transaction_items t ON t.item_id = i.id SET i.stock = i.stock + t.qty WHERE t.transaction_id = ? AND i.type = 'product'", [req.params.id]);
  res.json({ success: true });
}));

/* ---------- dashboard stats & staff commission ---------- */
app.get('/api/dashboard/stats', wrap(async (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const [todayTx] = await q(
    "SELECT COUNT(*) count, COALESCE(SUM(paid_amount), 0) total, COALESCE(SUM(commission_total), 0) commission FROM transactions WHERE status = 'paid' AND DATE(created_at) = ?",
    [today]
  );
  const [{ pendingCount }] = await q(
    "SELECT COUNT(*) pendingCount FROM transactions WHERE status IN ('pending', 'unpaid', 'partial')"
  );
  const [{ totalStaffCommission }] = await q(
    `SELECT COALESCE(SUM(ts.commission), 0) totalStaffCommission 
     FROM transaction_staff ts 
     JOIN transactions tx ON tx.id = ts.transaction_id 
     WHERE tx.status = 'paid'`
  );
  const staffCommissions = await q(
    `SELECT s.id, s.name, s.position, s.photo,
            COALESCE(SUM(CASE WHEN tx.id IS NOT NULL THEN ts.commission ELSE 0 END), 0) AS total_commission,
            COUNT(DISTINCT tx.id) AS transaction_count,
            COALESCE(SUM(CASE WHEN tx.id IS NOT NULL AND DATE(tx.created_at) = ? THEN ts.commission ELSE 0 END), 0) AS today_commission
     FROM staff s
     LEFT JOIN transaction_staff ts ON ts.staff_id = s.id
     LEFT JOIN transactions tx ON tx.id = ts.transaction_id AND tx.status = 'paid'
     WHERE s.is_active = 1
     GROUP BY s.id, s.name, s.position, s.photo
     ORDER BY total_commission DESC, s.name ASC`,
    [today]
  );
  res.json({
    success: true,
    data: {
      today: {
        sales: Number(todayTx?.total || 0),
        count: Number(todayTx?.count || 0),
        commission: Number(todayTx?.commission || 0),
      },
      pendingCount: Number(pendingCount || 0),
      totalStaffCommission: Number(totalStaffCommission || 0),
      staffCommissions: staffCommissions.map((s) => ({
        ...s,
        total_commission: Number(s.total_commission || 0),
        today_commission: Number(s.today_commission || 0),
        transaction_count: Number(s.transaction_count || 0),
      })),
    },
  });
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
  const byStaff = await q(
    `SELECT s.id, s.name, s.position, s.photo,
            COUNT(DISTINCT tx.id) AS transaction_count,
            COALESCE(SUM(CASE WHEN tx.id IS NOT NULL THEN tx.total ELSE 0 END), 0) AS total_sales,
            COALESCE(SUM(CASE WHEN tx.id IS NOT NULL THEN ts.commission ELSE 0 END), 0) AS total_commission
     FROM staff s
     LEFT JOIN transaction_staff ts ON ts.staff_id = s.id
     LEFT JOIN transactions tx ON tx.id = ts.transaction_id AND tx.status = 'paid' AND DATE(tx.created_at) BETWEEN ? AND ?
     WHERE s.is_active = 1
     GROUP BY s.id, s.name, s.position, s.photo
     ORDER BY total_commission DESC, total_sales DESC, s.name ASC`,
    [from, to]
  );
  res.json({
    success: true,
    data: {
      from,
      to,
      ...t,
      ...e,
      net: t.revenue - e.expenses - t.commission,
      byItem,
      byStaff,
    },
  });
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
  // Auto-migration columns
  try {
    const cols = await q("SHOW COLUMNS FROM staff LIKE 'photo'");
    if (!cols.length) await q("ALTER TABLE staff ADD COLUMN photo VARCHAR(255) NULL");
  } catch (e) { console.warn('Migration staff photo:', e.message); }

  try {
    const cols = await q("SHOW COLUMNS FROM users LIKE 'photo'");
    if (!cols.length) await q("ALTER TABLE users ADD COLUMN photo VARCHAR(255) NULL AFTER role");
  } catch (e) { console.warn('Migration users photo:', e.message); }

  try {
    await q("ALTER TABLE transactions MODIFY COLUMN status ENUM('paid','partial','unpaid','void','pending') NOT NULL DEFAULT 'paid'");
  } catch (e) { console.warn('Migration transactions status:', e.message); }

  try {
    const cols = await q("SHOW COLUMNS FROM transactions LIKE 'paid_amount'");
    if (!cols.length) {
      await q("ALTER TABLE transactions ADD COLUMN paid_amount DECIMAL(14,2) NOT NULL DEFAULT 0 AFTER total");
      await q("UPDATE transactions SET paid_amount = total WHERE status = 'paid'");
    }
  } catch (e) { console.warn('Migration transactions paid_amount:', e.message); }

  try {
    const cols = await q("SHOW COLUMNS FROM transactions LIKE 'tax'");
    if (!cols.length) await q("ALTER TABLE transactions ADD COLUMN tax DECIMAL(14,2) NOT NULL DEFAULT 0 AFTER discount");
  } catch (e) { console.warn('Migration transactions tax:', e.message); }

  try {
    const cols = await q("SHOW COLUMNS FROM transactions LIKE 'extra_fee'");
    if (!cols.length) {
      await q("ALTER TABLE transactions ADD COLUMN extra_fee DECIMAL(14,2) NOT NULL DEFAULT 0 AFTER tax");
      await q("ALTER TABLE transactions ADD COLUMN extra_fee_note VARCHAR(100) NULL AFTER extra_fee");
    }
  } catch (e) { console.warn('Migration transactions extra_fee:', e.message); }

  try {
    const cols = await q("SHOW COLUMNS FROM transactions LIKE 'staff_names'");
    if (!cols.length) await q("ALTER TABLE transactions ADD COLUMN staff_names VARCHAR(255) NULL AFTER staff_id");
  } catch (e) { console.warn('Migration transactions staff_names:', e.message); }

  try {
    await q(`CREATE TABLE IF NOT EXISTS transaction_staff (
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
    )`);
    await q(`
      INSERT INTO transaction_staff (transaction_id, staff_id, staff_name, commission)
      SELECT t.id, t.staff_id, s.name, t.commission_total
      FROM transactions t
      JOIN staff s ON s.id = t.staff_id
      LEFT JOIN transaction_staff ts ON ts.transaction_id = t.id AND ts.staff_id = t.staff_id
      WHERE t.staff_id IS NOT NULL AND ts.id IS NULL
    `);
  } catch (e) { console.warn('Migration transaction_staff table:', e.message); }

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
