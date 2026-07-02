import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { getHeatmap, getStats, exportReport } from '../../api/coordinator';
import { useAuthStore } from '../../store/authStore';

const C = {
  primary:     '#1F6F4A',
  primaryDark: '#175438',
  accent:      '#E8A33D',
  bg:          '#F4F7F5',
  text:        '#1A1A1A',
  muted:       '#6B7280',
  border:      '#E5E7EB',
  white:       '#FFFFFF',
  danger:      '#B3261E',
};

const CATEGORIES = ['all', 'plastic', 'organic', 'metal', 'e-waste'];
const ZONES = [
  'all',
  // Central
  'CBD', 'Upper Hill', 'Industrial Area',
  // North
  'Parklands', 'Westlands', 'Muthaiga', 'Gigiri', 'Runda',
  'Roysambu', 'Ruaraka', 'Zimmerman', 'Githurai', 'Kahawa', 'Kasarani',
  // East
  'Eastleigh', 'Mathare', 'Buruburu', 'Donholm', 'Umoja',
  'Kayole', 'Komarock', 'Njiru', 'Ruai', 'Embakasi',
  // South
  'South B', 'South C', 'Kibera', "Lang'ata", 'Karen',
  'Ongata Rongai', 'Ngong', 'Athi River',
  // West
  'Kileleshwa', 'Kilimani', 'Lavington', 'Kawangware', 'Kangemi', 'Riruta', 'Dagoretti',
];

const CAT_COLORS = {
  plastic:  '#3B82F6',
  organic:  '#22C55E',
  metal:    '#F59E0B',
  'e-waste':'#EF4444',
};

function getWeekStart() {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff)).toISOString().slice(0, 10);
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

