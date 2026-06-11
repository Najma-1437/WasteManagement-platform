// client/src/pages/Unauthorized.jsx
import { Link } from 'react-router-dom';
import { useAuthStore, ROLE_DASHBOARDS } from '../store/authStore';

export default function Unauthorized() {
  const { user } = useAuthStore();
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
      <h1 style={{ color: '#c0392b' }}>403 — Access Denied</h1>
      <p style={{ color: '#555' }}>You don't have permission to view that page.</p>
      {user
        ? <Link to={ROLE_DASHBOARDS[user.role]}
                style={{ color: '#1e4d2b', fontWeight: '500' }}>
            Go to your dashboard →
          </Link>
        : <Link to="/login" style={{ color: '#1e4d2b', fontWeight: '500' }}>
            Log In
          </Link>
      }
    </div>
  );
}