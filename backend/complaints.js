const express = require("express");
const db = require("./db");

const router = express.Router();

const VALID_PRIORITY = ["Low", "Medium", "High"];
const VALID_STATUS = ["Pending", "In Progress", "Resolved"];

/* GET /api/complaints?search= */
router.get("/", async (req, res) => {
  try {
    const search = (req.query.search || "").trim();

    let sql = `SELECT id, complaint_code AS complaintCode, student_name AS student,
                 room_number AS room, subject, description,
                 DATE_FORMAT(complaint_date, '%d %b %Y') AS date,
                 priority, status, created_at AS createdAt
               FROM complaints`;
    const params = [];

    if (search) {
      sql += ` WHERE student_name LIKE ? OR complaint_code LIKE ? OR subject LIKE ? OR room_number LIKE ?`;
      const like = `%${search}%`;
      params.push(like, like, like, like);
    }

    sql += ` ORDER BY created_at DESC LIMIT 500`;

    const [rows] = await db.query(sql, params);

    const [summaryRows] = await db.query(`
      SELECT
        COUNT(*) AS total,
        COALESCE(SUM(status = 'Pending'), 0) AS pending,
        COALESCE(SUM(status = 'In Progress'), 0) AS inProgress,
        COALESCE(SUM(status = 'Resolved'), 0) AS resolved
      FROM complaints
    `);
    const summary = summaryRows[0] || {};

    res.json({ success: true, data: rows, summary });
  } catch (error) {
    console.error("Complaints list error:", error);
    res.status(500).json({ success: false, message: "Failed to load complaints" });
  }
});

/* POST /api/complaints */
router.post("/", async (req, res) => {
  try {
    const { student, room, subject, description, priority, status } = req.body;

    if (!student || !student.trim()) {
      return res.status(400).json({ success: false, message: "Student name is required" });
    }
    if (!subject || !subject.trim()) {
      return res.status(400).json({ success: false, message: "Subject is required" });
    }

    const prio = VALID_PRIORITY.includes(priority) ? priority : "Medium";
    const compStatus = VALID_STATUS.includes(status) ? status : "Pending";

    const [result] = await db.query(
      `INSERT INTO complaints (student_name, room_number, subject, description, complaint_date, priority, status)
       VALUES (?, ?, ?, ?, CURDATE(), ?, ?)`,
      [
        student.trim(),
        room ? room.trim() : null,
        subject.trim(),
        description ? description.trim() : null,
        prio,
        compStatus,
      ]
    );

    const code = "CMP" + String(result.insertId).padStart(3, "0");
    await db.query(`UPDATE complaints SET complaint_code = ? WHERE id = ?`, [code, result.insertId]);

    const [rows] = await db.query(
      `SELECT id, complaint_code AS complaintCode, student_name AS student,
              room_number AS room, subject, description,
              DATE_FORMAT(complaint_date, '%d %b %Y') AS date,
              priority, status FROM complaints WHERE id = ?`,
      [result.insertId]
    );

    res.status(201).json({ success: true, message: "Complaint submitted", data: rows[0] });
  } catch (error) {
    console.error("Complaint create error:", error);
    res.status(500).json({ success: false, message: "Failed to submit complaint" });
  }
});

/* PATCH /api/complaints/:id/status  { status } */
router.patch("/:id/status", async (req, res) => {
  try {
    const { status } = req.body;

    if (!VALID_STATUS.includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }

    const [result] = await db.query(`UPDATE complaints SET status = ? WHERE id = ?`, [
      status,
      req.params.id,
    ]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Complaint not found" });
    }

    res.json({ success: true, message: `Complaint marked as ${status}` });
  } catch (error) {
    console.error("Complaint status error:", error);
    res.status(500).json({ success: false, message: "Failed to update complaint" });
  }
});

/* DELETE /api/complaints/:id */
router.delete("/:id", async (req, res) => {
  try {
    const [result] = await db.query(`DELETE FROM complaints WHERE id = ?`, [req.params.id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Complaint not found" });
    }

    res.json({ success: true, message: "Complaint removed" });
  } catch (error) {
    console.error("Complaint delete error:", error);
    res.status(500).json({ success: false, message: "Failed to remove complaint" });
  }
});

module.exports = router;
