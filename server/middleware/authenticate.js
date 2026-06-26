const jwt  = require('jsonwebtoken');
const pool = require('../config/db');

module.exports = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided.' });
  }
  const token = header.split(' ')[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const { rows } = await pool.query(
      `SELECT user_id, name, email, phone_number, role, status
       FROM users WHERE user_id = $1`,
      [payload.userId]
    );
    if (!rows.length) {
      return res.status(401).json({ error: 'User not found.' });
    }
    if (rows[0].status !== 'active') {
      return res.status(401).json({ error: 'Account is not active.' });
    }
    req.user = rows[0];
    next();
  } catch (err) {
    next(err);
  }
};