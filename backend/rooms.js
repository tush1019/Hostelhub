const express = require("express");
const db = require("./db");

const router = express.Router();

const VALID_STATUS = ["Available", "Occupied", "Maintenance"];

/* GET /api/rooms?search= */
router.get("/", async (req, res) => {
  try {
    const search = (req.query.search || "").trim();

    let sql = `SELECT id, room_number AS room, floor, type, capacity,
                 occupied, status, created_at AS createdAt FROM rooms`;
    const params = [];

    if (search) {
      sql += ` WHERE room_number LIKE ? OR floor LIKE ? OR type LIKE ?`;
      const like = `%${search}%`;
      params.push(like, like, like);
    }

    sql += ` ORDER BY room_number ASC LIMIT 500`;

    const [rows] = await db.query(sql, params);

    res.json({ success: true, data: rows });
  } catch (error) {
    console.error("Rooms list error:", error);
    res.status(500).json({ success: false, message: "Failed to load rooms" });
  }
});

/* POST /api/rooms */
router.post("/", async (req, res) => {
  try {
    const { room, floor, type, capacity, occupied, status } = req.body;

    if (!room || !room.trim()) {
      return res.status(400).json({ success: false, message: "Room number is required" });
    }

    const cap = Math.max(1, parseInt(capacity, 10) || 2);
    const occ = Math.min(cap, Math.max(0, parseInt(occupied, 10) || 0));
    const roomStatus = VALID_STATUS.includes(status)
      ? status
      : occ >= cap
        ? "Occupied"
        : "Available";

    const [result] = await db.query(
      `INSERT INTO rooms (room_number, floor, type, capacity, occupied, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        room.trim(),
        floor ? floor.trim() : "Ground Floor",
        type ? type.trim() : "2 Seater",
        cap,
        occ,
        roomStatus,
      ]
    );

    const [rows] = await db.query(
      `SELECT id, room_number AS room, floor, type, capacity,
              occupied, status, created_at AS createdAt FROM rooms WHERE id = ?`,
      [result.insertId]
    );

    res.status(201).json({ success: true, message: "Room added", data: rows[0] });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ success: false, message: "Room number already exists" });
    }
    console.error("Room create error:", error);
    res.status(500).json({ success: false, message: "Failed to add room" });
  }
});

/* PUT /api/rooms/:id */
router.put("/:id", async (req, res) => {
  try {
    const { room, floor, type, capacity, occupied, status } = req.body;

    if (!room || !room.trim()) {
      return res.status(400).json({ success: false, message: "Room number is required" });
    }

    const cap = Math.max(1, parseInt(capacity, 10) || 2);
    const occ = Math.min(cap, Math.max(0, parseInt(occupied, 10) || 0));
    const roomStatus = VALID_STATUS.includes(status) ? status : "Available";

    const [result] = await db.query(
      `UPDATE rooms SET room_number = ?, floor = ?, type = ?,
        capacity = ?, occupied = ?, status = ? WHERE id = ?`,
      [
        room.trim(),
        floor ? floor.trim() : "Ground Floor",
        type ? type.trim() : "2 Seater",
        cap,
        occ,
        roomStatus,
        req.params.id,
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Room not found" });
    }

    const [rows] = await db.query(
      `SELECT id, room_number AS room, floor, type, capacity,
              occupied, status, created_at AS createdAt FROM rooms WHERE id = ?`,
      [req.params.id]
    );

    res.json({ success: true, message: "Room updated", data: rows[0] });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ success: false, message: "Room number already exists" });
    }
    console.error("Room update error:", error);
    res.status(500).json({ success: false, message: "Failed to update room" });
  }
});

/* DELETE /api/rooms/:id */
router.delete("/:id", async (req, res) => {
  try {
    const [result] = await db.query(`DELETE FROM rooms WHERE id = ?`, [req.params.id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Room not found" });
    }

    res.json({ success: true, message: "Room removed" });
  } catch (error) {
    console.error("Room delete error:", error);
    res.status(500).json({ success: false, message: "Failed to remove room" });
  }
});

module.exports = router;
