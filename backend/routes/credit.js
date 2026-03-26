const express = require('express');
const router = express.Router();
const {
  insertCreditEntry,
  getCreditEntries,
  getCreditEntryById,
  updateCreditEntryById,
  deleteCreditEntryById,
  updateDailySummary,
  rebuildCustomerLedger,
  logAudit
} = require('../db/database');

function requireAdmin(req, res) {
  if (req.user?.role !== 'admin') {
    res.status(403).json({ error: 'Forbidden: admin only' });
    return false;
  }
  return true;
}

router.post('/', (req, res) => {
  try {
    const { date, customer_name, customerName, amount, note } = req.body;
    const finalCustomer = (customer_name || customerName || '').trim();
    const finalAmount   = Number(amount) || 0;
    const finalDate     = date || new Date().toISOString().slice(0, 10);
    if (!finalCustomer) return res.status(400).json({ error: 'Customer name required' });
    if (finalAmount <= 0) return res.status(400).json({ error: 'Amount must be > 0' });

    const info = insertCreditEntry(finalDate, finalCustomer, finalAmount, note || '');
    const entryId = info.lastInsertRowid;

    // Trigger reconciliation
    updateDailySummary(finalDate);
    rebuildCustomerLedger(finalCustomer);

    logAudit({
      action: 'create',
      entityType: 'credit',
      entityId: String(entryId),
      actorUsername: req.user?.username,
      actorRole: req.user?.role,
      before: null,
      after: { date: finalDate, customer_name: finalCustomer, amount: finalAmount, note: note || '' }
    });

    res.status(201).json({ success: true, message: 'Credit saved' });
  } catch (err) {
    console.error('Credit Error:', err.message);
    res.status(500).json({ error: 'Failed: ' + err.message });
  }
});

router.get('/', (req, res) => {
  try {
    res.json(getCreditEntries(req.query.date || null));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch' });
  }
});

// ── Admin edit credit entry ─────────────────────────────────
router.put('/:id', (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;

    const entryId = Number(req.params.id);
    if (!Number.isFinite(entryId) || entryId <= 0) return res.status(400).json({ error: 'Invalid id' });

    const oldEntry = getCreditEntryById(entryId);
    if (!oldEntry) return res.status(404).json({ error: 'Entry not found' });

    const { date, customer_name, customerName, amount, note } = req.body;
    const finalCustomer = (customer_name || customerName || '').trim();
    const finalAmount   = Number(amount) || 0;
    const finalDate     = (date || new Date().toISOString().slice(0, 10)).slice(0, 10);

    if (!finalCustomer) return res.status(400).json({ error: 'Customer name required' });
    if (finalAmount <= 0) return res.status(400).json({ error: 'Amount must be > 0' });

    updateCreditEntryById(entryId, {
      date: finalDate,
      customerName: finalCustomer,
      amount: finalAmount,
      note: note || ''
    });

    const updated = getCreditEntryById(entryId);
    const affectedDates = Array.from(new Set([oldEntry.date, updated?.date].filter(Boolean)));
    affectedDates.forEach(d => updateDailySummary(d));

    const affectedCustomers = Array.from(new Set([oldEntry.customer_name, updated?.customer_name].filter(Boolean)));
    affectedCustomers.forEach(c => rebuildCustomerLedger(c));

    logAudit({
      action: 'update',
      entityType: 'credit',
      entityId: String(entryId),
      actorUsername: req.user?.username,
      actorRole: req.user?.role,
      before: oldEntry,
      after: updated
    });

    res.json({ success: true, entry: updated });
  } catch (err) {
    console.error('Credit PUT Error:', err.message);
    res.status(500).json({ error: 'Failed: ' + err.message });
  }
});

// ── Admin delete credit entry ───────────────────────────────
router.delete('/:id', (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;

    const entryId = Number(req.params.id);
    if (!Number.isFinite(entryId) || entryId <= 0) return res.status(400).json({ error: 'Invalid id' });

    const oldEntry = getCreditEntryById(entryId);
    if (!oldEntry) return res.status(404).json({ error: 'Entry not found' });

    deleteCreditEntryById(entryId);

    updateDailySummary(oldEntry.date);
    rebuildCustomerLedger(oldEntry.customer_name);

    logAudit({
      action: 'delete',
      entityType: 'credit',
      entityId: String(entryId),
      actorUsername: req.user?.username,
      actorRole: req.user?.role,
      before: oldEntry,
      after: null
    });

    res.json({ success: true });
  } catch (err) {
    console.error('Credit DELETE Error:', err.message);
    res.status(500).json({ error: 'Failed: ' + err.message });
  }
});

module.exports = router;