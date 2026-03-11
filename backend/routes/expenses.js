const express = require('express');
const router = express.Router();
const { insert, getAll } = require('../db/database');

router.post('/', (req, res) => {
  try {
    const record = insert('expenses', req.body);
    res.json({ success: true, data: record });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/', (req, res) => {
  try {
    const records = getAll('expenses');
    res.json({ success: true, data: records });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;