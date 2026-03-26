const express = require('express');
const router = express.Router();

const {
  getAllProducts,
  getProductByName,
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
router.get('/catalog', async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;

    const allProducts = await getAllProducts();
    const productMap = {};
    allProducts.forEach(p => { productMap[p.name] = p; });

    const result = {};
    for (const [category, items] of Object.entries(STOCK_CATALOG)) {
      result[category] = [];
      for (const name of items) {
        const product = productMap[name];
        const currentStock = product ? await getStockForProduct(product.id) : 0;
        result[category].push({
          name,
          productId: product ? product.id : null,
          currentStock,
          ratePerBag: product ? product.rate_per_bag : 0
        });
      }
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/stock-management/history ─────────────────────────
router.get('/history', async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;

    const allProducts = await getAllProducts();
    const productMap = {};
    allProducts.forEach(p => { productMap[p.id] = p; });

    const { date, productId } = req.query;
    const rows = await getStockMovements({ date: date || undefined, productId: productId || undefined });

    const history = rows.map(r => ({
      id: r.id,
      productId: Number(r.product_id),
      productName: productMap[r.product_id]?.name || 'Unknown',
      movementType: r.movement_type,
      quantityBags: Number(r.quantity_bags),
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
router.post('/import', async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;

    const { items, date } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'No items provided' });
    }

    const results = [];
    for (const item of items) {
      const name = (item.name || '').trim();
      const qty = Number(item.quantity) || 0;
      if (!name || qty <= 0) continue;

      let product = await getProductByName(name);
      if (!product) {
        product = await createProduct({
          name,
          ratePerBag: 0,
          size: '',
          sku: '',
          lowStockThreshold: 0
        });
      }

      if (!product) continue;

      await addStockMovement({
        productId: product.id,
        movementType: 'in',
        quantityBags: qty,
        note: item.note || `Stock import on ${date || new Date().toISOString().slice(0, 10)}`
      });

      await logAudit({
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
        newStock: await getStockForProduct(product.id)
      });
    }

    res.json({ success: true, results });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ── POST /api/stock-management/seed ───────────────────────────
router.post('/seed', async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;

    const created = [];
    for (const [category, items] of Object.entries(STOCK_CATALOG)) {
      for (const name of items) {
        let product = await getProductByName(name);
        if (!product) {
          product = await createProduct({
            name,
            ratePerBag: 0,
            size: '',
            sku: '',
            lowStockThreshold: 0
          });
          created.push({ name, id: product?.id, status: 'created' });
        } else {
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
