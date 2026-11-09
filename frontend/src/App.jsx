import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import Layout from '@/components/Layout';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import Cashier from '@/pages/Cashier';
import Receipt from '@/pages/Receipt';
import Reports from '@/pages/Reports';
import Settings from '@/pages/Settings';
import Stock from '@/pages/Stock';
import { ItemsPage, CustomersPage, StaffPage, ExpensesPage, ReservationsPage, UsersPage, HistoryPage } from '@/pages/resources';

function Protected({ owner, children }) {
  const { user, isOwner } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (owner && !isOwner) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<Protected><Layout /></Protected>}>
        <Route index element={<Dashboard />} />
        <Route path="cashier" element={<Cashier />} />
        <Route path="items" element={<ItemsPage />} />
        <Route path="stock" element={<Stock />} />
        <Route path="customers" element={<CustomersPage />} />
        <Route path="staff" element={<StaffPage />} />
        <Route path="history" element={<HistoryPage />} />
        <Route path="receipt/:id" element={<Receipt />} />
        <Route path="expenses" element={<ExpensesPage />} />
        <Route path="reservations" element={<ReservationsPage />} />
        <Route path="reports" element={<Protected owner><Reports /></Protected>} />
        <Route path="settings" element={<Protected owner><Settings /></Protected>} />
        <Route path="users" element={<Protected owner><UsersPage /></Protected>} />
        <Route path="security" element={<Protected owner><UsersPage /></Protected>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
