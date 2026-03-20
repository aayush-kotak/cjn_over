// import { useState, useEffect } from 'react';
// import { CUSTOMERS } from '../components/CustomerDropdown';
// import { showToast } from '../components/Toast';

// export default function AllRecords() {
//   const [records, setRecords] = useState({});
//   const [loading, setLoading] = useState(true);
//   const [expandedCustomer, setExpandedCustomer] = useState(null);

//   useEffect(() => {
//     fetchAllRecords();
//   }, []);

//   const fetchAllRecords = async () => {
//     try {
//       const results = {};
//       // Fetch all customers in parallel
//       const promises = CUSTOMERS.map(async (name) => {
//         const res = await fetch(`/api/customer-records/${encodeURIComponent(name)}`);
//         const data = await res.json();
//         results[name] = data;
//       });
//       await Promise.all(promises);
//       setRecords(results);
//     } catch {
//       showToast('Failed to load records', 'error');
//     } finally {
//       setLoading(false);
//     }
//   };

//   if (loading) {
//     return (
//       <div className="flex items-center justify-center min-h-[60vh]">
//         <div className="text-center">
//           <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
//           <p className="text-text-secondary font-medium">Loading customer records...</p>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="max-w-6xl mx-auto px-4 py-8">
//       {/* Header */}
//       <div className="mb-8">
//         <div className="flex items-center gap-3 mb-2">
//           <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-500 rounded-xl flex items-center justify-center text-2xl shadow-lg">📁</div>
//           <div>
//             <h1 className="text-2xl font-black text-primary-dark">All Records</h1>
//             <p className="text-sm text-text-secondary">Customer ledger — Debit & Credit history</p>
//           </div>
//         </div>
//       </div>

//       {/* Customer cards */}
//       <div className="space-y-4">
//         {CUSTOMERS.map(name => {
//           const data = records[name];
//           if (!data) return null;
//           const hasData = data.debitSales?.length > 0 || data.creditReceived?.length > 0;
//           const isExpanded = expandedCustomer === name;

//           return (
//             <div key={name} className="bg-white rounded-2xl shadow-md border border-border overflow-hidden hover:shadow-lg transition-shadow">
//               {/* Customer header */}
//               <button
//                 onClick={() => setExpandedCustomer(isExpanded ? null : name)}
//                 className="w-full flex items-center justify-between p-5 text-left hover:bg-bg transition-colors"
//               >
//                 <div className="flex items-center gap-3">
//                   <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary-light rounded-full flex items-center justify-center text-white font-bold text-sm shadow">
//                     {name.charAt(0)}
//                   </div>
//                   <div>
//                     <h3 className="font-bold text-primary-dark text-sm">{name}</h3>
//                     <div className="flex items-center gap-3 text-xs mt-0.5">
//                       <span className="text-danger font-semibold">Debit: ₹{(data.totalDebit || 0).toLocaleString('en-IN')}</span>
//                       <span className="text-primary font-semibold">Credit: ₹{(data.totalCredit || 0).toLocaleString('en-IN')}</span>
//                       <span className={`font-black ${data.balance > 0 ? 'text-danger' : 'text-primary'}`}>
//                         Bal: ₹{Math.abs(data.balance || 0).toLocaleString('en-IN')} {data.balance > 0 ? '(Due)' : data.balance < 0 ? '(Advance)' : '(Clear)'}
//                       </span>
//                     </div>
//                   </div>
//                 </div>
//                 <svg className={`w-5 h-5 text-text-secondary transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
//                 </svg>
//               </button>

