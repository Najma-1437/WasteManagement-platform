// client/src/pages/Landing.jsx
import { Link } from 'react-router-dom';

export default function Landing() {
  return (
    <main style={{ fontFamily: 'sans-serif', maxWidth: 900, margin: '0 auto', padding: 24 }}>

      {/* ── Navbar ──────────────────────────────────────── */}
      <nav style={{ display: 'flex', justifyContent: 'space-between',
                    alignItems: 'center', marginBottom: 48 }}>
        <h2 style={{ margin: 0, color: '#1e4d2b' }}>♻ WasteManagement</h2>
        <div style={{ display: 'flex', gap: 16 }}>
          <Link to="/login"    style={linkStyle}>Log In</Link>
          <Link to="/register" style={{ ...linkStyle, ...btnStyle }}>Get Started</Link>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────── */}
      <section style={{ textAlign: 'center', padding: '64px 0' }}>
        <h1 style={{ fontSize: 40, color: '#1e4d2b', marginBottom: 16 }}>
          Connect Waste Collectors to Buyers — Directly.
        </h1>
        <p style={{ fontSize: 18, color: '#555', marginBottom: 32, maxWidth: 600, margin: '0 auto 32px' }}>
          Log waste by GPS, get matched to verified buyers, receive M-Pesa
          payment instantly. No middlemen.
        </p>
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
          <Link to="/register" style={{ ...btnStyle, fontSize: 16, padding: '12px 28px' }}>
            Register Now
          </Link>
          <Link to="/login" style={{ ...linkStyle, fontSize: 16, padding: '12px 28px',
                                     border: '1px solid #1e4d2b', borderRadius: 6 }}>
            Log In
          </Link>
        </div>
      </section>

      {/* ── Features ────────────────────────────────────── */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)',
                        gap: 24, margin: '64px 0' }}>
        {[
          { icon: '📍', title: 'GPS Waste Logging',
            desc: 'Log waste by category and location via web or USSD on any phone.' },
          { icon: '🤝', title: 'Direct Buyer Matching',
            desc: 'Automatically matched to the best offer by proximity and price.' },
          { icon: '💚', title: 'M-Pesa Payments',
            desc: 'Earnings sent directly to your mobile wallet on collection confirmation.' },
          { icon: '🗺', title: 'Environmental Heatmaps',
            desc: 'Real-time GPS data visualised for community coordinators.' },
        ].map((f) => (
          <div key={f.title} style={{ background: '#f5faf5', borderRadius: 8,
                                       padding: 24, border: '1px solid #d0e8d0' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>{f.icon}</div>
            <h3 style={{ margin: '0 0 8px', color: '#1e4d2b' }}>{f.title}</h3>
            <p style={{ margin: 0, color: '#555' }}>{f.desc}</p>
          </div>
        ))}
      </section>

      {/* ── CTA ─────────────────────────────────────────── */}
      <section style={{ textAlign: 'center', background: '#1e4d2b',
                        borderRadius: 12, padding: '48px 24px', margin: '48px 0' }}>
        <h2 style={{ color: '#fff', marginBottom: 16 }}>Ready to get started?</h2>
        <p style={{ color: '#a8d5a8', marginBottom: 24 }}>
          Join collectors and buyers already on the platform.
        </p>
        <Link to="/register" style={{ background: '#fff', color: '#1e4d2b',
                                       padding: '12px 32px', borderRadius: 6,
                                       textDecoration: 'none', fontWeight: 'bold' }}>
          Create Your Account
        </Link>
      </section>

      {/* ── Footer ──────────────────────────────────────── */}
      <footer style={{ textAlign: 'center', color: '#aaa', padding: '24px 0',
                        borderTop: '1px solid #eee' }}>
        <p>© 2026 WasteManagement Platform · Nairobi, Kenya</p>
      </footer>

    </main>
  );
}

const linkStyle = { textDecoration: 'none', color: '#1e4d2b', fontWeight: '500' };
const btnStyle  = { background: '#1e4d2b', color: '#fff', padding: '8px 18px',
                    borderRadius: 6, textDecoration: 'none', fontWeight: '500' };