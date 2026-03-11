// const Database = require('better-sqlite3');
// const path = require('path');

// const dbPath = process.env.DATABASE_PATH || path.join(__dirname, 'cjn.db');
// const db = new Database(dbPath);

// // Enable WAL mode for better performance
// db.pragma('journal_mode = WAL');

// // Create tables
// db.exec(`
//   CREATE TABLE IF NOT EXISTS cash_sales (
//     id INTEGER PRIMARY KEY AUTOINCREMENT,
//     bags TEXT NOT NULL,
//     grand_total REAL NOT NULL,
//     created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
//   );

//   CREATE TABLE IF NOT EXISTS credit_received (
//     id INTEGER PRIMARY KEY AUTOINCREMENT,
//     customer_name TEXT NOT NULL,
//     amount REAL NOT NULL,
//     note TEXT,
//     created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
//   );

//   CREATE TABLE IF NOT EXISTS debit_sales (
//     id INTEGER PRIMARY KEY AUTOINCREMENT,
//     customer_name TEXT NOT NULL,
//     bags TEXT NOT NULL,
//     grand_total REAL NOT NULL,
//     created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
//   );

//   CREATE TABLE IF NOT EXISTS expenses (
//     id INTEGER PRIMARY KEY AUTOINCREMENT,
//     description TEXT NOT NULL,
//     amount REAL NOT NULL,
//     created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
//   );
// `);

// module.exports = db;



const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Create db directory if it doesn't exist
const dbDir = path.join(__dirname);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(__dirname, 'cjn.db');
const db = new Database(dbPath);

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS cash_sales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bags TEXT NOT NULL,
    total_amount REAL NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS credit_received (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_name TEXT NOT NULL,
    amount REAL NOT NULL,
    note TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS debit_sales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_name TEXT NOT NULL,
    bags TEXT NOT NULL,
    total_amount REAL NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    description TEXT NOT NULL,
    amount REAL NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

module.exports = db;