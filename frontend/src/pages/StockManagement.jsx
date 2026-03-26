import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../utils/api';
import { showToast } from '../components/Toast';

/* ─── Category metadata ──────────────────────────────────────── */
const CATEGORIES = [
  {
    key: 'KHOL',
    label: 'Khol',
    icon: '🌾',
    gradient: 'from-amber-600 to-yellow-500',
    bgLight: 'bg-amber-50',
    borderColor: 'border-amber-200',
    textColor: 'text-amber-700',
    badgeBg: 'bg-amber-100',
  },
  {
    key: 'BHUSO',
    label: 'Bhuso',
    icon: '🌿',
    gradient: 'from-emerald-600 to-green-500',
    bgLight: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    textColor: 'text-emerald-700',
    badgeBg: 'bg-emerald-100',
  },
  {
    key: 'TIWANA',
    label: 'Tiwana',
    icon: '🐄',
    gradient: 'from-indigo-600 to-blue-500',
    bgLight: 'bg-indigo-50',
    borderColor: 'border-indigo-200',
    textColor: 'text-indigo-700',
    badgeBg: 'bg-indigo-100',
  },
];

const getTodayDate = () => new Date().toISOString().slice(0, 10);

export default function StockManagement() {
  const navigate          = useNavigate();
  const [catalog, setCatalog]           = useState(null);
  const [loading, setLoading]           = useState(true);
  const [activeCategory, setActiveCategory] = useState(null);
  const [importMode, setImportMode]     = useState(false);
  const [importDate, setImportDate]     = useState(getTodayDate());
  const [importItems, setImportItems]   = useState([]);
  const [submitting, setSubmitting]     = useState(false);
  const [history, setHistory]           = useState([]);
  const [showHistory, setShowHistory]   = useState(false);
  const [historyDate, setHistoryDate]   = useState(getTodayDate());
  const [seeded, setSeeded]             = useState(false);

  /* ─── Load catalog ─────────────────────────────────────────── */
  const fetchCatalog = useCallback(async () => {
    try {
      setLoading(true);
      // Seed products first time
      if (!seeded) {
        try {
          await apiFetch('/api/stock-management/seed', { method: 'POST', body: JSON.stringify({}) });
        } catch {}
        setSeeded(true);
      }
      const res = await apiFetch('/api/stock-management/catalog');
      if (!res || !res.ok) throw new Error('Failed to load');
      const data = await res.json();
      setCatalog(data);
    } catch (err) {
      showToast('Failed to load stock catalog', 'error');
    } finally {
      setLoading(false);
    }
  }, [seeded]);

  useEffect(() => { fetchCatalog(); }, [fetchCatalog]);

  /* ─── Load history ─────────────────────────────────────────── */
  const fetchHistory = async (date) => {
    try {
      const res = await apiFetch(`/api/stock-management/history?date=${date || ''}`);
      if (!res || !res.ok) throw new Error('Failed');
      const data = await res.json();
      setHistory(data);
    } catch {
      setHistory([]);
    }
  };

  useEffect(() => {
    if (showHistory) fetchHistory(historyDate);
  }, [showHistory, historyDate]);

  /* ─── Enter import mode for a category ─────────────────────── */
  const startImport = (category) => {
    const items = catalog[category.key] || [];
    setImportItems(items.map(it => ({ name: it.name, quantity: '', note: '' })));
    setImportMode(true);
    setActiveCategory(category);
    setImportDate(getTodayDate());
  };

  const cancelImport = () => {
    setImportMode(false);
    setImportItems([]);
    setActiveCategory(null);
  };

  const updateImportItem = (idx, field, value) => {
    const updated = [...importItems];
    updated[idx] = { ...updated[idx], [field]: value };
    setImportItems(updated);
  };

  /* ─── Submit import ────────────────────────────────────────── */
  const handleImport = async () => {
    const toImport = importItems.filter(it => Number(it.quantity) > 0);
    if (toImport.length === 0) {
      showToast('Enter quantity for at least one item', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const res = await apiFetch('/api/stock-management/import', {
        method: 'POST',
        body: JSON.stringify({ items: toImport, date: importDate })
      });
      if (!res || !res.ok) {
        const err = await res?.json();
        throw new Error(err?.error || 'Failed');
      }
      const data = await res.json();
      showToast(`✅ Imported ${data.results.length} items successfully!`);
      cancelImport();
      fetchCatalog();
    } catch (err) {
      showToast(err.message || 'Import failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  /* ─── Loading state ────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-text-secondary font-medium">Loading Stock Management...</p>
        </div>
      </div>
    );
  }

  /* ─── History View ─────────────────────────────────────────── */
  if (showHistory) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <button onClick={() => setShowHistory(false)}
              className="w-10 h-10 bg-white border-2 border-border rounded-xl flex items-center justify-center hover:bg-bg transition-colors text-lg">
              ←
            </button>
            <div>
              <h1 className="text-2xl font-black text-primary-dark">📜 Stock History</h1>
              <p className="text-sm text-text-secondary">View all stock movements</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-semibold text-primary-dark">Date:</label>
            <input type="date" value={historyDate} onChange={e => setHistoryDate(e.target.value)}
              className="px-3 py-2 rounded-xl border-2 border-border bg-white focus:border-primary outline-none text-sm font-medium" />
            <button onClick={() => setHistoryDate('')}
              className="px-3 py-2 text-xs font-bold bg-primary/10 text-primary rounded-xl hover:bg-primary/20 transition-colors">
              All
            </button>
          </div>
        </div>

        {history.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-border">
            <div className="text-5xl mb-3">📦</div>
            <p className="text-text-secondary font-medium">No stock movements found</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-border shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gradient-to-r from-primary-dark to-primary text-white">
                    <th className="text-left py-3 px-4 font-bold">Product</th>
                    <th className="text-center py-3 px-4 font-bold">Type</th>
                    <th className="text-center py-3 px-4 font-bold">Bags</th>
                    <th className="text-left py-3 px-4 font-bold">Note</th>
                    <th className="text-left py-3 px-4 font-bold">Date/Time</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((h, i) => (
                    <tr key={h.id} className={`border-b border-border ${i % 2 === 0 ? 'bg-white' : 'bg-bg'} hover:bg-primary/5 transition-colors`}>
                      <td className="py-3 px-4 font-semibold text-primary-dark">{h.productName}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold
                          ${h.movementType === 'in'
                            ? 'bg-green-100 text-green-700'
                            : h.movementType === 'out'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-blue-100 text-blue-700'}`}>
                          {h.movementType === 'in' ? '📥 Import' : h.movementType === 'out' ? '📤 Sold' : '🔄 Adjust'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-bold">{h.quantityBags}</td>
                      <td className="py-3 px-4 text-text-secondary text-xs">{h.note || '—'}</td>
                      <td className="py-3 px-4 text-text-secondary text-xs">
                        {new Date(h.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  }

  /* ─── Import mode ──────────────────────────────────────────── */
  if (importMode && activeCategory) {
    const totalBags = importItems.reduce((s, it) => s + (Number(it.quantity) || 0), 0);

    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={cancelImport}
            className="w-10 h-10 bg-white border-2 border-border rounded-xl flex items-center justify-center hover:bg-bg transition-colors text-lg">
            ←
          </button>
          <div className={`w-12 h-12 bg-gradient-to-br ${activeCategory.gradient} rounded-xl flex items-center justify-center text-2xl shadow-lg`}>
            {activeCategory.icon}
          </div>
          <div>
            <h1 className="text-2xl font-black text-primary-dark">Import {activeCategory.label} Stock</h1>
            <p className="text-sm text-text-secondary">Add bags to your {activeCategory.label} inventory</p>
          </div>
        </div>

        {/* Date selector */}
        <div className="bg-white rounded-2xl border border-border p-4 mb-6 shadow-sm flex items-center gap-3 flex-wrap">
          <label className="text-sm font-bold text-primary-dark">📅 Import Date:</label>
          <input type="date" value={importDate} onChange={e => setImportDate(e.target.value)}
            className="px-4 py-2.5 rounded-xl border-2 border-border bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-sm font-medium" />
        </div>

        {/* Items */}
        <div className="space-y-3 mb-6">
          {importItems.map((item, idx) => (
            <div key={item.name}
              className={`bg-white rounded-2xl border-2 ${activeCategory.borderColor} p-4 shadow-sm hover:shadow-md transition-all`}>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3 min-w-[200px]">
                  <span className={`${activeCategory.badgeBg} ${activeCategory.textColor} w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black`}>
                    {idx + 1}
                  </span>
                  <div>
                    <h3 className="font-bold text-primary-dark">{item.name}</h3>
                    <p className="text-xs text-text-secondary">
                      Current stock: <span className="font-bold text-primary">{catalog[activeCategory.key]?.[idx]?.currentStock || 0} bags</span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary mb-1">No. of Bags to Import</label>
                    <input
                      type="number"
                      min="0"
                      value={item.quantity}
                      onChange={e => updateImportItem(idx, 'quantity', e.target.value)}
                      placeholder="0"
                      className="w-32 px-3 py-2.5 rounded-xl border-2 border-border bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-sm font-bold text-center"
                    />
                  </div>
                  <div className="hidden sm:block">
                    <label className="block text-xs font-semibold text-text-secondary mb-1">Note (optional)</label>
                    <input
                      type="text"
                      value={item.note}
                      onChange={e => updateImportItem(idx, 'note', e.target.value)}
                      placeholder="e.g. Truck #2"
                      className="w-40 px-3 py-2.5 rounded-xl border-2 border-border bg-white focus:border-primary outline-none text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Summary + Submit */}
        <div className="bg-gradient-to-r from-primary-dark to-primary text-white p-5 rounded-2xl shadow-lg mb-4 flex items-center justify-between">
          <div>
            <span className="font-bold text-lg">Total Bags to Import</span>
            <p className="text-green-200 text-xs mt-0.5">Date: {new Date(importDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
          </div>
          <span className="text-3xl font-black">{totalBags}</span>
        </div>

        <div className="flex gap-3">
          <button onClick={cancelImport}
            className="flex-1 py-3.5 border-2 border-border text-text-secondary font-bold rounded-xl hover:bg-bg transition-colors">
            ← Cancel
          </button>
          <button onClick={handleImport} disabled={totalBags === 0 || submitting}
            className="flex-1 py-3.5 bg-gradient-to-r from-gold to-gold-dark text-primary-dark font-black text-lg rounded-xl hover:shadow-xl hover:scale-[1.01] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100">
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-5 h-5 border-2 border-primary-dark border-t-transparent rounded-full animate-spin"></span>
                Importing...
              </span>
            ) : (
              `📦 Import ${totalBags} Bags`
            )}
          </button>
        </div>
      </div>
    );
  }

  /* ─── Main Dashboard ───────────────────────────────────────── */
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 bg-gradient-to-br from-primary to-primary-light rounded-2xl flex items-center justify-center text-3xl shadow-lg">
            📦
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-primary-dark">Stock Management</h1>
            <p className="text-sm text-text-secondary">Manage your Khol, Bhuso & Tiwana inventory</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowHistory(true)}
            className="px-4 py-2.5 bg-white border-2 border-border text-primary-dark font-bold rounded-xl hover:bg-bg hover:border-primary/30 transition-all text-sm flex items-center gap-2">
            <span>📜</span> History
          </button>
          <button onClick={() => navigate('/')}
            className="px-4 py-2.5 bg-white border-2 border-border text-text-secondary font-bold rounded-xl hover:bg-bg transition-colors text-sm flex items-center gap-2">
            <span>🏠</span> Home
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      {catalog && (
        <div className="grid grid-cols-3 gap-4 mb-8">
          {CATEGORIES.map(cat => {
            const items = catalog[cat.key] || [];
            const totalStock = items.reduce((s, it) => s + (it.currentStock || 0), 0);
            const itemCount = items.length;
            return (
              <div key={cat.key} className={`${cat.bgLight} border ${cat.borderColor} rounded-2xl p-4 text-center`}>
                <div className="text-3xl mb-1">{cat.icon}</div>
                <div className={`text-2xl font-black ${cat.textColor}`}>{totalStock}</div>
                <div className="text-xs text-text-secondary font-medium">{cat.label} • {itemCount} items</div>
              </div>
            );
          })}
        </div>
      )}

      {/* Category Sections */}
      <div className="space-y-6">
        {CATEGORIES.map(cat => {
          const items = catalog?.[cat.key] || [];
          return (
            <div key={cat.key} className="bg-white rounded-2xl border border-border shadow-md overflow-hidden">
              {/* Category Header */}
              <div className={`bg-gradient-to-r ${cat.gradient} p-4 flex items-center justify-between`}>
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{cat.icon}</span>
                  <div>
                    <h2 className="text-xl font-black text-white">{cat.label}</h2>
                    <p className="text-white/70 text-xs">{items.length} items • {items.reduce((s, it) => s + (it.currentStock || 0), 0)} total bags</p>
                  </div>
                </div>
                <button onClick={() => startImport(cat)}
                  className="px-4 py-2 bg-white/20 backdrop-blur-sm text-white font-bold rounded-xl border border-white/30 hover:bg-white/30 transition-all text-sm flex items-center gap-2">
                  <span>📥</span> Import Stock
                </button>
              </div>

              {/* Items Grid */}
              <div className="p-4">
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {items.map((item, idx) => (
                    <div key={item.name}
                      className={`relative rounded-xl border-2 ${cat.borderColor} p-4 hover:shadow-md transition-all group ${cat.bgLight}/50`}>
                      <div className="flex items-start justify-between mb-2">
                        <span className={`${cat.badgeBg} ${cat.textColor} w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black`}>
                          {idx + 1}
                        </span>
                        {item.currentStock <= 0 && (
                          <span className="bg-red-100 text-red-600 text-[10px] font-bold px-2 py-0.5 rounded-full">OUT</span>
                        )}
                        {item.currentStock > 0 && item.currentStock <= 10 && (
                          <span className="bg-amber-100 text-amber-600 text-[10px] font-bold px-2 py-0.5 rounded-full">LOW</span>
                        )}
                      </div>
                      <h3 className="font-bold text-primary-dark text-sm mb-1">{item.name}</h3>
                      <div className="flex items-end justify-between">
                        <div>
                          <p className="text-xs text-text-secondary">Current Stock</p>
                          <p className={`text-xl font-black ${item.currentStock > 0 ? cat.textColor : 'text-red-500'}`}>
                            {item.currentStock}
                            <span className="text-xs font-medium text-text-secondary ml-1">bags</span>
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
