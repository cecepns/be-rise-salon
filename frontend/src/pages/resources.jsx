import { Printer, Ban, Scissors, Package, Crown, Briefcase } from 'lucide-react';
import CrudPage from '@/components/CrudPage';
import { Badge } from '@/components/ui';
import { confirmToast } from '@/utils/confirm';
import { request } from '@/utils/request';
import { API_ENDPOINTS as E } from '@/utils/endpoints';
import { rupiah, dateTime, dateOnly } from '@/utils/format';

const ACTIVE = [{ value: 1, label: 'Aktif' }, { value: 0, label: 'Nonaktif' }];
const activeCol = {
  key: 'is_active',
  label: 'Status',
  render: (r) => <Badge tone={r.is_active ? 'green' : 'stone'}>{r.is_active ? 'Aktif' : 'Nonaktif'}</Badge>,
};

/* ---- Layanan / Item (komisi diatur di sini, per item) ---- */
const commissionText = (r) =>
  r.commission_type === 'percent' ? `${r.commission_value}%` : r.commission_type === 'fixed' ? `${rupiah(r.commission_value)} / qty` : '-';

export const ItemsPage = () => (
  <CrudPage
    title="Layanan / Item"
    subtitle="Kelola daftar layanan perawatan dan produk yang dijual beserta komisi per item"
    endpoint={E.ITEMS}
    ownerWrite
    filter={{ key: 'type', label: 'Semua jenis', options: [{ value: 'service', label: 'Layanan' }, { value: 'product', label: 'Produk' }] }}
    columns={[
      { key: 'name', label: 'Nama', render: (r) => <span className="font-semibold text-ink">{r.name}</span> },
      {
        key: 'type',
        label: 'Jenis',
        render: (r) => (
          <Badge tone={r.type === 'service' ? 'brand' : 'amber'}>
            <span className="inline-flex items-center gap-1">
              {r.type === 'service' ? <Scissors size={11} /> : <Package size={11} />}
              {r.type === 'service' ? 'Layanan' : 'Produk'}
            </span>
          </Badge>
        ),
      },
      { key: 'category', label: 'Kategori' },
      { key: 'price', label: 'Harga', render: (r) => <span className="font-semibold text-ink">{rupiah(r.price)}</span> },
      {
        key: 'stock',
        label: 'Stok',
        render: (r) =>
          r.type === 'product' ? (
            <Badge tone={r.stock <= 0 ? 'red' : r.stock <= 5 ? 'amber' : 'stone'}>{r.stock}</Badge>
          ) : (
            <span className="text-stone-300">—</span>
          ),
      },
      { key: 'commission', label: 'Komisi', render: commissionText },
      activeCol,
    ]}
    fields={[
      { name: 'name', label: 'Nama', required: true },
      { name: 'type', label: 'Jenis', type: 'select', required: true, default: 'service', options: [{ value: 'service', label: 'Layanan' }, { value: 'product', label: 'Produk' }] },
      { name: 'category', label: 'Kategori' },
      { name: 'price', label: 'Harga jual', type: 'number', required: true, min: 0 },
      { name: 'cost', label: 'Modal (HPP)', type: 'number', min: 0, default: 0 },
      { name: 'stock', label: 'Stok awal (produk)', type: 'number', min: 0, default: 0 },
      { name: 'commission_type', label: 'Tipe komisi', type: 'select', required: true, default: 'none', options: [{ value: 'none', label: 'Tanpa komisi' }, { value: 'percent', label: 'Persen dari harga' }, { value: 'fixed', label: 'Nominal per qty' }] },
      { name: 'commission_value', label: 'Nilai komisi', type: 'number', min: 0, default: 0 },
      { name: 'is_active', label: 'Status', type: 'select', required: true, default: 1, options: ACTIVE },
    ]}
  />
);

export const CustomersPage = () => (
  <CrudPage
    title="Pelanggan"
    subtitle="Database pelanggan salon beserta kontak dan catatan preferensi"
    endpoint={E.CUSTOMERS}
    columns={[
      { key: 'name', label: 'Nama', render: (r) => <span className="font-semibold text-ink">{r.name}</span> },
      { key: 'phone', label: 'Telepon' },
      { key: 'email', label: 'Email' },
      { key: 'address', label: 'Alamat' },
    ]}
    fields={[
      { name: 'name', label: 'Nama', required: true }, { name: 'phone', label: 'Telepon' }, { name: 'email', label: 'Email', type: 'email' },
      { name: 'address', label: 'Alamat', type: 'textarea' }, { name: 'notes', label: 'Catatan', type: 'textarea' },
    ]}
  />
);

