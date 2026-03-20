const express = require('express');
const router = express.Router();
const { insertCreditEntry, getCreditEntries } = require('../db/database');

router.post('/', (req, res) => {
  try {
    const { date, customer_name, customerName, amount, note } = req.body;
    const finalCustomer = (customer_name || customerName || '').trim();
    const finalAmount   = Number(amount) || 0;
    const finalDate     = date || new Date().toISOString().slice(0, 10);
    if (!finalCustomer) return res.status(400).json({ error: 'Customer name required' });
    if (finalAmount <= 0) return res.status(400).json({ error: 'Amount must be > 0' });
    insertCreditEntry(finalDate, finalCustomer, finalAmount, note || '');
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

module.exports = router;