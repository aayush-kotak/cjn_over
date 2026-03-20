# 🐄 CJN PVT LTD — Cattle Feed Shop Management System

A complete, production-ready web application for managing a cattle feed shop (Tiwana Brand).

## Tech Stack

- **Frontend:** React.js + Tailwind CSS v4 + React Router
- **Backend:** Node.js + Express.js
- **Database:** SQLite (via better-sqlite3)

## Features

- 💰 **Cash Sale** — Record cash sales with dynamic bag entries
- 📥 **Credit Received** — Track credit payments from customers
- 📤 **Debit Sale** — Log debit sales against customer accounts  
- 📊 **Today's Summary** — Live dashboard with expenses, labour calc, and day history
- 📁 **All Records** — Customer ledger with debit/credit breakdown
- 🔍 **Searchable Customer Dropdown** — 23 pre-loaded customers
- ✅ **Confirmation Modals** — Review before saving
- 🔔 **Toast Notifications** — Green success, Red error

## Quick Start

### 1. Start the Backend

```bash
cd backend
npm install
npm start
```

Server runs on http://localhost:5000

### 2. Start the Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on http://localhost:5173 (proxied API calls to :5000)

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/cash-sale` | Save cash sale |
| GET | `/api/cash-sale` | Get all cash sales |
| POST | `/api/credit` | Save credit received |
| GET | `/api/credit` | Get all credits |
| POST | `/api/debit-sale` | Save debit sale |
| GET | `/api/debit-sale` | Get all debit sales |
| POST | `/api/expenses` | Save expense |
| GET | `/api/expenses` | Get all expenses |
| GET | `/api/today-summary` | Today's aggregated data |
| GET | `/api/day-history` | Per-day summary history |
| GET | `/api/customer-records/:name` | Customer ledger |

---

© CJN PVT LTD — Tiwana Brand Cattle Feed
"# CJN_web_app" 
