import toast from 'react-hot-toast';
import { api } from './api';

export const errMsg = (e) => e.response?.data?.message || e.message || 'Terjadi kesalahan';

/** request('get', url, { params, data, success, silent }) -> response body */
export async function request(method, url, { params, data, success, silent } = {}) {
  try {
    const res = await api.request({ method, url, params, data });
    if (success) toast.success(success);
    return res.data;
  } catch (e) {
    if (!silent) toast.error(errMsg(e));
    throw e;
  }
}
