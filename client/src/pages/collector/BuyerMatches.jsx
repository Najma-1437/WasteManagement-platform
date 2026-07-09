import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import api from '../../api/axiosClient';
import NotificationBell from '../../components/NotificationBell';
import DisputeModal from '../../components/DisputeModal';

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

const STATUS_META = {
  matched:   { label: 'Awaiting confirmation', cls: 'bm-pill-matched' },
  confirmed: { label: 'Payment processing',     cls: 'bm-pill-confirmed' },
  paid:      { label: 'Paid',                   cls: 'bm-pill-paid' },
  disputed:  { label: 'Under dispute',          cls: 'bm-pill-disputed' },
};

// Statuses a collector can dispute — mirrors the server-side gate in
// raiseDispute (wasteLogs.controller.js).
const DISPUTABLE = ['matched', 'confirmed'];

const css = `
  *, *::before, *::after { box-sizing: border-box; }

  .cd-root {
    min-height: 100vh;
    background: ${C.bg};
    font-family: Inter, system-ui, -apple-system, sans-serif;
    color: ${C.text};
    display: flex;
  }

  /* ── Sidebar (same pattern as Dashboard) ── */
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
    width: 34px; height: 34px;
    background: rgba(255,255,255,0.2);
    border-radius: 9px;
    display: flex; align-items: center; justify-content: center;
    font-size: 16px; flex-shrink: 0;
  }
  .cd-greeting {
    font-size: 13px;
    color: rgba(255,255,255,0.6);
    font-weight: 400;
    line-height: 1.4;
  }
  .cd-greeting strong { color: rgba(255,255,255,0.92); font-weight: 600; }

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
  .cd-nav-item:hover  { background: rgba(255,255,255,0.1); color: #fff; }
  .cd-nav-item.active { background: rgba(255,255,255,0.18); color: #fff; }
  .cd-nav-item.soon   { opacity: 0.55; cursor: default; }
  .cd-nav-item.soon:hover { background: transparent; color: rgba(255,255,255,0.65); }
  .cd-nav-icon { font-size: 16px; flex-shrink: 0; width: 20px; text-align: center; }
  .cd-soon-badge {
    margin-left: auto;
    font-size: 10px; font-weight: 700;
    color: rgba(255,255,255,0.45);
    background: rgba(255,255,255,0.1);
    border-radius: 8px; padding: 2px 7px;
    letter-spacing: 0.3px;
  }
  .cd-sidebar-footer {
    padding: 12px;
    border-top: 1px solid rgba(255,255,255,0.12);
  }
  .cd-nav-logout { color: rgba(255,255,255,0.6); }
  .cd-nav-logout:hover { background: rgba(255,255,255,0.08); color: #fff; }

  /* ── Main content ── */
  .cd-content { margin-left: 240px; flex: 1; min-width: 0; }
  .cd-main { max-width: 1100px; margin: 0 auto; padding: 36px 32px 56px; }

  .cd-page-title {
    font-size: 24px;
    font-weight: 700;
    color: ${C.text};
    margin: 0 0 28px;
  }

  /* ── Table card ── */
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
  .cd-table-count { font-size: 12px; color: ${C.muted}; font-weight: 500; }

  .cd-table-wrap { overflow-x: auto; }
  .cd-table { width: 100%; border-collapse: collapse; min-width: 660px; }
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

  .cd-empty { text-align: center; padding: 56px 20px; color: ${C.muted}; }
  .cd-empty-icon { font-size: 36px; margin-bottom: 10px; }
  .cd-empty p { margin: 4px 0; font-size: 14px; }

  /* ── Status pills ── */
  .bm-pill {
    display: inline-flex;
    align-items: center;
    font-size: 11px;
    font-weight: 700;
    padding: 3px 10px;
    border-radius: 20px;
    white-space: nowrap;
  }
  .bm-pill-matched   { background: #EFF6FF; color: #2563EB; }
  .bm-pill-confirmed { background: #FFF4E5; color: #D97706; }
  .bm-pill-paid      { background: #E7F4EC; color: #1e6b3c; }
  .bm-pill-disputed  { background: #FDECEA; color: #B3261E; }

  /* ── Raise dispute button ── */
  .bm-dispute-btn {
    padding: 6px 12px;
    border-radius: 8px;
    border: 1px solid #E8A33D;
    background: transparent;
    color: #B07818;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
    font-family: inherit;
    white-space: nowrap;
    transition: background 0.15s;
  }
  .bm-dispute-btn:hover { background: #FBF3E4; }

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

  @media (max-width: 767px) {
    .cd-sidebar    { display: none; }
    .cd-content    { margin-left: 0; }
    .cd-mobile-top { display: block; }
    .cd-main       { padding: 20px 16px 48px; }
  }
`;

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-KE', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

