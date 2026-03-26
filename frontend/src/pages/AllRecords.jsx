import { useState, useEffect, useMemo } from 'react';
import { showToast } from '../components/Toast';
import { apiFetch } from '../utils/api';
import EditTransactionModal from '../components/EditTransactionModal';
import ConfirmModal from '../components/ConfirmModal';

const fmtDate = d => {
  try { return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return d || ''; }
};

export default function AllRecords() {
  const [customers, setCustomers] = useState([]);
  const [flatRecords, setFlatRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedCustomer, setExpandedCustomer] = useState(null);
  const [loadingLedger, setLoadingLedger] = useState(null);
  const [records, setRecords] = useState({}); // Cache for customer specific entries

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('cards'); // 'cards' or 'table'
  const [filterType, setFilterType] = useState(''); // 'cash', 'debit', 'credit', 'expense'
  const [filterBalance, setFilterBalance] = useState(''); // 'due', 'advance', 'clear'
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Edit/Delete state
  const [editTarget, setEditTarget] = useState(null);   // { type, entry }
  const [deleteTarget, setDeleteTarget] = useState(null); // { type, entry }
  const [deleting, setDeleting] = useState(false);

  const isAdmin = (() => {
    try { return localStorage.getItem('cjn_role') === 'admin'; } catch { return false; }
  })();

  useEffect(() => {
    fetchAllCustomers();
    fetchFlatRecords();
  }, []);

  const fetchAllCustomers = async () => {
    try {
      const res = await apiFetch('/api/summary/all-customers');
      if (!res || !res.ok) throw new Error('Failed');
      setCustomers(await res.json());
    } catch {
      showToast('Failed to load customers', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchFlatRecords = async () => {
    try {
      // Build query string
      const params = new URLSearchParams();
      if (searchQuery) params.append('q', searchQuery);
      if (filterType) params.append('type', filterType);
      if (dateFrom) params.append('from', dateFrom);
      if (dateTo) params.append('to', dateTo);

      const res = await apiFetch(`/api/summary/search?${params.toString()}`);
      
      // apiFetch returns undefined for 401 (handles redirect internally)
      if (!res) return;
      
      // Check content-type to avoid parsing HTML as JSON
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        console.warn('Search API returned non-JSON:', contentType);
        return; // Silently ignore non-JSON responses
      }

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData?.error || 'Search failed');
      }

      setFlatRecords(await res.json());
    } catch (err) {
      console.error('fetchFlatRecords error:', err);
      showToast(err.message || 'Failed to load search results', 'error');
    }
  };

  // Re-fetch search results when filters change
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchFlatRecords();
    }, 300); // Debounce search
    return () => clearTimeout(timer);
  }, [searchQuery, filterType, dateFrom, dateTo]);

  const fetchCustomerLedger = async (name, force = false) => {
    if (records[name] && !force) return;
    setLoadingLedger(name);
    try {
      const ledgerRes = await apiFetch(`/api/summary/customer-records/${encodeURIComponent(name)}`);
      if (!ledgerRes || !ledgerRes.ok) throw new Error('Failed');
      const ledgerData = await ledgerRes.json();

      const debitRes = await apiFetch(`/api/debit-sale`);
      const creditRes = await apiFetch(`/api/credit`);

      const allDebit = debitRes && debitRes.ok ? await debitRes.json() : [];
      const allCredit = creditRes && creditRes.ok ? await creditRes.json() : [];

      const debitEntries = allDebit.filter(e => e.customer_name === name);
      const creditEntries = allCredit.filter(e => e.customer_name === name);

      setRecords(prev => ({
        ...prev,
        [name]: { ...ledgerData, debitEntries, creditEntries }
      }));
    } catch {
      showToast(`Failed to load records for ${name}`, 'error');
    } finally {
      setLoadingLedger(null);
    }
  };

  const handleExpand = (name) => {
    if (expandedCustomer === name) {
      setExpandedCustomer(null);
    } else {
      setExpandedCustomer(name);
      fetchCustomerLedger(name);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    const { type, entry } = deleteTarget;
    setDeleting(true);
    try {
      let url = '';
      if (type === 'debit-sale' || type === 'debit') url = `/api/debit-sale/${entry.id}`;
      else if (type === 'credit') url = `/api/credit/${entry.id}`;
      else if (type === 'cash') url = `/api/cash-sale/${entry.id}`;
      else if (type === 'expense' || type === 'expenses') url = `/api/expenses/${entry.id}`;

      const res = await apiFetch(url, { method: 'DELETE' });
      if (!res || !res.ok) throw new Error('Delete failed');

      showToast('Deleted successfully!');
      setDeleteTarget(null);

      // Refresh data
      fetchAllCustomers();
      fetchFlatRecords();
      if (expandedCustomer) fetchCustomerLedger(expandedCustomer, true);
    } catch (err) {
      showToast(err.message || 'Delete failed', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const onEditSave = () => {
    setEditTarget(null);
    fetchAllCustomers();
    fetchFlatRecords();
    if (expandedCustomer) fetchCustomerLedger(expandedCustomer, true);
  };

  const handleExportCSV = () => {
    let headers, rows;

    if (viewMode === 'table') {
      // Table View — export flat transaction records
      if (flatRecords.length === 0) {
        showToast('No records to export', 'error');
        return;
      }
      headers = ['Date', 'Type', 'Customer', 'Amount', 'Note', 'Bags Info'];
      rows = flatRecords.map(r => {
        const bagsInfo = Array.isArray(r.bags) ? r.bags.map(b => `${b.bagName}(${b.numberOfBags})`).join('; ') : '';
        return [
          r.date,
          r.type.toUpperCase(),
          r.customer_name || 'CASH CUSTOMER',
          r.amount,
          `"${(r.note || '').replace(/"/g, '""')}"`,
          `"${bagsInfo.replace(/"/g, '""')}"`
        ];
      });
    } else {
      // Cards View — export filtered customer summary
      if (filteredCustomers.length === 0) {
        showToast('No customers to export', 'error');
        return;
      }
      headers = ['Customer Name', 'Total Debit', 'Total Credit', 'Balance', 'Status'];
      rows = filteredCustomers.map(c => [
        c.name,
        c.total_debit || 0,
        c.total_credit || 0,
        Math.abs(c.balance || 0),
        c.balance > 0 ? 'Due' : c.balance < 0 ? 'Advance' : 'Clear'
      ]);
    }

    const csvContent = "data:text/csv;charset=utf-8,"
      + headers.join(",") + "\n"
      + rows.map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `CJN_Records_Export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Exported ${viewMode === 'table' ? flatRecords.length + ' records' : filteredCustomers.length + ' customers'} to CSV!`);
  };

  // Filtered customers based on search query and balance filter
  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      // Search query
      const nameMatch = c.name.toLowerCase().includes(searchQuery.toLowerCase());
      if (!nameMatch) return false;

      // Balance filter
      if (filterBalance === 'due' && c.balance <= 0) return false;
      if (filterBalance === 'advance' && c.balance >= 0) return false;
      if (filterBalance === 'clear' && c.balance !== 0) return false;

      return true;
    });
  }, [customers, searchQuery, filterBalance]);

  // Aggregate stats
  const totals = useMemo(() => {
    let deb = 0, cre = 0, bal = 0;
    filteredCustomers.forEach(c => {
      deb += (c.total_debit || 0);
      cre += (c.total_credit || 0);
      bal += (c.balance || 0);
    });
    return { debit: deb, credit: cre, balance: bal };
  }, [filteredCustomers]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-text-secondary font-medium">Loading records...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* ── HEADER & SEARCH ───────────────────────────────── */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 bg-gradient-to-br from-purple-600 to-pink-500 rounded-2xl flex items-center justify-center text-3xl shadow-lg border border-white/20">📁</div>
            <div>
              <h1 className="text-3xl font-black text-primary-dark tracking-tight">Master Search</h1>
              <p className="text-sm text-text-secondary font-medium">Search across all records, customers, and transactions</p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-xl border border-border">
            <button onClick={() => setViewMode('cards')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${viewMode === 'cards' ? 'bg-white text-primary shadow-sm' : 'text-text-secondary hover:text-text'}`}>
              📇 CARDS VIEW
            </button>
            <button onClick={() => setViewMode('table')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${viewMode === 'table' ? 'bg-white text-primary shadow-sm' : 'text-text-secondary hover:text-text'}`}>
              📊 TABLE VIEW
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative mb-4 group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <span className="text-xl group-focus-within:scale-110 transition-transform">🔍</span>
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search customer name, note, bag name, or amount..."
            className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-border bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all text-lg font-bold placeholder:text-gray-400 shadow-sm"
          />
        </div>

        {/* Filter Row */}
        <div className="flex flex-wrap gap-3 items-center">
          <select value={filterType} onChange={e => setFilterType(e.target.value)}
            className="px-4 py-2.5 rounded-xl border-2 border-border bg-white text-sm font-bold text-primary-dark focus:border-primary outline-none cursor-pointer">
            <option value="">All Types</option>
            <option value="debit">Debit Sales</option>
            <option value="credit">Credit Received</option>
            <option value="cash">Cash Sales</option>
            <option value="expense">Expenses</option>
          </select>

          <select value={filterBalance} onChange={e => setFilterBalance(e.target.value)}
            className="px-4 py-2.5 rounded-xl border-2 border-border bg-white text-sm font-bold text-primary-dark focus:border-primary outline-none cursor-pointer">
            <option value="">Balance Status</option>
            <option value="due">🔴 Due Only</option>
            <option value="advance">🔵 Advance Only</option>
            <option value="clear">✅ Clear Only</option>
          </select>

          <div className="flex items-center gap-2 bg-white border-2 border-border rounded-xl px-2">
            <span className="text-[10px] font-black text-gray-400 pl-1">FROM</span>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              className="py-2 pr-2 text-sm font-bold text-primary-dark outline-none cursor-pointer" />
          </div>

          <div className="flex items-center gap-2 bg-white border-2 border-border rounded-xl px-2">
            <span className="text-[10px] font-black text-gray-400 pl-1">TO</span>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              className="py-2 pr-2 text-sm font-bold text-primary-dark outline-none cursor-pointer" />
          </div>

          <button onClick={() => { setSearchQuery(''); setFilterType(''); setFilterBalance(''); setDateFrom(''); setDateTo(''); }}
            className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-text-secondary text-xs font-black rounded-xl transition-colors">
            🔄 RESET
          </button>

          <button onClick={handleExportCSV}
            className="ml-auto flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white text-sm font-black rounded-xl hover:shadow-lg hover:scale-105 transition-all">
            <span>📥</span> EXPORT CSV
          </button>
        </div>
      </div>

      {/* ── SUMMARY STRIP ──────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-4 rounded-2xl border border-border flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center text-xl">👤</div>
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Matched Customers</p>
            <p className="text-xl font-black text-primary-dark">{filteredCustomers.length}</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-border flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 bg-red-50 text-red-600 rounded-xl flex items-center justify-center text-xl">📤</div>
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Total Debit</p>
            <p className="text-xl font-black text-danger">₹{totals.debit.toLocaleString('en-IN')}</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-border flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 bg-green-50 text-green-600 rounded-xl flex items-center justify-center text-xl">📥</div>
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Total Credit</p>
            <p className="text-xl font-black text-primary">₹{totals.credit.toLocaleString('en-IN')}</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-border flex items-center gap-4 shadow-sm border-l-4 border-l-primary">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center text-xl">⚖️</div>
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Net Balance</p>
            <p className="text-xl font-black text-primary-dark">₹{Math.abs(totals.balance).toLocaleString('en-IN')}</p>
            <p className="text-[10px] font-bold text-gray-500">{totals.balance > 0 ? "TOTAL DUE FROM CLIENTS" : "TOTAL ADVANCE FROM CLIENTS"}</p>
          </div>
        </div>
      </div>

      {/* ── RESULTS VIEW ─────────────────────────────────────── */}
      {viewMode === 'cards' ? (
        <div className="space-y-4">
          {filteredCustomers.length === 0 ? (
            <div className="text-center py-20 bg-gray-50 rounded-3xl border-2 border-dashed border-border text-text-secondary">
              <p className="text-5xl mb-4">🔦</p>
              <h3 className="text-xl font-black text-primary-dark">No customers matching your search</h3>
              <p className="mt-2 font-medium">Try different keywords or filters</p>
            </div>
          ) : (
            filteredCustomers.map(customer => {
              const { name, total_debit, total_credit, balance } = customer;
              const isExpanded = expandedCustomer === name;
              const data = records[name];
              const isLoadingThis = loadingLedger === name;
              const debitEntries = data?.debitEntries || [];
              const creditEntries = data?.creditEntries || [];

              return (
                <div key={name} className="bg-white rounded-2xl shadow-sm border border-border overflow-hidden hover:shadow-md transition-shadow">
                  {/* Customer header row */}
                  <button onClick={() => handleExpand(name)}
                    className={`w-full flex flex-col sm:flex-row sm:items-center justify-between p-5 text-left transition-colors ${isExpanded ? 'bg-primary/5' : 'hover:bg-bg'}`}>
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary-light rounded-2xl flex items-center justify-center text-white font-black text-lg shadow-inner">
                        {name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-black text-primary-dark text-lg leading-tight">{name}</h3>
                        <p className="text-xs text-text-secondary font-bold uppercase tracking-wider">Customer Ledger</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 mt-4 sm:mt-0">
                      <div className="flex flex-col items-end">
                        <span className={`text-base font-black px-3 py-1 rounded-xl flex items-center gap-2 ${balance > 0 ? 'bg-red-50 text-danger' : balance < 0 ? 'bg-green-50 text-primary' : 'bg-gray-50 text-gray-400'}`}>
                          <span className="text-xs">{balance > 0 ? '🔺' : balance < 0 ? '🔹' : '✅'}</span>
                          ₹{Math.abs(balance || 0).toLocaleString('en-IN')}
                          <span className="text-[10px] font-bold uppercase">{balance > 0 ? 'Due' : balance < 0 ? 'Adv' : 'Clear'}</span>
                        </span>
                      </div>
                      <svg className={`w-6 h-6 text-primary-dark/40 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
                        fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </button>

                  {/* Expanded section */}
                  {isExpanded && (
                    <div className="border-t border-border bg-white p-5 animate-in slide-in-from-top-2 duration-300">
                      {isLoadingThis && (
                        <div className="flex justify-center py-10"><div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>
                      )}

                      {!isLoadingThis && data && (
                        <div className="grid lg:grid-cols-2 gap-8">
                          {/* Debit Column */}
                          <div>
                            <div className="flex items-center justify-between mb-4">
                              <h4 className="flex items-center gap-2 text-sm font-black text-danger uppercase tracking-widest"><span className="w-2.5 h-2.5 bg-danger rounded-full pulse"></span> Individual Debit Sales</h4>
                              <span className="text-[10px] font-black bg-red-100 text-danger px-3 py-1 rounded-full uppercase">Total: ₹{(total_debit || 0).toLocaleString('en-IN')}</span>
                            </div>

                            {debitEntries.length === 0 ? (
                              <div className="text-center py-10 bg-gray-50 rounded-2xl border-2 border-dashed border-border opacity-60"><p className="text-xs font-bold text-gray-400">NO DEBIT RECORDS FOUND</p></div>
                            ) : (
                              <div className="space-y-4">
                                {debitEntries.map((entry, i) => {
                                  const bags = Array.isArray(entry.bags) ? entry.bags : [];
                                  return (
                                    <div key={entry.id || i} className="bg-white border-2 border-red-50 rounded-2xl overflow-hidden hover:border-red-200 transition-colors">
                                      <div className="bg-red-50/50 px-4 py-3 flex justify-between items-center border-b border-red-50">
                                        <div className="flex items-center gap-3">
                                          <span className="text-xs font-black text-primary-dark">📅 {fmtDate(entry.date)}</span>
                                          {entry.note && <span className="text-[10px] font-bold text-red-400 bg-white px-2 py-0.5 rounded border border-red-100">💬 Note</span>}
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <span className="text-sm font-black text-danger">₹{Number(entry.amount).toLocaleString('en-IN')}</span>
                                          {isAdmin && (
                                            <div className="flex gap-1 border-l border-red-200 pl-2 ml-1">
                                              <button onClick={() => setEditTarget({ type: 'debit-sale', entry })} className="p-1.5 hover:bg-white text-gray-400 hover:text-primary rounded-lg transition-colors" title="Edit">✏️</button>
                                              <button onClick={() => setDeleteTarget({ type: 'debit-sale', entry })} className="p-1.5 hover:bg-white text-gray-400 hover:text-danger rounded-lg transition-colors" title="Delete">🗑️</button>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                      {bags.length > 0 && (
                                        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                          {bags.map((bag, bi) => (
                                            <div key={bi} className="bg-bg p-2.5 rounded-xl border border-border/50 flex flex-col gap-1">
                                              <p className="text-xs font-black text-primary-dark truncate">{bag.bagName}</p>
                                              <div className="flex items-center justify-between">
                                                <span className="text-[10px] font-bold text-text-secondary">{bag.numberOfBags} bags × ₹{bag.pricePerBag}</span>
                                                <span className="text-xs font-black text-danger">₹{(bag.numberOfBags * bag.pricePerBag).toLocaleString('en-IN')}</span>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                      {entry.note && <p className="px-4 py-2 text-[10px] bg-bg/50 border-t border-red-50 text-text-secondary leading-relaxed"><span className="font-bold text-red-300">REMARK:</span> {entry.note}</p>}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>

                          {/* Credit Column */}
                          <div>
                            <div className="flex items-center justify-between mb-4">
                              <h4 className="flex items-center gap-2 text-sm font-black text-primary uppercase tracking-widest"><span className="w-2.5 h-2.5 bg-primary rounded-full pulse-success"></span> Credit Payments Received</h4>
                              <span className="text-[10px] font-black bg-green-100 text-primary px-3 py-1 rounded-full uppercase">Total: ₹{(total_credit || 0).toLocaleString('en-IN')}</span>
                            </div>

                            {creditEntries.length === 0 ? (
                              <div className="text-center py-10 bg-gray-50 rounded-2xl border-2 border-dashed border-border opacity-60"><p className="text-xs font-bold text-gray-400">NO CREDIT RECORDS FOUND</p></div>
                            ) : (
                              <div className="space-y-3">
                                {creditEntries.map((entry, i) => (
                                  <div key={entry.id || i} className="bg-white border-2 border-green-50 rounded-2xl p-4 hover:border-green-200 transition-colors group">
                                    <div className="flex justify-between items-start">
                                      <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center text-xl shadow-inner">🟢</div>
                                        <div>
                                          <p className="text-xs font-black text-primary-dark">📅 {fmtDate(entry.date)}</p>
                                          <p className="text-[10px] font-bold text-text-secondary mt-0.5">{entry.note || 'Regular payment received'}</p>
                                        </div>
                                      </div>
                                      <div className="flex flex-col items-end gap-2">
                                        <p className="text-xl font-black text-primary tracking-tight">₹{Number(entry.amount).toLocaleString('en-IN')}</p>
                                        {isAdmin && (
                                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => setEditTarget({ type: 'credit', entry })} className="p-1.5 hover:bg-green-50 text-gray-400 hover:text-primary rounded-lg transition-colors" title="Edit">✏️</button>
                                            <button onClick={() => setDeleteTarget({ type: 'credit', entry })} className="p-1.5 hover:bg-green-50 text-gray-400 hover:text-danger rounded-lg transition-colors" title="Delete">🗑️</button>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* ── TABLE VIEW (MATCHED RECORDS) ──────────────────── */
        <div className="bg-white rounded-2xl shadow-sm border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-primary-dark text-white">
                  <th className="text-left py-4 px-6 font-black uppercase tracking-widest text-[10px]">Date</th>
                  <th className="text-left py-4 px-6 font-black uppercase tracking-widest text-[10px]">Type</th>
                  <th className="text-left py-4 px-6 font-black uppercase tracking-widest text-[10px]">Customer</th>
                  <th className="text-left py-4 px-6 font-black uppercase tracking-widest text-[10px]">Bag Details</th>
                  <th className="text-right py-4 px-6 font-black uppercase tracking-widest text-[10px]">Amount</th>
                  <th className="py-4 px-6 font-black uppercase tracking-widest text-[10px] w-20">Actions</th>
                </tr>
              </thead>
              <tbody>
                {flatRecords.length === 0 ? (
                  <tr><td colSpan="6" className="py-20 text-center text-text-secondary font-bold">No transactions found matching your filters</td></tr>
                ) : (
                  flatRecords.map((r, i) => {
                    const typeColor = (r.type === 'debit' ? 'text-danger' : r.type === 'credit' ? 'text-primary' : r.type === 'cash' ? 'text-emerald-500' : 'text-warning');
                    const bags = Array.isArray(r.bags) ? r.bags : [];
                    return (
                      <tr key={i} className={`border-b border-border group hover:bg-primary/5 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-bg/40'}`}>
                        <td className="py-4 px-6 font-bold text-primary-dark">{fmtDate(r.date)}</td>
                        <td className="py-4 px-6">
                          <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-lg border-2 border-current opacity-70 ${typeColor}`}>
                            {r.type}
                          </span>
                        </td>
                        <td className="py-4 px-6 font-black text-primary-dark">{r.customer_name || 'CASH CUSTOMER'}</td>
                        <td className="py-4 px-6">
                          <div className="flex flex-wrap gap-1">
                            {bags.map((b, bi) => (
                              <span key={bi} className="text-[10px] font-bold bg-white border border-border px-1.5 py-0.5 rounded shadow-sm">
                                {b.bagName}({b.numberOfBags})
                              </span>
                            ))}
                            {!bags.length && r.note && <span className="text-[10px] text-text-secondary italic">📝 {r.note}</span>}
                            {!bags.length && !r.note && <span className="text-gray-300">-</span>}
                          </div>
                        </td>
                        <td className={`py-4 px-6 text-right font-black text-base ${typeColor}`}>
                          ₹{Number(r.amount).toLocaleString('en-IN')}
                        </td>
                        <td className="py-4 px-6 text-center">
                          {isAdmin && (
                            <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => setEditTarget({ type: r.type === 'expense' ? 'expenses' : r.type === 'debit' ? 'debit-sale' : r.type, entry: r })} className="p-1.5 hover:bg-white rounded-lg transition-colors text-primary" title="Edit">✏️</button>
                              <button onClick={() => setDeleteTarget({ type: r.type === 'expense' ? 'expenses' : r.type === 'debit' ? 'debit-sale' : r.type, entry: r })} className="p-1.5 hover:bg-white rounded-lg transition-colors text-danger" title="Delete">🗑️</button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── MODALS ────────────────────────────────────────── */}
      {isAdmin && editTarget && (
        <EditTransactionModal
          type={editTarget.type}
          entry={editTarget.entry}
          onSave={onEditSave}
          onCancel={() => setEditTarget(null)}
        />
      )}

      {isAdmin && deleteTarget && (
        <ConfirmModal
          title={`Delete ${deleteTarget.type.replace('-', ' ')}?`}
          confirmText="Yes, Delete Permanently"
          loading={deleting}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
        >
          <div className="space-y-4">
            <div className="bg-red-50 p-4 rounded-2xl border border-red-200">
              <p className="text-sm text-danger font-black uppercase mb-1 tracking-widest leading-none">⚠️ High Warning</p>
              <p className="text-xs text-danger font-bold opacity-80">This action is permanent and will revert any related inventory or ledger changes. This cannot be undone.</p>
            </div>
            <div className="p-5 bg-bg rounded-2xl border-2 border-border shadow-inner">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Entry Type</p>
                  <p className="text-sm font-black text-primary-dark capitalize">{deleteTarget.type}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Date</p>
                  <p className="text-sm font-black text-primary-dark">{fmtDate(deleteTarget.entry.date)}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Customer / Detail</p>
                  <p className="text-sm font-black text-primary-dark">{deleteTarget.entry.customer_name || deleteTarget.entry.category || 'N/A'}</p>
                </div>
                <div className="col-span-2 pt-2 border-t border-border">
                  <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Final Amount</p>
                  <p className="text-2xl font-black text-danger">₹{Number(deleteTarget.entry.amount).toLocaleString('en-IN')}</p>
                </div>
              </div>
            </div>
          </div>
        </ConfirmModal>
      )}
    </div>
  );
}