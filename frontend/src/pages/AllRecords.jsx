import { useState, useEffect } from 'react';
import { CUSTOMERS } from '../components/CustomerDropdown';
import { showToast } from '../components/Toast';

export default function AllRecords() {
  const [records, setRecords] = useState({});
  const [loading, setLoading] = useState(true);
  const [expandedCustomer, setExpandedCustomer] = useState(null);

  useEffect(() => {
    fetchAllRecords();
  }, []);

  const fetchAllRecords = async () => {
    try {
      const results = {};
      // Fetch all customers in parallel
      const promises = CUSTOMERS.map(async (name) => {
        const res = await fetch(`/api/customer-records/${encodeURIComponent(name)}`);
        const data = await res.json();
        results[name] = data;
      });
      await Promise.all(promises);
      setRecords(results);
    } catch {
      showToast('Failed to load records', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-text-secondary font-medium">Loading customer records...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-500 rounded-xl flex items-center justify-center text-2xl shadow-lg">📁</div>
          <div>
            <h1 className="text-2xl font-black text-primary-dark">All Records</h1>
            <p className="text-sm text-text-secondary">Customer ledger — Debit & Credit history</p>
          </div>
        </div>
      </div>

      {/* Customer cards */}
      <div className="space-y-4">
        {CUSTOMERS.map(name => {
          const data = records[name];
          if (!data) return null;
          const hasData = data.debitSales?.length > 0 || data.creditReceived?.length > 0;
          const isExpanded = expandedCustomer === name;

          return (
            <div key={name} className="bg-white rounded-2xl shadow-md border border-border overflow-hidden hover:shadow-lg transition-shadow">
              {/* Customer header */}
              <button
                onClick={() => setExpandedCustomer(isExpanded ? null : name)}
                className="w-full flex items-center justify-between p-5 text-left hover:bg-bg transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary-light rounded-full flex items-center justify-center text-white font-bold text-sm shadow">
                    {name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-primary-dark text-sm">{name}</h3>
                    <div className="flex items-center gap-3 text-xs mt-0.5">
                      <span className="text-danger font-semibold">Debit: ₹{(data.totalDebit || 0).toLocaleString('en-IN')}</span>
                      <span className="text-primary font-semibold">Credit: ₹{(data.totalCredit || 0).toLocaleString('en-IN')}</span>
                      <span className={`font-black ${data.balance > 0 ? 'text-danger' : 'text-primary'}`}>
                        Bal: ₹{Math.abs(data.balance || 0).toLocaleString('en-IN')} {data.balance > 0 ? '(Due)' : data.balance < 0 ? '(Advance)' : '(Clear)'}
                      </span>
                    </div>
                  </div>
                </div>
                <svg className={`w-5 h-5 text-text-secondary transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Expanded content */}
              {isExpanded && (
                <div className="px-5 pb-5 border-t border-border pt-4">
                  {!hasData ? (
                    <p className="text-sm text-text-secondary text-center py-4">No transactions recorded for this customer</p>
                  ) : (
                    <div className="grid lg:grid-cols-2 gap-5">
                      {/* Debit Sales */}
                      <div>
                        <h4 className="text-sm font-bold text-danger mb-3 flex items-center gap-2">
                          <span className="w-1.5 h-4 bg-danger rounded-full"></span>
                          Debit Sales
                        </h4>
                        {data.debitSales?.length > 0 ? (
                          <div className="table-responsive">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="bg-red-50">
                                  <th className="text-left py-2 px-2 font-semibold text-danger">Date</th>
                                  <th className="text-left py-2 px-2 font-semibold text-danger">Bag</th>
                                  <th className="text-center py-2 px-2 font-semibold text-danger">Bags</th>
                                  <th className="text-right py-2 px-2 font-semibold text-danger">Price</th>
                                  <th className="text-right py-2 px-2 font-semibold text-danger">Total</th>
                                </tr>
                              </thead>
                              <tbody>
                                {data.debitSales.map((sale, si) =>
                                  sale.bags.map((bag, bi) => (
                                    <tr key={`${si}-${bi}`} className="border-b border-border">
                                      <td className="py-2 px-2">{bi === 0 ? new Date(sale.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : ''}</td>
                                      <td className="py-2 px-2 font-medium">{bag.bagName}</td>
                                      <td className="py-2 px-2 text-center">{bag.numberOfBags}</td>
                                      <td className="py-2 px-2 text-right">₹{Number(bag.pricePerBag).toLocaleString('en-IN')}</td>
                                      <td className="py-2 px-2 text-right font-semibold">₹{(Number(bag.numberOfBags) * Number(bag.pricePerBag)).toLocaleString('en-IN')}</td>
                                    </tr>
                                  ))
                                )}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <p className="text-xs text-text-secondary text-center py-3 bg-bg rounded-xl">No debit sales</p>
                        )}
                      </div>

                      {/* Credit Received */}
                      <div>
                        <h4 className="text-sm font-bold text-primary mb-3 flex items-center gap-2">
                          <span className="w-1.5 h-4 bg-primary rounded-full"></span>
                          Credit Received
                        </h4>
                        {data.creditReceived?.length > 0 ? (
                          <div className="table-responsive">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="bg-green-50">
                                  <th className="text-left py-2 px-2 font-semibold text-primary">Date</th>
                                  <th className="text-right py-2 px-2 font-semibold text-primary">Amount</th>
                                  <th className="text-left py-2 px-2 font-semibold text-primary">Note</th>
                                </tr>
                              </thead>
                              <tbody>
                                {data.creditReceived.map((cr, i) => (
                                  <tr key={i} className="border-b border-border">
                                    <td className="py-2 px-2">{new Date(cr.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</td>
                                    <td className="py-2 px-2 text-right font-semibold text-primary">₹{cr.amount.toLocaleString('en-IN')}</td>
                                    <td className="py-2 px-2 text-text-secondary">{cr.note || '-'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <p className="text-xs text-text-secondary text-center py-3 bg-bg rounded-xl">No credits received</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Summary */}
                  {hasData && (
                    <div className="mt-4 grid grid-cols-3 gap-3">
                      <div className="text-center p-3 bg-red-50 rounded-xl">
                        <p className="text-xs text-text-secondary font-semibold">Total Debit</p>
                        <p className="text-lg font-black text-danger">₹{(data.totalDebit || 0).toLocaleString('en-IN')}</p>
                      </div>
                      <div className="text-center p-3 bg-green-50 rounded-xl">
                        <p className="text-xs text-text-secondary font-semibold">Total Credit</p>
                        <p className="text-lg font-black text-primary">₹{(data.totalCredit || 0).toLocaleString('en-IN')}</p>
                      </div>
                      <div className={`text-center p-3 rounded-xl ${data.balance > 0 ? 'bg-red-50' : 'bg-green-50'}`}>
                        <p className="text-xs text-text-secondary font-semibold">Balance</p>
                        <p className={`text-lg font-black ${data.balance > 0 ? 'text-danger' : 'text-primary'}`}>
                          ₹{Math.abs(data.balance || 0).toLocaleString('en-IN')}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
