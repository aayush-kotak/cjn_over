# CJN PVT LTD - Cattle Feed Shop Management System

A web application for managing a cattle feed shop with sales entry, customer ledgers, summaries, and authentication.

## Tech Stack

- Frontend: React.js, Vite, React Router
- Backend: Node.js, Express.js
- Database: SQLite via `better-sqlite3`

## Current Features

- Cash sale entry with bag-line details
- Debit sale entry against customer accounts
- Credit received entry
- Expense entry
- Customer ledger tracking
- Daily summary and day history
- Date-range summary API
- Login/logout with token verification
- Automatic local database backups

## Current Gaps

This project supports basic transaction entry, but it is not yet a full business-grade shop management system.

See [FEATURE_GAP_REPORT.md](./FEATURE_GAP_REPORT.md) for:

- accurate missing features
- weak or partial implementations
- recommended build order
- suggested implementation milestones

## Quick Start

### 1. Start the backend

```bash
cd backend
npm install
npm start
```

The backend runs on `http://localhost:5000`.

### 2. Start the frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend runs on `http://localhost:5173`.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/logout` | Logout |
| GET | `/api/auth/verify` | Verify session |
| GET | `/api/customers` | Get customers |
| POST | `/api/customers` | Create customer |
| GET | `/api/cash-sale` | Get cash sales |
| POST | `/api/cash-sale` | Save cash sale |
| GET | `/api/debit-sale` | Get debit sales |
| POST | `/api/debit-sale` | Save debit sale |
| GET | `/api/credit` | Get credits |
| POST | `/api/credit` | Save credit |
| GET | `/api/expenses` | Get expenses |
| POST | `/api/expenses` | Save expense |
| GET | `/api/summary/today-summary` | Today summary |
| GET | `/api/summary/day-history` | Day history |
| GET | `/api/summary/all-customers` | Customer balances |
| GET | `/api/summary/customer-records/:name` | Customer ledger |
| GET | `/api/summary/range` | Date-range summary |
