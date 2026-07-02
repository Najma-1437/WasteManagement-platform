import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import api from '../../api/axiosClient';
import NotificationBell from '../../components/NotificationBell';

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
  .cd-stat-sub { font-size: 12px; color: ${C.muted}; }

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
  .cd-table { width: 100%; border-collapse: collapse; min-width: 620px; }
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
  .cd-pill-escrowed         { background: #EFF6FF; color: #2563EB; }
  .cd-pill-payout_initiated { background: #EFF6FF; color: #2563EB; }
  .cd-pill-released         { background: #E7F4EC; color: #1e6b3c; }
  .cd-pill-payout_failed    { background: #FDECEA; color: #B3261E; }
  .cd-pill-failed           { background: #FDECEA; color: #B3261E; }

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
    .cd-stats      { grid-template-columns: 1fr 1fr; gap: 12px; }
    .cd-stat       { padding: 16px 16px; }
    .cd-stat-value { font-size: 22px; }
  }

  @media (max-width: 420px) {
    .cd-stats { grid-template-columns: 1fr; }
  }
`;

function formatKes(amount) {
  return `KES ${Number(amount).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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

export default function Earnings() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  useEffect(() => {
    api.get('/waste-logs/my/earnings')
      .then(res => setData(res.data))
      .catch(err => setError(err.response?.data?.error || 'Failed to load earnings.'))
      .finally(() => setLoading(false));
  }, []);

  function handleLogout() {
    navigate('/', { replace: true });
    logout();
  }

  const transactions = data?.transactions ?? [];

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
            <button className="cd-nav-item active">
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
              My Earnings
            </div>
            <button className="cd-mobile-btn" onClick={() => navigate('/collector')}>
              ← Dashboard
            </button>
          </div>
        </div>

        {/* ── Main content ── */}
        <div className="cd-content">
          <main className="cd-main">
            <h1 className="cd-page-title">My Earnings</h1>

            {error && (
              <div className="cd-empty" style={{ color: C.danger, padding: '20px 0 32px' }}>
                {error}
              </div>
            )}

            {/* ── Stat cards ── */}
            <div className="cd-stats">
              <div className="cd-stat">
                <div className="cd-stat-icon">💰</div>
                <div className="cd-stat-label">Total Earned</div>
                <div className="cd-stat-value">
                  {loading ? '—' : formatKes(data?.total_earned ?? 0)}
                </div>
                <div className="cd-stat-sub">Paid out to date</div>
              </div>

              <div className="cd-stat">
                <div className="cd-stat-icon">📅</div>
                <div className="cd-stat-label">This Month</div>
                <div className="cd-stat-value">
                  {loading ? '—' : formatKes(data?.this_month_earned ?? 0)}
                </div>
                <div className="cd-stat-sub">Paid out this calendar month</div>
              </div>

              <div className="cd-stat">
                <div className="cd-stat-icon">⏳</div>
                <div className="cd-stat-label">Pending</div>
                <div className="cd-stat-value">
                  {loading ? '—' : formatKes(data?.pending_amount ?? 0)}
                </div>
                <div className="cd-stat-sub">Awaiting payment or payout</div>
              </div>
            </div>

            {/* ── Transaction history table ── */}
            <div className="cd-table-card">
              <div className="cd-table-header">
                <h2 className="cd-table-title">Transaction History</h2>
                {!loading && (
                  <span className="cd-table-count">
                    {transactions.length} transaction{transactions.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>

              {loading ? (
                <div className="cd-empty">
                  <div className="cd-empty-icon">⏳</div>
                  <p>Loading…</p>
                </div>
              ) : transactions.length === 0 ? (
                <div className="cd-empty">
                  <div className="cd-empty-icon">💰</div>
                  <p style={{ fontWeight: 600 }}>No transactions yet.</p>
                  <p>Earnings appear here once a buyer matches and pays for one of your logs.</p>
                </div>
              ) : (
                <div className="cd-table-wrap">
                  <table className="cd-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Category</th>
                        <th>Weight</th>
                        <th>Amount (KES)</th>
                        <th>Status</th>
                        <th>M-Pesa Code</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map(tx => (
                        <tr key={tx.transaction_id}>
                          <td style={{ color: C.muted, whiteSpace: 'nowrap' }}>
                            {formatDate(tx.transaction_date)}
                          </td>
                          <td style={{ fontWeight: 600, textTransform: 'capitalize' }}>
                            {tx.category}
                          </td>
                          <td>{parseFloat(tx.confirmed_qty_kg).toFixed(2)} kg</td>
                          <td style={{ fontWeight: 700 }}>
                            {parseFloat(tx.amount_kes).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td><StatusPill status={tx.payment_status} /></td>
                          <td style={{ color: C.muted }}>{tx.mpesa_code || '—'}</td>
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
    </>
  );
}
