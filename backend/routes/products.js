const express = require('express');
const router = express.Router();

const {
  getAllProducts,
  getAllProductsWithStock,
  createProduct,
  logAudit
} = require('../db/database');

function requireAdmin(req, res) {
  if (req.user?.role !== 'admin') {
    res.status(403).json({ error: 'Forbidden: admin only' });
    return false;
  }
  return true;
}

router.get('/', (req, res) => {
  try {
    res.json(getAllProducts());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Returns all products with current stock levels
router.get('/with-stock', (req, res) => {
  try {
    res.json(getAllProductsWithStock());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;

    const {
      name,
      rate_per_bag,
      ratePerBag,
      size,
      sku,
      low_stock_threshold,
      lowStockThreshold
    } = req.body || {};

    const product = createProduct({
      name,
      ratePerBag: ratePerBag ?? rate_per_bag,
      size,
      sku,
      lowStockThreshold: lowStockThreshold ?? low_stock_threshold
    });

    logAudit({
      action: 'create',
      entityType: 'products',
      entityId: String(product.id),
      actorUsername: req.user?.username,
      actorRole: req.user?.role,
      before: null,
      after: product
    });

    res.status(201).json({ success: true, product });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
