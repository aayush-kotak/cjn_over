const express = require('express');
const router = express.Router();
const db = require('../db/database');

// POST /api/cash-sale — save cash sale entry
router.post('/', (req, res) => {
  try {
    const { bags, grandTotal } = req.body;
    if (!bags || !Array.isArray(bags) || bags.length === 0) {
      return res.status(400).json({ error: 'At least one bag entry is required' });
    }
    if (grandTotal === undefined || grandTotal === null) {
      return res.status(400).json({ error: 'Grand total is required' });
    }

    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const stmt = db.prepare(
      'INSERT INTO cash_sales (bags, grand_total, created_at) VALUES (?, ?, ?)'
    );
    const result = stmt.run(JSON.stringify(bags), grandTotal, now);

    res.status(201).json({ id: result.lastInsertRowid, message: 'Cash sale saved successfully' });
  } catch (err) {
    console.error('Error saving cash sale:', err);
    res.status(500).json({ error: 'Failed to save cash sale' });
  }
});

// GET /api/cash-sale — get all cash sales
router.get('/', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM cash_sales ORDER BY created_at DESC').all();
    const parsed = rows.map(r => ({ ...r, bags: JSON.parse(r.bags) }));
    res.json(parsed);
  } catch (err) {
    console.error('Error fetching cash sales:', err);
    res.status(500).json({ error: 'Failed to fetch cash sales' });
  }
});

module.exports = router;
