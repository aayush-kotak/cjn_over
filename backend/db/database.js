const { createClient } = require('@libsql/client');
const dotenv = require('dotenv');

dotenv.config();

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

/**
 * Initialize Tables (Async)
 */
async function initDatabase() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS customers (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT NOT NULL UNIQUE,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS daily_cash_entries (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      date          TEXT NOT NULL,
      customer_id   INTEGER,
      customer_name TEXT,
      bags          TEXT DEFAULT '[]',
      amount        REAL NOT NULL,
      note          TEXT,
      created_at    TEXT DEFAULT (datetime('now','localtime'))
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS daily_debit_entries (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      date          TEXT NOT NULL,
      customer_id   INTEGER,
      customer_name TEXT,
      bags          TEXT DEFAULT '[]',
      amount        REAL NOT NULL,
      note          TEXT,
      created_at    TEXT DEFAULT (datetime('now','localtime'))
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS daily_credit_entries (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      date          TEXT NOT NULL,
      customer_id   INTEGER,
      customer_name TEXT,
      amount        REAL NOT NULL,
      note          TEXT,
      created_at    TEXT DEFAULT (datetime('now','localtime'))
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS daily_summary (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      date           TEXT NOT NULL UNIQUE,
      total_cash     REAL DEFAULT 0,
      total_debit    REAL DEFAULT 0,
      total_credit   REAL DEFAULT 0,
      total_expenses REAL DEFAULT 0,
      net_balance    REAL DEFAULT 0,
      updated_at     TEXT DEFAULT (datetime('now','localtime'))
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS expenses (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      date       TEXT NOT NULL,
      amount     REAL NOT NULL,
      category   TEXT,
      note       TEXT,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS audit_log (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      action          TEXT NOT NULL,
      entity_type     TEXT NOT NULL,
      entity_id       TEXT,
      actor_username  TEXT,
      actor_role      TEXT,
      before_json     TEXT,
      after_json      TEXT,
      created_at      TEXT DEFAULT (datetime('now','localtime'))
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS products (
      id                  INTEGER PRIMARY KEY AUTOINCREMENT,
      name                TEXT NOT NULL UNIQUE,
      rate_per_bag        REAL DEFAULT 0,
      size                TEXT,
      sku                 TEXT,
      low_stock_threshold REAL DEFAULT 0,
      created_at          TEXT DEFAULT (datetime('now','localtime'))
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS stock_movements (
      id                  INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id         INTEGER NOT NULL,
      movement_type      TEXT NOT NULL,
      quantity_bags      REAL NOT NULL,
      note                TEXT,
      source_entity_type TEXT,
      source_entity_id   TEXT,
      source_bag_index   INTEGER,
      created_at          TEXT DEFAULT (datetime('now','localtime'))
    )
  `);
}

// ── Helpers ──────────────────────────────────────────────────
function sanitizeTableName(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

async function ensureCustomerLedgerTable(customerName) {
  const safeName  = sanitizeTableName(customerName);
  const tableName = `ledger_${safeName}`;
  await db.execute(`
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

// ── Customer Functions ─────────────────────────────────────────
async function getOrCreateCustomer(name) {
  const trimmed = (name || 'UNKNOWN').trim();
  await db.execute({
    sql: 'INSERT OR IGNORE INTO customers (name) VALUES (?)',
    args: [trimmed]
  });
  const res = await db.execute({
    sql: 'SELECT * FROM customers WHERE name=?',
    args: [trimmed]
  });
  const customer = res.rows[0];
  await ensureCustomerLedgerTable(trimmed);
  return customer;
}

async function getAllCustomers() {
  const res = await db.execute('SELECT * FROM customers ORDER BY name ASC');
  return res.rows;
}

async function getAllCustomersSummary() {
  const customers = await getAllCustomers();
  const summary = [];
  for (const c of customers) {
    const tableName = await ensureCustomerLedgerTable(c.name);
    const debitRes = await db.execute(`SELECT COALESCE(SUM(amount),0) as t FROM "${tableName}" WHERE entry_type='debit'`);
    const creditRes = await db.execute(`SELECT COALESCE(SUM(amount),0) as t FROM "${tableName}" WHERE entry_type='credit'`);
    const balance = await getCustomerBalance(c.name);
    
    summary.push({
      id: c.id,
      name: c.name,
      total_debit: Number(debitRes.rows[0].t),
      total_credit: Number(creditRes.rows[0].t),
      balance
    });
  }
  return summary;
}

async function getCustomerLedger(customerName) {
  try {
    const tableName = await ensureCustomerLedgerTable(customerName);
    const res = await db.execute(`SELECT * FROM "${tableName}" ORDER BY id ASC`);
    return res.rows;
  } catch(e) { return []; }
}

async function getCustomerBalance(customerName) {
  try {
    const tableName = await ensureCustomerLedgerTable(customerName);
    const res = await db.execute(`SELECT running_balance FROM "${tableName}" ORDER BY id DESC LIMIT 1`);
    return res.rows[0] ? (Number(res.rows[0].running_balance) || 0) : 0;
  } catch(e) { return 0; }
}

async function rebuildCustomerLedger(customerName) {
  const trimmed = (customerName || '').trim();
  if (!trimmed) return;

  const tableName = await ensureCustomerLedgerTable(trimmed);
  await db.execute(`DELETE FROM "${tableName}"`);

  const res = await db.execute({
    sql: `
      SELECT date, id, amount, note, 'debit' AS entry_type FROM daily_debit_entries WHERE customer_name = ?
      UNION ALL
      SELECT date, id, amount, note, 'credit' AS entry_type FROM daily_credit_entries WHERE customer_name = ?
      ORDER BY date ASC, id ASC
    `,
    args: [trimmed, trimmed]
  });

  let running = 0;
  for (const r of res.rows) {
    const amt = Number(r.amount) || 0;
    if (r.entry_type === 'debit') running += amt;
    if (r.entry_type === 'credit') running -= amt;
    
    await db.execute({
      sql: `INSERT INTO "${tableName}" (date, entry_type, amount, note, running_balance) VALUES (?, ?, ?, ?, ?)`,
      args: [r.date, r.entry_type, amt, r.note || '', running]
    });
  }
}

// ── Daily Entry Functions ──────────────────────────────────────
async function updateDailySummary(date) {
  const cashRes = await db.execute({ sql: 'SELECT COALESCE(SUM(amount),0) as total FROM daily_cash_entries WHERE date=?', args: [date] });
  const debitRes = await db.execute({ sql: 'SELECT COALESCE(SUM(amount),0) as total FROM daily_debit_entries WHERE date=?', args: [date] });
  const creditRes = await db.execute({ sql: 'SELECT COALESCE(SUM(amount),0) as total FROM daily_credit_entries WHERE date=?', args: [date] });
  const expenseRes = await db.execute({ sql: 'SELECT COALESCE(SUM(amount),0) as total FROM expenses WHERE date=?', args: [date] });

  const cash = Number(cashRes.rows[0].total);
  const debit = Number(debitRes.rows[0].total);
  const credit = Number(creditRes.rows[0].total);
  const expense = Number(expenseRes.rows[0].total);
  const net = cash + credit - expense;

  await db.execute({
    sql: `
      INSERT INTO daily_summary (date, total_cash, total_debit, total_credit, total_expenses, net_balance, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now','localtime'))
      ON CONFLICT(date) DO UPDATE SET
        total_cash=excluded.total_cash,
        total_debit=excluded.total_debit,
        total_credit=excluded.total_credit,
        total_expenses=excluded.total_expenses,
        net_balance=excluded.net_balance,
        updated_at=excluded.updated_at
    `,
    args: [date, cash, debit, credit, expense, net]
  });
}

async function insertCashEntry(date, customerName, amount, bags, note) {
  const customer = await getOrCreateCustomer(customerName);
  const bagsJson = bags ? (typeof bags === 'string' ? bags : JSON.stringify(bags)) : '[]';
  const res = await db.execute({
    sql: 'INSERT INTO daily_cash_entries (date, customer_id, customer_name, bags, amount, note) VALUES (?, ?, ?, ?, ?, ?)',
    args: [date, customer.id, customerName, bagsJson, Number(amount), note || '']
  });

  const entryId = res.lastInsertRowid;
  await reconcileStockForSaleEntry('cash-sale', entryId, bags);
  await updateDailySummary(date);
  return { lastInsertRowid: entryId };
}

async function insertDebitEntry(date, customerName, amount, bags, note) {
  const customer = await getOrCreateCustomer(customerName);
  const bagsJson = bags ? (typeof bags === 'string' ? bags : JSON.stringify(bags)) : '[]';
  const res = await db.execute({
    sql: 'INSERT INTO daily_debit_entries (date, customer_id, customer_name, bags, amount, note) VALUES (?, ?, ?, ?, ?, ?)',
    args: [date, customer.id, customerName, bagsJson, Number(amount), note || '']
  });

  const entryId = res.lastInsertRowid;
  await reconcileStockForSaleEntry('debit-sale', entryId, bags);
  await insertLedgerEntry(customerName, date, 'debit', Number(amount), note || '');
  await updateDailySummary(date);
  return { lastInsertRowid: entryId };
}

async function insertLedgerEntry(customerName, date, entryType, amount, note) {
  const tableName = await ensureCustomerLedgerTable(customerName);
  const res = await db.execute(`SELECT running_balance FROM "${tableName}" ORDER BY id DESC LIMIT 1`);
  const prev = res.rows[0] ? (Number(res.rows[0].running_balance) || 0) : 0;
  const newBal = entryType === 'debit' ? prev + amount : entryType === 'credit' ? prev - amount : prev;
  await db.execute({
    sql: `INSERT INTO "${tableName}" (date, entry_type, amount, note, running_balance) VALUES (?, ?, ?, ?, ?)`,
    args: [date, entryType, amount, note || '', newBal]
  });
}

async function insertCreditEntry(date, customerName, amount, note) {
  const customer = await getOrCreateCustomer(customerName);
  const res = await db.execute({
    sql: 'INSERT INTO daily_credit_entries (date, customer_id, customer_name, amount, note) VALUES (?, ?, ?, ?, ?)',
    args: [date, customer.id, customerName, Number(amount), note || '']
  });
  await insertLedgerEntry(customerName, date, 'credit', Number(amount), note || '');
  await updateDailySummary(date);
  return { lastInsertRowid: res.lastInsertRowid };
}

async function insertExpense(date, amount, category, note) {
  const res = await db.execute({
    sql: 'INSERT INTO expenses (date, amount, category, note) VALUES (?, ?, ?, ?)',
    args: [date, Number(amount), category || '', note || '']
  });
  await updateDailySummary(date);
  return { lastInsertRowid: res.lastInsertRowid };
}

// ── GET Functions ─────────────────────────────────────────────
async function getCashEntries(date) {
  const res = date 
    ? await db.execute({ sql: 'SELECT * FROM daily_cash_entries WHERE date=? ORDER BY id DESC', args: [date] })
    : await db.execute('SELECT * FROM daily_cash_entries ORDER BY date DESC, id DESC');
  return res.rows.map(r => ({
    ...r,
    bags: r.bags ? (() => { try { return JSON.parse(r.bags); } catch { return []; } })() : []
  }));
}

async function getCashEntryById(id) {
  const res = await db.execute({ sql: 'SELECT * FROM daily_cash_entries WHERE id=?', args: [id] });
  const row = res.rows[0];
  if (!row) return null;
  return {
    ...row,
    bags: row.bags ? (() => { try { return JSON.parse(row.bags); } catch { return []; } })() : []
  };
}

async function getDebitEntries(date) {
  const res = date 
    ? await db.execute({ sql: 'SELECT * FROM daily_debit_entries WHERE date=? ORDER BY id DESC', args: [date] })
    : await db.execute('SELECT * FROM daily_debit_entries ORDER BY date DESC, id DESC');
  return res.rows.map(r => ({
    ...r,
    bags: r.bags ? (() => { try { return JSON.parse(r.bags); } catch { return []; } })() : []
  }));
}

async function getDebitEntryById(id) {
  const res = await db.execute({ sql: 'SELECT * FROM daily_debit_entries WHERE id=?', args: [id] });
  const row = res.rows[0];
  if (!row) return null;
  return {
    ...row,
    bags: row.bags ? (() => { try { return JSON.parse(row.bags); } catch { return []; } })() : []
  };
}

async function getCreditEntries(date) {
  const res = date
    ? await db.execute({ sql: 'SELECT * FROM daily_credit_entries WHERE date=? ORDER BY id DESC', args: [date] })
    : await db.execute('SELECT * FROM daily_credit_entries ORDER BY date DESC, id DESC');
  return res.rows;
}

async function getCreditEntryById(id) {
  const res = await db.execute({ sql: 'SELECT * FROM daily_credit_entries WHERE id=?', args: [id] });
  return res.rows[0] || null;
}

async function getExpenses(date) {
  const res = date 
    ? await db.execute({ sql: 'SELECT * FROM expenses WHERE date=? ORDER BY id DESC', args: [date] })
    : await db.execute('SELECT * FROM expenses ORDER BY date DESC, id DESC');
  return res.rows;
}

async function getExpenseById(id) {
  const res = await db.execute({ sql: 'SELECT * FROM expenses WHERE id=?', args: [id] });
  return res.rows[0] || null;
}

async function getDailySummary(date) {
  const res = await db.execute({ sql: 'SELECT * FROM daily_summary WHERE date=?', args: [date] });
  return res.rows[0] || {
    date, total_cash: 0, total_debit: 0, total_credit: 0, total_expenses: 0, net_balance: 0
  };
}

async function getAllDailySummaries() {
  const res = await db.execute('SELECT * FROM daily_summary ORDER BY date DESC');
  return res.rows;
}

// ── Update Functions ──────────────────────────────────────────
async function updateCashEntryById(id, { date, customerName, amount, bags, note }) {
  const customer = await getOrCreateCustomer(customerName);
  const bagsJson = bags ? (typeof bags === 'string' ? bags : JSON.stringify(bags)) : '[]';
  await db.execute({
    sql: 'UPDATE daily_cash_entries SET date=?, customer_id=?, customer_name=?, bags=?, amount=?, note=? WHERE id=?',
    args: [date, customer.id, customerName, bagsJson, Number(amount), note || '', id]
  });
}

async function updateDebitEntryById(id, { date, customerName, amount, bags, note }) {
  const customer = await getOrCreateCustomer(customerName);
  const bagsJson = bags ? (typeof bags === 'string' ? bags : JSON.stringify(bags)) : '[]';
  await db.execute({
    sql: 'UPDATE daily_debit_entries SET date=?, customer_id=?, customer_name=?, bags=?, amount=?, note=? WHERE id=?',
    args: [date, customer.id, customerName, bagsJson, Number(amount), note || '', id]
  });
}

async function updateCreditEntryById(id, { date, customerName, amount, note }) {
  const customer = await getOrCreateCustomer(customerName);
  await db.execute({
    sql: 'UPDATE daily_credit_entries SET date=?, customer_id=?, customer_name=?, amount=?, note=? WHERE id=?',
    args: [date, customer.id, customerName, Number(amount), note || '', id]
  });
}

async function updateExpenseById(id, { date, amount, category, note }) {
  await db.execute({
    sql: 'UPDATE expenses SET date=?, amount=?, category=?, note=? WHERE id=?',
    args: [date, Number(amount), category || '', note || '', id]
  });
}

// ── Delete Functions ─────────────────────────────────────────
async function deleteCashEntryById(id) {
  await db.execute({ sql: 'DELETE FROM daily_cash_entries WHERE id=?', args: [id] });
}

async function deleteDebitEntryById(id) {
  await db.execute({ sql: 'DELETE FROM daily_debit_entries WHERE id=?', args: [id] });
}

async function deleteCreditEntryById(id) {
  await db.execute({ sql: 'DELETE FROM daily_credit_entries WHERE id=?', args: [id] });
}

async function deleteExpenseById(id) {
  await db.execute({ sql: 'DELETE FROM expenses WHERE id=?', args: [id] });
}

// ── Audit Log ────────────────────────────────────────────────
async function logAudit({ action, entityType, entityId, actorUsername, actorRole, before, after }) {
  await db.execute({
    sql: `INSERT INTO audit_log (action, entity_type, entity_id, actor_username, actor_role, before_json, after_json)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [
      action,
      entityType,
      entityId ?? null,
      actorUsername ?? null,
      actorRole ?? null,
      before == null ? null : JSON.stringify(before),
      after == null ? null : JSON.stringify(after)
    ]
  });
}

// ── Products & Stock ─────────────────────────────────────────
async function getProductByName(name) {
  const trimmed = (name || '').trim();
  if (!trimmed) return null;
  const res = await db.execute({ sql: 'SELECT * FROM products WHERE name=?', args: [trimmed] });
  return res.rows[0] || null;
}

async function getProductById(productId) {
  const res = await db.execute({ sql: 'SELECT * FROM products WHERE id=?', args: [Number(productId)] });
  return res.rows[0] || null;
}

async function createProduct({ name, ratePerBag, size, sku, lowStockThreshold }) {
  const trimmed = (name || '').trim();
  if (!trimmed) throw new Error('Product name required');
  await db.execute({
    sql: 'INSERT OR IGNORE INTO products (name, rate_per_bag, size, sku, low_stock_threshold) VALUES (?, ?, ?, ?, ?)',
    args: [trimmed, Number(ratePerBag) || 0, size || '', sku || '', Number(lowStockThreshold) || 0]
  });
  return await getProductByName(trimmed);
}

async function getOrCreateProductByBagLine({ bagName, ratePerBag }) {
  const existing = await getProductByName(bagName);
  if (existing) return existing;
  return await createProduct({ name: bagName, ratePerBag });
}

async function deleteStockMovementsForSource(sourceEntityType, sourceEntityId) {
  await db.execute({
    sql: 'DELETE FROM stock_movements WHERE source_entity_type=? AND source_entity_id=?',
    args: [sourceEntityType, String(sourceEntityId)]
  });
}

async function reconcileStockForSaleEntry(sourceEntityType, sourceEntityId, bags) {
  await deleteStockMovementsForSource(sourceEntityType, sourceEntityId);
  const bagArray = Array.isArray(bags) ? bags : [];
  for (let idx = 0; idx < bagArray.length; idx++) {
    const b = bagArray[idx];
    const qty = Number(b?.numberOfBags) || 0;
    if (!b?.bagName || qty <= 0) continue;
    const product = await getOrCreateProductByBagLine({ bagName: b.bagName, ratePerBag: b.pricePerBag });
    await db.execute({
      sql: `INSERT INTO stock_movements (product_id, movement_type, quantity_bags, note, source_entity_type, source_entity_id, source_bag_index)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [product.id, 'out', qty, '', sourceEntityType, String(sourceEntityId), idx]
    });
  }
}

async function getStockForProduct(productId) {
  const res = await db.execute({
    sql: `SELECT 
            COALESCE(SUM(CASE WHEN movement_type='in' THEN quantity_bags ELSE 0 END),0) -
            COALESCE(SUM(CASE WHEN movement_type='out' THEN quantity_bags ELSE 0 END),0) as stock
          FROM stock_movements WHERE product_id=?`,
    args: [productId]
  });
  return Number(res.rows[0]?.stock || 0);
}

async function getAllProducts() {
  const res = await db.execute('SELECT * FROM products ORDER BY name ASC');
  return res.rows;
}

async function getStockByProductName(name) {
  const p = await getProductByName(name);
  return p ? await getStockForProduct(p.id) : 0;
}

async function getAllProductsWithStock() {
  const products = await getAllProducts();
  const result = [];
  for (const p of products) {
    result.push({ ...p, currentStock: await getStockForProduct(p.id) });
  }
  return result;
}

async function validateStockForBags(bags) {
  if (!Array.isArray(bags)) return { valid: true };
  const qtyByName = {};
  bags.forEach(b => {
    const name = (b?.bagName || '').trim();
    if (name) qtyByName[name] = (qtyByName[name] || 0) + (Number(b.numberOfBags) || 0);
  });
  const errors = [];
  for (const [name, req] of Object.entries(qtyByName)) {
    const available = await getStockByProductName(name);
    if (available < req) errors.push({ bagName: name, required: req, available });
  }
  return errors.length > 0 ? { valid: false, errors } : { valid: true };
}

async function listLowStockProducts() {
  // This is a complex query, simpler to just fetch all and filter for now given Turso constraints
  const all = await getAllProductsWithStock();
  return all.filter(p => p.low_stock_threshold > 0 && p.currentStock <= p.low_stock_threshold);
}

async function addStockMovement({ productId, movementType, quantityBags, note, sourceEntityType, sourceEntityId, sourceBagIndex }) {
  await db.execute({
    sql: `INSERT INTO stock_movements (product_id, movement_type, quantity_bags, note, source_entity_type, source_entity_id, source_bag_index)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [productId, movementType, quantityBags, note || '', sourceEntityType || null, sourceEntityId || null, sourceBagIndex || null]
  });
}

async function getStockMovements({ date, productId } = {}) {
  let sql = 'SELECT * FROM stock_movements WHERE 1=1';
  const args = [];
  if (date) { sql += ' AND DATE(created_at) = ?'; args.push(date); }
  if (productId) { sql += ' AND product_id = ?'; args.push(productId); }
  sql += ' ORDER BY created_at DESC LIMIT 500';
  const res = await db.execute({ sql, args });
  return res.rows;
}

module.exports = {
  db, // Export client for transactions if needed
  initDatabase,
  getOrCreateCustomer,
  getAllCustomers,
  getAllCustomersSummary,
  getCustomerLedger,
  getCustomerBalance,
  logAudit,
  rebuildCustomerLedger,
  createProduct,
  getProductByName,
  getProductById,
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