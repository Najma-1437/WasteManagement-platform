const pool = require('../config/db');

// GET /api/admin/stats
const getStats = async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM users)                                                               AS total_users,
        (SELECT COUNT(*) FROM users  WHERE status = 'pending' AND role IN ('buyer','coordinator')) AS pending_approvals,
        (SELECT COUNT(*) FROM waste_logs WHERE status = 'disputed')                               AS open_disputes,
        (SELECT COUNT(*) FROM transactions)                                                        AS total_transactions
    `);
    const r = result.rows[0];
    res.json({
      totalUsers:        parseInt(r.total_users),
      pendingApprovals:  parseInt(r.pending_approvals),
      openDisputes:      parseInt(r.open_disputes),
      totalTransactions: parseInt(r.total_transactions),
    });
  } catch (err) { next(err); }
};

// GET /api/admin/pending
const getPending = async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT user_id, name, email, phone_number, role, created_at
      FROM users
      WHERE status = 'pending' AND role IN ('buyer', 'coordinator')
      ORDER BY created_at ASC
    `);
    res.json({ pending: result.rows });
  } catch (err) { next(err); }
};

// PATCH /api/admin/users/:id/approve
const approveUser = async (req, res, next) => {
  try {
    const result = await pool.query(
      `UPDATE users SET status = 'active', updated_at = NOW()
       WHERE user_id = $1 AND status = 'pending'
       RETURNING user_id, name, role, status`,
      [req.params.id],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found or already processed' });
    }
    res.json({ user: result.rows[0] });
  } catch (err) { next(err); }
};

// PATCH /api/admin/users/:id/reject
const rejectUser = async (req, res, next) => {
  try {
    const result = await pool.query(
      `UPDATE users SET status = 'suspended', updated_at = NOW()
       WHERE user_id = $1 AND status = 'pending'
       RETURNING user_id, name, role, status`,
      [req.params.id],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found or already processed' });
    }
    res.json({ user: result.rows[0] });
  } catch (err) { next(err); }
};

// GET /api/admin/users
const getUsers = async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT user_id, name, email, phone_number, role, status, created_at
      FROM users
      ORDER BY created_at DESC
    `);
    res.json({ users: result.rows });
  } catch (err) { next(err); }
};

// PATCH /api/admin/users/:id/status  — suspend or reactivate
const updateUserStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['active', 'suspended'].includes(status)) {
      return res.status(400).json({ error: 'Status must be active or suspended' });
    }
    if (parseInt(req.params.id) === req.user.user_id) {
      return res.status(400).json({ error: 'Cannot change your own status' });
    }
    const result = await pool.query(
      `UPDATE users SET status = $1, updated_at = NOW()
       WHERE user_id = $2
       RETURNING user_id, name, role, status`,
      [status, req.params.id],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ user: result.rows[0] });
  } catch (err) { next(err); }
};

// GET /api/admin/disputes
const getDisputes = async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT
        wl.log_id, wl.category, wl.weight_kg, wl.notes, wl.created_at,
        uc.name        AS collector_name,
        uc.phone_number AS collector_phone,
        ub.name        AS buyer_name
      FROM waste_logs wl
      JOIN collectors col ON wl.collector_id  = col.collector_id
      JOIN users      uc  ON col.user_id       = uc.user_id
      LEFT JOIN buyers b  ON wl.matched_buyer_id = b.buyer_id
      LEFT JOIN users ub  ON b.user_id          = ub.user_id
      WHERE wl.status = 'disputed'
      ORDER BY wl.created_at DESC
    `);
    res.json({ disputes: result.rows });
  } catch (err) { next(err); }
};

// PATCH /api/admin/disputes/:id/resolve
// action = 'confirm'  → rule in collector's favour (status → confirmed)
// action = 'cancel'   → cancel the match (status → pending, clear buyer link)
const resolveDispute = async (req, res, next) => {
  try {
    const { action } = req.body;
    if (!['confirm', 'cancel'].includes(action)) {
      return res.status(400).json({ error: 'Action must be confirm or cancel' });
    }

    const result = action === 'cancel'
      ? await pool.query(
          `UPDATE waste_logs
           SET status = 'pending', matched_buyer_id = NULL, matched_offer_id = NULL
           WHERE log_id = $1 AND status = 'disputed'
           RETURNING log_id, status`,
          [req.params.id],
        )
      : await pool.query(
          `UPDATE waste_logs SET status = 'confirmed'
           WHERE log_id = $1 AND status = 'disputed'
           RETURNING log_id, status`,
          [req.params.id],
        );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Dispute not found' });
    }
    res.json({ log: result.rows[0] });
  } catch (err) { next(err); }
};

module.exports = {
  getStats, getPending, approveUser, rejectUser,
  getUsers, updateUserStatus, getDisputes, resolveDispute,
};
