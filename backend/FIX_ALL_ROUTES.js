/**
 * PLACE THIS IN: backend/ folder
 * RUN: node FIX_ALL_ROUTES.js
 * This overwrites ALL route files with correct versions
 */

const fs = require('fs');
const path = require('path');

// ── cashSale.js ───────────────────────────────────────────────
fs.writeFileSync(path.join(__dirname, 'routes', 'cashSale.js'), `
const express = require('express');
const router = express.Router();
const { insertCashEntry, getCashEntries } = require('../db/database');

router.post('/', (req, res) => {
  try {
    const { date, customer_name, bags, grandTotal, amount, note } = req.body;
    const finalAmount   = Number(grandTotal) || Number(amount) || 0;
    const finalCustomer = (customer_name || 'CASH CUSTOMER').trim();
    const finalDate     = date || new Date().toISOString().slice(0, 10);
    if (finalAmount <= 0) return res.status(400).json({ error: 'Amount must be > 0' });
    insertCashEntry(finalDate, finalCustomer, finalAmount, bags || [], note || '');
    res.status(201).json({ success: true, message: 'Cash sale saved' });
  } catch (err) {
    console.error('CashSale Error:', err.message);
    res.status(500).json({ error: 'Failed: ' + err.message });
  }
});

router.get('/', (req, res) => {
  try {
    res.json(getCashEntries(req.query.date || null));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch' });
  }
});

module.exports = router;
`.trim());
console.log('✅ routes/cashSale.js fixed');

// ── debitSale.js ──────────────────────────────────────────────
fs.writeFileSync(path.join(__dirname, 'routes', 'debitSale.js'), `
const express = require('express');
const router = express.Router();
const { insertDebitEntry, getDebitEntries } = require('../db/database');

router.post('/', (req, res) => {
  try {
    const { date, customer_name, customerName, bags, grandTotal, amount, note } = req.body;
    const finalCustomer = (customer_name || customerName || '').trim();
    const finalAmount   = Number(grandTotal) || Number(amount) || 0;
    const finalDate     = date || new Date().toISOString().slice(0, 10);
    if (!finalCustomer) return res.status(400).json({ error: 'Customer name required' });
    if (finalAmount <= 0) return res.status(400).json({ error: 'Amount must be > 0' });
    insertDebitEntry(finalDate, finalCustomer, finalAmount, bags || [], note || '');
    res.status(201).json({ success: true, message: 'Debit sale saved' });
  } catch (err) {
    console.error('DebitSale Error:', err.message);
    res.status(500).json({ error: 'Failed: ' + err.message });
  }
});

router.get('/', (req, res) => {
  try {
    res.json(getDebitEntries(req.query.date || null));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch' });
  }
});

module.exports = router;
`.trim());
console.log('✅ routes/debitSale.js fixed');

// ── credit.js ─────────────────────────────────────────────────
fs.writeFileSync(path.join(__dirname, 'routes', 'credit.js'), `
const express = require('express');
const router = express.Router();
const { insertCreditEntry, getCreditEntries } = require('../db/database');

router.post('/', (req, res) => {
  try {
    const { date, customer_name, customerName, amount, note } = req.body;
    const finalCustomer = (customer_name || customerName || '').trim();
    const finalAmount   = Number(amount) || 0;
    const finalDate     = date || new Date().toISOString().slice(0, 10);
    if (!finalCustomer) return res.status(400).json({ error: 'Customer name required' });
    if (finalAmount <= 0) return res.status(400).json({ error: 'Amount must be > 0' });
    insertCreditEntry(finalDate, finalCustomer, finalAmount, note || '');
    res.status(201).json({ success: true, message: 'Credit saved' });
  } catch (err) {
    console.error('Credit Error:', err.message);
    res.status(500).json({ error: 'Failed: ' + err.message });
  }
});

router.get('/', (req, res) => {
  try {
    res.json(getCreditEntries(req.query.date || null));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch' });
  }
});

module.exports = router;
`.trim());
console.log('✅ routes/credit.js fixed');

// ── expenses.js ───────────────────────────────────────────────
fs.writeFileSync(path.join(__dirname, 'routes', 'expenses.js'), `
const express = require('express');
const router = express.Router();
const { insertExpense, getExpenses } = require('../db/database');

router.post('/', (req, res) => {
  try {
    const { date, amount, category, note, description } = req.body;
    const finalDate     = date || new Date().toISOString().slice(0, 10);
    const finalAmount   = Number(amount) || 0;
    const finalCategory = category || description || note || 'Expense';
    if (finalAmount <= 0) return res.status(400).json({ error: 'Amount must be > 0' });
    insertExpense(finalDate, finalAmount, finalCategory, note || finalCategory);
    res.status(201).json({ success: true, message: 'Expense saved' });
  } catch (err) {
    console.error('Expense Error:', err.message);
    res.status(500).json({ error: 'Failed: ' + err.message });
  }
});

router.get('/', (req, res) => {
  try {
    res.json(getExpenses(req.query.date || null));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch' });
  }
});

module.exports = router;
`.trim());
console.log('✅ routes/expenses.js fixed');

