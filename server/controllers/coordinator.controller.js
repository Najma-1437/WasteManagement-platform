const pool = require('../config/db');

// Named zones as lat/lng bounding boxes (Nairobi areas).
// Listed specific-first: when boxes overlap the first match wins.
const ZONE_BOUNDS = {
  // ── Central ──────────────────────────────────────────────────────────────
  'CBD':              { minLat: -1.305, maxLat: -1.265, minLng: 36.810, maxLng: 36.840 },
  'Upper Hill':       { minLat: -1.312, maxLat: -1.285, minLng: 36.808, maxLng: 36.828 },
  'Industrial Area':  { minLat: -1.328, maxLat: -1.292, minLng: 36.838, maxLng: 36.872 },

  // ── North ────────────────────────────────────────────────────────────────
  'Parklands':        { minLat: -1.278, maxLat: -1.250, minLng: 36.808, maxLng: 36.838 },
  'Westlands':        { minLat: -1.282, maxLat: -1.250, minLng: 36.772, maxLng: 36.812 },
  'Muthaiga':         { minLat: -1.262, maxLat: -1.225, minLng: 36.830, maxLng: 36.858 },
  'Gigiri':           { minLat: -1.242, maxLat: -1.198, minLng: 36.795, maxLng: 36.840 },
  'Runda':            { minLat: -1.218, maxLat: -1.178, minLng: 36.790, maxLng: 36.832 },
  'Roysambu':         { minLat: -1.242, maxLat: -1.195, minLng: 36.848, maxLng: 36.892 },
  'Ruaraka':          { minLat: -1.262, maxLat: -1.220, minLng: 36.862, maxLng: 36.905 },
  'Zimmerman':        { minLat: -1.218, maxLat: -1.172, minLng: 36.878, maxLng: 36.918 },
  'Githurai':         { minLat: -1.200, maxLat: -1.155, minLng: 36.855, maxLng: 36.902 },
  'Kahawa':           { minLat: -1.200, maxLat: -1.155, minLng: 36.898, maxLng: 36.950 },
  'Kasarani':         { minLat: -1.248, maxLat: -1.195, minLng: 36.868, maxLng: 36.928 },

  // ── East ─────────────────────────────────────────────────────────────────
  'Eastleigh':        { minLat: -1.292, maxLat: -1.255, minLng: 36.835, maxLng: 36.870 },
  'Mathare':          { minLat: -1.272, maxLat: -1.235, minLng: 36.843, maxLng: 36.878 },
  'Buruburu':         { minLat: -1.310, maxLat: -1.272, minLng: 36.865, maxLng: 36.898 },
  'Donholm':          { minLat: -1.320, maxLat: -1.278, minLng: 36.888, maxLng: 36.922 },
  'Umoja':            { minLat: -1.295, maxLat: -1.262, minLng: 36.892, maxLng: 36.932 },
  'Kayole':           { minLat: -1.292, maxLat: -1.255, minLng: 36.920, maxLng: 36.962 },
  'Komarock':         { minLat: -1.278, maxLat: -1.240, minLng: 36.928, maxLng: 36.972 },
  'Njiru':            { minLat: -1.260, maxLat: -1.218, minLng: 36.948, maxLng: 36.995 },
  'Ruai':             { minLat: -1.295, maxLat: -1.248, minLng: 36.958, maxLng: 37.015 },
  'Embakasi':         { minLat: -1.342, maxLat: -1.278, minLng: 36.860, maxLng: 36.930 },

  // ── South ────────────────────────────────────────────────────────────────
  'South B':          { minLat: -1.340, maxLat: -1.308, minLng: 36.808, maxLng: 36.838 },
  'South C':          { minLat: -1.348, maxLat: -1.315, minLng: 36.792, maxLng: 36.818 },
  'Kibera':           { minLat: -1.335, maxLat: -1.295, minLng: 36.773, maxLng: 36.812 },
  'Lang\'ata':        { minLat: -1.368, maxLat: -1.308, minLng: 36.718, maxLng: 36.785 },
  'Karen':            { minLat: -1.368, maxLat: -1.312, minLng: 36.678, maxLng: 36.732 },
  'Ongata Rongai':    { minLat: -1.428, maxLat: -1.372, minLng: 36.718, maxLng: 36.780 },
  'Ngong':            { minLat: -1.385, maxLat: -1.338, minLng: 36.628, maxLng: 36.692 },
  'Athi River':       { minLat: -1.480, maxLat: -1.428, minLng: 36.958, maxLng: 37.020 },

  // ── West ─────────────────────────────────────────────────────────────────
  'Kileleshwa':       { minLat: -1.290, maxLat: -1.260, minLng: 36.768, maxLng: 36.798 },
  'Kilimani':         { minLat: -1.312, maxLat: -1.280, minLng: 36.775, maxLng: 36.812 },
  'Lavington':        { minLat: -1.310, maxLat: -1.272, minLng: 36.750, maxLng: 36.778 },
  'Kawangware':       { minLat: -1.308, maxLat: -1.265, minLng: 36.730, maxLng: 36.762 },
  'Kangemi':          { minLat: -1.282, maxLat: -1.248, minLng: 36.718, maxLng: 36.758 },
  'Riruta':           { minLat: -1.328, maxLat: -1.295, minLng: 36.725, maxLng: 36.758 },
  'Dagoretti':        { minLat: -1.342, maxLat: -1.308, minLng: 36.732, maxLng: 36.778 },
};

