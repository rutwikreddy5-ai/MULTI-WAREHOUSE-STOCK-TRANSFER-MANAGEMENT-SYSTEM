-- Warehouse Management schema
-- Database: warehouse_management (MySQL)

CREATE DATABASE IF NOT EXISTS warehouse_management
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE warehouse_management;

CREATE TABLE IF NOT EXISTS Warehouse (
  warehouse_id INT AUTO_INCREMENT PRIMARY KEY,
  name         VARCHAR(100) NOT NULL,
  location     VARCHAR(150) NOT NULL,
  capacity     INT NOT NULL DEFAULT 0,
  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_wh_capacity CHECK (capacity >= 0)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS Product (
  product_id INT AUTO_INCREMENT PRIMARY KEY,
  sku        VARCHAR(50)  NOT NULL UNIQUE,
  name       VARCHAR(150) NOT NULL,
  category   VARCHAR(80),
  unit_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_prod_price CHECK (unit_price >= 0)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS Stock (
  stock_id     INT AUTO_INCREMENT PRIMARY KEY,
  warehouse_id INT NOT NULL,
  product_id   INT NOT NULL,
  quantity     INT NOT NULL DEFAULT 0,
  updated_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_stock_wh_prod (warehouse_id, product_id),
  CONSTRAINT fk_stock_wh   FOREIGN KEY (warehouse_id) REFERENCES Warehouse(warehouse_id) ON DELETE CASCADE,
  CONSTRAINT fk_stock_prod FOREIGN KEY (product_id)   REFERENCES Product(product_id)     ON DELETE CASCADE,
  CONSTRAINT chk_stock_qty CHECK (quantity >= 0)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS Stock_Transfer (
  transfer_id       INT AUTO_INCREMENT PRIMARY KEY,
  from_warehouse_id INT NOT NULL,
  to_warehouse_id   INT NOT NULL,
  transfer_date     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status            ENUM('Completed','Cancelled') NOT NULL DEFAULT 'Completed',
  remarks           VARCHAR(255),
  CONSTRAINT fk_tr_from FOREIGN KEY (from_warehouse_id) REFERENCES Warehouse(warehouse_id),
  CONSTRAINT fk_tr_to   FOREIGN KEY (to_warehouse_id)   REFERENCES Warehouse(warehouse_id),
  CONSTRAINT chk_tr_diff CHECK (from_warehouse_id <> to_warehouse_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS Transfer_Details (
  detail_id   INT AUTO_INCREMENT PRIMARY KEY,
  transfer_id INT NOT NULL,
  product_id  INT NOT NULL,
  quantity    INT NOT NULL,
  CONSTRAINT fk_td_transfer FOREIGN KEY (transfer_id) REFERENCES Stock_Transfer(transfer_id) ON DELETE CASCADE,
  CONSTRAINT fk_td_product  FOREIGN KEY (product_id)  REFERENCES Product(product_id),
  CONSTRAINT chk_td_qty CHECK (quantity > 0)
) ENGINE=InnoDB;

-- Sample data (only inserted when tables are empty)
INSERT INTO Warehouse (name, location, capacity)
SELECT * FROM (
  SELECT 'Central Warehouse' AS name, 'Hyderabad' AS location, 10000 AS capacity
  UNION ALL SELECT 'North Hub', 'Delhi', 6000
  UNION ALL SELECT 'South Depot', 'Chennai', 4000
) w WHERE NOT EXISTS (SELECT 1 FROM Warehouse);

INSERT INTO Product (sku, name, category, unit_price)
SELECT * FROM (
  SELECT 'SKU-1001' AS sku, 'Cardboard Box (Large)' AS name, 'Packaging' AS category, 45.00 AS unit_price
  UNION ALL SELECT 'SKU-1002', 'Pallet Wrap Roll', 'Packaging', 320.00
  UNION ALL SELECT 'SKU-2001', 'Barcode Scanner', 'Electronics', 5400.00
  UNION ALL SELECT 'SKU-3001', 'Safety Gloves (Pair)', 'Safety', 150.00
) p WHERE NOT EXISTS (SELECT 1 FROM Product);

INSERT INTO Stock (warehouse_id, product_id, quantity)
SELECT * FROM (
  SELECT 1 AS warehouse_id, 1 AS product_id, 500 AS quantity
  UNION ALL SELECT 1, 2, 200
  UNION ALL SELECT 1, 3, 40
  UNION ALL SELECT 2, 1, 150
  UNION ALL SELECT 2, 4, 300
  UNION ALL SELECT 3, 2, 80
) s WHERE NOT EXISTS (SELECT 1 FROM Stock);
