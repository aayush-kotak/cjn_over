import { useState, useEffect } from 'react';
import { showToast } from '../components/Toast';

export default function TodaySummary() {
  const [summary, setSummary] = useState(null);
  const [history, setHistory] = useState([]);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // Expense form
  const [expDesc, setExpDesc] = useState('');
  const [expAmt, setExpAmt] = useState('');
  const [savingExpense, setSavingExpense] = useState(false);

  // Labour
  const [labourers, setLabourers] = useState(1);

  const fetchSummary = async () => {
    try {
      const res = await fetch('/api/today-summary');
      const data = await res.json();
      setSummary(data);
    } catch {
      showToast('Failed to load summary', 'error');
    } finally {
      setLoadingSummary(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/day-history');
      const data = await res.json();
      setHistory(data);
    } catch {
      showToast('Failed to load history', 'error');
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchSummary();
    fetchHistory();
  }, []);

  const handleAddExpense = async () => {
    if (!expDesc.trim() || !Number(expAmt)) {
      showToast('Enter expense description and amount', 'error');
      return;
    }
    setSavingExpense(true);
    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: expDesc, amount: Number(expAmt) })
      });
      if (!res.ok) throw new Error('Failed');
      showToast('Expense saved successfully!');
      setExpDesc('');
      setExpAmt('');
      fetchSummary();
    } catch {
      showToast('Failed to save expense', 'error');
    } finally {
      setSavingExpense(false);
    }
  };

  const totalLabourCost = (summary?.totalBags || 0) * 3;
  const perLabour = labourers > 0 ? totalLabourCost / labourers : 0;

  if (loadingSummary) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-text-secondary font-medium">Loading today's summary...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-blue-500 rounded-xl flex items-center justify-center text-2xl shadow-lg">📊</div>
          <div>
            <h1 className="text-2xl font-black text-primary-dark">Today's Summary</h1>
            <p className="text-sm text-text-secondary">{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
          </div>
        </div>
      </div>

      {/* A) Sales Summary Cards */}
      <section className="mb-8">
        <h2 className="text-lg font-bold text-primary-dark mb-4 flex items-center gap-2">
          <span className="w-1.5 h-6 bg-primary rounded-full"></span>
          Today's Total Sales Summary
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryCard
            icon="💰" label="Total Cash Collected" value={`₹${(summary?.totalCash || 0).toLocaleString('en-IN')}`}
            gradient="from-emerald-600 to-green-500"
          />
          <SummaryCard
            icon="📥" label="Total Credit Received" value={`₹${(summary?.totalCredit || 0).toLocaleString('en-IN')}`}
            gradient="from-amber-600 to-yellow-500"
          />
          <SummaryCard
            icon="📦" label="Total Bags Sold" value={summary?.totalBags || 0}
            gradient="from-teal-600 to-cyan-500"
          />
          <SummaryCard
            icon="📈" label="Combined Revenue" value={`₹${((summary?.totalCash || 0) + (summary?.totalCredit || 0)).toLocaleString('en-IN')}`}
            gradient="from-indigo-600 to-blue-500"
          />
        </div>
      </section>

      {/* B) Expenses (Kharcho) */}
      <section className="mb-8">
        <h2 className="text-lg font-bold text-primary-dark mb-4 flex items-center gap-2">
          <span className="w-1.5 h-6 bg-warning rounded-full"></span>
          Today's Total Kharcho (Side Expenses)
        </h2>
        <div className="bg-white rounded-2xl shadow-md border border-border p-6">
          {/* Add expense form */}
          <div className="flex flex-col sm:flex-row gap-3 mb-5">
            <input
              type="text"
              value={expDesc}
              onChange={e => setExpDesc(e.target.value)}
              placeholder="Expense description"
              className="flex-1 px-4 py-3 rounded-xl border-2 border-border focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm font-medium"
            />
            <input
              type="number"
              min="1"
              value={expAmt}
              onChange={e => setExpAmt(e.target.value)}
              placeholder="Amount (₹)"
              className="w-full sm:w-36 px-4 py-3 rounded-xl border-2 border-border focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm font-medium"
            />
            <button
              onClick={handleAddExpense}
              disabled={savingExpense}
              className="px-6 py-3 bg-gradient-to-r from-warning to-amber-400 text-primary-dark font-bold rounded-xl hover:shadow-lg transition-all text-sm disabled:opacity-50 whitespace-nowrap"
            >
              {savingExpense ? '...' : '+ Add Expense'}
            </button>
          </div>

          {/* Expenses list */}
          {summary?.expenses?.length > 0 ? (
            <div className="space-y-2 mb-4">
              {summary.expenses.map((exp, i) => (
                <div key={exp.id || i} className="flex justify-between items-center py-2 px-3 bg-bg rounded-xl">
                  <span className="text-sm font-medium text-text">{exp.description}</span>
                  <span className="text-sm font-bold text-danger">-₹{exp.amount.toLocaleString('en-IN')}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-text-secondary text-center py-3 mb-4">No expenses recorded today</p>
          )}

          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center py-2 px-4 bg-red-50 rounded-xl">
              <span className="font-bold text-danger text-sm">Total Expenses</span>
              <span className="font-black text-danger">₹{(summary?.totalExpenses || 0).toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between items-center py-3 px-4 bg-gradient-to-r from-primary to-primary-light text-white rounded-xl">
              <span className="font-bold text-sm">Final Total (Revenue - Expenses)</span>
              <span className="text-xl font-black">₹{(summary?.finalTotal || 0).toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>
      </section>

      {/* C) Labour Calculation */}
      <section className="mb-8">
        <h2 className="text-lg font-bold text-primary-dark mb-4 flex items-center gap-2">
          <span className="w-1.5 h-6 bg-primary-light rounded-full"></span>
          Labour Calculation
        </h2>
        <div className="bg-white rounded-2xl shadow-md border border-border p-6">
          <div className="grid sm:grid-cols-3 gap-4 mb-4">
            <div className="text-center p-4 bg-bg rounded-xl">
              <p className="text-xs text-text-secondary font-semibold uppercase mb-1">Total Bags</p>
              <p className="text-2xl font-black text-primary-dark">{summary?.totalBags || 0}</p>
            </div>
            <div className="text-center p-4 bg-bg rounded-xl">
              <p className="text-xs text-text-secondary font-semibold uppercase mb-1">Rate per Bag</p>
              <p className="text-2xl font-black text-primary-dark">₹3</p>
            </div>
            <div className="text-center p-4 bg-gold/20 rounded-xl">
              <p className="text-xs text-text-secondary font-semibold uppercase mb-1">Total Labour Cost</p>
              <p className="text-2xl font-black text-primary-dark">₹{totalLabourCost.toLocaleString('en-IN')}</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <div className="flex-1">
              <label className="block text-sm font-semibold text-primary-dark mb-1.5">Number of Labourers</label>
              <select
                value={labourers}
                onChange={e => setLabourers(Number(e.target.value))}
                className="w-full px-4 py-3 rounded-xl border-2 border-border bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm font-medium"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                  <option key={n} value={n}>{n} Labourer{n > 1 ? 's' : ''}</option>
                ))}
              </select>
            </div>
            <div className="flex-1 text-center p-4 bg-gradient-to-r from-primary to-primary-light text-white rounded-xl">
              <p className="text-xs font-semibold uppercase mb-1 text-green-100">Per Labourer Amount</p>
              <p className="text-3xl font-black">₹{perLabour.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>
            </div>
          </div>
        </div>
      </section>

      {/* D) Day History */}
      <section>
        <h2 className="text-lg font-bold text-primary-dark mb-4 flex items-center gap-2">
          <span className="w-1.5 h-6 bg-earth rounded-full"></span>
          Complete Day History
        </h2>
        <div className="bg-white rounded-2xl shadow-md border border-border overflow-hidden">
          {loadingHistory ? (
            <div className="p-8 text-center">
              <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-sm text-text-secondary">Loading history...</p>
            </div>
          ) : history.length > 0 ? (
            <div className="table-responsive">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-primary-dark text-white">
                    <th className="text-left py-3 px-4 font-semibold">Date</th>
                    <th className="text-center py-3 px-4 font-semibold">Total Bags</th>
                    <th className="text-right py-3 px-4 font-semibold">Cash Total</th>
                    <th className="text-right py-3 px-4 font-semibold">Credit Total</th>
                    <th className="text-right py-3 px-4 font-semibold">Expenses</th>
                    <th className="text-right py-3 px-4 font-semibold">Final Total</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((day, i) => (
                    <tr key={day.date} className={`border-b border-border ${i % 2 === 0 ? 'bg-white' : 'bg-bg'} hover:bg-primary/5 transition-colors`}>
                      <td className="py-3 px-4 font-medium">{new Date(day.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                      <td className="py-3 px-4 text-center font-semibold">{day.totalBags}</td>
                      <td className="py-3 px-4 text-right text-primary-dark font-semibold">₹{day.cashTotal.toLocaleString('en-IN')}</td>
                      <td className="py-3 px-4 text-right text-amber-600 font-semibold">₹{day.creditTotal.toLocaleString('en-IN')}</td>
                      <td className="py-3 px-4 text-right text-danger font-semibold">₹{day.expenses.toLocaleString('en-IN')}</td>
                      <td className="py-3 px-4 text-right font-black text-primary-dark">₹{day.finalTotal.toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center">
              <div className="text-4xl mb-2">📅</div>
              <p className="text-text-secondary font-medium">No history yet. Start recording sales!</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function SummaryCard({ icon, label, value, gradient }) {
  return (
    <div className={`bg-gradient-to-br ${gradient} text-white p-5 rounded-2xl shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all`}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-2xl">{icon}</span>
        <span className="text-xs font-semibold uppercase tracking-wide text-white/80">{label}</span>
      </div>
      <p className="text-2xl font-black">{value}</p>
    </div>
  );
}
