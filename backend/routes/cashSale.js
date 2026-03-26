const express = require('express');
const router = express.Router();
const {
  insertCashEntry,
  getCashEntries,
  getCashEntryById,
  updateCashEntryById,
  deleteCashEntryById,
  updateDailySummary,
  logAudit,
  reconcileStockForSaleEntry,
  deleteStockMovementsForSource,
  validateStockForBags
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

router.post('/', async (req, res) => {
  try {
    const { date, customer_name, bags, grandTotal, amount, note } = req.body;
    const finalCustomer = (customer_name || 'CASH CUSTOMER').trim();
    const finalDate     = date || new Date().toISOString().slice(0, 10);
    const normalized = normalizeBags(bags || []);
    if (!normalized.ok) return res.status(400).json({ error: 'Invalid bag details' });
    const finalBags = normalized.normalized;
    const computedAmount = calcAmountFromBags(finalBags);
    if (computedAmount <= 0) return res.status(400).json({ error: 'Amount must be > 0' });

    // ── Stock validation ──────────────────────────────────────
    const stockCheck = await validateStockForBags(finalBags);
    if (!stockCheck.valid) {
      const msgs = stockCheck.errors.map(e =>
        `"${e.bagName}" — need ${e.required} bags but only ${e.available} available`
      );
      return res.status(400).json({
        error: 'Stock not available! Please order first.',
        stockErrors: stockCheck.errors,
        details: msgs
      });
    }

    const info = await insertCashEntry(finalDate, finalCustomer, computedAmount, finalBags, note || '');
    const entryId = info.lastInsertRowid;

    // Trigger reconciliation
    await updateDailySummary(finalDate);
    await reconcileStockForSaleEntry('cash-sale', entryId, finalBags);

    await logAudit({
      action: 'create',
      entityType: 'cash-sale',
      entityId: String(entryId),
      actorUsername: req.user?.username,
      actorRole: req.user?.role,
      before: null,
      after: { date: finalDate, customer_name: finalCustomer, amount: computedAmount, note: note || '', bags: finalBags }
    });

    res.status(201).json({ success: true, message: 'Cash sale saved' });
  } catch (err) {
    console.error('CashSale Error:', err.message);
    res.status(500).json({ error: 'Failed: ' + err.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const entries = await getCashEntries(req.query.date || null);
    res.json(entries);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch' });
  }
});

// ── Admin edit cash entry ──────────────────────────────────
router.put('/:id', async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;
    const entryId = Number(req.params.id);
    if (!Number.isFinite(entryId) || entryId <= 0) return res.status(400).json({ error: 'Invalid id' });

    const oldEntry = await getCashEntryById(entryId);
    if (!oldEntry) return res.status(404).json({ error: 'Entry not found' });

    const { date, customer_name, customerName, bags, note } = req.body;
    const finalCustomer = (customer_name || customerName || oldEntry.customer_name).trim();
    const finalDate = (date || new Date().toISOString().slice(0, 10)).slice(0, 10);

    const normalized = normalizeBags(bags || []);
    if (!normalized.ok) return res.status(400).json({ error: 'Invalid bag details' });

    const finalBags = normalized.normalized;
    const finalAmount = calcAmountFromBags(finalBags);
    if (finalAmount <= 0) return res.status(400).json({ error: 'Amount must be > 0' });

    await updateCashEntryById(entryId, {
      date: finalDate,
      customerName: finalCustomer,
      amount: finalAmount,
      bags: finalBags,
      note: note || ''
    });

    const updated = await getCashEntryById(entryId);
    const affectedDates = Array.from(new Set([oldEntry.date, updated?.date].filter(Boolean)));
    for (const d of affectedDates) {
      await updateDailySummary(d);
    }

    // Reconcile stock movements for this edited cash sale.
    await reconcileStockForSaleEntry('cash-sale', entryId, updated?.bags || []);

    await logAudit({
      action: 'update',
      entityType: 'cash-sale',
      entityId: String(entryId),
      actorUsername: req.user?.username,
      actorRole: req.user?.role,
      before: oldEntry,
      after: updated
    });

    res.json({ success: true, entry: updated });
  } catch (err) {
    console.error('CashSale PUT Error:', err.message);
    res.status(500).json({ error: 'Failed: ' + err.message });
  }
});

// ── Admin delete cash entry ────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;
    const entryId = Number(req.params.id);
    if (!Number.isFinite(entryId) || entryId <= 0) return res.status(400).json({ error: 'Invalid id' });

    const oldEntry = await getCashEntryById(entryId);
    if (!oldEntry) return res.status(404).json({ error: 'Entry not found' });

    await deleteCashEntryById(entryId);
    await updateDailySummary(oldEntry.date);

    // Remove stock movements for this deleted cash sale.
    await deleteStockMovementsForSource('cash-sale', entryId);

    await logAudit({
      action: 'delete',
      entityType: 'cash-sale',
      entityId: String(entryId),
      actorUsername: req.user?.username,
      actorRole: req.user?.role,
      before: oldEntry,
      after: null
    });

    res.json({ success: true });
  } catch (err) {
    console.error('CashSale DELETE Error:', err.message);
    res.status(500).json({ error: 'Failed: ' + err.message });
  }
});

module.exports = router;