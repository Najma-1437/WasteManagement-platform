const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

// Load environment variables from root .env
dotenv.config();

console.log("JWT_SECRET:", process.env.JWT_SECRET ? "loaded" : "MISSING");
console.log(
  "JWT_REFRESH_SECRET:",
  process.env.JWT_REFRESH_SECRET ? "loaded" : "MISSING",
);


// Database connection
require('./config/db');

const app = express();
const PORT = process.env.PORT || 5000;

// ── Middleware ──────────────────────────────────────────
app.use(
  cors({
    origin: "http://localhost:5173", // Vite dev server
    credentials: true,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Health check route ──────────────────────────────────
app.get("/", (req, res) => {
  res.json({
    message: "WasteManagement Platform API is running",
    status: "OK",
    environment: process.env.NODE_ENV,
  });
});

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

// ── Routes (to be added as modules are built) ──────────
app.use('/api/auth', require('./routes/auth'));
// app.use('/api/collectors', require('./routes/collectors'));
// app.use('/api/buyers', require('./routes/buyers'));
app.use('/api/waste-logs', require('./routes/wasteLogs'));
// app.use('/api/transactions', require('./routes/transactions'));
// app.use('/api/ussd', require('./routes/ussd'));
// app.use('/api/admin', require('./routes/admin'));

// ── 404 handler ─────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// ── Global error handler ─────────────────────────────────
const errorHandler = require('./middleware/errorHandler');
app.use(errorHandler);

// ── Start server ─────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
});