function StatusPill({ status }) {
  const meta = STATUS_META[status] ?? { label: status ?? '—', cls: 'bm-pill-matched' };
  return <span className={`bm-pill ${meta.cls}`}>{meta.label}</span>;
}

export default function BuyerMatches() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [disputing, setDisputing] = useState(null); // match being disputed

  useEffect(() => {
    api.get('/waste-logs/my/matches')
      .then(res => setMatches(res.data.matches))
      .catch(err => setError(err.response?.data?.error || 'Failed to load buyer matches.'))
      .finally(() => setLoading(false));
  }, []);

  const handleDisputed = (updated) => {
    setMatches(prev => prev.map(m =>
      m.log_id === updated.log_id ? { ...m, status: updated.status } : m
    ));
    setDisputing(null);
  };

  function handleLogout() {
    navigate('/', { replace: true });
    logout();
  }

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
            <button className="cd-nav-item" onClick={() => navigate('/collector')}>
              <span className="cd-nav-icon">📊</span>
              Dashboard
            </button>
            <button className="cd-nav-item" onClick={() => navigate('/collector/log-new')}>
              <span className="cd-nav-icon">➕</span>
              Log Waste
            </button>
            <NotificationBell />
            <button className="cd-nav-item" onClick={() => navigate('/collector/leaderboard')}>
              <span className="cd-nav-icon">🏆</span>
              Leaderboard
            </button>
            <button className="cd-nav-item" onClick={() => navigate('/collector/earnings')}>
              <span className="cd-nav-icon">💰</span>
              My Earnings
            </button>
            <button className="cd-nav-item active">
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
              Buyer Matches
            </div>
            <button className="cd-mobile-btn" onClick={() => navigate('/collector')}>
              ← Dashboard
            </button>
          </div>
        </div>

        {/* ── Main content ── */}
        <div className="cd-content">
          <main className="cd-main">
            <h1 className="cd-page-title">Buyer Matches</h1>

            {error && (
              <div className="cd-empty" style={{ color: C.danger, padding: '20px 0 32px' }}>
                {error}
              </div>
            )}

            <div className="cd-table-card">
              <div className="cd-table-header">
                <h2 className="cd-table-title">Matched Logs</h2>
                {!loading && (
                  <span className="cd-table-count">
                    {matches.length} match{matches.length !== 1 ? 'es' : ''}
                  </span>
                )}
              </div>

              {loading ? (
                <div className="cd-empty">
                  <div className="cd-empty-icon">⏳</div>
                  <p>Loading…</p>
                </div>
              ) : matches.length === 0 ? (
                <div className="cd-empty">
                  <div className="cd-empty-icon">🤝</div>
                  <p style={{ fontWeight: 600 }}>No matches yet.</p>
                  <p>Buyers will see your logged waste automatically — check back after logging more.</p>
                </div>
              ) : (
                <div className="cd-table-wrap">
                  <table className="cd-table">
                    <thead>
                      <tr>
                        <th>Category</th>
                        <th>Weight</th>
                        <th>Buyer</th>
                        <th>Zone</th>
                        <th>Price / kg</th>
                        <th>Status</th>
                        <th>Date</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {matches.map(m => (
                        <tr key={m.log_id}>
                          <td style={{ fontWeight: 600, textTransform: 'capitalize' }}>
                            {m.category}
                          </td>
                          <td>{parseFloat(m.weight_kg).toFixed(2)} kg</td>
                          <td>{m.buyer_name || '—'}</td>
                          <td style={{ color: C.muted }}>{m.zone || '—'}</td>
                          <td>
                            {m.price_per_kg != null
                              ? `KES ${Number(m.price_per_kg).toFixed(2)}`
                              : '—'}
                          </td>
                          <td><StatusPill status={m.status} /></td>
                          <td style={{ color: C.muted, whiteSpace: 'nowrap' }}>
                            {formatDate(m.created_at)}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            {DISPUTABLE.includes(m.status) && (
                              <button
                                className="bm-dispute-btn"
                                onClick={() => setDisputing(m)}
                              >
                                ⚠ Raise Dispute
                              </button>
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

      {/* ── Raise dispute modal ── */}
      {disputing && (
        <DisputeModal
          logId={disputing.log_id}
          context={`${disputing.category} · ${parseFloat(disputing.weight_kg).toFixed(2)} kg with ${disputing.buyer_name || 'buyer'}`}
          onClose={() => setDisputing(null)}
          onDisputed={handleDisputed}
        />
      )}
    </>
  );
}
