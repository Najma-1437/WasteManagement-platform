import { useState, useEffect } from 'react';
import api from '../api/axiosClient';

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    api.get('/notifications')
      .then(res => setNotifications(res.data.notifications))
      .catch(err => console.error('[NotificationBell] fetch error:', err.response?.data ?? err.message));
  }, []);

  const unread = notifications.filter(n => !n.is_read).length;

  async function handleItemClick(n) {
    if (n.is_read) return;
    try {
      await api.patch(`/notifications/${n.notification_id}/read`);
      setNotifications(prev =>
        prev.map(x =>
          x.notification_id === n.notification_id ? { ...x, is_read: true } : x
        )
      );
    } catch { /* ignore — best effort */ }
  }

  return (
    <>
      {/* ── Bell button (styled to match sidebar nav items) ── */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 11,
          padding: '11px 14px',
          borderRadius: 10,
          border: 'none',
          background: open ? 'rgba(255,255,255,0.18)' : 'transparent',
          color: open ? '#fff' : 'rgba(255,255,255,0.65)',
          fontSize: 14,
          fontWeight: 600,
          cursor: 'pointer',
          textAlign: 'left',
          width: '100%',
          transition: 'background 0.15s, color 0.15s',
          fontFamily: 'inherit',
        }}
      >
        <span style={{ position: 'relative', fontSize: 16, width: 20, textAlign: 'center', flexShrink: 0 }}>
          🔔
          {unread > 0 && (
            <span style={{
              position: 'absolute',
              top: -5,
              right: -6,
              background: '#F59E0B',
              color: '#fff',
              fontSize: 9,
              fontWeight: 800,
              borderRadius: '50%',
              width: 14,
              height: 14,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              lineHeight: 1,
              pointerEvents: 'none',
            }}>
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </span>
        Notifications
        {unread > 0 && (
          <span style={{
            marginLeft: 'auto',
            background: '#F59E0B',
            borderRadius: 10,
            padding: '1px 8px',
            fontSize: 11,
            fontWeight: 700,
            color: '#fff',
          }}>
            {unread}
          </span>
        )}
      </button>

      {/* ── Slide-in panel + backdrop ── */}
      {open && (
        <>
          {/* Backdrop — closes panel on outside click */}
          <div
            onClick={() => setOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 299,
            }}
          />

          {/* Panel */}
          <div style={{
            position: 'fixed',
            top: 0,
            right: 0,
            bottom: 0,
            width: 320,
            background: '#fff',
            zIndex: 300,
            boxShadow: '-4px 0 24px rgba(0,0,0,0.14)',
            display: 'flex',
            flexDirection: 'column',
            fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
          }}>
            {/* Panel header */}
            <div style={{
              padding: '18px 20px 14px',
              borderBottom: '1px solid #E5E7EB',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexShrink: 0,
            }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: '#1A1A1A' }}>
                Notifications
              </span>
              <button
                onClick={() => setOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 18,
                  color: '#6B7280',
                  lineHeight: 1,
                  padding: '2px 6px',
                  borderRadius: 6,
                }}
              >
                ✕
              </button>
            </div>

            {/* Notification list */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {notifications.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  color: '#6B7280',
                  padding: '64px 20px',
                  fontSize: 14,
                }}>
                  <div style={{ fontSize: 36, marginBottom: 10 }}>🔔</div>
                  <p style={{ margin: 0 }}>No notifications yet.</p>
                </div>
              ) : (
                notifications.map(n => (
                  <div
                    key={n.notification_id}
                    onClick={() => handleItemClick(n)}
                    style={{
                      padding: '14px 20px',
                      borderBottom: '1px solid #F3F4F6',
                      cursor: n.is_read ? 'default' : 'pointer',
                      background: n.is_read ? '#fff' : '#F0FBF4',
                      display: 'flex',
                      gap: 12,
                      alignItems: 'flex-start',
                      transition: 'background 0.12s',
                    }}
                  >
                    <span style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: n.is_read ? 'transparent' : '#1e6b3c',
                      flexShrink: 0,
                      marginTop: 5,
                    }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{
                        margin: '0 0 4px',
                        fontSize: 13,
                        color: '#1A1A1A',
                        lineHeight: 1.45,
                      }}>
                        {n.message}
                      </p>
                      <p style={{ margin: 0, fontSize: 11, color: '#9CA3AF' }}>
                        {timeAgo(n.sent_at)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
