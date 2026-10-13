// dotenv is loaded by server.js before this module is required,
// but load it here too so db.js also works standalone (tests, scripts).
require("dotenv").config();
const mysql = require("mysql2/promise");

let mysqlPool = null;
let sqliteDb = null;
let sqliteReady = false;

function monthNameSql(expr) {
  return `CASE CAST(strftime('%m', ${expr}) AS INTEGER)
    WHEN 1 THEN 'Jan' WHEN 2 THEN 'Feb' WHEN 3 THEN 'Mar' WHEN 4 THEN 'Apr'
    WHEN 5 THEN 'May' WHEN 6 THEN 'Jun' WHEN 7 THEN 'Jul' WHEN 8 THEN 'Aug'
    WHEN 9 THEN 'Sep' WHEN 10 THEN 'Oct' WHEN 11 THEN 'Nov' WHEN 12 THEN 'Dec'
    ELSE 'N/A' END`;
}

function normalizeSQLiteQuery(sql) {
  let normalized = String(sql || "");

  normalized = normalized.replace(/DATE_FORMAT\(([^,]+),\s*'%d %b %Y'\)/g, (_, expr) => `strftime('%d', ${expr}) || ' ' || ${monthNameSql(expr)} || ' ' || strftime('%Y', ${expr})`);
  normalized = normalized.replace(/DATE_FORMAT\(([^,]+),\s*'%b'\)/g, (_, expr) => monthNameSql(expr));
  normalized = normalized.replace(/DATE_FORMAT\(([^,]+),\s*'%Y-%m'\)/g, (_, expr) => `strftime('%Y', ${expr}) || '-' || printf('%02d', CAST(strftime('%m', ${expr}) AS INTEGER))`);
  normalized = normalized.replace(/DATE_FORMAT\(([^,]+),\s*'%Y-%m-%d'\)/g, (_, expr) => `strftime('%Y-%m-%d', ${expr})`);
  normalized = normalized.replace(/DATE_SUB\(CURDATE\(\),\s*INTERVAL\s+6\s+MONTH\)/gi, "date('now', '-6 months')");
  normalized = normalized.replace(/CURDATE\(\)/g, "date('now')");
  normalized = normalized.replace(
    /ORDER BY FIELD\(day, 'Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'\)/g,
    "ORDER BY CASE day WHEN 'Monday' THEN 0 WHEN 'Tuesday' THEN 1 WHEN 'Wednesday' THEN 2 WHEN 'Thursday' THEN 3 WHEN 'Friday' THEN 4 WHEN 'Saturday' THEN 5 WHEN 'Sunday' THEN 6 ELSE 99 END"
  );

  return normalized;
}

