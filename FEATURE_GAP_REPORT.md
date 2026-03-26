# CJN Website Feature Gap Report

This document records the current feature status of the `cjn_website` project based on the codebase as of March 26, 2026.

## Current Product Position

The app is currently a small authenticated transaction-entry system for a cattle feed shop. It supports:

- Login/logout with token-based session verification
- Cash sale, debit sale, credit received, and expense entry
- Customer ledger tracking with running balances
- Daily summary, day history, and range summary APIs
- Automatic local database backups

It is not yet a full shop-management system with inventory, billing, purchase management, or admin-grade controls.

## Clearly Missing

### Transaction correction

- Edit transaction support is missing.
- Delete transaction support is missing.
- Cancel/reverse transaction workflows are missing.
- There is no correction-safe flow for ledger-affecting records.

### Product and stock management

- No inventory or stock table exists.
- No stock-in or stock-out workflow exists.
- No low-stock alert system exists.
- No product master/catalog exists for bag items.
- Rates and bag names are still entered per transaction instead of from a controlled product list.

### Purchase and supplier workflows

- No supplier master exists.
- No purchase entry workflow exists.
- No inward stock workflow exists.
- No supplier ledger or purchase history exists.

### Billing and business docs

- No printable invoice or receipt system exists.
- No bill number generation exists.
- No PDF or print-ready billing route exists.
- No GST or business billing fields exist in transaction storage.

### Large-data usability

- No search on the records page exists.
- No date, amount, or customer filtering exists across records views.
- No CSV or Excel export exists.
- No pagination exists in the API or UI for large datasets.

### Operations and reliability

- No audit log exists for create/edit/delete actions.
- No restore/import UI exists for backups.
- No automated test suite exists.
- No offline/PWA support exists.

## Partially Present But Weak

### Authentication and security

- Auth exists, but passwords are compared directly from environment variables.
- Sessions are stored in memory only.
- There is no hashed password storage.
- There is no persistent session store.
- There is no cookie-based session model or refresh-token flow.

### Role-based access control

- The app issues `admin` and `viewer` roles.
- Those roles are not meaningfully enforced in backend route permissions.
- The frontend does not hide or lock actions by role.

### Customer management

- Customers exist only as name records.
- There are no phone, address, village, notes, credit-limit, or profile fields.
- There is no dedicated customer profile or customer history screen.

### Analytics and reporting

- Daily summary, day history, and date-range reporting exist.
- There are no weekly or monthly analytics dashboards.
- There are no customer-wise, product-wise, or margin-style reports.
- There are no trend or business-performance views.

### Database process maturity

- Schema bootstrap exists inside the runtime database file.
- A migration script exists, but there is no reliable migration history/version table.
- The project does not yet use a formal migration workflow.

### Validation and error handling

- Routes do basic manual validation.
- There is no dedicated validation library in backend request handling.
- Error responses are inconsistent across endpoints.

### Credit follow-up

- Customer balance calculation exists.
- There is no reminder workflow, due-date model, or outstanding payment alert system.

## Already Present So Not Fully Missing

- Login, logout, and session verification
- Customer ledger and running-balance logic
- Daily summary, day history, and range summary APIs
- Automatic backup creation

These areas still need improvement, but they are not absent.

## Recommended Build Order

1. Transaction edit/delete/reverse support
2. Product catalog and inventory management
3. Customer master upgrade
4. Real role-based restrictions
5. Billing and invoice printing
6. Search, filters, exports, and pagination
7. Auth hardening
8. Audit log, tests, validation, and migrations

## Suggested Implementation Milestones

### Milestone 1: Data correction

- Add transaction IDs to editable views
- Add update and delete endpoints
- Recompute summaries and customer ledgers safely after correction

### Milestone 2: Catalog and stock

- Add `products` table
- Add `inventory_movements` table
- Convert sale bag entries to reference products

### Milestone 3: Customer and billing

- Extend customers schema
- Add invoice numbers and printable invoice UI
- Add GST/business fields only if business usage requires them

### Milestone 4: Admin maturity

- Enforce roles in backend and frontend
- Add audit log
- Add migration/version table
- Add validation library and test suite
