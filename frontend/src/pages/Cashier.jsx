import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Minus, Plus, Search, UserPlus, Loader2, Scissors, Package,
  ShoppingBag, Trash2, Banknote, Landmark, QrCode, CreditCard,
  Clock, PauseCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import useDebounce from '@/hooks/useDebounce';
import FormModal from '@/components/FormModal';
import AsyncSearchSelect from '@/components/AsyncSearchSelect';
import { Skeleton, EmptyState, PageHeader } from '@/components/ui';
import { request } from '@/utils/request';
import { API_ENDPOINTS as E } from '@/utils/endpoints';
import { rupiah, imageUrl } from '@/utils/format';

const listParams = { limit: 100, sortBy: 'name', order: 'asc' };

const PAYMENTS = [
  { value: 'cash', label: 'Tunai', icon: Banknote },
  { value: 'qris', label: 'QRIS', icon: QrCode },
  { value: 'transfer', label: 'Transfer', icon: Landmark },
  { value: 'debit', label: 'Debit', icon: CreditCard },
];

export default function Cashier() {
  const nav = useNavigate();
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('all');
  const q = useDebounce(search, 300);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState([]);
  const [form, setForm] = useState({ customer_id: '', staff_id: '', payment_method: 'cash', notes: '' });
  const [addCustomer, setAddCustomer] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  // Diskon state (% atau Rp)
  const [discountMode, setDiscountMode] = useState('rp'); // 'rp' | 'percent'
  const [discountVal, setDiscountVal] = useState('');

  const loadPendingCount = () => {
    request('get', E.TRANSACTIONS.LIST, { params: { status: 'pending', limit: 1 }, silent: true })
      .then((r) => setPendingCount(r?.pagination?.total || 0))
      .catch(() => {});
  };

  useEffect(() => {
    loadPendingCount();
  }, []);

  useEffect(() => {
    setLoading(true);
    request('get', E.ITEMS.LIST, { params: { ...listParams, is_active: 1, search: q } })
      .then((r) => setItems(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [q]);

  const add = (it) => {
    const x = cart.find((l) => l.item.id === it.id);
    if (it.type === 'product' && (x?.qty || 0) >= it.stock) return toast.error('Stok tidak cukup');
    setCart(x ? cart.map((l) => (l === x ? { ...l, qty: l.qty + 1 } : l)) : [...cart, { item: it, qty: 1 }]);
  };

  const dec = (id) =>
    setCart(cart.flatMap((l) => (l.item.id !== id ? [l] : l.qty > 1 ? [{ ...l, qty: l.qty - 1 }] : [])));

  const subtotal = cart.reduce((s, l) => s + l.item.price * l.qty, 0);
  const totalQty = cart.reduce((s, l) => s + l.qty, 0);

  // Perhitungan diskon nominal berdasarkan mode
  const discountNominal =
    discountMode === 'percent'
      ? Math.min(Math.round((subtotal * Math.min(Math.max(Number(discountVal) || 0, 0), 100)) / 100), subtotal)
      : Math.min(Math.max(Number(discountVal) || 0, 0), subtotal);

  const finalTotal = Math.max(subtotal - discountNominal, 0);

  const filteredItems = tab === 'all' ? items : items.filter((it) => it.type === tab);

  const saveCustomer = async (v) => {
    setSaving(true);
    try {
      const r = await request('post', E.CUSTOMERS.LIST, { data: v, success: 'Pelanggan berhasil ditambahkan' });
      setForm((f) => ({ ...f, customer_id: r.data.id }));
      setAddCustomer(false);
    } catch {
      // toast tampil
    } finally {
      setSaving(false);
    }
  };

  // Proses bayar langsung
  const pay = async () => {
    if (!cart.length) return toast.error('Keranjang masih kosong');
    setSaving(true);
    try {
      const r = await request('post', E.TRANSACTIONS.LIST, {
        data: {
          ...form,
          status: 'paid',
          discount: discountNominal,
          customer_id: form.customer_id || null,
          staff_id: form.staff_id || null,
          lines: cart.map((l) => ({ item_id: l.item.id, qty: l.qty })),
        },
        success: 'Transaksi berhasil diselesaikan',
      });
      nav(`/receipt/${r.data.id}`);
    } catch {
      // toast tampil
    } finally {
      setSaving(false);
    }
  };

  // Tahan transaksi (Menunggu Pembayaran)
  const holdTransaction = async () => {
    if (!cart.length) return toast.error('Keranjang masih kosong');
    setSaving(true);
    try {
      await request('post', E.TRANSACTIONS.LIST, {
        data: {
          ...form,
          status: 'pending',
          discount: discountNominal,
          customer_id: form.customer_id || null,
          staff_id: form.staff_id || null,
          lines: cart.map((l) => ({ item_id: l.item.id, qty: l.qty })),
        },
        success: 'Pesanan disimpan ke Menunggu Pembayaran',
      });
      setCart([]);
      setForm({ customer_id: '', staff_id: '', payment_method: 'cash', notes: '' });
      setDiscountVal('');
      loadPendingCount();
    } catch {
      // error handled
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
      <section className="min-w-0 space-y-4">
        <PageHeader title="Kasir POS" subtitle="Pilih layanan atau produk untuk dimasukkan ke keranjang">
          <Link
            to="/pending-payments"
            className="btn-ghost !text-xs relative flex items-center gap-1.5"
            title="Lihat pesanan yang belum dibayar"
          >
            <Clock size={14} className="text-amber-600" />
            <span>Menunggu Pembayaran</span>
            {pendingCount > 0 && (
              <span className="grid h-5 min-w-[20px] place-items-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-white">
                {pendingCount}
              </span>
            )}
          </Link>
        </PageHeader>

        {/* Search & Filter Tabs */}
        <div className="card flex flex-wrap items-center gap-3 p-3">
          <div className="relative min-w-[200px] flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              className="input !border-stone-200/80 !bg-stone-50/50 !pl-10 focus:!bg-white"
              placeholder="Cari layanan atau produk…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex rounded-xl bg-stone-100 p-1">
            {[
              { id: 'all', label: 'Semua' },
              { id: 'service', label: 'Layanan' },
              { id: 'product', label: 'Produk' },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                  tab === t.id ? 'bg-white text-ink shadow-sm' : 'text-stone-500 hover:text-ink'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Item Grid */}
        {loading ? (
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-28" />
            ))}
          </div>
        ) : !filteredItems.length ? (
          <div className="card">
            <EmptyState text="Item tidak ditemukan" />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3">
            {filteredItems.map((it) => {
              const out = it.type === 'product' && it.stock <= 0;
              const inCart = cart.find((c) => c.item.id === it.id);
              const stockTone = out
                ? 'bg-rose-50 text-rose-700 ring-rose-200/60'
                : it.stock <= 5
                  ? 'bg-amber-50 text-amber-700 ring-amber-200/60'
                  : 'bg-stone-100 text-stone-600 ring-stone-200/60';
              return (
                <button
                  key={it.id}
                  disabled={out}
                  onClick={() => add(it)}
                  className={`card-interactive relative flex h-full w-full flex-col justify-between gap-3 p-3 text-left transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45 sm:p-4 ${
                    inCart ? '!border-brand-400 bg-brand-50/30 ring-1 ring-brand-400/30' : ''
                  }`}
                >
                  {inCart && (
                    <span className="absolute right-2.5 top-2.5 grid h-5 min-w-[20px] place-items-center rounded-full bg-gradient-warm px-1.5 text-[11px] font-bold text-white shadow-sm sm:right-3 sm:top-3 sm:h-6 sm:min-w-[24px] sm:text-xs">
                      {inCart.qty}
                    </span>
                  )}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 pr-7 text-[10px] font-semibold uppercase tracking-wider text-stone-400 sm:text-[11px]">
                      {it.type === 'service' ? (
                        <Scissors size={12} className="shrink-0 text-brand-500" />
                      ) : (
                        <Package size={12} className="shrink-0 text-amber-600" />
                      )}
                      <span className="truncate">{it.category || (it.type === 'service' ? 'Layanan' : 'Produk')}</span>
                    </div>
                    <div className="line-clamp-2 text-sm font-semibold leading-snug text-ink sm:text-base">
                      {it.name}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5 border-t border-stone-100/80 pt-2">
                    <span className="whitespace-nowrap font-display text-sm font-bold text-brand-700 sm:text-base">
                      {rupiah(it.price)}
                    </span>
                    {it.type === 'product' && (
                      <span
                        className={`whitespace-nowrap rounded-md px-2 py-0.5 text-[10px] font-semibold ring-1 sm:rounded-lg sm:px-2.5 sm:py-1 sm:text-[11px] ${stockTone}`}
                      >
                        {out ? 'Habis' : `Stok ${it.stock}`}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* Cart Terminal */}
      <aside className="card flex h-fit flex-col overflow-hidden lg:sticky lg:top-20">
        <div className="h-1 bg-gradient-warm" />
        <div className="space-y-4 p-5">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-xl bg-brand-50 text-brand-600">
                <ShoppingBag size={16} />
              </div>
              <div>
                <h2 className="font-bold leading-none text-ink">Keranjang</h2>
                <span className="text-xs text-stone-400">{totalQty} item dipilih</span>
              </div>
            </div>
            {cart.length > 0 && (
              <button
                type="button"
                onClick={() => setCart([])}
                className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-accent-600 hover:bg-accent-50 transition-colors"
              >
                <Trash2 size={13} /> Kosongkan
              </button>
            )}
          </div>

          {!cart.length ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center text-stone-400">
              <ShoppingBag size={28} className="opacity-40" />
              <p className="text-sm">Pilih layanan atau produk di samping</p>
            </div>
          ) : (
            <ul className="max-h-60 divide-y divide-stone-100 overflow-y-auto pr-1">
              {cart.map((l) => (
                <li key={l.item.id} className="flex items-center gap-2 py-2.5 text-sm">
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold text-ink">{l.item.name}</div>
                    <div className="text-xs text-stone-500">
                      {rupiah(l.item.price)} × {l.qty} ={' '}
                      <span className="font-semibold text-ink">{rupiah(l.item.price * l.qty)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 rounded-xl border border-stone-200 bg-stone-50 p-0.5">
                    <button
                      className="grid h-7 w-7 place-items-center rounded-lg text-stone-600 hover:bg-white hover:shadow-sm transition"
                      onClick={() => dec(l.item.id)}
                    >
                      <Minus size={13} />
                    </button>
                    <span className="w-6 text-center text-xs font-bold">{l.qty}</span>
                    <button
                      className="grid h-7 w-7 place-items-center rounded-lg text-stone-600 hover:bg-white hover:shadow-sm transition"
                      onClick={() => add(l.item)}
                    >
                      <Plus size={13} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {/* Customer & Stylist Select with Search by API */}
          <div className="space-y-2.5 border-t border-stone-100 pt-3">
            <div>
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-stone-500">
                Pelanggan
              </span>
              <div className="flex gap-2">
                <AsyncSearchSelect
                  className="flex-1"
                  value={form.customer_id}
                  onChange={(val) => setForm((f) => ({ ...f, customer_id: val }))}
                  fetchUrl={E.CUSTOMERS.LIST}
                  placeholder="Cari / pilih pelanggan…"
                  searchPlaceholder="Ketik nama atau telepon pelanggan…"
                  defaultOptions={[{ id: '', name: 'Pelanggan Umum' }]}
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
                <button
                  type="button"
                  className="btn-ghost !px-3 shrink-0"
                  title="Tambah Pelanggan Baru"
                  onClick={() => setAddCustomer(true)}
                >
                  <UserPlus size={16} />
                </button>
              </div>
            </div>

            <div>
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-stone-500">
                Dilayani Oleh (Staff / Stylist)
              </span>
              <AsyncSearchSelect
                value={form.staff_id}
                onChange={(val) => setForm((f) => ({ ...f, staff_id: val }))}
                fetchUrl={E.STAFF.LIST}
                params={{ is_active: 1 }}
                placeholder="Pilih staff / kapster (opsional)…"
                searchPlaceholder="Ketik nama staff…"
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
                renderSelected={(s) => (
                  <span className="font-medium text-ink">
                    {s.name}
                    {s.position ? ` - ${s.position}` : ''}
                  </span>
                )}
              />
            </div>
          </div>

          {/* Payment Method Pills */}
          <div className="space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
              Metode Pembayaran
            </span>
            <div className="grid grid-cols-4 gap-1.5">
              {PAYMENTS.map((p) => {
                const active = form.payment_method === p.value;
                return (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setForm({ ...form, payment_method: p.value })}
                    className={`flex flex-col items-center gap-1 rounded-xl border py-2 text-[11px] font-semibold transition-all ${
                      active
                        ? 'border-brand-500 bg-brand-50 text-brand-700 shadow-sm'
                        : 'border-stone-200 bg-stone-50/50 text-stone-500 hover:bg-white hover:text-ink'
                    }`}
                  >
                    <p.icon size={15} />
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Discount with Rp and % toggle */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">Diskon</span>
              <div className="flex rounded-lg bg-stone-100 p-0.5 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => {
                    setDiscountMode('rp');
                    setDiscountVal('');
                  }}
                  className={`rounded-md px-2 py-0.5 transition-all ${
                    discountMode === 'rp' ? 'bg-white text-ink shadow-sm' : 'text-stone-500'
                  }`}
                >
                  Rp
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDiscountMode('percent');
                    setDiscountVal('');
                  }}
                  className={`rounded-md px-2 py-0.5 transition-all ${
                    discountMode === 'percent' ? 'bg-white text-ink shadow-sm' : 'text-stone-500'
                  }`}
                >
                  %
                </button>
              </div>
            </div>
            <div className="relative">
              <input
                className="input !bg-stone-50/50 focus:!bg-white"
                type="number"
                min="0"
                max={discountMode === 'percent' ? 100 : subtotal}
                placeholder={discountMode === 'percent' ? 'Contoh: 10 untuk 10%' : 'Nominal diskon (Rp)'}
                value={discountVal}
                onChange={(e) => setDiscountVal(e.target.value)}
              />
              {discountMode === 'percent' && discountVal && (
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-stone-500">
                  = {rupiah(discountNominal)}
                </span>
              )}
            </div>
          </div>

          {/* Totals */}
          <div className="space-y-1.5 rounded-2xl bg-stone-50 p-3.5 text-sm">
            <div className="flex justify-between text-stone-500">
              <span>Subtotal</span>
              <span>{rupiah(subtotal)}</span>
            </div>
            {discountNominal > 0 && (
              <div className="flex justify-between text-accent-600">
                <span>Diskon {discountMode === 'percent' ? `(${discountVal}%)` : ''}</span>
                <span>- {rupiah(discountNominal)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-stone-200/80 pt-2 text-base font-bold text-ink">
              <span>Total Tagihan</span>
              <span className="font-display text-xl text-brand-700">{rupiah(finalTotal)}</span>
            </div>
          </div>

          {/* Action buttons: Pay or Hold */}
          <div className="space-y-2 pt-1">
            <button
              className="btn-primary w-full !py-3 !text-base"
              disabled={saving || !cart.length}
              onClick={pay}
            >
              {saving && <Loader2 size={18} className="animate-spin" />}
              {saving ? 'Memproses...' : 'Bayar Sekarang'}
            </button>
            <button
              type="button"
              className="btn-ghost w-full !py-2.5 !text-xs !font-semibold text-stone-700 hover:!border-amber-400 hover:!bg-amber-50 hover:!text-amber-800"
              disabled={saving || !cart.length}
              onClick={holdTransaction}
              title="Simpan pesanan tanpa langsung bayar"
            >
              <PauseCircle size={15} className="text-amber-600" />
              Tahan (Menunggu Pembayaran)
            </button>
          </div>
        </div>
      </aside>

      {addCustomer && (
        <FormModal
          title="Pelanggan Baru"
          saving={saving}
          onSubmit={saveCustomer}
          onClose={() => setAddCustomer(false)}
          fields={[
            { name: 'name', label: 'Nama Lengkap', required: true },
            { name: 'phone', label: 'No. Telepon / WhatsApp' },
            { name: 'address', label: 'Alamat', type: 'textarea' },
          ]}
        />
      )}
    </div>
  );
}
