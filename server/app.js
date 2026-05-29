const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Test route
app.get('/', (req, res) => {
  res.json({ message: 'Rekebisha Platform API is running' });
});

// Routes (we will add these as we build)
// app.use('/api/auth', require('./routes/auth'));
// app.use('/api/waste-logs', require('./routes/wasteLogs'));
// app.use('/api/transactions', require('./routes/transactions'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
