import { useState } from 'react';
import { showToast } from '../components/Toast';

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      showToast('Enter username and password', 'error'); return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password: password.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');

      // Save token to localStorage
      localStorage.setItem('cjn_token',    data.token);
      localStorage.setItem('cjn_name',     data.name);
      localStorage.setItem('cjn_username', data.username);
      localStorage.setItem('cjn_role',     data.role);

      showToast(`Welcome, ${data.name}! 🐄`);
      onLogin(data);
    } catch (err) {
      showToast(err.message || 'Invalid credentials', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-dark via-primary to-primary-light flex items-center justify-center px-4">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center text-4xl shadow-2xl mx-auto mb-4">
            🐄
          </div>
          <h1 className="text-3xl font-black text-white">CJN PVT LTD</h1>
          <p className="text-green-200 text-sm mt-1">Cattle Feed Shop — Management System</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-black text-primary-dark mb-6 text-center">
            🔒 Login to Continue
          </h2>

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Username */}
            <div>
              <label className="block text-sm font-bold text-primary-dark mb-1.5">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Enter username"
                autoFocus
                className="w-full px-4 py-3 rounded-xl border-2 border-border bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm font-medium"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-bold text-primary-dark mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full px-4 py-3 rounded-xl border-2 border-border bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm font-medium pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-primary transition-colors text-lg"
                >
                  {showPass ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-gradient-to-r from-primary-dark to-primary text-white font-black text-lg rounded-xl hover:shadow-xl hover:scale-[1.01] transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 mt-2"
            >
              {loading
                ? <span className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Logging in...
                  </span>
                : '🔓 Login'}
            </button>
          </form>

          {/* Footer */}
          <p className="text-center text-xs text-text-secondary mt-6">
            Session expires after 8 hours automatically
          </p>
        </div>

        <p className="text-center text-green-200/60 text-xs mt-4">
          CJN PVT LTD © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}