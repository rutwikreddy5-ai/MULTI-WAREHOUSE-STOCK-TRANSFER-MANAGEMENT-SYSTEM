const router = require('express').Router();
const { pool } = require('../db');

router.get('/', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT p.*, COALESCE(SUM(s.quantity), 0) AS total_stock
         FROM Product p
         LEFT JOIN Stock s ON s.product_id = p.product_id
        GROUP BY p.product_id
        ORDER BY p.product_id`
    );
    res.json(rows);
  } catch (e) { next(e); }
});

router.post('/', async (req, res, next) => {
  try {
    const { sku, name, category, unit_price } = req.body;
    if (!sku || !name) return res.status(400).json({ error: 'sku and name are required' });
    const [r] = await pool.query(
      'INSERT INTO Product (sku, name, category, unit_price) VALUES (?, ?, ?, ?)',
      [sku, name, category || null, Number(unit_price) || 0]
    );
    res.status(201).json({ product_id: r.insertId });
  } catch (e) { next(e); }
});

router.put('/:id', async (req, res, next) => {
  try {
    const { sku, name, category, unit_price } = req.body;
    const [r] = await pool.query(
      'UPDATE Product SET sku = ?, name = ?, category = ?, unit_price = ? WHERE product_id = ?',
      [sku, name, category || null, Number(unit_price) || 0, req.params.id]
    );
    if (!r.affectedRows) return res.status(404).json({ error: 'Product not found' });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const [r] = await pool.query('DELETE FROM Product WHERE product_id = ?', [req.params.id]);
    if (!r.affectedRows) return res.status(404).json({ error: 'Product not found' });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

module.exports = router;
