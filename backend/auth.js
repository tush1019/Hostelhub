const express = require("express");
const bcrypt = require("bcryptjs");
const db = require("./db");

const router = express.Router();

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

function toCleanEmail(email) {
  return String(email || "").trim().toLowerCase();
}

/* ============================================================
   LOGIN — POST /api/auth/login  { email, password }
   Verifies email + bcrypt password hash from the database.
   Only stores id/name/email/role in the response (never password).
   ============================================================ */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const cleanEmail = toCleanEmail(email);

    const [rows] = await db.query(
      `SELECT id, name, email, password, role, email_verified
       FROM users
       WHERE email = ?
       LIMIT 1`,
      [cleanEmail]
    );

    if (rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const user = rows[0];

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    res.json({
      success: true,
      message: "Login successful",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login Error:", error.message);

    res.status(500).json({
      success: false,
      message: "Server error during login",
    });
  }
});

/* ============================================================
   LOGOUT — POST /api/auth/logout
   Stateless auth: the client discards its session. This endpoint
   exists so the frontend has a single place to end a session and
   for future cookie/token based sessions.
   ============================================================ */
router.post("/logout", (req, res) => {
  res.json({ success: true, message: "Logged out successfully" });
});
/* ============================================================
   REGISTER — POST /api/auth/register  { name, email, password, role }
   - Validates input, blocks duplicate emails
   - Hashes the password with bcrypt and creates the user
     immediately (OTP / email verification has been removed).
   ============================================================ */
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !String(name).trim() || String(name).trim().length < 2) {
      return res.status(400).json({ success: false, message: "Full name is required" });
    }
    if (!email || !isValidEmail(String(email).trim())) {
      return res.status(400).json({ success: false, message: "Enter a valid email address" });
    }
    if (!password || String(password).length < 6) {
      return res.status(400).json({ success: false, message: "Password must be at least 6 characters" });
    }
    if (String(password).length > 72) {
      return res.status(400).json({ success: false, message: "Password must be under 72 characters" });
    }

    const userRole = role || "Student";
    if (!["Admin", "Student"].includes(userRole)) {
      return res.status(400).json({ success: false, message: "Invalid role" });
    }

    const cleanEmail = toCleanEmail(email);
    const cleanName = String(name).trim();

    // Block duplicate registration
    const [existingUsers] = await db.query(
      "SELECT id FROM users WHERE email = ? LIMIT 1",
      [cleanEmail]
    );
    if (existingUsers.length > 0) {
      return res.status(409).json({ success: false, message: "Email already registered. Please login instead." });
    }

    // Hash the password and create the user immediately (no OTP step)
    const passwordHash = await bcrypt.hash(String(password), 12);

    const [result] = await db.query(
      `INSERT INTO users (name, email, password, role, email_verified) VALUES (?, ?, ?, ?, 1)`,
      [cleanName, cleanEmail, passwordHash, userRole]
    );

    res.status(201).json({
      success: true,
      message: "Account created successfully!",
      user: { id: result.insertId, name: cleanName, email: cleanEmail, role: userRole },
    });
  } catch (error) {
    console.error("Register Error:", error.message);
    res.status(500).json({ success: false, message: "Failed to create account. Please try again." });
  }
});
module.exports = router;