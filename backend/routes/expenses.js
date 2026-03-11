const express = require('express');
const router = express.Router();
const db = require('../db/database');

// POST /api/expenses — save daily expense
router.post('/', (req, res) => {
  try {
    const { description, amount } = req.body;
    if (!description || !amount) {
      return res.status(400).json({ error: 'Description and amount are required' });
    }

    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const stmt = db.prepare(
      'INSERT INTO expenses (description, amount, created_at) VALUES (?, ?, ?)'
    );
    const result = stmt.run(description, amount, now);

    res.status(201).json({ id: result.lastInsertRowid, message: 'Expense saved successfully' });
  } catch (err) {
    console.error('Error saving expense:', err);
    res.status(500).json({ error: 'Failed to save expense' });
  }
});

// GET /api/expenses — get all expenses
router.get('/', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM expenses ORDER BY created_at DESC').all();
    res.json(rows);
  } catch (err) {
    console.error('Error fetching expenses:', err);
    res.status(500).json({ error: 'Failed to fetch expenses' });
  }
});

module.exports = router;
