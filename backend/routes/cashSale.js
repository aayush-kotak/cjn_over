const express = require('express');
const router = express.Router();
const { insertCashEntry, getCashEntries } = require('../db/database');

router.post('/', (req, res) => {
  try {
    const { date, customer_name, bags, grandTotal, amount, note } = req.body;
    const finalAmount   = Number(grandTotal) || Number(amount) || 0;
    const finalCustomer = (customer_name || 'CASH CUSTOMER').trim();
    const finalDate     = date || new Date().toISOString().slice(0, 10);
    if (finalAmount <= 0) return res.status(400).json({ error: 'Amount must be > 0' });
    insertCashEntry(finalDate, finalCustomer, finalAmount, bags || [], note || '');
    res.status(201).json({ success: true, message: 'Cash sale saved' });
  } catch (err) {
    console.error('CashSale Error:', err.message);
    res.status(500).json({ error: 'Failed: ' + err.message });
  }
});

router.get('/', (req, res) => {
  try {
    res.json(getCashEntries(req.query.date || null));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch' });
  }
});

module.exports = router;