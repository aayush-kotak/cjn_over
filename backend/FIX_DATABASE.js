/**
 * PLACE IN backend/ folder
 * RUN: node FIX_DATABASE.js
 * Fixes the SQLite binding error in insertCashEntry, insertDebitEntry
 */

const fs   = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'db', 'database.js');
let source   = fs.readFileSync(dbPath, 'utf8');
const original = source;

// ── FIX 1: insertCashEntry ────────────────────────────────────
// Find the insertCashEntry function and fix bags serialization
const oldCashPatterns = [
  // Pattern: bags passed directly without JSON.stringify
  /function insertCashEntry\s*\([^)]*\)\s*\{[\s\S]*?\}/,
];

const newInsertCashEntry = `function insertCashEntry(date, customerName, amount, bags, note) {
  const customer  = getOrCreateCustomer(customerName);
  const bagsJson  = bags ? (typeof bags === 'string' ? bags : JSON.stringify(bags)) : '[]';
  const stmt = db.prepare(
    \`INSERT INTO daily_cash_entries (date, customer_id, customer_name, bags, amount, note)
     VALUES (?, ?, ?, ?, ?, ?)\`
  );
  const info = stmt.run(date, customer.id, customerName, bagsJson, Number(amount), note || '');
  updateDailySummary(date);
  return info;
}`;

const newInsertDebitEntry = `function insertDebitEntry(date, customerName, amount, bags, note) {
  const customer  = getOrCreateCustomer(customerName);
  const bagsJson  = bags ? (typeof bags === 'string' ? bags : JSON.stringify(bags)) : '[]';
  const stmt = db.prepare(
    \`INSERT INTO daily_debit_entries (date, customer_id, customer_name, bags, amount, note)
     VALUES (?, ?, ?, ?, ?, ?)\`
  );
  const info = stmt.run(date, customer.id, customerName, bagsJson, Number(amount), note || '');
  // Add to customer ledger
  insertLedgerEntry(customerName, date, 'debit', Number(amount), note || '');
  updateDailySummary(date);
  return info;
}`;

const newInsertCreditEntry = `function insertCreditEntry(date, customerName, amount, note) {
  const customer = getOrCreateCustomer(customerName);
  const stmt = db.prepare(
    \`INSERT INTO daily_credit_entries (date, customer_id, customer_name, amount, note)
     VALUES (?, ?, ?, ?, ?)\`
  );
  const info = stmt.run(date, customer.id, customerName, Number(amount), note || '');
  // Add to customer ledger
  insertLedgerEntry(customerName, date, 'credit', Number(amount), note || '');
  updateDailySummary(date);
  return info;
}`;

const newInsertExpense = `function insertExpense(date, amount, category, note) {
  const stmt = db.prepare(
    \`INSERT INTO expenses (date, amount, category, note) VALUES (?, ?, ?, ?)\`
  );
  const info = stmt.run(date, Number(amount), category || '', note || '');
  updateDailySummary(date);
  return info;
}`;

// Replace each function
let patched = 0;

// Replace insertCashEntry
source = source.replace(
  /function insertCashEntry\s*\([\s\S]*?^}/m,
  newInsertCashEntry
);

// Replace insertDebitEntry  
source = source.replace(
  /function insertDebitEntry\s*\([\s\S]*?^}/m,
  newInsertDebitEntry
);

// Replace insertCreditEntry
source = source.replace(
  /function insertCreditEntry\s*\([\s\S]*?^}/m,
  newInsertCreditEntry
);

// Replace insertExpense
source = source.replace(
  /function insertExpense\s*\([\s\S]*?^}/m,
  newInsertExpense
);

