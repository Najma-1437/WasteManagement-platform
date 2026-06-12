const pool = require("../config/db");

// POST /api/waste-logs
const createLog = async (req, res, next) => {
  try {
    const { category, weight_kg, latitude, longitude, notes } = req.body;

    if (!category || !weight_kg) {
      return res
        .status(400)
        .json({ error: "Category and weight are required" });
    }

    // Get collector_id from user_id
    const collectorResult = await pool.query(
      "SELECT collector_id FROM collectors WHERE user_id = $1",
      [req.user.user_id],
    );

    if (collectorResult.rows.length === 0) {
      return res.status(404).json({ error: "Collector profile not found" });
    }

    const collector_id = collectorResult.rows[0].collector_id;

    let locationValue = null;
    if (latitude && longitude) {
      locationValue = `SRID=4326;POINT(${longitude} ${latitude})`;
    }

    const result = await pool.query(
      `INSERT INTO waste_logs 
        (collector_id, category, weight_kg, latitude, longitude, location, notes, source)
       VALUES ($1, $2, $3, $4, $5, $6::geography, $7, 'web')
       RETURNING log_id, category, weight_kg, latitude, longitude, status, notes, created_at`,
      [
        collector_id,
        category,
        weight_kg,
        latitude || null,
        longitude || null,
        locationValue,
        notes || null,
      ],
    );

    res.status(201).json({ log: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

// GET /api/waste-logs/my
const getMyLogs = async (req, res, next) => {
  try {
    const collectorResult = await pool.query(
      "SELECT collector_id FROM collectors WHERE user_id = $1",
      [req.user.user_id],
    );

    if (collectorResult.rows.length === 0) {
      return res.status(404).json({ error: "Collector profile not found" });
    }

    const collector_id = collectorResult.rows[0].collector_id;

    const result = await pool.query(
      `SELECT log_id, category, weight_kg, latitude, longitude, status, notes, created_at
       FROM waste_logs
       WHERE collector_id = $1
       ORDER BY created_at DESC`,
      [collector_id],
    );

    res.json({ logs: result.rows });
  } catch (err) {
    next(err);
  }
};

// GET /api/waste-logs/:id
const getLogById = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT log_id, collector_id, category, weight_kg, latitude, longitude, status, notes, created_at
       FROM waste_logs WHERE log_id = $1`,
      [req.params.id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Log not found" });
    }

    res.json({ log: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

module.exports = { createLog, getMyLogs, getLogById };
