const express = require("express");
const db = require("./db");

const router = express.Router();

const VALID_METHODS = ["UPI", "Cash", "Card", "Bank Transfer"];
const VALID_STATUS = ["Paid", "Pending"];

/* GET /api/fees?search= */
router.get("/", async (req, res) => {
  try {
    const search = (req.query.search || "").trim();

    let sql = `SELECT id, payment_code AS paymentCode, student_name AS student,
                 room_number AS room, amount, DATE_FORMAT(payment_date, '%d %b %Y') AS date,
                 payment_date AS rawDate, method, status, created_at AS createdAt
               FROM fees`;
    const params = [];

    if (search) {
      sql += ` WHERE student_name LIKE ? OR payment_code LIKE ? OR room_number LIKE ?`;
      const like = `%${search}%`;
      params.push(like, like, like);
    }

    sql += ` ORDER BY payment_date DESC, created_at DESC LIMIT 500`;

    const [rows] = await db.query(sql, params);

    // Summary numbers for the cards
    const [summaryRows] = await db.query(`
      SELECT
        COUNT(*) AS total,
        COALESCE(SUM(CASE WHEN status = 'Paid' THEN amount ELSE 0 END), 0) AS paidAmount,
        COALESCE(SUM(CASE WHEN status = 'Pending' THEN amount ELSE 0 END), 0) AS pendingAmount,
        COALESCE(SUM(CASE WHEN status = 'Paid' THEN 1 ELSE 0 END), 0) AS paidCount,
        COALESCE(SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END), 0) AS pendingCount
      FROM fees
    `);
    const summary = summaryRows[0] || {};

    res.json({ success: true, data: rows, summary });
  } catch (error) {
    console.error("Fees list error:", error);
    res.status(500).json({ success: false, message: "Failed to load fee records" });
  }
});

/* POST /api/fees */
router.post("/", async (req, res) => {
  try {
    const { student, room, amount, date, method, status } = req.body;

    if (!student || !student.trim()) {
      return res.status(400).json({ success: false, message: "Student name is required" });
    }

    const numericAmount = parseFloat(amount);
    if (!numericAmount || numericAmount <= 0) {
      return res.status(400).json({ success: false, message: "Enter a valid amount" });
    }

    const payMethod = VALID_METHODS.includes(method) ? method : "UPI";
    const payStatus = VALID_STATUS.includes(status) ? status : "Paid";
    const payDate = date ? new Date(date) : new Date();
    if (Number.isNaN(payDate.getTime())) {
      return res.status(400).json({ success: false, message: "Enter a valid date" });
    }

    const [result] = await db.query(
      `INSERT INTO fees (student_name, room_number, amount, payment_date, method, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        student.trim(),
        room ? room.trim() : null,
        numericAmount,
        payDate.toISOString().slice(0, 10),
        payMethod,
        payStatus,
      ]
    );

    const code = "PAY" + String(result.insertId).padStart(3, "0");
    await db.query(`UPDATE fees SET payment_code = ? WHERE id = ?`, [code, result.insertId]);

    const [rows] = await db.query(
      `SELECT id, payment_code AS paymentCode, student_name AS student,
              room_number AS room, amount, DATE_FORMAT(payment_date, '%d %b %Y') AS date,
              payment_date AS rawDate, method, status
       FROM fees WHERE id = ?`,
      [result.insertId]
    );

    res.status(201).json({ success: true, message: "Payment recorded", data: rows[0] });
  } catch (error) {
    console.error("Fee create error:", error);
    res.status(500).json({ success: false, message: "Failed to record payment" });
  }
});

/* PATCH /api/fees/:id/status  { status: "Paid" | "Pending" } */
router.patch("/:id/status", async (req, res) => {
  try {
    const { status } = req.body;

    if (!VALID_STATUS.includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }

    const [result] = await db.query(`UPDATE fees SET status = ? WHERE id = ?`, [
      status,
      req.params.id,
    ]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Payment not found" });
    }

    res.json({ success: true, message: `Marked as ${status}` });
  } catch (error) {
    console.error("Fee status error:", error);
    res.status(500).json({ success: false, message: "Failed to update payment" });
  }
});

/* DELETE /api/fees/:id */
router.delete("/:id", async (req, res) => {
  try {
    const [result] = await db.query(`DELETE FROM fees WHERE id = ?`, [req.params.id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Payment not found" });
    }

    res.json({ success: true, message: "Payment record removed" });
  } catch (error) {
    console.error("Fee delete error:", error);
    res.status(500).json({ success: false, message: "Failed to remove payment" });
  }
});

module.exports = router;
