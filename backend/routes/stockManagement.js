const express = require('express');
const router = express.Router();

const {
  getAllProducts,
  createProduct,
  addStockMovement,
  getStockForProduct,
  getStockMovements,
  logAudit
} = require('../db/database');

// ── Admin-only middleware ─────────────────────────────────────
function requireAdmin(req, res) {
  if (req.user?.role !== 'admin') {
    res.status(403).json({ error: 'Forbidden: admin only' });
    return false;
  }
  return true;
}

// ── Predefined catalog ────────────────────────────────────────
const STOCK_CATALOG = {
  KHOL: [
    'Madhav', 'Nandan', 'Patel', 'Gopal',
    'Dimet Kadi', 'Avadh', 'Mayank'
  ],
  BHUSO: [
    'Diamond', 'Makai', 'Chana Chunni', 'Keshar Malai',
    'Dairy Malai', 'Double Ghoda Malai', 'Jaddu Bhushu', 'Unnati'
  ],
  TIWANA: [
    'Tiwana 8000', 'Tiwana 10000', 'Tiwana Protien +',
    'Tiwana Protien 35', 'Tiwana T-20', 'Tiwana T-20 Dry',
    'Tiwana T-20 Fresher', 'Calf Starter', 'Hiefer Dry'
  ]
};

// ── GET /api/stock-management/catalog ─────────────────────────
// Returns the fixed catalog with current stock for each item
router.get('/catalog', (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;

    const allProducts = getAllProducts();
    const productMap = {};
    allProducts.forEach(p => { productMap[p.name] = p; });

    const result = {};
    for (const [category, items] of Object.entries(STOCK_CATALOG)) {
      result[category] = items.map(name => {
        const product = productMap[name];
        const currentStock = product ? getStockForProduct(product.id) : 0;
        return {
          name,
          productId: product ? product.id : null,
          currentStock,
          ratePerBag: product ? product.rate_per_bag : 0
        };
      });
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/stock-management/history ─────────────────────────
// Returns stock movement history for all products, with date filtering
router.get('/history', (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;

    const allProducts = getAllProducts();
    const productMap = {};
    allProducts.forEach(p => { productMap[p.id] = p; });

    const { date, productId } = req.query;
    const rows = getStockMovements({ date: date || undefined, productId: productId || undefined });

    const history = rows.map(r => ({
      id: r.id,
      productId: r.product_id,
      productName: productMap[r.product_id]?.name || 'Unknown',
      movementType: r.movement_type,
      quantityBags: r.quantity_bags,
      note: r.note,
      sourceEntityType: r.source_entity_type,
      sourceEntityId: r.source_entity_id,
      createdAt: r.created_at
    }));

    res.json(history);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/stock-management/import ─────────────────────────
// Add stock (bags imported) for one or more items
router.post('/import', (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;

    const { items, date } = req.body;
    // items: [{ name: 'Madhav', quantity: 200, note: '' }, ...]

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'No items provided' });
    }

    const results = [];
    for (const item of items) {
      const name = (item.name || '').trim();
      const qty = Number(item.quantity) || 0;
      if (!name || qty <= 0) continue;

      // Ensure product exists
      let product;
      try {
        product = createProduct({
          name,
          ratePerBag: 0,
          size: '',
          sku: '',
          lowStockThreshold: 0
        });
      } catch (e) {
        // Product already exists — get it
        const allProd = getAllProducts();
        product = allProd.find(p => p.name === name);
      }

      if (!product) continue;

      addStockMovement({
        productId: product.id,
        movementType: 'in',
        quantityBags: qty,
        note: item.note || `Stock import on ${date || new Date().toISOString().slice(0, 10)}`
      });

      logAudit({
        action: 'create',
        entityType: 'stock-import',
        entityId: String(product.id),
        actorUsername: req.user?.username,
        actorRole: req.user?.role,
        before: null,
        after: { name, quantity: qty, date: date || new Date().toISOString().slice(0, 10) }
      });

      results.push({
        name,
        productId: product.id,
        quantityAdded: qty,
        newStock: getStockForProduct(product.id)
      });
    }

    res.json({ success: true, results });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ── POST /api/stock-management/seed ───────────────────────────
// Ensure all catalog items exist as products (run once)
router.post('/seed', (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;

    const created = [];
    for (const [category, items] of Object.entries(STOCK_CATALOG)) {
      for (const name of items) {
        try {
          const product = createProduct({
            name,
            ratePerBag: 0,
            size: '',
            sku: '',
            lowStockThreshold: 0
          });
          created.push({ name, id: product.id, status: 'created' });
        } catch (e) {
          created.push({ name, status: 'exists' });
        }
      }
    }
    res.json({ success: true, items: created });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
