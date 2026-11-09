import { useEffect } from 'react';
import { X } from 'lucide-react';

export default function Modal({ title, onClose, children }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4" onMouseDown={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-ink/50 backdrop-blur-sm animate-fade-in" />
      {/* Panel */}
      <div
        className="relative max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-t-3xl bg-white shadow-elevated animate-slide-up sm:rounded-3xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Top accent */}
        <div className="h-1 bg-gradient-warm" />
        <div className="p-6">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-lg font-bold text-ink">{title}</h2>
            <button
              className="grid h-8 w-8 place-items-center rounded-xl text-stone-400 transition-all hover:bg-stone-100 hover:text-stone-600"
              onClick={onClose}
              aria-label="Tutup"
            >
              <X size={18} />
            </button>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
