import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Pagination({ pagination, onPage, onLimit }) {
  const { page, limit, total, totalPages } = pagination;
  const start = Math.max(1, Math.min(page - 2, totalPages - 4));
  const pages = Array.from({ length: Math.min(5, totalPages) }, (_, i) => start + i);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
      <div className="flex items-center gap-2 text-stone-500">
        <span>Tampil</span>
        <select
          className="input !w-auto !py-1.5 !text-xs"
          value={limit}
          onChange={(e) => onLimit(+e.target.value)}
        >
          {[10, 25, 50, 100].map((n) => <option key={n}>{n}</option>)}
        </select>
        <span>dari <strong className="text-ink">{total}</strong> data</span>
      </div>

      <div className="flex items-center gap-1">
        <button
          className="btn-ghost !px-2.5 !py-1.5 !text-xs"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
        >
          <ChevronLeft size={14} /> Sebelumnya
        </button>

        {pages.map((p) => (
          <button
            key={p}
            onClick={() => onPage(p)}
            className={`h-8 w-8 rounded-xl text-xs font-semibold transition-all ${
              p === page
                ? 'bg-gradient-warm text-white shadow-sm'
                : 'text-stone-500 hover:bg-stone-100 hover:text-ink'
            }`}
          >
            {p}
          </button>
        ))}

        <button
          className="btn-ghost !px-2.5 !py-1.5 !text-xs"
          disabled={page >= totalPages}
          onClick={() => onPage(page + 1)}
        >
          Berikutnya <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}
