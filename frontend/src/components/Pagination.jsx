import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Pagination({ pagination, onPage, onLimit, ...rest }) {
  const p = pagination || rest || {};
  const page = Number(p.page || 1);
  const limit = Number(p.limit || 10);
  const total = Number(p.total || 0);
  const totalPages = Math.max(Number(p.totalPages || 1), 1);
  const handlePage = onPage || rest.onChange || rest.onPage || (() => {});
  const handleLimit = onLimit || rest.onLimitChange || rest.onLimit || (() => {});

  const start = Math.max(1, Math.min(page - 2, totalPages - 4));
  const pages = Array.from({ length: Math.min(5, totalPages) }, (_, i) => start + i);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
      <div className="flex items-center gap-2 text-stone-500">
        <span>Tampil</span>
        <select
          className="input !w-auto !py-1.5 !text-xs"
          value={limit}
          onChange={(e) => handleLimit(+e.target.value)}
        >
          {[10, 25, 50, 100].map((n) => <option key={n}>{n}</option>)}
        </select>
        <span>dari <strong className="text-ink">{total}</strong> data</span>
      </div>

      <div className="flex items-center gap-1">
        <button
          className="btn-ghost !px-2.5 !py-1.5 !text-xs"
          disabled={page <= 1}
          onClick={() => handlePage(page - 1)}
        >
          <ChevronLeft size={14} /> Sebelumnya
        </button>

        {pages.map((pg) => (
          <button
            key={pg}
            onClick={() => handlePage(pg)}
            className={`h-8 w-8 rounded-xl text-xs font-semibold transition-all ${
              pg === page
                ? 'bg-gradient-warm text-white shadow-sm'
                : 'text-stone-500 hover:bg-stone-100 hover:text-ink'
            }`}
          >
            {pg}
          </button>
        ))}

        <button
          className="btn-ghost !px-2.5 !py-1.5 !text-xs"
          disabled={page >= totalPages}
          onClick={() => handlePage(page + 1)}
        >
          Berikutnya <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}
