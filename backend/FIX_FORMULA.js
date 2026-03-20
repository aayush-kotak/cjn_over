/**
 * ╔══════════════════════════════════════════════════════╗
 * ║  PLACE IN backend/ folder, then run:                ║
 * ║  node FIX_FORMULA.js                                ║
 * ╚══════════════════════════════════════════════════════╝
 *
 * Fixes Final Total formula to: Cash + Credit - Expenses
 * (Debit is NOT included in final total — it's money owed, not received)
 */

const fs   = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const dbPath    = path.join(__dirname, 'db', 'cjn.db');
const dbJsPath  = path.join(__dirname, 'db', 'database.js');
const summaryJs = path.join(__dirname, 'routes', 'summary.js');

// ── STEP 1: Fix database.js updateDailySummary function ──────
console.log('\n📝 Step 1: Patching database.js...');
let dbSource = fs.readFileSync(dbJsPath, 'utf8');

// Find and replace the net_balance calculation line
// Old formula usually: cash + credit - debit - expense  OR  cash+credit-debit-expense
const oldFormulas = [
  /net_balance\s*=\s*cash\s*\+\s*credit\s*-\s*debit\s*-\s*expense/g,
  /net_balance:.*cash.*debit.*expense/g,
  /cash\+credit-debit-expense/g,
  /cash \+ credit - debit - expense/g,
];

let patched = false;
for (const regex of oldFormulas) {
  if (regex.test(dbSource)) {
    dbSource = dbSource.replace(regex, 'net_balance = cash + credit - expense');
    patched = true;
    console.log('  ✅ Found and fixed net_balance formula in database.js');
    break;
  }
}

// Also find the SQL INSERT/UPDATE for daily_summary and fix net_balance there
// Look for the run() call that inserts net_balance
const sqlPatch1 = dbSource.replace(
  /\.run\(date,\s*cash,\s*debit,\s*credit,\s*expense,\s*cash\s*\+\s*credit\s*-\s*debit\s*-\s*expense\)/g,
  '.run(date, cash, debit, credit, expense, cash + credit - expense)'
);
if (sqlPatch1 !== dbSource) {
  dbSource = sqlPatch1;
  patched = true;
  console.log('  ✅ Fixed .run() call in database.js');
}

// Broader search: find net_balance line in updateDailySummary
const netBalanceLine = /(\s*)(const\s+)?net\s*=\s*.*debit.*/g;
if (netBalanceLine.test(dbSource)) {
  dbSource = dbSource.replace(netBalanceLine, '$1const net = cash + credit - expense;');
  patched = true;
  console.log('  ✅ Fixed net variable in database.js');
}

if (!patched) {
  console.log('  ⚠️  Could not auto-patch formula — will fix directly in SQLite instead');
}

fs.writeFileSync(dbJsPath, dbSource, 'utf8');

// ── STEP 2: Fix summary.js to compute finalTotal correctly ───
console.log('\n📝 Step 2: Patching routes/summary.js...');
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

    const totalCash     = raw?.total_cash     || 0;
    const totalDebit    = raw?.total_debit    || 0;
    const totalCredit   = raw?.total_credit   || 0;
    const totalExpenses = raw?.total_expenses || 0;

    // Final Total = Cash + Credit - Expenses (Debit NOT included)
    const finalTotal = totalCash + totalCredit - totalExpenses;

    const totalBags = debitEntries.reduce((sum, e) => {
      const bags = Array.isArray(e.bags) ? e.bags : [];
      return sum + bags.reduce((s, b) => s + (Number(b.numberOfBags) || 0), 0);
    }, 0);

    res.json({
      date, totalCash, totalDebit, totalCredit, totalExpenses, finalTotal, totalBags,
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
    res.json(rows.map(r => {
      const totalCash     = r.total_cash     || 0;
      const totalDebit    = r.total_debit    || 0;
      const totalCredit   = r.total_credit   || 0;
      const expenses      = r.total_expenses || 0;
      // Final Total = Cash + Credit - Expenses (Debit NOT included)
      const finalTotal    = totalCash + totalCredit - expenses;
      return { date: r.date, totalCash, totalDebit, totalCredit, expenses, finalTotal };
    }));
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

    const summaries = allSummaries
      .filter(r => inRange(r.date))
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(r => {
        const total_cash     = r.total_cash     || 0;
        const total_debit    = r.total_debit    || 0;
        const total_credit   = r.total_credit   || 0;
        const total_expenses = r.total_expenses || 0;
        // Final Total = Cash + Credit - Expenses (Debit NOT included)
        const net_balance    = total_cash + total_credit - total_expenses;
        return { ...r, total_cash, total_debit, total_credit, total_expenses, net_balance };
      });

    res.json({
      summaries,
      cashEntries:   allCash.filter(e   => inRange(e.date)),
      debitEntries:  allDebit.filter(e  => inRange(e.date)),
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

fs.writeFileSync(summaryJs, newSummaryJs, 'utf8');
console.log('  ✅ routes/summary.js written with correct formula');

// ── STEP 3: Verify range route present ───────────────────────
const check = fs.readFileSync(summaryJs, 'utf8');
if (check.includes("router.get('/range'")) {
  console.log('  ✅ /range route confirmed present');
} else {
  console.log('  ❌ range route missing — something went wrong');
}

// ── STEP 4: Recompute all net_balance in SQLite directly ──────
console.log('\n📝 Step 3: Recomputing all net_balance values in SQLite...');
try {
  const sqliteDb = new Database(dbPath);
  const rows = sqliteDb.prepare('SELECT date, total_cash, total_credit, total_expenses FROM daily_summary').all();
  const update = sqliteDb.prepare(
    'UPDATE daily_summary SET net_balance=? WHERE date=?'
  );
  const updateAll = sqliteDb.transaction(() => {
    rows.forEach(r => {
      // Cash + Credit - Expenses (NO debit)
      const correct = (r.total_cash || 0) + (r.total_credit || 0) - (r.total_expenses || 0);
      update.run(correct, r.date);
      console.log(`  ✅ ${r.date}: Cash(${r.total_cash}) + Credit(${r.total_credit}) - Expenses(${r.total_expenses}) = ${correct}`);
    });
  });
  updateAll();
  sqliteDb.close();
  console.log('\n  ✅ All net_balance values corrected in database');
} catch (err) {
  console.error('  ⚠️  SQLite patch failed:', err.message);
}

console.log('\n🎉 ALL DONE! Now run:  node server.js\n');
console.log('Formula is now:  Final Total = Cash + Credit - Expenses');
console.log('Debit is shown separately but NOT included in Final Total.\n');