// // const fs = require('fs');
// // const path = require('path');

// // const dbDir = path.join(__dirname);
// // const dbPath = path.join(__dirname, 'data.json');

// // // Initialize empty database if not exists
// // if (!fs.existsSync(dbPath)) {
// //   const emptyDb = {
// //     cash_sales: [],
// //     credit_received: [],
// //     debit_sales: [],
// //     expenses: []
// //   };
// //   fs.writeFileSync(dbPath, JSON.stringify(emptyDb, null, 2));
// // }

// // // Read database
// // function readDb() {
// //   const data = fs.readFileSync(dbPath, 'utf8');
// //   return JSON.parse(data);
// // }

// // // Write database
// // function writeDb(data) {
// //   fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
// // }

// // // Insert a record
// // function insert(table, record) {
// //   const db = readDb();
// //   const id = Date.now();
// //   const newRecord = {
// //     id,
// //     ...record,
// //     created_at: new Date().toISOString()
// //   };
// //   db[table].push(newRecord);
// //   writeDb(db);
// //   return newRecord;
// // }

// // // Get all records from a table
// // function getAll(table) {
// //   const db = readDb();
// //   return db[table] || [];
// // }

// // // Get records by field value
// // function getBy(table, field, value) {
// //   const db = readDb();
// //   return (db[table] || []).filter(r => r[field] === value);
// // }

// // module.exports = { insert, getAll, getBy };


// const Database = require('better-sqlite3');
// const path = require('path');
// const fs = require('fs');

// const dbDir = path.join(__dirname);
// if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

// const dbPath = path.join(dbDir, 'cjn.db');
// const db = new Database(dbPath);

// // Enable WAL mode for better performance and safety
// db.pragma('journal_mode = WAL');
// db.pragma('foreign_keys = ON');

// // ─────────────────────────────────────────────
// // MASTER TABLES (created once at startup)
// // ─────────────────────────────────────────────

// // Master customers table
// db.exec(`
//   CREATE TABLE IF NOT EXISTS customers (
//     id        INTEGER PRIMARY KEY AUTOINCREMENT,
//     name      TEXT NOT NULL UNIQUE,
//     created_at TEXT DEFAULT (datetime('now','localtime'))
//   )
// `);

// // Daily cash sales (one row per transaction)
// db.exec(`
//   CREATE TABLE IF NOT EXISTS daily_cash_entries (
//     id          INTEGER PRIMARY KEY AUTOINCREMENT,
//     date        TEXT NOT NULL,
//     customer_id INTEGER,
//     customer_name TEXT,
//     amount      REAL NOT NULL,
//     note        TEXT,
//     created_at  TEXT DEFAULT (datetime('now','localtime')),
//     FOREIGN KEY (customer_id) REFERENCES customers(id)
//   )
// `);

// // Daily debit sales (one row per transaction)
// db.exec(`
//   CREATE TABLE IF NOT EXISTS daily_debit_entries (
//     id          INTEGER PRIMARY KEY AUTOINCREMENT,
//     date        TEXT NOT NULL,
//     customer_id INTEGER,
//     customer_name TEXT,
//     amount      REAL NOT NULL,
//     note        TEXT,
//     created_at  TEXT DEFAULT (datetime('now','localtime')),
//     FOREIGN KEY (customer_id) REFERENCES customers(id)
//   )
// `);

// // Daily credit received (one row per transaction)
// db.exec(`
//   CREATE TABLE IF NOT EXISTS daily_credit_entries (
//     id          INTEGER PRIMARY KEY AUTOINCREMENT,
//     date        TEXT NOT NULL,
//     customer_id INTEGER,
//     customer_name TEXT,
//     amount      REAL NOT NULL,
//     note        TEXT,
//     created_at  TEXT DEFAULT (datetime('now','localtime')),
//     FOREIGN KEY (customer_id) REFERENCES customers(id)
//   )
// `);

