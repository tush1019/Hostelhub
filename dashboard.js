const express = require("express");
const db = require("./db");

const router = express.Router();

/* GET /api/dashboard — live counts for the dashboard & reports pages */
router.get("/", async (req, res) => {
  try {
    const [studentsRows] = await db.query(`
      SELECT COUNT(*) AS total,
             SUM(status = 'Active') AS active
      FROM students
    `);
    const students = studentsRows[0] || { total: 0, active: 0 };

    const [roomsRows] = await db.query(`
      SELECT COUNT(*) AS total,
             SUM(status = 'Occupied') AS occupied,
             SUM(status = 'Available') AS available,
             SUM(status = 'Maintenance') AS maintenance,
             COALESCE(SUM(capacity), 0) AS beds,
             COALESCE(SUM(occupied), 0) AS bedsFilled
      FROM rooms
    `);
    const rooms = roomsRows[0] || { total: 0, occupied: 0, available: 0, maintenance: 0, beds: 0, bedsFilled: 0 };

    const [feesRows] = await db.query(`
      SELECT COALESCE(SUM(CASE WHEN status = 'Paid' THEN amount ELSE 0 END), 0) AS paid,
             COALESCE(SUM(CASE WHEN status = 'Pending' THEN amount ELSE 0 END), 0) AS pending,
             SUM(status = 'Paid') AS paidCount,
             SUM(status = 'Pending') AS pendingCount
      FROM fees
    `);
    const fees = feesRows[0] || { paid: 0, pending: 0, paidCount: 0, pendingCount: 0 };

    const [complaintsRows] = await db.query(`
      SELECT COUNT(*) AS total,
             SUM(status = 'Pending') AS pending,
             SUM(status = 'In Progress') AS inProgress,
             SUM(status = 'Resolved') AS resolved
      FROM complaints
    `);
    const complaints = complaintsRows[0] || { total: 0, pending: 0, inProgress: 0, resolved: 0 };

    const [monthlyFees] = await db.query(`
      SELECT DATE_FORMAT(payment_date, '%b') AS month,
             SUM(CASE WHEN status = 'Paid' THEN amount ELSE 0 END) AS amount
      FROM fees
      WHERE payment_date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
      GROUP BY DATE_FORMAT(payment_date, '%Y-%m'), DATE_FORMAT(payment_date, '%b')
      ORDER BY MIN(payment_date) ASC
    `);

    const [recentComplaints] = await db.query(`
      SELECT complaint_code AS code, student_name AS student,
             subject, status
      FROM complaints ORDER BY created_at DESC LIMIT 5
    `);

    const [recentFees] = await db.query(`
      SELECT payment_code AS code, student_name AS student,
             amount, status
      FROM fees ORDER BY created_at DESC LIMIT 5
    `);

    const [notices] = await db.query(`
      SELECT id, title, message,
             DATE_FORMAT(created_at, '%d %b %Y') AS date
      FROM notices ORDER BY created_at DESC LIMIT 5
    `);

    const occupancyRate = rooms.beds > 0 ? Math.round((rooms.bedsFilled / rooms.beds) * 100) : 0;

    res.json({
      success: true,
      data: {
        students: {
          total: students.total || 0,
          active: students.active || 0,
        },
        rooms: {
          total: rooms.total || 0,
          occupied: rooms.occupied || 0,
          available: rooms.available || 0,
          maintenance: rooms.maintenance || 0,
          beds: rooms.beds || 0,
          bedsFilled: rooms.bedsFilled || 0,
          occupancyRate,
        },
        fees: {
          paid: Number(fees.paid) || 0,
          pending: Number(fees.pending) || 0,
          paidCount: fees.paidCount || 0,
          pendingCount: fees.pendingCount || 0,
        },
        complaints: {
          total: complaints.total || 0,
          pending: complaints.pending || 0,
          inProgress: complaints.inProgress || 0,
          resolved: complaints.resolved || 0,
        },
        monthlyFees: monthlyFees.map((row) => ({
          month: row.month,
          amount: Number(row.amount) || 0,
        })),
        recentComplaints,
        recentFees,
        notices,
      },
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    res.status(500).json({ success: false, message: "Failed to load dashboard data" });
  }
});

module.exports = router;
