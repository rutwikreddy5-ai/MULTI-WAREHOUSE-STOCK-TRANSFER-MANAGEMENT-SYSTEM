require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const { pool, verifyConnection } = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', async (req, res) => {
  try {
    const [[row]] = await pool.query('SELECT DATABASE() AS db');
    res.json({ status: 'ok', database: row.db });
  } catch (e) {
    res.status(500).json({ status: 'error', error: e.message });
  }
});

app.use('/api/warehouses', require('./routes/warehouses'));
app.use('/api/products', require('./routes/products'));
app.use('/api/stock', require('./routes/stock'));
app.use('/api/transfers', require('./routes/transfers'));
app.use('/api/dashboard', require('./routes/dashboard'));

app.use('/api', (req, res) => res.status(404).json({ error: 'Route not found' }));

// Frontend
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// Error handler: translate common MySQL errors into friendly messages.
app.use((err, req, res, next) => {
  console.error(err);
  const map = {
    ER_DUP_ENTRY: [409, 'A record with that unique value already exists'],
    ER_ROW_IS_REFERENCED_2: [409, 'Cannot delete: this record is referenced by other data (e.g. transfers)'],
    ER_NO_REFERENCED_ROW_2: [400, 'Referenced warehouse or product does not exist'],
    ER_CHECK_CONSTRAINT_VIOLATED: [400, 'A value violates a database constraint'],
  };
  const [status, message] = map[err.code] || [500, 'Internal server error'];
  res.status(status).json({ error: message });
});

const PORT = Number(process.env.PORT || 3000);

verifyConnection()
  .then((db) => {
    console.log(`Connected to MySQL database: ${db}`);
    app.listen(PORT, () => console.log(`Warehouse app running at http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error('Database connection check failed:', err.message);
    process.exit(1);
  });
