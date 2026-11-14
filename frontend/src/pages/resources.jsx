import { useState, useEffect } from 'react';
import {
  Printer, Ban, Scissors, Package, Crown, Briefcase,
  UserPlus, Users, Loader2, Calendar, Clock,
} from 'lucide-react';
import CrudPage from '@/components/CrudPage';
import Modal from '@/components/Modal';
import AsyncSearchSelect from '@/components/AsyncSearchSelect';
import { Badge } from '@/components/ui';
import { confirmToast } from '@/utils/confirm';
import { request } from '@/utils/request';
import { API_ENDPOINTS as E } from '@/utils/endpoints';
import { rupiah, dateTime, dateOnly, imageUrl } from '@/utils/format';

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

/* ---- Staff / Stylist (Revisi: Ditambah Foto) ---- */
export const StaffPage = () => (
  <CrudPage
    title="Staff / Stylist"
    subtitle="Daftar kapster, terapis, dan stylist salon untuk penugasan layanan & reservasi"
    endpoint={E.STAFF}
    ownerWrite
    columns={[
      {
        key: 'photo',
        label: 'Foto',
        render: (r) => (
          <div className="h-10 w-10 shrink-0 overflow-hidden rounded-xl bg-stone-100 ring-1 ring-stone-200/80">
            {r.photo ? (
              <img src={imageUrl(r.photo)} alt={r.name} className="h-full w-full object-cover" />
            ) : (
              <div className="grid h-full w-full place-items-center bg-gradient-warm text-xs font-bold text-white">
                {r.name?.charAt(0)?.toUpperCase() || '?'}
              </div>
            )}
          </div>
        ),
      },
      { key: 'name', label: 'Nama', render: (r) => <span className="font-semibold text-ink">{r.name}</span> },
      { key: 'position', label: 'Posisi / Keahlian' },
      { key: 'phone', label: 'Telepon' },
      activeCol,
    ]}
    fields={[
      { name: 'photo', label: 'Foto Staff', type: 'image' },
      { name: 'name', label: 'Nama Lengkap', required: true },
      { name: 'position', label: 'Posisi / Keahlian' },
      { name: 'phone', label: 'Telepon / WhatsApp' },
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
  { value: 'pending', label: 'Menunggu' },
  { value: 'confirmed', label: 'Dikonfirmasi' },
  { value: 'done', label: 'Selesai' },
  { value: 'cancelled', label: 'Dibatalkan' },
];
const RES_TONE = { pending: 'amber', confirmed: 'brand', done: 'green', cancelled: 'red' };

/* Custom Modal Reservasi dengan Search Pelanggan (API + Debounce) atau Tambah Baru */
function ReservationModal({ row, onClose, onSaved }) {
  const isEdit = !!row;
  const [customerMode, setCustomerMode] = useState('existing'); // 'existing' | 'new'
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customerName, setCustomerName] = useState(row?.customer_name || '');
  const [phone, setPhone] = useState(row?.phone || '');
  const [saveToCustomers, setSaveToCustomers] = useState(true);

  const [itemId, setItemId] = useState(row?.item_id || '');
  const [staffId, setStaffId] = useState(row?.staff_id || '');
  const [reservedAt, setReservedAt] = useState(
    row?.reserved_at ? String(row.reserved_at).replace(' ', 'T').slice(0, 16) : ''
  );
  const [status, setStatus] = useState(row?.status || 'pending');
  const [notes, setNotes] = useState(row?.notes || '');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const handleSelectCustomer = (val, customer) => {
    setSelectedCustomerId(val);
    if (customer) {
      setCustomerName(customer.name || '');
      setPhone(customer.phone && customer.phone !== '-' ? customer.phone : '');
    } else {
      setCustomerName('');
      setPhone('');
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!customerName?.trim()) errs.customerName = 'Nama pelanggan wajib diisi';
    if (!reservedAt) errs.reservedAt = 'Tanggal & jam reservasi wajib diisi';
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setSaving(true);
    try {
      // Jika mode pelanggan baru dan dicentang simpan ke master data
      if (customerMode === 'new' && saveToCustomers && !isEdit) {
        try {
          await request('post', E.CUSTOMERS.LIST, {
            data: { name: customerName.trim(), phone: phone.trim() || '-' },
            silent: true,
          });
        } catch {
          // lewati jika gagal simpan pelanggan
        }
      }

      const payload = {
        customer_name: customerName.trim(),
        phone: phone.trim() || null,
        item_id: itemId || null,
        staff_id: staffId || null,
        reserved_at: reservedAt,
        status,
        notes: notes.trim() || null,
      };

      if (isEdit) {
        await request('put', E.RESERVATIONS.DETAIL(row.id), {
          data: payload,
          success: 'Jadwal reservasi diperbarui',
        });
      } else {
        await request('post', E.RESERVATIONS.LIST, {
          data: payload,
          success: 'Jadwal reservasi berhasil ditambahkan',
        });
      }

      onSaved();
    } catch {
      // error handled
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={isEdit ? 'Edit Jadwal Reservasi' : 'Tambah Jadwal Reservasi'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        {/* Pilihan Pelanggan: Cari dari DB atau Tambah Baru */}
        <div className="space-y-2 rounded-2xl border border-stone-200/80 bg-stone-50/60 p-3.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-stone-600">
              Pelanggan <span className="text-accent-500">*</span>
            </span>
            {!isEdit && (
              <div className="flex rounded-lg bg-stone-200/70 p-0.5 text-xs font-medium">
                <button
                  type="button"
                  onClick={() => setCustomerMode('existing')}
                  className={`flex items-center gap-1 rounded-md px-2 py-0.5 transition-all ${
                    customerMode === 'existing' ? 'bg-white text-ink shadow-sm' : 'text-stone-600'
                  }`}
                >
                  <Users size={12} /> Cari Pelanggan
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCustomerMode('new');
                    setSelectedCustomerId('');
                    setCustomerName('');
                    setPhone('');
                  }}
                  className={`flex items-center gap-1 rounded-md px-2 py-0.5 transition-all ${
                    customerMode === 'new' ? 'bg-white text-ink shadow-sm' : 'text-stone-600'
                  }`}
                >
                  <UserPlus size={12} /> Baru
                </button>
              </div>
            )}
          </div>

          {customerMode === 'existing' && !isEdit ? (
            <div className="space-y-2">
              <AsyncSearchSelect
                value={selectedCustomerId}
                onChange={handleSelectCustomer}
                fetchUrl={E.CUSTOMERS.LIST}
                placeholder="Cari nama atau telepon pelanggan…"
                searchPlaceholder="Ketik nama atau nomor telepon…"
                renderOption={(c) => (
                  <div>
                    <div className="font-medium text-ink">{c.name}</div>
                    {c.phone && c.phone !== '-' && (
                      <div className="text-[10px] text-stone-400">{c.phone}</div>
                    )}
                  </div>
                )}
                renderSelected={(c) => (
                  <span className="font-medium text-ink">
                    {c.name}
                    {c.phone && c.phone !== '-' ? ` (${c.phone})` : ''}
                  </span>
                )}
              />
              {selectedCustomerId && (
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-stone-400">Nama:</span>
                    <input
                      className="input !py-1.5 !text-xs !bg-white"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                    />
                  </div>
                  <div>
                    <span className="text-stone-400">Telepon:</span>
                    <input
                      className="input !py-1.5 !text-xs !bg-white"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2.5">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="mb-1 block text-xs text-stone-500">Nama Pelanggan</span>
                  <input
                    className="input !bg-white"
                    placeholder="Nama pelanggan"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                  />
                </div>
                <div>
                  <span className="mb-1 block text-xs text-stone-500">No. Telepon / WA</span>
                  <input
                    className="input !bg-white"
                    placeholder="08xxxxxxxxxx"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </div>
              {!isEdit && (
                <label className="flex cursor-pointer items-center gap-2 text-xs text-stone-600 select-none">
                  <input
                    type="checkbox"
                    className="rounded border-stone-300 text-brand-600 focus:ring-brand-500"
                    checked={saveToCustomers}
                    onChange={(e) => setSaveToCustomers(e.target.checked)}
                  />
                  Simpan juga ke daftar master data pelanggan
                </label>
              )}
            </div>
          )}
          {errors.customerName && (
            <span className="text-xs font-medium text-accent-600">{errors.customerName}</span>
          )}
        </div>

        {/* Layanan & Staff dengan Search by API */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-stone-600">
              Layanan Perawatan
            </span>
            <AsyncSearchSelect
              value={itemId}
              onChange={(val) => setItemId(val)}
              fetchUrl={E.ITEMS.LIST}
              params={{ type: 'service', is_active: 1 }}
              placeholder="Pilih layanan…"
              searchPlaceholder="Cari nama layanan…"
              renderOption={(it) => (
                <div className="flex items-center justify-between">
                  <span className="font-medium text-ink">{it.name}</span>
                  <span className="text-xs font-semibold text-brand-700">{rupiah(it.price)}</span>
                </div>
              )}
            />
          </div>

          <div>
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-stone-600">
              Staff / Stylist
            </span>
            <AsyncSearchSelect
              value={staffId}
              onChange={(val) => setStaffId(val)}
              fetchUrl={E.STAFF.LIST}
              params={{ is_active: 1 }}
              placeholder="Pilih stylist (opsional)…"
              searchPlaceholder="Cari nama staff…"
              defaultOptions={[{ id: '', name: 'Tanpa staff khusus' }]}
              renderOption={(s) => (
                <div className="flex items-center gap-2">
                  {s.photo ? (
                    <img src={imageUrl(s.photo)} className="h-6 w-6 rounded-full object-cover" />
                  ) : (
                    <div className="grid h-6 w-6 place-items-center rounded-full bg-brand-100 text-[10px] font-bold text-brand-700">
                      {s.name?.charAt(0)}
                    </div>
                  )}
                  <div>
                    <div className="font-medium text-ink">{s.name}</div>
                    {s.position && <div className="text-[10px] text-stone-400">{s.position}</div>}
                  </div>
                </div>
              )}
            />
          </div>
        </div>

        {/* Tanggal & Status */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-stone-600">
              Jadwal Tanggal & Jam <span className="text-accent-500">*</span>
            </span>
            <input
              type="datetime-local"
              className="input !bg-stone-50/50 focus:!bg-white"
              value={reservedAt}
              onChange={(e) => setReservedAt(e.target.value)}
            />
            {errors.reservedAt && (
              <span className="mt-1 block text-xs font-medium text-accent-600">{errors.reservedAt}</span>
            )}
          </div>

          <div>
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-stone-600">
              Status Reservasi
            </span>
            <select
              className="input !bg-stone-50/50 focus:!bg-white"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              {RES_STATUS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Catatan */}
        <div>
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-stone-600">
            Catatan Tambahan
          </span>
          <textarea
            rows={2}
            className="input !bg-stone-50/50 focus:!bg-white"
            placeholder="Catatan permintaan pelanggan, jenis potongan, dll…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 border-t border-stone-100 pt-3">
          <button type="button" className="btn-ghost" onClick={onClose}>
            Batal
          </button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving && <Loader2 size={16} className="animate-spin" />} Simpan Jadwal
          </button>
        </div>
      </form>
    </Modal>
  );
}

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
      {
        key: 'reserved_at',
        label: 'Jadwal',
        render: (r) => <span className="font-medium text-ink">{dateTime(r.reserved_at)}</span>,
      },
      {
        key: 'customer_name',
        label: 'Pelanggan',
        render: (r) => <span className="font-semibold text-ink">{r.customer_name}</span>,
      },
      { key: 'phone', label: 'Telepon', render: (r) => r.phone || <span className="text-stone-300">—</span> },
      { key: 'item_name', label: 'Layanan', render: (r) => r.item_name || <span className="text-stone-300">—</span> },
      { key: 'staff_name', label: 'Stylist', render: (r) => r.staff_name || <span className="text-stone-300">—</span> },
      {
        key: 'status',
        label: 'Status',
        render: (r) => (
          <Badge tone={RES_TONE[r.status]}>{RES_STATUS.find((s) => s.value === r.status)?.label}</Badge>
        ),
      },
    ]}
    renderModal={({ row, onClose, onSaved }) => (
      <ReservationModal row={row} onClose={onClose} onSaved={onSaved} />
    )}
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

/* ---- Riwayat transaksi: kasir bisa lihat & cetak resi, filter status lengkap, pelunasan tagihan ---- */
export { default as HistoryPage } from './History';