// // Daily summary (one row per day — totals stored separately)
// db.exec(`
//   CREATE TABLE IF NOT EXISTS daily_summary (
//     id              INTEGER PRIMARY KEY AUTOINCREMENT,
//     date            TEXT NOT NULL UNIQUE,
//     total_cash      REAL DEFAULT 0,
//     total_debit     REAL DEFAULT 0,
//     total_credit    REAL DEFAULT 0,
//     total_expenses  REAL DEFAULT 0,
//     net_balance     REAL DEFAULT 0,
//     updated_at      TEXT DEFAULT (datetime('now','localtime'))
//   )
// `);

// // Expenses table
// db.exec(`
//   CREATE TABLE IF NOT EXISTS expenses (
//     id          INTEGER PRIMARY KEY AUTOINCREMENT,
//     date        TEXT NOT NULL,
//     amount      REAL NOT NULL,
//     category    TEXT,
//     note        TEXT,
//     created_at  TEXT DEFAULT (datetime('now','localtime'))
//   )
// `);

// // ─────────────────────────────────────────────
// // CUSTOMER LEDGER — dynamic per-customer table
// // ─────────────────────────────────────────────

// /**
//  * Creates a dedicated ledger table for a customer (safe name)
//  * Table name format: ledger_<sanitized_customer_name>
//  */
// function ensureCustomerLedgerTable(customerName) {
//   const safeName = sanitizeTableName(customerName);
//   const tableName = `ledger_${safeName}`;
//   db.exec(`
//     CREATE TABLE IF NOT EXISTS "${tableName}" (
//       id            INTEGER PRIMARY KEY AUTOINCREMENT,
//       date          TEXT NOT NULL,
//       entry_type    TEXT NOT NULL CHECK(entry_type IN ('debit','credit','cash')),
//       amount        REAL NOT NULL,
//       note          TEXT,
//       running_balance REAL DEFAULT 0,
//       created_at    TEXT DEFAULT (datetime('now','localtime'))
//     )
//   `);
//   return tableName;
// }

// /**
//  * Sanitize customer name to safe SQL table name
//  * e.g. "LALBHAI JALSIKA" → "lalbhai_jalsika"
//  */
// function sanitizeTableName(name) {
//   return name
//     .toLowerCase()
//     .replace(/[^a-z0-9]+/g, '_')
//     .replace(/^_+|_+$/g, '');
// }

// // ─────────────────────────────────────────────
// // CUSTOMER FUNCTIONS
// // ─────────────────────────────────────────────

// function getOrCreateCustomer(name) {
//   const trimmed = name.trim();
//   let customer = db.prepare(`SELECT * FROM customers WHERE name = ?`).get(trimmed);
//   if (!customer) {
//     const info = db.prepare(`INSERT INTO customers (name) VALUES (?)`).run(trimmed);
//     customer = { id: info.lastInsertRowid, name: trimmed };
//   }
//   // Always ensure their ledger table exists
//   ensureCustomerLedgerTable(trimmed);
//   return customer;
// }

// function getAllCustomers() {
//   return db.prepare(`SELECT * FROM customers ORDER BY name ASC`).all();
// }

// // ─────────────────────────────────────────────
// // LEDGER FUNCTIONS
// // ─────────────────────────────────────────────

// /**
//  * Insert entry into customer's own ledger table
//  * Automatically calculates running balance
//  */
// function insertCustomerLedgerEntry(customerName, date, entryType, amount, note = '') {
//   const tableName = ensureCustomerLedgerTable(customerName);

//   // Get last running balance
//   const last = db.prepare(`SELECT running_balance FROM "${tableName}" ORDER BY id DESC LIMIT 1`).get();
//   let prevBalance = last ? last.running_balance : 0;

//   // Debit = customer owes us (positive), Credit = customer paid us (reduces balance)
//   let newBalance;
//   if (entryType === 'debit') {
//     newBalance = prevBalance + amount;
//   } else if (entryType === 'credit') {
//     newBalance = prevBalance - amount;
//   } else {
//     newBalance = prevBalance; // cash sales don't affect ledger balance
//   }

