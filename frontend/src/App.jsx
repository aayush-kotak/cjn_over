// import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
// import Navbar from './components/Navbar';
// import Toast from './components/Toast';
// import Home from './pages/Home';
// import CashSale from './pages/CashSale';
// import CreditReceived from './pages/CreditReceived';
// import DebitSale from './pages/DebitSale';
// import TodaySummary from './pages/TodaySummary';
// import AllRecords from './pages/AllRecords';

// function App() {
//   return (
//     <Router>
//       <div className="min-h-screen bg-bg">
//         <Navbar />
//         <Toast />
//         <main>
//           <Routes>
//             <Route path="/" element={<Home />} />
//             <Route path="/cash-sale" element={<CashSale />} />
//             <Route path="/credit-received" element={<CreditReceived />} />
//             <Route path="/debit-sale" element={<DebitSale />} />
//             <Route path="/today-summary" element={<TodaySummary />} />
//             <Route path="/all-records" element={<AllRecords />} />
//           </Routes>
//         </main>
//       </div>
//     </Router>
//   );
// }

// export default App;




import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar        from './components/Navbar';
import Toast         from './components/Toast';
import Login         from './pages/Login';
import Home          from './pages/Home';
import CashSale      from './pages/CashSale';
import CreditReceived from './pages/CreditReceived';
import DebitSale     from './pages/DebitSale';
import TodaySummary  from './pages/TodaySummary';
import AllRecords    from './pages/AllRecords';
import StockManagement from './pages/StockManagement';

function App() {
  const [user, setUser]         = useState(null);
  const [checking, setChecking] = useState(true);

  // ── Check existing session on page load ───────────────────
  useEffect(() => {
    let token = null;
    try {
      token = localStorage.getItem('cjn_token');
    } catch (e) {
      token = null;
    }

    if (!token) { setChecking(false); return; }

    // Abort the request if the backend is unreachable, so the UI
    // doesn't stay stuck on the loading screen.
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    fetch('/api/auth/verify', {
      headers: { 'Authorization': `Bearer ${token}` },
      signal: controller.signal
    })
      .then(async (res) => {
        // Backend should return JSON; but if it doesn't (proxy error),
        // ensure we still fall back to Login.
        try {
          return await res.json();
        } catch {
          throw new Error(`Verify failed with status ${res.status}`);
        }
      })
      .then((data) => {
        if (data?.valid) {
          setUser({
            name:     data.name,
            username: data.username,
            role:     data.role,
            token
          });
        } else {
          try { localStorage.clear(); } catch (e) {}
        }
      })
      .catch(() => {
        try { localStorage.clear(); } catch (e) {}
      })
      .finally(() => {
        clearTimeout(timeoutId);
        setChecking(false);
      });

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, []);

  // ── Login handler ─────────────────────────────────────────
  const handleLogin = (data) => {
    setUser(data);
  };

  // ── Logout handler ────────────────────────────────────────
  const handleLogout = async () => {
    const token = localStorage.getItem('cjn_token');
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
    } catch(e) {}
    localStorage.clear();
    setUser(null);
  };

  // ── Loading screen ────────────────────────────────────────
  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <div className="text-center">
          <div className="text-5xl mb-4">🐄</div>
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-text-secondary font-medium">Loading CJN Shop...</p>
        </div>
      </div>
    );
  }

  // ── Show login if not authenticated ───────────────────────
  if (!user) {
    return (
      <>
        <Toast />
        <Login onLogin={handleLogin} />
      </>
    );
  }

  // ── Main app (authenticated) ──────────────────────────────
  return (
    <Router>
      <div className="min-h-screen bg-bg">
        <Navbar user={user} onLogout={handleLogout} />
        <Toast />
        <main>
          <Routes>
            <Route path="/"                element={<Home user={user} />} />
            <Route path="/cash-sale"       element={<CashSale />} />
            <Route path="/credit-received" element={<CreditReceived />} />
            <Route path="/debit-sale"      element={<DebitSale />} />
            <Route path="/today-summary"   element={<TodaySummary />} />
            <Route path="/all-records"     element={<AllRecords />} />
            {user?.role === 'admin' && (
              <Route path="/stock-management" element={<StockManagement />} />
            )}
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;