const css = `
  *, *::before, *::after { box-sizing: border-box; }

  .cd-root {
    min-height: 100vh;
    background: ${C.bg};
    font-family: Inter, system-ui, -apple-system, sans-serif;
    color: ${C.text};
  }

  /* ── Header ── */
  .cd-header {
    background: ${C.primary};
    position: sticky;
    top: 0;
    z-index: 200;
    box-shadow: 0 2px 8px rgba(0,0,0,0.15);
  }
  .cd-header-inner {
    max-width: 1280px;
    margin: 0 auto;
    padding: 0 24px;
    height: 64px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
  }
  .cd-logo {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 18px;
    font-weight: 700;
    color: #fff;
    white-space: nowrap;
  }
  .cd-logo-icon {
    width: 36px;
    height: 36px;
    background: rgba(255,255,255,0.2);
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
  }
  .cd-header-tabs {
    display: flex;
    gap: 4px;
  }
  .cd-header-tab {
    padding: 8px 20px;
    border-radius: 8px;
    border: none;
    background: transparent;
    color: rgba(255,255,255,0.7);
    font-weight: 600;
    font-size: 14px;
    cursor: pointer;
    transition: background 0.15s, color 0.15s;
    white-space: nowrap;
  }
  .cd-header-tab:hover  { background: rgba(255,255,255,0.12); color: #fff; }
  .cd-header-tab.active { background: rgba(255,255,255,0.2);  color: #fff; }
  .cd-header-right {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .cd-username {
    color: rgba(255,255,255,0.85);
    font-size: 14px;
    font-weight: 500;
  }
  .cd-logout {
    padding: 6px 14px;
    border-radius: 8px;
    border: 1px solid rgba(255,255,255,0.35);
    background: transparent;
    color: rgba(255,255,255,0.85);
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s;
  }
  .cd-logout:hover { background: rgba(255,255,255,0.12); }

  /* ── Mobile tabs ── */
  .cd-mobile-tabs {
    display: none;
    gap: 8px;
    padding: 16px 16px 0;
  }
  .cd-mobile-tab {
    flex: 1;
    padding: 10px 0;
    border-radius: 10px;
    border: none;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    background: ${C.white};
    color: ${C.text};
    box-shadow: 0 1px 2px rgba(0,0,0,0.06);
    transition: background 0.15s, color 0.15s;
  }
  .cd-mobile-tab.active { background: ${C.primary}; color: #fff; }

  /* ── Main ── */
  .cd-main {
    max-width: 1280px;
    margin: 0 auto;
    padding: 28px 24px 48px;
  }

  /* ── Filter bar ── */
  .cd-filters {
    background: ${C.white};
    border-radius: 14px;
    padding: 16px 20px;
    box-shadow: 0 1px 4px rgba(0,0,0,0.06);
    margin-bottom: 24px;
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    align-items: flex-end;
  }
  .cd-filter-group {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 120px;
  }
  .cd-filter-label {
    font-size: 11px;
    font-weight: 600;
    color: ${C.muted};
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .cd-select, .cd-date-input {
    padding: 8px 10px;
    border-radius: 8px;
    border: 1px solid ${C.border};
    font-size: 13px;
    font-family: inherit;
    background: #FAFAFA;
    color: ${C.text};
    outline: none;
    cursor: pointer;
    transition: border-color 0.15s;
  }
  .cd-select:focus, .cd-date-input:focus { border-color: ${C.primary}; background: #fff; }
  .cd-btn-preset {
    padding: 8px 14px;
    border-radius: 8px;
    border: 1px solid ${C.border};
    background: transparent;
    color: ${C.muted};
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s;
    align-self: flex-end;
  }
  .cd-btn-preset:hover { background: #E7F4EC; border-color: ${C.primary}; color: ${C.primary}; }

  /* ── Stats cards ── */
  .cd-stats {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
    margin-bottom: 28px;
  }
  .cd-stat {
    background: ${C.white};
    border-radius: 14px;
    padding: 20px 24px;
    box-shadow: 0 1px 4px rgba(0,0,0,0.06);
  }
  .cd-stat-label {
    font-size: 12px;
    font-weight: 600;
    color: ${C.muted};
    text-transform: uppercase;
    letter-spacing: 0.04em;
    margin-bottom: 8px;
  }
  .cd-stat-value {
    font-size: 32px;
    font-weight: 800;
    color: ${C.primary};
    line-height: 1;
    margin-bottom: 4px;
  }
  .cd-stat-sub {
    font-size: 13px;
    color: ${C.muted};
  }

  /* ── Section panel ── */
  .cd-panel {
    background: ${C.white};
    border-radius: 14px;
    padding: 24px;
    box-shadow: 0 1px 4px rgba(0,0,0,0.06);
    margin-bottom: 24px;
  }
  .cd-panel-title {
    font-size: 15px;
    font-weight: 700;
    margin: 0 0 18px;
  }

  /* ── Hotspots list ── */
  .cd-hotspot {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 0;
    border-bottom: 1px solid ${C.border};
  }
  .cd-hotspot:last-child { border-bottom: none; }
  .cd-hotspot-rank {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: ${C.primary};
    color: #fff;
    font-size: 13px;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .cd-hotspot-rank.r2 { background: ${C.accent}; }
  .cd-hotspot-rank.r3 { background: #9CA3AF; }
  .cd-hotspot-name { font-weight: 600; font-size: 14px; flex: 1; }
  .cd-hotspot-count {
    font-size: 13px;
    font-weight: 700;
    color: ${C.primary};
    background: #E7F4EC;
    padding: 3px 10px;
    border-radius: 20px;
  }

  /* ── Category breakdown bars ── */
  .cd-bar-row { margin-bottom: 14px; }
  .cd-bar-row:last-child { margin-bottom: 0; }
  .cd-bar-meta {
    display: flex;
    justify-content: space-between;
    font-size: 13px;
    margin-bottom: 5px;
  }
  .cd-bar-name { font-weight: 600; text-transform: capitalize; }
  .cd-bar-pct  { color: ${C.muted}; }
  .cd-bar-track {
    height: 8px;
    background: ${C.border};
    border-radius: 4px;
    overflow: hidden;
  }
  .cd-bar-fill {
    height: 100%;
    border-radius: 4px;
    transition: width 0.4s ease;
  }

  /* ── Overview 2-col grid ── */
  .cd-overview-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
  }

  /* ── Map container ── */
  .cd-map-wrap {
    position: relative;
    border-radius: 12px;
    overflow: hidden;
    height: 500px;
  }
  .cd-map-wrap .mapboxgl-map {
    height: 100%;
    width: 100%;
  }
  .cd-map-empty {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: #F0F4F2;
    color: ${C.muted};
    font-size: 14px;
    gap: 8px;
    z-index: 2;
  }
  .cd-map-empty-icon { font-size: 36px; }

  /* ── Export tab ── */
  .cd-export-panel {
    max-width: 480px;
  }
  .cd-export-desc {
    color: ${C.muted};
    font-size: 14px;
    margin: 0 0 20px;
    line-height: 1.6;
  }
  .cd-btn-export {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 12px 24px;
    border-radius: 10px;
    border: none;
    background: ${C.primary};
    color: #fff;
    font-weight: 700;
    font-size: 14px;
    cursor: pointer;
    transition: background 0.15s;
  }
  .cd-btn-export:hover:not(:disabled) { background: ${C.primaryDark}; }
  .cd-btn-export:disabled { opacity: 0.6; cursor: not-allowed; }
  .cd-export-success {
    margin-top: 14px;
    padding: 12px 16px;
    background: #E7F4EC;
    border-radius: 10px;
    color: ${C.primary};
    font-size: 13px;
    font-weight: 600;
  }

  /* ── Loading / error ── */
  .cd-loading {
    text-align: center;
    color: ${C.muted};
    padding: 60px 0;
    font-size: 14px;
  }
  .cd-error {
    background: #FDECEA;
    color: ${C.danger};
    border-radius: 10px;
    padding: 12px 16px;
    font-size: 13px;
    margin-bottom: 20px;
  }

  /* ── Responsive ── */
  @media (max-width: 767px) {
    .cd-header-tabs { display: none; }
    .cd-mobile-tabs { display: flex; }
    .cd-main { padding: 16px 16px 48px; }
    .cd-stats { grid-template-columns: 1fr 1fr; }
    .cd-overview-grid { grid-template-columns: 1fr; }
    .cd-username { display: none; }
    .cd-map-wrap { height: 360px; }
  }
  @media (max-width: 400px) {
    .cd-stats { grid-template-columns: 1fr; }
  }
`;

