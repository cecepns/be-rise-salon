import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Menu, LogOut, Home, ChevronRight, X } from 'lucide-react';
import { MENU } from '@/utils/menu';
import { useAuth } from '@/hooks/useAuth';

export default function Layout() {
  const [open, setOpen] = useState(false);
  const { user, logout, isOwner } = useAuth();
  const { pathname } = useLocation();
  useEffect(() => setOpen(false), [pathname]);

  const link = ({ isActive }) =>
    `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
      isActive
        ? 'bg-gradient-warm text-white shadow-sm'
        : 'text-white/75 hover:bg-white/10 hover:text-white'
    }`;

  return (
    <div className="min-h-screen lg:flex">
      {/* Mobile overlay */}
      <div
        className={`fixed inset-0 z-30 bg-ink/60 backdrop-blur-sm transition-opacity duration-300 lg:hidden print:hidden ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={() => setOpen(false)}
      />

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[272px] flex-col bg-gradient-brand transition-transform duration-300 ease-out lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 print:hidden ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo area */}
        <div className="flex items-center gap-3 border-b border-white/10 px-4 py-4">
          <div className="flex h-11 w-16 shrink-0 items-center justify-center rounded-xl bg-white px-2 py-1 shadow-sm">
            <img src="/logo.png" alt="Be Rise Salon" className="h-full w-auto object-contain" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate font-display text-lg font-bold text-white leading-tight">Be Rise</div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-brand-300">Salon POS</div>
          </div>
          <button className="rounded-lg p-1.5 text-white/40 hover:bg-white/10 hover:text-white lg:hidden" onClick={() => setOpen(false)}>
            <X size={18} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
          <NavLink to="/" end className={link}>
            <Home size={18} />
            <span className="flex-1">Beranda</span>
          </NavLink>

          <div className="!my-3 border-t border-white/10" />

          {MENU.filter((m) => !m.owner || isOwner).map((m) => (
            <NavLink key={m.to} to={m.to} className={link}>
              <m.icon size={18} />
              <span className="flex-1">{m.label}</span>
              <ChevronRight size={14} className="opacity-0 transition-opacity group-hover:opacity-60" />
            </NavLink>
          ))}
        </nav>

        {/* User area + logout */}
        <div className="border-t border-white/10 p-3">
          <div className="mb-2 rounded-xl bg-white/10 px-3 py-2.5">
            <div className="text-sm font-semibold text-white">{user?.name}</div>
            <div className="text-[11px] font-medium capitalize text-white/60">
              {user?.role === 'owner' ? '👑 Owner' : '💼 Pegawai'}
            </div>
          </div>
          <button
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-white/60 transition-all hover:bg-accent-600/20 hover:text-accent-100"
          >
            <LogOut size={18} />
            Keluar
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 border-b border-stone-200/60 bg-white/80 px-4 py-3 backdrop-blur-xl lg:px-8 print:hidden">
          <div className="flex items-center gap-3">
            <button
              className="rounded-xl p-2 text-stone-500 hover:bg-stone-100 hover:text-ink lg:hidden"
              onClick={() => setOpen(!open)}
              aria-label="Menu"
            >
              <Menu size={20} />
            </button>

            {/* Breadcrumb-style current page indicator */}
            <div className="flex items-center gap-2 text-sm text-stone-400">
              <Home size={14} />
              <ChevronRight size={12} />
              <span className="font-medium text-ink">
                {pathname === '/' ? 'Beranda' : MENU.find(m => pathname.startsWith(m.to))?.label || 'Halaman'}
              </span>
            </div>

            <div className="ml-auto flex items-center gap-3">
              <div className="text-right text-sm leading-tight">
                <div className="font-semibold text-ink">{user?.name}</div>
                <div className="text-xs capitalize text-stone-500">
                  {user?.role === 'owner' ? 'Owner' : 'Pegawai'}
                </div>
              </div>
              <div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-warm text-sm font-bold text-white shadow-sm">
                {user?.name?.charAt(0)?.toUpperCase() || '?'}
              </div>
            </div>
          </div>
        </header>

        <main className="animate-fade-in p-4 lg:p-8 print:p-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