//               {/* Expanded content */}
//               {isExpanded && (
//                 <div className="px-5 pb-5 border-t border-border pt-4">
//                   {!hasData ? (
//                     <p className="text-sm text-text-secondary text-center py-4">No transactions recorded for this customer</p>
//                   ) : (
//                     <div className="grid lg:grid-cols-2 gap-5">
//                       {/* Debit Sales */}
//                       <div>
//                         <h4 className="text-sm font-bold text-danger mb-3 flex items-center gap-2">
//                           <span className="w-1.5 h-4 bg-danger rounded-full"></span>
//                           Debit Sales
//                         </h4>
//                         {data.debitSales?.length > 0 ? (
//                           <div className="table-responsive">
//                             <table className="w-full text-xs">
//                               <thead>
//                                 <tr className="bg-red-50">
//                                   <th className="text-left py-2 px-2 font-semibold text-danger">Date</th>
//                                   <th className="text-left py-2 px-2 font-semibold text-danger">Bag</th>
//                                   <th className="text-center py-2 px-2 font-semibold text-danger">Bags</th>
//                                   <th className="text-right py-2 px-2 font-semibold text-danger">Price</th>
//                                   <th className="text-right py-2 px-2 font-semibold text-danger">Total</th>
//                                 </tr>
//                               </thead>
//                               <tbody>
//                                 {data.debitSales.map((sale, si) =>
//                                   sale.bags.map((bag, bi) => (
//                                     <tr key={`${si}-${bi}`} className="border-b border-border">
//                                       <td className="py-2 px-2">{bi === 0 ? new Date(sale.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : ''}</td>
//                                       <td className="py-2 px-2 font-medium">{bag.bagName}</td>
//                                       <td className="py-2 px-2 text-center">{bag.numberOfBags}</td>
//                                       <td className="py-2 px-2 text-right">₹{Number(bag.pricePerBag).toLocaleString('en-IN')}</td>
//                                       <td className="py-2 px-2 text-right font-semibold">₹{(Number(bag.numberOfBags) * Number(bag.pricePerBag)).toLocaleString('en-IN')}</td>
//                                     </tr>
//                                   ))
//                                 )}
//                               </tbody>
//                             </table>
//                           </div>
//                         ) : (
//                           <p className="text-xs text-text-secondary text-center py-3 bg-bg rounded-xl">No debit sales</p>
//                         )}
//                       </div>

//                       {/* Credit Received */}
//                       <div>
//                         <h4 className="text-sm font-bold text-primary mb-3 flex items-center gap-2">
//                           <span className="w-1.5 h-4 bg-primary rounded-full"></span>
//                           Credit Received
//                         </h4>
//                         {data.creditReceived?.length > 0 ? (
//                           <div className="table-responsive">
//                             <table className="w-full text-xs">
//                               <thead>
//                                 <tr className="bg-green-50">
//                                   <th className="text-left py-2 px-2 font-semibold text-primary">Date</th>
//                                   <th className="text-right py-2 px-2 font-semibold text-primary">Amount</th>
//                                   <th className="text-left py-2 px-2 font-semibold text-primary">Note</th>
//                                 </tr>
//                               </thead>
//                               <tbody>
//                                 {data.creditReceived.map((cr, i) => (
//                                   <tr key={i} className="border-b border-border">
//                                     <td className="py-2 px-2">{new Date(cr.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</td>
//                                     <td className="py-2 px-2 text-right font-semibold text-primary">₹{cr.amount.toLocaleString('en-IN')}</td>
//                                     <td className="py-2 px-2 text-text-secondary">{cr.note || '-'}</td>
//                                   </tr>
//                                 ))}
//                               </tbody>
//                             </table>
//                           </div>
//                         ) : (
//                           <p className="text-xs text-text-secondary text-center py-3 bg-bg rounded-xl">No credits received</p>
//                         )}
//                       </div>
//                     </div>
//                   )}

//                   {/* Summary */}
//                   {hasData && (
//                     <div className="mt-4 grid grid-cols-3 gap-3">
//                       <div className="text-center p-3 bg-red-50 rounded-xl">
//                         <p className="text-xs text-text-secondary font-semibold">Total Debit</p>
//                         <p className="text-lg font-black text-danger">₹{(data.totalDebit || 0).toLocaleString('en-IN')}</p>
//                       </div>
//                       <div className="text-center p-3 bg-green-50 rounded-xl">
//                         <p className="text-xs text-text-secondary font-semibold">Total Credit</p>
//                         <p className="text-lg font-black text-primary">₹{(data.totalCredit || 0).toLocaleString('en-IN')}</p>
//                       </div>
//                       <div className={`text-center p-3 rounded-xl ${data.balance > 0 ? 'bg-red-50' : 'bg-green-50'}`}>
//                         <p className="text-xs text-text-secondary font-semibold">Balance</p>
//                         <p className={`text-lg font-black ${data.balance > 0 ? 'text-danger' : 'text-primary'}`}>
//                           ₹{Math.abs(data.balance || 0).toLocaleString('en-IN')}
//                         </p>
//                       </div>
//                     </div>
//                   )}
//                 </div>
//               )}
//             </div>
//           );
//         })}
//       </div>
//     </div>
//   );
// }



