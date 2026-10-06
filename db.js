require('dotenv').config();
const mysql = require('mysql2/promise');

const REQUIRED_DB = 'warehouse_management';

const config = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD, // read from .env only, never hardcoded
  database: process.env.DB_NAME || REQUIRED_DB,
};

if (config.database !== REQUIRED_DB) {
  console.error(`DB_NAME must be "${REQUIRED_DB}" (got "${config.database}"). Fix your .env file.`);
  process.exit(1);
}

const pool = mysql.createPool({
  ...config,
  waitForConnections: true,
  connectionLimit: 10,
  decimalNumbers: true,
});

// Confirms we are connected to warehouse_management and that the tables exist.
async function verifyConnection() {
  const [[row]] = await pool.query('SELECT DATABASE() AS db');
  if (row.db !== REQUIRED_DB) {
    throw new Error(`Connected to "${row.db}" instead of "${REQUIRED_DB}"`);
  }
  const [tables] = await pool.query('SHOW TABLES');
  const names = tables.map((t) => Object.values(t)[0]);
  const needed = ['Warehouse', 'Product', 'Stock', 'Stock_Transfer', 'Transfer_Details'];
  const missing = needed.filter((n) => !names.includes(n));
  if (missing.length) {
    throw new Error(`Missing tables: ${missing.join(', ')}. Run database/schema.sql first.`);
  }
  return row.db;
}

module.exports = { pool, verifyConnection };
