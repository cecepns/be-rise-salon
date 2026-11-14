import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Printer, Ban, Search, Calendar, CreditCard, Banknote, Landmark,
  QrCode, CheckCircle, Clock, AlertCircle, ArrowRight, Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import usePaginated from '@/hooks/usePaginated';
import { useAuth } from '@/hooks/useAuth';
import Modal from '@/components/Modal';
import DataTable from '@/components/DataTable';
import Pagination from '@/components/Pagination';
import { PageHeader, Badge, EmptyState } from '@/components/ui';
import { confirmToast } from '@/utils/confirm';
import { request, errMsg } from '@/utils/request';
import { API_ENDPOINTS as E } from '@/utils/endpoints';
import { rupiah, dateTime } from '@/utils/format';

const STATUS_FILTERS = [
  { value: '', label: 'Semua Status' },
  { value: 'paid', label: 'Selesai (Lunas)', tone: 'green' },
  { value: 'partial', label: 'Belum Lunas', tone: 'amber' },
  { value: 'unpaid', label: 'Belum Bayar', tone: 'red' },
  { value: 'void', label: 'Dibatalkan', tone: 'stone' },
];

const PAYMENTS = [
  { value: 'cash', label: 'Tunai', icon: Banknote },
  { value: 'qris', label: 'QRIS', icon: QrCode },
  { value: 'transfer', label: 'Transfer', icon: Landmark },
  { value: 'debit', label: 'Debit', icon: CreditCard },
];