// import { useState, useEffect } from 'react';
// import { showToast } from '../components/Toast';

// export default function AllRecords() {
//   const [customers, setCustomers] = useState([]);
//   const [records, setRecords] = useState({});
//   const [loading, setLoading] = useState(true);
//   const [expandedCustomer, setExpandedCustomer] = useState(null);
//   const [loadingLedger, setLoadingLedger] = useState(null);

//   useEffect(() => {
//     fetchAllCustomers();
//   }, []);

//   // Step 1: Load all customers with their totals from new API
//   const fetchAllCustomers = async () => {
//     try {
//       const res = await fetch('/api/summary/all-customers');
//       if (!res.ok) throw new Error('Failed');
//       const data = await res.json();
//       setCustomers(data);
//     } catch {
//       showToast('Failed to load records', 'error');
//     } finally {
//       setLoading(false);
//     }
//   };

//   // Step 2: When a customer is expanded, load their full ledger
//   const fetchCustomerLedger = async (name) => {
//     if (records[name]) return; // already loaded
//     setLoadingLedger(name);
//     try {
//       const res = await fetch(`/api/summary/customer-records/${encodeURIComponent(name)}`);
//       if (!res.ok) throw new Error('Failed');
//       const data = await res.json();
//       setRecords(prev => ({ ...prev, [name]: data }));
//     } catch {
//       showToast(`Failed to load ledger for ${name}`, 'error');
//     } finally {
//       setLoadingLedger(null);
//     }
//   };

//   const handleExpand = (name) => {
//     if (expandedCustomer === name) {
//       setExpandedCustomer(null);
//     } else {
//       setExpandedCustomer(name);
//       fetchCustomerLedger(name);
//     }
//   };

//   if (loading) {
//     return (
//       <div className="flex items-center justify-center min-h-[60vh]">
//         <div className="text-center">
//           <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
//           <p className="text-text-secondary font-medium">Loading customer records...</p>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="max-w-6xl mx-auto px-4 py-8">
//       {/* Header */}
//       <div className="mb-8">
//         <div className="flex items-center gap-3 mb-2">
//           <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-500 rounded-xl flex items-center justify-center text-2xl shadow-lg">📁</div>
//           <div>
//             <h1 className="text-2xl font-black text-primary-dark">All Records</h1>
//             <p className="text-sm text-text-secondary">Customer ledger — Debit & Credit history</p>
//           </div>
//         </div>
//       </div>

//       {/* Empty state */}
//       {customers.length === 0 && (
//         <div className="text-center py-16 text-text-secondary">
//           <p className="text-4xl mb-3">📭</p>
//           <p className="font-semibold">No customer records found</p>
//           <p className="text-sm mt-1">Records will appear here once transactions are added</p>
//         </div>
//       )}

//       {/* Customer cards */}
//       <div className="space-y-4">
//         {customers.map(customer => {
//           const { name, total_debit, total_credit, balance } = customer;
//           const isExpanded = expandedCustomer === name;
//           const ledger = records[name];
//           const isLoadingThis = loadingLedger === name;

//           return (
//             <div key={name} className="bg-white rounded-2xl shadow-md border border-border overflow-hidden hover:shadow-lg transition-shadow">
//               {/* Customer header row */}
//               <button
//                 onClick={() => handleExpand(name)}
//                 className="w-full flex items-center justify-between p-5 text-left hover:bg-bg transition-colors"
//               >
//                 <div className="flex items-center gap-3">
//                   <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary-light rounded-full flex items-center justify-center text-white font-bold text-sm shadow">
//                     {name.charAt(0)}
//                   </div>
//                   <div>
//                     <h3 className="font-bold text-primary-dark text-sm">{name}</h3>
//                     <div className="flex items-center gap-3 text-xs mt-0.5">
//                       <span className="text-danger font-semibold">Debit: ₹{(total_debit || 0).toLocaleString('en-IN')}</span>
//                       <span className="text-primary font-semibold">Credit: ₹{(total_credit || 0).toLocaleString('en-IN')}</span>
//                       <span className={`font-black ${balance > 0 ? 'text-danger' : balance < 0 ? 'text-primary' : 'text-text-secondary'}`}>
//                         Bal: ₹{Math.abs(balance || 0).toLocaleString('en-IN')}{' '}
//                         {balance > 0 ? '(Due)' : balance < 0 ? '(Advance)' : '(Clear)'}
//                       </span>
//                     </div>
//                   </div>
//                 </div>
//                 <svg
//                   className={`w-5 h-5 text-text-secondary transition-transform ${isExpanded ? 'rotate-180' : ''}`}
//                   fill="none" stroke="currentColor" viewBox="0 0 24 24"
//                 >
//                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
//                 </svg>
//               </button>

