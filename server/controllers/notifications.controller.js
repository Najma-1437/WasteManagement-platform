const pool = require('../config/db');

// GET /api/notifications — current user's notifications, newest first
exports.getMyNotifications = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT notification_id, channel, message, is_read, sent_at
       FROM notifications
       WHERE user_id = $1
       ORDER BY sent_at DESC
       LIMIT 50`,
      [req.user.user_id],
    );
    res.json({ notifications: result.rows });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/notifications/:id/read — mark one notification as read (ownership enforced)
exports.markRead = async (req, res, next) => {
  try {
    const result = await pool.query(
      `UPDATE notifications
       SET is_read = true
       WHERE notification_id = $1 AND user_id = $2
       RETURNING notification_id`,
      [req.params.id, req.user.user_id],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    res.status(204).end();
  } catch (err) {
    next(err);
  }
};
