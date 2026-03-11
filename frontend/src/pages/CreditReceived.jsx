import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CustomerDropdown from '../components/CustomerDropdown';
import ConfirmModal from '../components/ConfirmModal';
import { showToast } from '../components/Toast';

export default function CreditReceived() {
  const navigate = useNavigate();
  const [customerName, setCustomerName] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });

  const isValid = customerName.trim() && Number(amount) > 0;

  const handlePreview = () => {
    if (!isValid) {
      showToast('Please select a customer and enter amount', 'error');
      return;
    }
    setShowModal(true);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/credit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerName, amount: Number(amount), note })
      });
      if (!res.ok) throw new Error('Failed');
      showToast('Credit Received saved successfully!');
      setShowModal(false);
      navigate('/');
    } catch {
      showToast('Failed to save. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 bg-gradient-to-br from-amber-600 to-yellow-500 rounded-xl flex items-center justify-center text-2xl shadow-lg">📥</div>
          <div>
            <h1 className="text-2xl font-black text-primary-dark">Credit Received</h1>
            <p className="text-sm text-text-secondary">Record a credit payment from customer</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white rounded-2xl shadow-md border border-border p-6 space-y-5">
        <CustomerDropdown value={customerName} onChange={setCustomerName} />

        <div>
          <label className="block text-sm font-semibold text-primary-dark mb-1.5">
            Amount Received (₹) <span className="text-danger">*</span>
          </label>
          <input
            type="number"
            min="1"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="Enter amount"
            className="w-full px-4 py-3 rounded-xl border-2 border-border bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm font-medium"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-primary-dark mb-1.5">
            Note / Remark <span className="text-text-secondary font-normal">(optional)</span>
          </label>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Add a note..."
            rows="3"
            className="w-full px-4 py-3 rounded-xl border-2 border-border bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm font-medium resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-primary-dark mb-1.5">Date</label>
          <input
            type="text"
            value={today}
            disabled
            className="w-full px-4 py-3 rounded-xl border-2 border-border bg-gray-50 text-text-secondary text-sm font-medium cursor-not-allowed"
          />
        </div>

        {/* Amount display */}
        {Number(amount) > 0 && (
          <div className="bg-gradient-to-r from-amber-600 to-yellow-500 text-white p-4 rounded-xl shadow-lg flex items-center justify-between">
            <span className="font-bold">Amount</span>
            <span className="text-2xl font-black">₹{Number(amount).toLocaleString('en-IN')}</span>
          </div>
        )}

        {/* Preview button */}
        <button
          onClick={handlePreview}
          disabled={!isValid}
          className="w-full py-4 bg-gradient-to-r from-gold to-gold-dark text-primary-dark font-black text-lg rounded-xl hover:shadow-xl hover:scale-[1.01] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          📋 Preview Entry
        </button>
      </div>

      {/* Confirmation Modal */}
      {showModal && (
        <ConfirmModal
          title="Confirm Credit Received"
          onConfirm={handleSave}
          onCancel={() => setShowModal(false)}
          loading={loading}
        >
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-border">
              <span className="text-sm text-text-secondary">Customer</span>
              <span className="font-bold text-primary-dark">{customerName}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border">
              <span className="text-sm text-text-secondary">Amount</span>
              <span className="font-bold text-primary-dark text-lg">₹{Number(amount).toLocaleString('en-IN')}</span>
            </div>
            {note && (
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-sm text-text-secondary">Note</span>
                <span className="font-medium text-text">{note}</span>
              </div>
            )}
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-text-secondary">Date</span>
              <span className="font-medium text-text">{today}</span>
            </div>
          </div>
        </ConfirmModal>
      )}
    </div>
  );
}
