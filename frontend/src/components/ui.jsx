import { AlertTriangle, Inbox } from 'lucide-react';

export const Skeleton = ({ className = '' }) => (
  <div className={`animate-pulse rounded-xl bg-gradient-to-r from-stone-100 to-stone-200 ${className}`} />
);

export const EmptyState = ({ text = 'Belum ada data' }) => (
  <div className="flex flex-col items-center gap-3 py-16 text-stone-400">
    <div className="rounded-2xl bg-stone-100 p-4">
      <Inbox size={32} />
    </div>
    <p className="text-sm font-medium">{text}</p>
  </div>
);

export const ErrorState = ({ message, onRetry }) => (
  <div className="flex flex-col items-center gap-4 py-16 text-center">
    <div className="rounded-2xl bg-accent-50 p-4 text-accent-500">
      <AlertTriangle size={32} />
    </div>
    <p className="text-sm font-medium text-stone-600">{message}</p>
    {onRetry && (
      <button className="btn-ghost !text-xs" onClick={onRetry}>
        Muat ulang
      </button>
    )}
  </div>
);

const TONES = {
  green: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/50',
  red: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200/50',
  amber: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200/50',
  stone: 'bg-stone-50 text-stone-600 ring-1 ring-stone-200/50',
  brand: 'bg-brand-50 text-brand-700 ring-1 ring-brand-200/50',
};

export const Badge = ({ tone = 'stone', children }) => (
  <span className={`whitespace-nowrap rounded-lg px-2.5 py-1 text-[11px] font-semibold ${TONES[tone]}`}>
    {children}
  </span>
);

export const PageHeader = ({ title, subtitle, children }) => (
  <div className="flex flex-wrap items-center justify-between gap-3">
    <div>
      <h1 className="text-2xl font-bold text-ink">{title}</h1>
      {subtitle && <p className="mt-0.5 text-sm text-stone-500">{subtitle}</p>}
    </div>
    <div className="flex items-center gap-2">{children}</div>
  </div>
);
