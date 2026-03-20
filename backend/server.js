const express = require('express');
const cors    = require('cors');
const path    = require('path');

const app  = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// ── Auto daily backup at 11 PM ────────────────────────────────
require('./auto_backup');

// ── Routes ────────────────────────────────────────────────────
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

// ── Health check ──────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', routes: [
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

// ── Serve frontend ────────────────────────────────────────────
const frontendPath = path.join(__dirname, '../frontend/dist');
app.use(express.static(frontendPath));
app.get('*', (req, res) => res.sendFile(path.join(frontendPath, 'index.html')));

app.listen(PORT, '0.0.0.0', () => {
  console.log('\n🐄 CJN PVT LTD SERVER');
  console.log('➜  http://localhost:' + PORT);
  console.log('➜  Health: http://localhost:' + PORT + '/api/health\n');
});