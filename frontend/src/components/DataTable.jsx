import { Skeleton, EmptyState, ErrorState } from './ui';

export default function DataTable({ columns, rows, loading, error, onRetry, rowActions }) {
  if (error) return <div className="card"><ErrorState message={error} onRetry={onRetry} /></div>;
  const cols = rowActions ? [...columns, { key: '_actions', label: '', right: true, render: rowActions }] : columns;
  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-stone-100 bg-stone-50/80">
              {cols.map((c) => (
                <th key={c.key} className={`px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-stone-500 ${c.right ? 'text-right' : ''}`}>
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100/80">
            {loading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {cols.map((c) => (
                      <td key={c.key} className="px-4 py-3.5">
                        <Skeleton className="h-4 w-full" />
                      </td>
                    ))}
                  </tr>
                ))
              : rows.map((r) => (
                  <tr key={r.id} className="transition-colors hover:bg-brand-50/30">
                    {cols.map((c) => (
                      <td key={c.key} className={`px-4 py-3.5 ${c.right ? 'text-right' : ''}`}>
                        {c.render ? c.render(r) : r[c.key] ?? <span className="text-stone-300">—</span>}
                      </td>
                    ))}
                  </tr>
                ))}
          </tbody>
        </table>
      </div>
      {!loading && !rows.length && <EmptyState />}
    </div>
  );
}
