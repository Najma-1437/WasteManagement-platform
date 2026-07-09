const pool = require("../config/db");
const reverseGeocode = require("../utils/reverseGeocode");

const CATEGORIES = ["organic", "plastic", "metal", "e-waste"];

// Best-effort, fire-and-forget: resolve the log's coordinates to an address
// and store it. Runs after the response is sent so geocoding latency/failures
// never affect the API call.
function geocodeAndStoreAddress(logId, latitude, longitude) {
  reverseGeocode(latitude, longitude)
    .then((address) => {
      if (!address) return;
      return pool.query(
        "UPDATE waste_logs SET address = $1 WHERE log_id = $2",
        [address, logId],
      );
    })
    .catch((err) => console.error("[geocodeAndStoreAddress] error:", err));
}

// POST /api/waste-logs
const createLog = async (req, res, next) => {
  try {
    const { category, weight_kg, latitude, longitude, notes, client_id } = req.body;

    if (!category || !weight_kg || latitude == null || longitude == null) {
      return res
        .status(400)
        .json({ error: "Category, weight, and location are all required" });
    }

    const weight = parseFloat(weight_kg);
    if (!Number.isFinite(weight) || weight <= 0) {
      return res.status(400).json({ error: "Weight must be a number greater than 0" });
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
      return res.status(400).json({ error: "Latitude must be a number between -90 and 90" });
    }
    if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
      return res.status(400).json({ error: "Longitude must be a number between -180 and 180" });
    }

    // Idempotency: if this client_id was already processed, return the
    // existing row so retried offline syncs don't create duplicate logs.
    if (client_id) {
      const existing = await pool.query(
        `SELECT log_id, category, weight_kg, latitude, longitude, address, status, notes, created_at
         FROM waste_logs WHERE client_id = $1`,
        [client_id],
      );
      if (existing.rows.length > 0) {
        return res.status(200).json({ log: existing.rows[0] });
      }
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

    let result;
    try {
      result = await pool.query(
        `INSERT INTO waste_logs
          (collector_id, category, weight_kg, latitude, longitude, location, notes, source, client_id)
         VALUES ($1, $2, $3, $4, $5, $6::geography, $7, 'web', $8)
         RETURNING log_id, category, weight_kg, latitude, longitude, address, status, notes, created_at`,
        [
          collector_id,
          category,
          weight_kg,
          latitude || null,
          longitude || null,
          locationValue,
          notes || null,
          client_id || null,
        ],
      );
    } catch (insertErr) {
      if (insertErr.code === '23505' && client_id) {
        // Race condition: two concurrent requests both passed the SELECT
        // check before either INSERT committed. The other request won;
        // re-read the now-committed row and return it as a duplicate.
        const raceRow = await pool.query(
          `SELECT log_id, category, weight_kg, latitude, longitude, address, status, notes, created_at
           FROM waste_logs WHERE client_id = $1`,
          [client_id],
        );
        return res.status(200).json({ log: raceRow.rows[0] });
      }
      throw insertErr;
    }

    res.status(201).json({ log: result.rows[0] });

    // Fire-and-forget: resolve a human-readable address for the coordinates
    geocodeAndStoreAddress(result.rows[0].log_id, lat, lng);

    // Fire-and-forget: award gamification points (10 flat + 2 per kg, rounded)
    const gPoints = Math.round(10 + 2 * parseFloat(result.rows[0].weight_kg));
    pool.query(
      `INSERT INTO gamification_records (collector_id, total_points, last_updated)
       VALUES ($1, $2, NOW())
       ON CONFLICT (collector_id)
       DO UPDATE SET total_points = gamification_records.total_points + $2,
                     last_updated = NOW()`,
      [collector_id, gPoints]
    ).catch(err => console.error('[createLog] gamification upsert error:', err));

    // Fire-and-forget: notify buyers whose active offers match this new log
    const { category: logCategory, weight_kg: logWeight } = result.rows[0];
    pool.query(
      `SELECT b.user_id, bo.zone
       FROM buyer_offers bo
       JOIN buyers b ON b.buyer_id = bo.buyer_id
       WHERE bo.category = $1
         AND bo.status = 'active'
         AND $2 >= bo.min_quantity_kg`,
      [logCategory, parseFloat(logWeight)]
    ).then(({ rows }) => {
      if (rows.length === 0) return;
      const msg = `A new ${parseFloat(logWeight).toFixed(1)}kg ${logCategory} log matches your offer in ${rows[0].zone}.`;
      const values = rows.map((_, i) => `($${i + 2}, 'in-app', $1)`).join(', ');
      const params = [msg, ...rows.map(r => r.user_id)];
      return pool.query(
        `INSERT INTO notifications (user_id, channel, message) VALUES ${values}`,
        params
      );
    }).catch(err => console.error('[createLog] buyer notification error:', err));
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
      `SELECT log_id, category, weight_kg, latitude, longitude, address, status, notes, created_at
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

// GET /api/waste-logs/my/matches
const getMyMatches = async (req, res, next) => {
  try {
    const collectorResult = await pool.query(
      "SELECT collector_id FROM collectors WHERE user_id = $1",
      [req.user.user_id],
    );

    if (collectorResult.rows.length === 0) {
      return res.status(404).json({ error: "Collector profile not found" });
    }

    const collector_id = collectorResult.rows[0].collector_id;

    // Buyer identity comes from wl.matched_buyer_id, not a join through
    // buyer_offers — confirmMatch (buyer.controller.js) sets that column
    // directly. Price is derived from the transaction's locked-in
    // amount_kes / confirmed_qty_kg rather than buyer_offers.price_per_kg,
    // since the offer's price can change after the match was made but the
    // transaction amount can't. bo.zone is the only thing that still needs
    // matched_offer_id, so it's null for any log matched before that
    // column started being populated.
    const result = await pool.query(
      `SELECT wl.log_id, wl.category, wl.weight_kg, wl.status, wl.created_at,
              t.amount_kes, t.confirmed_qty_kg,
              bo.zone,
              u.name AS buyer_name
       FROM waste_logs wl
       LEFT JOIN transactions t  ON t.log_id = wl.log_id
       LEFT JOIN buyers b        ON b.buyer_id = wl.matched_buyer_id
       LEFT JOIN users u         ON u.user_id = b.user_id
       LEFT JOIN buyer_offers bo ON bo.offer_id = wl.matched_offer_id
       WHERE wl.collector_id = $1 AND wl.status IN ('matched', 'confirmed', 'paid', 'disputed')
       ORDER BY wl.created_at DESC`,
      [collector_id],
    );

    const matches = result.rows.map(row => {
      const amount = row.amount_kes != null ? parseFloat(row.amount_kes) : null;
      const qty = row.confirmed_qty_kg != null ? parseFloat(row.confirmed_qty_kg) : null;
      return {
        ...row,
        price_per_kg: amount != null && qty ? amount / qty : null,
      };
    });

    res.json({ matches });
  } catch (err) {
    next(err);
  }
};

// GET /api/waste-logs/my/earnings
const getMyEarnings = async (req, res, next) => {
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
      `SELECT t.transaction_id, t.amount_kes, t.confirmed_qty_kg,
              t.payment_status, t.mpesa_code, t.transaction_date,
              wl.category, wl.weight_kg, wl.created_at AS log_date
       FROM transactions t
       JOIN waste_logs wl ON wl.log_id = t.log_id
       WHERE wl.collector_id = $1
       ORDER BY t.transaction_date DESC`,
      [collector_id],
    );

    const transactions = result.rows;

    // 'released' is the terminal status once a B2C payout actually lands in
    // the collector's M-Pesa account (see buyer.controller.js
    // b2cResultCallback). 'completed' is never written by current code but
    // does appear on real rows (set by hand against the DB before the
    // escrow/payout flow existed) and represents the same "collector was
    // paid" outcome, so it's treated as earned too.
    const now = new Date();
    let total_earned = 0;
    let pending_amount = 0;
    let this_month_earned = 0;

    for (const t of transactions) {
      const amount = parseFloat(t.amount_kes);
      if (t.payment_status === "released" || t.payment_status === "completed") {
        total_earned += amount;
        const txDate = new Date(t.transaction_date);
        if (
          txDate.getFullYear() === now.getFullYear() &&
          txDate.getMonth() === now.getMonth()
        ) {
          this_month_earned += amount;
        }
      } else if (
        ["pending", "escrowed", "payout_initiated"].includes(t.payment_status)
      ) {
        pending_amount += amount;
      }
    }

    res.json({ transactions, total_earned, pending_amount, this_month_earned });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/waste-logs/:id
// Collectors may edit category, weight, and location — but only while the
// log is still 'pending'. Once a buyer claims it (status 'matched',
// confirmMatch in buyer.controller.js) a transaction already exists with the
// amount locked in from the original weight, so edits are blocked from then on.
const updateLog = async (req, res, next) => {
  try {
    const { category, weight_kg, latitude, longitude } = req.body;

    if (!category || !weight_kg || latitude == null || longitude == null) {
      return res
        .status(400)
        .json({ error: "Category, weight, and location are all required" });
    }

    if (!CATEGORIES.includes(category)) {
      return res.status(400).json({ error: "Invalid category" });
    }

    const weight = parseFloat(weight_kg);
    if (!Number.isFinite(weight) || weight <= 0) {
      return res.status(400).json({ error: "Weight must be a number greater than 0" });
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
      return res.status(400).json({ error: "Latitude must be a number between -90 and 90" });
    }
    if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
      return res.status(400).json({ error: "Longitude must be a number between -180 and 180" });
    }

    const collectorResult = await pool.query(
      "SELECT collector_id FROM collectors WHERE user_id = $1",
      [req.user.user_id],
    );

    if (collectorResult.rows.length === 0) {
      return res.status(404).json({ error: "Collector profile not found" });
    }

    const collector_id = collectorResult.rows[0].collector_id;

    // Stale address is cleared when the coordinates actually change; the
    // fire-and-forget geocode below then fills it back in.
    const result = await pool.query(
      `UPDATE waste_logs
       SET category  = $1,
           weight_kg = $2,
           address   = CASE
                         WHEN latitude IS DISTINCT FROM $3 OR longitude IS DISTINCT FROM $4
                         THEN NULL ELSE address
                       END,
           latitude  = $3,
           longitude = $4,
           location  = $5::geography
       WHERE log_id = $6 AND collector_id = $7 AND status = 'pending'
       RETURNING log_id, category, weight_kg, latitude, longitude, address, status, notes, created_at`,
      [
        category,
        weight,
        lat,
        lng,
        `SRID=4326;POINT(${lng} ${lat})`,
        req.params.id,
        collector_id,
      ],
    );

    if (result.rows.length === 0) {
      return res.status(409).json({
        error:
          "Log not found, does not belong to this collector, or has already been claimed by a buyer and can no longer be edited.",
      });
    }

    res.json({ log: result.rows[0] });

    if (result.rows[0].address == null) {
      geocodeAndStoreAddress(result.rows[0].log_id, lat, lng);
    }
  } catch (err) {
    next(err);
  }
};

const DISPUTE_REASONS = [
  "wrong_weight",
  "wrong_category",
  "no_show",
  "payment_issue",
  "other",
];

// POST /api/waste-logs/:id/dispute
// Either party to a match — the collector who logged it or the buyer who
// claimed it — can raise a dispute. Only 'matched' and 'confirmed' logs are
// disputable: 'pending' has no counterparty yet, and 'paid' is terminal
// (admin resolution can only land on 'confirmed' or 'pending', so disputing
// a paid log would destroy its paid state).
const raiseDispute = async (req, res, next) => {
  try {
    const { reason, details } = req.body;

    if (!reason || !DISPUTE_REASONS.includes(reason)) {
      return res.status(400).json({
        error: `Reason is required and must be one of: ${DISPUTE_REASONS.join(", ")}`,
      });
    }

    const logResult = await pool.query(
      `SELECT wl.log_id, wl.status, wl.collector_id, wl.matched_buyer_id,
              c.user_id AS collector_user_id,
              b.user_id AS buyer_user_id
       FROM waste_logs wl
       JOIN collectors c    ON c.collector_id = wl.collector_id
       LEFT JOIN buyers b   ON b.buyer_id = wl.matched_buyer_id
       WHERE wl.log_id = $1`,
      [req.params.id],
    );

    if (logResult.rows.length === 0) {
      return res.status(404).json({ error: "Log not found" });
    }

    const log = logResult.rows[0];
    const isParty =
      req.user.user_id === log.collector_user_id ||
      (log.buyer_user_id != null && req.user.user_id === log.buyer_user_id);

    if (!isParty) {
      return res.status(403).json({ error: "You are not a party to this waste log" });
    }

    // Optimistic lock on status so concurrent disputes/edits can't collide
    const result = await pool.query(
      `UPDATE waste_logs
       SET status          = 'disputed',
           dispute_reason  = $1,
           dispute_details = $2,
           disputed_by     = $3,
           disputed_at     = NOW()
       WHERE log_id = $4 AND status IN ('matched', 'confirmed')
       RETURNING log_id, status, dispute_reason, dispute_details, disputed_by, disputed_at`,
      [reason, details || null, req.user.user_id, req.params.id],
    );

    if (result.rows.length === 0) {
      return res.status(409).json({
        error:
          log.status === "disputed"
            ? "This log is already under dispute."
            : `Only matched or confirmed logs can be disputed (this log is '${log.status}').`,
      });
    }

    res.json({ log: result.rows[0] });

    // Fire-and-forget: tell the other party a dispute was opened
    const counterpartUserId =
      req.user.user_id === log.collector_user_id ? log.buyer_user_id : log.collector_user_id;
    if (counterpartUserId != null) {
      pool.query(
        `INSERT INTO notifications (user_id, channel, message) VALUES ($1, 'in-app', $2)`,
        [
          counterpartUserId,
          `A dispute (${reason.replace(/_/g, " ")}) was raised on waste log #${log.log_id}. An admin will review it.`,
        ],
      ).catch(err => console.error("[raiseDispute] notification error:", err));
    }
  } catch (err) {
    next(err);
  }
};

// DELETE /api/waste-logs/:id
const deleteLog = async (req, res, next) => {
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
      `DELETE FROM waste_logs
       WHERE log_id = $1 AND collector_id = $2 AND status = 'pending'
       RETURNING log_id`,
      [req.params.id, collector_id],
    );

    if (result.rows.length === 0) {
      return res.status(409).json({
        error:
          "Log not found, does not belong to this collector, or is already matched and cannot be deleted.",
      });
    }

    res.status(204).end();
  } catch (err) {
    next(err);
  }
};

// GET /api/waste-logs/:id
const getLogById = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT log_id, collector_id, category, weight_kg, latitude, longitude, address, status, notes, created_at
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

module.exports = { createLog, getMyLogs, getLogById, updateLog, raiseDispute, deleteLog, getMyEarnings, getMyMatches };
