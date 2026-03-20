// import { useState, useRef, useEffect } from 'react';

// const CUSTOMERS = [
//   'LALBHAI JALSIKA', 'DHANABHAI JALSIKA', 'JADIBEN JALSIKA', 'DHUSA LALA JALSIKA',
//   'MASABHAI JALSIKA', 'DHIRUBHAI JALSIKA', 'MASABHAI PIPEDI', 'GHOGHA BAPA JALSIKA',
//   'RAJABHAI JALSIKA', 'PANCHABHAI JALSIKA', 'BHUPATVASRAM JALSIKA', 'LABHBHAI BHAI JALSIKA',
//   'KARSAN BHAI JALSIKA', 'JALSIKA PARCHURAN', 'BHARATBHAI GADHVI', 'PARBATBHAI ANANDPAR',
//   'GYASURBHAI SANOSRA', 'KISHORBHAI RAFADA', 'KANTILAL AMRUTLAL', 'SADGURU ASHRAM',
//   'BHARATBHAI NAVAGAM', 'PRAVINBHAI NAVAGAM', 'VIRABHAI NAVAGAM'
// ];

// export default function CustomerDropdown({ value, onChange }) {
//   const [search, setSearch] = useState(value || '');
//   const [isOpen, setIsOpen] = useState(false);
//   const [highlightIdx, setHighlightIdx] = useState(-1);
//   const wrapperRef = useRef(null);
//   const listRef = useRef(null);

//   const filtered = CUSTOMERS.filter(c =>
//     c.toLowerCase().includes(search.toLowerCase())
//   );

//   useEffect(() => {
//     setSearch(value || '');
//   }, [value]);

//   useEffect(() => {
//     function handleClickOutside(e) {
//       if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
//         setIsOpen(false);
//       }
//     }
//     document.addEventListener('mousedown', handleClickOutside);
//     return () => document.removeEventListener('mousedown', handleClickOutside);
//   }, []);

//   const handleSelect = (name) => {
//     setSearch(name);
//     onChange(name);
//     setIsOpen(false);
//     setHighlightIdx(-1);
//   };

//   const handleKeyDown = (e) => {
//     if (!isOpen) return;
//     if (e.key === 'ArrowDown') {
//       e.preventDefault();
//       setHighlightIdx(prev => Math.min(prev + 1, filtered.length - 1));
//     } else if (e.key === 'ArrowUp') {
//       e.preventDefault();
//       setHighlightIdx(prev => Math.max(prev - 1, 0));
//     } else if (e.key === 'Enter' && highlightIdx >= 0) {
//       e.preventDefault();
//       handleSelect(filtered[highlightIdx]);
//     } else if (e.key === 'Escape') {
//       setIsOpen(false);
//     }
//   };

//   return (
//     <div ref={wrapperRef} className="relative">
//       <label className="block text-sm font-semibold text-primary-dark mb-1.5">
//         Customer Name <span className="text-danger">*</span>
//       </label>
//       <div className="relative">
//         <input
//           type="text"
//           value={search}
//           onChange={e => {
//             setSearch(e.target.value);
//             onChange('');
//             setIsOpen(true);
//             setHighlightIdx(-1);
//           }}
//           onFocus={() => setIsOpen(true)}
//           onKeyDown={handleKeyDown}
//           placeholder="🔍 Search customer..."
//           className="w-full px-4 py-3 rounded-xl border-2 border-border bg-white text-text focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm font-medium placeholder:text-gray-400"
//         />
//         <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
//         </svg>
//       </div>

//       {isOpen && filtered.length > 0 && (
//         <ul
//           ref={listRef}
//           className="absolute z-40 w-full mt-1 bg-white border-2 border-primary/20 rounded-xl shadow-2xl max-h-60 overflow-y-auto"
//         >
//           {filtered.map((name, idx) => (
//             <li
//               key={name}
//               onClick={() => handleSelect(name)}
//               className={`px-4 py-2.5 cursor-pointer text-sm font-medium transition-colors
//                 ${idx === highlightIdx ? 'bg-primary/10 text-primary-dark' : 'hover:bg-primary/5 text-text'}
//                 ${idx === 0 ? 'rounded-t-xl' : ''}
//                 ${idx === filtered.length - 1 ? 'rounded-b-xl' : ''}
//               `}
//             >
//               <span className="mr-2">👤</span>{name}
//             </li>
//           ))}
//         </ul>
//       )}

//       {isOpen && filtered.length === 0 && search && (
//         <div className="absolute z-40 w-full mt-1 bg-white border-2 border-border rounded-xl shadow-xl p-4 text-center text-sm text-gray-400">
//           No customers found for "{search}"
//         </div>
//       )}
//     </div>
//   );
// }

// export { CUSTOMERS };




import { useState, useRef, useEffect } from 'react';

// Fallback list in case API fails
const PRESET_CUSTOMERS = [
  'LALBHAI JALSIKA', 'DHANABHAI JALSIKA', 'JADIBEN JALSIKA', 'DHUSA LALA JALSIKA',
  'MASABHAI JALSIKA', 'DHIRUBHAI JALSIKA', 'MASABHAI PIPEDI', 'GHOGHA BAPA JALSIKA',
  'RAJABHAI JALSIKA', 'PANCHABHAI JALSIKA', 'BHUPATVASRAM JALSIKA', 'LABHBHAI BHAI JALSIKA',
  'KARSAN BHAI JALSIKA', 'JALSIKA PARCHURAN', 'BHARATBHAI GADHVI', 'PARBATBHAI ANANDPAR',
  'GYASURBHAI SANOSRA', 'KISHORBHAI RAFADA', 'KANTILAL AMRUTLAL', 'SADGURU ASHRAM',
  'BHARATBHAI NAVAGAM', 'PRAVINBHAI NAVAGAM', 'VIRABHAI NAVAGAM'
];

