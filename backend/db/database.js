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

const dbPath = process.env.DATABASE_PATH || path.join(dbDir, 'cjn.db');

// Ensure parent directory exists if using a custom path
if (process.env.DATABASE_PATH) {
  const customDir = path.dirname(process.env.DATABASE_PATH);
  if (!fs.existsSync(customDir)) fs.mkdirSync(customDir, { recursive: true });
}

const db = new Database(dbPath);

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

  CREATE TABLE IF NOT EXISTS audit_log (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    action          TEXT NOT NULL, /* create|update|delete */
    entity_type     TEXT NOT NULL, /* cash-sale|debit-sale|credit|expenses|customers */
    entity_id       TEXT,
    actor_username  TEXT,
    actor_role      TEXT,
    before_json     TEXT,
    after_json      TEXT,
    created_at      TEXT DEFAULT (datetime('now','localtime'))
  );

  -- Product master (bag/rate catalog)
  CREATE TABLE IF NOT EXISTS products (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    name                TEXT NOT NULL UNIQUE,
    rate_per_bag        REAL DEFAULT 0,
    size                TEXT,
    sku                 TEXT,
    low_stock_threshold REAL DEFAULT 0,
    created_at          TEXT DEFAULT (datetime('now','localtime'))
  );

  -- Stock movement ledger. Current stock is derived from movements.
  CREATE TABLE IF NOT EXISTS stock_movements (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id         INTEGER NOT NULL,
    movement_type      TEXT NOT NULL, /* in|out|adjust */
    quantity_bags      REAL NOT NULL,
    note                TEXT,

    -- Source linkage for reconciliation (edit/delete)
    source_entity_type TEXT,
    source_entity_id   TEXT,
    source_bag_index   INTEGER,

    created_at          TEXT DEFAULT (datetime('now','localtime'))
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

  // Deduct stock for each bag line inside the cash sale.
  reconcileStockForSaleEntry('cash-sale', info.lastInsertRowid, bags);

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

  // Deduct stock for each bag line inside the debit sale.
  reconcileStockForSaleEntry('debit-sale', info.lastInsertRowid, bags);

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

// ── Read single entries (by id) ─────────────────────────────
function getCashEntryById(id) {
  const row = db.prepare('SELECT * FROM daily_cash_entries WHERE id=?').get(id);
  if (!row) return null;
  return {
    ...row,
    bags: row.bags ? (() => { try { return JSON.parse(row.bags); } catch { return []; } })() : []
  };
}

function getDebitEntryById(id) {
  const row = db.prepare('SELECT * FROM daily_debit_entries WHERE id=?').get(id);
  if (!row) return null;
  return {
    ...row,
    bags: row.bags ? (() => { try { return JSON.parse(row.bags); } catch { return []; } })() : []
  };
}

function getCreditEntryById(id) {
  const row = db.prepare('SELECT * FROM daily_credit_entries WHERE id=?').get(id);
  return row || null;
}

function getExpenseById(id) {
  const row = db.prepare('SELECT * FROM expenses WHERE id=?').get(id);
  return row || null;
}

// ── Update entries (edit-in-place) ──────────────────────────
function updateCashEntryById(id, { date, customerName, amount, bags, note }) {
  const customer = getOrCreateCustomer(customerName);
  const bagsJson = bags ? (typeof bags === 'string' ? bags : JSON.stringify(bags)) : '[]';
  return db.prepare(`
    UPDATE daily_cash_entries
    SET date=?, customer_id=?, customer_name=?, bags=?, amount=?, note=?
    WHERE id=?
  `).run(date, customer.id, customerName, bagsJson, Number(amount), note || '', id);
}

function updateDebitEntryById(id, { date, customerName, amount, bags, note }) {
  const customer = getOrCreateCustomer(customerName);
  const bagsJson = bags ? (typeof bags === 'string' ? bags : JSON.stringify(bags)) : '[]';
  return db.prepare(`
    UPDATE daily_debit_entries
    SET date=?, customer_id=?, customer_name=?, bags=?, amount=?, note=?
    WHERE id=?
  `).run(date, customer.id, customerName, bagsJson, Number(amount), note || '', id);
}

function updateCreditEntryById(id, { date, customerName, amount, note }) {
  const customer = getOrCreateCustomer(customerName);
  return db.prepare(`
    UPDATE daily_credit_entries
    SET date=?, customer_id=?, customer_name=?, amount=?, note=?
    WHERE id=?
  `).run(date, customer.id, customerName, Number(amount), note || '', id);
}

function updateExpenseById(id, { date, amount, category, note }) {
  return db.prepare(`
    UPDATE expenses
    SET date=?, amount=?, category=?, note=?
    WHERE id=?
  `).run(date, Number(amount), category || '', note || '', id);
}

// ── Delete entries (hard delete) ─────────────────────────────
function deleteCashEntryById(id) {
  return db.prepare('DELETE FROM daily_cash_entries WHERE id=?').run(id);
}

function deleteDebitEntryById(id) {
  return db.prepare('DELETE FROM daily_debit_entries WHERE id=?').run(id);
}

function deleteCreditEntryById(id) {
  return db.prepare('DELETE FROM daily_credit_entries WHERE id=?').run(id);
}

function deleteExpenseById(id) {
  return db.prepare('DELETE FROM expenses WHERE id=?').run(id);
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

// ── Audit log ───────────────────────────────────────────────
function logAudit({ action, entityType, entityId, actorUsername, actorRole, before, after }) {
  db.prepare(`
    INSERT INTO audit_log (action, entity_type, entity_id, actor_username, actor_role, before_json, after_json)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    action,
    entityType,
    entityId ?? null,
    actorUsername ?? null,
    actorRole ?? null,
    before == null ? null : JSON.stringify(before),
    after == null ? null : JSON.stringify(after)
  );
}

// Rebuild ledger for a customer from debit+credit tables.
// Keeps ledgers correct after edit/delete operations.
function rebuildCustomerLedger(customerName) {
  const trimmed = (customerName || '').trim();
  if (!trimmed) return;

  const tableName = ensureCustomerLedgerTable(trimmed);
  db.prepare(`DELETE FROM "${tableName}"`).run();

  // Deterministic order: date then id.
  const rows = db.prepare(`
    SELECT date, id, amount, note, 'debit' AS entry_type
    FROM daily_debit_entries
    WHERE customer_name = ?
    UNION ALL
    SELECT date, id, amount, note, 'credit' AS entry_type
    FROM daily_credit_entries
    WHERE customer_name = ?
    ORDER BY date ASC, id ASC
  `).all(trimmed, trimmed);

  let running = 0;
  const insert = db.prepare(`
    INSERT INTO "${tableName}" (date, entry_type, amount, note, running_balance)
    VALUES (?, ?, ?, ?, ?)
  `);

  rows.forEach((r) => {
    const amt = Number(r.amount) || 0;
    if (r.entry_type === 'debit') running += amt;
    if (r.entry_type === 'credit') running -= amt;
    insert.run(r.date, r.entry_type, amt, r.note || '', running);
  });
}

// ── Products + Stock ─────────────────────────────────────────
function getProductByName(name) {
  const trimmed = (name || '').trim();
  if (!trimmed) return null;
  return db.prepare('SELECT * FROM products WHERE name=?').get(trimmed);
}

function getProductById(productId) {
  const idNum = Number(productId);
  if (!Number.isFinite(idNum) || idNum <= 0) return null;
  return db.prepare('SELECT * FROM products WHERE id=?').get(idNum);
}

function createProduct({ name, ratePerBag, size, sku, lowStockThreshold }) {
  const trimmed = (name || '').trim();
  if (!trimmed) throw new Error('Product name required');

  const rate = Number(ratePerBag) || 0;
  const threshold = Number(lowStockThreshold) || 0;

  db.prepare(`
    INSERT OR IGNORE INTO products (name, rate_per_bag, size, sku, low_stock_threshold)
    VALUES (?, ?, ?, ?, ?)
  `).run(trimmed, rate, size || '', sku || '', threshold);

  const product = getProductByName(trimmed);
  if (!product) throw new Error('Failed to create product');
  return product;
}

function getOrCreateProductByBagLine({ bagName, ratePerBag }) {
  const name = (bagName || '').trim();
  if (!name) throw new Error('Bag name required for stock tracking');

  const existing = getProductByName(name);
  if (existing) return existing;

  // Auto-create unknown products so stock tracking still works.
  return createProduct({
    name,
    ratePerBag: ratePerBag ?? 0,
    size: '',
    sku: '',
    lowStockThreshold: 0
  });
}

function deleteStockMovementsForSource(sourceEntityType, sourceEntityId) {
  db.prepare(`
    DELETE FROM stock_movements
    WHERE source_entity_type=? AND source_entity_id=?
  `).run(sourceEntityType, String(sourceEntityId));
}

function reconcileStockForSaleEntry(sourceEntityType, sourceEntityId, bags) {
  // For sales-like entries (cash + debit), deduct stock by bag lines.
  deleteStockMovementsForSource(sourceEntityType, sourceEntityId);

  const bagArray = Array.isArray(bags) ? bags : [];
  if (bagArray.length === 0) return;

  const insertMove = db.prepare(`
    INSERT INTO stock_movements
      (product_id, movement_type, quantity_bags, note, source_entity_type, source_entity_id, source_bag_index)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  bagArray.forEach((b, idx) => {
    const bagName = (b?.bagName || '').trim();
    const qty = Number(b?.numberOfBags) || 0;
    const rate = Number(b?.pricePerBag) || 0;
    if (!bagName || qty <= 0) return;

    const product = getOrCreateProductByBagLine({ bagName, ratePerBag: rate });

    insertMove.run(
      product.id,
      'out',
      qty,
      '',
      sourceEntityType,
      String(sourceEntityId),
      idx
    );
  });
}

function getStockForProduct(productId) {
  const product = getProductById(productId);
  if (!product) return 0;

  const sums = db.prepare(`
    SELECT
      COALESCE(SUM(CASE WHEN movement_type='in' THEN quantity_bags ELSE 0 END),0)  AS in_qty,
      COALESCE(SUM(CASE WHEN movement_type='out' THEN quantity_bags ELSE 0 END),0) AS out_qty
    FROM stock_movements
    WHERE product_id=?
  `).get(product.id);

  return Number(sums?.in_qty || 0) - Number(sums?.out_qty || 0);
}

function getAllProducts() {
  return db.prepare('SELECT * FROM products ORDER BY name ASC').all();
}

function getStockByProductName(name) {
  const product = getProductByName((name || '').trim());
  if (!product) return 0;
  return getStockForProduct(product.id);
}

function getAllProductsWithStock() {
  const products = getAllProducts();
  return products.map(p => ({
    ...p,
    currentStock: getStockForProduct(p.id)
  }));
}

/**
 * Validate stock availability for an array of bag lines.
 * Returns { valid: true } or { valid: false, errors: [...] }
 */
function validateStockForBags(bags) {
  if (!Array.isArray(bags) || bags.length === 0) return { valid: true };

  const errors = [];
  // Aggregate quantities by bag name (in case same bag appears multiple times)
  const qtyByName = {};
  bags.forEach(b => {
    const name = (b?.bagName || '').trim();
    const qty = Number(b?.numberOfBags) || 0;
    if (!name || qty <= 0) return;
    qtyByName[name] = (qtyByName[name] || 0) + qty;
  });

  for (const [name, requiredQty] of Object.entries(qtyByName)) {
    const availableStock = getStockByProductName(name);
    if (availableStock < requiredQty) {
      errors.push({
        bagName: name,
        required: requiredQty,
        available: availableStock
      });
    }
  }

  if (errors.length > 0) return { valid: false, errors };
  return { valid: true };
}

function listLowStockProducts() {
  return db.prepare(`
    SELECT p.*,
      (COALESCE(SUM(CASE WHEN sm.movement_type='in' THEN sm.quantity_bags ELSE 0 END),0) -
       COALESCE(SUM(CASE WHEN sm.movement_type='out' THEN sm.quantity_bags ELSE 0 END),0)
      ) AS current_stock
    FROM products p
    LEFT JOIN stock_movements sm ON sm.product_id = p.id
    GROUP BY p.id
    HAVING p.low_stock_threshold > 0 AND current_stock <= p.low_stock_threshold
    ORDER BY current_stock ASC
  `).all();
}

function addStockMovement({ productId, movementType, quantityBags, note, sourceEntityType, sourceEntityId, sourceBagIndex }) {
  const product = getProductById(productId);
  if (!product) throw new Error('Product not found');

  const movement = String(movementType || '').trim();
  const qty = Number(quantityBags) || 0;
  if (!['in', 'out', 'adjust'].includes(movement)) throw new Error('Invalid movement_type');
  if (qty <= 0) throw new Error('Quantity must be > 0');

  db.prepare(`
    INSERT INTO stock_movements
      (product_id, movement_type, quantity_bags, note, source_entity_type, source_entity_id, source_bag_index)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    product.id,
    movement,
    qty,
    note || '',
    sourceEntityType || null,
    sourceEntityId || null,
    sourceBagIndex == null ? null : Number(sourceBagIndex)
  );

  return true;
}

function getStockMovements({ date, productId } = {}) {
  let sql = `SELECT * FROM stock_movements WHERE 1=1`;
  const params = [];
  if (date) {
    sql += ` AND DATE(created_at) = ?`;
    params.push(date);
  }
  if (productId) {
    sql += ` AND product_id = ?`;
    params.push(Number(productId));
  }
  sql += ` ORDER BY created_at DESC LIMIT 500`;
  return db.prepare(sql).all(...params);
}

// ── One-time backfill for existing data ─────────────────────────────
// If stock_movements is empty, rebuild it from existing cash+debit entries
// so the inventory view starts accurate after upgrade.
try {
  const cntRow = db.prepare('SELECT COUNT(*) as cnt FROM stock_movements').get();
  const cnt = Number(cntRow?.cnt || 0);
  if (cnt === 0) {
    const cashEntries  = db.prepare('SELECT id, bags FROM daily_cash_entries').all();
    const debitEntries = db.prepare('SELECT id, bags FROM daily_debit_entries').all();

    cashEntries.forEach((e) => {
      let bags = [];
      try { bags = e.bags ? JSON.parse(e.bags) : []; } catch { bags = []; }
      reconcileStockForSaleEntry('cash-sale', e.id, bags);
    });
    debitEntries.forEach((e) => {
      let bags = [];
      try { bags = e.bags ? JSON.parse(e.bags) : []; } catch { bags = []; }
      reconcileStockForSaleEntry('debit-sale', e.id, bags);
    });
  }
} catch (err) {
  console.log('Stock backfill:', err.message);
}

module.exports = {
  getOrCreateCustomer,
  getAllCustomers,
  getAllCustomersSummary,
  getCustomerLedger,
  getCustomerBalance,
  logAudit,
  rebuildCustomerLedger,
  // Products + stock
  createProduct,
  getAllProducts,
  getAllProductsWithStock,
  getStockByProductName,
  validateStockForBags,
  listLowStockProducts,
  getStockForProduct,
  reconcileStockForSaleEntry,
  deleteStockMovementsForSource,
  addStockMovement,
  getStockMovements,
  insertCashEntry,
  insertDebitEntry,
  insertCreditEntry,
  insertExpense,
  getCashEntryById,
  getDebitEntryById,
  getCreditEntryById,
  getExpenseById,
  updateCashEntryById,
  updateDebitEntryById,
  updateCreditEntryById,
  updateExpenseById,
  deleteCashEntryById,
  deleteDebitEntryById,
  deleteCreditEntryById,
  deleteExpenseById,
  getCashEntries,
  getDebitEntries,
  getCreditEntries,
  getExpenses,
  getDailySummary,
  getAllDailySummaries,
  updateDailySummary
};