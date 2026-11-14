import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Minus, Plus, Search, UserPlus, Loader2, Scissors, Package,
  ShoppingBag, Trash2, Banknote, Landmark, QrCode, CreditCard,
  Clock, PauseCircle, Check, X, Calendar, Percent, Tag,
} from 'lucide-react';
import toast from 'react-hot-toast';
import useDebounce from '@/hooks/useDebounce';
import FormModal from '@/components/FormModal';
import Modal from '@/components/Modal';
import AsyncSearchSelect from '@/components/AsyncSearchSelect';
import { Skeleton, EmptyState, PageHeader, Badge } from '@/components/ui';
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
  const [selectedStaff, setSelectedStaff] = useState([]); // [{ id, name, position, photo }]
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [addCustomer, setAddCustomer] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  // Tanggal Transaksi
  const [txDate, setTxDate] = useState(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  });

  // Opsi Kasir Mini: Langsung Bayar vs Tidak Langsung Bayar
  const [instantPay, setInstantPay] = useState(true);
  const [paidAmountInput, setPaidAmountInput] = useState('');

  // Biaya Tambahan (PPN & Biaya Tambahan)
  const [showExtraFeeModal, setShowExtraFeeModal] = useState(false);
  const [taxPercent, setTaxPercent] = useState('');
  const [extraFee, setExtraFee] = useState('');
  const [extraFeeNote, setExtraFeeNote] = useState('');

  // Diskon state (% atau Rp)
  const [discountMode, setDiscountMode] = useState('rp'); // 'rp' | 'percent'
  const [discountVal, setDiscountVal] = useState('');

  const loadPendingCount = () => {
    request('get', E.TRANSACTIONS.LIST, { params: { status: 'uncompleted', limit: 1 }, silent: true })
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

  // Hitung total estimasi komisi dari keranjang (diambil per item)
  const totalCommission = cart.reduce((sum, l) => {
    const it = l.item;
    const sub = it.price * l.qty;
    const com =
      it.commission_type === 'percent'
        ? Math.round((sub * Number(it.commission_value || 0)) / 100)
        : it.commission_type === 'fixed'
        ? Math.round(Number(it.commission_value || 0) * l.qty)
        : 0;
    return sum + com;
  }, 0);

  const handleAddStaff = (staffId, staffObj) => {
    if (!staffObj || !staffObj.id) return;
    setSelectedStaff((prev) => {
      if (prev.some((s) => s.id === staffObj.id)) {
        toast('Pegawai ini sudah ditambahkan', { icon: 'ℹ️' });
        return prev;
      }
      return [...prev, staffObj];
    });
    setShowAddStaff(false);
  };

  const handleRemoveStaff = (staffId) => {
    setSelectedStaff((prev) => prev.filter((s) => s.id !== staffId));
  };

  // Perhitungan diskon nominal berdasarkan mode
  const discountNominal =
    discountMode === 'percent'
      ? Math.min(Math.round((subtotal * Math.min(Math.max(Number(discountVal) || 0, 0), 100)) / 100), subtotal)
      : Math.min(Math.max(Number(discountVal) || 0, 0), subtotal);

  const afterDiscount = Math.max(subtotal - discountNominal, 0);
  const taxAmount = Math.round((afterDiscount * (Number(taxPercent) || 0)) / 100);
  const extraFeeAmount = Math.max(Number(extraFee) || 0, 0);
  const finalTotal = afterDiscount + taxAmount + extraFeeAmount;

  const currentPaid = instantPay ? finalTotal : Math.min(Math.max(Number(paidAmountInput) || 0, 0), finalTotal);
  const remainingBill = Math.max(finalTotal - currentPaid, 0);

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

  // Submit Transaksi (Langsung Bayar atau Belum Lunas / Belum Bayar)
  const submitTransaction = async () => {
    if (!cart.length) return toast.error('Keranjang masih kosong');
    setSaving(true);
    try {
      const payload = {
        ...form,
        created_at: txDate ? new Date(txDate).toISOString() : undefined,
        status: instantPay ? 'paid' : currentPaid > 0 ? 'partial' : 'unpaid',
        instant_pay: instantPay,
        discount: discountNominal,
        tax: taxAmount,
        extra_fee: extraFeeAmount,
        extra_fee_note: extraFeeNote || null,
        paid_amount: currentPaid,
        customer_id: form.customer_id || null,
        staff_id: selectedStaff[0]?.id || null,
        staff_ids: selectedStaff.map((s) => s.id),
        lines: cart.map((l) => ({ item_id: l.item.id, qty: l.qty })),
      };

      const r = await request('post', E.TRANSACTIONS.LIST, {
        data: payload,
        success: instantPay
          ? 'Transaksi berhasil diselesaikan'
          : currentPaid > 0
          ? 'Transaksi disimpan (Belum Lunas)'
          : 'Transaksi disimpan (Belum Bayar)',
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
          instant_pay: false,
          paid_amount: 0,
          discount: discountNominal,
          tax: taxAmount,
          extra_fee: extraFeeAmount,
          extra_fee_note: extraFeeNote || null,
          customer_id: form.customer_id || null,
          staff_id: selectedStaff[0]?.id || null,
          staff_ids: selectedStaff.map((s) => s.id),
          lines: cart.map((l) => ({ item_id: l.item.id, qty: l.qty })),
        },
        success: 'Pesanan disimpan ke Menunggu Pembayaran',
      });
      setCart([]);
      setForm({ customer_id: '', staff_id: '', payment_method: 'cash', notes: '' });
      setSelectedStaff([]);
      setShowAddStaff(false);
      setDiscountVal('');
      setTaxPercent('');
      setExtraFee('');
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
            {/* Pelanggan */}
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

            {/* Tanggal Transaksi & Keterangan */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div>
                <span className="mb-1 block font-semibold text-stone-500 uppercase tracking-wider text-[11px]">
                  Tanggal Transaksi
                </span>
                <div className="relative">
                  <input
                    type="datetime-local"
                    className="input !py-1.5 !text-xs !bg-stone-50/50 focus:!bg-white"
                    value={txDate}
                    onChange={(e) => setTxDate(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <span className="mb-1 block font-semibold text-stone-500 uppercase tracking-wider text-[11px]">
                  Keterangan / Catatan
                </span>
                <input
                  className="input !py-1.5 !text-xs !bg-stone-50/50 focus:!bg-white"
                  placeholder="Keterangan transaksi…"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </div>
            </div>

            {/* Pegawai / Stylist (Bisa Lebih Dari 1) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                    Pegawai / Stylist
                  </span>
                  {selectedStaff.length > 0 && (
                    <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-bold text-brand-700">
                      {selectedStaff.length} orang
                    </span>
                  )}
                </div>
                {selectedStaff.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowAddStaff((v) => !v)}
                    className="inline-flex items-center gap-1 rounded-lg bg-stone-100 px-2.5 py-1 text-xs font-semibold text-stone-700 hover:bg-stone-200 transition-colors"
                  >
                    <Plus size={13} />
                    {showAddStaff ? 'Tutup Pilihan' : 'Tambah Pegawai'}
                  </button>
                )}
              </div>

              {/* Chips Pegawai yang Terpilih */}
              {selectedStaff.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {selectedStaff.map((s) => (
                    <div
                      key={s.id}
                      className="group flex items-center gap-2 rounded-xl border border-brand-200 bg-brand-50/80 py-1 pl-1.5 pr-2 text-xs shadow-xs transition-all hover:border-brand-300"
                    >
                      {s.photo ? (
                        <img src={imageUrl(s.photo)} className="h-6 w-6 rounded-lg object-cover ring-1 ring-brand-300" />
                      ) : (
                        <div className="grid h-6 w-6 place-items-center rounded-lg bg-brand-600 text-[10px] font-bold text-white">
                          {s.name?.charAt(0)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="font-semibold text-ink leading-tight">{s.name}</div>
                        {s.position && <div className="text-[10px] text-brand-700 leading-tight">{s.position}</div>}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveStaff(s.id)}
                        className="ml-1 rounded-md p-1 text-stone-400 hover:bg-rose-100 hover:text-rose-600 transition-colors"
                        title="Hapus pegawai ini"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}

              {/* Dropdown Pencarian Staff */}
              {(selectedStaff.length === 0 || showAddStaff) && (
                <AsyncSearchSelect
                  value=""
                  onChange={handleAddStaff}
                  fetchUrl={E.STAFF.LIST}
                  params={{ is_active: 1 }}
                  placeholder={
                    selectedStaff.length > 0
                      ? 'Pilih pegawai tambahan…'
                      : 'Pilih staff / stylist yang melayani (bisa >1)…'
                  }
                  searchPlaceholder="Ketik nama staff…"
                  renderOption={(s) => {
                    const isSelected = selectedStaff.some((st) => st.id === s.id);
                    return (
                      <div className={`flex items-center justify-between gap-2 ${isSelected ? 'opacity-40' : ''}`}>
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
                        {isSelected && <span className="text-[10px] font-semibold text-brand-600">Sudah Dipilih</span>}
                      </div>
                    );
                  }}
                />
              )}

              {/* Info Pembagian Komisi jika lebih dari 1 pegawai */}
              {selectedStaff.length > 1 && totalCommission > 0 && (
                <div className="flex items-center justify-between rounded-lg bg-amber-50/80 border border-amber-200/60 px-2.5 py-1.5 text-xs text-amber-800">
                  <span>Komisi dibagi rata ({selectedStaff.length} orang):</span>
                  <span className="font-bold text-amber-900">
                    {rupiah(Math.floor(totalCommission / selectedStaff.length))}/orang
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Opsi Kasir Mini: Langsung Bayar Toggle & Tambah Biaya Tambahan Button */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-stone-100 pt-3">
            {/* Toggle Langsung Bayar */}
            <button
              type="button"
              onClick={() => {
                const nextState = !instantPay;
                setInstantPay(nextState);
                if (nextState) {
                  setPaidAmountInput('');
                } else if (!paidAmountInput) {
                  setPaidAmountInput('0');
                }
              }}
              className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition-all shadow-sm ${
                instantPay
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-700 ring-1 ring-emerald-400/40'
                  : 'border-rose-400 bg-rose-50 text-rose-700 ring-1 ring-rose-400/40'
              }`}
              title="Klik untuk ubah apakah transaksi langsung dibayar atau disimpan sebagai belum lunas/belum bayar"
            >
              {instantPay ? (
                <>
                  <Check size={14} className="text-emerald-600 stroke-[3]" />
                  <span>Langsung bayar</span>
                </>
              ) : (
                <>
                  <X size={14} className="text-rose-600 stroke-[3]" />
                  <span>Tidak langsung bayar</span>
                </>
              )}
            </button>

            {/* Tombol Tambah Biaya Tambahan (PPN & Biaya Lain) */}
            <button
              type="button"
              onClick={() => setShowExtraFeeModal(true)}
              className="flex items-center gap-1.5 rounded-xl border border-stone-200 bg-stone-50/70 px-3 py-1.5 text-xs font-semibold text-stone-700 hover:border-brand-300 hover:bg-white hover:text-brand-700 transition-all"
            >
              <Plus size={13} className="text-brand-600" />
              <span>Tambah Biaya Tambahan</span>
              {(Number(taxPercent) > 0 || Number(extraFee) > 0) && (
                <span className="grid h-4 w-4 place-items-center rounded-full bg-brand-600 text-[10px] font-bold text-white">
                  !
                </span>
              )}
            </button>
          </div>

          {/* Jika TIDAK Langsung Bayar: Input Jumlah Bayar Sekarang (DP / Bayar Sebagian) */}
          {!instantPay && (
            <div className="rounded-2xl border border-amber-200/80 bg-amber-50/60 p-3.5 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-amber-900 uppercase tracking-wider text-[11px]">
                  Jumlah Bayar Sekarang (DP)
                </span>
                <span className="text-[11px] font-bold">
                  {currentPaid === 0 ? (
                    <span className="text-rose-600">Belum Bayar (Rp 0)</span>
                  ) : currentPaid < finalTotal ? (
                    <span className="text-amber-700">Belum Lunas</span>
                  ) : (
                    <span className="text-emerald-600">Lunas (Selesai)</span>
                  )}
                </span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max={finalTotal}
                  className="input !py-2 !text-sm !font-bold !bg-white"
                  placeholder="0 untuk belum bayar sama sekali"
                  value={paidAmountInput}
                  onChange={(e) => setPaidAmountInput(e.target.value)}
                />
              </div>
              <div className="flex justify-between items-center text-[11px] text-stone-500 pt-1 border-t border-amber-200/60">
                <span>Sisa Tagihan Nanti:</span>
                <span className="font-bold text-brand-700 text-xs">
                  {rupiah(remainingBill)}
                </span>
              </div>
            </div>
          )}

          {/* Payment Method Pills (Hanya jika langsung bayar atau bayar DP > 0) */}
          {(instantPay || currentPaid > 0) && (
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
          )}

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

          {/* Totals Breakdown */}
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
            {taxAmount > 0 && (
              <div className="flex justify-between text-stone-600">
                <span>PPN ({taxPercent}%)</span>
                <span>+ {rupiah(taxAmount)}</span>
              </div>
            )}
            {extraFeeAmount > 0 && (
              <div className="flex justify-between text-stone-600">
                <span>{extraFeeNote || 'Biaya Tambahan'}</span>
                <span>+ {rupiah(extraFeeAmount)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-stone-200/80 pt-2 text-base font-bold text-ink">
              <span>Total Harga</span>
              <span className="font-display text-xl text-brand-700">{rupiah(finalTotal)}</span>
            </div>
            {!instantPay && (
              <div className="flex justify-between border-t border-dashed border-stone-200 pt-1.5 text-xs">
                <span className="text-emerald-700 font-medium">Dibayar: {rupiah(currentPaid)}</span>
                <span className="text-rose-600 font-bold">Sisa: {rupiah(remainingBill)}</span>
              </div>
            )}
          </div>

          {/* Action buttons: Bayar (Hijau Kasir Mini) or Simpan Transaksi */}
          <div className="space-y-2 pt-1">
            <button
              className={`w-full !py-3 !text-base flex items-center justify-center gap-2 rounded-xl font-bold shadow-md transition-all ${
                instantPay
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
                  : 'btn-primary'
              }`}
              disabled={saving || !cart.length}
              onClick={submitTransaction}
            >
              {saving && <Loader2 size={18} className="animate-spin" />}
              {saving
                ? 'Memproses…'
                : instantPay
                ? 'Bayar'
                : currentPaid > 0
                ? 'Simpan Transaksi (Belum Lunas)'
                : 'Simpan Transaksi (Belum Bayar)'}
            </button>

            <button
              type="button"
              className="btn-ghost w-full !py-2.5 !text-xs !font-semibold text-stone-700 hover:!border-amber-400 hover:!bg-amber-50 hover:!text-amber-800"
              disabled={saving || !cart.length}
              onClick={holdTransaction}
              title="Simpan pesanan ke daftar antrean Menunggu Pembayaran"
            >
              <PauseCircle size={15} className="text-amber-600" />
              Tahan (Menunggu Pembayaran)
            </button>
          </div>
        </div>
      </aside>

      {/* Modal Tambah Biaya Tambahan (PPN & Biaya Tambahan) persis Kasir Mini */}
      {showExtraFeeModal && (
        <Modal title="Tambah Biaya Tambahan" onClose={() => setShowExtraFeeModal(false)}>
          <div className="space-y-4">
            {/* PPN */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-stone-600">PPN (%)</span>
                <div className="flex gap-1 text-xs">
                  <button
                    type="button"
                    onClick={() => setTaxPercent('0')}
                    className={`rounded-lg px-2 py-0.5 border ${
                      taxPercent === '0' || !taxPercent ? 'bg-stone-200 font-bold' : 'bg-stone-50'
                    }`}
                  >
                    0%
                  </button>
                  <button
                    type="button"
                    onClick={() => setTaxPercent('11')}
                    className={`rounded-lg px-2 py-0.5 border ${
                      taxPercent === '11' ? 'bg-brand-100 text-brand-700 border-brand-300 font-bold' : 'bg-stone-50'
                    }`}
                  >
                    11%
                  </button>
                </div>
              </div>
              <input
                type="number"
                min="0"
                max="100"
                className="input !bg-white"
                placeholder="Persentase PPN (contoh: 11)"
                value={taxPercent}
                onChange={(e) => setTaxPercent(e.target.value)}
              />
              {Number(taxPercent) > 0 && (
                <div className="text-right text-xs text-stone-500">
                  Estimasi PPN: <span className="font-bold text-ink">{rupiah(taxAmount)}</span>
                </div>
              )}
            </div>

            {/* Biaya Tambahan */}
            <div className="space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-stone-600">
                Biaya Tambahan (Rp)
              </span>
              <input
                type="number"
                min="0"
                className="input !bg-white"
                placeholder="Nominal biaya tambahan (Rp)"
                value={extraFee}
                onChange={(e) => setExtraFee(e.target.value)}
              />
            </div>

            {/* Keterangan Biaya Tambahan */}
            <div className="space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-stone-600">
                Keterangan Biaya Tambahan
              </span>
              <input
                className="input !bg-white"
                placeholder="Contoh: Biaya Layanan, Service Charge, Admin"
                value={extraFeeNote}
                onChange={(e) => setExtraFeeNote(e.target.value)}
              />
            </div>

            {/* Actions */}
            <div className="flex justify-between items-center pt-3 border-t border-stone-100">
              <button
                type="button"
                onClick={() => {
                  setTaxPercent('');
                  setExtraFee('');
                  setExtraFeeNote('');
                }}
                className="btn-ghost !text-xs !text-rose-600 hover:!bg-rose-50"
              >
                Hapus Biaya Tambahan
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={() => setShowExtraFeeModal(false)}
              >
                Simpan & Terapkan
              </button>
            </div>
          </div>
        </Modal>
      )}

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
