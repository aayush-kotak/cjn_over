const express = require('express');
const router = express.Router();
const {
  insertDebitEntry,
  getDebitEntries,
  getDebitEntryById,
  updateDebitEntryById,
  deleteDebitEntryById,
  updateDailySummary,
  rebuildCustomerLedger,
  logAudit,
  reconcileStockForSaleEntry,
  deleteStockMovementsForSource
} = require('../db/database');

function calcAmountFromBags(bags) {
  return (Array.isArray(bags) ? bags : []).reduce((sum, b) => {
    const qty = Number(b?.numberOfBags) || 0;
    const rate = Number(b?.pricePerBag) || 0;
    return sum + qty * rate;
  }, 0);
}

function normalizeBags(bags) {
  if (!Array.isArray(bags) || bags.length === 0) return { ok: false };
  const normalized = bags.map((b) => {
    const bagName = String(b?.bagName || '').trim();
    const numberOfBags = Number(b?.numberOfBags) || 0;
    const pricePerBag = Number(b?.pricePerBag) || 0;
    return { bagName, numberOfBags, pricePerBag };
  });

  const isValid = normalized.every(b => b.bagName && b.numberOfBags > 0 && b.pricePerBag > 0);
  if (!isValid) return { ok: false };
  return { ok: true, normalized };
}

function requireAdmin(req, res) {
  if (req.user?.role !== 'admin') {
    res.status(403).json({ error: 'Forbidden: admin only' });
    return false;
  }
  return true;
}

router.post('/', (req, res) => {
  try {
    const { date, customer_name, customerName, bags, grandTotal, amount, note } = req.body;
    const finalCustomer = (customer_name || customerName || '').trim();
    const finalDate     = date || new Date().toISOString().slice(0, 10);
    const normalized = normalizeBags(bags || []);
    if (!normalized.ok) return res.status(400).json({ error: 'Invalid bag details' });
    const finalBags  = normalized.normalized;
    const computedAmount = calcAmountFromBags(finalBags);
    if (!finalCustomer) return res.status(400).json({ error: 'Customer name required' });
    if (computedAmount <= 0) return res.status(400).json({ error: 'Amount must be > 0' });
    const info = insertDebitEntry(finalDate, finalCustomer, computedAmount, finalBags, note || '');
    const entryId = info.lastInsertRowid;

    // Trigger reconciliation
    updateDailySummary(finalDate);
    rebuildCustomerLedger(finalCustomer);
    reconcileStockForSaleEntry('debit-sale', entryId, finalBags);

    logAudit({
      action: 'create',
      entityType: 'debit-sale',
      entityId: String(entryId),
      actorUsername: req.user?.username,
      actorRole: req.user?.role,
      before: null,
      after: { date: finalDate, customer_name: finalCustomer, amount: computedAmount, note: note || '', bags: finalBags }
    });

    res.status(201).json({ success: true, message: 'Debit sale saved' });
  } catch (err) {
    console.error('DebitSale Error:', err.message);
    res.status(500).json({ error: 'Failed: ' + err.message });
  }
});

router.get('/', (req, res) => {
  try {
    res.json(getDebitEntries(req.query.date || null));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch' });
  }
});

// ── Admin edit debit entry ─────────────────────────────────
router.put('/:id', (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;
    const entryId = Number(req.params.id);
    if (!Number.isFinite(entryId) || entryId <= 0) return res.status(400).json({ error: 'Invalid id' });

    const oldEntry = getDebitEntryById(entryId);
    if (!oldEntry) return res.status(404).json({ error: 'Entry not found' });

    const { date, customer_name, customerName, bags, note } = req.body;
    const finalCustomer = (customer_name || customerName || '').trim();
    const finalDate = (date || new Date().toISOString().slice(0, 10)).slice(0, 10);

    const normalized = normalizeBags(bags || []);
    if (!finalCustomer) return res.status(400).json({ error: 'Customer name required' });
    if (!normalized.ok) return res.status(400).json({ error: 'Invalid bag details' });

    const finalBags = normalized.normalized;
    const finalAmount = calcAmountFromBags(finalBags);
    if (finalAmount <= 0) return res.status(400).json({ error: 'Amount must be > 0' });

    updateDebitEntryById(entryId, {
      date: finalDate,
      customerName: finalCustomer,
      amount: finalAmount,
      bags: finalBags,
      note: note || ''
    });

    const updated = getDebitEntryById(entryId);
    const affectedDates = Array.from(new Set([oldEntry.date, updated?.date].filter(Boolean)));
    affectedDates.forEach(d => updateDailySummary(d));

    const affectedCustomers = Array.from(new Set([oldEntry.customer_name, updated?.customer_name].filter(Boolean)));
    affectedCustomers.forEach(c => rebuildCustomerLedger(c));

    // Reconcile stock movements for this edited debit sale.
    reconcileStockForSaleEntry('debit-sale', entryId, updated?.bags || []);

    logAudit({
      action: 'update',
      entityType: 'debit-sale',
      entityId: String(entryId),
      actorUsername: req.user?.username,
      actorRole: req.user?.role,
      before: oldEntry,
      after: updated
    });

    res.json({ success: true, entry: updated });
  } catch (err) {
    console.error('DebitSale PUT Error:', err.message);
    res.status(500).json({ error: 'Failed: ' + err.message });
  }
});

// ── Admin delete debit entry ────────────────────────────────
router.delete('/:id', (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;
    const entryId = Number(req.params.id);
    if (!Number.isFinite(entryId) || entryId <= 0) return res.status(400).json({ error: 'Invalid id' });

    const oldEntry = getDebitEntryById(entryId);
    if (!oldEntry) return res.status(404).json({ error: 'Entry not found' });

    deleteDebitEntryById(entryId);

    updateDailySummary(oldEntry.date);
    rebuildCustomerLedger(oldEntry.customer_name);

    // Remove stock movements for this deleted debit sale.
    deleteStockMovementsForSource('debit-sale', entryId);

    logAudit({
      action: 'delete',
      entityType: 'debit-sale',
      entityId: String(entryId),
      actorUsername: req.user?.username,
      actorRole: req.user?.role,
      before: oldEntry,
      after: null
    });

    res.json({ success: true });
  } catch (err) {
    console.error('DebitSale DELETE Error:', err.message);
    res.status(500).json({ error: 'Failed: ' + err.message });
  }
});

module.exports = router;