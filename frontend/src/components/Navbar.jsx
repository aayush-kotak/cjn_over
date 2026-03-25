import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

const navItems = [
  { path: '/cash-sale',     label: 'Cash Sale',       icon: '💰' },
  { path: '/credit-received', label: 'Credit Received', icon: '📥' },
  { path: '/debit-sale',    label: 'Debit Sale',      icon: '📤' },
  { path: '/today-summary', label: 'Today Summary',   icon: '📊' },
  { path: '/all-records',   label: 'All Records',     icon: '📁' },
];

export default function Navbar({ user, onLogout }) {
  const location    = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleLogoutClick = () => setShowLogoutConfirm(true);
  const handleLogoutConfirm = () => { setShowLogoutConfirm(false); onLogout(); };
  const handleLogoutCancel  = () => setShowLogoutConfirm(false);

  return (
    <>
      {/* ── Logout Confirmation Modal ───────────────────────── */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm border border-border">
            <div className="text-center mb-5">
              <div className="text-4xl mb-2">🚪</div>
              <h2 className="text-lg font-black text-primary-dark">Logout?</h2>
              <p className="text-sm text-text-secondary mt-1">
                You will need to login again to access the app.
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={handleLogoutCancel}
                className="flex-1 py-2.5 border-2 border-border text-text-secondary font-bold rounded-xl hover:bg-bg transition-colors">
                Cancel
              </button>
              <button onClick={handleLogoutConfirm}
                className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition-colors">
                Yes, Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Navbar ──────────────────────────────────────────── */}
      <nav className="bg-gradient-to-r from-primary-dark via-primary to-primary-light shadow-xl sticky top-0 z-40">
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
                <Link key={item.path} to={item.path}
                  className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center gap-1.5
                    ${location.pathname === item.path
                      ? 'bg-white/20 text-gold shadow-inner'
                      : 'text-white/90 hover:bg-white/10 hover:text-white'
                    }`}>
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>

            {/* Right side — User info + Logout */}
            <div className="flex items-center gap-2">

              {/* User badge — desktop */}
              {user && (
                <div className="hidden sm:flex items-center gap-2 bg-white/15 px-3 py-1.5 rounded-xl border border-white/20">
                  <div className="w-6 h-6 bg-gold rounded-full flex items-center justify-center text-primary-dark font-black text-xs">
                    {user.name?.charAt(0) || 'U'}
                  </div>
                  <span className="text-white text-xs font-bold">{user.name}</span>
                </div>
              )}

              {/* Logout button */}
              {onLogout && (
                <button onClick={handleLogoutClick}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-red-500/80 hover:bg-red-500 text-white text-xs font-bold rounded-xl transition-all border border-red-400/30">
                  <span>🚪</span>
                  <span>Logout</span>
                </button>
              )}

              {/* Mobile toggle */}
              <button onClick={() => setMobileOpen(!mobileOpen)}
                className="lg:hidden text-white p-2 rounded-lg hover:bg-white/10 transition-colors"
                aria-label="Toggle menu">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {mobileOpen
                    ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  }
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile dropdown */}
        {mobileOpen && (
          <div className="lg:hidden bg-primary-dark/98 backdrop-blur-lg shadow-2xl border-t border-white/10">
            <div className="p-3 flex flex-col gap-1">

              {/* User info — mobile */}
              {user && (
                <div className="flex items-center gap-2 px-4 py-2.5 bg-white/10 rounded-xl mb-1">
                  <div className="w-8 h-8 bg-gold rounded-full flex items-center justify-center text-primary-dark font-black text-sm">
                    {user.name?.charAt(0) || 'U'}
                  </div>
                  <div>
                    <p className="text-white text-sm font-bold">{user.name}</p>
                    <p className="text-green-200 text-xs">{user.username}</p>
                  </div>
                </div>
              )}

              {/* Nav links */}
              {navItems.map(item => (
                <Link key={item.path} to={item.path}
                  onClick={() => setMobileOpen(false)}
                  className={`px-4 py-3 rounded-xl text-sm font-semibold transition-all flex items-center gap-2
                    ${location.pathname === item.path
                      ? 'bg-gold/20 text-gold'
                      : 'text-white/80 hover:bg-white/10 hover:text-white'
                    }`}>
                  <span className="text-lg">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              ))}

              {/* Logout — mobile */}
              {onLogout && (
                <button onClick={() => { setMobileOpen(false); handleLogoutClick(); }}
                  className="mt-1 flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-bold text-red-300 hover:bg-red-500/20 transition-all">
                  <span className="text-lg">🚪</span>
                  <span>Logout</span>
                </button>
              )}
            </div>
          </div>
        )}
      </nav>
    </>
  );
}