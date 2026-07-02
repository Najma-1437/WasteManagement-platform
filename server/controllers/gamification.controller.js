const pool = require('../config/db');

// 10 points = KES 1 airtime
const POINTS_PER_KES = 10;
const MIN_REDEMPTION  = 100;

function computeLevel(pts) {
  if (pts >= 3500) return 'Platinum';
  if (pts >= 1500) return 'Gold';
  if (pts >= 500)  return 'Silver';
  return 'Bronze';
}

// GET /api/gamification/me
exports.getMyPoints = async (req, res, next) => {
  try {
    const { rows: cr } = await pool.query(
      'SELECT collector_id FROM collectors WHERE user_id = $1',
      [req.user.user_id]
    );
    if (!cr.length) return res.status(404).json({ error: 'Collector profile not found' });

    const { rows } = await pool.query(
      'SELECT total_points FROM gamification_records WHERE collector_id = $1',
      [cr[0].collector_id]
    );
    const total_points = rows.length ? rows[0].total_points : 0;
    res.json({ total_points, level: computeLevel(total_points) });
  } catch (err) {
    next(err);
  }
};

// GET /api/gamification/leaderboard
// Any authenticated role can view; collectors also receive their own rank
// if they fall outside the top 20.
exports.getLeaderboard = async (req, res, next) => {
  try {
    const DISPLAY_NAME = `
      CASE
        WHEN SPLIT_PART(u.name, ' ', 2) <> ''
        THEN SPLIT_PART(u.name, ' ', 1) || ' ' || LEFT(SPLIT_PART(u.name, ' ', 2), 1) || '.'
        ELSE u.name
      END
    `;

    const { rows: top20 } = await pool.query(`
      SELECT
        RANK() OVER (ORDER BY gr.total_points DESC)::int AS rank,
        u.user_id,
        ${DISPLAY_NAME} AS display_name,
        gr.total_points
      FROM gamification_records gr
      JOIN collectors c ON c.collector_id = gr.collector_id
      JOIN users u      ON u.user_id = c.user_id
      ORDER BY gr.total_points DESC
      LIMIT 20
    `);

    const leaderboard = top20.map(r => ({
      ...r,
      total_points: parseInt(r.total_points),
      level: computeLevel(parseInt(r.total_points)),
    }));

    let ownEntry = null;
    if (req.user.role === 'collector') {
      const alreadyIn = leaderboard.some(r => r.user_id === req.user.user_id);
      if (!alreadyIn) {
        const { rows: cr } = await pool.query(
          'SELECT collector_id FROM collectors WHERE user_id = $1',
          [req.user.user_id]
        );
        if (cr.length) {
          const { rows: own } = await pool.query(`
            WITH own_pts AS (
              SELECT COALESCE(
                (SELECT total_points FROM gamification_records WHERE collector_id = $2), 0
              ) AS pts
            )
            SELECT
              (SELECT COUNT(*)::int + 1 FROM gamification_records
               WHERE total_points > (SELECT pts FROM own_pts)) AS rank,
              u.user_id,
              ${DISPLAY_NAME} AS display_name,
              (SELECT pts FROM own_pts) AS total_points
            FROM users u
            WHERE u.user_id = $1
          `, [req.user.user_id, cr[0].collector_id]);

          if (own.length) {
            ownEntry = {
              ...own[0],
              total_points: parseInt(own[0].total_points),
              level: computeLevel(parseInt(own[0].total_points)),
            };
          }
        }
      }
    }

    res.json({ leaderboard, ownEntry });
  } catch (err) {
    next(err);
  }
};

// POST /api/gamification/redeem
// Validates balance, creates a pending redemption record, decrements points.
// NOTE: Africa's Talking Airtime API call is stubbed here — mirrors the
// B2C-sandbox-limitation pattern used in the M-Pesa payout flow. The live
// disbursal via AT Airtime API is a documented follow-up, not yet wired up.
exports.redeemPoints = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const pointsInt = parseInt(req.body.points, 10);
    if (!pointsInt || pointsInt < MIN_REDEMPTION) {
      return res.status(400).json({
        error: `Minimum redemption is ${MIN_REDEMPTION} points`,
      });
    }

    const { rows: cr } = await client.query(
      'SELECT collector_id FROM collectors WHERE user_id = $1',
      [req.user.user_id]
    );
    if (!cr.length) return res.status(404).json({ error: 'Collector profile not found' });
    const collector_id = cr[0].collector_id;

    await client.query('BEGIN');

    // Lock the row so concurrent redemptions can't double-spend
    const { rows: gr } = await client.query(
      'SELECT total_points FROM gamification_records WHERE collector_id = $1 FOR UPDATE',
      [collector_id]
    );
    const currentPoints = gr.length ? gr[0].total_points : 0;

    if (currentPoints < pointsInt) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: `Insufficient points. You have ${currentPoints} point${currentPoints !== 1 ? 's' : ''}.`,
      });
    }

    await client.query(
      `UPDATE gamification_records
       SET total_points = total_points - $1, last_updated = NOW()
       WHERE collector_id = $2`,
      [pointsInt, collector_id]
    );

    const airtimeKes = (pointsInt / POINTS_PER_KES).toFixed(2);
    const { rows: redemption } = await client.query(
      `INSERT INTO redemptions (collector_id, points_spent, airtime_value_kes, status)
       VALUES ($1, $2, $3, 'pending')
       RETURNING redemption_id, points_spent, airtime_value_kes, status, requested_at`,
      [collector_id, pointsInt, airtimeKes]
    );

    await client.query('COMMIT');
    res.status(201).json({ redemption: redemption[0] });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    next(err);
  } finally {
    client.release();
  }
};
