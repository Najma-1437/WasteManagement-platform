import { useState, useEffect } from 'react';
import {
  getMyOffers, createOffer, updateOffer, deleteOffer,
  getMatches, getMyTransactions, confirmMatch, initiatePayment,
} from '../../api/buyer';
import { useAuthStore } from '../../store/authStore';
import MapPicker from '../../components/MapPicker';

const C = {
  primary: '#1F6F4A',
  primaryDark: '#175438',
  accent: '#E8A33D',
  bg: '#F4F7F5',
  text: '#1A1A1A',
  muted: '#6B7280',
  border: '#E5E7EB',
  white: '#FFFFFF',
  danger: '#B3261E',
};

const WASTE_TYPES = ['plastic', 'paper', 'metal', 'organic', 'e-waste'];

const css = `
  *, *::before, *::after { box-sizing: border-box; }

  .bd-root {
    min-height: 100vh;
    background: ${C.bg};
    font-family: Inter, system-ui, -apple-system, sans-serif;
    color: ${C.text};
  }

  /* ── Header ── */
  .bd-header {
    background: ${C.primary};
    position: sticky;
    top: 0;
    z-index: 100;
    box-shadow: 0 2px 8px rgba(0,0,0,0.15);
  }
  .bd-header-inner {
    max-width: 1280px;
    margin: 0 auto;
    padding: 0 24px;
    height: 64px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
  }
  .bd-logo {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 18px;
    font-weight: 700;
    color: #fff;
    white-space: nowrap;
  }
  .bd-logo-icon {
    width: 36px;
    height: 36px;
    background: rgba(255,255,255,0.2);
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
  }
  .bd-header-tabs {
    display: flex;
    gap: 4px;
  }
  .bd-header-tab {
    padding: 8px 20px;
    border-radius: 8px;
    border: none;
    background: transparent;
    color: rgba(255,255,255,0.7);
    font-weight: 600;
    font-size: 14px;
    cursor: pointer;
    transition: background 0.15s, color 0.15s;
    white-space: nowrap;
  }
  .bd-header-tab:hover { background: rgba(255,255,255,0.12); color: #fff; }
  .bd-header-tab.active { background: rgba(255,255,255,0.2); color: #fff; }

  /* ── Mobile tabs (shown only on small screens) ── */
  .bd-mobile-tabs {
    display: none;
    gap: 8px;
    padding: 16px 16px 0;
  }
  .bd-mobile-tab {
    flex: 1;
    padding: 10px 0;
    border-radius: 10px;
    border: none;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    background: ${C.white};
    color: ${C.text};
    box-shadow: 0 1px 2px rgba(0,0,0,0.06);
    transition: background 0.15s, color 0.15s;
  }
  .bd-mobile-tab.active { background: ${C.primary}; color: #fff; }

  /* ── Main content ── */
  .bd-main {
    max-width: 1280px;
    margin: 0 auto;
    padding: 28px 24px 48px;
  }

  /* ── Page title (desktop only) ── */
  .bd-page-title {
    margin-bottom: 24px;
  }
  .bd-page-title h1 {
    margin: 0 0 4px;
    font-size: 26px;
    font-weight: 700;
  }
  .bd-page-title p {
    margin: 0;
    color: ${C.muted};
    font-size: 14px;
  }

  /* ── Stats row ── */
  .bd-stats {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
    margin-bottom: 28px;
  }
  .bd-stat {
    background: ${C.white};
    border-radius: 14px;
    padding: 20px 24px;
    box-shadow: 0 1px 4px rgba(0,0,0,0.06);
  }
  .bd-stat-value {
    font-size: 28px;
    font-weight: 800;
    color: ${C.primary};
    line-height: 1;
    margin-bottom: 4px;
  }
  .bd-stat-label {
    font-size: 13px;
    color: ${C.muted};
    font-weight: 500;
  }

  /* ── Toolbar ── */
  .bd-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 20px;
    gap: 12px;
    flex-wrap: wrap;
  }
  .bd-toolbar h2 {
    margin: 0;
    font-size: 17px;
    font-weight: 700;
  }
  .bd-btn-primary {
    padding: 10px 20px;
    border-radius: 10px;
    border: none;
    background: ${C.primary};
    color: #fff;
    font-weight: 600;
    font-size: 14px;
    cursor: pointer;
    white-space: nowrap;
    transition: background 0.15s;
  }
  .bd-btn-primary:hover { background: ${C.primaryDark}; }

  /* ── Layout: sidebar form + cards grid ── */
  .bd-layout {
    display: block;
  }
  .bd-form-panel {
    background: ${C.white};
    border-radius: 16px;
    padding: 24px;
    box-shadow: 0 1px 4px rgba(0,0,0,0.07);
    margin-bottom: 24px;
  }
  .bd-form-panel h3 {
    margin: 0 0 16px;
    font-size: 16px;
    font-weight: 700;
  }

  /* ── Cards grid ── */
  .bd-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 16px;
  }

  /* ── Individual card ── */
  .bd-card {
    background: ${C.white};
    border-radius: 14px;
    padding: 20px;
    box-shadow: 0 1px 4px rgba(0,0,0,0.06);
    display: flex;
    flex-direction: column;
    gap: 0;
    transition: box-shadow 0.15s;
  }
  .bd-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
  .bd-card-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 10px;
  }
  .bd-card-title {
    margin: 0;
    font-weight: 700;
    font-size: 16px;
    text-transform: capitalize;
  }
  .bd-card-sub {
    margin: 3px 0 0;
    font-size: 13px;
    color: ${C.muted};
  }
  .bd-card-meta {
    display: flex;
    gap: 16px;
    font-size: 13px;
    color: ${C.muted};
    margin-bottom: 14px;
    flex-wrap: wrap;
  }
  .bd-card-meta span { display: flex; align-items: center; gap: 4px; }
  .bd-card-actions {
    display: flex;
    gap: 8px;
    margin-top: auto;
  }
  .bd-btn-sm {
    flex: 1;
    padding: 8px 0;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    background: transparent;
    transition: background 0.15s;
  }
  .bd-btn-sm-green { border: 1px solid ${C.primary}; color: ${C.primary}; }
  .bd-btn-sm-green:hover { background: #E7F4EC; }
  .bd-btn-sm-red { border: 1px solid ${C.danger}; color: ${C.danger}; }
  .bd-btn-sm-red:hover { background: #FDECEA; }
  .bd-btn-confirm {
    width: 100%;
    padding: 10px 0;
    border-radius: 8px;
    border: none;
    background: ${C.primary};
    color: #fff;
    font-weight: 700;
    font-size: 13px;
    cursor: pointer;
    margin-top: 12px;
    transition: background 0.15s;
  }
  .bd-btn-confirm:hover { background: ${C.primaryDark}; }

  /* ── Form inputs ── */
  .bd-label {
    display: block;
    font-size: 12px;
    font-weight: 600;
    color: ${C.text};
    margin: 12px 0 4px;
  }
  .bd-input {
    width: 100%;
    padding: 10px 12px;
    border-radius: 8px;
    border: 1px solid ${C.border};
    font-size: 14px;
    font-family: inherit;
    background: #FAFAFA;
    outline: none;
    transition: border-color 0.15s;
  }
  .bd-input:focus { border-color: ${C.primary}; background: #fff; }
  .bd-form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .bd-form-actions { display: flex; gap: 10px; margin-top: 18px; }
  .bd-btn-cancel {
    flex: 1;
    padding: 11px 0;
    border-radius: 10px;
    border: 1px solid ${C.border};
    background: transparent;
    color: ${C.muted};
    font-weight: 600;
    font-size: 14px;
    cursor: pointer;
  }
  .bd-btn-submit {
    flex: 2;
    padding: 11px 0;
    border-radius: 10px;
    border: none;
    background: ${C.primary};
    color: #fff;
    font-weight: 700;
    font-size: 14px;
    cursor: pointer;
    transition: background 0.15s;
  }
  .bd-btn-submit:hover:not(:disabled) { background: ${C.primaryDark}; }
  .bd-btn-submit:disabled { opacity: 0.6; cursor: not-allowed; }

  /* ── Error banner ── */
  .bd-error {
    background: #FDECEA;
    color: ${C.danger};
    border-radius: 10px;
    padding: 12px 16px;
    font-size: 13px;
    margin-bottom: 20px;
  }

  /* ── Empty state ── */
  .bd-empty {
    text-align: center;
    color: ${C.muted};
    font-size: 14px;
    padding: 60px 20px;
    grid-column: 1 / -1;
  }
  .bd-empty-icon { font-size: 40px; margin-bottom: 12px; }

  /* ── Status pill ── */
  .pill {
    display: inline-flex;
    align-items: center;
    font-size: 11px;
    font-weight: 700;
    padding: 3px 10px;
    border-radius: 20px;
    text-transform: capitalize;
    white-space: nowrap;
  }
  .pill-active   { background: #E7F4EC; color: #1F6F4A; }
  .pill-inactive { background: #F0F0F0; color: #6B7280; }
  .pill-pending  { background: #FFF4E5; color: #E8A33D; }
  .pill-completed{ background: #E7F4EC; color: #1F6F4A; }
  .pill-failed   { background: #FDECEA; color: #B3261E; }

  /* ── Distance badge ── */
  .bd-distance {
    font-size: 12px;
    font-weight: 600;
    color: ${C.accent};
    background: #FFF8EC;
    padding: 3px 10px;
    border-radius: 20px;
    white-space: nowrap;
  }

  /* ════════════════════════════════
     Responsive breakpoints
  ════════════════════════════════ */

  /* Tablet: 2-col grid, sidebar form */
  @media (min-width: 640px) {
    .bd-grid { grid-template-columns: repeat(2, 1fr); }
  }

  /* Desktop: 3-col grid, form as sidebar */
  @media (min-width: 1024px) {
    .bd-mobile-tabs { display: none !important; }
    .bd-layout.has-form {
      display: grid;
      grid-template-columns: 360px 1fr;
      gap: 24px;
      align-items: start;
    }
    .bd-layout.has-form .bd-form-panel { margin-bottom: 0; }
    .bd-grid { grid-template-columns: repeat(2, 1fr); }
  }

  @media (min-width: 1280px) {
    .bd-grid { grid-template-columns: repeat(3, 1fr); }
  }

  /* Mobile: hide header tabs, show mobile tabs */
  @media (max-width: 767px) {
    .bd-header-tabs { display: none; }
    .bd-mobile-tabs { display: flex; }
    .bd-main { padding: 16px 16px 48px; }
    .bd-stats { grid-template-columns: repeat(3, 1fr); gap: 10px; }
    .bd-stat { padding: 14px 12px; }
    .bd-stat-value { font-size: 22px; }
    .bd-page-title { display: none; }
    .bd-form-row { grid-template-columns: 1fr; }
  }

  @media (max-width: 400px) {
    .bd-stats { grid-template-columns: 1fr; }
  }
`;

