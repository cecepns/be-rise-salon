export const rupiah = (n) => 'Rp ' + Number(n || 0).toLocaleString('id-ID');
const toDate = (s) => new Date(String(s).replace(' ', 'T'));
export const dateTime = (s) => (s ? toDate(s).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : '-');
export const dateOnly = (s) => (s ? toDate(s).toLocaleDateString('id-ID', { dateStyle: 'medium' }) : '-');
export const today = () => new Date().toISOString().slice(0, 10);
export const monthStart = () => today().slice(0, 8) + '01';
