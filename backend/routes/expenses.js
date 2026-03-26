const express = require('express');
const router = express.Router();
const {
  insertExpense,
  getExpenses,
  getExpenseById,
  updateExpenseById,
  deleteExpenseById,
  updateDailySummary,
  logAudit
} = require('../db/database');

function requireAdmin(req, res) {
  if (req.user?.role !== 'admin') {
    res.status(403).json({ error: 'Forbidden: admin only' });
    return false;
  }
  return true;
}

router.post('/', async (req, res) => {
  try {
    const { date, amount, category, note, description } = req.body;
    const finalDate     = date || new Date().toISOString().slice(0, 10);
    const finalAmount   = Number(amount) || 0;
    const finalCategory = category || description || note || 'Expense';
    if (finalAmount <= 0) return res.status(400).json({ error: 'Amount must be > 0' });

    const info = await insertExpense(finalDate, finalAmount, finalCategory, note || finalCategory);
    const entryId = info.lastInsertRowid;

    // Trigger reconciliation
    await updateDailySummary(finalDate);

    await logAudit({
      action: 'create',
      entityType: 'expenses',
      entityId: String(entryId),
      actorUsername: req.user?.username,
      actorRole: req.user?.role,
      before: null,
      after: { date: finalDate, amount: finalAmount, category: finalCategory, note: note || finalCategory }
    });

    res.status(201).json({ success: true, message: 'Expense saved' });
  } catch (err) {
    console.error('Expense Error:', err.message);
    res.status(500).json({ error: 'Failed: ' + err.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const entries = await getExpenses(req.query.date || null);
    res.json(entries);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch' });
  }
});

// ── Admin edit expense entry ───────────────────────────────
router.put('/:id', async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;

    const entryId = Number(req.params.id);
    if (!Number.isFinite(entryId) || entryId <= 0) return res.status(400).json({ error: 'Invalid id' });

    const oldEntry = await getExpenseById(entryId);
    if (!oldEntry) return res.status(404).json({ error: 'Entry not found' });

    const { date, amount, category, note, description } = req.body;
    const finalDate     = (date || new Date().toISOString().slice(0, 10)).slice(0, 10);
    const finalAmount   = Number(amount) || 0;
    const finalCategory = category || description || note || oldEntry.category || 'Expense';

    if (finalAmount <= 0) return res.status(400).json({ error: 'Amount must be > 0' });

    await updateExpenseById(entryId, {
      date: finalDate,
      amount: finalAmount,
      category: finalCategory,
      note: note || oldEntry.note || finalCategory
    });

    const updated = await getExpenseById(entryId);
    const affectedDates = Array.from(new Set([oldEntry.date, updated?.date].filter(Boolean)));
    for (const d of affectedDates) {
      await updateDailySummary(d);
    }

    await logAudit({
      action: 'update',
      entityType: 'expenses',
      entityId: String(entryId),
      actorUsername: req.user?.username,
      actorRole: req.user?.role,
      before: oldEntry,
      after: updated
    });

    res.json({ success: true, entry: updated });
  } catch (err) {
    console.error('Expense PUT Error:', err.message);
    res.status(500).json({ error: 'Failed: ' + err.message });
  }
});

// ── Admin delete expense entry ──────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;

    const entryId = Number(req.params.id);
    if (!Number.isFinite(entryId) || entryId <= 0) return res.status(400).json({ error: 'Invalid id' });

    const oldEntry = await getExpenseById(entryId);
    if (!oldEntry) return res.status(404).json({ error: 'Entry not found' });

    await deleteExpenseById(entryId);
    await updateDailySummary(oldEntry.date);

    await logAudit({
      action: 'delete',
      entityType: 'expenses',
      entityId: String(entryId),
      actorUsername: req.user?.username,
      actorRole: req.user?.role,
      before: oldEntry,
      after: null
    });

    res.json({ success: true });
  } catch (err) {
    console.error('Expense DELETE Error:', err.message);
    res.status(500).json({ error: 'Failed: ' + err.message });
  }
});

module.exports = router;