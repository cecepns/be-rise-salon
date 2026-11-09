import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Loader2, Eye, EyeOff, Scissors } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/hooks/useAuth';

export default function Login() {
  const { user, login } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ username: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  if (user) return <Navigate to="/" replace />;

  const submit = async (e) => {
    e.preventDefault();
    if (!form.username || !form.password) return toast.error('Username dan password wajib diisi');
    setLoading(true);
    try { await login(form.username, form.password); nav('/'); } catch { /* toast tampil */ } finally { setLoading(false); }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-brand" />

      {/* Decorative elements */}
      <div className="absolute -left-20 -top-20 h-72 w-72 rounded-full bg-brand-500/10 blur-3xl" />
      <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-accent-500/10 blur-3xl" />
      <div className="absolute left-1/2 top-1/4 h-48 w-48 -translate-x-1/2 rounded-full bg-brand-400/5 blur-2xl" />

      {/* Floating scissors decorations */}
      <div className="absolute left-[10%] top-[15%] text-white/5">
        <Scissors size={64} className="rotate-45" />
      </div>
      <div className="absolute right-[15%] bottom-[20%] text-white/5">
        <Scissors size={48} className="-rotate-12" />
      </div>

      {/* Login card */}
      <form
        onSubmit={submit}
        className="animate-slide-up relative z-10 mx-4 w-full max-w-[420px] overflow-hidden rounded-3xl border border-white/10 bg-white/95 shadow-elevated backdrop-blur-xl"
      >
        {/* Top accent bar */}
        <div className="h-1.5 bg-gradient-warm" />

        <div className="space-y-6 p-8 sm:p-10">
          {/* Logo & branding */}
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="relative">
              <div className="absolute -inset-3 rounded-full bg-brand-100/50 blur-md" />
              <img src="/logo.png" alt="Be Rise Salon" className="relative h-24 w-auto drop-shadow-sm" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold text-ink">Selamat Datang</h1>
              <p className="mt-1 text-sm text-stone-500">Masuk ke sistem Be Rise Salon</p>
            </div>
          </div>

          {/* Form fields */}
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-stone-700">Username</label>
              <input
                className="input !border-stone-200 !bg-stone-50/50 focus:!bg-white"
                placeholder="Masukkan username"
                autoComplete="username"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-stone-700">Password</label>
              <div className="relative">
                <input
                  className="input !border-stone-200 !bg-stone-50/50 !pr-10 focus:!bg-white"
                  type={showPw ? 'text' : 'password'}
                  placeholder="Masukkan password"
                  autoComplete="current-password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 transition-colors"
                  onClick={() => setShowPw(!showPw)}
                  tabIndex={-1}
                >
                  {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          </div>

          {/* Submit */}
          <button className="btn-primary w-full !py-3 !text-base" disabled={loading}>
            {loading && <Loader2 size={18} className="animate-spin" />}
            {loading ? 'Memproses...' : 'Masuk'}
          </button>
        </div>

        {/* Footer */}
        <div className="border-t border-stone-100 bg-stone-50/50 px-8 py-4 text-center text-xs text-stone-400">
          Be Rise Salon Management System
        </div>
      </form>
    </div>
  );
}
