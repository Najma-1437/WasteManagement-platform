// client/src/pages/Login.jsx
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore, ROLE_DASHBOARDS } from '../store/authStore';

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
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
      return;
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#e8f5f0',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '40px 20px 0',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}>

      {/* Logo */}
      <div style={{
        width: 72, height: 72,
        background: '#2d9e6b',
        borderRadius: 20,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 34, marginBottom: 16,
        boxShadow: '0 4px 16px rgba(45,158,107,0.3)',
      }}>♻</div>

      <h1 style={{ fontSize: 28, fontWeight: 800, color: '#111', margin: '0 0 6px', letterSpacing: '-0.5px' }}>
        WasteManagement
      </h1>
      <p style={{ fontSize: 14, color: '#666', margin: '0 0 28px' }}>
        Precision waste management for our community
      </p>

      {/* Card */}
      <div style={{
        background: '#fff',
        borderRadius: 20,
        width: '100%',
        maxWidth: 480,
        boxShadow: '0 2px 20px rgba(0,0,0,0.08)',
        overflow: 'hidden',
      }}>
        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid #f0f0f0' }}>
          <div style={{
            flex: 1, textAlign: 'center', padding: '18px 0',
            fontWeight: 700, fontSize: 15, color: '#2d9e6b',
            borderBottom: '2.5px solid #2d9e6b',
            cursor: 'pointer',
          }}>Sign In</div>
          <Link to="/register" style={{
            flex: 1, textAlign: 'center', padding: '18px 0',
            fontWeight: 600, fontSize: 15, color: '#999',
            textDecoration: 'none', borderBottom: '2.5px solid transparent',
          }}>Create Account</Link>
        </div>

        <div style={{ padding: '28px 28px 24px' }}>
          {error && (
            <div style={{
              background: '#fef2f2', color: '#dc2626', borderRadius: 10,
              padding: '12px 14px', fontSize: 14, marginBottom: 20,
              border: '1px solid #fecaca',
            }}>{error}</div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Email */}
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#333', marginBottom: 8 }}>
              Email or Phone Number
            </label>
            <div style={{ position: 'relative', marginBottom: 20 }}>
              <span style={{
                position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                fontSize: 16, color: '#aaa',
              }}>@</span>
              <input
                name="email" type="email" value={form.email}
                onChange={handleChange} placeholder="name@example.com" required
                style={{
                  width: '100%', padding: '14px 14px 14px 40px',
                  border: '1.5px solid #e8e8e8', borderRadius: 12,
                  fontSize: 15, boxSizing: 'border-box', outline: 'none',
                  background: '#fafafa', color: '#333',
                }}
              />
            </div>

            {/* Password */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#333' }}>Password</label>
              <span style={{ fontSize: 13, color: '#2d9e6b', fontWeight: 600, cursor: 'pointer' }}>Forgot?</span>
            </div>
            <div style={{ position: 'relative', marginBottom: 24 }}>
              <span style={{
                position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                fontSize: 16, color: '#aaa',
              }}>🔒</span>
              <input
                name="password" type={showPassword ? 'text' : 'password'}
                value={form.password} onChange={handleChange}
                placeholder="••••••••" required
                style={{
                  width: '100%', padding: '14px 44px 14px 40px',
                  border: '1.5px solid #e8e8e8', borderRadius: 12,
                  fontSize: 15, boxSizing: 'border-box', outline: 'none',
                  background: '#fafafa', color: '#333',
                }}
              />
              <button type="button" onClick={() => setShowPassword(s => !s)} style={{
                position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#aaa', padding: 0,
              }}>👁</button>
            </div>

            <button type="submit" disabled={loading} style={{
              width: '100%', padding: '16px',
              background: '#1e6b3c', color: '#fff', border: 'none',
              borderRadius: 12, fontSize: 16, fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              letterSpacing: '0.3px',
            }}>
              {loading ? 'Signing in...' : 'Access Portal'}
            </button>
          </form>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '22px 0' }}>
            <div style={{ flex: 1, height: 1, background: '#eee' }} />
            <span style={{ fontSize: 13, color: '#aaa', whiteSpace: 'nowrap' }}>Or continue with</span>
            <div style={{ flex: 1, height: 1, background: '#eee' }} />
          </div>

          {/* Google only — M-Pesa login skipped per spec */}
          <button style={{
            width: '100%', padding: '14px',
            border: '1.5px solid #e8e8e8', borderRadius: 12,
            fontSize: 15, fontWeight: 600, cursor: 'pointer',
            background: '#fff', color: '#333',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          }}>
            <span style={{ fontSize: 20 }}>G</span> Google
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 48, margin: '32px 0 24px', textAlign: 'center' }}>
        <div>
          <div style={{ fontSize: 32, fontWeight: 800, color: '#2d9e6b' }}>12.4k</div>
          <div style={{ fontSize: 13, color: '#555', fontWeight: 500 }}>Active Recyclers</div>
        </div>
        <div style={{ width: 1, background: '#ddd' }} />
        <div>
          <div style={{ fontSize: 32, fontWeight: 800, color: '#2d9e6b' }}>85%</div>
          <div style={{ fontSize: 13, color: '#555', fontWeight: 500 }}>Efficiency Rate</div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ textAlign: 'center', paddingBottom: 32 }}>
        <p style={{ fontWeight: 700, fontSize: 15, margin: '0 0 4px', color: '#111' }}>WasteManagement</p>
        <p style={{ fontSize: 12, color: '#aaa', margin: '0 0 12px' }}>© 2026 WasteManagement Platform. All rights reserved.</p>
        <div style={{ display: 'flex', gap: 20, justifyContent: 'center' }}>
          {['Privacy Policy', 'Terms of Service', 'Contact Support'].map(t => (
            <span key={t} style={{ fontSize: 12, color: '#aaa', cursor: 'pointer' }}>{t}</span>
          ))}
        </div>
      </div>
    </div>
  );
}