import { useEffect, useState } from 'react';
import { Receipt, Wallet, Sparkles, TrendingDown, TrendingUp, Calendar } from 'lucide-react';
import DataTable from '@/components/DataTable';
import { PageHeader } from '@/components/ui';
import { request, errMsg } from '@/utils/request';
import { API_ENDPOINTS as E } from '@/utils/endpoints';
import { rupiah, today, monthStart } from '@/utils/format';

const Stat = ({ label, value, icon: Icon, tone = 'stone', strong }) => {
  const tones = {
    stone: 'bg-stone-100 text-stone-600',
    brand: 'bg-brand-50 text-brand-600',
    amber: 'bg-amber-50 text-amber-600',
    rose: 'bg-rose-50 text-rose-600',
    emerald: 'bg-white/15 text-white',
  };
  return (
    <div className={`card relative overflow-hidden p-4 ${strong ? 'border-transparent bg-gradient-brand text-white shadow-elevated' : ''}`}>
      {strong && <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-white/10 blur-xl" />}
      <div className="relative flex items-start justify-between gap-2">
        <div className={`text-xs font-semibold uppercase tracking-wider ${strong ? 'text-white/70' : 'text-stone-400'}`}>
          {label}
        </div>
        <div className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl ${tones[tone]}`}>
          <Icon size={16} />
        </div>
      </div>
      <div className="relative mt-2 font-display text-xl font-bold">{value}</div>
    </div>
  );
};

export default function Reports() {
  const [range, setRange] = useState({ from: monthStart(), to: today() });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    setLoading(true); setError(null);
    request('get', E.REPORTS.SUMMARY, { params: range, silent: true })
      .then((r) => setData(r.data)).catch((e) => setError(errMsg(e))).finally(() => setLoading(false));
  }, [range, tick]);

  return (
    <div className="space-y-6">
      <PageHeader title="Laporan & Komisi" subtitle="Ringkasan omzet, biaya operasional, komisi item, dan laba bersih">
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-stone-200/70 bg-white p-1.5 shadow-card">
          <Calendar size={15} className="ml-2 text-stone-400" />
          {['from', 'to'].map((k, idx) => (
            <div key={k} className="flex items-center gap-1.5">
              {idx === 1 && <span className="text-xs text-stone-400">s/d</span>}
              <input
                type="date"
                className="rounded-xl border-0 bg-stone-50 px-2.5 py-1.5 text-xs font-semibold text-ink outline-none focus:ring-2 focus:ring-brand-500/20"
                value={range[k]}
                onChange={(e) => setRange({ ...range, [k]: e.target.value })}
              />
            </div>
          ))}
        </div>
      </PageHeader>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label="Transaksi" icon={Receipt} tone="stone" value={data?.count ?? '…'} />
        <Stat label="Pendapatan" icon={Wallet} tone="brand" value={data ? rupiah(data.revenue) : '…'} />
        <Stat label="Komisi Item" icon={Sparkles} tone="amber" value={data ? rupiah(data.commission) : '…'} />
        <Stat label="Pengeluaran" icon={TrendingDown} tone="rose" value={data ? rupiah(data.expenses) : '…'} />
        <Stat strong label="Laba Bersih" icon={TrendingUp} tone="emerald" value={data ? rupiah(data.net) : '…'} />
      </div>

      <div className="space-y-3">
        <div>
          <h2 className="text-lg font-bold text-ink">Komisi per Layanan / Produk</h2>
          <p className="text-xs text-stone-500">Rincian item terjual beserta total omzet dan komisi yang dihitung saat transaksi</p>
        </div>
        <DataTable
          loading={loading} error={error} onRetry={() => setTick((t) => t + 1)}
          rows={(data?.byItem || []).map((r, i) => ({ ...r, id: i }))}
          columns={[
            { key: 'item_name', label: 'Nama Item', render: (r) => <span className="font-semibold text-ink">{r.item_name}</span> },
            { key: 'qty', label: 'Terjual', render: (r) => <span className="font-medium">{r.qty} qty</span> },
            { key: 'revenue', label: 'Omzet', render: (r) => rupiah(r.revenue) },
            { key: 'commission', label: 'Komisi', render: (r) => <span className="font-bold text-brand-700">{rupiah(r.commission)}</span> },
          ]}
        />
        <p className="text-xs text-stone-400">Laba bersih = pendapatan − pengeluaran − komisi. Transaksi void tidak dihitung dalam rekap.</p>
      </div>
    </div>
  );
}