export const StaffPage = () => (
  <CrudPage
    title="Staff / Stylist"
    subtitle="Daftar kapster, terapis, dan stylist salon untuk penugasan layanan & reservasi"
    endpoint={E.STAFF}
    ownerWrite
    columns={[
      { key: 'name', label: 'Nama', render: (r) => <span className="font-semibold text-ink">{r.name}</span> },
      { key: 'position', label: 'Posisi' },
      { key: 'phone', label: 'Telepon' },
      activeCol,
    ]}
    fields={[
      { name: 'name', label: 'Nama', required: true }, { name: 'position', label: 'Posisi' }, { name: 'phone', label: 'Telepon' },
      { name: 'is_active', label: 'Status', type: 'select', required: true, default: 1, options: ACTIVE },
    ]}
  />
);

export const ExpensesPage = () => (
  <CrudPage
    title="Pengeluaran"
    subtitle="Catat biaya operasional harian seperti pembelian perlengkapan, listrik, atau kebutuhan salon"
    endpoint={E.EXPENSES}
    nameKey="title"
    dateFilter
    sortBy="expense_date"
    columns={[
      { key: 'expense_date', label: 'Tanggal', render: (r) => dateOnly(r.expense_date) },
      { key: 'title', label: 'Keterangan', render: (r) => <span className="font-semibold text-ink">{r.title}</span> },
      { key: 'category', label: 'Kategori', render: (r) => r.category ? <Badge tone="stone">{r.category}</Badge> : <span className="text-stone-300">—</span> },
      { key: 'amount', label: 'Jumlah', render: (r) => <span className="font-semibold text-accent-600">{rupiah(r.amount)}</span> },
    ]}
    fields={[
      { name: 'title', label: 'Keterangan', required: true }, { name: 'category', label: 'Kategori' },
      { name: 'amount', label: 'Jumlah', type: 'number', required: true, min: 0 },
      { name: 'expense_date', label: 'Tanggal', type: 'date', required: true, default: new Date().toISOString().slice(0, 10) },
      { name: 'notes', label: 'Catatan', type: 'textarea' },
    ]}
  />
);

/* ---- Jadwal reservasi ---- */
const RES_STATUS = [
  { value: 'pending', label: 'Menunggu' }, { value: 'confirmed', label: 'Dikonfirmasi' },
  { value: 'done', label: 'Selesai' }, { value: 'cancelled', label: 'Dibatalkan' },
];
const RES_TONE = { pending: 'amber', confirmed: 'brand', done: 'green', cancelled: 'red' };

export const ReservationsPage = () => (
  <CrudPage
    title="Reservasi"
    subtitle="Kelola jadwal booking pelanggan dan penugasan stylist"
    endpoint={E.RESERVATIONS}
    nameKey="customer_name"
    dateFilter
    sortBy="reserved_at"
    order="asc"
    filter={{ key: 'status', label: 'Semua status', options: RES_STATUS }}
    columns={[
      { key: 'reserved_at', label: 'Jadwal', render: (r) => <span className="font-medium text-ink">{dateTime(r.reserved_at)}</span> },
      { key: 'customer_name', label: 'Pelanggan', render: (r) => <span className="font-semibold text-ink">{r.customer_name}</span> },
      { key: 'phone', label: 'Telepon' },
      { key: 'item_name', label: 'Layanan' },
      { key: 'staff_name', label: 'Stylist' },
      { key: 'status', label: 'Status', render: (r) => <Badge tone={RES_TONE[r.status]}>{RES_STATUS.find((s) => s.value === r.status)?.label}</Badge> },
    ]}
    fields={[
      { name: 'customer_name', label: 'Nama pelanggan', required: true }, { name: 'phone', label: 'Telepon' },
      { name: 'reserved_at', label: 'Tanggal & jam', type: 'datetime-local', required: true },
      { name: 'status', label: 'Status', type: 'select', required: true, default: 'pending', options: RES_STATUS },
      { name: 'item_id', label: 'Layanan', type: 'select', optionsFrom: { url: E.ITEMS.LIST, params: { type: 'service', is_active: 1 } } },
      { name: 'staff_id', label: 'Staff', type: 'select', optionsFrom: { url: E.STAFF.LIST, params: { is_active: 1 } } },
      { name: 'notes', label: 'Catatan', type: 'textarea' },
    ]}
  />
);

