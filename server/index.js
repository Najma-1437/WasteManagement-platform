require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');

const app = express();

// ── Security & parsing ────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    const allowed = (process.env.CLIENT_URL || 'http://localhost:5173')
      .split(',').map(s => s.trim());
    const devLocalhost = process.env.NODE_ENV !== 'production'
      && (!origin || /^http:\/\/localhost:\d+$/.test(origin));
    if (devLocalhost || allowed.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Health check ──────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', time: new Date() });
});

// ── Routes ────────────────────────────────────────────────────
app.use('/api/auth',       require('./routes/auth'));
app.use('/api/waste-logs', require('./routes/wasteLogs'));
app.use('/api/buyer',      require('./routes/buyer.routes'));
app.use('/api/mpesa',      require('./routes/mpesa'));  // public — no auth

// app.use('/api/buyers',      require('./routes/buyers'));
// app.use('/api/coordinator', require('./routes/coordinator'));
// app.use('/api/admin',       require('./routes/admin'));

// ── Global error handler (must be last) ───────────────────────
app.use(require('./middleware/errorHandler'));

// ── Start ─────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});