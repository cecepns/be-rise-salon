import { useEffect, useRef, useState } from 'react';
import { Search, ChevronDown, X, Loader2, Check } from 'lucide-react';
import useDebounce from '@/hooks/useDebounce';
import { request } from '@/utils/request';

/**
 * Dropdown searchable select dengan pencarian API dan debounce.
 * Tidak menampilkan label "debounce" pada UI.
 */
export default function AsyncSearchSelect({
  value,
  onChange,
  fetchUrl,
  params = {},
  placeholder = 'Pilih / cari…',
  searchPlaceholder = 'Ketik untuk mencari…',
  renderOption,
  renderSelected,
  defaultOptions = [],
  className = '',
  disabled = false,
  labelKey = (item) => item?.name ?? '',
  valueKey = (item) => item?.id ?? item?.value,
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  const containerRef = useRef(null);
  const inputRef = useRef(null);

  // Close when clicked outside
  useEffect(() => {
    const handleOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener('mousedown', handleOutside);
      document.addEventListener('touchstart', handleOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('touchstart', handleOutside);
    };
  }, [open]);

  // Fetch initial selected item if value exists but selectedItem is not set
  useEffect(() => {
    if (value === '' || value == null) {
      setSelectedItem(null);
      return;
    }
    const inDefault = defaultOptions.find((o) => valueKey(o) === value);
    if (inDefault) {
      setSelectedItem(inDefault);
      return;
    }
    const inCurrent = options.find((o) => valueKey(o) === value);
    if (inCurrent) {
      setSelectedItem(inCurrent);
      return;
    }
    // Fetch detail if needed
    if (fetchUrl) {
      request('get', `${fetchUrl}/${value}`, { silent: true })
        .then((res) => {
          if (res?.data) setSelectedItem(res.data);
        })
        .catch(() => {});
    }
  }, [value, fetchUrl, defaultOptions, options]);

  // Fetch options when search or open changes
  useEffect(() => {
    if (!open && !defaultOptions.length) return;
    let active = true;
    setLoading(true);
    request('get', fetchUrl, {
      params: { limit: 50, search: debouncedSearch || undefined, ...params },
      silent: true,
    })
      .then((res) => {
        if (!active) return;
        const apiData = Array.isArray(res?.data) ? res.data : [];
        setOptions(apiData);
      })
      .catch(() => {
        if (active) setOptions([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [fetchUrl, debouncedSearch, open, JSON.stringify(params)]);

  // Auto focus input when opened
  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  const handleSelect = (item) => {
    setSelectedItem(item);
    onChange(item ? valueKey(item) : '', item);
    setOpen(false);
    setSearch('');
  };

  const handleClear = (e) => {
    e.stopPropagation();
    setSelectedItem(null);
    onChange('', null);
    setSearch('');
  };

  const combinedOptions = [
    ...defaultOptions.filter(
      (d) => !debouncedSearch || labelKey(d).toLowerCase().includes(debouncedSearch.toLowerCase())
    ),
    ...options.filter((o) => !defaultOptions.some((d) => valueKey(d) === valueKey(o))),
  ];

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(!open)}
        className="input flex w-full items-center justify-between gap-2 text-left !bg-stone-50/50 transition-colors focus:!bg-white disabled:opacity-50"
      >
        <span className="min-w-0 flex-1 truncate">
          {selectedItem ? (
            renderSelected ? (
              renderSelected(selectedItem)
            ) : (
              <span className="font-medium text-ink">{labelKey(selectedItem)}</span>
            )
          ) : (
            <span className="text-stone-400">{placeholder}</span>
          )}
        </span>
        <div className="flex shrink-0 items-center gap-1 text-stone-400">
          {selectedItem && (
            <span
              role="button"
              tabIndex={0}
              onClick={handleClear}
              className="grid h-5 w-5 place-items-center rounded-full hover:bg-stone-200 hover:text-stone-600"
              title="Hapus pilihan"
            >
              <X size={12} />
            </span>
          )}
          <ChevronDown size={15} className={`transition-transform duration-200 ${open ? 'rotate-180 text-brand-600' : ''}`} />
        </div>
      </button>

      {/* Dropdown Menu */}
      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-72 overflow-hidden rounded-2xl border border-stone-200/90 bg-white shadow-elevated animate-slide-up">
          {/* Search box inside dropdown */}
          <div className="border-b border-stone-100 p-2">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                ref={inputRef}
                type="text"
                className="w-full rounded-xl bg-stone-100/80 py-1.5 pl-8 pr-8 text-xs font-medium text-ink outline-none transition focus:bg-white focus:ring-1 focus:ring-brand-500"
                placeholder={searchPlaceholder}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          {/* Options list */}
          <div className="max-h-52 overflow-y-auto p-1.5">
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-6 text-xs text-stone-400">
                <Loader2 size={14} className="animate-spin text-brand-500" />
                <span>Memuat data…</span>
              </div>
            ) : !combinedOptions.length ? (
              <div className="py-6 text-center text-xs text-stone-400">
                {search ? 'Tidak ada hasil yang cocok' : 'Belum ada data'}
              </div>
            ) : (
              combinedOptions.map((item) => {
                const isSelected = valueKey(item) === value;
                return (
                  <button
                    key={String(valueKey(item))}
                    type="button"
                    onClick={() => handleSelect(item)}
                    className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-xs transition-colors ${
                      isSelected
                        ? 'bg-brand-50 font-semibold text-brand-700'
                        : 'text-stone-700 hover:bg-stone-50 hover:text-ink'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      {renderOption ? renderOption(item, isSelected) : labelKey(item)}
                    </div>
                    {isSelected && <Check size={14} className="shrink-0 text-brand-600" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
