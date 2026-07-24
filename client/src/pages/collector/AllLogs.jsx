import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../../api/axiosClient';
import EditLogModal from '../../components/EditLogModal';
import { AppLayout, ConfirmDialog, useToast } from '../../components/shared';

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
  .cd-pill-confirmed        { background: #FFF4E5; color: #D97706; }
  .cd-pill-disputed         { background: #FDECEA; color: #B3261E; }

  /* ── Edit / Delete buttons ── */
  .cd-edit-btn {
    background: none; border: none; cursor: pointer; font-size: 14px;
    color: ${C.primary}; padding: 3px 6px; border-radius: 6px; line-height: 1;
    transition: background 0.12s; font-family: inherit;
  }
  .cd-edit-btn:hover { background: #EAF4EE; }
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
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [logs, setLogs]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage]       = useState(1);
  const [editingLog, setEditingLog] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const { show } = useToast();

  useEffect(() => {
    api.get('/waste-logs/my')
      .then(res => setLogs(res.data.logs))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
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
      show(err.response?.data?.error || 'Failed to delete log.', { tone: 'error' });
    } finally {
      setDeleting(false);
    }
  };

  const handleEditSaved = (updated) => {
    setLogs(prev => prev.map(l => (l.log_id === updated.log_id ? { ...l, ...updated } : l)));
    setEditingLog(null);
  };

  // Sort newest-first then paginate
  const sorted     = [...logs].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const visible    = sorted.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <>
      <style>{css}</style>
      <AppLayout active="logs">

            <div className="al-page-header">
              <h1 className="al-page-title">{t('allLogs.pageTitle')}</h1>
              {!loading && (
                <span className="al-log-count">
                  {t('allLogs.logCount', { count: logs.length })}
                </span>
              )}
            </div>

            <div className="cd-table-card">
              {loading ? (
                <div className="cd-empty">
                  <div className="cd-empty-icon">⏳</div>
                  <p>{t('allLogs.loading')}</p>
                </div>
              ) : logs.length === 0 ? (
                <div className="cd-empty">
                  <div className="cd-empty-icon">📋</div>
                  <p style={{ fontWeight: 600 }}>{t('allLogs.noLogsYet')}</p>
                  <p>
                    <button
                      onClick={() => navigate('/collector/log-new')}
                      style={{
                        background: 'none', border: 'none', color: C.primary,
                        fontWeight: 600, cursor: 'pointer', fontSize: 14,
                        fontFamily: 'inherit', padding: 0,
                      }}
                    >
                      {t('allLogs.submitFirstLog')}
                    </button>
                  </p>
                </div>
              ) : (
                <>
                  <div className="cd-table-wrap">
                    <table className="cd-table">
                      <thead>
                        <tr>
                          <th>{t('allLogs.colType')}</th>
                          <th>{t('allLogs.colWeight')}</th>
                          <th>{t('allLogs.colLocation')}</th>
                          <th>{t('allLogs.colStatus')}</th>
                          <th>{t('allLogs.colDate')}</th>
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

                  {totalPages > 1 && (
                    <div className="al-pagination">
                      <button
                        className="al-page-btn"
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                      >
                        {t('allLogs.previous')}
                      </button>
                      <span className="al-page-info">
                        {currentPage} / {totalPages}
                      </span>
                      <button
                        className="al-page-btn"
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                      >
                        {t('allLogs.next')}
                      </button>
                    </div>
                  )}
                </>
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
    </>
  );
}
