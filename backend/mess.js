const express = require("express");
const db = require("./db");

const router = express.Router();

/* GET /api/mess */
router.get("/", async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id, day, breakfast, lunch, dinner, status FROM mess_menu
       ORDER BY FIELD(day, 'Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday')`
    );

    res.json({ success: true, data: rows });
  } catch (error) {
    console.error("Mess list error:", error);
    res.status(500).json({ success: false, message: "Failed to load mess menu" });
  }
});

/* PUT /api/mess/:day  { breakfast, lunch, dinner, status } */
router.put("/:day", async (req, res) => {
  try {
    const { breakfast, lunch, dinner, status } = req.body;
    const menuStatus = ["Published", "Pending"].includes(status) ? status : "Published";

    const [result] = await db.query(
      `UPDATE mess_menu SET breakfast = ?, lunch = ?, dinner = ?, status = ?
       WHERE day = ?`,
      [
        breakfast ? breakfast.trim() : null,
        lunch ? lunch.trim() : null,
        dinner ? dinner.trim() : null,
        menuStatus,
        req.params.day,
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Day not found" });
    }

    const [rows] = await db.query(`SELECT id, day, breakfast, lunch, dinner, status FROM mess_menu WHERE day = ?`, [
      req.params.day,
    ]);

    res.json({ success: true, message: `${req.params.day} menu updated`, data: rows[0] });
  } catch (error) {
    console.error("Mess update error:", error);
    res.status(500).json({ success: false, message: "Failed to update menu" });
  }
});

/* PATCH /api/mess/:day/status  { status } */
router.patch("/:day/status", async (req, res) => {
  try {
    const { status } = req.body;

    if (!["Published", "Pending"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }

    const [result] = await db.query(`UPDATE mess_menu SET status = ? WHERE day = ?`, [
      status,
      req.params.day,
    ]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Day not found" });
    }

    res.json({ success: true, message: `${req.params.day} marked as ${status}` });
  } catch (error) {
    console.error("Mess status error:", error);
    res.status(500).json({ success: false, message: "Failed to update status" });
  }
});

module.exports = router;
