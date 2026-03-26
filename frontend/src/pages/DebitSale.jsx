import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CustomerDropdown from '../components/CustomerDropdown';
import ConfirmModal from '../components/ConfirmModal';
import { showToast } from '../components/Toast';
import { apiFetch } from '../utils/api';

const emptyBag = () => ({ productId: '', bagName: '', numberOfBags: '', pricePerBag: '' });

export default function DebitSale() {
  const navigate = useNavigate();
  const [customerName, setCustomerName] = useState('');
  const [bags, setBags]                 = useState([emptyBag()]);
  const [showModal, setShowModal]       = useState(false);
  const [loading, setLoading]           = useState(false);
  const [products, setProducts]        = useState([]);

  const todayDisplay = new Date().toLocaleDateString('en-IN', { day:'2-digit', month:'2-digit', year:'numeric' });
  const todayISO     = new Date().toISOString().slice(0, 10);

  const updateBag = (index, field, value) => {
    const updated = [...bags];
    updated[index] = { ...updated[index], [field]: value };
    if (field === 'bagName') updated[index].productId = '';
    setBags(updated);
  };

  const addBag    = () => setBags([...bags, emptyBag()]);
  const removeBag = (index) => { if (bags.length === 1) return; setBags(bags.filter((_, i) => i !== index)); };

  const getSubtotal = (bag) => (Number(bag.numberOfBags) || 0) * (Number(bag.pricePerBag) || 0);
  const grandTotal  = bags.reduce((sum, bag) => sum + getSubtotal(bag), 0);
  const isValid     = customerName.trim() && bags.every(b => b.bagName.trim() && Number(b.numberOfBags) > 0 && Number(b.pricePerBag) > 0);

  useEffect(() => {
    let cancelled = false;
    apiFetch('/api/products')
      .then(res => res.json())
      .then(data => {
        if (cancelled) return;
        if (Array.isArray(data)) setProducts(data);
      })
      .catch(() => {
        if (!cancelled) setProducts([]);
      });
    return () => { cancelled = true; };
  }, []);

  const handlePickProduct = (index, productId) => {
    const pid = String(productId || '');
    const product = products.find(p => String(p.id) === pid);
    if (!product) {
      updateBag(index, 'productId', '');
      return;
    }
    updateBag(index, 'productId', pid);
    updateBag(index, 'bagName', product.name);
    updateBag(index, 'pricePerBag', product.rate_per_bag ?? '');
  };

  const handlePreview = () => {
    if (!isValid) { showToast('Please fill customer name and all bag details', 'error'); return; }
    setShowModal(true);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // ── Save to database with auth token ──────────────────
      const res = await apiFetch('/api/debit-sale', {
        method: 'POST',
        body: JSON.stringify({
          date:          todayISO,
          customer_name: customerName.trim(),
          customerName:  customerName.trim(),
          bags,
          grandTotal,
          amount:        grandTotal
        })
      });

      if (!res || !res.ok) {
        const data = await res?.json();
        throw new Error(data?.error || 'Failed');
      }

      showToast('Debit Sale saved successfully!');
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
          <div className="w-12 h-12 bg-gradient-to-br from-teal-600 to-cyan-500 rounded-xl flex items-center justify-center text-2xl shadow-lg">📤</div>
          <div>
            <h1 className="text-2xl font-black text-primary-dark">Debit Sale</h1>
            <p className="text-sm text-text-secondary">Record a debit sale against customer account</p>
          </div>
        </div>
      </div>

      {/* Customer + Date */}
      <div className="bg-white rounded-2xl shadow-md border border-border p-6 mb-6">
        <CustomerDropdown value={customerName} onChange={setCustomerName} />
        <div className="mt-4">
          <label className="block text-sm font-semibold text-primary-dark mb-1.5">Date</label>
          <input type="text" value={todayDisplay} disabled
            className="w-full px-4 py-3 rounded-xl border-2 border-border bg-gray-50 text-text-secondary text-sm font-medium cursor-not-allowed" />
        </div>
      </div>

      {/* Bag entries */}
      <div className="space-y-4 mb-6">
        {bags.map((bag, index) => (
          <div key={index} className="bg-white rounded-2xl shadow-md border border-border p-5 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-bold text-primary-dark bg-primary/10 px-3 py-1 rounded-full">Bag #{index + 1}</span>
              {bags.length > 1 && (
                <button onClick={() => removeBag(index)} className="text-xs font-semibold text-danger hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors">✕ Remove</button>
              )}
            </div>
            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-primary-dark mb-1.5">Product (optional)</label>
                <select
                  value={bag.productId || ''}
                  onChange={e => handlePickProduct(index, e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border-2 border-border bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm font-medium"
                >
                  <option value="">Custom (type bag name)</option>
                  {products.map(p => (
                    <option key={p.id} value={String(p.id)}>{p.name}</option>
                  ))}
                </select>

                <label className="block text-sm font-semibold text-primary-dark mt-3 mb-1.5">
                  Bag Name <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  value={bag.bagName}
                  onChange={e => updateBag(index, 'bagName', e.target.value)}
                  placeholder="Enter bag name"
                  className="w-full px-4 py-3 rounded-xl border-2 border-border bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm font-medium"
                />
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

      {/* Add bag */}
      <button onClick={addBag}
        className="w-full py-3 border-2 border-dashed border-primary/40 text-primary font-bold rounded-xl hover:bg-primary/5 hover:border-primary transition-all text-sm flex items-center justify-center gap-2 mb-6">
        <span className="text-lg">+</span> Add Another Bag
      </button>

      {/* Grand Total */}
      <div className="bg-gradient-to-r from-primary-dark to-primary text-white p-5 rounded-2xl shadow-lg mb-6 flex items-center justify-between">
        <span className="font-bold text-lg">Grand Total</span>
        <span className="text-3xl font-black">₹{grandTotal.toLocaleString('en-IN')}</span>
      </div>

      {/* Preview button */}
      <button onClick={handlePreview} disabled={!isValid}
        className="w-full py-4 bg-gradient-to-r from-gold to-gold-dark text-primary-dark font-black text-lg rounded-xl hover:shadow-xl hover:scale-[1.01] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100">
        📋 Preview Entry
      </button>

      {/* Modal */}
      {showModal && (
        <ConfirmModal title="Confirm Debit Sale" onConfirm={handleSave} onCancel={() => setShowModal(false)} loading={loading}>
          <div className="mb-3 pb-3 border-b border-border">
            <div className="flex justify-between">
              <span className="text-sm text-text-secondary">Customer</span>
              <span className="font-bold text-primary-dark">{customerName}</span>
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-sm text-text-secondary">Date</span>
              <span className="font-medium text-text">{todayDisplay}</span>
            </div>
          </div>
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
          <div className="mt-4 p-3 bg-primary/10 rounded-xl flex justify-between items-center">
            <span className="font-bold text-primary-dark">Grand Total:</span>
            <span className="text-xl font-black text-primary-dark">₹{grandTotal.toLocaleString('en-IN')}</span>
          </div>
        </ConfirmModal>
      )}
    </div>
  );
}