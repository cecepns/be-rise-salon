import {
  Scissors, History, TrendingUp, Users, UserCog, ShoppingCart,
  Wallet, Printer, Settings, PackagePlus, CalendarClock, ShieldCheck, Clock,
} from 'lucide-react';

export const MENU = [
  { to: '/cashier', label: 'Kasir', icon: ShoppingCart },
  { to: '/pending-payments', label: 'Menunggu Pembayaran', icon: Clock },
  { to: '/reservations', label: 'Reservasi', icon: CalendarClock },
  { to: '/items', label: 'Layanan / Item', icon: Scissors },
  { to: '/stock', label: 'Tambah Stok Item', icon: PackagePlus },
  { to: '/customers', label: 'Pelanggan', icon: Users },
  { to: '/staff', label: 'Staff / Stylist', icon: UserCog },
  { to: '/history', label: 'Riwayat', icon: History },
  { to: '/receipt/last', label: 'Cetak Resi', icon: Printer },
  { to: '/expenses', label: 'Pengeluaran', icon: Wallet },
  { to: '/reports', label: 'Laporan & Komisi', icon: TrendingUp, owner: true },
  { to: '/settings', label: 'Pengaturan', icon: Settings, owner: true },
  { to: '/users', label: 'Manajemen User', icon: ShieldCheck, owner: true },
];
