// client/src/pages/collector/Dashboard.jsx
import { useAuthStore } from '../../store/authStore';
export default function CollectorDashboard() {
  const { user, logout } = useAuthStore();
  return (
    <div style={{ padding: 32 }}>
      <h1 style={{ color: '#1e4d2b' }}>Collector Dashboard</h1>
      <p>Welcome, {user?.name}</p>
      <button onClick={logout}
              style={{ marginTop: 16, padding: '8px 16px', cursor: 'pointer' }}>
        Logout
      </button>
    </div>
  );
}