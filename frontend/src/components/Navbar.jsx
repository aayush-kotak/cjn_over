import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

const navItems = [
  { path: '/cash-sale', label: 'Cash Sale', icon: '💰' },
  { path: '/credit-received', label: 'Credit Received', icon: '📥' },
  { path: '/debit-sale', label: 'Debit Sale', icon: '📤' },
  { path: '/today-summary', label: 'Today Summary', icon: '📊' },
  { path: '/all-records', label: 'All Records', icon: '📁' },
];

export default function Navbar() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="bg-gradient-to-r from-primary-dark via-primary to-primary-light shadow-xl sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group" onClick={() => setMobileOpen(false)}>
            <div className="w-10 h-10 bg-gold rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
              <span className="text-primary-dark text-lg font-black">🐄</span>
            </div>
            <div className="hidden sm:block">
              <h1 className="text-white font-extrabold text-lg tracking-tight leading-none">CJN PVT LTD</h1>
              <p className="text-green-200 text-[10px] font-medium tracking-widest uppercase">Cattle Feed Shop</p>
            </div>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden lg:flex items-center gap-1">
            {navItems.map(item => (
              <Link
                key={item.path}
                to={item.path}
                className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center gap-1.5
                  ${location.pathname === item.path
                    ? 'bg-white/20 text-gold shadow-inner'
                    : 'text-white/90 hover:bg-white/10 hover:text-white'
                  }`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
          </div>

          {/* Mobile toggle */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="lg:hidden text-white p-2 rounded-lg hover:bg-white/10 transition-colors"
            aria-label="Toggle menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {mobileOpen && (
        <div className="lg:hidden bg-primary-dark/98 backdrop-blur-lg shadow-2xl border-t border-white/10">
          <div className="p-3 flex flex-col gap-1">
            {navItems.map(item => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                className={`px-4 py-3 rounded-xl text-sm font-semibold transition-all flex items-center gap-2
                  ${location.pathname === item.path
                    ? 'bg-gold/20 text-gold'
                    : 'text-white/80 hover:bg-white/10 hover:text-white'
                  }`}
              >
                <span className="text-lg">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}
