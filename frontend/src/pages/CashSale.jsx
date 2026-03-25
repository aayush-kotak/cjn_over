import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ConfirmModal from '../components/ConfirmModal';
import { showToast } from '../components/Toast';
import { apiFetch } from '../utils/api';

const emptyBag     = () => ({ bagName: '', numberOfBags: '', pricePerBag: '' });
const getTodayDate = () => new Date().toISOString().slice(0, 10);

export default function CashSale() {
  const navigate = useNavigate();
  const [bags, setBags]           = useState([emptyBag()]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading]     = useState(false);

  const updateBag = (index, field, value) => {
    const updated = [...bags];
    updated[index] = { ...updated[index], [field]: value };
    setBags(updated);
  };

  const addBag    = () => setBags([...bags, emptyBag()]);
  const removeBag = (index) => {
    if (bags.length === 1) return;
    setBags(bags.filter((_, i) => i !== index));
  };

  const getSubtotal = (bag) => (Number(bag.numberOfBags) || 0) * (Number(bag.pricePerBag) || 0);
  const grandTotal  = bags.reduce((sum, bag) => sum + getSubtotal(bag), 0);
  const isValid     = bags.every(b => b.bagName.trim() && Number(b.numberOfBags) > 0 && Number(b.pricePerBag) > 0);

  const handlePreview = () => {
    if (!isValid) { showToast('Please fill all bag details correctly', 'error'); return; }
    setShowModal(true);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/cash-sale', {
        method: 'POST',
        body: JSON.stringify({
          date:          getTodayDate(),
          customer_name: 'CASH CUSTOMER',
          bags,
          grandTotal,
          amount:        grandTotal
        })
      });

      if (!res || !res.ok) {
        const err = await res?.json();
        throw new Error(err?.error || 'Failed');
      }

      showToast('Cash Sale saved successfully!');
      setShowModal(false);
      navigate('/');
    } catch (err) {
      showToast(err.message || 'Failed to save. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary-light rounded-xl flex items-center justify-center text-2xl shadow-lg">💰</div>
          <div>
            <h1 className="text-2xl font-black text-primary-dark">Cash Sale</h1>
            <p className="text-sm text-text-secondary">Record a new cash sale transaction</p>
          </div>
        </div>
      </div>

      {/* Bag entries */}
      <div className="space-y-4 mb-6">
        {bags.map((bag, index) => (
          <div key={index} className="bg-white rounded-2xl shadow-md border border-border p-5 relative group hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-bold text-primary-dark bg-primary/10 px-3 py-1 rounded-full">Bag #{index + 1}</span>
              {bags.length > 1 && (
                <button onClick={() => removeBag(index)}
                  className="text-xs font-semibold text-danger hover:bg-danger-light px-3 py-1.5 rounded-lg transition-colors">
                  ✕ Remove
                </button>
              )}
            </div>
            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-primary-dark mb-1.5">Bag Name <span className="text-danger">*</span></label>
                <input type="text" value={bag.bagName} onChange={e => updateBag(index, 'bagName', e.target.value)} placeholder="Enter bag name"
                  className="w-full px-4 py-3 rounded-xl border-2 border-border bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm font-medium" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-primary-dark mb-1.5">No. of Bags <span className="text-danger">*</span></label>
                <input type="number" min="1" value={bag.numberOfBags} onChange={e => updateBag(index, 'numberOfBags', e.target.value)} placeholder="0"
                  className="w-full px-4 py-3 rounded-xl border-2 border-border bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm font-medium" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-primary-dark mb-1.5">Price per Bag (₹) <span className="text-danger">*</span></label>
                <input type="number" min="1" value={bag.pricePerBag} onChange={e => updateBag(index, 'pricePerBag', e.target.value)} placeholder="0"
                  className="w-full px-4 py-3 rounded-xl border-2 border-border bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm font-medium" />
              </div>
            </div>
            <div className="mt-3 text-right">
              <span className="text-sm font-bold text-primary-dark bg-gold/20 px-3 py-1 rounded-full">
                Subtotal: ₹{getSubtotal(bag).toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Add bag button */}
      <button onClick={addBag}
        className="w-full py-3 border-2 border-dashed border-primary/40 text-primary font-bold rounded-xl hover:bg-primary/5 hover:border-primary transition-all text-sm flex items-center justify-center gap-2 mb-6">
        <span className="text-lg">+</span> Add Another Bag
      </button>

      {/* Grand Total */}
      <div className="bg-gradient-to-r from-primary-dark to-primary text-white p-5 rounded-2xl shadow-lg mb-4 flex items-center justify-between">
        <span className="font-bold text-lg">Grand Total</span>
        <span className="text-3xl font-black">₹{grandTotal.toLocaleString('en-IN')}</span>
      </div>

      {/* Today's date */}
      <div className="mb-6 text-sm text-text-secondary text-center">
        📅 Recording for: <span className="font-bold text-primary-dark">
          {new Date().toLocaleDateString('en-IN', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}
        </span>
      </div>

      {/* Preview button */}
      <button onClick={handlePreview} disabled={!isValid}
        className="w-full py-4 bg-gradient-to-r from-gold to-gold-dark text-primary-dark font-black text-lg rounded-xl hover:shadow-xl hover:scale-[1.01] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100">
        📋 Preview Entry
      </button>

      {/* Confirmation Modal */}
      {showModal && (
        <ConfirmModal title="Confirm Cash Sale" onConfirm={handleSave} onCancel={() => setShowModal(false)} loading={loading}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-primary/20">
                  <th className="text-left py-2 px-2 text-primary-dark">Bag Name</th>
                  <th className="text-center py-2 px-2 text-primary-dark">Bags</th>
                  <th className="text-right py-2 px-2 text-primary-dark">Price</th>
                  <th className="text-right py-2 px-2 text-primary-dark">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {bags.map((bag, i) => (
                  <tr key={i} className="border-b border-border">
                    <td className="py-2 px-2 font-medium">{bag.bagName}</td>
                    <td className="py-2 px-2 text-center">{bag.numberOfBags}</td>
                    <td className="py-2 px-2 text-right">₹{Number(bag.pricePerBag).toLocaleString('en-IN')}</td>
                    <td className="py-2 px-2 text-right font-semibold text-primary-dark">₹{getSubtotal(bag).toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 p-2 bg-bg rounded-lg text-xs text-text-secondary text-center">
            📅 {new Date().toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}
            &nbsp;|&nbsp; 👤 CASH CUSTOMER
          </div>
          <div className="mt-3 p-3 bg-primary/10 rounded-xl flex justify-between items-center">
            <span className="font-bold text-primary-dark">Grand Total:</span>
            <span className="text-xl font-black text-primary-dark">₹{grandTotal.toLocaleString('en-IN')}</span>
          </div>
        </ConfirmModal>
      )}
    </div>
  );
}