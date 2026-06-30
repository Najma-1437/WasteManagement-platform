import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import {
  getStats, getPending, approveUser, rejectUser,
  getUsers, updateUserStatus, getDisputes, resolveDispute,
} from '../../api/admin';

const css = `
  *, *::before, *::after { box-sizing: border-box; }

  .ad-root {
    display: flex;
    min-height: 100vh;
    font-family: Inter, system-ui, -apple-system, sans-serif;
    color: #1a1a1a;
  }

  /* ── Sidebar ────────────────────────────────────────────────── */
  .ad-sidebar {
    width: 220px;
    background: #1a3a28;
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
    position: sticky;
    top: 0;
    height: 100vh;
  }
  .ad-brand {
    padding: 22px 20px 18px;
    font-size: 15px;
    font-weight: 800;
    color: #fff;
    border-bottom: 1px solid rgba(255,255,255,0.08);
    letter-spacing: -0.3px;
  }
  .ad-greeting {
    padding: 14px 20px 16px;
    border-bottom: 1px solid rgba(255,255,255,0.08);
  }
  .ad-greeting-hello {
    font-size: 11px;
    color: rgba(255,255,255,0.45);
    margin-bottom: 2px;
  }
  .ad-greeting-name {
    font-size: 14px;
    font-weight: 700;
    color: #fff;
  }
  .ad-nav { flex: 1; padding: 10px 0; }
  .ad-nav-item {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 11px 20px;
    background: none;
    border: none;
    text-align: left;
    color: rgba(255,255,255,0.65);
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.15s, color 0.15s;
    font-family: inherit;
  }
  .ad-nav-item:hover  { background: rgba(255,255,255,0.07); color: #fff; }
  .ad-nav-item.active { background: rgba(255,255,255,0.13); color: #fff; font-weight: 600; }
  .ad-nav-icon { font-size: 15px; width: 18px; text-align: center; flex-shrink: 0; }
  .ad-nav-badge {
    margin-left: auto;
    background: #dc2626;
    color: #fff;
    font-size: 10px;
    font-weight: 700;
    padding: 1px 6px;
    border-radius: 10px;
    min-width: 18px;
    text-align: center;
    line-height: 16px;
  }
  .ad-logout-wrap { padding: 12px 14px 20px; border-top: 1px solid rgba(255,255,255,0.08); }
  .ad-logout-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 9px 12px;
    background: none;
    border: 1px solid rgba(255,255,255,0.18);
    border-radius: 8px;
    color: rgba(255,255,255,0.65);
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    font-family: inherit;
    transition: background 0.15s, color 0.15s;
  }
  .ad-logout-btn:hover { background: rgba(255,255,255,0.08); color: #fff; }

  /* ── Main content ───────────────────────────────────────────── */
  .ad-content { flex: 1; background: #f2f4f0; overflow-y: auto; min-width: 0; }
  .ad-content-inner {
    max-width: 1060px;
    margin: 0 auto;
    padding: 32px 32px 56px;
  }
  .ad-page-title {
    font-size: 22px;
    font-weight: 800;
    margin: 0 0 24px;
  }

  /* ── Stat cards ─────────────────────────────────────────────── */
  .ad-stats {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 14px;
    margin-bottom: 32px;
  }
  .ad-stat {
    background: #fff;
    border-radius: 12px;
    padding: 18px 22px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.06);
  }
  .ad-stat-label {
    font-size: 10px;
    font-weight: 700;
    color: #9ca3af;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    margin-bottom: 8px;
  }
  .ad-stat-value {
    font-size: 34px;
    font-weight: 800;
    color: #111;
    line-height: 1;
  }
  .ad-stat-value.red { color: #dc2626; }

  /* ── Section heading ────────────────────────────────────────── */
  .ad-section-title {
    font-size: 15px;
    font-weight: 700;
    margin: 0 0 14px;
  }

  /* ── Table card ─────────────────────────────────────────────── */
  .ad-card {
    background: #fff;
    border-radius: 12px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.06);
    overflow: hidden;
    margin-bottom: 28px;
  }
  .ad-table {
    width: 100%;
    border-collapse: collapse;
  }
  .ad-table th {
    background: #f9fafb;
    text-align: left;
    padding: 11px 16px;
    font-size: 10px;
    font-weight: 700;
    color: #9ca3af;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    border-bottom: 1px solid #e5e7eb;
    white-space: nowrap;
  }
  .ad-table td {
    padding: 13px 16px;
    font-size: 13px;
    border-bottom: 1px solid #f3f4f6;
    vertical-align: middle;
  }
  .ad-table tr:last-child td { border-bottom: none; }
  .ad-table tr:hover td { background: #fafafa; }
  .ad-table-name { font-weight: 600; }
  .ad-table-sub  { font-size: 12px; color: #6b7280; margin-top: 1px; }

  /* ── Pills ──────────────────────────────────────────────────── */
  .pill {
    display: inline-flex;
    align-items: center;
    font-size: 11px;
    font-weight: 700;
    padding: 3px 10px;
    border-radius: 20px;
    text-transform: capitalize;
    white-space: nowrap;
  }
  .pill-buyer       { background: #dcfce7; color: #15803d; }
  .pill-coordinator { background: #ede9fe; color: #7c3aed; }
  .pill-collector   { background: #dbeafe; color: #1d4ed8; }
  .pill-admin       { background: #fce7f3; color: #9d174d; }
  .pill-active      { background: #dcfce7; color: #15803d; }
  .pill-pending     { background: #fef9c3; color: #a16207; }
  .pill-suspended   { background: #fee2e2; color: #b91c1c; }

  /* ── Buttons ────────────────────────────────────────────────── */
  .ad-btn {
    padding: 6px 14px;
    border-radius: 6px;
    border: none;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
    font-family: inherit;
    transition: opacity 0.15s;
    white-space: nowrap;
  }
  .ad-btn:hover { opacity: 0.85; }
  .ad-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .ad-btn-green  { background: #1f6f4a; color: #fff; margin-right: 6px; }
  .ad-btn-red    { background: #dc2626; color: #fff; }
  .ad-btn-ghost  { background: #f3f4f6; color: #374151; border: 1px solid #e5e7eb; }

  /* ── Error / loading / empty ────────────────────────────────── */
  .ad-error   { background: #fef2f2; color: #dc2626; border-radius: 10px; padding: 12px 16px; font-size: 13px; margin-bottom: 20px; }
  .ad-loading { text-align: center; color: #9ca3af; padding: 60px 0; font-size: 14px; }
  .ad-empty   { text-align: center; color: #9ca3af; padding: 40px 20px; font-size: 14px; }

  /* ── Mobile header (hidden on desktop) ─────────────────────── */
  .ad-mobile-header {
    display: none;
    background: #1a3a28;
    padding: 0 16px;
    height: 56px;
    align-items: center;
    justify-content: space-between;
    position: sticky;
    top: 0;
    z-index: 100;
  }
  .ad-mobile-brand { font-size: 15px; font-weight: 800; color: #fff; }
  .ad-mobile-nav {
    display: none;
    background: #1a3a28;
    padding: 6px 12px;
    gap: 4px;
    overflow-x: auto;
  }
  .ad-mobile-nav-item {
    padding: 7px 12px;
    background: none;
    border: none;
    color: rgba(255,255,255,0.65);
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    white-space: nowrap;
    border-radius: 6px;
    font-family: inherit;
  }
  .ad-mobile-nav-item.active { background: rgba(255,255,255,0.15); color: #fff; }

  /* ── Responsive ─────────────────────────────────────────────── */
  @media (max-width: 768px) {
    .ad-root { flex-direction: column; }
    .ad-sidebar { display: none; }
    .ad-mobile-header { display: flex; }
    .ad-mobile-nav    { display: flex; }
    .ad-content-inner { padding: 20px 14px 48px; }
    .ad-stats { grid-template-columns: repeat(2, 1fr); gap: 10px; }
    .ad-stat-value { font-size: 26px; }
    .ad-card { overflow-x: auto; }
  }
  @media (max-width: 400px) {
    .ad-stats { grid-template-columns: 1fr; }
  }
`;

