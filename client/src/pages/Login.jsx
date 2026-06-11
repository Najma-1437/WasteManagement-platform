// client/src/pages/Login.jsx
import { useState }         from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore, ROLE_DASHBOARDS } from '../store/authStore';

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const { login, loading, error, clearError } = useAuthStore();
  const navigate = useNavigate();

  const handleChange = (e) => {
    clearError();
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const user = await login(form.email, form.password);
      navigate(ROLE_DASHBOARDS[user.role], { replace: true });
    } catch {
      // error already set in store
    }
  };

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <h2 style={{ textAlign: 'center', color: '#1e4d2b', marginBottom: 24 }}>
          ♻ Sign In
        </h2>

        {error && (
          <div style={errorStyle}>{error}</div>
        )}

        <form onSubmit={handleSubmit}>
          <label style={labelStyle}>Email address</label>
          <input
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            placeholder="you@example.com"
            required
            style={inputStyle}
          />

          <label style={labelStyle}>Password</label>
          <input
            name="password"
            type="password"
            value={form.password}
            onChange={handleChange}
            placeholder="••••••••"
            required
            style={inputStyle}
          />

          <button
            type="submit"
            disabled={loading}
            style={submitStyle}
          >
            {loading ? 'Signing in...' : 'Log In'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 16, color: '#555' }}>
          Don't have an account?{' '}
          <Link to="/register" style={{ color: '#1e4d2b', fontWeight: '500' }}>
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}

const pageStyle   = { minHeight: '100vh', display: 'flex', alignItems: 'center',
                       justifyContent: 'center', background: '#f5faf5' };
const cardStyle   = { background: '#fff', padding: 32, borderRadius: 10,
                       width: '100%', maxWidth: 420,
                       boxShadow: '0 2px 16px rgba(0,0,0,0.08)' };
const labelStyle  = { display: 'block', marginBottom: 4, fontWeight: '500',
                       color: '#333', fontSize: 14 };
const inputStyle  = { width: '100%', padding: '10px 12px', marginBottom: 16,
                       border: '1px solid #ccc', borderRadius: 6, fontSize: 14,
                       boxSizing: 'border-box' };
const submitStyle = { width: '100%', padding: '12px', background: '#1e4d2b',
                       color: '#fff', border: 'none', borderRadius: 6,
                       fontSize: 15, fontWeight: '600', cursor: 'pointer' };
const errorStyle  = { background: '#fde8e8', color: '#c0392b', padding: '10px 14px',
                       borderRadius: 6, marginBottom: 16, fontSize: 14 };