//               {/* Expanded ledger */}
//               {isExpanded && (
//                 <div className="px-5 pb-5 border-t border-border pt-4">

//                   {/* Loading spinner for ledger */}
//                   {isLoadingThis && (
//                     <div className="flex justify-center py-6">
//                       <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
//                     </div>
//                   )}

//                   {/* Ledger table */}
//                   {!isLoadingThis && ledger && (
//                     <>
//                       {ledger.ledger.length === 0 ? (
//                         <p className="text-sm text-text-secondary text-center py-4">No transactions recorded for this customer</p>
//                       ) : (
//                         <div className="grid lg:grid-cols-2 gap-5">

//                           {/* Debit Entries */}
//                           <div>
//                             <h4 className="text-sm font-bold text-danger mb-3 flex items-center gap-2">
//                               <span className="w-1.5 h-4 bg-danger rounded-full"></span>
//                               Debit Sales
//                             </h4>
//                             {ledger.debitEntries?.length > 0 ? (
//                               <div className="overflow-x-auto">
//                                 <table className="w-full text-xs">
//                                   <thead>
//                                     <tr className="bg-red-50">
//                                       <th className="text-left py-2 px-2 font-semibold text-danger">Date</th>
//                                       <th className="text-right py-2 px-2 font-semibold text-danger">Amount</th>
//                                       <th className="text-left py-2 px-2 font-semibold text-danger">Note</th>
//                                       <th className="text-right py-2 px-2 font-semibold text-danger">Balance</th>
//                                     </tr>
//                                   </thead>
//                                   <tbody>
//                                     {ledger.debitEntries.map((entry, i) => (
//                                       <tr key={i} className="border-b border-border">
//                                         <td className="py-2 px-2">{entry.date}</td>
//                                         <td className="py-2 px-2 text-right font-semibold text-danger">₹{Number(entry.amount).toLocaleString('en-IN')}</td>
//                                         <td className="py-2 px-2 text-text-secondary">{entry.note || '-'}</td>
//                                         <td className="py-2 px-2 text-right font-bold">₹{Number(entry.running_balance).toLocaleString('en-IN')}</td>
//                                       </tr>
//                                     ))}
//                                   </tbody>
//                                 </table>
//                               </div>
//                             ) : (
//                               <p className="text-xs text-text-secondary text-center py-3 bg-bg rounded-xl">No debit sales</p>
//                             )}
//                           </div>

//                           {/* Credit Entries */}
//                           <div>
//                             <h4 className="text-sm font-bold text-primary mb-3 flex items-center gap-2">
//                               <span className="w-1.5 h-4 bg-primary rounded-full"></span>
//                               Credit Received
//                             </h4>
//                             {ledger.creditEntries?.length > 0 ? (
//                               <div className="overflow-x-auto">
//                                 <table className="w-full text-xs">
//                                   <thead>
//                                     <tr className="bg-green-50">
//                                       <th className="text-left py-2 px-2 font-semibold text-primary">Date</th>
//                                       <th className="text-right py-2 px-2 font-semibold text-primary">Amount</th>
//                                       <th className="text-left py-2 px-2 font-semibold text-primary">Note</th>
//                                       <th className="text-right py-2 px-2 font-semibold text-primary">Balance</th>
//                                     </tr>
//                                   </thead>
//                                   <tbody>
//                                     {ledger.creditEntries.map((entry, i) => (
//                                       <tr key={i} className="border-b border-border">
//                                         <td className="py-2 px-2">{entry.date}</td>
//                                         <td className="py-2 px-2 text-right font-semibold text-primary">₹{Number(entry.amount).toLocaleString('en-IN')}</td>
//                                         <td className="py-2 px-2 text-text-secondary">{entry.note || '-'}</td>
//                                         <td className="py-2 px-2 text-right font-bold">₹{Number(entry.running_balance).toLocaleString('en-IN')}</td>
//                                       </tr>
//                                     ))}
//                                   </tbody>
//                                 </table>
//                               </div>
//                             ) : (
//                               <p className="text-xs text-text-secondary text-center py-3 bg-bg rounded-xl">No credits received</p>
//                             )}
//                           </div>
//                         </div>
//                       )}

