import { useEffect, useState } from 'react';
import {
  Receipt, Wallet, Sparkles, TrendingDown, TrendingUp, Calendar,
  Award, Users, Scissors,
} from 'lucide-react';
import DataTable from '@/components/DataTable';
import { PageHeader, Badge } from '@/components/ui';
import { request, errMsg } from '@/utils/request';
import { API_ENDPOINTS as E } from '@/utils/endpoints';
import { rupiah, today, monthStart, imageUrl } from '@/utils/format';

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
  const [activeTab, setActiveTab] = useState('staff'); // 'staff' | 'item'

  useEffect(() => {
    setLoading(true);
    setError(null);
    request('get', E.REPORTS.SUMMARY, { params: range, silent: true })
      .then((r) => setData(r.data))
      .catch((e) => setError(errMsg(e)))
      .finally(() => setLoading(false));
  }, [range, tick]);

  const byStaffList = data?.byStaff || [];
  const totalStaffCommission = byStaffList.reduce(
    (sum, s) => sum + Number(s.total_commission || 0),
    0
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Laporan & Komisi"
        subtitle="Ringkasan omzet, laba bersih, dan tabel rincian komisi per karyawan serta komisi item"
      >
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

      {/* Ringkasan Statistik */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label="Transaksi" icon={Receipt} tone="stone" value={data?.count ?? '…'} />
        <Stat label="Pendapatan" icon={Wallet} tone="brand" value={data ? rupiah(data.revenue) : '…'} />
        <Stat label="Komisi Item" icon={Sparkles} tone="amber" value={data ? rupiah(data.commission) : '…'} />
        <Stat label="Pengeluaran" icon={TrendingDown} tone="rose" value={data ? rupiah(data.expenses) : '…'} />
        <Stat strong label="Laba Bersih" icon={TrendingUp} tone="emerald" value={data ? rupiah(data.net) : '…'} />
      </div>

      {/* Tab Navigasi Tabel Laporan Komisi */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200/80 pb-2">
        <div className="flex rounded-2xl bg-stone-100 p-1 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('staff')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 transition-all ${
              activeTab === 'staff'
                ? 'bg-white text-ink shadow-sm ring-1 ring-stone-200/60'
                : 'text-stone-500 hover:text-ink'
            }`}
          >
            <Users size={15} className="text-brand-600" />
            <span>Total Komisi per Karyawan</span>
            {byStaffList.length > 0 && (
              <span className="rounded-md bg-stone-100 px-1.5 py-0.5 text-[10px] text-stone-600">
                {byStaffList.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('item')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 transition-all ${
              activeTab === 'item'
                ? 'bg-white text-ink shadow-sm ring-1 ring-stone-200/60'
                : 'text-stone-500 hover:text-ink'
            }`}
          >
            <Scissors size={15} className="text-amber-600" />
            <span>Komisi per Layanan / Produk</span>
          </button>
        </div>

        {activeTab === 'staff' && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-stone-400">Total Komisi Periode Ini:</span>
            <span className="font-display text-base font-bold text-brand-700">
              {rupiah(totalStaffCommission)}
            </span>
          </div>
        )}
      </div>

      {/* Konten Tab 1: Tabel Total Komisi per Karyawan */}
      {activeTab === 'staff' && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-bold text-ink">Laporan Total Komisi per Karyawan</h2>
              <p className="text-xs text-stone-500">
                Daftar komisi dan omzet yang dihasilkan masing-masing staff/stylist pada periode yang dipilih
              </p>
            </div>
          </div>

          <DataTable
            loading={loading}
            error={error}
            onRetry={() => setTick((t) => t + 1)}
            rows={byStaffList.map((r, i) => ({ ...r, id: r.id || i }))}
            columns={[
              {
                key: 'staff',
                label: 'Nama Karyawan',
                render: (r) => (
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 shrink-0 overflow-hidden rounded-xl bg-stone-100 ring-1 ring-stone-200/80">
                      {r.photo ? (
                        <img src={imageUrl(r.photo)} alt={r.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="grid h-full w-full place-items-center bg-gradient-warm text-xs font-bold text-white">
                          {r.name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="font-semibold text-ink">{r.name}</div>
                      <div className="text-xs text-stone-400">{r.position || 'Staff / Stylist'}</div>
                    </div>
                  </div>
                ),
              },
              {
                key: 'transaction_count',
                label: 'Transaksi',
                render: (r) => (
                  <span className="font-medium text-stone-600">
                    {r.transaction_count} transaksi
                  </span>
                ),
              },
              {
                key: 'total_sales',
                label: 'Omzet Dilayani',
                render: (r) => (
                  <span className="font-medium text-stone-700">{rupiah(r.total_sales)}</span>
                ),
              },
              {
                key: 'total_commission',
                label: 'Total Komisi',
                right: true,
                render: (r) => (
                  <span className="font-display text-base font-bold text-brand-700">
                    {rupiah(r.total_commission)}
                  </span>
                ),
              },
            ]}
          />
          <p className="text-xs text-stone-400">
            * Komisi staff dihitung dari transaksi yang sudah selesai (lunas) pada rentang tanggal yang dipilih.
          </p>
        </div>
      )}

      {/* Konten Tab 2: Tabel Komisi per Layanan / Produk */}
      {activeTab === 'item' && (
        <div className="space-y-3">
          <div>
            <h2 className="text-lg font-bold text-ink">Komisi per Layanan / Produk</h2>
            <p className="text-xs text-stone-500">
              Rincian item terjual beserta total omzet dan komisi yang dihitung saat transaksi
            </p>
          </div>
          <DataTable
            loading={loading}
            error={error}
            onRetry={() => setTick((t) => t + 1)}
            rows={(data?.byItem || []).map((r, i) => ({ ...r, id: i }))}
            columns={[
              {
                key: 'item_name',
                label: 'Nama Item',
                render: (r) => <span className="font-semibold text-ink">{r.item_name}</span>,
              },
              {
                key: 'qty',
                label: 'Terjual',
                render: (r) => <span className="font-medium">{r.qty} qty</span>,
              },
              { key: 'revenue', label: 'Omzet', render: (r) => rupiah(r.revenue) },
              {
                key: 'commission',
                label: 'Komisi',
                right: true,
                render: (r) => (
                  <span className="font-bold text-brand-700">{rupiah(r.commission)}</span>
                ),
              },
            ]}
          />
          <p className="text-xs text-stone-400">
            Laba bersih = pendapatan − pengeluaran − komisi. Transaksi void tidak dihitung dalam rekap.
          </p>
        </div>
      )}
    </div>
  );
}
