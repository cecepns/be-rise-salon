CREATE DATABASE IF NOT EXISTS be_rise_salon CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE be_rise_salon;

CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  username VARCHAR(50) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('owner','kasir','pegawai') NOT NULL DEFAULT 'kasir',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE customers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(30), email VARCHAR(100), address TEXT, notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX (name), INDEX (phone)
);

CREATE TABLE staff (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(30), position VARCHAR(60),
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Komisi diatur PER ITEM (layanan/produk), bukan per karyawan
CREATE TABLE items (
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
  INDEX (name), INDEX (type), INDEX (category)
);

CREATE TABLE stock_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  item_id INT NOT NULL, qty INT NOT NULL, note VARCHAR(255), created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
);

CREATE TABLE transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  invoice_no VARCHAR(40) NOT NULL UNIQUE,
  customer_id INT NULL, customer_name VARCHAR(100),
  staff_id INT NULL, cashier_id INT, cashier_name VARCHAR(100),
  payment_method ENUM('cash','transfer','qris','debit') NOT NULL DEFAULT 'cash',
  subtotal DECIMAL(14,2) NOT NULL, discount DECIMAL(14,2) NOT NULL DEFAULT 0,
  total DECIMAL(14,2) NOT NULL, commission_total DECIMAL(14,2) NOT NULL DEFAULT 0,
  status ENUM('paid','void') NOT NULL DEFAULT 'paid',
  notes VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX (created_at), INDEX (status),
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
  FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE SET NULL
);

-- harga & komisi disimpan sebagai snapshot saat transaksi
CREATE TABLE transaction_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  transaction_id INT NOT NULL, item_id INT NULL,
  item_name VARCHAR(120) NOT NULL, price DECIMAL(14,2) NOT NULL, qty INT NOT NULL,
  subtotal DECIMAL(14,2) NOT NULL, commission DECIMAL(14,2) NOT NULL DEFAULT 0,
  FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
  FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE SET NULL
);

CREATE TABLE expenses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(150) NOT NULL, category VARCHAR(60),
  amount DECIMAL(14,2) NOT NULL, expense_date DATE NOT NULL, notes VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX (expense_date)
);

CREATE TABLE reservations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  customer_name VARCHAR(100) NOT NULL, phone VARCHAR(30),
  item_id INT NULL, staff_id INT NULL,
  reserved_at DATETIME NOT NULL,
  status ENUM('pending','confirmed','done','cancelled') NOT NULL DEFAULT 'pending',
  notes VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX (reserved_at), INDEX (status),
  FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE SET NULL,
  FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE SET NULL
);

CREATE TABLE settings (
  key_name VARCHAR(50) PRIMARY KEY,
  setting_value TEXT
);

-- Sample data (akun owner dibuat otomatis oleh server.js)
INSERT INTO settings VALUES
 ('salon_name','Be Rise Salon'),('address','Jakarta'),('phone','08xxxxxxxxxx'),('receipt_footer','Terima kasih, sampai jumpa lagi!');
INSERT INTO staff (name, phone, position) VALUES ('Sari','0812000001','Hair Stylist'),('Dina','0812000002','Nail Artist');
INSERT INTO customers (name, phone) VALUES ('Umum','-'),('Ayu Lestari','0813000001');
INSERT INTO items (name,type,category,price,cost,stock,commission_type,commission_value) VALUES
 ('Potong Rambut','service','Hair',60000,0,0,'percent',30),
 ('Creambath','service','Hair',90000,0,0,'percent',25),
 ('Manicure','service','Nail',75000,0,0,'fixed',15000),
 ('Shampoo Premium','product','Retail',85000,50000,20,'percent',10),
 ('Hair Serum','product','Retail',120000,70000,15,'fixed',10000);
INSERT INTO expenses (title,category,amount,expense_date) VALUES ('Listrik','Operasional',450000,CURDATE());
