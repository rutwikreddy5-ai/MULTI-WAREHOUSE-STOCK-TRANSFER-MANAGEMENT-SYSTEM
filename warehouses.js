const router = require('express').Router();
const { pool } = require('../db');

router.get('/', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT w.*, COALESCE(SUM(s.quantity), 0) AS total_items
         FROM Warehouse w
         LEFT JOIN Stock s ON s.warehouse_id = w.warehouse_id
        GROUP BY w.warehouse_id
        ORDER BY w.warehouse_id`
    );
    res.json(rows);
  } catch (e) { next(e); }
});

router.post('/', async (req, res, next) => {
  try {
    const { name, location, capacity } = req.body;
    if (!name || !location) return res.status(400).json({ error: 'name and location are required' });
    const [r] = await pool.query(
      'INSERT INTO Warehouse (name, location, capacity) VALUES (?, ?, ?)',
      [name, location, Number(capacity) || 0]
    );
    res.status(201).json({ warehouse_id: r.insertId });
  } catch (e) { next(e); }
});

router.put('/:id', async (req, res, next) => {
  try {
    const { name, location, capacity } = req.body;
    const [r] = await pool.query(
      'UPDATE Warehouse SET name = ?, location = ?, capacity = ? WHERE warehouse_id = ?',
      [name, location, Number(capacity) || 0, req.params.id]
    );
    if (!r.affectedRows) return res.status(404).json({ error: 'Warehouse not found' });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const [r] = await pool.query('DELETE FROM Warehouse WHERE warehouse_id = ?', [req.params.id]);
    if (!r.affectedRows) return res.status(404).json({ error: 'Warehouse not found' });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

module.exports = router;