//                       {/* Summary totals */}
//                       {ledger.ledger.length > 0 && (
//                         <div className="mt-4 grid grid-cols-3 gap-3">
//                           <div className="text-center p-3 bg-red-50 rounded-xl">
//                             <p className="text-xs text-text-secondary font-semibold">Total Debit</p>
//                             <p className="text-lg font-black text-danger">₹{(ledger.totalDebit || 0).toLocaleString('en-IN')}</p>
//                           </div>
//                           <div className="text-center p-3 bg-green-50 rounded-xl">
//                             <p className="text-xs text-text-secondary font-semibold">Total Credit</p>
//                             <p className="text-lg font-black text-primary">₹{(ledger.totalCredit || 0).toLocaleString('en-IN')}</p>
//                           </div>
//                           <div className={`text-center p-3 rounded-xl ${ledger.balance > 0 ? 'bg-red-50' : 'bg-green-50'}`}>
//                             <p className="text-xs text-text-secondary font-semibold">Balance</p>
//                             <p className={`text-lg font-black ${ledger.balance > 0 ? 'text-danger' : 'text-primary'}`}>
//                               ₹{Math.abs(ledger.balance || 0).toLocaleString('en-IN')}
//                             </p>
//                             <p className="text-xs font-semibold mt-0.5">
//                               {ledger.balance > 0 ? '(Due)' : ledger.balance < 0 ? '(Advance)' : '(Clear)'}
//                             </p>
//                           </div>
//                         </div>
//                       )}
//                     </>
//                   )}
//                 </div>
//               )}
//             </div>
//           );
//         })}
//       </div>
//     </div>
//   );
// }




import { useState, useEffect } from 'react';
import { showToast } from '../components/Toast';

const fmtDate = d => {
  try { return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return d || ''; }
};

