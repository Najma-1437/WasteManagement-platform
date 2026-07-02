import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import api from '../../api/axiosClient';
import NotificationBell from '../../components/NotificationBell';

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
  .cd-content { margin-left: 240px; flex: 1; min-width: 0; }
  .cd-main {
    max-width: 800px;
    margin: 0 auto;
    padding: 36px 32px 56px;
  }

  /* ── Page header ── */
  .lb-header {
    margin-bottom: 28px;
  }
  .lb-title {
    font-size: 24px;
    font-weight: 700;
    color: ${C.text};
    margin: 0 0 4px;
  }
  .lb-sub {
    font-size: 13px;
    color: ${C.muted};
    margin: 0;
  }

  /* ── Table card ── */
  .lb-card {
    background: ${C.white};
    border-radius: 14px;
    box-shadow: 0 1px 4px rgba(0,0,0,0.06);
    overflow: hidden;
  }
  .lb-table {
    width: 100%;
    border-collapse: collapse;
  }
  .lb-table th {
    padding: 12px 20px;
    text-align: left;
    font-size: 11px;
    font-weight: 700;
    color: ${C.muted};
    text-transform: uppercase;
    letter-spacing: 0.5px;
    background: #FAFAFA;
    border-bottom: 1px solid ${C.border};
  }
  .lb-table td {
    padding: 14px 20px;
    font-size: 14px;
    color: ${C.text};
    border-bottom: 1px solid #F3F4F6;
    vertical-align: middle;
  }
  .lb-table tr:last-child td { border-bottom: none; }
  .lb-table tbody tr:hover td { background: #FAFBFA; }

  /* Highlight the logged-in collector's own row */
  .lb-own-row td { background: #F0FBF4 !important; }
  .lb-own-row:hover td { background: #E7F7EE !important; }

  /* Rank column */
  .lb-rank {
    font-size: 13px;
    font-weight: 700;
    color: ${C.muted};
    min-width: 40px;
  }
  .lb-rank-1 { color: #B77B00; }
  .lb-rank-2 { color: #6B7280; }
  .lb-rank-3 { color: #9B6133; }

  /* Separator between top-20 and own-row-outside-top-20 */
  .lb-separator td {
    padding: 8px 20px;
    font-size: 12px;
    color: ${C.muted};
    text-align: center;
    background: #FAFAFA;
    border-bottom: 1px solid ${C.border};
    letter-spacing: 1px;
  }

  /* Level badge */
  .lb-level {
    display: inline-block;
    font-size: 10px;
    font-weight: 700;
    padding: 2px 8px;
    border-radius: 10px;
    text-transform: uppercase;
    letter-spacing: 0.4px;
  }
  .lb-level-bronze   { background: #FDF0E7; color: #9B6133; }
  .lb-level-silver   { background: #F4F4F4; color: #6B7280; }
  .lb-level-gold     { background: #FFFAE7; color: #B77B00; }
  .lb-level-platinum { background: #F0F0FF; color: #5B21B6; }

  /* ── Empty / loading ── */
  .lb-empty {
    text-align: center;
    padding: 60px 20px;
    color: ${C.muted};
    font-size: 14px;
  }

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

function LevelBadge({ pts }) {
  const level = computeLevel(pts);
  return (
    <span className={`lb-level lb-level-${level.toLowerCase()}`}>{level}</span>
  );
}

export default function Leaderboard() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const [board, setBoard]     = useState([]);
  const [ownEntry, setOwn]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  useEffect(() => {
    api.get('/gamification/leaderboard')
      .then(res => {
        setBoard(res.data.leaderboard);
        setOwn(res.data.ownEntry);
      })
      .catch(() => setError('Failed to load leaderboard.'))
      .finally(() => setLoading(false));
  }, []);

  function handleLogout() {
    navigate('/', { replace: true });
    logout();
  }

  const myUserId = user?.user_id;

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
            <NotificationBell />
            <button className="cd-nav-item active">
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
              Leaderboard
            </div>
            <button className="cd-mobile-btn" onClick={handleLogout}>Logout</button>
          </div>
        </div>

        {/* ── Main content ── */}
        <div className="cd-content">
          <main className="cd-main">
            <div className="lb-header">
              <h1 className="lb-title">🏆 Leaderboard</h1>
              <p className="lb-sub">Top collectors by total points earned · {POINTS_PER_KES} pts = KES 1 airtime</p>
            </div>

            <div className="lb-card">
              {loading ? (
                <div className="lb-empty">Loading…</div>
              ) : error ? (
                <div className="lb-empty" style={{ color: '#B3261E' }}>{error}</div>
              ) : board.length === 0 ? (
                <div className="lb-empty">
                  No points recorded yet — submit a waste log to appear here!
                </div>
              ) : (
                <table className="lb-table">
                  <thead>
                    <tr>
                      <th style={{ width: 56 }}>#</th>
                      <th>Collector</th>
                      <th style={{ textAlign: 'right' }}>Points</th>
                      <th style={{ width: 100 }}>Level</th>
                    </tr>
                  </thead>
                  <tbody>
                    {board.map(row => {
                      const isMe = row.user_id === myUserId;
                      const rankCls = row.rank <= 3 ? `lb-rank lb-rank-${row.rank}` : 'lb-rank';
                      return (
                        <tr key={row.user_id} className={isMe ? 'lb-own-row' : ''}>
                          <td>
                            <span className={rankCls}>
                              {row.rank === 1 ? '🥇' : row.rank === 2 ? '🥈' : row.rank === 3 ? '🥉' : `#${row.rank}`}
                            </span>
                          </td>
                          <td>
                            <span style={{ fontWeight: isMe ? 700 : 500 }}>
                              {row.display_name}
                            </span>
                            {isMe && (
                              <span style={{
                                marginLeft: 8, fontSize: 11, color: C.primary,
                                fontWeight: 700, background: '#E7F4EC',
                                padding: '1px 6px', borderRadius: 8,
                              }}>
                                You
                              </span>
                            )}
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                            {row.total_points.toLocaleString()}
                          </td>
                          <td><LevelBadge pts={row.total_points} /></td>
                        </tr>
                      );
                    })}

                    {/* Own row outside top 20 */}
                    {ownEntry && (
                      <>
                        <tr className="lb-separator">
                          <td colSpan={4}>· · ·</td>
                        </tr>
                        <tr className="lb-own-row">
                          <td>
                            <span className="lb-rank">#{ownEntry.rank}</span>
                          </td>
                          <td>
                            <span style={{ fontWeight: 700 }}>{ownEntry.display_name}</span>
                            <span style={{
                              marginLeft: 8, fontSize: 11, color: C.primary,
                              fontWeight: 700, background: '#E7F4EC',
                              padding: '1px 6px', borderRadius: 8,
                            }}>
                              You
                            </span>
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                            {ownEntry.total_points.toLocaleString()}
                          </td>
                          <td><LevelBadge pts={ownEntry.total_points} /></td>
                        </tr>
                      </>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </main>
        </div>

      </div>
    </>
  );
}

const POINTS_PER_KES = 10;
