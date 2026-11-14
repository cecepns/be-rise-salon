-- Migration: 001_initial_schema.sql
-- Skema database awal Be Rise Salon

CREATE DATABASE IF NOT EXISTS be_rise_salon CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE be_rise_salon;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  username VARCHAR(50) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('owner','kasir','pegawai') NOT NULL DEFAULT 'kasir',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS customers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(30),
  email VARCHAR(100),
  address TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX (name),
  INDEX (phone)
);

CREATE TABLE IF NOT EXISTS staff (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(30),
  position VARCHAR(60),
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  type ENUM('service','product') NOT NULL DEFAULT 'service',
  category VARCHAR(60),
  price DECIMAL(14,2) NOT NULL DEFAULT 0,
  cost DECIMAL(14,2) NOT NULL DEFAULT 0,
  stock INT NOT NULL DEFAULT 0,
  commission_type ENUM('none','percent','fixed') NOT NULL DEFAULT 'none',
  commission_value DECIMAL(14,2) NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX (name),
  INDEX (type),
  INDEX (category)
);

CREATE TABLE IF NOT EXISTS stock_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  item_id INT NOT NULL,
  qty INT NOT NULL,
  note VARCHAR(255),
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  invoice_no VARCHAR(40) NOT NULL UNIQUE,
  customer_id INT NULL,
  customer_name VARCHAR(100),
  staff_id INT NULL,
  cashier_id INT,
  cashier_name VARCHAR(100),
  payment_method ENUM('cash','transfer','qris','debit') NOT NULL DEFAULT 'cash',
  subtotal DECIMAL(14,2) NOT NULL,
  discount DECIMAL(14,2) NOT NULL DEFAULT 0,
  total DECIMAL(14,2) NOT NULL,
  commission_total DECIMAL(14,2) NOT NULL DEFAULT 0,
  status ENUM('paid','void') NOT NULL DEFAULT 'paid',
  notes VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX (created_at),
  INDEX (status),
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
  FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS transaction_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  transaction_id INT NOT NULL,
  item_id INT NULL,
  item_name VARCHAR(120) NOT NULL,
  price DECIMAL(14,2) NOT NULL,
  qty INT NOT NULL,
  subtotal DECIMAL(14,2) NOT NULL,
  commission DECIMAL(14,2) NOT NULL DEFAULT 0,
  FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
  FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS expenses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(150) NOT NULL,
  category VARCHAR(60),
  amount DECIMAL(14,2) NOT NULL,
  expense_date DATE NOT NULL,
  notes VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX (expense_date)
);

CREATE TABLE IF NOT EXISTS reservations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  customer_name VARCHAR(100) NOT NULL,
  phone VARCHAR(30),
  item_id INT NULL,
  staff_id INT NULL,
  reserved_at DATETIME NOT NULL,
  status ENUM('pending','confirmed','done','cancelled') NOT NULL DEFAULT 'pending',
  notes VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX (reserved_at),
  INDEX (status),
  FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE SET NULL,
  FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS settings (
  key_name VARCHAR(50) PRIMARY KEY,
  setting_value TEXT
);

