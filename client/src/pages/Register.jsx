// client/src/pages/Register.jsx
import { useState }         from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore }     from '../store/authStore';

export default function Register() {
  const [form, setForm] = useState({
    name: '', email: '', phone_number: '',
    password: '', role: '',
    residence: '', house_number: '',
    organisation_name: '', organisation: '',
  });
  const [success, setSuccess]   = useState('');
  const { register, loading, error, clearError } = useAuthStore();
  const navigate = useNavigate();

  const handleChange = (e) => {
    clearError();
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = await register(form);
      setSuccess(data.message);
      // Collectors can log in immediately — redirect after 2 seconds
      if (form.role === 'collector') {
        setTimeout(() => navigate('/login'), 2000);
      }
    } catch {
      // error already set in store
    }
  };

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <h2 style={{ textAlign: 'center', color: '#1e4d2b', marginBottom: 8 }}>
          ♻ Create Account
        </h2>
        <p style={{ textAlign: 'center', color: '#888', marginBottom: 24, fontSize: 14 }}>
          Select your role to begin
        </p>

        {error   && <div style={errorStyle}>{error}</div>}
        {success && <div style={successStyle}>{success}</div>}

        <form onSubmit={handleSubmit}>

          {/* Role selector */}
          <label style={labelStyle}>I am a...</label>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {['collector', 'buyer', 'coordinator'].map(r => (
              <button
                key={r}
                type="button"
                onClick={() => { clearError(); setForm(f => ({ ...f, role: r })); }}
                style={{
                  flex: 1, padding: '8px 4px', borderRadius: 6, fontSize: 13,
                  cursor: 'pointer', fontWeight: '500',
                  border: form.role === r ? '2px solid #1e4d2b' : '1px solid #ccc',
                  background: form.role === r ? '#e8f5e9' : '#fff',
                  color: form.role === r ? '#1e4d2b' : '#555',
                }}
              >
                {r.charAt(0).toUpperCase() + r.slice(1)}
              </button>
            ))}
          </div>

          <Field label="Full name"      name="name"
                 value={form.name}       onChange={handleChange} />
          <Field label="Email address"  name="email"  type="email"
                 value={form.email}      onChange={handleChange} />

          {/* Phone with +254 prefix locked */}
          <label style={labelStyle}>Phone number</label>
          <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
            <div style={{ ...inputStyle, width: 72, background: '#f5f5f5',
                           display:'flex', alignItems:'center',
                           justifyContent:'center', marginBottom: 0 }}>
              +254
            </div>
            <input
              name="phone_number"
              type="tel"
              placeholder="7XX XXX XXX"
              value={form.phone_number.replace('+254', '')}
              onChange={e => {
                clearError();
                const digits = e.target.value.replace(/\D/g,'');
                setForm(f => ({ ...f, phone_number: `+254${digits}` }));
              }}
              style={{ ...inputStyle, flex: 1, marginBottom: 0 }}
              maxLength={9}
              required
            />
          </div>

          <Field label="Password (min 8 chars, 1 uppercase, 1 number)"
                 name="password" type="password"
                 value={form.password} onChange={handleChange} />

          {/* Conditional fields by role */}
          {form.role === 'collector' && <>
            <Field label="Residence (estate / area)"
                   name="residence" value={form.residence} onChange={handleChange} required />
            <Field label="House number (optional)"
                   name="house_number" value={form.house_number}
                   onChange={handleChange} required={false} />
          </>}

          {form.role === 'buyer' && (
            <Field label="Organisation name"
                   name="organisation_name" value={form.organisation_name}
                   onChange={handleChange} />
          )}

          {form.role === 'coordinator' && (
            <Field label="Organisation name"
                   name="organisation" value={form.organisation}
                   onChange={handleChange} />
          )}

          <button
            type="submit"
            disabled={loading || !form.role}
            style={{ ...submitStyle,
                     opacity: (!form.role || loading) ? 0.6 : 1 }}
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        {['buyer','coordinator'].includes(form.role) && (
          <p style={{ fontSize: 12, color: '#888', marginTop: 12, textAlign: 'center' }}>
            Buyer and Coordinator accounts require administrator approval before login.
          </p>
        )}

        <p style={{ textAlign: 'center', marginTop: 16, color: '#555' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: '#1e4d2b', fontWeight: '500' }}>Log In</Link>
        </p>
      </div>
    </div>
  );
}

// Reusable field component
function Field({ label, name, value, onChange, type = 'text', required = true }) {
  return (
    <>
      <label style={labelStyle}>{label}</label>
      <input name={name} type={type} value={value} onChange={onChange}
             required={required} style={inputStyle} />
    </>
  );
}

const pageStyle   = { minHeight: '100vh', display: 'flex', alignItems: 'center',
                       justifyContent: 'center', background: '#f5faf5', padding: 16 };
const cardStyle   = { background: '#fff', padding: 32, borderRadius: 10,
                       width: '100%', maxWidth: 460,
                       boxShadow: '0 2px 16px rgba(0,0,0,0.08)' };
const labelStyle  = { display: 'block', marginBottom: 4, fontWeight: '500',
                       color: '#333', fontSize: 14 };
const inputStyle  = { width: '100%', padding: '10px 12px', marginBottom: 16,
                       border: '1px solid #ccc', borderRadius: 6, fontSize: 14,
                       boxSizing: 'border-box' };
const submitStyle = { width: '100%', padding: '12px', background: '#1e4d2b',
                       color: '#fff', border: 'none', borderRadius: 6,
                       fontSize: 15, fontWeight: '600', cursor: 'pointer' };
const errorStyle   = { background: '#fde8e8', color: '#c0392b', padding: '10px 14px',
                        borderRadius: 6, marginBottom: 16, fontSize: 14 };
const successStyle = { background: '#e8f5e9', color: '#2e7d32', padding: '10px 14px',
                        borderRadius: 6, marginBottom: 16, fontSize: 14 };