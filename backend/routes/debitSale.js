const express = require('express');
const router = express.Router();
const { insertDebitEntry, getDebitEntries } = require('../db/database');

router.post('/', (req, res) => {
  try {
    const { date, customer_name, customerName, bags, grandTotal, amount, note } = req.body;
    const finalCustomer = (customer_name || customerName || '').trim();
    const finalAmount   = Number(grandTotal) || Number(amount) || 0;
    const finalDate     = date || new Date().toISOString().slice(0, 10);
    if (!finalCustomer) return res.status(400).json({ error: 'Customer name required' });
    if (finalAmount <= 0) return res.status(400).json({ error: 'Amount must be > 0' });
    insertDebitEntry(finalDate, finalCustomer, finalAmount, bags || [], note || '');
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

module.exports = router;