export default function AllRecords() {
  const [customers, setCustomers]           = useState([]);
  const [records, setRecords]               = useState({});
  const [loading, setLoading]               = useState(true);
  const [expandedCustomer, setExpandedCustomer] = useState(null);
  const [loadingLedger, setLoadingLedger]   = useState(null);

  useEffect(() => { fetchAllCustomers(); }, []);

  const fetchAllCustomers = async () => {
    try {
      const res = await fetch('/api/summary/all-customers');
      if (!res.ok) throw new Error('Failed');
      setCustomers(await res.json());
    } catch {
      showToast('Failed to load records', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Fetch full ledger + actual debit/credit entries with bag details
  const fetchCustomerLedger = async (name) => {
    if (records[name]) return;
    setLoadingLedger(name);
    try {
      // Fetch ledger summary
      const ledgerRes = await fetch(`/api/summary/customer-records/${encodeURIComponent(name)}`);
      if (!ledgerRes.ok) throw new Error('Failed');
      const ledgerData = await ledgerRes.json();

      // Fetch actual debit entries with bag details
      const debitRes  = await fetch(`/api/debit-sale`);
      const creditRes = await fetch(`/api/credit`);

      const allDebit  = debitRes.ok  ? await debitRes.json()  : [];
      const allCredit = creditRes.ok ? await creditRes.json() : [];

      // Filter only this customer's entries
      const debitEntries  = allDebit.filter(e  => e.customer_name === name);
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
      <div className="mb-8 flex items-center gap-3">
        <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-500 rounded-xl flex items-center justify-center text-2xl shadow-lg">📁</div>
        <div>
          <h1 className="text-2xl font-black text-primary-dark">All Records</h1>
          <p className="text-sm text-text-secondary">Customer ledger — Debit & Credit history</p>
        </div>
      </div>

      {/* Empty state */}
      {customers.length === 0 && (
        <div className="text-center py-16 text-text-secondary">
          <p className="text-4xl mb-3">📭</p>
          <p className="font-semibold">No customer records found</p>
          <p className="text-sm mt-1">Records will appear here once transactions are added</p>
        </div>
      )}

      {/* Customer cards */}
      <div className="space-y-4">
        {customers.map(customer => {
          const { name, total_debit, total_credit, balance } = customer;
          const isExpanded    = expandedCustomer === name;
          const data          = records[name];
          const isLoadingThis = loadingLedger === name;

          const debitEntries  = data?.debitEntries  || [];
          const creditEntries = data?.creditEntries || [];

          return (
            <div key={name} className="bg-white rounded-2xl shadow-md border border-border overflow-hidden hover:shadow-lg transition-shadow">

              {/* Customer header row */}
              <button onClick={() => handleExpand(name)}
                className="w-full flex items-center justify-between p-5 text-left hover:bg-bg transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary-light rounded-full flex items-center justify-center text-white font-black text-sm shadow">
                    {name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-primary-dark text-sm">{name}</h3>
                    <div className="flex flex-wrap items-center gap-3 text-xs mt-0.5">
                      <span className="text-danger font-semibold">📤 Debit: ₹{(total_debit || 0).toLocaleString('en-IN')}</span>
                      <span className="text-primary font-semibold">📥 Credit: ₹{(total_credit || 0).toLocaleString('en-IN')}</span>
                      <span className={`font-black px-2 py-0.5 rounded-full text-white text-xs ${
                        balance > 0 ? 'bg-danger' : balance < 0 ? 'bg-primary' : 'bg-gray-400'
                      }`}>
                        ₹{Math.abs(balance || 0).toLocaleString('en-IN')} {balance > 0 ? 'Due' : balance < 0 ? 'Advance' : 'Clear'}
                      </span>
                    </div>
                  </div>
                </div>
                <svg className={`w-5 h-5 text-text-secondary transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Expanded section */}
              {isExpanded && (
                <div className="border-t border-border">

                  {/* Loading spinner */}
                  {isLoadingThis && (
                    <div className="flex justify-center py-8">
                      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  )}

                  {!isLoadingThis && data && (
                    <div className="p-5">

                      {/* ── DEBIT SALES ─────────────────────────── */}
                      <div className="mb-6">
                        <h4 className="text-sm font-black text-danger mb-3 flex items-center gap-2">
                          <span className="w-2 h-5 bg-danger rounded-full"></span>
                          Debit Sales
                          <span className="ml-auto text-xs bg-red-100 text-danger px-2 py-0.5 rounded-full font-bold">
                            {debitEntries.length} entries
                          </span>
                        </h4>

                        {debitEntries.length === 0 ? (
                          <p className="text-xs text-text-secondary text-center py-4 bg-bg rounded-xl">No debit sales</p>
                        ) : (
                          <div className="space-y-3">
                            {debitEntries.map((entry, i) => {
                              const bags = Array.isArray(entry.bags) ? entry.bags : [];
                              return (
                                <div key={entry.id || i} className="border border-red-100 rounded-xl overflow-hidden">
                                  {/* Entry header */}
                                  <div className="bg-red-50 px-4 py-2 flex justify-between items-center">
                                    <span className="text-xs font-bold text-danger">📅 {fmtDate(entry.date)}</span>
                                    <span className="text-xs font-black text-danger bg-red-100 px-2 py-0.5 rounded-full">
                                      Total: ₹{Number(entry.amount).toLocaleString('en-IN')}
                                    </span>
                                  </div>
                                  {/* Bag details */}
                                  {bags.length > 0 ? (
                                    <div className="px-4 py-2">
                                      <table className="w-full text-xs">
                                        <thead>
                                          <tr className="text-text-secondary border-b border-red-50">
                                            <th className="text-left py-1.5 font-semibold">Bag Name</th>
                                            <th className="text-center py-1.5 font-semibold">Qty (Bags)</th>
                                            <th className="text-right py-1.5 font-semibold">Rate/Bag</th>
                                            <th className="text-right py-1.5 font-semibold">Subtotal</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {bags.map((bag, bi) => {
                                            const qty   = Number(bag.numberOfBags) || 0;
                                            const rate  = Number(bag.pricePerBag)  || 0;
                                            const sub   = qty * rate;
                                            return (
                                              <tr key={bi} className="border-b border-red-50 last:border-0">
                                                <td className="py-1.5 font-semibold text-primary-dark">{bag.bagName || '-'}</td>
                                                <td className="py-1.5 text-center font-medium">{qty}</td>
                                                <td className="py-1.5 text-right text-text-secondary">₹{rate.toLocaleString('en-IN')}</td>
                                                <td className="py-1.5 text-right font-bold text-danger">₹{sub.toLocaleString('en-IN')}</td>
                                              </tr>
                                            );
                                          })}
                                        </tbody>
                                        <tfoot>
                                          <tr className="border-t-2 border-red-200">
                                            <td colSpan="3" className="py-1.5 font-black text-danger text-xs">Grand Total</td>
                                            <td className="py-1.5 text-right font-black text-danger">₹{Number(entry.amount).toLocaleString('en-IN')}</td>
                                          </tr>
                                        </tfoot>
                                      </table>
                                    </div>
                                  ) : (
                                    <div className="px-4 py-2">
                                      <p className="text-xs text-text-secondary">Amount: ₹{Number(entry.amount).toLocaleString('en-IN')}</p>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                            {/* Debit total */}
                            <div className="flex justify-between items-center bg-red-600 text-white px-4 py-2.5 rounded-xl">
                              <span className="text-xs font-bold">Total Debit ({debitEntries.length} entries)</span>
                              <span className="font-black">₹{(total_debit || 0).toLocaleString('en-IN')}</span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* ── CREDIT RECEIVED ──────────────────────── */}
                      <div className="mb-5">
                        <h4 className="text-sm font-black text-primary mb-3 flex items-center gap-2">
                          <span className="w-2 h-5 bg-primary rounded-full"></span>
                          Credit Received
                          <span className="ml-auto text-xs bg-green-100 text-primary px-2 py-0.5 rounded-full font-bold">
                            {creditEntries.length} entries
                          </span>
                        </h4>

                        {creditEntries.length === 0 ? (
                          <p className="text-xs text-text-secondary text-center py-4 bg-bg rounded-xl">No credits received</p>
                        ) : (
                          <div className="space-y-2">
                            {creditEntries.map((entry, i) => (
                              <div key={entry.id || i}
                                className="flex justify-between items-center bg-green-50 border border-green-100 rounded-xl px-4 py-3">
                                <div>
                                  <p className="text-xs font-bold text-primary-dark">📅 {fmtDate(entry.date)}</p>
                                  {entry.note && (
                                    <p className="text-xs text-text-secondary mt-0.5">📝 {entry.note}</p>
                                  )}
                                </div>
                                <p className="font-black text-primary text-sm">₹{Number(entry.amount).toLocaleString('en-IN')}</p>
                              </div>
                            ))}
                            {/* Credit total */}
                            <div className="flex justify-between items-center bg-primary text-white px-4 py-2.5 rounded-xl">
                              <span className="text-xs font-bold">Total Credit ({creditEntries.length} entries)</span>
                              <span className="font-black">₹{(total_credit || 0).toLocaleString('en-IN')}</span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* ── BALANCE SUMMARY ──────────────────────── */}
                      <div className="grid grid-cols-3 gap-3 mt-4">
                        <div className="text-center p-3 bg-red-50 rounded-xl">
                          <p className="text-xs text-text-secondary font-semibold uppercase mb-1">Total Debit</p>
                          <p className="text-base font-black text-danger">₹{(total_debit || 0).toLocaleString('en-IN')}</p>
                        </div>
                        <div className="text-center p-3 bg-green-50 rounded-xl">
                          <p className="text-xs text-text-secondary font-semibold uppercase mb-1">Total Credit</p>
                          <p className="text-base font-black text-primary">₹{(total_credit || 0).toLocaleString('en-IN')}</p>
                        </div>
                        <div className={`text-center p-3 rounded-xl ${balance > 0 ? 'bg-red-100' : balance < 0 ? 'bg-green-100' : 'bg-gray-100'}`}>
                          <p className="text-xs text-text-secondary font-semibold uppercase mb-1">Balance</p>
                          <p className={`text-base font-black ${balance > 0 ? 'text-danger' : balance < 0 ? 'text-primary' : 'text-text-secondary'}`}>
                            ₹{Math.abs(balance || 0).toLocaleString('en-IN')}
                          </p>
                          <p className="text-xs font-bold mt-0.5">
                            {balance > 0 ? '🔴 Due' : balance < 0 ? '🟢 Advance' : '✅ Clear'}
                          </p>
                        </div>
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