// ── customers.js ──────────────────────────────────────────────
fs.writeFileSync(path.join(__dirname, 'routes', 'customers.js'), `
const express = require('express');
const router = express.Router();
const { getAllCustomers, getOrCreateCustomer } = require('../db/database');

router.get('/', (req, res) => {
  try {
    res.json(getAllCustomers());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Name required' });
    const customer = getOrCreateCustomer(name.trim().toUpperCase());
    res.status(201).json({ success: true, customer });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
`.trim());
console.log('✅ routes/customers.js fixed');

// ── summary.js ────────────────────────────────────────────────
fs.writeFileSync(path.join(__dirname, 'routes', 'summary.js'), `
const express = require('express');
const router  = express.Router();
const db      = require('../db/database');

router.get('/today-summary', (req, res) => {
  try {
    const date          = req.query.date || new Date().toISOString().slice(0, 10);
    const raw           = db.getDailySummary(date);
    const cashEntries   = db.getCashEntries(date);
    const debitEntries  = db.getDebitEntries(date);
    const creditEntries = db.getCreditEntries(date);
    const expenses      = db.getExpenses(date);
    const totalCash     = raw?.total_cash     || 0;
    const totalDebit    = raw?.total_debit    || 0;
    const totalCredit   = raw?.total_credit   || 0;
    const totalExpenses = raw?.total_expenses || 0;
    const finalTotal    = totalCash + totalCredit - totalExpenses;
    const totalBags = debitEntries.reduce((sum, e) => {
      const bags = Array.isArray(e.bags) ? e.bags : [];
      return sum + bags.reduce((s, b) => s + (Number(b.numberOfBags) || 0), 0);
    }, 0);
    res.json({ date, totalCash, totalDebit, totalCredit, totalExpenses, finalTotal, totalBags,
      entries: { cash: cashEntries, debit: debitEntries, credit: creditEntries, expense: expenses } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/day-history', (req, res) => {
  try {
    const rows = db.getAllDailySummaries();
    res.json(rows.map(r => {
      const totalCash  = r.total_cash     || 0;
      const totalDebit = r.total_debit    || 0;
      const totalCredit= r.total_credit   || 0;
      const expenses   = r.total_expenses || 0;
      return { date: r.date, totalCash, totalDebit, totalCredit, expenses, finalTotal: totalCash + totalCredit - expenses };
    }));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/all-customers', (req, res) => {
  try { res.json(db.getAllCustomersSummary()); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/customer-records/:name', (req, res) => {
  try {
    const name = decodeURIComponent(req.params.name);
    res.json({ name, ledger: db.getCustomerLedger(name), balance: db.getCustomerBalance(name) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/range', (req, res) => {
  try {
    const { from, to } = req.query;
    if (!from || !to) return res.status(400).json({ error: 'from and to required' });
    const inRange = d => d && d >= from && d <= to;
    const summaries = db.getAllDailySummaries()
      .filter(r => inRange(r.date))
      .sort((a,b) => a.date.localeCompare(b.date))
      .map(r => {
        const tc = r.total_cash||0, td = r.total_debit||0, tcr = r.total_credit||0, te = r.total_expenses||0;
        return { ...r, total_cash:tc, total_debit:td, total_credit:tcr, total_expenses:te, net_balance: tc+tcr-te };
      });
    res.json({
      summaries,
      cashEntries:   db.getCashEntries(null).filter(e   => inRange(e.date)),
      debitEntries:  db.getDebitEntries(null).filter(e  => inRange(e.date)),
      creditEntries: db.getCreditEntries(null).filter(e => inRange(e.date)),
      expenses:      db.getExpenses(null).filter(e      => inRange(e.date))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
`.trim());
console.log('✅ routes/summary.js fixed');

// ── server.js ─────────────────────────────────────────────────
fs.writeFileSync(path.join(__dirname, 'server.js'), `
const express = require('express');
const cors    = require('cors');
const path    = require('path');

const app  = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

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

const frontendPath = path.join(__dirname, '../frontend/dist');
app.use(express.static(frontendPath));
app.get('*', (req, res) => res.sendFile(path.join(frontendPath, 'index.html')));

app.listen(PORT, '0.0.0.0', () => {
  console.log('\\n🐄 CJN PVT LTD SERVER');
  console.log('➜  http://localhost:' + PORT);
  console.log('➜  Health: http://localhost:' + PORT + '/api/health\\n');
});
`.trim());
console.log('✅ server.js fixed');

console.log('\n🎉 ALL FILES FIXED! Now run: node server.js\n');