export default function CustomerDropdown({ value, onChange }) {
  const [customers, setCustomers] = useState(PRESET_CUSTOMERS);
  const [search, setSearch] = useState(value || '');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(-1);

  // Add customer form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);
  const [addError, setAddError] = useState('');

  const wrapperRef = useRef(null);

  // Load customers from database on mount
  useEffect(() => {
    fetchCustomers();
  }, []);

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

  const fetchCustomers = async () => {
    try {
      const res = await fetch('/api/customers');
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      if (data && data.length > 0) {
        setCustomers(data.map(c => c.name));
      } else {
        // Seed preset customers into DB if empty
        seedPresetCustomers();
      }
    } catch {
      // Keep using PRESET_CUSTOMERS as fallback
    }
  };

  // On first run, add all preset customers to DB automatically
  const seedPresetCustomers = async () => {
    try {
      await Promise.all(
        PRESET_CUSTOMERS.map(name =>
          fetch('/api/customers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name })
          })
        )
      );
      // Reload after seeding
      const res = await fetch('/api/customers');
      const data = await res.json();
      if (data && data.length > 0) setCustomers(data.map(c => c.name));
    } catch {
      // Keep using PRESET_CUSTOMERS
    }
  };

  const filtered = customers.filter(c =>
    c.toLowerCase().includes(search.toLowerCase())
  );

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
      setShowAddForm(false);
    }
  };

  // Add new customer permanently to DB
  const handleAddCustomer = async () => {
    const trimmed = newName.trim().toUpperCase();
    if (!trimmed) return;
    if (customers.includes(trimmed)) {
      setAddError('Customer already exists');
      return;
    }
    setSaving(true);
    setAddError('');
    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');

      // Add to local list and auto-select
      setCustomers(prev => [...prev, trimmed].sort());
      handleSelect(trimmed);
      setNewName('');
      setShowAddForm(false);
    } catch (err) {
      setAddError(err.message || 'Failed to add customer');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div ref={wrapperRef} className="relative">
      {/* Label row with Add Customer button */}
      <div className="flex items-center justify-between mb-1.5">
        <label className="block text-sm font-semibold text-primary-dark">
          Customer Name <span className="text-danger">*</span>
        </label>
        <button
          type="button"
          onClick={() => {
            setShowAddForm(!showAddForm);
            setAddError('');
            setNewName('');
            setIsOpen(false);
          }}
          className="text-xs font-bold text-primary hover:text-white bg-primary/10 hover:bg-primary px-3 py-1 rounded-lg transition-all flex items-center gap-1"
        >
          {showAddForm ? '✕ Cancel' : '➕ New Customer'}
        </button>
      </div>

      {/* Add new customer inline form */}
      {showAddForm && (
        <div className="mb-3 p-3 bg-green-50 border-2 border-primary/30 rounded-xl">
          <p className="text-xs font-bold text-primary-dark mb-2">
            Add New Customer — saved permanently to database
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={newName}
              onChange={e => { setNewName(e.target.value.toUpperCase()); setAddError(''); }}
              onKeyDown={e => e.key === 'Enter' && handleAddCustomer()}
              placeholder="TYPE CUSTOMER NAME"
              className="flex-1 px-3 py-2.5 rounded-xl border-2 border-border bg-white focus:border-primary outline-none text-sm font-bold uppercase tracking-wide"
              autoFocus
            />
            <button
              type="button"
              onClick={handleAddCustomer}
              disabled={saving || !newName.trim()}
              className="px-5 py-2.5 bg-primary text-white font-black rounded-xl text-sm hover:bg-primary-dark transition-colors disabled:opacity-50 whitespace-nowrap"
            >
              {saving ? '...' : '✓ Save'}
            </button>
          </div>
          {addError && (
            <p className="text-xs text-danger mt-1.5 font-semibold">⚠ {addError}</p>
          )}
          <p className="text-xs text-text-secondary mt-1.5">
            Press Enter or click Save. Customer will be added to all dropdowns permanently.
          </p>
        </div>
      )}

      {/* Search input */}
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
        <svg
          className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {/* Dropdown list */}
      {isOpen && filtered.length > 0 && (
        <ul className="absolute z-40 w-full mt-1 bg-white border-2 border-primary/20 rounded-xl shadow-2xl max-h-60 overflow-y-auto">
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

      {/* No results — offer to add */}
      {isOpen && filtered.length === 0 && search && (
        <div className="absolute z-40 w-full mt-1 bg-white border-2 border-border rounded-xl shadow-xl p-4 text-center">
          <p className="text-sm text-gray-400 mb-2">No customer found for "{search}"</p>
          <button
            type="button"
            onClick={() => {
              setNewName(search.toUpperCase());
              setShowAddForm(true);
              setIsOpen(false);
            }}
            className="text-xs font-bold text-primary bg-primary/10 hover:bg-primary/20 px-4 py-2 rounded-lg transition-colors"
          >
            ➕ Add "{search.toUpperCase()}" as new customer
          </button>
        </div>
      )}
    </div>
  );
}

export { PRESET_CUSTOMERS as CUSTOMERS };