async function createSqliteFallback() {
  const initSqlJs = require("sql.js");
  const { Database } = await initSqlJs({
    locateFile: (filename) => require.resolve(`sql.js/dist/${filename}`),
  });

  const db = new Database();

  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'Student' CHECK (role IN ('Admin', 'Student')),
      email_verified INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS otp_verifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL,
      otp_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'Student' CHECK (role IN ('Admin', 'Student')),
      attempts INTEGER NOT NULL DEFAULT 0,
      resend_count INTEGER NOT NULL DEFAULT 1,
      last_sent_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      expires_at TIMESTAMP NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_code TEXT UNIQUE,
      name TEXT NOT NULL,
      email TEXT NULL,
      phone TEXT NULL,
      course TEXT NULL,
      room_number TEXT NULL,
      status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Pending', 'Inactive')),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS rooms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_number TEXT NOT NULL UNIQUE,
      floor TEXT NOT NULL DEFAULT 'Ground Floor',
      type TEXT NOT NULL DEFAULT '2 Seater',
      capacity INTEGER NOT NULL DEFAULT 2,
      occupied INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'Available' CHECK (status IN ('Available', 'Occupied', 'Maintenance')),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS fees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      payment_code TEXT UNIQUE,
      student_name TEXT NOT NULL,
      room_number TEXT NULL,
      amount REAL NOT NULL,
      payment_date DATE NOT NULL,
      method TEXT NOT NULL DEFAULT 'UPI' CHECK (method IN ('UPI', 'Cash', 'Card', 'Bank Transfer')),
      status TEXT NOT NULL DEFAULT 'Paid' CHECK (status IN ('Paid', 'Pending')),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS complaints (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      complaint_code TEXT UNIQUE,
      student_name TEXT NOT NULL,
      room_number TEXT NULL,
      subject TEXT NOT NULL,
      description TEXT NULL,
      complaint_date DATE NOT NULL,
      priority TEXT NOT NULL DEFAULT 'Medium' CHECK (priority IN ('Low', 'Medium', 'High')),
      status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'In Progress', 'Resolved')),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS mess_menu (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      day TEXT NOT NULL UNIQUE,
      breakfast TEXT NULL,
      lunch TEXT NULL,
      dinner TEXT NULL,
      status TEXT NOT NULL DEFAULT 'Published' CHECK (status IN ('Published', 'Pending'))
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS notices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      audience TEXT NOT NULL DEFAULT 'All' CHECK (audience IN ('All', 'Students', 'Admins')),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  db.run(`
    INSERT OR IGNORE INTO rooms (room_number, floor, type, capacity, occupied, status) VALUES
      ('101', 'Ground Floor', '2 Seater', 2, 2, 'Occupied'),
      ('102', 'Ground Floor', '3 Seater', 3, 2, 'Available'),
      ('103', 'Ground Floor', '2 Seater', 2, 0, 'Available'),
      ('201', 'First Floor', '3 Seater', 3, 3, 'Occupied'),
      ('202', 'First Floor', '2 Seater', 2, 1, 'Available'),
      ('203', 'First Floor', '2 Seater', 2, 2, 'Occupied'),
      ('301', 'Second Floor', '3 Seater', 3, 0, 'Maintenance'),
      ('302', 'Second Floor', '2 Seater', 2, 1, 'Available');
  `);

  db.run(`
    INSERT OR IGNORE INTO mess_menu (day, breakfast, lunch, dinner, status) VALUES
      ('Monday', 'Poha & Tea', 'Dal, Rice, Roti & Sabzi', 'Paneer, Rice & Roti', 'Published'),
      ('Tuesday', 'Aloo Paratha & Curd', 'Rajma, Rice & Roti', 'Mix Veg, Dal & Roti', 'Published'),
      ('Wednesday', 'Bread, Butter & Milk', 'Chole, Rice & Roti', 'Aloo Gobi, Dal & Roti', 'Published'),
      ('Thursday', 'Upma & Tea', 'Dal Makhani, Rice & Roti', 'Kadhi, Rice & Roti', 'Published'),
      ('Friday', 'Poha & Milk', 'Dal, Rice, Roti & Mix Veg', 'Paneer Curry & Roti', 'Pending'),
      ('Saturday', 'Idli & Sambar', 'Veg Biryani & Raita', 'Dal Tadka & Roti', 'Pending'),
      ('Sunday', 'Chole Bhature', 'Special Thali', 'Khichdi & Kadhi', 'Pending');
  `);

  db.run(`
    INSERT OR IGNORE INTO notices (title, message, audience) VALUES
      ('Welcome to HostelHub', 'Mess timings: Breakfast 8 AM, Lunch 1 PM, Dinner 8 PM. Contact the warden for any help.', 'All');
  `);

  return db;
}

async function getPool() {
  if (mysqlPool) return mysqlPool;

  mysqlPool = mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "3306", 10),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "hostel_management",
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });

  try {
    await mysqlPool.query("SELECT 1 AS connected");
    return mysqlPool;
  } catch (error) {
    mysqlPool = null;
    return null;
  }
}

async function getSqliteDb() {
  if (sqliteDb) return sqliteDb;
  sqliteDb = await createSqliteFallback();
  return sqliteDb;
}

async function querySqlite(sql, params = []) {
  const db = await getSqliteDb();
  const normalized = normalizeSQLiteQuery(sql);

  if (/^\s*SELECT|^\s*WITH/i.test(normalized.trim())) {
    const statement = db.prepare(normalized);
    if (params.length) statement.bind(params);
    const rows = [];
    while (statement.step()) {
      rows.push(statement.getAsObject());
    }
    statement.free();
    return [rows];
  }

  const statement = db.prepare(normalized);
  if (params.length) statement.bind(params);
  statement.step();
  statement.free();

  const [changesResult] = db.exec("SELECT changes() AS affected_rows, last_insert_rowid() AS insert_id");
  const affectedRows = changesResult && changesResult.values && changesResult.values[0]
    ? Number(changesResult.values[0][0] || 0)
    : 0;
  const insertId = changesResult && changesResult.values && changesResult.values[0]
    ? Number(changesResult.values[0][1] || 0)
    : 0;

  return [{ affectedRows, insertId }];
}

const db = {
  async query(sql, params = []) {
    const pool = await getPool();
    if (pool) {
      try {
        return await pool.query(sql, params);
      } catch (error) {
        // Fall back to the local SQLite store when MySQL is unreachable.
      }
    }

    return querySqlite(sql, params);
  },
};

module.exports = db;

