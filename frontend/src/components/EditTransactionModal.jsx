import { useState } from 'react';
import { apiFetch } from '../utils/api';
import { showToast } from './Toast';
import CustomerDropdown from './CustomerDropdown';
import { BAG_CATALOG } from '../utils/bagCatalog';

const emptyBag = () => ({ bagName: '', numberOfBags: '', pricePerBag: '' });

export default function EditTransactionModal({ type, entry, onSave, onCancel }) {
  const [loading, setLoading]     = useState(false);
  
  // Form State
  const [date, setDate]           = useState(entry?.date || '');
  const [customerName, setCustomerName] = useState(entry?.customer_name || '');
  const [amount, setAmount]       = useState(entry?.amount || '');
  const [note, setNote]           = useState(entry?.note || '');
  const [bags, setBags]           = useState(Array.isArray(entry?.bags) ? JSON.parse(JSON.stringify(entry.bags)) : []);
  const [category, setCategory]   = useState(entry?.category || '');

  const updateBag = (index, field, value) => {
    const updated = [...bags];
    updated[index] = { ...updated[index], [field]: value };
    setBags(updated);
  };

  const addBag    = () => setBags([...bags, emptyBag()]);
  const removeBag = (index) => setBags(bags.filter((_, i) => i !== index));

  const getSubtotal = (bag) => (Number(bag.numberOfBags) || 0) * (Number(bag.pricePerBag) || 0);
  const grandTotal  = bags.reduce((sum, bag) => sum + getSubtotal(bag), 0);

  const handleSave = async () => {
    setLoading(true);
    try {
      let body = { date, note };
      let url = '';

      if (type === 'cash-sale') {
        url = `/api/cash-sale/${entry.id}`;
        body = { ...body, customer_name: 'CASH CUSTOMER', bags, amount: grandTotal };
      } else if (type === 'debit-sale') {
        url = `/api/debit-sale/${entry.id}`;
        body = { ...body, customer_name: customerName, bags, amount: grandTotal };
      } else if (type === 'credit') {
        url = `/api/credit/${entry.id}`;
        body = { ...body, customer_name: customerName, amount: Number(amount) };
      } else if (type === 'expenses') {
        url = `/api/expenses/${entry.id}`;
        body = { ...body, amount: Number(amount), category };
      }

      const res = await apiFetch(url, {
        method: 'PUT',
        body: JSON.stringify(body)
      });

      if (!res || !res.ok) {
        const data = await res?.json();
        throw new Error(data?.error || 'Failed to update');
      }

      showToast('Updated successfully!');
      onSave();
    } catch (err) {
      showToast(err.message || 'Update failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
      onClick={e => e.target === e.currentTarget && onCancel()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-border flex flex-col">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-primary to-primary-light p-5 sticky top-0 z-10 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3 text-white">
            <span className="text-2xl">✏️</span>
            <div>
              <h2 className="text-lg font-black uppercase tracking-tight">Edit {type.replace('-', ' ')}</h2>
              <p className="text-xs text-green-100 opacity-80">Modified changes will update the ledger balances</p>
            </div>
          </div>
          <button onClick={onCancel} className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/20 hover:bg-white/30 text-white font-bold transition-all transform hover:rotate-90">✕</button>
        </div>

        <div className="p-6 space-y-6">
          {/* Common Date Field */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-primary-dark mb-1.5 uppercase tracking-wider">Transaction Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border-2 border-border focus:border-primary outline-none transition-all text-sm font-medium" />
            </div>
            {(type === 'debit-sale' || type === 'credit') && (
              <div>
                <CustomerDropdown value={customerName} onChange={setCustomerName} />
              </div>
            )}
            {type === 'expenses' && (
              <div>
                <label className="block text-xs font-bold text-primary-dark mb-1.5 uppercase tracking-wider">Category / Description</label>
                <input type="text" value={category} onChange={e => setCategory(e.target.value)} placeholder="Expense name"
                  className="w-full px-4 py-3 rounded-xl border-2 border-border focus:border-primary outline-none transition-all text-sm font-medium" />
              </div>
            )}
          </div>

          {/* Sales Specific: Bags List */}
          {(type === 'cash-sale' || type === 'debit-sale') && (
            <div className="space-y-4">
              <label className="block text-xs font-bold text-primary-dark mb-1.5 uppercase tracking-wider">Bag Details</label>
              {bags.map((bag, idx) => (
                <div key={idx} className="p-4 bg-bg rounded-2xl border border-border relative group">
                  <div className="grid sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-1">
                      <label className="block text-[10px] font-black text-text-secondary uppercase mb-1">Bag Name</label>
                      <select value={bag.bagName || ''} onChange={e => updateBag(idx, 'bagName', e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-border text-xs font-bold bg-white outline-none focus:border-primary">
                        <option value="">-- Select Bag --</option>
                        {Object.entries(BAG_CATALOG).map(([cat, items]) => (
                          <optgroup key={cat} label={`━━ ${cat} ━━`}>
                            {items.map(name => <option key={name} value={name}>{name}</option>)}
                          </optgroup>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-text-secondary uppercase mb-1">Quantity</label>
                      <input type="number" value={bag.numberOfBags} onChange={e => updateBag(idx, 'numberOfBags', e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-border text-xs font-bold bg-white outline-none focus:border-primary" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-text-secondary uppercase mb-1">Rate (₹)</label>
                      <input type="number" value={bag.pricePerBag} onChange={e => updateBag(idx, 'pricePerBag', e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-border text-xs font-bold bg-white outline-none focus:border-primary" />
                    </div>
                    <div className="flex items-end justify-between">
                      <div className="pb-2">
                        <p className="text-[10px] font-black text-text-secondary uppercase">Subtotal</p>
                        <p className="text-sm font-black text-primary">₹{getSubtotal(bag).toLocaleString('en-IN')}</p>
                      </div>
                      <button onClick={() => removeBag(idx)} className="text-danger hover:bg-red-50 p-2 rounded-lg transition-colors">✕</button>
                    </div>
                  </div>
                </div>
              ))}
              <button onClick={addBag} className="w-full py-2 border-2 border-dashed border-primary/30 text-primary text-xs font-black rounded-xl hover:bg-primary/5 transition-all">+ Add Product Line</button>
              
              <div className="p-4 bg-primary/10 rounded-2xl flex justify-between items-center border border-primary/20">
                <span className="font-black text-primary-dark text-sm uppercase">Updated Grand Total</span>
                <span className="text-2xl font-black text-primary-dark">₹{grandTotal.toLocaleString('en-IN')}</span>
              </div>
            </div>
          )}

          {/* Credit/Expense Specific: Amount */}
          {(type === 'credit' || type === 'expenses') && (
            <div>
              <label className="block text-xs font-bold text-primary-dark mb-1.5 uppercase tracking-wider">Amount (₹)</label>
              <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border-2 border-border focus:border-primary outline-none transition-all text-xl font-black text-primary-dark" />
            </div>
          )}

          {/* Common Note Field */}
          <div>
            <label className="block text-xs font-bold text-primary-dark mb-1.5 uppercase tracking-wider">Remarks / Notes</label>
            <textarea value={note} onChange={e => setNote(e.target.value)} rows="3" placeholder="Add additional details..."
              className="w-full px-4 py-3 rounded-xl border-2 border-border focus:border-primary outline-none transition-all text-sm font-medium resize-none" />
          </div>
        </div>

        {/* Actions */}
        <div className="p-6 pt-0 flex gap-3 sticky bottom-0 bg-white shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
          <button onClick={onCancel} disabled={loading}
            className="flex-1 py-4 border-2 border-border text-text-secondary font-black rounded-xl hover:bg-gray-50 transition-all uppercase tracking-widest text-xs">Cancel</button>
          <button onClick={handleSave} disabled={loading}
            className="flex-1 py-4 bg-gradient-to-r from-primary to-primary-light text-white font-black rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 uppercase tracking-widest text-xs">
            {loading ? 'Saving Changes...' : 'Save & Update Ledger'}
          </button>
        </div>
      </div>
    </div>
  );
}
