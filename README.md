# Warehouse Management

Frontend → Node.js + Express backend → MySQL database `warehouse_management`
(tables: Warehouse, Product, Stock, Stock_Transfer, Transfer_Details).

## Setup

1. Create the schema (creates `warehouse_management` and the tables, plus sample data):

   ```
   mysql -u root -p < database/schema.sql
   ```

2. Copy `.env.example` to `.env` and put your local MySQL password in `DB_PASSWORD`.
   `DB_NAME` must stay `warehouse_management`; the backend refuses to start otherwise.

3. Install and run:

   ```
   npm install
   npm start
   ```

4. Open http://localhost:3000

On startup the backend runs `SELECT DATABASE()` and checks that all five tables exist.
The header badge in the UI shows the connected database name.

## API

| Method | Route | Purpose |
|---|---|---|
| GET | /api/health | Connected database name |
| GET/POST | /api/warehouses | List / create |
| PUT/DELETE | /api/warehouses/:id | Update / delete |
| GET/POST | /api/products | List / create |
| PUT/DELETE | /api/products/:id | Update / delete |
| GET | /api/stock?warehouse_id=&product_id= | Stock with joins |
| POST | /api/stock | Add quantity (upsert) |
| PUT/DELETE | /api/stock/:id | Set exact quantity / remove |
| GET | /api/transfers | History with line items |
| POST | /api/transfers | Move stock (transactional, rejects insufficient stock) |
| GET | /api/dashboard | Totals and low-stock list |
