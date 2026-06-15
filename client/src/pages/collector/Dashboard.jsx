// client/src/pages/collector/Dashboard.jsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import api from '../../api/axiosClient';

const categoryIcon = {
  plastic:  { icon: '🌿', bg: '#e8f5ec' },
  organic:  { icon: '🍃', bg: '#f0fdf4' },
  metal:    { icon: '⚙️', bg: '#eff6ff' },
  'e-waste':{ icon: '💻', bg: '#faf5ff' },
};

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hrs  = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 60)  return `${mins}m ago`;
  if (hrs < 24)   return `Today, ${new Date(dateStr).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })}`;
  if (days === 1) return 'Yesterday';
  return `${days} days ago`;
}

export default function CollectorDashboard() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [logs, setLogs]       = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/waste-logs/my')
      .then(res => setLogs(res.data.logs))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const totalWeight = logs.reduce((s, l) => s + parseFloat(l.weight_kg || 0), 0);
  const recentLogs  = [...logs]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 5);

  const GREEN = '#1e6b3c';

  return (
    <div style={{
      minHeight: '100vh', background: '#f2f4f7',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      position: 'relative', paddingBottom: 100,
    }}>

      {/* ── Top bar ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 18px', background: '#fff',
        boxShadow: '0 1px 0 #eee',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: GREEN, fontSize: 22 }}>♻</span>
          <span style={{ fontWeight: 800, fontSize: 17, color: GREEN }}>WasteManagement</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontSize: 20, cursor: 'pointer' }}>🔍</span>
          <span style={{ fontSize: 20, cursor: 'pointer' }}>🔔</span>
          <div onClick={logout} style={{
            width: 36, height: 36, borderRadius: '50%',
            background: '#ccc', overflow: 'hidden',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, fontSize: 15, color: '#555', cursor: 'pointer',
          }}>{user?.name?.charAt(0).toUpperCase() || 'C'}</div>
        </div>
      </div>

      <div style={{ padding: '16px 14px' }}>

        {/* ── Total Earnings card (hardcoded pending earnings endpoint) ── */}
        <div style={{
          background: '#fff', borderRadius: 16, padding: '18px 20px',
          marginBottom: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#888', letterSpacing: 1, textTransform: 'uppercase', margin: '0 0 6px' }}>TOTAL EARNINGS</p>
            <p style={{ fontSize: 24, fontWeight: 800, color: '#111', margin: '0 0 4px' }}>KES —</p>
            <p style={{ fontSize: 12, color: '#888', margin: 0 }}>Pending earnings integration</p>
          </div>
          <div style={{ width: 50, height: 50, borderRadius: '50%', background: '#e6f9ef', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>💰</div>
        </div>

        {/* ── Total Weight card ── */}
        <div style={{
          background: '#fff', borderRadius: 16, padding: '18px 20px',
          marginBottom: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#888', letterSpacing: 1, textTransform: 'uppercase', margin: '0 0 6px' }}>TOTAL WEIGHT</p>
            <p style={{ fontSize: 24, fontWeight: 800, color: '#111', margin: '0 0 4px' }}>
              {loading ? '—' : `${totalWeight.toFixed(1)} kg`}
            </p>
            <p style={{ fontSize: 12, color: '#888', margin: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
              <span>⏱</span> Lifetime collection
            </p>
          </div>
          <div style={{ width: 50, height: 50, borderRadius: '50%', background: '#f0eeff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>⏳</div>
        </div>

        {/* ── Level Up Journey ── */}
        <div style={{
          background: GREEN, borderRadius: 16, padding: '20px 20px 16px',
          marginBottom: 16, position: 'relative', overflow: 'hidden',
          boxShadow: '0 4px 16px rgba(30,107,60,0.25)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 700, fontSize: 16, color: '#fff', margin: '0 0 6px' }}>Level Up Journey</p>
              <p style={{ fontSize: 13, color: '#a8d5b8', margin: '0 0 20px', lineHeight: 1.4 }}>
                Keep logging waste to earn points and unlock badges
              </p>
              <div style={{ height: 6, background: 'rgba(255,255,255,0.2)', borderRadius: 3, marginBottom: 8 }}>
                <div style={{ height: '100%', width: '60%', background: '#4ade80', borderRadius: 3 }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12, color: '#a8d5b8' }}>Silver</span>
                <span style={{ fontSize: 12, color: '#a8d5b8' }}>Gold</span>
              </div>
            </div>
            <div style={{
              width: 58, height: 58, borderRadius: '50%',
              background: '#4ade80', marginLeft: 16, flexShrink: 0,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              color: GREEN, fontWeight: 800, fontSize: 13,
            }}>
              <span>—</span>
              <span style={{ fontSize: 10 }}>PTS</span>
            </div>
          </div>
        </div>

        {/* ── Recent Activities ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <span style={{ fontWeight: 700, fontSize: 16, color: '#111' }}>Recent Activities</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: GREEN, cursor: 'pointer', letterSpacing: 0.5 }}>VIEW ALL</span>
        </div>

        <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', marginBottom: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          {loading ? (
            <p style={{ padding: 20, color: '#aaa', textAlign: 'center' }}>Loading...</p>
          ) : recentLogs.length === 0 ? (
            <p style={{ padding: 20, color: '#aaa', textAlign: 'center' }}>
              No logs yet. Tap + to submit your first waste log.
            </p>
          ) : (
            recentLogs.map((log, i) => {
              const cat = categoryIcon[log.category] || { icon: '♻', bg: '#f0fdf4' };
              return (
                <div key={log.log_id} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '14px 16px',
                  borderBottom: i < recentLogs.length - 1 ? '1px solid #f5f5f5' : 'none',
                }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 10,
                    background: cat.bg, display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontSize: 20, flexShrink: 0,
                  }}>{cat.icon}</div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 600, fontSize: 14, margin: '0 0 3px', color: '#111' }}>
                      {log.category.charAt(0).toUpperCase() + log.category.slice(1)} Collection
                    </p>
                    <p style={{ fontSize: 12, color: '#888', margin: 0 }}>
                      {log.notes || '—'} • {parseFloat(log.weight_kg).toFixed(1)} kg
                    </p>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: GREEN, margin: '0 0 3px' }}>
                      {parseFloat(log.weight_kg).toFixed(1)} kg
                    </p>
                    <p style={{ fontSize: 11, color: '#aaa', margin: 0 }}>
                      {timeAgo(log.created_at)}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* ── Support card ── */}
        <div style={{
          background: '#fff', borderRadius: 16, padding: '20px',
          textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        }}>
          <div style={{ fontSize: 28, marginBottom: 6 }}>❓</div>
          <p style={{ fontWeight: 700, fontSize: 14, margin: '0 0 2px', color: '#111' }}>Support</p>
          <p style={{ fontSize: 12, color: '#888', margin: 0 }}>Get Assistance</p>
        </div>

      </div>

      {/* ── FAB ── */}
      <button
        onClick={() => navigate('/collector/log-new')}
        style={{
          position: 'fixed', bottom: 28, right: 20,
          width: 56, height: 56, borderRadius: '50%',
          background: GREEN, color: '#fff', border: 'none',
          fontSize: 30, cursor: 'pointer',
          boxShadow: '0 4px 16px rgba(30,107,60,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 200, fontWeight: 300,
        }}
      >+</button>

    </div>
  );
}