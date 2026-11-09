import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Pencil, Trash2 } from 'lucide-react';
import usePaginated from '@/hooks/usePaginated';
import { useAuth } from '@/hooks/useAuth';
import { request } from '@/utils/request';
import { confirmToast } from '@/utils/confirm';
import DataTable from './DataTable';
import Pagination from './Pagination';
import FormModal from './FormModal';
import { PageHeader } from './ui';

/**
 * Halaman admin generik: search realtime, pagination backend, modal create/edit, confirm delete.
 * ownerWrite  : create/edit hanya owner.  Delete SELALU hanya owner (juga dijaga backend).
 * actions     : [{ label, icon, to(row) | onClick(row, reload), show(row, {isOwner}) }]
 */
export default function CrudPage({
  title, subtitle = null, endpoint, columns, fields, filter, dateFilter, actions = [], ownerWrite = false,
  canCreate = true, canEdit = true, canDelete = true, sortBy = 'id', order = 'desc', nameKey = 'name',
  banner = null,
}) {
  const { isOwner } = useAuth();
  const t = usePaginated(endpoint.LIST, { sortBy, order });
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);
  const write = !ownerWrite || isOwner;

  const save = async (values) => {
    setSaving(true);
    try {
      const row = modal.row;
      await request(row ? 'put' : 'post', row ? endpoint.DETAIL(row.id) : endpoint.LIST, { data: values, success: 'Data tersimpan' });
      setModal(null);
      t.reload();
    } catch { /* toast sudah tampil */ } finally { setSaving(false); }
  };

  const remove = async (row) => {
    if (!(await confirmToast(`Hapus "${row[nameKey] ?? '#' + row.id}"? Data tidak bisa dikembalikan.`, 'Ya, hapus'))) return;
    try { await request('delete', endpoint.DETAIL(row.id), { success: 'Data dihapus' }); t.reload(); } catch { /* noop */ }
  };

  const btn = '!px-2.5 !py-1.5 !text-xs btn-ghost';
  const rowActions = (row) => (
    <div className="flex justify-end gap-1.5">
      {actions.filter((a) => !a.show || a.show(row, { isOwner })).map((a) =>
        a.to ? (
          <Link key={a.label} to={a.to(row)} className={btn}><a.icon size={14} /> {a.label}</Link>
        ) : (
          <button key={a.label} className={btn} onClick={() => a.onClick(row, t.reload)}><a.icon size={14} /> {a.label}</button>
        )
      )}
      {canEdit && write && (
        <button
          className={`${btn} hover:!border-brand-300 hover:!bg-brand-50 hover:!text-brand-700`}
          title="Edit"
          onClick={() => setModal({ row })}
        >
          <Pencil size={14} />
        </button>
      )}
      {canDelete && isOwner && (
        <button
          className={`${btn} !text-accent-600 hover:!border-accent-500/30 hover:!bg-accent-50`}
          title="Hapus"
          onClick={() => remove(row)}
        >
          <Trash2 size={14} />
        </button>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      <PageHeader title={title} subtitle={subtitle}>
        {canCreate && write && (
          <button className="btn-primary" onClick={() => setModal({})}>
            <Plus size={16} /> Tambah
          </button>
        )}
      </PageHeader>

      {banner && <div className="card p-4">{banner}</div>}

      <div className="card flex flex-wrap items-center gap-2.5 p-3">
        <div className="relative min-w-[200px] flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            className="input !border-stone-200/80 !bg-stone-50/50 !pl-10 focus:!bg-white"
            placeholder="Cari data…"
            value={t.search}
            onChange={(e) => t.setSearch(e.target.value)}
          />
        </div>
        {filter && (
          <select
            className="input !w-auto !bg-stone-50/50 focus:!bg-white"
            value={t.filters[filter.key] ?? ''}
            onChange={(e) => t.setFilter(filter.key, e.target.value)}
          >
            <option value="">{filter.label}</option>
            {filter.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        )}
        {dateFilter && ['from', 'to'].map((k) => (
          <input
            key={k}
            type="date"
            title={k === 'from' ? 'Dari tanggal' : 'Sampai tanggal'}
            className="input !w-auto !bg-stone-50/50 focus:!bg-white"
            value={t.filters[k] ?? ''}
            onChange={(e) => t.setFilter(k, e.target.value)}
          />
        ))}
      </div>

      <DataTable columns={columns} rows={t.rows} loading={t.loading} error={t.error} onRetry={t.reload} rowActions={rowActions} />
      <Pagination pagination={t.pagination} onPage={t.setPage} onLimit={t.setLimit} />

      {modal && (
        <FormModal
          title={modal.row ? `Edit ${title}` : `Tambah ${title}`}
          fields={fields} initial={modal.row} saving={saving} onSubmit={save} onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
