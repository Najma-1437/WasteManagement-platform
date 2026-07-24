import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../api/axiosClient';
import DisputeModal from '../../components/DisputeModal';
import { AppLayout } from '../../components/shared';

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
  matched:   { key: 'statusMatched',   cls: 'bm-pill-matched' },
  confirmed: { key: 'statusConfirmed', cls: 'bm-pill-confirmed' },
  paid:      { key: 'statusPaid',      cls: 'bm-pill-paid' },
  disputed:  { key: 'statusDisputed',  cls: 'bm-pill-disputed' },
};

// Statuses a collector can dispute — mirrors the server-side gate in
// raiseDispute (wasteLogs.controller.js).
const DISPUTABLE = ['matched', 'confirmed'];

const css = `
  *, *::before, *::after { box-sizing: border-box; }

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
`;

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-KE', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

function StatusPill({ status }) {
  const { t } = useTranslation();
  const meta = STATUS_META[status];
  const label = meta ? t(`buyerMatches.${meta.key}`) : (status ?? '—');
  return <span className={`bm-pill ${meta?.cls ?? 'bm-pill-matched'}`}>{label}</span>;
}

export default function BuyerMatches() {
  const { t } = useTranslation();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [disputing, setDisputing] = useState(null); // match being disputed

  useEffect(() => {
    api.get('/waste-logs/my/matches')
      .then(res => setMatches(res.data.matches))
      .catch(err => setError(err.response?.data?.error || t('buyerMatches.loadFailed')))
      .finally(() => setLoading(false));
  }, [t]);

  const handleDisputed = (updated) => {
    setMatches(prev => prev.map(m =>
      m.log_id === updated.log_id ? { ...m, status: updated.status } : m
    ));
    setDisputing(null);
  };

  return (
    <>
      <style>{css}</style>
      <AppLayout active="matches">
            <h1 className="cd-page-title">{t('buyerMatches.pageTitle')}</h1>

            {error && (
              <div className="cd-empty" style={{ color: C.danger, padding: '20px 0 32px' }}>
                {error}
              </div>
            )}

            <div className="cd-table-card">
              <div className="cd-table-header">
                <h2 className="cd-table-title">{t('buyerMatches.matchedLogs')}</h2>
                {!loading && (
                  <span className="cd-table-count">
                    {t('buyerMatches.matchCount', { count: matches.length })}
                  </span>
                )}
              </div>

              {loading ? (
                <div className="cd-empty">
                  <div className="cd-empty-icon">⏳</div>
                  <p>{t('buyerMatches.loading')}</p>
                </div>
              ) : matches.length === 0 ? (
                <div className="cd-empty">
                  <div className="cd-empty-icon">🤝</div>
                  <p style={{ fontWeight: 600 }}>{t('buyerMatches.noMatchesYet')}</p>
                  <p>{t('buyerMatches.noMatchesSub')}</p>
                </div>
              ) : (
                <div className="cd-table-wrap">
                  <table className="cd-table">
                    <thead>
                      <tr>
                        <th>{t('buyerMatches.colCategory')}</th>
                        <th>{t('buyerMatches.colWeight')}</th>
                        <th>{t('buyerMatches.colBuyer')}</th>
                        <th>{t('buyerMatches.colZone')}</th>
                        <th>{t('buyerMatches.colPrice')}</th>
                        <th>{t('buyerMatches.colStatus')}</th>
                        <th>{t('buyerMatches.colDate')}</th>
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
                                {t('buyerMatches.raiseDispute')}
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
      </AppLayout>

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
