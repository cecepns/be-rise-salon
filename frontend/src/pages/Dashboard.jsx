import { Link } from 'react-router-dom';
import { MENU } from '@/utils/menu';
import { useAuth } from '@/hooks/useAuth';
import { Sparkles } from 'lucide-react';

export default function Dashboard() {
  const { user, isOwner } = useAuth();

  const greetTime = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Selamat Pagi';
    if (h < 15) return 'Selamat Siang';
    if (h < 18) return 'Selamat Sore';
    return 'Selamat Malam';
  };

  return (
    <div className="space-y-6">
      {/* Welcome banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-brand p-6 text-white shadow-elevated sm:p-8">
        <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/5 blur-2xl" />
        <div className="absolute -bottom-12 -left-12 h-48 w-48 rounded-full bg-brand-500/10 blur-2xl" />
        <div className="relative">
          <div className="flex items-center gap-2 text-brand-300">
            <Sparkles size={16} />
            <span className="text-sm font-medium">{greetTime()}</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold sm:text-3xl">
            Halo, {user.name}! 👋
          </h1>
          <p className="mt-2 text-sm text-white/60">
            Pilih menu di bawah untuk memulai aktivitas hari ini.
          </p>
        </div>
      </div>

      {/* Menu grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {MENU.filter((m) => !m.owner || isOwner).map((m, i) => (
          <Link
            key={m.to}
            to={m.to}
            className="card-interactive group flex flex-col items-start gap-4 p-5 animate-slide-up"
            style={{ animationDelay: `${i * 40}ms`, animationFillMode: 'backwards' }}
          >
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-brand-50 to-brand-100 text-brand-600 shadow-sm transition-all duration-200 group-hover:shadow-md group-hover:scale-105">
              <m.icon size={22} />
            </span>
            <div>
              <span className="font-semibold text-ink leading-tight">{m.label}</span>
              {m.owner && (
                <span className="mt-1 block text-[10px] font-semibold uppercase tracking-wider text-brand-500">Owner</span>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