function classifyZone(lat, lng) {
  if (lat == null || lng == null) return 'Unknown';
  for (const [name, b] of Object.entries(ZONE_BOUNDS)) {
    if (lat >= b.minLat && lat <= b.maxLat && lng >= b.minLng && lng <= b.maxLng) {
      return name;
    }
  }
  return 'Other';
}

// Build a parameterized query for filtering waste_logs
function buildFilterQuery({ category, zone, from, to }, extraConditions = []) {
  const conditions = [...extraConditions];
  const params = [];
  let p = 1;

  if (category && category !== 'all') {
    conditions.push(`category = $${p++}`);
    params.push(category);
  }

  if (from) {
    conditions.push(`created_at >= $${p++}::date`);
    params.push(from);
  }

  if (to) {
    conditions.push(`created_at < ($${p++}::date + interval '1 day')`);
    params.push(to);
  }

  if (zone && zone !== 'all' && ZONE_BOUNDS[zone]) {
    const b = ZONE_BOUNDS[zone];
    conditions.push(`latitude BETWEEN $${p} AND $${p + 1}`);
    conditions.push(`longitude BETWEEN $${p + 2} AND $${p + 3}`);
    p += 4;
    params.push(b.minLat, b.maxLat, b.minLng, b.maxLng);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  return { where, params };
}

// GET /api/coordinator/heatmap
const getHeatmap = async (req, res, next) => {
  try {
    const { where, params } = buildFilterQuery(req.query, [
      'latitude IS NOT NULL',
      'longitude IS NOT NULL',
    ]);

    const result = await pool.query(
      `SELECT latitude, longitude FROM waste_logs ${where} ORDER BY created_at DESC`,
      params,
    );

    const points = result.rows.map(r => ({
      lat: parseFloat(r.latitude),
      lng: parseFloat(r.longitude),
    }));

    res.json({ points });
  } catch (err) {
    next(err);
  }
};

// GET /api/coordinator/stats
const getStats = async (req, res, next) => {
  try {
    const { where, params } = buildFilterQuery(req.query);

    const result = await pool.query(
      `SELECT latitude, longitude, category, weight_kg FROM waste_logs ${where}`,
      params,
    );

    const rows = result.rows;
    const total = rows.length;

    // Aggregate by zone — only logs that have GPS coordinates count toward hotspots.
    // Null-coordinate logs are included in the total but have no geographic location.
    const zoneCounts = {};
    for (const row of rows) {
      if (row.latitude == null || row.longitude == null) continue;
      const zone = classifyZone(parseFloat(row.latitude), parseFloat(row.longitude));
      zoneCounts[zone] = (zoneCounts[zone] || 0) + 1;
    }

    const hotspots = Object.entries(zoneCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([zone, count]) => ({ zone, count }));

    // Aggregate by category
    const catCounts = {};
    for (const row of rows) {
      catCounts[row.category] = (catCounts[row.category] || 0) + 1;
    }

    const breakdown = Object.entries(catCounts)
      .map(([category, count]) => ({
        category,
        count,
        pct: total > 0 ? Math.round((count / total) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);

    res.json({ total, hotspots, breakdown });
  } catch (err) {
    next(err);
  }
};

// GET /api/coordinator/export
const exportReport = async (req, res, next) => {
  try {
    const { where, params } = buildFilterQuery(req.query);

    const result = await pool.query(
      `SELECT latitude, longitude, category, weight_kg, created_at
       FROM waste_logs ${where} ORDER BY created_at DESC`,
      params,
    );

    // Group by zone + category + day
    const groups = {};
    for (const row of result.rows) {
      const zone = classifyZone(
        row.latitude != null ? parseFloat(row.latitude) : null,
        row.longitude != null ? parseFloat(row.longitude) : null,
      );
      const day = new Date(row.created_at).toISOString().slice(0, 10);
      const key = `${zone}||${row.category}||${day}`;
      if (!groups[key]) {
        groups[key] = { zone, category: row.category, day, count: 0, total_weight: 0 };
      }
      groups[key].count++;
      groups[key].total_weight += parseFloat(row.weight_kg || 0);
    }

    const lines = ['Zone,Category,Day,Count,Total Weight (kg)'];
    for (const g of Object.values(groups)) {
      lines.push(`"${g.zone}","${g.category}","${g.day}",${g.count},${g.total_weight.toFixed(2)}`);
    }

    const filename = `waste-report-${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(lines.join('\n'));
  } catch (err) {
    next(err);
  }
};

module.exports = { getHeatmap, getStats, exportReport };
