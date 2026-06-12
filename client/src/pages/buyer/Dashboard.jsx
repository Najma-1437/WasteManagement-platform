import { useAuthStore } from '../../store/authStore';
export default function BuyerDashboard() {
  const { user, logout } = useAuthStore();
  return (
    <div style={{ padding: 32 }}>
      <h1 style={{ color: '#3a2a5e' }}>Buyer Dashboard</h1>
      <p>Welcome, {user?.name}</p>
      <button onClick={logout} style={{ marginTop: 16, padding: '8px 16px', cursor: 'pointer' }}>
        Logout
      </button>
    </div>
  );
}