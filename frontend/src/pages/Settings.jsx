import { useEffect, useState } from 'react';
import { Loader2, Store, MapPin, Phone, FileText, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { ErrorState, PageHeader, Skeleton } from '@/components/ui';
import { request, errMsg } from '@/utils/request';
import { API_ENDPOINTS as E } from '@/utils/endpoints';

const FIELDS = [
  { name: 'salon_name', label: 'Nama Salon', icon: Store, placeholder: 'Contoh: Be Rise Salon' },
  { name: 'address', label: 'Alamat Lengkap', icon: MapPin, placeholder: 'Alamat salon untuk dicetak di nota' },
  { name: 'phone', label: 'No. Telepon / WhatsApp', icon: Phone, placeholder: '08xxxxxxxxxx' },
  { name: 'receipt_footer', label: 'Catatan Kaki Struk / Resi', icon: FileText, placeholder: 'Terima kasih atas kunjungan Anda!' },
];

export default function Settings() {
  const [form, setForm] = useState(null);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    request('get', E.SETTINGS, { silent: true }).then((r) => setForm(r.data)).catch((e) => setError(errMsg(e)));
  }, []);

  const save = async (e) => {
    e.preventDefault();
    if (!form.salon_name?.trim()) return toast.error('Nama salon wajib diisi');
    setSaving(true);
    try { await request('put', E.SETTINGS, { data: form, success: 'Pengaturan tersimpan' }); } catch { /* toast tampil */ } finally { setSaving(false); }
  };

  if (error) return <div className="card"><ErrorState message={error} /></div>;
  return (
    <div className="max-w-2xl space-y-5">
      <PageHeader title="Pengaturan Salon" subtitle="Kelola identitas toko dan catatan yang ditampilkan pada struk belanja" />

      {!form ? <Skeleton className="h-72" /> : (
        <form onSubmit={save} className="card overflow-hidden">
          <div className="flex items-center gap-4 border-b border-stone-100 bg-stone-50/60 px-6 py-4">
            <img src="/logo.png" alt="Be Rise Salon" className="h-12 w-auto" />
            <div>
              <div className="font-display font-bold text-ink">{form.salon_name || 'Be Rise Salon'}</div>
              <div className="text-xs text-stone-500">Informasi ini akan tampil di header & footer resi pembayaran</div>
            </div>
          </div>

          <div className="space-y-4 p-6">
            {FIELDS.map((f) => (
              <label key={f.name} className="block text-sm">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-stone-600">{f.label}</span>
                <div className="relative">
                  <f.icon size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    className="input !bg-stone-50/50 !pl-10 focus:!bg-white"
                    placeholder={f.placeholder}
                    value={form[f.name] ?? ''}
                    onChange={(e) => setForm({ ...form, [f.name]: e.target.value })}
                  />
                </div>
              </label>
            ))}

            <div className="flex justify-end border-t border-stone-100 pt-4">
              <button className="btn-primary" disabled={saving}>
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                Simpan Pengaturan
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
