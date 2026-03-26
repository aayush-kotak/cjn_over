const express = require('express');
const router = express.Router();
const { getAllCustomers, getOrCreateCustomer } = require('../db/database');

router.get('/', async (req, res) => {
  try {
    const customers = await getAllCustomers();
    res.json(customers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Name required' });
    const customer = await getOrCreateCustomer(name.trim().toUpperCase());
    res.status(201).json({ success: true, customer });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;