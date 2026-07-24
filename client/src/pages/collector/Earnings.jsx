import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../api/axiosClient';
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

  @media (max-width: 767px) {
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
  const { t } = useTranslation();

  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  useEffect(() => {
    api.get('/waste-logs/my/earnings')
      .then(res => setData(res.data))
      .catch(err => setError(err.response?.data?.error || 'Failed to load earnings.'))
      .finally(() => setLoading(false));
  }, []);

  const transactions = data?.transactions ?? [];

  return (
    <>
      <style>{css}</style>
      <AppLayout active="earnings">
            <h1 className="cd-page-title">{t('earnings.pageTitle')}</h1>

            {error && (
              <div className="cd-empty" style={{ color: C.danger, padding: '20px 0 32px' }}>
                {error}
              </div>
            )}

            {/* ── Stat cards ── */}
            <div className="cd-stats">
              <div className="cd-stat">
                <div className="cd-stat-icon">💰</div>
                <div className="cd-stat-label">{t('earnings.totalEarned')}</div>
                <div className="cd-stat-value">
                  {loading ? '—' : formatKes(data?.total_earned ?? 0)}
                </div>
                <div className="cd-stat-sub">{t('earnings.totalEarnedSub')}</div>
              </div>

              <div className="cd-stat">
                <div className="cd-stat-icon">📅</div>
                <div className="cd-stat-label">{t('earnings.thisMonth')}</div>
                <div className="cd-stat-value">
                  {loading ? '—' : formatKes(data?.this_month_earned ?? 0)}
                </div>
                <div className="cd-stat-sub">{t('earnings.thisMonthSub')}</div>
              </div>

              <div className="cd-stat">
                <div className="cd-stat-icon">⏳</div>
                <div className="cd-stat-label">{t('earnings.pending')}</div>
                <div className="cd-stat-value">
                  {loading ? '—' : formatKes(data?.pending_amount ?? 0)}
                </div>
                <div className="cd-stat-sub">{t('earnings.pendingSub')}</div>
              </div>
            </div>

            {/* ── Transaction history table ── */}
            <div className="cd-table-card">
              <div className="cd-table-header">
                <h2 className="cd-table-title">{t('earnings.transactionHistory')}</h2>
                {!loading && (
                  <span className="cd-table-count">
                    {t('earnings.transactionCount', { count: transactions.length })}
                  </span>
                )}
              </div>

              {loading ? (
                <div className="cd-empty">
                  <div className="cd-empty-icon">⏳</div>
                  <p>{t('earnings.loading')}</p>
                </div>
              ) : transactions.length === 0 ? (
                <div className="cd-empty">
                  <div className="cd-empty-icon">💰</div>
                  <p style={{ fontWeight: 600 }}>{t('earnings.noTransactionsYet')}</p>
                  <p>{t('earnings.noTransactionsSub')}</p>
                </div>
              ) : (
                <div className="cd-table-wrap">
                  <table className="cd-table">
                    <thead>
                      <tr>
                        <th>{t('earnings.colDate')}</th>
                        <th>{t('earnings.colCategory')}</th>
                        <th>{t('earnings.colWeight')}</th>
                        <th>{t('earnings.colAmount')}</th>
                        <th>{t('earnings.colStatus')}</th>
                        <th>{t('earnings.colMpesaCode')}</th>
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

      </AppLayout>
    </>
  );
}
