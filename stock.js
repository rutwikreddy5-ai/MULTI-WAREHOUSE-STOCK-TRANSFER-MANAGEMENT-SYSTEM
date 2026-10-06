const router = require('express').Router();
const { pool } = require('../db');

router.get('/', async (req, res, next) => {
  try {
    const { warehouse_id, product_id } = req.query;
    const where = [];
    const params = [];
    if (warehouse_id) { where.push('s.warehouse_id = ?'); params.push(warehouse_id); }
    if (product_id) { where.push('s.product_id = ?'); params.push(product_id); }
    const [rows] = await pool.query(
      `SELECT s.stock_id, s.warehouse_id, w.name AS warehouse_name,
              s.product_id, p.sku, p.name AS product_name, s.quantity, s.updated_at
         FROM Stock s
         JOIN Warehouse w ON w.warehouse_id = s.warehouse_id
         JOIN Product p   ON p.product_id   = s.product_id
        ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
        ORDER BY w.name, p.name`,
      params
    );
    res.json(rows);
  } catch (e) { next(e); }
});

// Adds quantity to a warehouse/product pair (creates the row if needed).
router.post('/', async (req, res, next) => {
  try {
    const { warehouse_id, product_id } = req.body;
    const quantity = Number(req.body.quantity);
    if (!warehouse_id || !product_id || !Number.isInteger(quantity) || quantity <= 0) {
      return res.status(400).json({ error: 'warehouse_id, product_id and a positive integer quantity are required' });
    }
    await pool.query(
      `INSERT INTO Stock (warehouse_id, product_id, quantity) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity)`,
      [warehouse_id, product_id, quantity]
    );
    res.status(201).json({ ok: true });
  } catch (e) { next(e); }
});

// Sets an exact quantity (stock correction).
router.put('/:id', async (req, res, next) => {
  try {
    const quantity = Number(req.body.quantity);
    if (!Number.isInteger(quantity) || quantity < 0) {
      return res.status(400).json({ error: 'quantity must be a non-negative integer' });
    }
    const [r] = await pool.query('UPDATE Stock SET quantity = ? WHERE stock_id = ?', [quantity, req.params.id]);
    if (!r.affectedRows) return res.status(404).json({ error: 'Stock record not found' });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const [r] = await pool.query('DELETE FROM Stock WHERE stock_id = ?', [req.params.id]);
    if (!r.affectedRows) return res.status(404).json({ error: 'Stock record not found' });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

module.exports = router;
