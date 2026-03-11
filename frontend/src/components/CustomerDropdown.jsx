import { useState, useRef, useEffect } from 'react';

const CUSTOMERS = [
  'LALBHAI JALSIKA', 'DHANABHAI JALSIKA', 'JADIBEN JALSIKA', 'DHUSA LALA JALSIKA',
  'MASABHAI JALSIKA', 'DHIRUBHAI JALSIKA', 'MASABHAI PIPEDI', 'GHOGHA BAPA JALSIKA',
  'RAJABHAI JALSIKA', 'PANCHABHAI JALSIKA', 'BHUPATVASRAM JALSIKA', 'LABHBHAI BHAI JALSIKA',
  'KARSAN BHAI JALSIKA', 'JALSIKA PARCHURAN', 'BHARATBHAI GADHVI', 'PARBATBHAI ANANDPAR',
  'GYASURBHAI SANOSRA', 'KISHORBHAI RAFADA', 'KANTILAL AMRUTLAL', 'SADGURU ASHRAM',
  'BHARATBHAI NAVAGAM', 'PRAVINBHAI NAVAGAM', 'VIRABHAI NAVAGAM'
];

export default function CustomerDropdown({ value, onChange }) {
  const [search, setSearch] = useState(value || '');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const wrapperRef = useRef(null);
  const listRef = useRef(null);

  const filtered = CUSTOMERS.filter(c =>
    c.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    setSearch(value || '');
  }, [value]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (name) => {
    setSearch(name);
    onChange(name);
    setIsOpen(false);
    setHighlightIdx(-1);
  };

  const handleKeyDown = (e) => {
    if (!isOpen) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIdx(prev => Math.min(prev + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIdx(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && highlightIdx >= 0) {
      e.preventDefault();
      handleSelect(filtered[highlightIdx]);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div ref={wrapperRef} className="relative">
      <label className="block text-sm font-semibold text-primary-dark mb-1.5">
        Customer Name <span className="text-danger">*</span>
      </label>
      <div className="relative">
        <input
          type="text"
          value={search}
          onChange={e => {
            setSearch(e.target.value);
            onChange('');
            setIsOpen(true);
            setHighlightIdx(-1);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="🔍 Search customer..."
          className="w-full px-4 py-3 rounded-xl border-2 border-border bg-white text-text focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm font-medium placeholder:text-gray-400"
        />
        <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {isOpen && filtered.length > 0 && (
        <ul
          ref={listRef}
          className="absolute z-40 w-full mt-1 bg-white border-2 border-primary/20 rounded-xl shadow-2xl max-h-60 overflow-y-auto"
        >
          {filtered.map((name, idx) => (
            <li
              key={name}
              onClick={() => handleSelect(name)}
              className={`px-4 py-2.5 cursor-pointer text-sm font-medium transition-colors
                ${idx === highlightIdx ? 'bg-primary/10 text-primary-dark' : 'hover:bg-primary/5 text-text'}
                ${idx === 0 ? 'rounded-t-xl' : ''}
                ${idx === filtered.length - 1 ? 'rounded-b-xl' : ''}
              `}
            >
              <span className="mr-2">👤</span>{name}
            </li>
          ))}
        </ul>
      )}

      {isOpen && filtered.length === 0 && search && (
        <div className="absolute z-40 w-full mt-1 bg-white border-2 border-border rounded-xl shadow-xl p-4 text-center text-sm text-gray-400">
          No customers found for "{search}"
        </div>
      )}
    </div>
  );
}

export { CUSTOMERS };
