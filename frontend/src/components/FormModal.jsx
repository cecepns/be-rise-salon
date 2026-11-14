import { useEffect, useRef, useState } from 'react';
import { Loader2, Upload, X, Image as ImageIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from './Modal';
import AsyncSearchSelect from './AsyncSearchSelect';
import { request } from '@/utils/request';
import { API_ENDPOINTS as E } from '@/utils/endpoints';
import { imageUrl } from '@/utils/format';

const fmt = (f, val) => {
  if (val == null) return f.default ?? '';
  if (f.type === 'datetime-local') return String(val).replace(' ', 'T').slice(0, 16);
  if (f.type === 'date') return String(val).slice(0, 10);
  return val;
};

/** fields: [{ name, label, type, required, requiredOnCreate, options | optionsFrom:{url,params}, default, hint }] */
export default function FormModal({ title, fields, initial, onSubmit, onClose, saving }) {
  const isEdit = !!initial;
  const [values, setValues] = useState(() =>
    Object.fromEntries(fields.map((f) => [f.name, fmt(f, initial?.[f.name])]))
  );
  const [errors, setErrors] = useState({});
  const [remote, setRemote] = useState({});
  const [uploading, setUploading] = useState({});

  useEffect(() => {
    fields
      .filter((f) => f.optionsFrom && f.type !== 'async-select')
      .forEach((f) => {
        request('get', f.optionsFrom.url, {
          params: { limit: 100, sortBy: 'name', order: 'asc', ...f.optionsFrom.params },
          silent: true,
        })
          .then((r) => setRemote((o) => ({ ...o, [f.name]: r.data.map((d) => ({ value: d.id, label: d.name })) })))
          .catch(() => {});
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFileUpload = async (fieldName, file) => {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Ukuran file maksimal 2MB');
      return;
    }
    setUploading((u) => ({ ...u, [fieldName]: true }));
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await request('post', E.UPLOAD, { data: formData, success: 'Foto berhasil diunggah' });
      if (res?.data?.url) {
        setValues((v) => ({ ...v, [fieldName]: res.data.url }));
      }
    } catch {
      // toast error ditampilkan oleh request
    } finally {
      setUploading((u) => ({ ...u, [fieldName]: false }));
    }
  };

  const submit = (e) => {
    e.preventDefault();
    const errs = {};
    fields.forEach((f) => {
      const need = f.required || (f.requiredOnCreate && !isEdit);
      const v = values[f.name];
      if (need && (v === '' || v == null)) errs[f.name] = `${f.label} wajib diisi`;
      else if (f.type === 'number' && v !== '' && Number(v) < (f.min ?? -Infinity))
        errs[f.name] = `${f.label} minimal ${f.min}`;
    });
    setErrors(errs);
    if (!Object.keys(errs).length) onSubmit(values);
  };

  return (
    <Modal title={title} onClose={onClose}>
      <form onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
        {fields.map((f) => {
          const isUp = uploading[f.name];
          const currentImg = values[f.name];

          if (f.type === 'image') {
            return (
              <div key={f.name} className="block text-sm sm:col-span-2">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-stone-600">
                  {f.label}
                  {(f.required || (f.requiredOnCreate && !isEdit)) && <span className="ml-0.5 text-accent-500">*</span>}
                </span>

                <div className="flex items-center gap-4">
                  <div className="relative grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-2xl border-2 border-dashed border-stone-200 bg-stone-50">
                    {currentImg ? (
                      <img src={imageUrl(currentImg)} alt="Preview" className="h-full w-full object-cover" />
                    ) : (
                      <ImageIcon size={28} className="text-stone-300" />
                    )}
                    {isUp && (
                      <div className="absolute inset-0 flex items-center justify-center bg-white/80">
                        <Loader2 size={18} className="animate-spin text-brand-600" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <label className="btn-ghost !cursor-pointer !px-3 !py-1.5 !text-xs">
                        <Upload size={14} /> {currentImg ? 'Ganti Foto' : 'Unggah Foto'}
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          className="hidden"
                          onChange={(e) => handleFileUpload(f.name, e.target.files?.[0])}
                        />
                      </label>
                      {currentImg && (
                        <button
                          type="button"
                          onClick={() => setValues((v) => ({ ...v, [f.name]: null }))}
                          className="btn-ghost !px-2.5 !py-1.5 !text-xs !text-accent-600 hover:!bg-accent-50"
                          title="Hapus foto"
                        >
                          <X size={14} /> Hapus
                        </button>
                      )}
                    </div>
                    <p className="text-[11px] text-stone-400">Format: PNG, JPG, atau WEBP (maks. 2MB)</p>
                  </div>
                </div>

                {errors[f.name] && <span className="mt-1 block text-xs font-medium text-accent-600">{errors[f.name]}</span>}
              </div>
            );
          }

          if (f.type === 'async-select') {
            return (
              <div key={f.name} className={`block text-sm ${f.fullWidth ? 'sm:col-span-2' : ''}`}>
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-stone-600">
                  {f.label}
                  {(f.required || (f.requiredOnCreate && !isEdit)) && <span className="ml-0.5 text-accent-500">*</span>}
                </span>
                <AsyncSearchSelect
                  value={values[f.name] ?? ''}
                  onChange={(val) => setValues((v) => ({ ...v, [f.name]: val }))}
                  fetchUrl={f.optionsFrom?.url}
                  params={f.optionsFrom?.params}
                  placeholder={f.placeholder || `Pilih ${f.label}`}
                  defaultOptions={f.defaultOptions}
                />
                {f.hint && isEdit && <span className="mt-1 block text-xs text-stone-400">{f.hint}</span>}
                {errors[f.name] && <span className="mt-1 block text-xs font-medium text-accent-600">{errors[f.name]}</span>}
              </div>
            );
          }

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
                  {opts.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
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
          <button type="button" className="btn-ghost" onClick={onClose}>
            Batal
          </button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving && <Loader2 size={16} className="animate-spin" />} Simpan
          </button>
        </div>
      </form>
    </Modal>
  );
}
