import { useState, useRef, useEffect } from 'react';

/**
 * SearchableSelect — a native-select replacement with a search box inside the dropdown.
 * Props:
 *   value        – current selected value (string/number)
 *   onChange     – (value) => void
 *   options      – [{ value, label }]
 *   placeholder  – text shown when nothing selected
 *   className    – extra classes on the trigger button
 */
export default function SearchableSelect({ value, onChange, options = [], placeholder = 'Select…', className = '' }) {
  const [open, setOpen]       = useState(false);
  const [query, setQuery]     = useState('');
  const containerRef          = useRef(null);
  const searchRef             = useRef(null);

  const selected = options.find(o => String(o.value) === String(value));
  const filtered = options.filter(o => o.label.toLowerCase().includes(query.toLowerCase()));

  useEffect(() => {
    if (open) setTimeout(() => searchRef.current?.focus(), 10);
    else setQuery('');
  }, [open]);

  useEffect(() => {
    const handler = e => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center justify-between gap-2 text-left rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${open ? 'ring-2 ring-blue-500 border-blue-500' : ''} ${className}`}
      >
        <span className={selected ? 'text-slate-800' : 'text-slate-400'}>
          {selected ? selected.label : placeholder}
        </span>
        <svg className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden">
          {/* Search */}
          <div className="p-2 border-b border-slate-100">
            <div className="relative">
              <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"/>
              </svg>
              <input
                ref={searchRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search…"
                className="w-full pl-8 pr-3 py-1.5 text-sm rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          {/* Options */}
          <div className="max-h-52 overflow-y-auto">
            {/* Clear / All option */}
            <button
              type="button"
              onMouseDown={() => { onChange(''); setOpen(false); }}
              className={`w-full text-left px-3 py-2 text-sm transition-colors ${!value ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-400 hover:bg-slate-50'}`}
            >
              {placeholder}
            </button>
            {filtered.length === 0 && (
              <p className="px-3 py-4 text-xs text-slate-400 text-center">No results for "{query}"</p>
            )}
            {filtered.map(o => (
              <button
                key={o.value}
                type="button"
                onMouseDown={() => { onChange(String(o.value)); setOpen(false); }}
                className={`w-full text-left px-3 py-2 text-sm transition-colors border-t border-slate-50
                  ${String(o.value) === String(value) ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-700 hover:bg-slate-50'}`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
