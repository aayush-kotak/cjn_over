const express = require('express');
const router = express.Router();
const db = require('../db/database');

// POST /api/credit — save credit received
router.post('/', (req, res) => {
  try {
    const { customerName, amount, note } = req.body;
    if (!customerName || !amount) {
      return res.status(400).json({ error: 'Customer name and amount are required' });
    }

    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const stmt = db.prepare(
      'INSERT INTO credit_received (customer_name, amount, note, created_at) VALUES (?, ?, ?, ?)'
    );
    const result = stmt.run(customerName, amount, note || '', now);

    res.status(201).json({ id: result.lastInsertRowid, message: 'Credit received saved successfully' });
  } catch (err) {
    console.error('Error saving credit:', err);
    res.status(500).json({ error: 'Failed to save credit' });
  }
});

// GET /api/credit — get all credit entries
router.get('/', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM credit_received ORDER BY created_at DESC').all();
    res.json(rows);
  } catch (err) {
    console.error('Error fetching credits:', err);
    res.status(500).json({ error: 'Failed to fetch credits' });
  }
});

module.exports = router;
