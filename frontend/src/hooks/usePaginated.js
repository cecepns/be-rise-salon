import { useEffect, useState, useCallback } from 'react';
import { request, errMsg } from '@/utils/request';
import useDebounce from './useDebounce';

/** Data list dari backend: pagination, search (debounce 300ms), limit, sort, filter. */
export default function usePaginated(url, { filters: initFilters = {}, sortBy = 'id', order = 'desc' } = {}) {
  const [state, setState] = useState({ rows: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 1 }, loading: true, error: null });
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState(initFilters);
  const [tick, setTick] = useState(0);
  const q = useDebounce(search, 300);
  const filterKey = JSON.stringify(filters);

  useEffect(() => { setPage(1); }, [q, filterKey, limit]);

  useEffect(() => {
    let off = false;
    setState((s) => ({ ...s, loading: true, error: null }));
    request('get', url, { params: { page, limit, search: q, sortBy, order, ...filters }, silent: true })
      .then((r) => !off && setState({ rows: r.data, pagination: r.pagination, loading: false, error: null }))
      .catch((e) => !off && setState((s) => ({ ...s, loading: false, error: errMsg(e) })));
    return () => { off = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, page, limit, q, filterKey, sortBy, order, tick]);

  const setFilter = useCallback((k, v) => setFilters((f) => ({ ...f, [k]: v })), []);
  const reload = useCallback(() => setTick((t) => t + 1), []);

  return { ...state, filters, search, setSearch, setPage, setLimit, setFilter, reload };
}