export default function BuyerDashboard() {
  const [tab, setTab] = useState('offers');
  const [offers, setOffers] = useState([]);
  const [matches, setMatches] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    category: 'plastic',
    price_per_kg: '',
    min_quantity_kg: '',
    zone: '',
    latitude: null,
    longitude: null,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const user = useAuthStore(s => s.user);
  const [payState, setPayState] = useState({ txId: null, phone: '', loading: false, sent: false });

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [offersRes, matchesRes, txRes] = await Promise.all([
        getMyOffers(), getMatches(), getMyTransactions(),
      ]);
      setOffers(offersRes.data.offers);
      setMatches(matchesRes.data.matches);
      setTransactions(txRes.data.transactions);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateOffer(e) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const res = await createOffer({
        ...form,
        price_per_kg: parseFloat(form.price_per_kg),
        min_quantity_kg: form.min_quantity_kg ? parseFloat(form.min_quantity_kg) : 0,
      });
      setOffers([res.data.offer, ...offers]);
      setShowForm(false);
      setForm({ category: 'plastic', price_per_kg: '', min_quantity_kg: '', zone: '', latitude: null, longitude: null });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create offer');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleStatus(offer) {
    const newStatus = offer.status === 'active' ? 'inactive' : 'active';
    try {
      const res = await updateOffer(offer.offer_id, { status: newStatus });
      setOffers(offers.map(o => o.offer_id === offer.offer_id ? res.data.offer : o));
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update offer');
    }
  }

  async function handleDeleteOffer(offerId) {
    if (!window.confirm('Delete this offer?')) return;
    try {
      await deleteOffer(offerId);
      setOffers(offers.filter(o => o.offer_id !== offerId));
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete offer');
    }
  }

  async function handleConfirmMatch(logId, offerId) {
    try {
      await confirmMatch(logId, offerId);
      setMatches(matches.filter(m => m.log_id !== logId));
      const txRes = await getMyTransactions();
      setTransactions(txRes.data.transactions);
      setTab('transactions');
    } catch (err) {
      setError(err.response?.data?.error || 'Could not confirm match — it may already be taken');
    }
  }

  async function handlePayment(transactionId) {
    setPayState(s => ({ ...s, loading: true }));
    setError('');
    try {
      await initiatePayment(transactionId, payState.phone);
      setPayState(s => ({ ...s, loading: false, sent: true }));
    } catch (err) {
      setError(err.response?.data?.error || 'M-Pesa payment failed. Check your number and try again.');
      setPayState(s => ({ ...s, loading: false }));
    }
  }

  const NAV_TABS = [
    { key: 'offers', label: 'My Offers', count: offers.length },
    { key: 'matches', label: 'Matches', count: matches.length },
    { key: 'transactions', label: 'Transactions', count: transactions.length },
  ];

  return (
    <>
      <style>{css}</style>
      <div className="bd-root">

        {/* ── Sticky header ── */}
        <header className="bd-header">
          <div className="bd-header-inner">
            <div className="bd-logo">
              <div className="bd-logo-icon">♻</div>
              Buyer Dashboard
            </div>
            <nav className="bd-header-tabs">
              {NAV_TABS.map(t => (
                <button
                  key={t.key}
                  className={`bd-header-tab${tab === t.key ? ' active' : ''}`}
                  onClick={() => setTab(t.key)}
                >
                  {t.label}
                  {t.count > 0 && (
                    <span style={{
                      marginLeft: 6, background: 'rgba(255,255,255,0.25)',
                      borderRadius: 10, padding: '1px 7px', fontSize: 11,
                    }}>
                      {t.count}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>
        </header>

        {/* ── Mobile tabs ── */}
        <div className="bd-mobile-tabs">
          {NAV_TABS.map(t => (
            <button
              key={t.key}
              className={`bd-mobile-tab${tab === t.key ? ' active' : ''}`}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Main ── */}
        <main className="bd-main">
          <div className="bd-page-title">
            <h1>Buyer Dashboard</h1>
            <p>Manage your offers, view waste matches, and track transactions</p>
          </div>

          {/* Stats */}
          <div className="bd-stats">
            <div className="bd-stat">
              <div className="bd-stat-value">{offers.length}</div>
              <div className="bd-stat-label">Active Offers</div>
            </div>
            <div className="bd-stat">
              <div className="bd-stat-value">{matches.length}</div>
              <div className="bd-stat-label">Pending Matches</div>
            </div>
            <div className="bd-stat">
              <div className="bd-stat-value">{transactions.length}</div>
              <div className="bd-stat-label">Transactions</div>
            </div>
          </div>

          {error && <div className="bd-error">{error}</div>}

          {loading ? (
            <div style={{ textAlign: 'center', color: C.muted, padding: '60px 0', fontSize: 14 }}>
              Loading…
            </div>
          ) : (
            <>
              {/* ══ OFFERS TAB ══ */}
              {tab === 'offers' && (
                <>
                  <div className="bd-toolbar">
                    <h2>My Offers</h2>
                    <button className="bd-btn-primary" onClick={() => setShowForm(s => !s)}>
                      {showForm ? '✕ Cancel' : '+ Post New Offer'}
                    </button>
                  </div>

                  <div className={`bd-layout${showForm ? ' has-form' : ''}`}>
                    {showForm && (
                      <div className="bd-form-panel">
                        <h3>New Offer</h3>
                        <form onSubmit={handleCreateOffer}>
                          <label className="bd-label">Waste type</label>
                          <select
                            className="bd-input"
                            value={form.category}
                            onChange={e => setForm({ ...form, category: e.target.value })}
                          >
                            {WASTE_TYPES.map(w => <option key={w} value={w}>{w}</option>)}
                          </select>

                          <div className="bd-form-row">
                            <div>
                              <label className="bd-label">Price per kg (KES)</label>
                              <input
                                className="bd-input" type="number" min="0" step="0.01" required
                                placeholder="e.g. 25"
                                value={form.price_per_kg}
                                onChange={e => setForm({ ...form, price_per_kg: e.target.value })}
                              />
                            </div>
                            <div>
                              <label className="bd-label">Min quantity (kg)</label>
                              <input
                                className="bd-input" type="number" min="0" step="0.1"
                                placeholder="Optional"
                                value={form.min_quantity_kg}
                                onChange={e => setForm({ ...form, min_quantity_kg: e.target.value })}
                              />
                            </div>
                          </div>

                          <label className="bd-label">Zone / area</label>
                          <input
                            className="bd-input" type="text" required
                            placeholder="e.g. Kibera, Nairobi"
                            value={form.zone}
                            onChange={e => setForm({ ...form, zone: e.target.value })}
                          />

                          <label className="bd-label">Pickup location (optional)</label>
                          <MapPicker
                            onSelect={({ lat, lng }) => setForm({ ...form, latitude: lat, longitude: lng })}
                            defaultToGPS
                          />

                          <div className="bd-form-actions">
                            <button type="button" className="bd-btn-cancel" onClick={() => setShowForm(false)}>
                              Cancel
                            </button>
                            <button type="submit" className="bd-btn-submit" disabled={submitting}>
                              {submitting ? 'Posting…' : 'Post Offer'}
                            </button>
                          </div>
                        </form>
                      </div>
                    )}

                    <div className="bd-grid">
                      {offers.length === 0 ? (
                        <EmptyState icon="📋" text="No offers posted yet." sub="Click 'Post New Offer' to get started." />
                      ) : (
                        offers.map(offer => (
                          <div key={offer.offer_id} className="bd-card">
                            <div className="bd-card-header">
                              <div>
                                <p className="bd-card-title">{offer.category}</p>
                                <p className="bd-card-sub">{offer.zone}</p>
                              </div>
                              <StatusPill status={offer.status} />
                            </div>
                            <div className="bd-card-meta">
                              <span>💰 KES {offer.price_per_kg}/kg</span>
                              <span>⚖ Min {offer.min_quantity_kg}kg</span>
                            </div>
                            <div className="bd-card-actions">
                              <button
                                className="bd-btn-sm bd-btn-sm-green"
                                onClick={() => handleToggleStatus(offer)}
                              >
                                {offer.status === 'active' ? 'Deactivate' : 'Activate'}
                              </button>
                              <button
                                className="bd-btn-sm bd-btn-sm-red"
                                onClick={() => handleDeleteOffer(offer.offer_id)}
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* ══ MATCHES TAB ══ */}
              {tab === 'matches' && (
                <>
                  <div className="bd-toolbar">
                    <h2>Waste Matches</h2>
                  </div>
                  <div className="bd-grid">
                    {matches.length === 0 ? (
                      <EmptyState icon="🔍" text="No matching waste logs right now." sub="Matches appear when a collector's log aligns with your offers." />
                    ) : (
                      matches.map(m => (
                        <div key={m.log_id} className="bd-card">
                          <div className="bd-card-header">
                            <div>
                              <p className="bd-card-title">{m.category} · {m.weight_kg}kg</p>
                              <p className="bd-card-sub">{m.collector_name}</p>
                            </div>
                            {m.distance_km != null && (
                              <span className="bd-distance">{m.distance_km} km</span>
                            )}
                          </div>
                          <div className="bd-card-meta">
                            <span>📞 {m.collector_phone}</span>
                            <span>💰 KES {m.price_per_kg}/kg</span>
                          </div>
                          <button
                            className="bd-btn-confirm"
                            onClick={() => handleConfirmMatch(m.log_id, m.offer_id)}
                          >
                            Confirm Interest
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </>
              )}

              {/* ══ TRANSACTIONS TAB ══ */}
              {tab === 'transactions' && (
                <>
                  <div className="bd-toolbar">
                    <h2>Transactions</h2>
                  </div>
                  <div className="bd-grid">
                    {transactions.length === 0 ? (
                      <EmptyState icon="🧾" text="No transactions yet." sub="Confirmed matches will appear here once processed." />
                    ) : (
                      transactions.map(t => (
                        <div key={t.transaction_id} className="bd-card">
                          <div className="bd-card-header">
                            <div>
                              <p className="bd-card-title">{t.category} · {t.weight_kg}kg</p>
                              <p className="bd-card-sub">{t.collector_name}</p>
                            </div>
                            <StatusPill status={t.status} />
                          </div>
                          <div className="bd-card-meta">
                            <span style={{ fontWeight: 700, color: C.primary, fontSize: 15 }}>
                              KES {t.amount}
                            </span>
                            {t.mpesa_receipt && (
                              <span style={{ color: C.primary, fontSize: 13 }}>
                                Receipt: {t.mpesa_receipt}
                              </span>
                            )}
                          </div>

                          {t.status === 'pending' && (
                            payState.txId === t.transaction_id ? (
                              payState.sent ? (
                                <p style={{ margin: '12px 0 0', fontSize: 13, color: C.primary, fontWeight: 600, textAlign: 'center' }}>
                                  M-Pesa prompt sent! Check your phone and enter your PIN.
                                </p>
                              ) : (
                                <div style={{ marginTop: 12 }}>
                                  <input
                                    className="bd-input"
                                    type="tel"
                                    placeholder="Phone e.g. 0712345678"
                                    value={payState.phone}
                                    onChange={e => setPayState(s => ({ ...s, phone: e.target.value }))}
                                    style={{ marginBottom: 8 }}
                                  />
                                  <div style={{ display: 'flex', gap: 8 }}>
                                    <button
                                      style={{
                                        flex: 1, padding: '9px 0', borderRadius: 8, border: 'none',
                                        background: C.primary, color: '#fff', fontWeight: 700,
                                        fontSize: 13, cursor: payState.loading ? 'not-allowed' : 'pointer',
                                        opacity: payState.loading || !payState.phone ? 0.6 : 1,
                                      }}
                                      disabled={payState.loading || !payState.phone}
                                      onClick={() => handlePayment(t.transaction_id)}
                                    >
                                      {payState.loading ? 'Sending…' : 'Send M-Pesa Prompt'}
                                    </button>
                                    <button
                                      style={{
                                        flex: 1, padding: '9px 0', borderRadius: 8,
                                        border: `1px solid ${C.border}`, background: 'transparent',
                                        color: C.muted, fontWeight: 600, fontSize: 13, cursor: 'pointer',
                                      }}
                                      onClick={() => setPayState({ txId: null, phone: '', loading: false, sent: false })}
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              )
                            ) : (
                              <button
                                className="bd-btn-confirm"
                                onClick={() => setPayState({
                                  txId: t.transaction_id,
                                  phone: user?.phone_number || '',
                                  loading: false,
                                  sent: false,
                                })}
                              >
                                Pay via M-Pesa
                              </button>
                            )
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </>
              )}
            </>
          )}
        </main>
      </div>
    </>
  );
}

function EmptyState({ icon, text, sub }) {
  return (
    <div className="bd-empty">
      <div className="bd-empty-icon">{icon}</div>
      <p style={{ margin: '0 0 6px', fontWeight: 600 }}>{text}</p>
      {sub && <p style={{ margin: 0, fontSize: 13 }}>{sub}</p>}
    </div>
  );
}

function StatusPill({ status }) {
  const cls = {
    active: 'pill-active', inactive: 'pill-inactive',
    pending: 'pill-pending', completed: 'pill-completed', failed: 'pill-failed',
  };
  return (
    <span className={`pill ${cls[status] || 'pill-inactive'}`}>{status}</span>
  );
}
