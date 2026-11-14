import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Clock, Search, Banknote, Landmark, QrCode, CreditCard,
  CheckCircle, ArrowRight, Loader2, Ban, ShoppingBag, Eye, Printer,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { PageHeader, Skeleton, EmptyState, Badge } from '@/components/ui';
import Modal from '@/components/Modal';
import { useAuth } from '@/hooks/useAuth';
import { request, errMsg } from '@/utils/request';
import { confirmToast } from '@/utils/confirm';
import { API_ENDPOINTS as E } from '@/utils/endpoints';
import { rupiah, dateTime } from '@/utils/format';

const PAYMENTS = [
  { value: 'cash', label: 'Tunai', icon: Banknote },
  { value: 'qris', label: 'QRIS', icon: QrCode },
  { value: 'transfer', label: 'Transfer', icon: Landmark },
  { value: 'debit', label: 'Debit', icon: CreditCard },
];

export default function PendingPayments() {
  const nav = useNavigate();
  const { isOwner } = useAuth();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [payModal, setPayModal] = useState(null); // transaction object being paid
  const [detailModal, setDetailModal] = useState(null); // transaction detail object
  const [saving, setSaving] = useState(false);

  // Pay form state
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [discountMode, setDiscountMode] = useState('rp'); // 'rp' | 'percent'
  const [discountVal, setDiscountVal] = useState('');
  const [notes, setNotes] = useState('');

  const loadPending = async () => {
    setLoading(true);
    try {
      const res = await request('get', E.TRANSACTIONS.LIST, {
        params: { status: 'pending', limit: 100, sortBy: 'id', order: 'desc' },
        silent: true,
      });
      setList(res?.data || []);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPending();
  }, []);

  const openPay = async (tx) => {
    setSaving(true);
    try {
      const res = await request('get', E.TRANSACTIONS.DETAIL(tx.id), { silent: true });
      const fullTx = res.data;
      setPayModal(fullTx);
      setPaymentMethod('cash');
      setDiscountMode('rp');
      setDiscountVal(fullTx.discount ? String(fullTx.discount) : '');
      setNotes(fullTx.notes || '');
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setSaving(false);
    }
  };

  const openDetail = async (tx) => {
    try {
      const res = await request('get', E.TRANSACTIONS.DETAIL(tx.id), { silent: true });
      setDetailModal(res.data);
    } catch (e) {
      toast.error(errMsg(e));
    }
  };

  const voidTx = async (tx) => {
    if (!isOwner) return;
    if (
      !(await confirmToast(
        `Batalkan pesanan ${tx.invoice_no}? Stok produk akan dikembalikan ke stok toko.`,
        'Ya, Batalkan'
      ))
    )
      return;
    try {
      await request('delete', E.TRANSACTIONS.DETAIL(tx.id), { success: 'Pesanan berhasil dibatalkan (void)' });
      loadPending();
    } catch {
      // toast sudah ditampilkan
    }
  };

  const submitPayment = async (e) => {
    e.preventDefault();
    if (!payModal) return;
    setSaving(true);

    const sub = Number(payModal.subtotal) || 0;
    let disc = 0;
    if (discountMode === 'percent') {
      const pct = Math.min(Math.max(Number(discountVal) || 0, 0), 100);
      disc = Math.min(Math.round((sub * pct) / 100), sub);
    } else {
      disc = Math.min(Math.max(Number(discountVal) || 0, 0), sub);
    }

    try {
      const res = await request('post', E.TRANSACTIONS.PAY(payModal.id), {
        data: {
          payment_method: paymentMethod,
          discount: disc,
          notes: notes || null,
        },
        success: 'Pembayaran berhasil diselesaikan!',
      });
      setPayModal(null);
      nav(`/receipt/${res.data.id}`);
    } catch {
      // error toast handled
    } finally {
      setSaving(false);
    }
  };

  const filtered = list.filter((tx) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      tx.invoice_no?.toLowerCase().includes(q) ||
      tx.customer_name?.toLowerCase().includes(q) ||
      tx.cashier_name?.toLowerCase().includes(q)
    );
  });

  const modalSubtotal = Number(payModal?.subtotal) || 0;
  const modalCalculatedDiscount =
    discountMode === 'percent'
      ? Math.min(Math.round((modalSubtotal * Math.min(Math.max(Number(discountVal) || 0, 0), 100)) / 100), modalSubtotal)
      : Math.min(Math.max(Number(discountVal) || 0, 0), modalSubtotal);
  const modalFinalTotal = Math.max(modalSubtotal - modalCalculatedDiscount, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Menunggu Pembayaran"
        subtitle="Daftar pesanan aktif yang ditahan atau belum diselesaikan pembayarannya"
      >
        <button className="btn-ghost !text-xs" onClick={loadPending}>
          Muat Ulang
        </button>
      </PageHeader>

      {/* Search Bar & Summary Pill */}
      <div className="card flex flex-wrap items-center justify-between gap-3 p-3">
        <div className="relative min-w-[220px] flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            className="input !border-stone-200/80 !bg-stone-50/50 !pl-10 focus:!bg-white"
            placeholder="Cari no invoice, pelanggan…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-stone-600">
          <span className="flex h-2.5 w-2.5 rounded-full bg-amber-500 animate-pulse" />
          <span>{list.length} pesanan menunggu pembayaran</span>
        </div>
      </div>

      {/* Grid of Pending Orders */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-44" />
          ))}
        </div>
      ) : !filtered.length ? (
        <div className="card">
          <EmptyState text={search ? 'Tidak ada pesanan yang cocok' : 'Tidak ada pesanan menunggu pembayaran saat ini'} />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((tx) => (
            <div
              key={tx.id}
              className="card-interactive relative flex flex-col justify-between overflow-hidden border border-amber-200/60 bg-white p-5 shadow-card transition-all hover:border-brand-400"
            >
              <div className="h-1 bg-gradient-warm absolute top-0 left-0 right-0" />

              <div>
                <div className="flex items-center justify-between gap-2 border-b border-stone-100 pb-3">
                  <div>
                    <span className="font-mono text-xs font-bold text-ink">{tx.invoice_no}</span>
                    <div className="flex items-center gap-1.5 text-[11px] text-stone-400">
                      <Clock size={12} />
                      <span>{dateTime(tx.created_at)}</span>
                    </div>
                  </div>
                  <Badge tone="amber">Menunggu Bayar</Badge>
                </div>

                <div className="py-3 space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-stone-400">Pelanggan:</span>
                    <span className="font-semibold text-ink">{tx.customer_name || 'Umum'}</span>
                  </div>
                  {tx.staff_id && (
                    <div className="flex justify-between text-xs">
                      <span className="text-stone-400">Dilayani oleh:</span>
                      <span className="font-medium text-stone-700">Staff #{tx.staff_id}</span>
                    </div>
                  )}
                  {tx.notes && (
                    <div className="text-[11px] text-stone-500 italic bg-stone-50 rounded-lg p-1.5">
                      "{tx.notes}"
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t border-stone-100 pt-3">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-xs text-stone-500">Total Tagihan</span>
                  <span className="font-display text-lg font-bold text-brand-700">{rupiah(tx.total)}</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openDetail(tx)}
                    className="btn-ghost !px-2.5 !py-2 !text-xs"
                    title="Lihat Rincian"
                  >
                    <Eye size={14} />
                  </button>
                  {isOwner && (
                    <button
                      type="button"
                      onClick={() => voidTx(tx)}
                      className="btn-ghost !px-2.5 !py-2 !text-xs !text-accent-600 hover:!bg-accent-50"
                      title="Batalkan Pesanan (Void)"
                    >
                      <Ban size={14} />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => openPay(tx)}
                    className="btn-primary flex-1 !py-2 !text-xs"
                  >
                    <CheckCircle size={14} /> Bayar Sekarang
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pay Modal */}
      {payModal && (
        <Modal title={`Pembayaran: ${payModal.invoice_no}`} onClose={() => setPayModal(null)}>
          <form onSubmit={submitPayment} className="space-y-4">
            {/* Customer & Items Summary */}
            <div className="rounded-2xl bg-stone-50 p-3.5 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-stone-400">Pelanggan:</span>
                <span className="font-bold text-ink">{payModal.customer_name || 'Umum'}</span>
              </div>
              <div className="max-h-36 overflow-y-auto divide-y divide-stone-200/60 border-t border-stone-200/60 pt-2">
                {payModal.lines?.map((l) => (
                  <div key={l.id} className="flex justify-between py-1.5">
                    <span>
                      {l.item_name} <span className="text-stone-400">× {l.qty}</span>
                    </span>
                    <span className="font-semibold text-ink">{rupiah(l.subtotal)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Payment Method Pills */}
            <div className="space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-stone-600">
                Pilih Metode Pembayaran
              </span>
              <div className="grid grid-cols-4 gap-2">
                {PAYMENTS.map((p) => {
                  const active = paymentMethod === p.value;
                  return (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => setPaymentMethod(p.value)}
                      className={`flex flex-col items-center gap-1 rounded-xl border py-2 text-[11px] font-semibold transition-all ${
                        active
                          ? 'border-brand-500 bg-brand-50 text-brand-700 shadow-sm'
                          : 'border-stone-200 bg-stone-50/50 text-stone-500 hover:bg-white hover:text-ink'
                      }`}
                    >
                      <p.icon size={16} />
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Discount with Rp / % Toggle */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-stone-600">Diskon</span>
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
                  type="number"
                  min="0"
                  max={discountMode === 'percent' ? 100 : modalSubtotal}
                  className="input !bg-stone-50/50 focus:!bg-white"
                  placeholder={discountMode === 'percent' ? 'Contoh: 10 untuk 10%' : 'Nominal diskon (Rp)'}
                  value={discountVal}
                  onChange={(e) => setDiscountVal(e.target.value)}
                />
                {discountMode === 'percent' && discountVal && (
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-stone-500">
                    = {rupiah(modalCalculatedDiscount)}
                  </span>
                )}
              </div>
            </div>

            {/* Notes */}
            <div>
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-stone-600">
                Catatan (opsional)
              </span>
              <input
                className="input !bg-stone-50/50 focus:!bg-white"
                placeholder="Catatan transaksi…"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            {/* Price breakdown */}
            <div className="rounded-2xl bg-stone-50 p-3.5 space-y-1.5 text-sm">
              <div className="flex justify-between text-stone-500">
                <span>Subtotal</span>
                <span>{rupiah(modalSubtotal)}</span>
              </div>
              {modalCalculatedDiscount > 0 && (
                <div className="flex justify-between text-accent-600">
                  <span>Diskon {discountMode === 'percent' ? `(${discountVal}%)` : ''}</span>
                  <span>- {rupiah(modalCalculatedDiscount)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-stone-200 pt-2 text-base font-bold text-ink">
                <span>Total Akhir</span>
                <span className="font-display text-xl text-brand-700">{rupiah(modalFinalTotal)}</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-stone-100 pt-3">
              <button type="button" className="btn-ghost" onClick={() => setPayModal(null)}>
                Batal
              </button>
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                Selesaikan Pembayaran
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Detail Modal */}
      {detailModal && (
        <Modal title={`Rincian Pesanan: ${detailModal.invoice_no}`} onClose={() => setDetailModal(null)}>
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-2 rounded-2xl bg-stone-50 p-3.5">
              <div>
                <span className="text-stone-400">Pelanggan:</span>
                <div className="font-bold text-ink">{detailModal.customer_name || 'Umum'}</div>
              </div>
              <div>
                <span className="text-stone-400">Waktu Dibuat:</span>
                <div className="font-medium text-ink">{dateTime(detailModal.created_at)}</div>
              </div>
            </div>

            <div className="space-y-2">
              <span className="font-semibold uppercase tracking-wider text-stone-600">Daftar Layanan & Produk:</span>
              <div className="divide-y divide-stone-100 rounded-2xl border border-stone-200/80 p-3">
                {detailModal.lines?.map((l) => (
                  <div key={l.id} className="flex justify-between py-2">
                    <div>
                      <div className="font-semibold text-ink">{l.item_name}</div>
                      <div className="text-stone-400">
                        {rupiah(l.price)} × {l.qty}
                      </div>
                    </div>
                    <div className="font-bold text-ink">{rupiah(l.subtotal)}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-between border-t border-stone-100 pt-3 text-sm font-bold text-ink">
              <span>Total Tagihan:</span>
              <span className="font-display text-base text-brand-700">{rupiah(detailModal.total)}</span>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" className="btn-ghost" onClick={() => setDetailModal(null)}>
                Tutup
              </button>
              <button
                type="button"
                onClick={() => {
                  const txToPay = detailModal;
                  setDetailModal(null);
                  openPay(txToPay);
                }}
                className="btn-primary"
              >
                Bayar Sekarang
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