//   const stmt = db.prepare(`
//     INSERT INTO "${tableName}" (date, entry_type, amount, note, running_balance)
//     VALUES (?, ?, ?, ?, ?)
//   `);
//   return stmt.run(date, entryType, amount, note, newBalance);
// }

// function getCustomerLedger(customerName) {
//   const tableName = ensureCustomerLedgerTable(customerName);
//   return db.prepare(`SELECT * FROM "${tableName}" ORDER BY id ASC`).all();
// }

// function getCustomerBalance(customerName) {
//   const tableName = ensureCustomerLedgerTable(customerName);
//   const last = db.prepare(`SELECT running_balance FROM "${tableName}" ORDER BY id DESC LIMIT 1`).get();
//   return last ? last.running_balance : 0;
// }

// // ─────────────────────────────────────────────
// // DAILY ENTRY FUNCTIONS
// // ─────────────────────────────────────────────

// function insertCashEntry(date, customerName, amount, bags, note) {
//   const customer  = getOrCreateCustomer(customerName);
//   const bagsJson  = bags ? (typeof bags === 'string' ? bags : JSON.stringify(bags)) : '[]';
//   const stmt = db.prepare(
//     `INSERT INTO daily_cash_entries (date, customer_id, customer_name, bags, amount, note)
//      VALUES (?, ?, ?, ?, ?, ?)`
//   );
//   const info = stmt.run(date, customer.id, customerName, bagsJson, Number(amount), note || '');
//   updateDailySummary(date);
//   return info;
// }

// function insertDebitEntry(date, customerName, amount, bags, note) {
//   const customer  = getOrCreateCustomer(customerName);
//   const bagsJson  = bags ? (typeof bags === 'string' ? bags : JSON.stringify(bags)) : '[]';
//   const stmt = db.prepare(
//     `INSERT INTO daily_debit_entries (date, customer_id, customer_name, bags, amount, note)
//      VALUES (?, ?, ?, ?, ?, ?)`
//   );
//   const info = stmt.run(date, customer.id, customerName, bagsJson, Number(amount), note || '');
//   // Add to customer ledger
//   insertLedgerEntry(customerName, date, 'debit', Number(amount), note || '');
//   updateDailySummary(date);
//   return info;
// }

// function insertCreditEntry(date, customerName, amount, note) {
//   const customer = getOrCreateCustomer(customerName);
//   const stmt = db.prepare(
//     `INSERT INTO daily_credit_entries (date, customer_id, customer_name, amount, note)
//      VALUES (?, ?, ?, ?, ?)`
//   );
//   const info = stmt.run(date, customer.id, customerName, Number(amount), note || '');
//   // Add to customer ledger
//   insertLedgerEntry(customerName, date, 'credit', Number(amount), note || '');
//   updateDailySummary(date);
//   return info;
// }

// function insertExpense(date, amount, category, note) {
//   const stmt = db.prepare(
//     `INSERT INTO expenses (date, amount, category, note) VALUES (?, ?, ?, ?)`
//   );
//   const info = stmt.run(date, Number(amount), category || '', note || '');
//   updateDailySummary(date);
//   return info;
// }

// // ─────────────────────────────────────────────
// // DAILY SUMMARY — auto-calculated & stored
// // ─────────────────────────────────────────────

// function updateDailySummary(date) {
//   const cash    = db.prepare(`SELECT COALESCE(SUM(amount),0) as total FROM daily_cash_entries WHERE date = ?`).get(date).total;
//   const debit   = db.prepare(`SELECT COALESCE(SUM(amount),0) as total FROM daily_debit_entries WHERE date = ?`).get(date).total;
//   const credit  = db.prepare(`SELECT COALESCE(SUM(amount),0) as total FROM daily_credit_entries WHERE date = ?`).get(date).total;
//   const expense = db.prepare(`SELECT COALESCE(SUM(amount),0) as total FROM expenses WHERE date = ?`).get(date).total;
//   const net     = net_balance = cash + credit - expense;

