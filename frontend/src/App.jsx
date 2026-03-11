import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Toast from './components/Toast';
import Home from './pages/Home';
import CashSale from './pages/CashSale';
import CreditReceived from './pages/CreditReceived';
import DebitSale from './pages/DebitSale';
import TodaySummary from './pages/TodaySummary';
import AllRecords from './pages/AllRecords';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-bg">
        <Navbar />
        <Toast />
        <main>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/cash-sale" element={<CashSale />} />
            <Route path="/credit-received" element={<CreditReceived />} />
            <Route path="/debit-sale" element={<DebitSale />} />
            <Route path="/today-summary" element={<TodaySummary />} />
            <Route path="/all-records" element={<AllRecords />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
