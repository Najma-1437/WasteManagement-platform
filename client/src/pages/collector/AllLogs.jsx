import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import api from '../../api/axiosClient';
import NotificationBell from '../../components/NotificationBell';

const PAGE_SIZE = 20;

const C = {
  primary:     '#1e6b3c',
  primaryDark: '#155230',
  bg:          '#F4F7F5',
  text:        '#1A1A1A',
  muted:       '#6B7280',
  border:      '#E5E7EB',
  white:       '#FFFFFF',
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
    width: 240px; flex-shrink: 0;
    background: ${C.primary};
    display: flex; flex-direction: column;
    position: fixed; top: 0; left: 0; bottom: 0;
    z-index: 200;
    box-shadow: 2px 0 8px rgba(0,0,0,0.12);
  }
  .cd-sidebar-header { padding: 24px 20px 20px; border-bottom: 1px solid rgba(255,255,255,0.12); }
  .cd-logo-mark {
    display: flex; align-items: center; gap: 10px;
    font-size: 15px; font-weight: 700; color: #fff; margin-bottom: 12px;
  }
  .cd-logo-icon {
    width: 34px; height: 34px; background: rgba(255,255,255,0.2);
    border-radius: 9px; display: flex; align-items: center; justify-content: center;
    font-size: 16px; flex-shrink: 0;
  }
  .cd-greeting { font-size: 13px; color: rgba(255,255,255,0.6); font-weight: 400; line-height: 1.4; }
  .cd-greeting strong { color: rgba(255,255,255,0.92); font-weight: 600; }

  .cd-nav {
    flex: 1; padding: 16px 12px;
    display: flex; flex-direction: column; gap: 2px; overflow-y: auto;
  }
  .cd-nav-item {
    display: flex; align-items: center; gap: 11px;
    padding: 11px 14px; border-radius: 10px; border: none;
    background: transparent; color: rgba(255,255,255,0.65);
    font-size: 14px; font-weight: 600; cursor: pointer;
    text-align: left; width: 100%;
    transition: background 0.15s, color 0.15s; font-family: inherit;
  }
  .cd-nav-item:hover  { background: rgba(255,255,255,0.1); color: #fff; }
  .cd-nav-item.active { background: rgba(255,255,255,0.18); color: #fff; }
  .cd-nav-item.soon   { opacity: 0.55; cursor: default; }
  .cd-nav-item.soon:hover { background: transparent; color: rgba(255,255,255,0.65); }
  .cd-nav-icon { font-size: 16px; flex-shrink: 0; width: 20px; text-align: center; }
  .cd-soon-badge {
    margin-left: auto; font-size: 10px; font-weight: 700;
    color: rgba(255,255,255,0.45); background: rgba(255,255,255,0.1);
    border-radius: 8px; padding: 2px 7px; letter-spacing: 0.3px;
  }
  .cd-sidebar-footer { padding: 12px; border-top: 1px solid rgba(255,255,255,0.12); }
  .cd-nav-logout { color: rgba(255,255,255,0.6); }
  .cd-nav-logout:hover { background: rgba(255,255,255,0.08); color: #fff; }

  /* ── Main content ── */
  .cd-content { margin-left: 240px; flex: 1; min-width: 0; }
  .cd-main { max-width: 1100px; margin: 0 auto; padding: 36px 32px 56px; }

  /* ── Page header ── */
  .al-page-header {
    display: flex; align-items: baseline; justify-content: space-between;
    margin-bottom: 24px;
  }
  .al-page-title { font-size: 24px; font-weight: 700; color: ${C.text}; margin: 0; }
  .al-log-count  { font-size: 13px; color: ${C.muted}; }

  /* ── Table card ── */
  .cd-table-card {
    background: ${C.white}; border-radius: 14px;
    box-shadow: 0 1px 4px rgba(0,0,0,0.06); overflow: hidden;
  }
  .cd-table-wrap { overflow-x: auto; }
  .cd-table { width: 100%; border-collapse: collapse; min-width: 560px; }
  .cd-table th {
    padding: 10px 16px; text-align: left; font-size: 11px; font-weight: 700;
    color: ${C.muted}; text-transform: uppercase; letter-spacing: 0.5px;
    background: #FAFAFA; border-bottom: 1px solid ${C.border}; white-space: nowrap;
  }
  .cd-table td {
    padding: 13px 16px; font-size: 13px; color: ${C.text};
    border-bottom: 1px solid #F3F4F6; vertical-align: middle;
  }
  .cd-table tr:last-child td { border-bottom: none; }
  .cd-table tbody tr:hover td { background: #FAFBFA; }

  /* ── Status pills ── */
  .cd-pill {
    display: inline-flex; align-items: center; font-size: 11px; font-weight: 700;
    padding: 3px 10px; border-radius: 20px; text-transform: capitalize; white-space: nowrap;
  }
  .cd-pill-pending          { background: #FFF4E5; color: #D97706; }
  .cd-pill-matched          { background: #EFF6FF; color: #2563EB; }
  .cd-pill-escrowed         { background: #EFF6FF; color: #2563EB; }
  .cd-pill-payout_initiated { background: #EFF6FF; color: #2563EB; }
  .cd-pill-released         { background: #E7F4EC; color: #1e6b3c; }
  .cd-pill-paid             { background: #E7F4EC; color: #1e6b3c; }
  .cd-pill-payout_failed    { background: #FDECEA; color: #B3261E; }

  /* ── Delete button ── */
  .cd-delete-btn {
    background: none; border: none; cursor: pointer; font-size: 14px;
    color: #e53e3e; padding: 3px 6px; border-radius: 6px; line-height: 1;
    transition: background 0.12s; font-family: inherit;
  }
  .cd-delete-btn:hover { background: #FDECEA; }

  /* ── Empty / loading ── */
  .cd-empty {
    text-align: center; padding: 56px 20px; color: ${C.muted};
  }
  .cd-empty-icon { font-size: 36px; margin-bottom: 10px; }
  .cd-empty p { margin: 4px 0; font-size: 14px; }

  /* ── Pagination ── */
  .al-pagination {
    display: flex; align-items: center; justify-content: center; gap: 12px;
    padding: 18px 24px; border-top: 1px solid ${C.border};
  }
  .al-page-btn {
    padding: 7px 16px; border-radius: 8px; border: 1px solid ${C.border};
    background: ${C.white}; color: ${C.text}; font-size: 13px; font-weight: 600;
    cursor: pointer; font-family: inherit; transition: background 0.15s;
  }
  .al-page-btn:hover:not(:disabled) { background: #F3F4F6; }
  .al-page-btn:disabled { opacity: 0.4; cursor: default; }
  .al-page-info { font-size: 13px; color: ${C.muted}; min-width: 80px; text-align: center; }

  /* ── Mobile top bar ── */
  .cd-mobile-top { display: none; }
  .cd-mobile-header {
    background: ${C.primary}; padding: 14px 16px;
    display: flex; align-items: center; justify-content: space-between;
    box-shadow: 0 2px 8px rgba(0,0,0,0.12); position: sticky; top: 0; z-index: 100;
  }
  .cd-mobile-logo {
    display: flex; align-items: center; gap: 8px;
    font-size: 15px; font-weight: 700; color: #fff;
  }
  .cd-mobile-logo-icon {
    width: 30px; height: 30px; background: rgba(255,255,255,0.2); border-radius: 8px;
    display: flex; align-items: center; justify-content: center; font-size: 14px;
  }
  .cd-mobile-btn {
    padding: 6px 14px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.35);
    background: transparent; color: rgba(255,255,255,0.85); font-size: 13px;
    font-weight: 600; cursor: pointer; font-family: inherit; transition: background 0.15s;
  }
  .cd-mobile-btn:hover { background: rgba(255,255,255,0.12); }

  @media (max-width: 767px) {
    .cd-sidebar    { display: none; }
    .cd-content    { margin-left: 0; }
    .cd-mobile-top { display: block; }
    .cd-main       { padding: 20px 16px 48px; }
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
  return (
    <span className={`cd-pill cd-pill-${status}`}>
      {status?.replace(/_/g, ' ') ?? '—'}
    </span>
  );
}

export default function AllLogs() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const [logs, setLogs]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage]       = useState(1);

  useEffect(() => {
    api.get('/waste-logs/my')
      .then(res => setLogs(res.data.logs))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
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

  function handleLogout() {
    navigate('/', { replace: true });
    logout();
  }

  // Sort newest-first then paginate
  const sorted     = [...logs].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const visible    = sorted.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <>
      <style>{css}</style>
      <div className="cd-root">

        {/* ── Sidebar (desktop) ── */}
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
            <button className="cd-nav-item" onClick={() => navigate('/collector')}>
              <span className="cd-nav-icon">📊</span>
              Dashboard
            </button>
            <button className="cd-nav-item" onClick={() => navigate('/collector/log-new')}>
              <span className="cd-nav-icon">➕</span>
              Log Waste
            </button>
            <button className="cd-nav-item active">
              <span className="cd-nav-icon">📋</span>
              My Logs
            </button>
            <NotificationBell />
            <button className="cd-nav-item" onClick={() => navigate('/collector/leaderboard')}>
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

          <div className="cd-sidebar-footer">
            <button className="cd-nav-item cd-nav-logout" onClick={handleLogout}>
              <span className="cd-nav-icon">🚪</span>
              Logout
            </button>
          </div>
        </aside>

        {/* ── Mobile top bar ── */}
        <div className="cd-mobile-top">
          <div className="cd-mobile-header">
            <div className="cd-mobile-logo">
              <div className="cd-mobile-logo-icon">♻</div>
              My Logs
            </div>
            <button className="cd-mobile-btn" onClick={() => navigate('/collector')}>
              ← Dashboard
            </button>
          </div>
        </div>

        {/* ── Main content ── */}
        <div className="cd-content">
          <main className="cd-main">

            <div className="al-page-header">
              <h1 className="al-page-title">My Waste Logs</h1>
              {!loading && (
                <span className="al-log-count">
                  {logs.length} log{logs.length !== 1 ? 's' : ''} total
                </span>
              )}
            </div>

            <div className="cd-table-card">
              {loading ? (
                <div className="cd-empty">
                  <div className="cd-empty-icon">⏳</div>
                  <p>Loading…</p>
                </div>
              ) : logs.length === 0 ? (
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
                <>
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
                        {visible.map(log => (
                          <tr key={log.log_id}>
                            <td style={{ fontWeight: 600, textTransform: 'capitalize' }}>
                              {log.category}
                            </td>
                            <td>{parseFloat(log.weight_kg).toFixed(2)} kg</td>
                            <td style={{ color: C.muted, fontVariantNumeric: 'tabular-nums' }}>
                              {formatLocation(log.latitude, log.longitude)}
                            </td>
                            <td><StatusPill status={log.status} /></td>
                            <td style={{ color: C.muted, whiteSpace: 'nowrap' }}>
                              {formatDate(log.created_at)}
                            </td>
                            <td style={{ width: 40, textAlign: 'center' }}>
                              {log.status === 'pending' && (
                                <button
                                  className="cd-delete-btn"
                                  onClick={() => handleDelete(log.log_id)}
                                  title="Delete log"
                                >
                                  🗑
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {totalPages > 1 && (
                    <div className="al-pagination">
                      <button
                        className="al-page-btn"
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                      >
                        ← Previous
                      </button>
                      <span className="al-page-info">
                        {currentPage} / {totalPages}
                      </span>
                      <button
                        className="al-page-btn"
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                      >
                        Next →
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>

          </main>
        </div>

      </div>
    </>
  );
}
