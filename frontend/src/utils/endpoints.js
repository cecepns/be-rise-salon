const crud = (base) => ({ LIST: base, DETAIL: (id) => `${base}/${id}` });

export const API_ENDPOINTS = {
  AUTH: { LOGIN: '/auth/login', REGISTER: '/auth/register', PROFILE: '/auth/profile' },
  ITEMS: { ...crud('/items'), STOCK: (id) => `/items/${id}/stock` },
  CUSTOMERS: crud('/customers'),
  STAFF: crud('/staff'),
  EXPENSES: crud('/expenses'),
  RESERVATIONS: crud('/reservations'),
  USERS: crud('/users'),
  TRANSACTIONS: crud('/transactions'),
  REPORTS: { SUMMARY: '/reports/summary' },
  SETTINGS: '/settings',
};
