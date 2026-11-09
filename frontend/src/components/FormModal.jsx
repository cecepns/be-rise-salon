import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import Modal from './Modal';
import { request } from '@/utils/request';

const fmt = (f, val) => {
  if (val == null) return f.default ?? '';
  if (f.type === 'datetime-local') return String(val).replace(' ', 'T').slice(0, 16);
  if (f.type === 'date') return String(val).slice(0, 10);
  return val;
};

/** fields: [{ name, label, type, required, requiredOnCreate, options | optionsFrom:{url,params}, default, hint }] */
export default function FormModal({ title, fields, initial, onSubmit, onClose, saving }) {
  const isEdit = !!initial;
  const [values, setValues] = useState(() => Object.fromEntries(fields.map((f) => [f.name, fmt(f, initial?.[f.name])])));
  const [errors, setErrors] = useState({});
  const [remote, setRemote] = useState({});

  useEffect(() => {
    fields.filter((f) => f.optionsFrom).forEach((f) => {
      request('get', f.optionsFrom.url, { params: { limit: 100, sortBy: 'name', order: 'asc', ...f.optionsFrom.params }, silent: true })
        .then((r) => setRemote((o) => ({ ...o, [f.name]: r.data.map((d) => ({ value: d.id, label: d.name })) })))
        .catch(() => {});
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = (e) => {
    e.preventDefault();
    const errs = {};
    fields.forEach((f) => {
      const need = f.required || (f.requiredOnCreate && !isEdit);
      const v = values[f.name];
      if (need && (v === '' || v == null)) errs[f.name] = `${f.label} wajib diisi`;
      else if (f.type === 'number' && v !== '' && Number(v) < (f.min ?? -Infinity)) errs[f.name] = `${f.label} minimal ${f.min}`;
    });
    setErrors(errs);
    if (!Object.keys(errs).length) onSubmit(values);
  };

  return (
    <Modal title={title} onClose={onClose}>
      <form onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
        {fields.map((f) => {
          const opts = f.options || remote[f.name] || [];
          const props = {
            className: 'input !bg-stone-50/50 focus:!bg-white',
            value: values[f.name] ?? '',
            onChange: (e) => setValues({ ...values, [f.name]: e.target.value }),
          };
          return (
            <label key={f.name} className={`block text-sm ${f.type === 'textarea' ? 'sm:col-span-2' : ''}`}>
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-stone-600">
                {f.label}
                {(f.required || (f.requiredOnCreate && !isEdit)) && <span className="ml-0.5 text-accent-500">*</span>}
              </span>
              {f.type === 'select' ? (
                <select {...props}>
                  {!f.required && <option value="">— Pilih —</option>}
                  {opts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              ) : f.type === 'textarea' ? (
                <textarea rows={3} {...props} />
              ) : (
                <input type={f.type || 'text'} min={f.min} {...props} />
              )}
              {f.hint && isEdit && <span className="mt-1 block text-xs text-stone-400">{f.hint}</span>}
              {errors[f.name] && <span className="mt-1 block text-xs font-medium text-accent-600">{errors[f.name]}</span>}
            </label>
          );
        })}
        <div className="mt-2 flex justify-end gap-2 border-t border-stone-100 pt-4 sm:col-span-2">
          <button type="button" className="btn-ghost" onClick={onClose}>Batal</button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving && <Loader2 size={16} className="animate-spin" />} Simpan
          </button>
        </div>
      </form>
    </Modal>
  );
}
