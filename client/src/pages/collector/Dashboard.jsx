import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import api from '../../api/axiosClient';
import NotificationBell from '../../components/NotificationBell';
import EditLogModal from '../../components/EditLogModal';
import { getQueuedLogs } from '../../utils/offlineQueue';

const POINTS_PER_KES = 10; // 10 points = KES 1 airtime

function computeLevel(pts) {
  if (pts >= 3500) return 'Platinum';
  if (pts >= 1500) return 'Gold';
  if (pts >= 500)  return 'Silver';
  return 'Bronze';
}

const C = {
  primary:     '#1e6b3c',
  primaryDark: '#155230',
  bg:          '#F4F7F5',
  text:        '#1A1A1A',
  muted:       '#6B7280',
  border:      '#E5E7EB',
  white:       '#FFFFFF',
  danger:      '#B3261E',
};

const css = `
  *, *::before, *::after { box-sizing: border-box; }

  .cd-root {
    min-height: 100vh;
    background: ${C.bg};
    font-family: Inter, system-ui, -apple-system, sans-serif;
    color: ${C.text};
    display: flex;
  }

  /* ── Sidebar ── */
  .cd-sidebar {
    width: 240px;
    flex-shrink: 0;
    background: ${C.primary};
    display: flex;
    flex-direction: column;
    position: fixed;
    top: 0; left: 0; bottom: 0;
    z-index: 200;
    box-shadow: 2px 0 8px rgba(0,0,0,0.12);
  }

  .cd-sidebar-header {
    padding: 24px 20px 20px;
    border-bottom: 1px solid rgba(255,255,255,0.12);
  }
  .cd-logo-mark {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 15px;
    font-weight: 700;
    color: #fff;
    margin-bottom: 12px;
  }
  .cd-logo-icon {
    width: 34px;
    height: 34px;
    background: rgba(255,255,255,0.2);
    border-radius: 9px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
    flex-shrink: 0;
  }
  .cd-greeting {
    font-size: 13px;
    color: rgba(255,255,255,0.6);
    font-weight: 400;
    line-height: 1.4;
  }
  .cd-greeting strong {
    color: rgba(255,255,255,0.92);
    font-weight: 600;
  }

  .cd-nav {
    flex: 1;
    padding: 16px 12px;
    display: flex;
    flex-direction: column;
    gap: 2px;
    overflow-y: auto;
  }

  .cd-nav-item {
    display: flex;
    align-items: center;
    gap: 11px;
    padding: 11px 14px;
    border-radius: 10px;
    border: none;
    background: transparent;
    color: rgba(255,255,255,0.65);
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    text-align: left;
    width: 100%;
    transition: background 0.15s, color 0.15s;
    font-family: inherit;
  }
  .cd-nav-item:hover { background: rgba(255,255,255,0.1); color: #fff; }
  .cd-nav-item.active { background: rgba(255,255,255,0.18); color: #fff; }
  .cd-nav-item.soon { opacity: 0.55; cursor: default; }
  .cd-nav-item.soon:hover { background: transparent; color: rgba(255,255,255,0.65); }
  .cd-nav-icon {
    font-size: 16px;
    flex-shrink: 0;
    width: 20px;
    text-align: center;
  }
  .cd-soon-badge {
    margin-left: auto;
    font-size: 10px;
    font-weight: 700;
    color: rgba(255,255,255,0.45);
    background: rgba(255,255,255,0.1);
    border-radius: 8px;
    padding: 2px 7px;
    letter-spacing: 0.3px;
  }

  .cd-sidebar-footer {
    padding: 12px;
    border-top: 1px solid rgba(255,255,255,0.12);
  }
  .cd-nav-logout { color: rgba(255,255,255,0.6); }
  .cd-nav-logout:hover { background: rgba(255,255,255,0.08); color: #fff; }

  /* ── Main content ── */
  .cd-content {
    margin-left: 240px;
    flex: 1;
    min-width: 0;
  }

  .cd-main {
    max-width: 1100px;
    margin: 0 auto;
    padding: 36px 32px 56px;
  }

  .cd-page-title {
    font-size: 24px;
    font-weight: 700;
    color: ${C.text};
    margin: 0 0 28px;
  }

  /* ── Stat cards ── */
  .cd-stats {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
    margin-bottom: 32px;
  }
  .cd-stat {
    background: ${C.white};
    border-radius: 14px;
    padding: 22px 24px;
    box-shadow: 0 1px 4px rgba(0,0,0,0.06);
  }
  .cd-stat-icon { font-size: 22px; margin-bottom: 12px; }
  .cd-stat-label {
    font-size: 11px;
    font-weight: 700;
    color: ${C.muted};
    text-transform: uppercase;
    letter-spacing: 0.6px;
    margin-bottom: 6px;
  }
  .cd-stat-value {
    font-size: 26px;
    font-weight: 800;
    color: ${C.text};
    line-height: 1;
    margin-bottom: 5px;
  }
  .cd-stat-sub {
    font-size: 12px;
    color: ${C.muted};
  }

  /* ── Level badges ── */
  .cd-level-badge {
    display: inline-block;
    font-size: 10px;
    font-weight: 700;
    padding: 2px 8px;
    border-radius: 10px;
    text-transform: uppercase;
    letter-spacing: 0.4px;
  }
  .cd-level-bronze   { background: #FDF0E7; color: #9B6133; }
  .cd-level-silver   { background: #F4F4F4; color: #6B7280; }
  .cd-level-gold     { background: #FFFAE7; color: #B77B00; }
  .cd-level-platinum { background: #F0F0FF; color: #5B21B6; }

  /* ── Redeem button (inside stat card) ── */
  .cd-redeem-btn {
    margin-top: 10px;
    width: 100%;
    padding: 8px 0;
    border-radius: 8px;
    border: 1px solid rgba(30,107,60,0.4);
    background: transparent;
    color: ${C.primary};
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    font-family: inherit;
    transition: background 0.15s;
  }
  .cd-redeem-btn:hover { background: rgba(30,107,60,0.06); }

  /* ── Redeem modal ── */
  .cd-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.35);
    z-index: 400;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
  }
  .cd-modal {
    background: #fff;
    border-radius: 18px;
    padding: 28px;
    width: 100%;
    max-width: 360px;
    box-shadow: 0 8px 40px rgba(0,0,0,0.18);
  }
  .cd-modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 20px;
  }
  .cd-modal-title {
    font-size: 17px;
    font-weight: 700;
    color: ${C.text};
    margin: 0;
  }
  .cd-modal-close {
    background: none;
    border: none;
    font-size: 20px;
    cursor: pointer;
    color: ${C.muted};
    padding: 2px 6px;
    border-radius: 6px;
    line-height: 1;
  }
  .cd-modal-close:hover { background: #F3F4F6; }
  .cd-redeem-preview {
    background: #F0FBF4;
    border-radius: 10px;
    padding: 10px 14px;
    margin: 6px 0 14px;
    font-size: 15px;
    color: ${C.primary};
    font-weight: 700;
    text-align: center;
  }
  .cd-modal-input {
    width: 100%;
    padding: 10px 12px;
    border-radius: 8px;
    border: 1px solid ${C.border};
    font-size: 14px;
    font-family: inherit;
    margin-bottom: 8px;
    outline: none;
    transition: border-color 0.15s;
  }
  .cd-modal-input:focus { border-color: ${C.primary}; }
  .cd-modal-submit {
    width: 100%;
    padding: 11px 0;
    border-radius: 10px;
    border: none;
    background: ${C.primary};
    color: #fff;
    font-weight: 700;
    font-size: 14px;
    cursor: pointer;
    font-family: inherit;
    transition: background 0.15s;
  }
  .cd-modal-submit:hover:not(:disabled) { background: ${C.primaryDark}; }
  .cd-modal-submit:disabled { opacity: 0.6; cursor: not-allowed; }
  .cd-modal-error { color: ${C.danger}; font-size: 12px; margin: 0 0 10px; }
  .cd-modal-success { text-align: center; }

  /* ── Recent logs table card ── */
  .cd-table-card {
    background: ${C.white};
    border-radius: 14px;
    box-shadow: 0 1px 4px rgba(0,0,0,0.06);
    overflow: hidden;
  }
  .cd-table-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 18px 24px 14px;
    border-bottom: 1px solid ${C.border};
  }
  .cd-table-title {
    font-size: 16px;
    font-weight: 700;
    color: ${C.text};
    margin: 0;
  }
  .cd-table-count {
    font-size: 12px;
    color: ${C.muted};
    font-weight: 500;
  }

  .cd-table-wrap { overflow-x: auto; }
  .cd-table {
    width: 100%;
    border-collapse: collapse;
    min-width: 560px;
  }
  .cd-table th {
    padding: 10px 16px;
    text-align: left;
    font-size: 11px;
    font-weight: 700;
    color: ${C.muted};
    text-transform: uppercase;
    letter-spacing: 0.5px;
    background: #FAFAFA;
    border-bottom: 1px solid ${C.border};
    white-space: nowrap;
  }
  .cd-table td {
    padding: 13px 16px;
    font-size: 13px;
    color: ${C.text};
    border-bottom: 1px solid #F3F4F6;
    vertical-align: middle;
  }
  .cd-table tr:last-child td { border-bottom: none; }
  .cd-table tbody tr:hover td { background: #FAFBFA; }

  .cd-empty {
    text-align: center;
    padding: 56px 20px;
    color: ${C.muted};
  }
  .cd-empty-icon { font-size: 36px; margin-bottom: 10px; }
  .cd-empty p { margin: 4px 0; font-size: 14px; }

  /* ── Status pills ── */
  .cd-pill {
    display: inline-flex;
    align-items: center;
    font-size: 11px;
    font-weight: 700;
    padding: 3px 10px;
    border-radius: 20px;
    text-transform: capitalize;
    white-space: nowrap;
  }
  .cd-pill-pending          { background: #FFF4E5; color: #D97706; }
  .cd-pill-matched          { background: #EFF6FF; color: #2563EB; }
  .cd-pill-escrowed         { background: #EFF6FF; color: #2563EB; }
  .cd-pill-payout_initiated { background: #EFF6FF; color: #2563EB; }
  .cd-pill-released         { background: #E7F4EC; color: #1e6b3c; }
  .cd-pill-paid             { background: #E7F4EC; color: #1e6b3c; }
  .cd-pill-payout_failed    { background: #FDECEA; color: #B3261E; }
  .cd-pill-confirmed        { background: #FFF4E5; color: #D97706; }
  .cd-pill-disputed         { background: #FDECEA; color: #B3261E; }

  .cd-view-all-btn {
    background: none;
    border: none;
    color: ${C.primary};
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    font-family: inherit;
    padding: 0;
    text-decoration: none;
  }
  .cd-view-all-btn:hover { text-decoration: underline; }

  .cd-edit-btn {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 14px;
    color: #1e6b3c;
    padding: 3px 6px;
    border-radius: 6px;
    line-height: 1;
    transition: background 0.12s;
    font-family: inherit;
  }
  .cd-edit-btn:hover { background: #EAF4EE; }
  .cd-delete-btn {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 14px;
    color: #e53e3e;
    padding: 3px 6px;
    border-radius: 6px;
    line-height: 1;
    transition: background 0.12s;
    font-family: inherit;
  }
  .cd-delete-btn:hover { background: #FDECEA; }

  /* ── Mobile top bar ── */
  .cd-mobile-top { display: none; }
  .cd-mobile-header {
    background: ${C.primary};
    padding: 14px 16px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    box-shadow: 0 2px 8px rgba(0,0,0,0.12);
    position: sticky;
    top: 0;
    z-index: 100;
  }
  .cd-mobile-logo {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 15px;
    font-weight: 700;
    color: #fff;
  }
  .cd-mobile-logo-icon {
    width: 30px; height: 30px;
    background: rgba(255,255,255,0.2);
    border-radius: 8px;
    display: flex; align-items: center; justify-content: center;
    font-size: 14px;
  }
  .cd-mobile-btn {
    padding: 6px 14px;
    border-radius: 8px;
    border: 1px solid rgba(255,255,255,0.35);
    background: transparent;
    color: rgba(255,255,255,0.85);
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    font-family: inherit;
    transition: background 0.15s;
  }
  .cd-mobile-btn:hover { background: rgba(255,255,255,0.12); }

  /* ── Pending-sync notice (sidebar) ── */
  .cd-sync-notice {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 4px 12px 0;
    padding: 8px 12px;
    border-radius: 10px;
    background: rgba(255,255,255,0.08);
    font-size: 12px;
    color: rgba(255,255,255,0.75);
    font-weight: 600;
    cursor: default;
  }
  .cd-sync-dot {
    width: 8px; height: 8px;
    border-radius: 50%;
    background: #F59E0B;
    flex-shrink: 0;
    animation: cd-pulse 1.5s ease-in-out infinite;
  }
  @keyframes cd-pulse {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0.4; }
  }

  @media (max-width: 767px) {
    .cd-sidebar    { display: none; }
    .cd-content    { margin-left: 0; }
    .cd-mobile-top { display: block; }
    .cd-main       { padding: 20px 16px 48px; }
    .cd-stats      { grid-template-columns: 1fr 1fr; gap: 12px; }
    .cd-stat       { padding: 16px 16px; }
    .cd-stat-value { font-size: 22px; }
  }

  @media (max-width: 420px) {
    .cd-stats { grid-template-columns: 1fr; }
  }
`;

