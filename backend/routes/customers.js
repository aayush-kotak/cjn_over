const express = require('express');
const router = express.Router();
const { getAllCustomers, getOrCreateCustomer } = require('../db/database');

router.get('/', (req, res) => {
  try {
    res.json(getAllCustomers());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Name required' });
    const customer = getOrCreateCustomer(name.trim().toUpperCase());
    res.status(201).json({ success: true, customer });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;