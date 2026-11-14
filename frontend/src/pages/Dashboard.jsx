import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles, Pencil, ArrowRight, Award, UserCheck, TrendingUp,
  Clock, ShoppingCart, ShoppingBag, Store, MapPin, Phone,
} from 'lucide-react';
import { MENU } from '@/utils/menu';
import { useAuth } from '@/hooks/useAuth';
import { request } from '@/utils/request';
import { API_ENDPOINTS as E } from '@/utils/endpoints';
import { rupiah, imageUrl } from '@/utils/format';
import { Skeleton, Badge } from '@/components/ui';

export default function Dashboard() {
  const { user, isOwner } = useAuth();
  const [stats, setStats] = useState(null);
  const [shop, setShop] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      request('get', E.DASHBOARD.STATS, { silent: true }).catch(() => null),
      request('get', E.SETTINGS, { silent: true }).catch(() => null),
    ]).then(([statsRes, shopRes]) => {
      if (statsRes?.data) setStats(statsRes.data);
      if (shopRes?.data) setShop(shopRes.data);
      setLoading(false);
    });
  }, []);

  const greetTime = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Selamat Pagi';
    if (h < 15) return 'Selamat Siang';
    if (h < 18) return 'Selamat Sore';
    return 'Selamat Malam';
  };

  const todaySales = stats?.today?.sales ?? 0;
  const todayCount = stats?.today?.count ?? 0;
  const pendingCount = stats?.pendingCount ?? 0;
  const staffCommissions = stats?.staffCommissions || [];
  const totalStaffCommission = stats?.totalStaffCommission ?? 0;

  return (
    <div className="space-y-6 pb-20">
      {/* Top Bar Summary: Kasir Mini SERVIS Style */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-gradient-brand p-4 text-white shadow-elevated">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/10 text-brand-300">
            <TrendingUp size={20} />
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-white/60">
              Laporan Hari Ini • Total Penjualan
            </div>
            <div className="font-display text-xl font-bold text-white">
              {rupiah(todaySales)}{' '}
              <span className="text-xs font-normal text-white/60">({todayCount} transaksi)</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {pendingCount > 0 && (
            <Link
              to="/pending-payments"
              className="flex items-center gap-1.5 rounded-xl bg-amber-500/20 px-3 py-1.5 text-xs font-semibold text-amber-200 ring-1 ring-amber-400/30 transition hover:bg-amber-500/30"
            >
              <Clock size={13} className="animate-pulse" />
              <span>{pendingCount} Menunggu Bayar</span>
            </Link>
          )}
          <div className="rounded-xl bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/90">
            {isOwner ? '👑 Owner' : '💼 Kasir / Pegawai'}
          </div>
        </div>
      </div>

      {/* Salon Profile Card (persis format kartu toko di foto Kasir Mini) */}
      <div className="card relative flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-24 shrink-0 items-center justify-center rounded-2xl border border-stone-200/80 bg-stone-50 p-2 shadow-sm">
            <img src="/logo.png" alt="Be Rise Salon" className="h-full w-auto object-contain" />
          </div>
          <div>
            <h2 className="font-display text-xl font-bold text-ink">
              {shop.salon_name || 'Be Rise Salon'}
            </h2>
            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stone-500">
              <span className="flex items-center gap-1">
                <MapPin size={13} className="text-brand-600" />
                {shop.address || 'Jakarta'}
              </span>
              <span className="flex items-center gap-1">
                <Phone size={13} className="text-brand-600" />
                {shop.phone || '-'}
              </span>
            </div>
          </div>
        </div>

        {isOwner && (
          <Link
            to="/settings"
            className="btn-ghost !px-3 !py-1.5 !text-xs text-stone-600 hover:!border-brand-300 hover:!bg-brand-50 hover:!text-brand-700"
            title="Edit Pengaturan Salon"
          >
            <Pencil size={13} /> Edit Informasi
          </Link>
        )}
      </div>

      {/* Card: Total Komisi per Karyawan (Revisi #4) */}
      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 bg-stone-50/60 p-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-amber-50 text-amber-600 ring-1 ring-amber-200/60">
              <Award size={18} />
            </div>
            <div>
              <h3 className="font-bold text-ink">Total Komisi per Karyawan</h3>
              <p className="text-xs text-stone-500">
                Rekap bagi hasil komisi layanan dan produk yang dikerjakan oleh masing-masing staff
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-stone-400 uppercase tracking-wider font-semibold">
              Total Semua Komisi
            </div>
            <div className="font-display text-lg font-bold text-brand-700">
              {rupiah(totalStaffCommission)}
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-6">
          {loading ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-24" />
              ))}
            </div>
          ) : !staffCommissions.length ? (
            <div className="py-6 text-center text-xs text-stone-400">
              Belum ada data staff aktif atau transaksi komisi tercatat
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {staffCommissions.map((s) => (
                <div
                  key={s.id}
                  className="card flex items-center gap-3.5 border border-stone-200/80 p-3.5 transition hover:border-brand-300 hover:shadow-card-hover"
                >
                  <div className="h-12 w-12 shrink-0 overflow-hidden rounded-2xl bg-stone-100 ring-1 ring-stone-200/80">
                    {s.photo ? (
                      <img src={imageUrl(s.photo)} alt={s.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="grid h-full w-full place-items-center bg-gradient-warm text-sm font-bold text-white">
                        {s.name?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="truncate font-semibold text-ink">{s.name}</span>
                      <span className="text-[10px] text-stone-400 shrink-0">{s.transaction_count} tx</span>
                    </div>
                    <div className="text-xs text-stone-500 truncate">{s.position || 'Stylist'}</div>
                    <div className="mt-1 flex items-baseline justify-between gap-2 border-t border-stone-100 pt-1">
                      <span className="text-[11px] text-stone-400">Total Komisi:</span>
                      <span className="font-display text-sm font-bold text-brand-700">
                        {rupiah(s.total_commission)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Menu Grid: Persis Menu Kasir Mini */}
      <div className="space-y-3">
        <h3 className="font-bold text-ink text-sm uppercase tracking-wider text-stone-500">
          Menu Aplikasi
        </h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {MENU.filter((m) => !m.owner || isOwner).map((m, i) => (
            <Link
              key={m.to}
              to={m.to}
              className="card-interactive group relative flex flex-col items-start gap-4 p-5 animate-slide-up"
              style={{ animationDelay: `${i * 30}ms`, animationFillMode: 'backwards' }}
            >
              {m.to === '/pending-payments' && pendingCount > 0 && (
                <span className="absolute right-3 top-3 grid h-5 min-w-[20px] place-items-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-white shadow-sm">
                  {pendingCount}
                </span>
              )}
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-brand-50 to-brand-100 text-brand-600 shadow-sm transition-all duration-200 group-hover:scale-105 group-hover:shadow-md">
                <m.icon size={22} />
              </span>
              <div>
                <span className="font-semibold leading-tight text-ink">{m.label}</span>
                {m.owner && (
                  <span className="mt-1 block text-[10px] font-semibold uppercase tracking-wider text-brand-500">
                    Owner
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Bottom Sticky Action Bar: Tombol "Transaksi" Besar seperti Kasir Mini */}
      <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-stone-200/80 bg-white/95 p-3 shadow-elevated backdrop-blur-md lg:hidden print:hidden">
        <Link
          to="/cashier"
          className="btn-primary flex w-full items-center justify-center gap-2 !py-3.5 !text-base shadow-lg"
        >
          <ShoppingCart size={18} />
          <span>Buka Transaksi Kasir</span>
          <ArrowRight size={18} />
        </Link>
      </div>
    </div>
  );
}