function formatLocation(lat, lng) {
  if (lat == null || lng == null) return '—';
  return `${parseFloat(lat).toFixed(4)}, ${parseFloat(lng).toFixed(4)}`;
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-KE', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

function StatusPill({ status }) {
  const cls = `cd-pill cd-pill-${status}`;
  const label = status?.replace(/_/g, ' ') ?? '—';
  return <span className={cls}>{label}</span>;
}

export default function CollectorDashboard() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const [logs, setLogs]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [gamification, setGamification] = useState({ points: null, level: null });
  const [pendingCount, setPendingCount] = useState(0);
  const [earningsThisMonth, setEarningsThisMonth] = useState(null);
  const [redeem, setRedeem]   = useState({
    open: false, input: '', submitting: false, result: null, error: '',
  });
  const [editingLog, setEditingLog] = useState(null);

  useEffect(() => {
    Promise.all([
      api.get('/waste-logs/my'),
      api.get('/gamification/me'),
      api.get('/waste-logs/my/earnings'),
    ])
      .then(([logsRes, gamRes, earningsRes]) => {
        setLogs(logsRes.data.logs);
        setGamification({
          points: gamRes.data.total_points,
          level:  gamRes.data.level,
        });
        setEarningsThisMonth(earningsRes.data.this_month_earned);
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const refresh = () => {
      getQueuedLogs().then(logs => setPendingCount(logs.length)).catch(() => {});
    };
    refresh();
    window.addEventListener('offlinequeue:change', refresh);
    return () => window.removeEventListener('offlinequeue:change', refresh);
  }, []);

  const handleDelete = async (logId) => {
    if (!confirm('Delete this log? This cannot be undone.')) return;
    try {
      await api.delete(`/waste-logs/${logId}`);
      setLogs(prev => prev.filter(l => l.log_id !== logId));
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete log.');
    }
  };

  const handleEditSaved = (updated) => {
    setLogs(prev => prev.map(l => (l.log_id === updated.log_id ? { ...l, ...updated } : l)));
    setEditingLog(null);
  };

  function handleLogout() {
    navigate('/', { replace: true });
    logout();
  }

  async function handleRedeem(e) {
    e.preventDefault();
    const pts = parseInt(redeem.input, 10);
    if (!pts || pts < 100) return;
    setRedeem(r => ({ ...r, submitting: true, error: '' }));
    try {
      const res = await api.post('/gamification/redeem', { points: pts });
      const newPts = (gamification.points ?? 0) - pts;
      setGamification({ points: newPts, level: computeLevel(newPts) });
      setRedeem(r => ({ ...r, submitting: false, result: res.data.redemption, input: '' }));
    } catch (err) {
      setRedeem(r => ({
        ...r, submitting: false,
        error: err.response?.data?.error || 'Redemption failed.',
      }));
    }
  }

  function closeRedeem() {
    setRedeem({ open: false, input: '', submitting: false, result: null, error: '' });
  }

  const matchedCount = logs.filter(l => l.status === 'matched').length;
  const recentLogs   = [...logs]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 10);

  const redeemPts = parseInt(redeem.input, 10);
  const redeemKes = redeemPts >= 100
    ? (redeemPts / POINTS_PER_KES).toFixed(2)
    : null;

  return (
    <>
      <style>{css}</style>
      <div className="cd-root">

        {/* ── Left sidebar (desktop) ── */}
        <aside className="cd-sidebar">
          <div className="cd-sidebar-header">
            <div className="cd-logo-mark">
              <div className="cd-logo-icon">♻</div>
              WasteManagement
            </div>
            <p className="cd-greeting">
              Hello, <strong>{user?.name ?? 'Collector'}</strong>
            </p>
          </div>

          <nav className="cd-nav">
            <button className="cd-nav-item active">
              <span className="cd-nav-icon">📊</span>
              Dashboard
            </button>
            <button
              className="cd-nav-item"
              onClick={() => navigate('/collector/log-new')}
            >
              <span className="cd-nav-icon">➕</span>
              Log Waste
            </button>
            <NotificationBell />
            <button
              className="cd-nav-item"
              onClick={() => navigate('/collector/leaderboard')}
            >
              <span className="cd-nav-icon">🏆</span>
              Leaderboard
            </button>
            <button
              className="cd-nav-item"
              onClick={() => navigate('/collector/earnings')}
            >
              <span className="cd-nav-icon">💰</span>
              My Earnings
            </button>
            <button
              className="cd-nav-item"
              onClick={() => navigate('/collector/matches')}
            >
              <span className="cd-nav-icon">🤝</span>
              Buyer Matches
            </button>
          </nav>

          {pendingCount > 0 && (
            <div className="cd-sync-notice" title="These logs are saved on this device and will sync automatically when online.">
              <span className="cd-sync-dot" />
              {pendingCount} log{pendingCount !== 1 ? 's' : ''} pending sync
            </div>
          )}

          <div className="cd-sidebar-footer">
            <button className="cd-nav-item cd-nav-logout" onClick={handleLogout}>
              <span className="cd-nav-icon">🚪</span>
              Logout
            </button>
          </div>
        </aside>

        {/* ── Mobile top bar (hidden on desktop) ── */}
        <div className="cd-mobile-top">
          <div className="cd-mobile-header">
            <div className="cd-mobile-logo">
              <div className="cd-mobile-logo-icon">♻</div>
              WasteManagement
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="cd-mobile-btn"
                onClick={() => navigate('/collector/log-new')}
              >
                + Log
              </button>
              <button className="cd-mobile-btn" onClick={handleLogout}>
                Logout
              </button>
            </div>
          </div>
        </div>

        {/* ── Main content ── */}
        <div className="cd-content">
          <main className="cd-main">
            <h1 className="cd-page-title">Dashboard</h1>

            {/* ── Stat cards ── */}
            <div className="cd-stats">
              <div className="cd-stat">
                <div className="cd-stat-icon">💰</div>
                <div className="cd-stat-label">Earnings this month</div>
                <div className="cd-stat-value">
                  {loading || earningsThisMonth === null
                    ? 'KES —'
                    : `KES ${Number(earningsThisMonth).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                </div>
                <div className="cd-stat-sub">
                  <button
                    className="cd-view-all-btn"
                    onClick={() => navigate('/collector/earnings')}
                  >
                    View earnings →
                  </button>
                </div>
              </div>

              <div className="cd-stat">
                <div className="cd-stat-icon">🤝</div>
                <div className="cd-stat-label">Active buyer matches</div>
                <div className="cd-stat-value">
                  {loading ? '—' : matchedCount}
                </div>
                <div className="cd-stat-sub">
                  {loading ? '' : matchedCount === 1 ? '1 log matched' : `${matchedCount} logs matched`}
                </div>
              </div>

              <div className="cd-stat">
                <div className="cd-stat-icon">⭐</div>
                <div className="cd-stat-label">Gamification points</div>
                <div className="cd-stat-value">
                  {loading || gamification.points === null
                    ? '—'
                    : gamification.points.toLocaleString()}
                </div>
                <div className="cd-stat-sub">
                  {gamification.level && (
                    <span className={`cd-level-badge cd-level-${gamification.level.toLowerCase()}`}>
                      {gamification.level}
                    </span>
                  )}
                </div>
                {!loading && gamification.points !== null && (
                  <button
                    className="cd-redeem-btn"
                    onClick={() => setRedeem(r => ({ ...r, open: true, result: null, error: '' }))}
                  >
                    Redeem for airtime
                  </button>
                )}
              </div>
            </div>

            {/* ── Recent waste logs table ── */}
            <div className="cd-table-card">
              <div className="cd-table-header">
                <h2 className="cd-table-title">Recent Waste Logs</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {!loading && (
                    <span className="cd-table-count">
                      {logs.length} total log{logs.length !== 1 ? 's' : ''}
                    </span>
                  )}
                  {logs.length > 10 && (
                    <button
                      className="cd-view-all-btn"
                      onClick={() => navigate('/collector/logs')}
                    >
                      View All →
                    </button>
                  )}
                </div>
              </div>

              {loading ? (
                <div className="cd-empty">
                  <div className="cd-empty-icon">⏳</div>
                  <p>Loading…</p>
                </div>
              ) : recentLogs.length === 0 ? (
                <div className="cd-empty">
                  <div className="cd-empty-icon">📋</div>
                  <p style={{ fontWeight: 600 }}>No waste logs yet.</p>
                  <p>
                    <button
                      onClick={() => navigate('/collector/log-new')}
                      style={{
                        background: 'none', border: 'none', color: C.primary,
                        fontWeight: 600, cursor: 'pointer', fontSize: 14,
                        fontFamily: 'inherit', padding: 0,
                      }}
                    >
                      Submit your first log →
                    </button>
                  </p>
                </div>
              ) : (
                <div className="cd-table-wrap">
                  <table className="cd-table">
                    <thead>
                      <tr>
                        <th>Type</th>
                        <th>Weight</th>
                        <th>Location</th>
                        <th>Status</th>
                        <th>Date</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentLogs.map(log => (
                        <tr key={log.log_id}>
                          <td style={{ fontWeight: 600, textTransform: 'capitalize' }}>
                            {log.category}
                          </td>
                          <td>{parseFloat(log.weight_kg).toFixed(2)} kg</td>
                          <td
                            style={{
                              color: C.muted, maxWidth: 220, overflow: 'hidden',
                              textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            }}
                            title={log.address || undefined}
                          >
                            {log.address || formatLocation(log.latitude, log.longitude)}
                          </td>
                          <td><StatusPill status={log.status} /></td>
                          <td style={{ color: C.muted, whiteSpace: 'nowrap' }}>
                            {formatDate(log.created_at)}
                          </td>
                          <td style={{ width: 72, textAlign: 'center', whiteSpace: 'nowrap' }}>
                            {log.status === 'pending' && (
                              <>
                                <button
                                  className="cd-edit-btn"
                                  onClick={() => setEditingLog(log)}
                                  title="Edit log"
                                >
                                  ✎
                                </button>
                                <button
                                  className="cd-delete-btn"
                                  onClick={() => handleDelete(log.log_id)}
                                  title="Delete log"
                                >
                                  🗑
                                </button>
                              </>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </main>
        </div>

      </div>

      {/* ── Edit log modal ── */}
      {editingLog && (
        <EditLogModal
          log={editingLog}
          onClose={() => setEditingLog(null)}
          onSaved={handleEditSaved}
        />
      )}

      {/* ── Redeem modal ── */}
      {redeem.open && (
        <div className="cd-overlay" onClick={closeRedeem}>
          <div className="cd-modal" onClick={e => e.stopPropagation()}>
            <div className="cd-modal-header">
              <p className="cd-modal-title">Redeem for Airtime</p>
              <button className="cd-modal-close" onClick={closeRedeem}>✕</button>
            </div>

            {redeem.result ? (
              <div className="cd-modal-success">
                <div style={{ fontSize: 36, marginBottom: 10 }}>✅</div>
                <p style={{ fontWeight: 700, margin: '0 0 6px', fontSize: 15 }}>
                  Redemption requested
                </p>
                <p style={{ margin: '0 0 4px', fontSize: 14 }}>
                  {redeem.result.points_spent} pts → KES {redeem.result.airtime_value_kes}
                </p>
                <p style={{ fontSize: 12, color: C.muted, margin: '0 0 20px', lineHeight: 1.5 }}>
                  Status: Pending processing — airtime is queued and usually arrives within minutes.
                </p>
                <button className="cd-modal-submit" onClick={closeRedeem}>Done</button>
              </div>
            ) : (
              <form onSubmit={handleRedeem}>
                <p style={{ fontSize: 13, color: C.muted, margin: '0 0 14px', lineHeight: 1.5 }}>
                  You have <strong style={{ color: C.text }}>
                    {gamification.points?.toLocaleString()} points
                  </strong> available.
                  Rate: {POINTS_PER_KES} pts = KES 1. Min redemption: 100 pts.
                </p>
                <input
                  className="cd-modal-input"
                  type="number"
                  min="100"
                  max={gamification.points ?? 0}
                  step="1"
                  placeholder="Points to redeem (min 100)"
                  value={redeem.input}
                  onChange={e => setRedeem(r => ({ ...r, input: e.target.value, error: '' }))}
                />
                {redeemKes && (
                  <div className="cd-redeem-preview">
                    {redeemPts} pts → KES {redeemKes} airtime
                  </div>
                )}
                {redeem.error && (
                  <p className="cd-modal-error">{redeem.error}</p>
                )}
                <button
                  type="submit"
                  className="cd-modal-submit"
                  disabled={redeem.submitting || !redeemPts || redeemPts < 100}
                >
                  {redeem.submitting ? 'Requesting…' : 'Request Airtime'}
                </button>
                <p style={{ fontSize: 11, color: C.muted, margin: '10px 0 0', textAlign: 'center' }}>
                  Airtime redemption is queued for processing, not instant.
                </p>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
