const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const rateLimit = require("express-rate-limit");

dotenv.config();

const db = require("./db");

const authRoutes = require("./auth");
const studentRoutes = require("./students");
const roomRoutes = require("./rooms");
const feeRoutes = require("./fees");
const complaintRoutes = require("./complaints");
const messRoutes = require("./mess");
const noticeRoutes = require("./notices");
const dashboardRoutes = require("./dashboard");

const app = express();

/* Render (and similar hosts) sit behind a proxy — required so express-rate-limit
   and req.ip work correctly instead of throwing 500 on every API call. */
app.set("trust proxy", 1);

const PORT = parseInt(process.env.PORT || "5000", 10);
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

/* CORS — allow the React frontend (and same-origin tools) */
app.use(
  cors({
    origin: [FRONTEND_URL, "http://localhost:5173", "http://127.0.0.1:5173"],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json({ limit: "1mb" }));

/* Global API rate limit: 300 requests / 15 min per IP */
app.use(
  "/api/",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    validate: { xForwardedForHeader: false },
    message: { success: false, message: "Too many requests. Please slow down." },
  })
);

/* Health check for quick verification */
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "HostelHub Backend is running 🚀",
  });
});

// Database test
app.get("/api/db-test", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT 1 AS connected");

    res.json({
      success: true,
      message: "MySQL connected successfully",
      data: rows,
    });
  } catch (error) {
    console.error("Database Error:", error.message);

    res.status(500).json({
      success: false,
      message: "Database connection failed",
      error: error.message,
    });
  }
});

// Email configuration test (does NOT send an email)
app.get("/api/email-test", async (req, res) => {
  const { isEmailConfigured, getTransporter } = require("./mailer");
  if (!isEmailConfigured()) {
    return res.status(503).json({
      success: false,
      message: "Email is not configured. Set EMAIL_USER and EMAIL_APP_PASSWORD in backend/.env",
    });
  }
  try {
    await getTransporter().verify();
    res.json({ success: true, message: "Email SMTP connection verified" });
  } catch (error) {
    console.error("Email test failed:", error.message);
    res.status(502).json({ success: false, message: "SMTP verification failed", error: error.message });
  }
});

// Authentication routes
app.use("/api/auth", authRoutes);

// Module routes
app.use("/api/students", studentRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/fees", feeRoutes);
app.use("/api/complaints", complaintRoutes);
app.use("/api/mess", messRoutes);
app.use("/api/notices", noticeRoutes);
app.use("/api/dashboard", dashboardRoutes);

// 404 for unknown API routes
app.use("/api", (req, res) => {
  res.status(404).json({ success: false, message: "API route not found" });
});

/* Serve the built frontend (frontend/dist) — one service hosts the whole app */
const path = require("path");
const FRONTEND_DIST = path.join(__dirname, "frontend", "dist");
app.use(express.static(FRONTEND_DIST));

/* SPA fallback: any other GET returns the frontend index.html */
app.use((req, res, next) => {
  if (req.method === "GET" && !req.path.startsWith("/api")) {
    return res.sendFile(path.join(FRONTEND_DIST, "index.html"));
  }
  next();
});

// Central error handler (malformed JSON etc.)
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err && err.type === "entity.parse.failed") {
    return res.status(400).json({ success: false, message: "Invalid JSON in request body" });
  }
  console.error("Unhandled error:", err && err.message ? err.message : err);
  res.status(500).json({ success: false, message: "Internal server error" });
});

// Start server
app.listen(PORT, () => {
  console.log(`HostelHub Backend running on http://localhost:${PORT}`);
});