/* ---- Manajemen User: akun & hak akses (owner only) ---- */
export const UsersPage = () => (
  <CrudPage
    title="Manajemen User"
    subtitle="Tambah akun login pegawai dan atur hak akses antara Owner dan Kasir / Pegawai"
    endpoint={E.USERS}
    filter={{
      key: 'role', label: 'Semua role',
      options: [{ value: 'owner', label: 'Owner' }, { value: 'kasir', label: 'Pegawai / Kasir' }],
    }}
    banner={
      <div className="flex flex-col gap-2.5 text-sm text-stone-600">
        <span className="font-semibold text-ink">Perbedaan Hak Akses Sistem:</span>
        <div className="grid gap-3 text-xs sm:grid-cols-2">
          <div className="flex gap-3 rounded-xl border border-brand-200/80 bg-brand-50/60 p-3">
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand-100 text-brand-700">
              <Crown size={16} />
            </div>
            <div>
              <span className="font-bold text-brand-800">Owner (Pemilik)</span>
              <p className="mt-0.5 leading-relaxed text-stone-600">Akses penuh: Laporan keuangan & laba, void transaksi, kelola layanan & harga, pengaturan salon, serta menambah/mengedit akun pegawai.</p>
            </div>
          </div>
          <div className="flex gap-3 rounded-xl border border-stone-200 bg-stone-50/80 p-3">
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-stone-200/70 text-stone-700">
              <Briefcase size={16} />
            </div>
            <div>
              <span className="font-bold text-stone-800">Pegawai / Kasir</span>
              <p className="mt-0.5 leading-relaxed text-stone-600">Akses operasional: Kasir POS, pencatatan reservasi, tambah stok, data pelanggan, dan pengeluaran harian. Tidak bisa hapus data atau melihat laporan laba.</p>
            </div>
          </div>
        </div>
      </div>
    }
    columns={[
      { key: 'name', label: 'Nama Lengkap', render: (r) => <span className="font-semibold text-ink">{r.name}</span> },
      { key: 'username', label: 'Username', render: (r) => <code className="rounded bg-stone-100 px-1.5 py-0.5 text-xs font-medium text-stone-700">{r.username}</code> },
      {
        key: 'role',
        label: 'Role / Hak Akses',
        render: (r) => (
          <Badge tone={r.role === 'owner' ? 'brand' : 'stone'}>
            {r.role === 'owner' ? 'Owner' : 'Pegawai / Kasir'}
          </Badge>
        ),
      },
      activeCol,
    ]}
    fields={[
      { name: 'name', label: 'Nama Lengkap', required: true },
      { name: 'username', label: 'Username', required: true },
      {
        name: 'role',
        label: 'Role / Hak Akses',
        type: 'select',
        required: true,
        default: 'kasir',
        options: [
          { value: 'kasir', label: 'Pegawai / Kasir' },
          { value: 'owner', label: 'Owner (Pemilik)' },
        ],
      },
      { name: 'password', label: 'Password', type: 'password', requiredOnCreate: true, hint: 'Kosongkan jika tidak diganti (min. 6 karakter)' },
      { name: 'is_active', label: 'Status Akun', type: 'select', required: true, default: 1, options: ACTIVE },
    ]}
  />
);

/* ---- Riwayat transaksi: kasir bisa lihat & cetak resi, hanya owner yang bisa void ---- */
export const HistoryPage = () => (
  <CrudPage
    title="Riwayat Transaksi"
    subtitle="Pantau transaksi yang masuk dan cetak ulang resi pembayaran"
    endpoint={E.TRANSACTIONS}
    nameKey="invoice_no"
    dateFilter
    canCreate={false}
    canEdit={false}
    canDelete={false}
    filter={{ key: 'status', label: 'Semua status', options: [{ value: 'paid', label: 'Lunas' }, { value: 'void', label: 'Void' }] }}
    columns={[
      { key: 'invoice_no', label: 'No. Invoice', render: (r) => <span className="font-mono text-xs font-bold text-ink">{r.invoice_no}</span> },
      { key: 'created_at', label: 'Waktu', render: (r) => dateTime(r.created_at) },
      { key: 'customer_name', label: 'Pelanggan', render: (r) => <span className="font-medium text-ink">{r.customer_name}</span> },
      { key: 'cashier_name', label: 'Kasir' },
      { key: 'payment_method', label: 'Bayar', render: (r) => <Badge tone="stone"><span className="uppercase">{r.payment_method}</span></Badge> },
      { key: 'total', label: 'Total', render: (r) => <span className="font-bold text-brand-700">{rupiah(r.total)}</span> },
      { key: 'status', label: 'Status', render: (r) => <Badge tone={r.status === 'paid' ? 'green' : 'red'}>{r.status === 'paid' ? 'Lunas' : 'Void'}</Badge> },
    ]}
    actions={[
      { label: 'Resi', icon: Printer, to: (r) => `/receipt/${r.id}` },
      {
        label: 'Void', icon: Ban, show: (r, { isOwner }) => isOwner && r.status === 'paid',
        onClick: async (r, reload) => {
          if (!(await confirmToast(`Void transaksi ${r.invoice_no}? Stok produk akan dikembalikan.`, 'Ya, void'))) return;
          try { await request('delete', E.TRANSACTIONS.DETAIL(r.id), { success: 'Transaksi di-void' }); reload(); } catch { /* toast tampil */ }
        },
      },
    ]}
  />
);
