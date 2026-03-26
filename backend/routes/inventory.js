const express = require('express');
const router = express.Router();

const {
  addStockMovement,
  getStockForProduct,
  listLowStockProducts,
  logAudit
} = require('../db/database');

function requireAdmin(req, res) {
  if (req.user?.role !== 'admin') {
    res.status(403).json({ error: 'Forbidden: admin only' });
    return false;
  }
  return true;
}

// Low-stock alert list
router.get('/low-stock', (req, res) => {
  try {
    res.json(listLowStockProducts());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Current stock for one product
router.get('/stock/:productId', (req, res) => {
  try {
    const stock = getStockForProduct(req.params.productId);
    res.json({ productId: req.params.productId, stock });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Manual stock in/out
router.post('/movement', (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;

    const {
      productId,
      movementType,
      quantityBags,
      note
    } = req.body || {};

    addStockMovement({
      productId,
      movementType,
      quantityBags,
      note
    });

    logAudit({
      action: 'create',
      entityType: 'stock-movement',
      entityId: null,
      actorUsername: req.user?.username,
      actorRole: req.user?.role,
      before: null,
      after: { productId, movementType, quantityBags, note: note || '' }
    });

    res.status(201).json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;

