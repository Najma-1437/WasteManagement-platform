import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../../api/axiosClient';
import EditLogModal from '../../components/EditLogModal';
import { getQueuedLogs } from '../../utils/offlineQueue';
import { AppLayout, ConfirmDialog, useToast } from '../../components/shared';

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
  const { t } = useTranslation();
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
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const { show } = useToast();

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

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/waste-logs/${deleteTarget.log_id}`);
      setLogs(prev => prev.filter(l => l.log_id !== deleteTarget.log_id));
      setDeleteTarget(null);
      show(t('toast.logDeleted'), { tone: 'success' });
    } catch (err) {
      show(err.response?.data?.error || t('toast.logDeleteFailed'), { tone: 'error' });
    } finally {
      setDeleting(false);
    }
  };

  const handleEditSaved = (updated) => {
    setLogs(prev => prev.map(l => (l.log_id === updated.log_id ? { ...l, ...updated } : l)));
    setEditingLog(null);
  };

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
        error: err.response?.data?.error || t('collectorDashboard.redeemFailed'),
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

  const syncNotice = pendingCount > 0 && (
    <div className="cd-sync-notice" title={t('collectorDashboard.syncTooltip')}>
      <span className="cd-sync-dot" />
      {t('collectorDashboard.syncNotice', { count: pendingCount })}
    </div>
  );

  return (
    <>
      <style>{css}</style>
      <AppLayout active="dashboard" extraSidebarContent={syncNotice}>
            <h1 className="cd-page-title">{t('collectorDashboard.pageTitle')}</h1>

            {/* ── Stat cards ── */}
            <div className="cd-stats">
              <div className="cd-stat">
                <div className="cd-stat-icon">💰</div>
                <div className="cd-stat-label">{t('collectorDashboard.earningsThisMonth')}</div>
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
                    {t('collectorDashboard.viewEarnings')}
                  </button>
                </div>
              </div>

              <div className="cd-stat">
                <div className="cd-stat-icon">🤝</div>
                <div className="cd-stat-label">{t('collectorDashboard.activeMatches')}</div>
                <div className="cd-stat-value">
                  {loading ? '—' : matchedCount}
                </div>
                <div className="cd-stat-sub">
                  {loading ? '' : t('collectorDashboard.logsMatched', { count: matchedCount })}
                </div>
              </div>

              <div className="cd-stat">
                <div className="cd-stat-icon">⭐</div>
                <div className="cd-stat-label">{t('collectorDashboard.points')}</div>
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
                    {t('collectorDashboard.redeemButton')}
                  </button>
                )}
              </div>
            </div>

            {/* ── Recent waste logs table ── */}
            <div className="cd-table-card">
              <div className="cd-table-header">
                <h2 className="cd-table-title">{t('collectorDashboard.recentLogsTitle')}</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {!loading && (
                    <span className="cd-table-count">
                      {t('collectorDashboard.logCountTotal', { count: logs.length })}
                    </span>
                  )}
                  {logs.length > 10 && (
                    <button
                      className="cd-view-all-btn"
                      onClick={() => navigate('/collector/logs')}
                    >
                      {t('collectorDashboard.viewAll')}
                    </button>
                  )}
                </div>
              </div>

              {loading ? (
                <div className="cd-empty">
                  <div className="cd-empty-icon">⏳</div>
                  <p>{t('common.loading')}</p>
                </div>
              ) : recentLogs.length === 0 ? (
                <div className="cd-empty">
                  <div className="cd-empty-icon">📋</div>
                  <p style={{ fontWeight: 600 }}>{t('collectorDashboard.noLogsYet')}</p>
                  <p>
                    <button
                      onClick={() => navigate('/collector/log-new')}
                      style={{
                        background: 'none', border: 'none', color: C.primary,
                        fontWeight: 600, cursor: 'pointer', fontSize: 14,
                        fontFamily: 'inherit', padding: 0,
                      }}
                    >
                      {t('collectorDashboard.submitFirstLog')}
                    </button>
                  </p>
                </div>
              ) : (
                <div className="cd-table-wrap">
                  <table className="cd-table">
                    <thead>
                      <tr>
                        <th>{t('collectorDashboard.colType')}</th>
                        <th>{t('collectorDashboard.colWeight')}</th>
                        <th>{t('collectorDashboard.colLocation')}</th>
                        <th>{t('collectorDashboard.colStatus')}</th>
                        <th>{t('collectorDashboard.colDate')}</th>
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
                                  title={t('allLogs.editLog')}
                                >
                                  ✎
                                </button>
                                <button
                                  className="cd-delete-btn"
                                  onClick={() => setDeleteTarget(log)}
                                  title={t('allLogs.deleteLog')}
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
      </AppLayout>

      {/* ── Edit log modal ── */}
      {editingLog && (
        <EditLogModal
          log={editingLog}
          onClose={() => setEditingLog(null)}
          onSaved={handleEditSaved}
        />
      )}

      {/* ── Delete confirmation ── */}
      <ConfirmDialog
        open={!!deleteTarget}
        tone="warning"
        title={t('confirmDialog.deleteLogTitle')}
        message={t('confirmDialog.deleteLogMessage')}
        confirmLabel={t('confirmDialog.deleteLogConfirm')}
        cancelLabel={t('common.cancel')}
        confirming={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* ── Redeem modal ── */}
      {redeem.open && (
        <div className="cd-overlay" onClick={closeRedeem}>
          <div className="cd-modal" onClick={e => e.stopPropagation()}>
            <div className="cd-modal-header">
              <p className="cd-modal-title">{t('collectorDashboard.redeemModalTitle')}</p>
              <button className="cd-modal-close" onClick={closeRedeem}>✕</button>
            </div>

            {redeem.result ? (
              <div className="cd-modal-success">
                <div style={{ fontSize: 36, marginBottom: 10 }}>✅</div>
                <p style={{ fontWeight: 700, margin: '0 0 6px', fontSize: 15 }}>
                  {t('collectorDashboard.redeemSuccessTitle')}
                </p>
                <p style={{ margin: '0 0 4px', fontSize: 14 }}>
                  {redeem.result.points_spent} pts → KES {redeem.result.airtime_value_kes}
                </p>
                <p style={{ fontSize: 12, color: C.muted, margin: '0 0 20px', lineHeight: 1.5 }}>
                  {t('collectorDashboard.redeemStatusPending')}
                </p>
                <button className="cd-modal-submit" onClick={closeRedeem}>{t('collectorDashboard.redeemDone')}</button>
              </div>
            ) : (
              <form onSubmit={handleRedeem}>
                <p style={{ fontSize: 13, color: C.muted, margin: '0 0 14px', lineHeight: 1.5 }}>
                  {t('collectorDashboard.redeemYouHave')} <strong style={{ color: C.text }}>
                    {gamification.points?.toLocaleString()} pts
                  </strong> {t('collectorDashboard.redeemPointsAvailable')}{' '}
                  {t('collectorDashboard.redeemRateInfo', { rate: POINTS_PER_KES })}
                </p>
                <input
                  className="cd-modal-input"
                  type="number"
                  min="100"
                  max={gamification.points ?? 0}
                  step="1"
                  placeholder={t('collectorDashboard.redeemInputPlaceholder')}
                  value={redeem.input}
                  onChange={e => setRedeem(r => ({ ...r, input: e.target.value, error: '' }))}
                />
                {redeemKes && (
                  <div className="cd-redeem-preview">
                    {t('collectorDashboard.redeemPreview', { pts: redeemPts, kes: redeemKes })}
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
                  {redeem.submitting ? t('collectorDashboard.redeemSubmitting') : t('collectorDashboard.redeemSubmitButton')}
                </button>
                <p style={{ fontSize: 11, color: C.muted, margin: '10px 0 0', textAlign: 'center' }}>
                  {t('collectorDashboard.redeemFootnote')}
                </p>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