export default function HistoryPage() {
  const { isOwner } = useAuth();
  const t = usePaginated(E.TRANSACTIONS.LIST, { sortBy: 'id', order: 'desc' });

  // Modal Pelunasan / Pembayaran
  const [payModal, setPayModal] = useState(null); // transaction object
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('cash');
  const [payNotes, setPayNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const activeStatus = t.filters.status || '';

  const setStatusFilter = (val) => {
    t.setFilter('status', val);
  };

  const openPayModal = (row) => {
    const total = Number(row.total || 0);
    const paid = Number(row.paid_amount || 0);
    const remaining = Math.max(total - paid, 0);

    setPayModal(row);
    setPayAmount(remaining > 0 ? String(remaining) : String(total));
    setPayMethod(row.payment_method || 'cash');
    setPayNotes('');
  };

  const handlePay = async (e) => {
    e.preventDefault();
    if (!payModal) return;

    const amount = Number(payAmount);
    if (!amount || amount <= 0) {
      return toast.error('Nominal pembayaran harus lebih dari 0');
    }

    setSaving(true);
    try {
      const res = await request('post', E.TRANSACTIONS.PAY(payModal.id), {
        data: {
          amount,
          payment_method: payMethod,
          notes: payNotes,
        },
        success: 'Pembayaran berhasil dicatat',
      });

      setPayModal(null);
      t.reload();
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setSaving(false);
    }
  };

  const handleVoid = async (row) => {
    if (!isOwner) return;
    if (
      !(await confirmToast(
        `Batalkan transaksi ${row.invoice_no}? Stok produk akan dikembalikan.`,
        'Ya, Batalkan (Void)'
      ))
    )
      return;

    try {
      await request('delete', E.TRANSACTIONS.DETAIL(row.id), {
        success: 'Transaksi berhasil dibatalkan (void)',
      });
      t.reload();
    } catch {
      // toast otomatis
    }
  };

  const renderStatusBadge = (r) => {
    const total = Number(r.total || 0);
    const paid = Number(r.paid_amount || 0);
    const remaining = Math.max(total - paid, 0);

    if (r.status === 'paid') {
      return <Badge tone="green">Selesai</Badge>;
    }
    if (r.status === 'partial') {
      return (
        <Badge tone="amber">
          <span>Belum Lunas</span>
          <span className="ml-1 text-[10px] font-normal opacity-90">({rupiah(remaining)})</span>
        </Badge>
      );
    }
    if (r.status === 'unpaid' || r.status === 'pending') {
      return <Badge tone="red">Belum Bayar</Badge>;
    }
    if (r.status === 'void') {
      return <Badge tone="stone">Dibatalkan</Badge>;
    }
    return <Badge tone="stone">{r.status}</Badge>;
  };

  const columns = [
    {
      key: 'invoice_no',
      label: 'No. Invoice',
      render: (r) => (
        <div>
          <span className="font-mono text-xs font-bold text-ink">{r.invoice_no}</span>
          <div className="text-[11px] text-stone-400">{dateTime(r.created_at)}</div>
        </div>
      ),
    },
    {
      key: 'customer_name',
      label: 'Pelanggan',
      render: (r) => (
        <div>
          <span className="font-medium text-ink">{r.customer_name || 'Pelanggan Umum'}</span>
          {r.cashier_name && (
            <div className="text-[10px] text-stone-400">Kasir: {r.cashier_name}</div>
          )}
        </div>
      ),
    },
    {
      key: 'total',
      label: 'Total Tagihan',
      render: (r) => (
        <div>
          <span className="font-display font-bold text-brand-700">{rupiah(r.total)}</span>
          {Number(r.paid_amount || 0) > 0 && r.status !== 'paid' && (
            <div className="text-[10px] text-emerald-600">Dibayar: {rupiah(r.paid_amount)}</div>
          )}
        </div>
      ),
    },
    {
      key: 'payment_method',
      label: 'Metode',
      render: (r) => (
        <Badge tone="stone">
          <span className="uppercase text-[10px] tracking-wider">{r.payment_method || 'cash'}</span>
        </Badge>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: renderStatusBadge,
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Riwayat Transaksi"
        subtitle="Pantau transaksi salon, cetak resi pembayaran, serta kelola transaksi yang belum bayar atau belum lunas"
      />

      {/* Filter Tabs Status: Selesai, Belum Lunas, Belum Bayar, Dibatalkan */}
      <div className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-stone-200/80 bg-stone-50/60 p-1.5">
        {STATUS_FILTERS.map((s) => {
          const active = activeStatus === s.value;
          return (
            <button
              key={s.value}
              type="button"
              onClick={() => setStatusFilter(s.value)}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                active
                  ? 'bg-white text-ink shadow-sm ring-1 ring-stone-200'
                  : 'text-stone-500 hover:bg-stone-100 hover:text-ink'
              }`}
            >
              {s.value && (
                <span
                  className={`h-2 w-2 rounded-full ${
                    s.value === 'paid'
                      ? 'bg-emerald-500'
                      : s.value === 'partial'
                      ? 'bg-amber-500'
                      : s.value === 'unpaid'
                      ? 'bg-rose-500'
                      : 'bg-stone-400'
                  }`}
                />
              )}
              {s.label}
            </button>
          );
        })}
      </div>

      {/* Search & Date Filter Bar */}
      <div className="card flex flex-wrap items-center gap-2.5 p-3">
        <div className="relative min-w-[200px] flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            className="input !border-stone-200/80 !bg-stone-50/50 !pl-10 focus:!bg-white"
            placeholder="Cari no. invoice atau pelanggan…"
            value={t.search}
            onChange={(e) => t.setSearch(e.target.value)}
          />
        </div>

        {/* Date Filter */}
        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-stone-400">Dari:</span>
          <input
            type="date"
            className="input !w-auto !py-1.5 !text-xs !bg-stone-50/50 focus:!bg-white"
            value={t.from}
            onChange={(e) => t.setFrom(e.target.value)}
          />
          <span className="text-stone-400">Sampai:</span>
          <input
            type="date"
            className="input !w-auto !py-1.5 !text-xs !bg-stone-50/50 focus:!bg-white"
            value={t.to}
            onChange={(e) => t.setTo(e.target.value)}
          />
          {(t.from || t.to) && (
            <button
              type="button"
              onClick={() => {
                t.setFrom('');
                t.setTo('');
              }}
              className="btn-ghost !px-2 !py-1 !text-[11px] text-stone-400 hover:text-ink"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Transactions Table */}
      <div className="card overflow-hidden">
        <DataTable
          columns={columns}
          data={t.data}
          loading={t.loading}
          actions={(r) => {
            const isUnpaidOrPartial = r.status === 'unpaid' || r.status === 'partial' || r.status === 'pending';
            return (
              <div className="flex justify-end items-center gap-1.5">
                {/* Tombol Bayar / Lunasi jika belum lunas / belum bayar */}
                {isUnpaidOrPartial && (
                  <button
                    type="button"
                    onClick={() => openPayModal(r)}
                    className="flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 ring-1 ring-emerald-300/60 transition"
                    title="Bayar / Lunasi Tagihan"
                  >
                    <CreditCard size={13} />
                    <span>Bayar</span>
                  </button>
                )}

                {/* Cetak Resi */}
                <Link
                  to={`/receipt/${r.id}`}
                  className="btn-ghost !px-2.5 !py-1 !text-xs text-stone-600 hover:!border-brand-300 hover:!bg-brand-50 hover:!text-brand-700"
                  title="Cetak Resi"
                >
                  <Printer size={13} /> Resi
                </Link>

                {/* Void / Batalkan (Khusus Owner) */}
                {isOwner && r.status !== 'void' && (
                  <button
                    type="button"
                    onClick={() => handleVoid(r)}
                    className="btn-ghost !px-2.5 !py-1 !text-xs !text-accent-600 hover:!border-accent-500/30 hover:!bg-accent-50"
                    title="Batalkan / Void Transaksi"
                  >
                    <Ban size={13} /> Void
                  </button>
                )}
              </div>
            );
          }}
        />
        <Pagination {...t.pagination} onChange={t.setPage} onLimitChange={t.setLimit} />
      </div>

      {/* Modal Pelunasan / Pembayaran */}
      {payModal && (
        <Modal title="Pembayaran / Pelunasan Transaksi" onClose={() => setPayModal(null)}>
          <form onSubmit={handlePay} className="space-y-4">
            {/* Info Transaksi */}
            <div className="rounded-2xl border border-stone-200/80 bg-stone-50/70 p-4 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-stone-500">No. Invoice:</span>
                <span className="font-mono font-bold text-ink">{payModal.invoice_no}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Pelanggan:</span>
                <span className="font-medium text-ink">{payModal.customer_name || 'Pelanggan Umum'}</span>
              </div>
              <div className="border-t border-stone-200/80 pt-2 flex justify-between text-sm">
                <span className="font-semibold text-stone-600">Total Tagihan:</span>
                <span className="font-bold text-ink">{rupiah(payModal.total)}</span>
              </div>
              {Number(payModal.paid_amount || 0) > 0 && (
                <div className="flex justify-between text-xs text-emerald-600">
                  <span>Sudah Dibayar:</span>
                  <span>{rupiah(payModal.paid_amount)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold text-brand-700 border-t border-dashed border-stone-200 pt-1.5">
                <span>Sisa Tagihan:</span>
                <span>{rupiah(Math.max(Number(payModal.total) - Number(payModal.paid_amount || 0), 0))}</span>
              </div>
            </div>

            {/* Input Nominal Pembayaran Sekarang */}
            <div>
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-stone-600">
                Nominal Bayar Sekarang (Rp)
              </span>
              <input
                type="number"
                min="1"
                className="input !text-base !font-bold !bg-white"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                placeholder="Masukkan nominal bayar…"
                required
              />
              <div className="mt-1 flex items-center justify-between text-[11px] text-stone-400">
                <span>
                  Sisa setelah bayar:{' '}
                  <span className="font-semibold text-ink">
                    {rupiah(
                      Math.max(
                        Number(payModal.total) - (Number(payModal.paid_amount || 0) + (Number(payAmount) || 0)),
                        0
                      )
                    )}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setPayAmount(
                      String(Math.max(Number(payModal.total) - Number(payModal.paid_amount || 0), 0))
                    )
                  }
                  className="text-brand-600 hover:underline font-semibold"
                >
                  Lunasi Penuh
                </button>
              </div>
            </div>

            {/* Pilihan Metode Pembayaran */}
            <div>
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-stone-600">
                Metode Pembayaran
              </span>
              <div className="grid grid-cols-4 gap-2">
                {PAYMENTS.map((p) => {
                  const active = payMethod === p.value;
                  return (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => setPayMethod(p.value)}
                      className={`flex flex-col items-center gap-1 rounded-xl border py-2.5 text-xs font-semibold transition-all ${
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

            {/* Catatan */}
            <div>
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-stone-600">
                Catatan (Opsional)
              </span>
              <input
                className="input !bg-white"
                value={payNotes}
                onChange={(e) => setPayNotes(e.target.value)}
                placeholder="Contoh: Pelunasan sisa tagihan…"
              />
            </div>

            {/* Action buttons */}
            <div className="flex justify-end gap-2 pt-2 border-t border-stone-100">
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setPayModal(null)}
                disabled={saving}
              >
                Batal
              </button>
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving && <Loader2 size={16} className="animate-spin" />}
                {saving ? 'Menyimpan…' : 'Konfirmasi Pembayaran'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

