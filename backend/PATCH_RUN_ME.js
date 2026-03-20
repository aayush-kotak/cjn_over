/**
 * ╔══════════════════════════════════════════════════════╗
 * ║  PLACE THIS FILE IN YOUR backend/ FOLDER            ║
 * ║  THEN RUN:  node PATCH_RUN_ME.js                    ║
 * ╚══════════════════════════════════════════════════════╝
 */

const fs   = require('fs');
const path = require('path');

const routesDir = path.join(__dirname, 'routes');
const target    = path.join(routesDir, 'summary.js');

const newSummaryJs = `const express = require('express');
const router  = express.Router();
const db      = require('../db/database');

// GET /api/summary/today-summary?date=YYYY-MM-DD
router.get('/today-summary', (req, res) => {
  try {
    const date          = req.query.date || new Date().toISOString().slice(0, 10);
    const raw           = db.getDailySummary(date);
    const cashEntries   = db.getCashEntries(date);
    const debitEntries  = db.getDebitEntries(date);
    const creditEntries = db.getCreditEntries(date);
    const expenses      = db.getExpenses(date);
    const totalBags = debitEntries.reduce((sum, e) => {
      const bags = Array.isArray(e.bags) ? e.bags : [];
      return sum + bags.reduce((s, b) => s + (Number(b.numberOfBags) || 0), 0);
    }, 0);
    res.json({
      date,
      totalCash:     raw?.total_cash     || 0,
      totalDebit:    raw?.total_debit    || 0,
      totalCredit:   raw?.total_credit   || 0,
      totalExpenses: raw?.total_expenses || 0,
      finalTotal:    raw?.net_balance    || 0,
      totalBags,
      entries: { cash: cashEntries, debit: debitEntries, credit: creditEntries, expense: expenses }
    });
  } catch (err) {
    console.error('today-summary error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/summary/day-history
router.get('/day-history', (req, res) => {
  try {
    const rows = db.getAllDailySummaries();
    res.json(rows.map(r => ({
      date:        r.date,
      totalCash:   r.total_cash    || 0,
      totalDebit:  r.total_debit   || 0,
      totalCredit: r.total_credit  || 0,
      expenses:    r.total_expenses || 0,
      finalTotal:  r.net_balance   || 0
    })));
  } catch (err) {
    console.error('day-history error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/summary/all-customers
router.get('/all-customers', (req, res) => {
  try {
    res.json(db.getAllCustomersSummary());
  } catch (err) {
    console.error('all-customers error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/summary/customer-records/:name
router.get('/customer-records/:name', (req, res) => {
  try {
    const name = decodeURIComponent(req.params.name);
    res.json({
      name,
      ledger:  db.getCustomerLedger(name),
      balance: db.getCustomerBalance(name)
    });
  } catch (err) {
    console.error('customer-records error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/summary/range?from=YYYY-MM-DD&to=YYYY-MM-DD
router.get('/range', (req, res) => {
  try {
    const { from, to } = req.query;
    if (!from || !to) return res.status(400).json({ error: 'from and to dates are required' });

    const allSummaries  = db.getAllDailySummaries();
    const allCash       = db.getCashEntries(null);
    const allDebit      = db.getDebitEntries(null);
    const allCredit     = db.getCreditEntries(null);
    const allExpenses   = db.getExpenses(null);

    const inRange = d => d && d >= from && d <= to;

    res.json({
      summaries:     allSummaries.filter(r => inRange(r.date)).sort((a,b) => a.date.localeCompare(b.date)),
      cashEntries:   allCash.filter(e  => inRange(e.date)),
      debitEntries:  allDebit.filter(e => inRange(e.date)),
      creditEntries: allCredit.filter(e => inRange(e.date)),
      expenses:      allExpenses.filter(e => inRange(e.date))
    });
  } catch (err) {
    console.error('range error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
`;

// Also patch database.js to support null date (fetch all records)
const dbFile   = path.join(__dirname, 'db', 'database.js');
let   dbSource = fs.readFileSync(dbFile, 'utf8');

const patchFn = (source, fnName, newBody) => {
  // Replace function if it exists with old signature
  const regex = new RegExp(`function ${fnName}\\(date\\)[\\s\\S]*?(?=\\nfunction |\\nmodule\\.exports)`, 'g');
  if (regex.test(source)) {
    return source.replace(regex, newBody + '\n');
  }
  return source; // already patched or not found — leave as is
};

const getCashBody = `function getCashEntries(date) {
  let rows;
  if (date) {
    rows = db.prepare('SELECT * FROM daily_cash_entries WHERE date=? ORDER BY id DESC').all(date);
  } else {
    rows = db.prepare('SELECT * FROM daily_cash_entries ORDER BY date DESC, id DESC').all();
  }
  return rows.map(r => ({
    ...r,
    bags: r.bags ? (() => { try { return JSON.parse(r.bags); } catch { return []; } })() : []
  }));
}`;

const getDebitBody = `function getDebitEntries(date) {
  let rows;
  if (date) {
    rows = db.prepare('SELECT * FROM daily_debit_entries WHERE date=? ORDER BY id DESC').all(date);
  } else {
    rows = db.prepare('SELECT * FROM daily_debit_entries ORDER BY date DESC, id DESC').all();
  }
  return rows.map(r => ({
    ...r,
    bags: r.bags ? (() => { try { return JSON.parse(r.bags); } catch { return []; } })() : []
  }));
}`;

const getCreditBody = `function getCreditEntries(date) {
  if (date) return db.prepare('SELECT * FROM daily_credit_entries WHERE date=? ORDER BY id DESC').all(date);
  return db.prepare('SELECT * FROM daily_credit_entries ORDER BY date DESC, id DESC').all();
}`;

const getExpensesBody = `function getExpenses(date) {
  if (date) return db.prepare('SELECT * FROM expenses WHERE date=? ORDER BY id DESC').all(date);
  return db.prepare('SELECT * FROM expenses ORDER BY date DESC, id DESC').all();
}`;

// Write summary.js
fs.writeFileSync(target, newSummaryJs, 'utf8');
console.log('✅ routes/summary.js patched successfully');

// Patch database.js functions
dbSource = patchFn(dbSource, 'getCashEntries',   getCashBody);
dbSource = patchFn(dbSource, 'getDebitEntries',  getDebitBody);
dbSource = patchFn(dbSource, 'getCreditEntries', getCreditBody);
dbSource = patchFn(dbSource, 'getExpenses',      getExpensesBody);
fs.writeFileSync(dbFile, dbSource, 'utf8');
console.log('✅ db/database.js patched successfully');

// Verify
const written = fs.readFileSync(target, 'utf8');
if (written.includes("router.get('/range'")) {
  console.log('\n✅ PATCH COMPLETE! /api/summary/range route is now present.');
  console.log('\n👉 Now run:  node server.js\n');
} else {
  console.log('\n❌ Something went wrong — range route not found in written file.');
}