const NAV = [
  { key: 'dashboard', label: 'Dashboard',         icon: '▦' },
  { key: 'approvals', label: 'Pending Approvals',  icon: '✓' },
  { key: 'users',     label: 'Manage Users',        icon: '⊞' },
  { key: 'disputes',  label: 'Disputes',            icon: '⚠' },
];

function rolePill(role) {
  return <span className={`pill pill-${role}`}>{role}</span>;
}
function statusPill(status) {
  return <span className={`pill pill-${status}`}>{status}</span>;
}
function fmt(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function AdminDashboard() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const [section,  setSection]  = useState('dashboard');
  const [stats,    setStats]    = useState(null);
  const [pending,  setPending]  = useState([]);
  const [users,    setUsers]    = useState([]);
  const [disputes, setDisputes] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [busy,     setBusy]     = useState({});  // tracks per-row loading state

  function handleLogout() {
    navigate('/', { replace: true });
    logout();
  }

  const refreshStats = useCallback(async () => {
    try {
      const res = await getStats();
      setStats(res.data);
    } catch {}
  }, []);

  const loadSection = useCallback(async (sec) => {
    setLoading(true);
    setError('');
    try {
      if (sec === 'dashboard' || sec === 'approvals') {
        const [sRes, pRes] = await Promise.all([getStats(), getPending()]);
        setStats(sRes.data);
        setPending(pRes.data.pending);
      } else if (sec === 'users') {
        const [sRes, uRes] = await Promise.all([getStats(), getUsers()]);
        setStats(sRes.data);
        setUsers(uRes.data.users);
      } else if (sec === 'disputes') {
        const [sRes, dRes] = await Promise.all([getStats(), getDisputes()]);
        setStats(sRes.data);
        setDisputes(dRes.data.disputes);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadSection(section); }, [section, loadSection]);

  async function withBusy(key, fn) {
    setBusy(b => ({ ...b, [key]: true }));
    setError('');
    try { await fn(); }
    catch (err) { setError(err.response?.data?.error || 'Action failed'); }
    finally { setBusy(b => ({ ...b, [key]: false })); }
  }

  async function handleApprove(userId) {
    await withBusy(`approve-${userId}`, async () => {
      await approveUser(userId);
      setPending(p => p.filter(u => u.user_id !== userId));
      refreshStats();
    });
  }

  async function handleReject(userId) {
    await withBusy(`reject-${userId}`, async () => {
      await rejectUser(userId);
      setPending(p => p.filter(u => u.user_id !== userId));
      refreshStats();
    });
  }

  async function handleToggleStatus(u) {
    const next = u.status === 'suspended' ? 'active' : 'suspended';
    await withBusy(`status-${u.user_id}`, async () => {
      await updateUserStatus(u.user_id, next);
      setUsers(us => us.map(x => x.user_id === u.user_id ? { ...x, status: next } : x));
    });
  }

  async function handleResolve(logId, action) {
    await withBusy(`resolve-${logId}-${action}`, async () => {
      await resolveDispute(logId, action);
      setDisputes(d => d.filter(x => x.log_id !== logId));
      refreshStats();
    });
  }

  const pendingCount  = stats?.pendingApprovals ?? 0;
  const disputeCount  = stats?.openDisputes     ?? 0;

  const sectionTitle = {
    dashboard: 'Admin overview',
    approvals: 'Pending Approvals',
    users:     'Manage Users',
    disputes:  'Disputes',
  }[section];

  return (
    <>
      <style>{css}</style>
      <div className="ad-root">

        {/* ── Sidebar (desktop) ── */}
        <aside className="ad-sidebar">
          <div className="ad-brand">♻ WasteManagement</div>

          <div className="ad-greeting">
            <div className="ad-greeting-hello">Hello,</div>
            <div className="ad-greeting-name">{user?.name ?? 'Admin'}</div>
          </div>

          <nav className="ad-nav">
            {NAV.map(n => (
              <button
                key={n.key}
                className={`ad-nav-item${section === n.key ? ' active' : ''}`}
                onClick={() => setSection(n.key)}
              >
                <span className="ad-nav-icon">{n.icon}</span>
                {n.label}
                {n.key === 'approvals' && pendingCount > 0 && (
                  <span className="ad-nav-badge">{pendingCount}</span>
                )}
                {n.key === 'disputes' && disputeCount > 0 && (
                  <span className="ad-nav-badge">{disputeCount}</span>
                )}
              </button>
            ))}
          </nav>

          <div className="ad-logout-wrap">
            <button className="ad-logout-btn" onClick={handleLogout}>
              ⏻ Logout
            </button>
          </div>
        </aside>

        {/* ── Mobile header ── */}
        <div>
          <div className="ad-mobile-header">
            <span className="ad-mobile-brand">♻ WasteManagement</span>
            <button
              onClick={handleLogout}
              style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'inherit' }}
            >
              Logout
            </button>
          </div>
          <div className="ad-mobile-nav">
            {NAV.map(n => (
              <button
                key={n.key}
                className={`ad-mobile-nav-item${section === n.key ? ' active' : ''}`}
                onClick={() => setSection(n.key)}
              >
                {n.label}
                {n.key === 'approvals' && pendingCount > 0 ? ` (${pendingCount})` : ''}
                {n.key === 'disputes'  && disputeCount  > 0 ? ` (${disputeCount})`  : ''}
              </button>
            ))}
          </div>
        </div>

        {/* ── Main content ── */}
        <main className="ad-content">
          <div className="ad-content-inner">
            <h1 className="ad-page-title">{sectionTitle}</h1>

            {error && <div className="ad-error">{error}</div>}

            {/* Stat cards — shown on dashboard, approvals, and disputes */}
            {stats && section !== 'users' && (
              <div className="ad-stats">
                <div className="ad-stat">
                  <div className="ad-stat-label">Total Users</div>
                  <div className="ad-stat-value">{stats.totalUsers.toLocaleString()}</div>
                </div>
                <div className="ad-stat">
                  <div className="ad-stat-label">Pending Approvals</div>
                  <div className="ad-stat-value">{stats.pendingApprovals}</div>
                </div>
                <div className="ad-stat">
                  <div className="ad-stat-label">Open Disputes</div>
                  <div className={`ad-stat-value${stats.openDisputes > 0 ? ' red' : ''}`}>
                    {stats.openDisputes}
                  </div>
                </div>
                <div className="ad-stat">
                  <div className="ad-stat-label">Total Transactions</div>
                  <div className="ad-stat-value">{stats.totalTransactions.toLocaleString()}</div>
                </div>
              </div>
            )}

            {loading ? (
              <div className="ad-loading">Loading…</div>
            ) : (
              <>
                {/* ══ DASHBOARD + APPROVALS — pending table ══ */}
                {(section === 'dashboard' || section === 'approvals') && (
                  <>
                    <p className="ad-section-title">Pending approvals</p>
                    <div className="ad-card">
                      {pending.length === 0 ? (
                        <div className="ad-empty">No accounts awaiting approval.</div>
                      ) : (
                        <table className="ad-table">
                          <thead>
                            <tr>
                              <th>Name</th>
                              <th>Role</th>
                              <th>Phone</th>
                              <th>Submitted</th>
                              <th>Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {pending.map(u => (
                              <tr key={u.user_id}>
                                <td>
                                  <div className="ad-table-name">{u.name}</div>
                                  <div className="ad-table-sub">{u.email}</div>
                                </td>
                                <td>{rolePill(u.role)}</td>
                                <td>{u.phone_number}</td>
                                <td>{fmt(u.created_at)}</td>
                                <td>
                                  <button
                                    className="ad-btn ad-btn-green"
                                    disabled={!!busy[`approve-${u.user_id}`]}
                                    onClick={() => handleApprove(u.user_id)}
                                  >
                                    {busy[`approve-${u.user_id}`] ? '…' : 'Approve'}
                                  </button>
                                  <button
                                    className="ad-btn ad-btn-red"
                                    disabled={!!busy[`reject-${u.user_id}`]}
                                    onClick={() => handleReject(u.user_id)}
                                  >
                                    {busy[`reject-${u.user_id}`] ? '…' : 'Reject'}
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </>
                )}

                {/* ══ MANAGE USERS ══ */}
                {section === 'users' && (
                  <>
                    <p className="ad-section-title">All users ({users.length})</p>
                    <div className="ad-card">
                      {users.length === 0 ? (
                        <div className="ad-empty">No users found.</div>
                      ) : (
                        <table className="ad-table">
                          <thead>
                            <tr>
                              <th>Name</th>
                              <th>Phone</th>
                              <th>Role</th>
                              <th>Status</th>
                              <th>Joined</th>
                              <th>Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {users.map(u => (
                              <tr key={u.user_id}>
                                <td>
                                  <div className="ad-table-name">{u.name}</div>
                                  <div className="ad-table-sub">{u.email}</div>
                                </td>
                                <td>{u.phone_number}</td>
                                <td>{rolePill(u.role)}</td>
                                <td>{statusPill(u.status)}</td>
                                <td>{fmt(u.created_at)}</td>
                                <td>
                                  {u.role !== 'admin' && u.status !== 'pending' && (
                                    <button
                                      className="ad-btn ad-btn-ghost"
                                      disabled={!!busy[`status-${u.user_id}`]}
                                      onClick={() => handleToggleStatus(u)}
                                    >
                                      {busy[`status-${u.user_id}`]
                                        ? '…'
                                        : u.status === 'suspended' ? 'Activate' : 'Suspend'}
                                    </button>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </>
                )}

                {/* ══ DISPUTES ══ */}
                {section === 'disputes' && (
                  <>
                    <p className="ad-section-title">Open disputes ({disputes.length})</p>
                    <div className="ad-card">
                      {disputes.length === 0 ? (
                        <div className="ad-empty">No open disputes.</div>
                      ) : (
                        <table className="ad-table">
                          <thead>
                            <tr>
                              <th>Category</th>
                              <th>Weight</th>
                              <th>Collector</th>
                              <th>Buyer</th>
                              <th>Date</th>
                              <th>Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {disputes.map(d => (
                              <tr key={d.log_id}>
                                <td style={{ textTransform: 'capitalize' }}>{d.category}</td>
                                <td>{parseFloat(d.weight_kg).toFixed(1)} kg</td>
                                <td>
                                  <div className="ad-table-name">{d.collector_name}</div>
                                  <div className="ad-table-sub">{d.collector_phone}</div>
                                </td>
                                <td>{d.buyer_name ?? <span style={{ color: '#9ca3af' }}>—</span>}</td>
                                <td>{fmt(d.created_at)}</td>
                                <td>
                                  <button
                                    className="ad-btn ad-btn-green"
                                    disabled={!!busy[`resolve-${d.log_id}-confirm`]}
                                    onClick={() => handleResolve(d.log_id, 'confirm')}
                                    title="Rule in collector's favour — mark as confirmed"
                                  >
                                    {busy[`resolve-${d.log_id}-confirm`] ? '…' : 'Confirm'}
                                  </button>
                                  <button
                                    className="ad-btn ad-btn-red"
                                    style={{ marginLeft: 6 }}
                                    disabled={!!busy[`resolve-${d.log_id}-cancel`]}
                                    onClick={() => handleResolve(d.log_id, 'cancel')}
                                    title="Cancel the match — return log to pending"
                                  >
                                    {busy[`resolve-${d.log_id}-cancel`] ? '…' : 'Cancel'}
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </main>

      </div>
    </>
  );
}