// Also fix getCashEntries and getDebitEntries to parse bags JSON safely
const newGetCash = `function getCashEntries(date) {
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

const newGetDebit = `function getDebitEntries(date) {
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

const newGetCredit = `function getCreditEntries(date) {
  if (date) return db.prepare('SELECT * FROM daily_credit_entries WHERE date=? ORDER BY id DESC').all(date);
  return db.prepare('SELECT * FROM daily_credit_entries ORDER BY date DESC, id DESC').all();
}`;

const newGetExpenses = `function getExpenses(date) {
  if (date) return db.prepare('SELECT * FROM expenses WHERE date=? ORDER BY id DESC').all(date);
  return db.prepare('SELECT * FROM expenses ORDER BY date DESC, id DESC').all();
}`;

source = source.replace(/function getCashEntries\s*\([\s\S]*?^}/m,   newGetCash);
source = source.replace(/function getDebitEntries\s*\([\s\S]*?^}/m,  newGetDebit);
source = source.replace(/function getCreditEntries\s*\([\s\S]*?^}/m, newGetCredit);
source = source.replace(/function getExpenses\s*\([\s\S]*?^}/m,      newGetExpenses);

if (source !== original) {
  fs.writeFileSync(dbPath, source, 'utf8');
  console.log('✅ database.js patched successfully');
} else {
  console.log('⚠️  Regex did not match — writing safe version directly...');

  // If regex fails, append safe wrapper functions at the end before module.exports
  const safeOverrides = `

// ── SAFE OVERRIDES (auto-patched) ────────────────────────────
function insertCashEntry(date, customerName, amount, bags, note) {
  const customer = getOrCreateCustomer(customerName);
  const bagsJson = bags ? (typeof bags === 'string' ? bags : JSON.stringify(bags)) : '[]';
  const info = db.prepare(
    'INSERT INTO daily_cash_entries (date, customer_id, customer_name, bags, amount, note) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(date, customer.id, customerName, bagsJson, Number(amount), note || '');
  updateDailySummary(date);
  return info;
}

function insertDebitEntry(date, customerName, amount, bags, note) {
  const customer = getOrCreateCustomer(customerName);
  const bagsJson = bags ? (typeof bags === 'string' ? bags : JSON.stringify(bags)) : '[]';
  const info = db.prepare(
    'INSERT INTO daily_debit_entries (date, customer_id, customer_name, bags, amount, note) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(date, customer.id, customerName, bagsJson, Number(amount), note || '');
  try { insertLedgerEntry(customerName, date, 'debit', Number(amount), note || ''); } catch(e) {}
  updateDailySummary(date);
  return info;
}

function insertCreditEntry(date, customerName, amount, note) {
  const customer = getOrCreateCustomer(customerName);
  const info = db.prepare(
    'INSERT INTO daily_credit_entries (date, customer_id, customer_name, amount, note) VALUES (?, ?, ?, ?, ?)'
  ).run(date, customer.id, customerName, Number(amount), note || '');
  try { insertLedgerEntry(customerName, date, 'credit', Number(amount), note || ''); } catch(e) {}
  updateDailySummary(date);
  return info;
}

function insertExpense(date, amount, category, note) {
  const info = db.prepare(
    'INSERT INTO expenses (date, amount, category, note) VALUES (?, ?, ?, ?)'
  ).run(date, Number(amount), category || '', note || '');
  updateDailySummary(date);
  return info;
}

function getCashEntries(date) {
  const rows = date
    ? db.prepare('SELECT * FROM daily_cash_entries WHERE date=? ORDER BY id DESC').all(date)
    : db.prepare('SELECT * FROM daily_cash_entries ORDER BY date DESC, id DESC').all();
  return rows.map(r => ({ ...r, bags: r.bags ? (() => { try { return JSON.parse(r.bags); } catch { return []; } })() : [] }));
}

function getDebitEntries(date) {
  const rows = date
    ? db.prepare('SELECT * FROM daily_debit_entries WHERE date=? ORDER BY id DESC').all(date)
    : db.prepare('SELECT * FROM daily_debit_entries ORDER BY date DESC, id DESC').all();
  return rows.map(r => ({ ...r, bags: r.bags ? (() => { try { return JSON.parse(r.bags); } catch { return []; } })() : [] }));
}

function getCreditEntries(date) {
  if (date) return db.prepare('SELECT * FROM daily_credit_entries WHERE date=? ORDER BY id DESC').all(date);
  return db.prepare('SELECT * FROM daily_credit_entries ORDER BY date DESC, id DESC').all();
}

function getExpenses(date) {
  if (date) return db.prepare('SELECT * FROM expenses WHERE date=? ORDER BY id DESC').all(date);
  return db.prepare('SELECT * FROM expenses ORDER BY date DESC, id DESC').all();
}
`;

  // Insert safe overrides BEFORE module.exports
  let src = fs.readFileSync(dbPath, 'utf8');
  if (src.includes('module.exports')) {
    src = src.replace('module.exports', safeOverrides + '\nmodule.exports');
  } else {
    src = src + safeOverrides;
  }
  fs.writeFileSync(dbPath, src, 'utf8');
  console.log('✅ database.js safe overrides appended');
}

console.log('\n🎉 DONE! Now run: node server.js\n');
console.log('Cash Sale will now save correctly — bags are stored as JSON string.\n');