//   db.prepare(`
//     INSERT INTO daily_summary (date, total_cash, total_debit, total_credit, total_expenses, net_balance, updated_at)
//     VALUES (?, ?, ?, ?, ?, ?, datetime('now','localtime'))
//     ON CONFLICT(date) DO UPDATE SET
//       total_cash     = excluded.total_cash,
//       total_debit    = excluded.total_debit,
//       total_credit   = excluded.total_credit,
//       total_expenses = excluded.total_expenses,
//       net_balance    = excluded.net_balance,
//       updated_at     = excluded.updated_at
//   `).run(date, cash, debit, credit, expense, net);
// }

// function getDailySummary(date) {
//   return db.prepare(`SELECT * FROM daily_summary WHERE date = ?`).get(date) || {
//     date, total_cash: 0, total_debit: 0, total_credit: 0, total_expenses: 0, net_balance: 0
//   };
// }

// function getAllDailySummaries() {
//   return db.prepare(`SELECT * FROM daily_summary ORDER BY date DESC`).all();
// }

// // ─────────────────────────────────────────────
// // GET FUNCTIONS
// // ─────────────────────────────────────────────

// function getCashEntries(date) {
//   let rows;
//   if (date) {
//     rows = db.prepare('SELECT * FROM daily_cash_entries WHERE date=? ORDER BY id DESC').all(date);
//   } else {
//     rows = db.prepare('SELECT * FROM daily_cash_entries ORDER BY date DESC, id DESC').all();
//   }
//   return rows.map(r => ({
//     ...r,
//     bags: r.bags ? (() => { try { return JSON.parse(r.bags); } catch { return []; } })() : []
//   }));
// }

// function getDebitEntries(date) {
//   let rows;
//   if (date) {
//     rows = db.prepare('SELECT * FROM daily_debit_entries WHERE date=? ORDER BY id DESC').all(date);
//   } else {
//     rows = db.prepare('SELECT * FROM daily_debit_entries ORDER BY date DESC, id DESC').all();
//   }
//   return rows.map(r => ({
//     ...r,
//     bags: r.bags ? (() => { try { return JSON.parse(r.bags); } catch { return []; } })() : []
//   }));
// }

// function getCreditEntries(date) {
//   if (date) return db.prepare('SELECT * FROM daily_credit_entries WHERE date=? ORDER BY id DESC').all(date);
//   return db.prepare('SELECT * FROM daily_credit_entries ORDER BY date DESC, id DESC').all();
// }

// function getExpenses(date) {
//   if (date) return db.prepare('SELECT * FROM expenses WHERE date=? ORDER BY id DESC').all(date);
//   return db.prepare('SELECT * FROM expenses ORDER BY date DESC, id DESC').all();
// }

// function getAllCustomersSummary() {
//   const customers = getAllCustomers();
//   return customers.map(c => {
//     const tableName = ensureCustomerLedgerTable(c.name);
//     const totalDebit  = db.prepare(`SELECT COALESCE(SUM(amount),0) as t FROM "${tableName}" WHERE entry_type='debit'`).get().t;
//     const totalCredit = db.prepare(`SELECT COALESCE(SUM(amount),0) as t FROM "${tableName}" WHERE entry_type='credit'`).get().t;
//     const balance     = getCustomerBalance(c.name);
//     return {
//       id: c.id,
//       name: c.name,
//       total_debit: totalDebit,
//       total_credit: totalCredit,
//       balance: balance
//     };
//   });
// }

