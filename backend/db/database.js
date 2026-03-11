const fs = require('fs');
const path = require('path');

const dbDir = path.join(__dirname);
const dbPath = path.join(__dirname, 'data.json');

// Initialize empty database if not exists
if (!fs.existsSync(dbPath)) {
  const emptyDb = {
    cash_sales: [],
    credit_received: [],
    debit_sales: [],
    expenses: []
  };
  fs.writeFileSync(dbPath, JSON.stringify(emptyDb, null, 2));
}

// Read database
function readDb() {
  const data = fs.readFileSync(dbPath, 'utf8');
  return JSON.parse(data);
}

// Write database
function writeDb(data) {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

// Insert a record
function insert(table, record) {
  const db = readDb();
  const id = Date.now();
  const newRecord = {
    id,
    ...record,
    created_at: new Date().toISOString()
  };
  db[table].push(newRecord);
  writeDb(db);
  return newRecord;
}

// Get all records from a table
function getAll(table) {
  const db = readDb();
  return db[table] || [];
}

// Get records by field value
function getBy(table, field, value) {
  const db = readDb();
  return (db[table] || []).filter(r => r[field] === value);
}

module.exports = { insert, getAll, getBy };