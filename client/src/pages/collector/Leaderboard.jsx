import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/authStore';
import api from '../../api/axiosClient';
import { AppLayout } from '../../components/shared';

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

`;

function LevelBadge({ pts }) {
  const level = computeLevel(pts);
  return (
    <span className={`lb-level lb-level-${level.toLowerCase()}`}>{level}</span>
  );
}

export default function Leaderboard() {
  const { t } = useTranslation();
  const { user } = useAuthStore();

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

  const myUserId = user?.user_id;

  return (
    <>
      <style>{css}</style>
      <AppLayout active="leaderboard" maxWidth={800}>
            <div className="lb-header">
              <h1 className="lb-title">{t('leaderboard.title')}</h1>
              <p className="lb-sub">{t('leaderboard.subtitle', { points: POINTS_PER_KES })}</p>
            </div>

            <div className="lb-card">
              {loading ? (
                <div className="lb-empty">{t('leaderboard.loading')}</div>
              ) : error ? (
                <div className="lb-empty" style={{ color: '#B3261E' }}>{error}</div>
              ) : board.length === 0 ? (
                <div className="lb-empty">
                  {t('leaderboard.noPointsYet')}
                </div>
              ) : (
                <table className="lb-table">
                  <thead>
                    <tr>
                      <th style={{ width: 56 }}>{t('leaderboard.colRank')}</th>
                      <th>{t('leaderboard.colCollector')}</th>
                      <th style={{ textAlign: 'right' }}>{t('leaderboard.colPoints')}</th>
                      <th style={{ width: 100 }}>{t('leaderboard.colLevel')}</th>
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
                                {t('leaderboard.you')}
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
                              {t('leaderboard.you')}
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
      </AppLayout>
    </>
  );
}

const POINTS_PER_KES = 10;
