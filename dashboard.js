const router = require('express').Router();
const { pool } = require('../db');

router.get('/', async (req, res, next) => {
  try {
    const [[counts]] = await pool.query(
      `SELECT (SELECT COUNT(*) FROM Warehouse) AS warehouses,
              (SELECT COUNT(*) FROM Product) AS products,
              (SELECT COALESCE(SUM(quantity), 0) FROM Stock) AS total_units,
              (SELECT COALESCE(SUM(s.quantity * p.unit_price), 0)
                 FROM Stock s JOIN Product p ON p.product_id = s.product_id) AS inventory_value,
              (SELECT COUNT(*) FROM Stock_Transfer) AS transfers`
    );
    const [lowStock] = await pool.query(
      `SELECT w.name AS warehouse_name, p.name AS product_name, s.quantity
         FROM Stock s
         JOIN Warehouse w ON w.warehouse_id = s.warehouse_id
         JOIN Product p   ON p.product_id   = s.product_id
        WHERE s.quantity < 50
        ORDER BY s.quantity ASC
        LIMIT 10`
    );
    res.json({ ...counts, lowStock });
  } catch (e) { next(e); }
});

module.exports = router;