function buildGeoJSON(pts) {
  return {
    type: 'FeatureCollection',
    features: pts.map(p => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
      properties: {},
    })),
  };
}

// ── Heatmap pane (Mapbox GL JS) ───────────────────────────────────────────
function HeatmapPane({ points }) {
  const containerRef = useRef(null);
  const mapRef       = useRef(null);
  const loadedRef    = useRef(false);
  const pointsRef    = useRef(points);
  useEffect(() => { pointsRef.current = points; });

  useEffect(() => {
    if (!containerRef.current) return;
    mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [36.8172, -1.2864],
      zoom: 11,
    });
    mapRef.current = map;
    map.on('load', () => {
      loadedRef.current = true;
      map.addSource('waste-heat', {
        type: 'geojson',
        data: buildGeoJSON(pointsRef.current),
      });
      map.addLayer({
        id: 'waste-heat-layer',
        type: 'heatmap',
        source: 'waste-heat',
        paint: {
          'heatmap-weight': 1,
          'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 10, 1, 15, 3],
          'heatmap-radius':    ['interpolate', ['linear'], ['zoom'], 10, 20, 15, 40],
          'heatmap-opacity': 0.85,
          'heatmap-color': [
            'interpolate', ['linear'], ['heatmap-density'],
            0,   'rgba(0,0,255,0)',
            0.2, '#3B82F6',
            0.4, '#22C55E',
            0.6, '#F59E0B',
            0.8, '#EF4444',
            1,   '#B91C1C',
          ],
        },
      });
    });
    return () => {
      map.remove();
      mapRef.current    = null;
      loadedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!loadedRef.current || !mapRef.current) return;
    mapRef.current.getSource('waste-heat')?.setData(buildGeoJSON(points));
  }, [points]);

  return (
    <div className="cd-map-wrap">
      <div ref={containerRef} style={{ height: '100%', width: '100%' }} />
      {points.length === 0 && (
        <div className="cd-map-empty">
          <div className="cd-map-empty-icon">📍</div>
          <span>No location data for current filters</span>
        </div>
      )}
    </div>
  );
}

