const express = require('express');
const router = express.Router();
const { insertExpense, getExpenses } = require('../db/database');

router.post('/', (req, res) => {
  try {
    const { date, amount, category, note, description } = req.body;
    const finalDate     = date || new Date().toISOString().slice(0, 10);
    const finalAmount   = Number(amount) || 0;
    const finalCategory = category || description || note || 'Expense';
    if (finalAmount <= 0) return res.status(400).json({ error: 'Amount must be > 0' });
    insertExpense(finalDate, finalAmount, finalCategory, note || finalCategory);
    res.status(201).json({ success: true, message: 'Expense saved' });
  } catch (err) {
    console.error('Expense Error:', err.message);
    res.status(500).json({ error: 'Failed: ' + err.message });
  }
});

router.get('/', (req, res) => {
  try {
    res.json(getExpenses(req.query.date || null));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch' });
  }
});

module.exports = router;