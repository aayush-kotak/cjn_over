const express = require('express');
const router = express.Router();
const db = require('../db/database');

// POST /api/debit-sale — save debit sale entry
router.post('/', (req, res) => {
  try {
    const { customerName, bags, grandTotal } = req.body;
    if (!customerName) {
      return res.status(400).json({ error: 'Customer name is required' });
    }
    if (!bags || !Array.isArray(bags) || bags.length === 0) {
      return res.status(400).json({ error: 'At least one bag entry is required' });
    }
    if (grandTotal === undefined || grandTotal === null) {
      return res.status(400).json({ error: 'Grand total is required' });
    }

    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const stmt = db.prepare(
      'INSERT INTO debit_sales (customer_name, bags, grand_total, created_at) VALUES (?, ?, ?, ?)'
    );
    const result = stmt.run(customerName, JSON.stringify(bags), grandTotal, now);

    res.status(201).json({ id: result.lastInsertRowid, message: 'Debit sale saved successfully' });
  } catch (err) {
    console.error('Error saving debit sale:', err);
    res.status(500).json({ error: 'Failed to save debit sale' });
  }
});

// GET /api/debit-sale — get all debit sales
router.get('/', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM debit_sales ORDER BY created_at DESC').all();
    const parsed = rows.map(r => ({ ...r, bags: JSON.parse(r.bags) }));
    res.json(parsed);
  } catch (err) {
    console.error('Error fetching debit sales:', err);
    res.status(500).json({ error: 'Failed to fetch debit sales' });
  }
});

module.exports = router;