// ── Main dashboard ────────────────────────────────────────────────────────
export default function CoordinatorDashboard() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  function handleLogout() {
    navigate('/', { replace: true });
    logout();
  }

  const [tab, setTab] = useState('overview');

  const [filters, setFilters] = useState({
    category: 'all',
    zone:     'all',
    from:     getWeekStart(),
    to:       todayStr(),
  });

  const [stats,   setStats]   = useState(null);
  const [points,  setPoints]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  const [exporting,      setExporting]      = useState(false);
  const [exportSuccess,  setExportSuccess]  = useState(false);

  const fetchData = useCallback(async (f) => {
    setLoading(true);
    setError('');
    const params = {
      category: f.category !== 'all' ? f.category : undefined,
      zone:     f.zone     !== 'all' ? f.zone     : undefined,
      from:     f.from || undefined,
      to:       f.to   || undefined,
    };
    try {
      const [statsRes, heatRes] = await Promise.all([
        getStats(params),
        getHeatmap(params),
      ]);
      setStats(statsRes.data);
      setPoints(heatRes.data.points);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const params = { from: getWeekStart(), to: todayStr() };
    Promise.all([getStats(params), getHeatmap(params)])
      .then(([sRes, hRes]) => {
        setStats(sRes.data);
        setPoints(hRes.data.points);
      })
      .catch(err => setError(err.response?.data?.error || 'Failed to load dashboard data'))
      .finally(() => setLoading(false));
  }, []);

  function applyFilter(update) {
    const next = { ...filters, ...update };
    setFilters(next);
    fetchData(next);
  }

  function setThisWeek() {
    applyFilter({ from: getWeekStart(), to: todayStr() });
  }

  function setThisMonth() {
    const d = new Date();
    const from = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
    applyFilter({ from, to: todayStr() });
  }

  async function handleExport() {
    setExporting(true);
    setExportSuccess(false);
    setError('');
    try {
      const params = {
        category: filters.category !== 'all' ? filters.category : undefined,
        zone:     filters.zone     !== 'all' ? filters.zone     : undefined,
        from:     filters.from || undefined,
        to:       filters.to   || undefined,
      };
      const res = await exportReport(params);
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `waste-report-${todayStr()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      setExportSuccess(true);
    } catch {
      setError('Export failed. Please try again.');
    } finally {
      setExporting(false);
    }
  }

  const NAV_TABS = [
    { key: 'overview', label: 'Overview' },
    { key: 'export',   label: 'Export'   },
  ];

  return (
    <>
      <style>{css}</style>
      <div className="cd-root">

        {/* ── Header ── */}
        <header className="cd-header">
          <div className="cd-header-inner">
            <div className="cd-logo">
              Environmental Coordinator Dashboard
            </div>

            <nav className="cd-header-tabs">
              {NAV_TABS.map(t => (
                <button
                  key={t.key}
                  className={`cd-header-tab${tab === t.key ? ' active' : ''}`}
                  onClick={() => setTab(t.key)}
                >
                  {t.label}
                </button>
              ))}
            </nav>

            <div className="cd-header-right">
              <span className="cd-username">{user?.name}</span>
              <button className="cd-logout" onClick={handleLogout}>Logout</button>
            </div>
          </div>
        </header>

        {/* ── Mobile tabs ── */}
        <div className="cd-mobile-tabs">
          {NAV_TABS.map(t => (
            <button
              key={t.key}
              className={`cd-mobile-tab${tab === t.key ? ' active' : ''}`}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <main className="cd-main">

          {/* ── Filter bar ── */}
          <div className="cd-filters">
            <div className="cd-filter-group">
              <span className="cd-filter-label">Category</span>
              <select
                className="cd-select"
                value={filters.category}
                onChange={e => applyFilter({ category: e.target.value })}
              >
                {CATEGORIES.map(c => (
                  <option key={c} value={c}>{c === 'all' ? 'All categories' : c}</option>
                ))}
              </select>
            </div>

            <div className="cd-filter-group">
              <span className="cd-filter-label">Zone</span>
              <select
                className="cd-select"
                value={filters.zone}
                onChange={e => applyFilter({ zone: e.target.value })}
              >
                {ZONES.map(z => (
                  <option key={z} value={z}>{z === 'all' ? 'All zones' : z}</option>
                ))}
              </select>
            </div>

            <div className="cd-filter-group">
              <span className="cd-filter-label">From</span>
              <input
                type="date"
                className="cd-date-input"
                value={filters.from}
                max={filters.to || todayStr()}
                onChange={e => applyFilter({ from: e.target.value })}
              />
            </div>

            <div className="cd-filter-group">
              <span className="cd-filter-label">To</span>
              <input
                type="date"
                className="cd-date-input"
                value={filters.to}
                min={filters.from}
                max={todayStr()}
                onChange={e => applyFilter({ to: e.target.value })}
              />
            </div>

            <button className="cd-btn-preset" onClick={setThisWeek}>This week</button>
            <button className="cd-btn-preset" onClick={setThisMonth}>This month</button>
          </div>

          {error && <div className="cd-error">{error}</div>}

          {loading ? (
            <div className="cd-loading">Loading…</div>
          ) : (
            <>
              {/* ══ OVERVIEW TAB ══ */}
              {tab === 'overview' && stats && (
                <>
                  {/* Stat cards */}
                  <div className="cd-stats">
                    <div className="cd-stat">
                      <div className="cd-stat-label">Total Collections</div>
                      <div className="cd-stat-value">{stats.total}</div>
                      <div className="cd-stat-sub">waste logs in range</div>
                    </div>

                    <div className="cd-stat">
                      <div className="cd-stat-label">Top Zone</div>
                      <div className="cd-stat-value" style={{ fontSize: 20, paddingTop: 4 }}>
                        {stats.hotspots[0]?.zone ?? '—'}
                      </div>
                      <div className="cd-stat-sub">
                        {stats.hotspots[0] ? `${stats.hotspots[0].count} collections` : 'No data'}
                      </div>
                    </div>

                    <div className="cd-stat">
                      <div className="cd-stat-label">Top Category</div>
                      <div className="cd-stat-value" style={{ fontSize: 20, paddingTop: 4, textTransform: 'capitalize' }}>
                        {stats.breakdown[0]?.category ?? '—'}
                      </div>
                      <div className="cd-stat-sub">
                        {stats.breakdown[0] ? `${stats.breakdown[0].pct}% of total` : 'No data'}
                      </div>
                    </div>
                  </div>

                  {/* Two-col detail panels */}
                  <div className="cd-overview-grid">

                    {/* Hotspots */}
                    <div className="cd-panel">
                      <p className="cd-panel-title">Top Hotspots</p>
                      {stats.hotspots.length === 0 ? (
                        <p style={{ color: C.muted, fontSize: 14, margin: 0 }}>No zone data available.</p>
                      ) : (
                        stats.hotspots.map((h, i) => (
                          <div key={h.zone} className="cd-hotspot">
                            <div className={`cd-hotspot-rank r${i + 1}`}>{i + 1}</div>
                            <span className="cd-hotspot-name">{h.zone}</span>
                            <span className="cd-hotspot-count">{h.count}</span>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Category breakdown */}
                    <div className="cd-panel">
                      <p className="cd-panel-title">Category Breakdown</p>
                      {stats.breakdown.length === 0 ? (
                        <p style={{ color: C.muted, fontSize: 14, margin: 0 }}>No category data available.</p>
                      ) : (
                        stats.breakdown.map(b => (
                          <div key={b.category} className="cd-bar-row">
                            <div className="cd-bar-meta">
                              <span className="cd-bar-name">{b.category}</span>
                              <span className="cd-bar-pct">{b.count} ({b.pct}%)</span>
                            </div>
                            <div className="cd-bar-track">
                              <div
                                className="cd-bar-fill"
                                style={{
                                  width: `${b.pct}%`,
                                  background: CAT_COLORS[b.category] || C.primary,
                                }}
                              />
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                  </div>

                  {/* Collection heatmap */}
                  <div className="cd-panel" style={{ padding: 0, overflow: 'hidden', marginTop: 20 }}>
                    <HeatmapPane points={points} />
                  </div>
                </>
              )}

              {/* ══ EXPORT TAB ══ */}
              {tab === 'export' && (
                <div className="cd-panel cd-export-panel">
                  <p className="cd-panel-title">Export Report</p>
                  <p className="cd-export-desc">
                    Downloads a CSV grouped by zone, category, and day for the
                    current filter selection
                    {filters.from && filters.to ? ` (${filters.from} to ${filters.to})` : ''}.
                  </p>
                  <button
                    className="cd-btn-export"
                    onClick={handleExport}
                    disabled={exporting}
                  >
                    {exporting ? 'Generating…' : '⬇ Download CSV'}
                  </button>
                  {exportSuccess && (
                    <div className="cd-export-success">
                      CSV downloaded successfully.
                    </div>
                  )}
                </div>
              )}
            </>
          )}

        </main>
      </div>
    </>
  );
}
