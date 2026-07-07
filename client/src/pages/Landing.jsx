// client/src/pages/Landing.jsx
import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

const ROLE_DASHBOARDS = {
  collector: '/collector', buyer: '/buyer',
  coordinator: '/coordinator', admin: '/admin',
};

export default function Landing() {
  const { isAuthenticated, user } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated && user?.role) navigate(ROLE_DASHBOARDS[user.role], { replace: true });
  }, [isAuthenticated, user, navigate]);

  const GREEN = '#1F6F4A';

  return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', color: '#111', background: '#fff' }}>

      {/* ── Nav ── */}
      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', borderBottom: '1px solid #f0f0f0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ color: GREEN, fontSize: 18 }}>♻</span>
          <span style={{ fontWeight: 800, fontSize: 15, color: GREEN }}>WasteManagement</span>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section style={{ padding: '32px 18px 20px' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: '#e8f5ec', borderRadius: 20, padding: '5px 12px',
          fontSize: 11, fontWeight: 700, color: GREEN, letterSpacing: 0.5,
          marginBottom: 16, textTransform: 'uppercase',
        }}>
          🌿 CONNECTING COLLECTORS TO BUYERS
        </div>
        <h1 style={{ fontSize: 30, fontWeight: 900, lineHeight: 1.2, margin: '0 0 16px', color: '#111' }}>
          Connecting Nairobi&apos;s Waste Collectors to{' '}
          <em style={{ color: GREEN, fontStyle: 'italic' }}>Verified Buyers</em>
        </h1>
        <p style={{ fontSize: 14, color: '#666', lineHeight: 1.7, margin: '0 0 24px' }}>
          Log waste by web or USSD, get matched with nearby buyers, and get paid
          securely through M-Pesa.
        </p>
        <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
          <Link to="/register" style={{
            background: GREEN, color: '#fff', textDecoration: 'none',
            padding: '12px 22px', borderRadius: 10, fontWeight: 700, fontSize: 14,
          }}>Get Started →</Link>
          <Link to="/login" style={{
            color: '#555', textDecoration: 'none',
            padding: '12px 18px', borderRadius: 10, fontWeight: 600, fontSize: 14,
            border: '1.5px solid #e0e0e0',
          }}>Sign In</Link>
        </div>
      </section>

      {/* ── Empowering ── */}
      <section style={{ padding: '24px 18px', textAlign: 'center', background: '#f9fafb' }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: '#aaa', letterSpacing: 1, textTransform: 'uppercase', margin: '0 0 10px' }}>Empowering the Ecosystem</p>
        <p style={{ fontSize: 15, fontWeight: 600, color: '#333', lineHeight: 1.6, margin: 0 }}>
          A platform built for transparency between collectors, buyers, and coordinators.
        </p>
      </section>

      {/* ── For Collectors ── */}
      <section style={{ padding: '24px 18px' }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: '#aaa', letterSpacing: 1, textTransform: 'uppercase', margin: '0 0 6px' }}>For Waste Collectors</p>
        <p style={{ fontSize: 14, color: '#555', lineHeight: 1.7, margin: '0 0 16px' }}>
          Log waste by category and weight, get matched with buyers near you, and
          get paid through M-Pesa once the buyer confirms receipt.
        </p>
        <div style={{ display: 'flex', gap: 10 }}>
          {[['📱', 'USSD Access'], ['🔒', 'Secure M-Pesa Payouts']].map(([icon, label]) => (
            <div key={label} style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
              padding: 14, background: '#f9fafb', borderRadius: 12, border: '1px solid #eee',
            }}>
              <span style={{ fontSize: 22 }}>{icon}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#444', textAlign: 'center' }}>{label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── For Buyers ── */}
      <section style={{ padding: '24px 18px' }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: '#aaa', letterSpacing: 1, textTransform: 'uppercase', margin: '0 0 6px' }}>For Buyers</p>
        <p style={{ fontSize: 14, color: '#555', lineHeight: 1.7, margin: 0 }}>
          Post offers, get matched with nearby collectors, and confirm receipt to release payment.
        </p>
      </section>

      {/* ── Why ── */}
      <section style={{ padding: '24px 18px' }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: '#aaa', margin: '0 0 16px' }}>Why WasteManagement?</p>
        {[
          { icon: '🔗', title: 'Verified Supply Chain', desc: 'Every waste log is GPS-tagged, categorized by type and weight, and tracked from submission to buyer confirmation.' },
          { icon: '📊', title: 'Buyer Matching', desc: 'Waste logs are matched to nearby buyer offers automatically, so collectors don\'t have to search for a buyer.' },
          { icon: '🌿', title: 'Coordinator Insights', desc: 'Environmental coordinators track collection zones, categories, and hotspots on a live map, with exportable reports.' },
        ].map(w => (
          <div key={w.title} style={{ display: 'flex', gap: 14, marginBottom: 20, alignItems: 'flex-start' }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: '#f0faf4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>{w.icon}</div>
            <div>
              <p style={{ fontWeight: 700, fontSize: 14, margin: '0 0 4px', color: '#111' }}>{w.title}</p>
              <p style={{ fontSize: 13, color: '#666', margin: 0, lineHeight: 1.6 }}>{w.desc}</p>
            </div>
          </div>
        ))}
      </section>

      {/* ── CTA ── */}
      <section style={{ padding: '28px 18px', textAlign: 'center', background: '#f9fafb', borderTop: '1px solid #eee' }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 10px', color: '#111' }}>Ready to get started?</h2>
        <p style={{ fontSize: 13, color: '#666', lineHeight: 1.6, margin: '0 0 20px' }}>
          Sign up today and start making a difference for the environment while growing your business.
        </p>
        <Link to="/register" style={{
          display: 'block', background: GREEN, color: '#fff',
          textDecoration: 'none', padding: '14px 24px',
          borderRadius: 10, fontWeight: 700, fontSize: 15, marginBottom: 10,
        }}>Create Account</Link>
        <Link to="/register" style={{ display: 'block', color: '#888', textDecoration: 'none', fontSize: 13 }}>Partner Inquiry</Link>
      </section>

      {/* ── Footer ── */}
      <footer style={{ background: '#111', padding: '28px 18px', textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 10 }}>
          <span style={{ color: GREEN, fontSize: 18 }}>♻</span>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>WasteManagement</span>
        </div>
        <p style={{ color: '#666', fontSize: 12, lineHeight: 1.6, margin: '0 0 14px' }}>
          Advancing the circular economy through intelligent waste logistics and fair market access.
        </p>
        <p style={{ color: '#555', fontSize: 12, margin: '0 0 12px' }}>© 2026 WasteManagement Platform · Nairobi, Kenya</p>
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
          {['Privacy Policy', 'Terms of Service', 'Contact Support'].map(t => (
            <span key={t} style={{ color: '#555', fontSize: 12, cursor: 'pointer' }}>{t}</span>
          ))}
        </div>
      </footer>

    </div>
  );
}