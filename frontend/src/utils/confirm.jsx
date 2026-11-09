import toast from 'react-hot-toast';
import { AlertTriangle } from 'lucide-react';

/** Confirm dialog berbasis toast. Resolve true/false. */
export const confirmToast = (message, okLabel = 'Ya, lanjut') =>
  new Promise((resolve) => {
    const done = (id, v) => { toast.dismiss(id); resolve(v); };
    toast.custom(
      (t) => (
        <div className="w-80 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-elevated animate-slide-up">
          <div className="h-1 bg-gradient-warm" />
          <div className="p-4">
            <div className="flex items-start gap-3">
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-accent-50 text-accent-600">
                <AlertTriangle size={16} />
              </div>
              <p className="text-sm font-medium leading-snug text-ink">{message}</p>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button className="btn-ghost !px-3 !py-1.5 !text-xs" onClick={() => done(t.id, false)}>Batal</button>
              <button className="btn-danger !px-3 !py-1.5 !text-xs" onClick={() => done(t.id, true)}>{okLabel}</button>
            </div>
          </div>
        </div>
      ),
      { duration: Infinity }
    );
  });
