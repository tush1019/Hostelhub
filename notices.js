const express = require("express");
const db = require("./db");

const router = express.Router();

/* GET /api/notices */
router.get("/", async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id, title, message, audience,
              DATE_FORMAT(created_at, '%d %b %Y') AS date,
              created_at AS createdAt
       FROM notices ORDER BY created_at DESC LIMIT 50`
    );

    res.json({ success: true, data: rows });
  } catch (error) {
    console.error("Notices list error:", error);
    res.status(500).json({ success: false, message: "Failed to load notices" });
  }
});

/* POST /api/notices */
router.post("/", async (req, res) => {
  try {
    const { title, message, audience } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: "Title is required" });
    }
    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: "Message is required" });
    }

    const aud = ["All", "Students", "Admins"].includes(audience) ? audience : "All";

    const [result] = await db.query(
      `INSERT INTO notices (title, message, audience) VALUES (?, ?, ?)`,
      [title.trim(), message.trim(), aud]
    );

    const [rows] = await db.query(
      `SELECT id, title, message, audience,
              DATE_FORMAT(created_at, '%d %b %Y') AS date,
              created_at AS createdAt FROM notices WHERE id = ?`,
      [result.insertId]
    );

    res.status(201).json({ success: true, message: "Notice published", data: rows[0] });
  } catch (error) {
    console.error("Notice create error:", error);
    res.status(500).json({ success: false, message: "Failed to publish notice" });
  }
});

/* DELETE /api/notices/:id */
router.delete("/:id", async (req, res) => {
  try {
    const [result] = await db.query(`DELETE FROM notices WHERE id = ?`, [req.params.id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Notice not found" });
    }

    res.json({ success: true, message: "Notice removed" });
  } catch (error) {
    console.error("Notice delete error:", error);
    res.status(500).json({ success: false, message: "Failed to remove notice" });
  }
});

module.exports = router;
