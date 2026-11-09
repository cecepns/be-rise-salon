import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Minus, Plus, Search, UserPlus, Loader2, Scissors, Package,
  ShoppingBag, Trash2, Banknote, Landmark, QrCode, CreditCard,
} from 'lucide-react';
import toast from 'react-hot-toast';
import useDebounce from '@/hooks/useDebounce';
import FormModal from '@/components/FormModal';
import { Skeleton, EmptyState, PageHeader } from '@/components/ui';
import { request } from '@/utils/request';
import { API_ENDPOINTS as E } from '@/utils/endpoints';
import { rupiah } from '@/utils/format';

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
  const [customers, setCustomers] = useState([]);
  const [staff, setStaff] = useState([]);
  const [cart, setCart] = useState([]);
  const [form, setForm] = useState({ customer_id: '', staff_id: '', payment_method: 'cash', discount: 0, notes: '' });
  const [addCustomer, setAddCustomer] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadCustomers = () => request('get', E.CUSTOMERS.LIST, { params: listParams, silent: true }).then((r) => setCustomers(r.data)).catch(() => {});
  useEffect(() => {
    loadCustomers();
    request('get', E.STAFF.LIST, { params: { ...listParams, is_active: 1 }, silent: true }).then((r) => setStaff(r.data)).catch(() => {});
  }, []);
  useEffect(() => {
    setLoading(true);
    request('get', E.ITEMS.LIST, { params: { ...listParams, is_active: 1, search: q } })
      .then((r) => setItems(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, [q]);

  const add = (it) => {
    const x = cart.find((l) => l.item.id === it.id);
    if (it.type === 'product' && (x?.qty || 0) >= it.stock) return toast.error('Stok tidak cukup');
    setCart(x ? cart.map((l) => (l === x ? { ...l, qty: l.qty + 1 } : l)) : [...cart, { item: it, qty: 1 }]);
  };
  const dec = (id) => setCart(cart.flatMap((l) => (l.item.id !== id ? [l] : l.qty > 1 ? [{ ...l, qty: l.qty - 1 }] : [])));

  const subtotal = cart.reduce((s, l) => s + l.item.price * l.qty, 0);
  const totalQty = cart.reduce((s, l) => s + l.qty, 0);
  const discount = Math.min(Math.max(Number(form.discount) || 0, 0), subtotal);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const filteredItems = tab === 'all' ? items : items.filter((it) => it.type === tab);

  const saveCustomer = async (v) => {
    setSaving(true);
    try {
      const r = await request('post', E.CUSTOMERS.LIST, { data: v, success: 'Pelanggan ditambahkan' });
      await loadCustomers();
      setForm((f) => ({ ...f, customer_id: r.data.id }));
      setAddCustomer(false);
    } catch { /* toast tampil */ } finally { setSaving(false); }
  };

  const pay = async () => {
    if (!cart.length) return toast.error('Keranjang masih kosong');
    setSaving(true);
    try {
      const r = await request('post', E.TRANSACTIONS.LIST, {
        data: { ...form, discount, customer_id: form.customer_id || null, staff_id: form.staff_id || null, lines: cart.map((l) => ({ item_id: l.item.id, qty: l.qty })) },
        success: 'Transaksi berhasil',
      });
      nav(`/receipt/${r.data.id}`);
    } catch { /* toast tampil */ } finally { setSaving(false); }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
      <section className="min-w-0 space-y-4">
        <PageHeader title="Kasir POS" subtitle="Pilih layanan atau produk untuk dimasukkan ke keranjang" />

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
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
          </div>
        ) : !filteredItems.length ? (
          <div className="card"><EmptyState text="Item tidak ditemukan" /></div>
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
                      {it.type === 'service' ? <Scissors size={12} className="shrink-0 text-brand-500" /> : <Package size={12} className="shrink-0 text-amber-600" />}
                      <span className="truncate">{it.category || (it.type === 'service' ? 'Layanan' : 'Produk')}</span>
                    </div>
                    <div className="line-clamp-2 text-sm font-semibold leading-snug text-ink sm:text-base">{it.name}</div>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5 border-t border-stone-100/80 pt-2">
                    <span className="whitespace-nowrap font-display text-sm font-bold text-brand-700 sm:text-base">{rupiah(it.price)}</span>
                    {it.type === 'product' && (
                      <span className={`whitespace-nowrap rounded-md px-2 py-0.5 text-[10px] font-semibold ring-1 sm:rounded-lg sm:px-2.5 sm:py-1 sm:text-[11px] ${stockTone}`}>
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
            <ul className="max-h-64 divide-y divide-stone-100 overflow-y-auto pr-1">
              {cart.map((l) => (
                <li key={l.item.id} className="flex items-center gap-2 py-2.5 text-sm">
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold text-ink">{l.item.name}</div>
                    <div className="text-xs text-stone-500">
                      {rupiah(l.item.price)} × {l.qty} = <span className="font-semibold text-ink">{rupiah(l.item.price * l.qty)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 rounded-xl border border-stone-200 bg-stone-50 p-0.5">
                    <button className="grid h-7 w-7 place-items-center rounded-lg text-stone-600 hover:bg-white hover:shadow-sm transition" onClick={() => dec(l.item.id)}>
                      <Minus size={13} />
                    </button>
                    <span className="w-6 text-center text-xs font-bold">{l.qty}</span>
                    <button className="grid h-7 w-7 place-items-center rounded-lg text-stone-600 hover:bg-white hover:shadow-sm transition" onClick={() => add(l.item)}>
                      <Plus size={13} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {/* Customer & Stylist */}
          <div className="space-y-2.5 border-t border-stone-100 pt-3">
            <div className="flex gap-2">
              <select className="input !bg-stone-50/50 focus:!bg-white" value={form.customer_id} onChange={set('customer_id')}>
                <option value="">Pelanggan Umum</option>
                {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <button className="btn-ghost !px-3" title="Pelanggan baru" onClick={() => setAddCustomer(true)}>
                <UserPlus size={16} />
              </button>
            </div>
            <select className="input !bg-stone-50/50 focus:!bg-white" value={form.staff_id} onChange={set('staff_id')}>
              <option value="">Dilayani oleh (opsional)</option>
              {staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          {/* Payment Method Pills & Discount */}
          <div className="space-y-2.5">
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
            <input
              className="input !bg-stone-50/50 focus:!bg-white"
              type="number"
              min="0"
              placeholder="Diskon nominal (Rp)"
              value={form.discount || ''}
              onChange={set('discount')}
            />
          </div>

          {/* Totals */}
          <div className="space-y-1.5 rounded-2xl bg-stone-50 p-3.5 text-sm">
            <div className="flex justify-between text-stone-500"><span>Subtotal</span><span>{rupiah(subtotal)}</span></div>
            <div className="flex justify-between text-stone-500"><span>Diskon</span><span className="text-accent-600">- {rupiah(discount)}</span></div>
            <div className="flex justify-between border-t border-stone-200/80 pt-2 text-base font-bold text-ink">
              <span>Total Tagihan</span>
              <span className="font-display text-xl text-brand-700">{rupiah(subtotal - discount)}</span>
            </div>
          </div>

          <button className="btn-primary w-full !py-3 !text-base" disabled={saving || !cart.length} onClick={pay}>
            {saving && <Loader2 size={18} className="animate-spin" />}
            {saving ? 'Memproses...' : 'Bayar Sekarang'}
          </button>
        </div>
      </aside>

      {addCustomer && (
        <FormModal
          title="Pelanggan Baru" saving={saving} onSubmit={saveCustomer} onClose={() => setAddCustomer(false)}
          fields={[{ name: 'name', label: 'Nama Lengkap', required: true }, { name: 'phone', label: 'No. Telepon' }]}
        />
      )}
    </div>
  );
}
