-- HostelHub database schema
-- Run: mysql -u root -p < schema.sql   (or import via phpMyAdmin / MySQL Workbench)

CREATE DATABASE IF NOT EXISTS hostel_management
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE hostel_management;

-- Users (login accounts created via Signup page)
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('Admin', 'Student') NOT NULL DEFAULT 'Student',
  email_verified TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Email OTP verifications (one active row per email)
CREATE TABLE IF NOT EXISTS otp_verifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(150) NOT NULL,
  otp_hash VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('Admin', 'Student') NOT NULL DEFAULT 'Student',
  attempts TINYINT NOT NULL DEFAULT 0,
  resend_count TINYINT NOT NULL DEFAULT 1,
  last_sent_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_otp_email (email),
  INDEX idx_otp_expires (expires_at)
);

-- Hostel students (room allocation records)
CREATE TABLE IF NOT EXISTS students (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_code VARCHAR(20) UNIQUE,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NULL,
  phone VARCHAR(20) NULL,
  course VARCHAR(100) NULL,
  room_number VARCHAR(10) NULL,
  status ENUM('Active', 'Pending', 'Inactive') NOT NULL DEFAULT 'Active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Rooms
CREATE TABLE IF NOT EXISTS rooms (
  id INT AUTO_INCREMENT PRIMARY KEY,
  room_number VARCHAR(10) NOT NULL UNIQUE,
  floor VARCHAR(50) NOT NULL DEFAULT 'Ground Floor',
  type VARCHAR(30) NOT NULL DEFAULT '2 Seater',
  capacity INT NOT NULL DEFAULT 2,
  occupied INT NOT NULL DEFAULT 0,
  status ENUM('Available', 'Occupied', 'Maintenance') NOT NULL DEFAULT 'Available',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Fee payments
CREATE TABLE IF NOT EXISTS fees (
  id INT AUTO_INCREMENT PRIMARY KEY,
  payment_code VARCHAR(20) UNIQUE,
  student_name VARCHAR(100) NOT NULL,
  room_number VARCHAR(10) NULL,
  amount DECIMAL(10, 2) NOT NULL,
  payment_date DATE NOT NULL,
  method ENUM('UPI', 'Cash', 'Card', 'Bank Transfer') NOT NULL DEFAULT 'UPI',
  status ENUM('Paid', 'Pending') NOT NULL DEFAULT 'Paid',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Complaints
CREATE TABLE IF NOT EXISTS complaints (
  id INT AUTO_INCREMENT PRIMARY KEY,
  complaint_code VARCHAR(20) UNIQUE,
  student_name VARCHAR(100) NOT NULL,
  room_number VARCHAR(10) NULL,
  subject VARCHAR(200) NOT NULL,
  description TEXT NULL,
  complaint_date DATE NOT NULL,
  priority ENUM('Low', 'Medium', 'High') NOT NULL DEFAULT 'Medium',
  status ENUM('Pending', 'In Progress', 'Resolved') NOT NULL DEFAULT 'Pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Mess weekly menu
CREATE TABLE IF NOT EXISTS mess_menu (
  id INT AUTO_INCREMENT PRIMARY KEY,
  day VARCHAR(15) NOT NULL UNIQUE,
  breakfast VARCHAR(255) NULL,
  lunch VARCHAR(255) NULL,
  dinner VARCHAR(255) NULL,
  status ENUM('Published', 'Pending') NOT NULL DEFAULT 'Published'
);

-- Notice board
CREATE TABLE IF NOT EXISTS notices (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  audience ENUM('All', 'Students', 'Admins') NOT NULL DEFAULT 'All',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed rooms (only inserted when table is empty)
INSERT INTO rooms (room_number, floor, type, capacity, occupied, status)
SELECT * FROM (
  SELECT '101' AS room_number, 'Ground Floor' AS floor, '2 Seater' AS type, 2 AS capacity, 2 AS occupied, 'Occupied' AS status UNION ALL
  SELECT '102', 'Ground Floor', '3 Seater', 3, 2, 'Available' UNION ALL
  SELECT '103', 'Ground Floor', '2 Seater', 2, 0, 'Available' UNION ALL
  SELECT '201', 'First Floor', '3 Seater', 3, 3, 'Occupied' UNION ALL
  SELECT '202', 'First Floor', '2 Seater', 2, 1, 'Available' UNION ALL
  SELECT '203', 'First Floor', '2 Seater', 2, 2, 'Occupied' UNION ALL
  SELECT '301', 'Second Floor', '3 Seater', 3, 0, 'Maintenance' UNION ALL
  SELECT '302', 'Second Floor', '2 Seater', 2, 1, 'Available'
) AS seed
WHERE NOT EXISTS (SELECT 1 FROM rooms LIMIT 1);

-- Seed a week of mess menu (only when empty)
INSERT INTO mess_menu (day, breakfast, lunch, dinner, status)
SELECT * FROM (
  SELECT 'Monday' AS day, 'Poha & Tea' AS breakfast, 'Dal, Rice, Roti & Sabzi' AS lunch, 'Paneer, Rice & Roti' AS dinner, 'Published' AS status UNION ALL
  SELECT 'Tuesday', 'Aloo Paratha & Curd', 'Rajma, Rice & Roti', 'Mix Veg, Dal & Roti', 'Published' UNION ALL
  SELECT 'Wednesday', 'Bread, Butter & Milk', 'Chole, Rice & Roti', 'Aloo Gobi, Dal & Roti', 'Published' UNION ALL
  SELECT 'Thursday', 'Upma & Tea', 'Dal Makhani, Rice & Roti', 'Kadhi, Rice & Roti', 'Published' UNION ALL
  SELECT 'Friday', 'Poha & Milk', 'Dal, Rice, Roti & Mix Veg', 'Paneer Curry & Roti', 'Pending' UNION ALL
  SELECT 'Saturday', 'Idli & Sambar', 'Veg Biryani & Raita', 'Dal Tadka & Roti', 'Pending' UNION ALL
  SELECT 'Sunday', 'Chole Bhature', 'Special Thali', 'Khichdi & Kadhi', 'Pending'
) AS seed
WHERE NOT EXISTS (SELECT 1 FROM mess_menu LIMIT 1);

-- Seed a welcome notice (only when empty)
INSERT INTO notices (title, message, audience)
SELECT 'Welcome to HostelHub', 'Mess timings: Breakfast 8 AM, Lunch 1 PM, Dinner 8 PM. Contact the warden for any help.', 'All'
WHERE NOT EXISTS (SELECT 1 FROM notices LIMIT 1);
