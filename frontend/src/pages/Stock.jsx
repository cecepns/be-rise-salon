import { useState } from 'react';
import { PackagePlus, Search } from 'lucide-react';
import usePaginated from '@/hooks/usePaginated';
import DataTable from '@/components/DataTable';
import Pagination from '@/components/Pagination';
import FormModal from '@/components/FormModal';
import { Badge, PageHeader } from '@/components/ui';
import { request } from '@/utils/request';
import { API_ENDPOINTS as E } from '@/utils/endpoints';

export default function Stock() {
  const t = usePaginated(E.ITEMS.LIST, { filters: { type: 'product' }, sortBy: 'stock', order: 'asc' });
  const [row, setRow] = useState(null);
  const [saving, setSaving] = useState(false);

  const save = async (v) => {
    setSaving(true);
    try {
      await request('post', E.ITEMS.STOCK(row.id), { data: v, success: 'Stok berhasil diperbarui' });
      setRow(null); t.reload();
    } catch { /* toast tampil */ } finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <PageHeader title="Tambah Stok Item" subtitle="Pantau ketersediaan stok produk dan lakukan penambahan atau koreksi stok" />

      <div className="card flex items-center gap-3 p-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            className="input !border-stone-200/80 !bg-stone-50/50 !pl-10 focus:!bg-white"
            placeholder="Cari nama produk…"
            value={t.search}
            onChange={(e) => t.setSearch(e.target.value)}
          />
        </div>
      </div>

      <DataTable
        columns={[
          { key: 'name', label: 'Nama Produk', render: (r) => <span className="font-semibold text-ink">{r.name}</span> },
          { key: 'category', label: 'Kategori', render: (r) => r.category || <span className="text-stone-300">—</span> },
          {
            key: 'stock',
            label: 'Sisa Stok',
            render: (r) => (
              <Badge tone={r.stock <= 0 ? 'red' : r.stock <= 5 ? 'amber' : 'green'}>
                {r.stock <= 0 ? 'Habis (0)' : r.stock <= 5 ? `Menipis (${r.stock})` : `${r.stock} unit`}
              </Badge>
            ),
          },
        ]}
        rows={t.rows} loading={t.loading} error={t.error} onRetry={t.reload}
        rowActions={(r) => (
          <button
            className="btn-ghost !px-3 !py-1.5 !text-xs hover:!border-brand-300 hover:!bg-brand-50 hover:!text-brand-700"
            onClick={() => setRow(r)}
          >
            <PackagePlus size={14} /> Sesuaikan Stok
          </button>
        )}
      />
      <Pagination pagination={t.pagination} onPage={t.setPage} onLimit={t.setLimit} />

      {row && (
        <FormModal
          title={`Update Stok: ${row.name}`} saving={saving} onSubmit={save} onClose={() => setRow(null)}
          fields={[
            { name: 'qty', label: 'Jumlah (gunakan minus untuk koreksi)', type: 'number', required: true },
            { name: 'note', label: 'Catatan Restock / Koreksi', type: 'textarea' },
          ]}
        />
      )}
    </div>
  );
}
