const router = require('express').Router();
const { pool } = require('../db');

router.get('/', async (req, res, next) => {
  try {
    const [transfers] = await pool.query(
      `SELECT t.transfer_id, t.from_warehouse_id, fw.name AS from_warehouse,
              t.to_warehouse_id, tw.name AS to_warehouse,
              t.transfer_date, t.status, t.remarks
         FROM Stock_Transfer t
         JOIN Warehouse fw ON fw.warehouse_id = t.from_warehouse_id
         JOIN Warehouse tw ON tw.warehouse_id = t.to_warehouse_id
        ORDER BY t.transfer_date DESC, t.transfer_id DESC`
    );
    if (!transfers.length) return res.json([]);
    const [details] = await pool.query(
      `SELECT d.transfer_id, d.product_id, p.sku, p.name AS product_name, d.quantity
         FROM Transfer_Details d
         JOIN Product p ON p.product_id = d.product_id
        WHERE d.transfer_id IN (?)`,
      [transfers.map((t) => t.transfer_id)]
    );
    const byTransfer = {};
    details.forEach((d) => (byTransfer[d.transfer_id] = byTransfer[d.transfer_id] || []).push(d));
    res.json(transfers.map((t) => ({ ...t, items: byTransfer[t.transfer_id] || [] })));
  } catch (e) { next(e); }
});

// Creates a transfer and moves stock between warehouses in a single transaction.
router.post('/', async (req, res, next) => {
  const { from_warehouse_id, to_warehouse_id, remarks, items } = req.body;
  if (!from_warehouse_id || !to_warehouse_id) {
    return res.status(400).json({ error: 'from_warehouse_id and to_warehouse_id are required' });
  }
  if (Number(from_warehouse_id) === Number(to_warehouse_id)) {
    return res.status(400).json({ error: 'Source and destination warehouse must differ' });
  }
  if (!Array.isArray(items) || !items.length) {
    return res.status(400).json({ error: 'At least one item is required' });
  }
  // Merge duplicate products and validate quantities.
  const merged = new Map();
  for (const it of items) {
    const qty = Number(it.quantity);
    if (!it.product_id || !Number.isInteger(qty) || qty <= 0) {
      return res.status(400).json({ error: 'Each item needs a product_id and a positive integer quantity' });
    }
    merged.set(Number(it.product_id), (merged.get(Number(it.product_id)) || 0) + qty);
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [[{ n }]] = await conn.query(
      'SELECT COUNT(*) AS n FROM Warehouse WHERE warehouse_id IN (?, ?)',
      [from_warehouse_id, to_warehouse_id]
    );
    if (n !== 2) {
      await conn.rollback();
      return res.status(404).json({ error: 'Warehouse not found' });
    }

    const [tr] = await conn.query(
      'INSERT INTO Stock_Transfer (from_warehouse_id, to_warehouse_id, remarks) VALUES (?, ?, ?)',
      [from_warehouse_id, to_warehouse_id, remarks || null]
    );

    // Lock in product order to avoid deadlocks between concurrent transfers.
    for (const [productId, qty] of [...merged.entries()].sort((a, b) => a[0] - b[0])) {
      const [rows] = await conn.query(
        'SELECT quantity FROM Stock WHERE warehouse_id = ? AND product_id = ? FOR UPDATE',
        [from_warehouse_id, productId]
      );
      const available = rows.length ? rows[0].quantity : 0;
      if (available < qty) {
        await conn.rollback();
        return res.status(409).json({
          error: `Insufficient stock for product ${productId}: available ${available}, requested ${qty}`,
        });
      }
      await conn.query(
        'UPDATE Stock SET quantity = quantity - ? WHERE warehouse_id = ? AND product_id = ?',
        [qty, from_warehouse_id, productId]
      );
      await conn.query(
        `INSERT INTO Stock (warehouse_id, product_id, quantity) VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity)`,
        [to_warehouse_id, productId, qty]
      );
      await conn.query(
        'INSERT INTO Transfer_Details (transfer_id, product_id, quantity) VALUES (?, ?, ?)',
        [tr.insertId, productId, qty]
      );
    }

    await conn.commit();
    res.status(201).json({ transfer_id: tr.insertId });
  } catch (e) {
    await conn.rollback().catch(() => {});
    next(e);
  } finally {
    conn.release();
  }
});

module.exports = router;