// module.exports = {
//   // Customer
//   getOrCreateCustomer,
//   getAllCustomers,
//   getAllCustomersSummary,
//   // Ledger
//   getCustomerLedger,
//   getCustomerBalance,
//   // Daily inserts
//   insertCashEntry,
//   insertDebitEntry,
//   insertCreditEntry,
//   insertExpense,
//   // Daily reads
//   getCashEntries,
//   getDebitEntries,
//   getCreditEntries,
//   getExpenses,
//   // Summary
//   getDailySummary,
//   getAllDailySummaries,
//   updateDailySummary
// };






const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbDir  = path.join(__dirname);
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

const dbPath = path.join(dbDir, 'cjn.db');
const db     = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ── Create master tables ──────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS customers (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT NOT NULL UNIQUE,
    created_at TEXT DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS daily_cash_entries (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    date          TEXT NOT NULL,
    customer_id   INTEGER,
    customer_name TEXT,
    bags          TEXT DEFAULT '[]',
    amount        REAL NOT NULL,
    note          TEXT,
    created_at    TEXT DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS daily_debit_entries (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    date          TEXT NOT NULL,
    customer_id   INTEGER,
    customer_name TEXT,
    bags          TEXT DEFAULT '[]',
    amount        REAL NOT NULL,
    note          TEXT,
    created_at    TEXT DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS daily_credit_entries (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    date          TEXT NOT NULL,
    customer_id   INTEGER,
    customer_name TEXT,
    amount        REAL NOT NULL,
    note          TEXT,
    created_at    TEXT DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS daily_summary (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    date           TEXT NOT NULL UNIQUE,
    total_cash     REAL DEFAULT 0,
    total_debit    REAL DEFAULT 0,
    total_credit   REAL DEFAULT 0,
    total_expenses REAL DEFAULT 0,
    net_balance    REAL DEFAULT 0,
    updated_at     TEXT DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS expenses (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    date       TEXT NOT NULL,
    amount     REAL NOT NULL,
    category   TEXT,
    note       TEXT,
    created_at TEXT DEFAULT (datetime('now','localtime'))
  );
`);

// ── Add bags column if missing in existing databases ──────────
try { db.exec('ALTER TABLE daily_cash_entries  ADD COLUMN bags TEXT DEFAULT "[]"'); } catch(e) {}
try { db.exec('ALTER TABLE daily_debit_entries ADD COLUMN bags TEXT DEFAULT "[]"'); } catch(e) {}

// ── sanitizeTableName ─────────────────────────────────────────
function sanitizeTableName(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

// ── ensureCustomerLedgerTable ─────────────────────────────────
function ensureCustomerLedgerTable(customerName) {
  const safeName  = sanitizeTableName(customerName);
  const tableName = `ledger_${safeName}`;
  db.exec(`
    CREATE TABLE IF NOT EXISTS "${tableName}" (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      date            TEXT NOT NULL,
      entry_type      TEXT NOT NULL CHECK(entry_type IN ('debit','credit','cash')),
      amount          REAL NOT NULL,
      note            TEXT,
      running_balance REAL DEFAULT 0,
      created_at      TEXT DEFAULT (datetime('now','localtime'))
    )
  `);
  return tableName;
}

// ── insertLedgerEntry (fixed name — was insertCustomerLedgerEntry) ──
function insertLedgerEntry(customerName, date, entryType, amount, note) {
  const tableName = ensureCustomerLedgerTable(customerName);
  const last      = db.prepare(`SELECT running_balance FROM "${tableName}" ORDER BY id DESC LIMIT 1`).get();
  const prev      = last ? (last.running_balance || 0) : 0;
  const newBal    = entryType === 'debit'  ? prev + amount
                  : entryType === 'credit' ? prev - amount
                  : prev;
  db.prepare(`INSERT INTO "${tableName}" (date, entry_type, amount, note, running_balance) VALUES (?, ?, ?, ?, ?)`)
    .run(date, entryType, amount, note || '', newBal);
}

// ── getOrCreateCustomer ───────────────────────────────────────
function getOrCreateCustomer(name) {
  const trimmed = (name || 'UNKNOWN').trim();
  db.prepare('INSERT OR IGNORE INTO customers (name) VALUES (?)').run(trimmed);
  const customer = db.prepare('SELECT * FROM customers WHERE name=?').get(trimmed);
  ensureCustomerLedgerTable(trimmed);
  return customer;
}

// ── getAllCustomers ───────────────────────────────────────────
function getAllCustomers() {
  return db.prepare('SELECT * FROM customers ORDER BY name ASC').all();
}

// ── updateDailySummary ────────────────────────────────────────
function updateDailySummary(date) {
  const cash    = db.prepare('SELECT COALESCE(SUM(amount),0) as total FROM daily_cash_entries   WHERE date=?').get(date).total;
  const debit   = db.prepare('SELECT COALESCE(SUM(amount),0) as total FROM daily_debit_entries  WHERE date=?').get(date).total;
  const credit  = db.prepare('SELECT COALESCE(SUM(amount),0) as total FROM daily_credit_entries WHERE date=?').get(date).total;
  const expense = db.prepare('SELECT COALESCE(SUM(amount),0) as total FROM expenses             WHERE date=?').get(date).total;
  // Final Total = Cash + Credit - Expenses (Debit NOT subtracted)
  const net = cash + credit - expense;
  db.prepare(`
    INSERT INTO daily_summary (date, total_cash, total_debit, total_credit, total_expenses, net_balance, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now','localtime'))
    ON CONFLICT(date) DO UPDATE SET
      total_cash=excluded.total_cash,
      total_debit=excluded.total_debit,
      total_credit=excluded.total_credit,
      total_expenses=excluded.total_expenses,
      net_balance=excluded.net_balance,
      updated_at=excluded.updated_at
  `).run(date, cash, debit, credit, expense, net);
}

// ── insertCashEntry ───────────────────────────────────────────
function insertCashEntry(date, customerName, amount, bags, note) {
  const customer = getOrCreateCustomer(customerName);
  const bagsJson = bags ? (typeof bags === 'string' ? bags : JSON.stringify(bags)) : '[]';
  const info = db.prepare(
    'INSERT INTO daily_cash_entries (date, customer_id, customer_name, bags, amount, note) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(date, customer.id, customerName, bagsJson, Number(amount), note || '');
  updateDailySummary(date);
  return info;
}

// ── insertDebitEntry ──────────────────────────────────────────
function insertDebitEntry(date, customerName, amount, bags, note) {
  const customer = getOrCreateCustomer(customerName);
  const bagsJson = bags ? (typeof bags === 'string' ? bags : JSON.stringify(bags)) : '[]';
  const info = db.prepare(
    'INSERT INTO daily_debit_entries (date, customer_id, customer_name, bags, amount, note) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(date, customer.id, customerName, bagsJson, Number(amount), note || '');
  // Add to customer ledger
  insertLedgerEntry(customerName, date, 'debit', Number(amount), note || '');
  updateDailySummary(date);
  return info;
}

// ── insertCreditEntry ─────────────────────────────────────────
function insertCreditEntry(date, customerName, amount, note) {
  const customer = getOrCreateCustomer(customerName);
  const info = db.prepare(
    'INSERT INTO daily_credit_entries (date, customer_id, customer_name, amount, note) VALUES (?, ?, ?, ?, ?)'
  ).run(date, customer.id, customerName, Number(amount), note || '');
  // Add to customer ledger
  insertLedgerEntry(customerName, date, 'credit', Number(amount), note || '');
  updateDailySummary(date);
  return info;
}

// ── insertExpense ─────────────────────────────────────────────
function insertExpense(date, amount, category, note) {
  const info = db.prepare(
    'INSERT INTO expenses (date, amount, category, note) VALUES (?, ?, ?, ?)'
  ).run(date, Number(amount), category || '', note || '');
  updateDailySummary(date);
  return info;
}

// ── getCashEntries ────────────────────────────────────────────
function getCashEntries(date) {
  const rows = date
    ? db.prepare('SELECT * FROM daily_cash_entries WHERE date=? ORDER BY id DESC').all(date)
    : db.prepare('SELECT * FROM daily_cash_entries ORDER BY date DESC, id DESC').all();
  return rows.map(r => ({
    ...r,
    bags: r.bags ? (() => { try { return JSON.parse(r.bags); } catch { return []; } })() : []
  }));
}

// ── getDebitEntries ───────────────────────────────────────────
function getDebitEntries(date) {
  const rows = date
    ? db.prepare('SELECT * FROM daily_debit_entries WHERE date=? ORDER BY id DESC').all(date)
    : db.prepare('SELECT * FROM daily_debit_entries ORDER BY date DESC, id DESC').all();
  return rows.map(r => ({
    ...r,
    bags: r.bags ? (() => { try { return JSON.parse(r.bags); } catch { return []; } })() : []
  }));
}

// ── getCreditEntries ──────────────────────────────────────────
function getCreditEntries(date) {
  if (date) return db.prepare('SELECT * FROM daily_credit_entries WHERE date=? ORDER BY id DESC').all(date);
  return db.prepare('SELECT * FROM daily_credit_entries ORDER BY date DESC, id DESC').all();
}

// ── getExpenses ───────────────────────────────────────────────
function getExpenses(date) {
  if (date) return db.prepare('SELECT * FROM expenses WHERE date=? ORDER BY id DESC').all(date);
  return db.prepare('SELECT * FROM expenses ORDER BY date DESC, id DESC').all();
}

// ── getDailySummary ───────────────────────────────────────────
function getDailySummary(date) {
  return db.prepare('SELECT * FROM daily_summary WHERE date=?').get(date) || {
    date, total_cash: 0, total_debit: 0, total_credit: 0, total_expenses: 0, net_balance: 0
  };
}

// ── getAllDailySummaries ───────────────────────────────────────
function getAllDailySummaries() {
  return db.prepare('SELECT * FROM daily_summary ORDER BY date DESC').all();
}

// ── getAllCustomersSummary ─────────────────────────────────────
function getAllCustomersSummary() {
  const customers = getAllCustomers();
  return customers.map(c => {
    const tableName  = ensureCustomerLedgerTable(c.name);
    const totalDebit = db.prepare(`SELECT COALESCE(SUM(amount),0) as t FROM "${tableName}" WHERE entry_type='debit'`).get().t;
    const totalCredit= db.prepare(`SELECT COALESCE(SUM(amount),0) as t FROM "${tableName}" WHERE entry_type='credit'`).get().t;
    const balance    = getCustomerBalance(c.name);
    return { id: c.id, name: c.name, total_debit: totalDebit, total_credit: totalCredit, balance };
  });
}

// ── getCustomerLedger ─────────────────────────────────────────
function getCustomerLedger(customerName) {
  try {
    const tableName = ensureCustomerLedgerTable(customerName);
    return db.prepare(`SELECT * FROM "${tableName}" ORDER BY id ASC`).all();
  } catch(e) { return []; }
}

// ── getCustomerBalance ────────────────────────────────────────
function getCustomerBalance(customerName) {
  try {
    const tableName = ensureCustomerLedgerTable(customerName);
    const last = db.prepare(`SELECT running_balance FROM "${tableName}" ORDER BY id DESC LIMIT 1`).get();
    return last ? (last.running_balance || 0) : 0;
  } catch(e) { return 0; }
}

module.exports = {
  getOrCreateCustomer,
  getAllCustomers,
  getAllCustomersSummary,
  getCustomerLedger,
  getCustomerBalance,
  insertCashEntry,
  insertDebitEntry,
  insertCreditEntry,
  insertExpense,
  getCashEntries,
  getDebitEntries,
  getCreditEntries,
  getExpenses,
  getDailySummary,
  getAllDailySummaries,
  updateDailySummary
};