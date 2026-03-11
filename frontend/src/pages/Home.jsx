import { Link } from 'react-router-dom';

export default function Home() {
  const features = [
    { path: '/cash-sale', icon: '💰', title: 'Cash Sale', desc: 'Record cash sales of cattle feed bags', gradient: 'from-emerald-600 to-green-500' },
    { path: '/credit-received', icon: '📥', title: 'Credit Received', desc: 'Track credit payments from customers', gradient: 'from-amber-600 to-yellow-500' },
    { path: '/debit-sale', icon: '📤', title: 'Debit Sale', desc: 'Log debit sales against customer accounts', gradient: 'from-teal-600 to-cyan-500' },
    { path: '/today-summary', icon: '📊', title: "Today's Summary", desc: 'View complete daily dashboard & analytics', gradient: 'from-indigo-600 to-blue-500' },
    { path: '/all-records', icon: '📁', title: 'All Records', desc: 'Customer ledger with full debit/credit history', gradient: 'from-purple-600 to-pink-500' },
  ];

  return (
    <div className="min-h-[calc(100vh-4rem)]">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-dark via-primary to-primary-light text-white">
        {/* Decorative circles */}
        <div className="absolute top-[-50px] right-[-50px] w-48 h-48 bg-gold/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-[-30px] left-[-30px] w-36 h-36 bg-green-300/20 rounded-full blur-2xl"></div>
        
        <div className="max-w-7xl mx-auto px-4 py-12 md:py-20">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-medium mb-6">
                <span>🐄</span>
                <span className="text-gold">Tiwana Brand</span>
                <span>Cattle Feed</span>
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-black leading-tight mb-4">
                CJN <span className="text-gold">PVT LTD</span>
              </h1>
              <p className="text-lg md:text-xl text-green-100 mb-8 leading-relaxed">
                Your complete cattle feed shop management system. 
                Track sales, manage credits, and monitor daily operations with ease.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link
                  to="/cash-sale"
                  className="px-6 py-3 bg-gold text-primary-dark font-bold rounded-xl hover:bg-gold-dark hover:shadow-lg transition-all hover:scale-105"
                >
                  💰 New Cash Sale
                </Link>
                <Link
                  to="/today-summary"
                  className="px-6 py-3 bg-white/15 backdrop-blur-sm text-white font-semibold rounded-xl border border-white/20 hover:bg-white/25 transition-all hover:scale-105"
                >
                  📊 Today's Summary
                </Link>
              </div>
            </div>

            {/* Hero Image / Visual */}
            <div className="hidden md:flex justify-center">
              <div className="relative">
                <div className="w-72 h-72 lg:w-80 lg:h-80 bg-gradient-to-br from-gold/30 to-white/10 rounded-3xl backdrop-blur-sm border border-white/20 flex flex-col items-center justify-center p-8 rotate-2 hover:rotate-0 transition-transform duration-500">
                  <div className="text-7xl mb-4">🐄</div>
                  <h3 className="text-2xl font-black text-gold">TIWANA</h3>
                  <p className="text-sm font-bold tracking-widest uppercase text-green-100">Premium Cattle Feed</p>
                  <div className="mt-4 flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-full">
                    <span className="w-2 h-2 bg-gold rounded-full animate-pulse"></span>
                    <span className="text-xs font-semibold">Quality Assured</span>
                  </div>
                </div>
                <div className="absolute -bottom-4 -left-4 w-24 h-24 bg-gold/20 rounded-2xl backdrop-blur-sm border border-gold/30 flex items-center justify-center text-3xl -rotate-6">
                  🌾
                </div>
                <div className="absolute -top-4 -right-4 w-20 h-20 bg-white/10 rounded-2xl backdrop-blur-sm border border-white/20 flex items-center justify-center text-2xl rotate-12">
                  🏷️
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="bg-white shadow-sm border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Manage Sales', icon: '📦', value: 'Cash & Debit' },
              { label: 'Track Credits', icon: '💳', value: 'Real-time' },
              { label: 'Daily Reports', icon: '📈', value: 'Automated' },
              { label: 'Customer Ledger', icon: '👥', value: '23 Customers' },
            ].map((stat, i) => (
              <div key={i} className="text-center p-3 rounded-xl bg-bg">
                <div className="text-2xl mb-1">{stat.icon}</div>
                <div className="text-sm font-bold text-primary-dark">{stat.value}</div>
                <div className="text-xs text-text-secondary">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature Cards */}
      <section className="max-w-7xl mx-auto px-4 py-12">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-black text-primary-dark mb-2">Quick Actions</h2>
          <p className="text-text-secondary">Select an operation to get started</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f, i) => (
            <Link
              key={f.path}
              to={f.path}
              className="group relative bg-white rounded-2xl shadow-md hover:shadow-2xl border border-border hover:border-primary/30 transition-all duration-300 overflow-hidden hover:-translate-y-1"
            >
              <div className={`h-2 bg-gradient-to-r ${f.gradient}`}></div>
              <div className="p-6">
                <div className="text-4xl mb-3 group-hover:scale-110 transition-transform duration-300">{f.icon}</div>
                <h3 className="text-lg font-bold text-primary-dark mb-1">{f.title}</h3>
                <p className="text-sm text-text-secondary leading-relaxed">{f.desc}</p>
                <div className="mt-4 text-primary font-semibold text-sm flex items-center gap-1 group-hover:gap-2 transition-all">
                  Open <span className="transition-transform group-hover:translate-x-1">→</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-primary-dark text-white/70 py-6">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-sm font-medium">
            © {new Date().getFullYear()} <span className="text-gold font-bold">CJN PVT LTD</span> — Tiwana Brand Cattle Feed
          </p>
          <p className="text-xs mt-1 text-white/40">All rights reserved</p>
        </div>
      </footer>
    </div>
  );
}
