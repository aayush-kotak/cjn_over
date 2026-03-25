require('dotenv').config(); // ← loads .env file — MUST be first line

const express = require('express');
const cors    = require('cors');
const path    = require('path');

const app  = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// ── Auto daily backup at 11 PM ────────────────────────────────
try { require('./auto_backup'); } catch(e) { console.log('Backup:', e.message); }

// ── Auth — login/logout (NO protection needed here) ──────────
const { router: authRouter, authMiddleware } = require('./routes/auth');
app.use('/api/auth', authRouter);

// ── Health check (no auth needed) ────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', auth: 'enabled 🔒', routes: [
    'POST     /api/auth/login',
    'POST     /api/auth/logout',
    'GET      /api/auth/verify',
    'GET/POST /api/customers',
    'GET/POST /api/cash-sale',
    'GET/POST /api/credit',
    'GET/POST /api/debit-sale',
    'GET/POST /api/expenses',
    'GET      /api/summary/today-summary',
    'GET      /api/summary/day-history',
    'GET      /api/summary/all-customers',
    'GET      /api/summary/customer-records/:name',
    'GET      /api/summary/range'
  ]});
});

// ── Protect ALL /api routes below this line ───────────────────
app.use('/api', authMiddleware);

// ── Routes (all protected by auth) ───────────────────────────
const cashSaleRoutes  = require('./routes/cashSale');
const creditRoutes    = require('./routes/credit');
const debitSaleRoutes = require('./routes/debitSale');
const expensesRoutes  = require('./routes/expenses');
const summaryRoutes   = require('./routes/summary');
const customersRoutes = require('./routes/customers');

app.use('/api/cash-sale',  cashSaleRoutes);
app.use('/api/credit',     creditRoutes);
app.use('/api/debit-sale', debitSaleRoutes);
app.use('/api/expenses',   expensesRoutes);
app.use('/api/summary',    summaryRoutes);
app.use('/api/customers',  customersRoutes);

// ── Serve frontend ────────────────────────────────────────────
const frontendPath = path.join(__dirname, '../frontend/dist');

app.use(express.static(frontendPath));
app.get('*', (req, res) => res.sendFile(path.join(frontendPath, 'index.html')));

app.listen(PORT, '0.0.0.0', () => {
  console.log('\n🐄 CJN PVT LTD SERVER');
  console.log('➜  http://localhost:' + PORT);
  console.log('➜  Health: http://localhost:' + PORT + '/api/health');
  console.log('➜  Auth: ENABLED 🔒\n');
});