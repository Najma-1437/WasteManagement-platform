// client/src/pages/Register.jsx
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore, ROLE_DASHBOARDS } from '../store/authStore';

export default function Register() {
  const [form, setForm] = useState({
    name: '', email: '', phone_number: '', password: '', role: '',
    residence: '', house_number: '', organisation_name: '', organisation: '',
  });
  const { register, login, loading, error, clearError } = useAuthStore();
  const navigate = useNavigate();

  const handleChange = (e) => {
    clearError();
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await register(form);
      const user = await login(form.phone_number, form.password);
      navigate(ROLE_DASHBOARDS[user.role], { replace: true });
    } catch {
      // error already set in store
    }
  };

  const GREEN = '#1e6b3c';

  const inputStyle = {
    width: '100%', padding: '13px 14px',
    border: '1.5px solid #e8e8e8', borderRadius: 12,
    fontSize: 15, boxSizing: 'border-box', outline: 'none',
    background: '#fafafa', color: '#333', marginBottom: 16,
  };

  return (
    <div style={{
      minHeight: '100vh', background: '#e8f5f0',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '40px 20px 32px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}>

      {/* Logo */}
      <div style={{ width: 72, height: 72, background: '#2d9e6b', borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 34, marginBottom: 16, boxShadow: '0 4px 16px rgba(45,158,107,0.3)' }}>♻</div>
      <h1 style={{ fontSize: 28, fontWeight: 800, color: '#111', margin: '0 0 6px', letterSpacing: '-0.5px' }}>WasteManagement</h1>
      <p style={{ fontSize: 14, color: '#666', margin: '0 0 28px' }}>Precision waste management for our community</p>

      {/* Card */}
      <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 480, boxShadow: '0 2px 20px rgba(0,0,0,0.08)', overflow: 'hidden' }}>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid #f0f0f0' }}>
          <Link to="/login" style={{ flex: 1, textAlign: 'center', padding: '18px 0', fontWeight: 600, fontSize: 15, color: '#999', textDecoration: 'none', borderBottom: '2.5px solid transparent' }}>Sign In</Link>
          <div style={{ flex: 1, textAlign: 'center', padding: '18px 0', fontWeight: 700, fontSize: 15, color: GREEN, borderBottom: `2.5px solid ${GREEN}`, cursor: 'pointer' }}>Create Account</div>
        </div>

        <div style={{ padding: '28px 28px 24px' }}>
          {error && <div style={{ background: '#fef2f2', color: '#dc2626', borderRadius: 10, padding: '12px 14px', fontSize: 14, marginBottom: 20, border: '1px solid #fecaca' }}>{error}</div>}

          <form onSubmit={handleSubmit}>
            {/* Role */}
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#333', marginBottom: 10 }}>I am a...</label>
            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
              {[
                { key: 'collector', label: 'Collector', icon: '♻' },
                { key: 'buyer',     label: 'Buyer',     icon: '🏭' },
                { key: 'coordinator', label: 'Coordinator', icon: '🗺' },
              ].map(r => (
                <button key={r.key} type="button"
                  onClick={() => { clearError(); setForm(f => ({ ...f, role: r.key })); }}
                  style={{
                    flex: 1, padding: '12px 4px', borderRadius: 12, cursor: 'pointer',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                    border: form.role === r.key ? `2px solid ${GREEN}` : '1.5px solid #e8e8e8',
                    background: form.role === r.key ? '#eaf5ee' : '#fafafa',
                    color: form.role === r.key ? GREEN : '#555',
                    fontSize: 13, fontWeight: 600,
                  }}>
                  <span style={{ fontSize: 20 }}>{r.icon}</span>
                  {r.label}
                </button>
              ))}
            </div>

            {/* Common fields */}
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#333', marginBottom: 8 }}>Full name</label>
            <input name="name" type="text" value={form.name} onChange={handleChange} placeholder="Jane Wanjiku" required style={inputStyle} />

            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#333', marginBottom: 8 }}>Email address</label>
            <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="jane@example.com" required style={inputStyle} />

            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#333', marginBottom: 8 }}>Phone number</label>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <div style={{ padding: '13px 14px', border: '1.5px solid #e8e8e8', borderRadius: 12, background: '#f0f0f0', fontSize: 15, color: '#555', fontWeight: 600 }}>+254</div>
              <input name="phone_number" type="tel" placeholder="7XX XXX XXX"
                value={form.phone_number.replace('+254', '')}
                onChange={e => { clearError(); const d = e.target.value.replace(/\D/g,''); setForm(f => ({ ...f, phone_number: `+254${d}` })); }}
                style={{ ...inputStyle, flex: 1, marginBottom: 0 }} maxLength={9} required />
            </div>

            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#333', marginBottom: 8 }}>Password</label>
            <input name="password" type="password" value={form.password} onChange={handleChange} placeholder="Min 8 chars, 1 uppercase, 1 number" required style={inputStyle} />

            {/* Role-specific */}
            {form.role === 'collector' && <>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#333', marginBottom: 8 }}>Residence / Estate</label>
              <input name="residence" value={form.residence} onChange={handleChange} placeholder="e.g. Kasitu Estate" required style={inputStyle} />
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#333', marginBottom: 8 }}>House number <span style={{ color: '#aaa', fontWeight: 400 }}>(optional)</span></label>
              <input name="house_number" value={form.house_number} onChange={handleChange} placeholder="e.g. A4" style={inputStyle} />
            </>}
            {form.role === 'buyer' && <>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#333', marginBottom: 8 }}>Organisation name</label>
              <input name="organisation_name" value={form.organisation_name} onChange={handleChange} placeholder="e.g. GreenCycle Ltd" required style={inputStyle} />
            </>}
            {form.role === 'coordinator' && <>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#333', marginBottom: 8 }}>Organisation name</label>
              <input name="organisation" value={form.organisation} onChange={handleChange} placeholder="e.g. Nairobi County" required style={inputStyle} />
            </>}

            <button type="submit" disabled={loading || !form.role} style={{
              width: '100%', padding: '16px', background: GREEN, color: '#fff',
              border: 'none', borderRadius: 12, fontSize: 16, fontWeight: 700,
              cursor: (!form.role || loading) ? 'not-allowed' : 'pointer',
              opacity: (!form.role || loading) ? 0.6 : 1,
            }}>
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: '#666' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: GREEN, fontWeight: 600, textDecoration: 'none' }}>Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  );
}