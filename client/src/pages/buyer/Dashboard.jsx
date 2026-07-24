import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  getMyOffers, createOffer, updateOffer, deleteOffer,
  getMatches, getMyTransactions, confirmMatch, initiatePayment, confirmReceipt,
} from '../../api/buyer';
import { useAuthStore } from '../../store/authStore';
import MapPicker from '../../components/MapPicker';
import NotificationBell from '../../components/NotificationBell';
import DisputeModal from '../../components/DisputeModal';
import { ConfirmDialog, useToast } from '../../components/shared';

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

const NAV_ICONS = {
  offers: '📋',
  matches: '🔍',
  transactions: '🧾',
};

const css = `
  *, *::before, *::after { box-sizing: border-box; }

  .bd-root {
    min-height: 100vh;
    background: ${C.bg};
    font-family: Inter, system-ui, -apple-system, sans-serif;
    color: ${C.text};
    display: flex;
  }

  /* ── Sidebar ── */
  .bd-sidebar {
    width: 240px;
    flex-shrink: 0;
    background: ${C.primary};
    display: flex;
    flex-direction: column;
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    z-index: 200;
    box-shadow: 2px 0 8px rgba(0,0,0,0.12);
  }

  .bd-sidebar-logo {
    padding: 24px 20px 20px;
    border-bottom: 1px solid rgba(255,255,255,0.12);
  }
  .bd-sidebar-logo-mark {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 15px;
    font-weight: 700;
    color: #fff;
  }
  .bd-sidebar-logo-icon {
    width: 34px;
    height: 34px;
    background: rgba(255,255,255,0.2);
    border-radius: 9px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
    flex-shrink: 0;
  }
  .bd-sidebar-logo-sub {
    margin: 5px 0 0;
    font-size: 11px;
    color: rgba(255,255,255,0.5);
    font-weight: 500;
    letter-spacing: 0.3px;
  }

  .bd-sidebar-nav {
    flex: 1;
    padding: 16px 12px;
    display: flex;
    flex-direction: column;
    gap: 2px;
    overflow-y: auto;
  }

  .bd-nav-item {
    display: flex;
    align-items: center;
    gap: 11px;
    padding: 11px 14px;
    border-radius: 10px;
    border: none;
    background: transparent;
    color: rgba(255,255,255,0.65);
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    text-align: left;
    width: 100%;
    transition: background 0.15s, color 0.15s;
    font-family: inherit;
  }
  .bd-nav-item:hover {
    background: rgba(255,255,255,0.1);
    color: #fff;
  }
  .bd-nav-item.active {
    background: rgba(255,255,255,0.18);
    color: #fff;
  }
  .bd-nav-icon {
    font-size: 16px;
    flex-shrink: 0;
    width: 20px;
    text-align: center;
  }
  .bd-nav-badge {
    margin-left: auto;
    background: rgba(255,255,255,0.2);
    border-radius: 10px;
    padding: 1px 8px;
    font-size: 11px;
    font-weight: 700;
    color: #fff;
  }

  .bd-sidebar-footer {
    padding: 12px;
    border-top: 1px solid rgba(255,255,255,0.12);
  }
  .bd-sidebar-user {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 14px 8px;
  }
  .bd-sidebar-avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: rgba(255,255,255,0.22);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
    font-weight: 700;
    color: #fff;
    flex-shrink: 0;
  }
  .bd-sidebar-username {
    font-size: 13px;
    font-weight: 600;
    color: rgba(255,255,255,0.85);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .bd-nav-logout {
    color: rgba(255,255,255,0.6);
  }
  .bd-nav-logout:hover {
    background: rgba(255,255,255,0.08);
    color: #fff;
  }

  /* ── Main content area ── */
  .bd-content {
    margin-left: 240px;
    flex: 1;
    min-width: 0;
  }

  /* ── Mobile header (hidden on desktop) ── */
  .bd-mobile-top {
    display: none;
  }
  .bd-mobile-header {
    background: ${C.primary};
    padding: 14px 16px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    box-shadow: 0 2px 8px rgba(0,0,0,0.12);
    position: sticky;
    top: 0;
    z-index: 100;
  }
  .bd-logo {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 15px;
    font-weight: 700;
    color: #fff;
  }
  .bd-logo-icon {
    width: 30px;
    height: 30px;
    background: rgba(255,255,255,0.2);
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
  }
  .bd-btn-logout {
    padding: 6px 14px;
    border-radius: 8px;
    border: 1px solid rgba(255,255,255,0.35);
    background: transparent;
    color: rgba(255,255,255,0.85);
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    font-family: inherit;
    transition: background 0.15s;
  }
  .bd-btn-logout:hover { background: rgba(255,255,255,0.12); }

  .bd-mobile-tabs {
    display: flex;
    gap: 8px;
    padding: 12px 16px;
    background: ${C.white};
    border-bottom: 1px solid ${C.border};
  }
  .bd-mobile-tab {
    flex: 1;
    padding: 9px 0;
    border-radius: 8px;
    border: none;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    background: ${C.bg};
    color: ${C.muted};
    font-family: inherit;
    transition: background 0.15s, color 0.15s;
  }
  .bd-mobile-tab.active { background: ${C.primary}; color: #fff; }

  /* ── Main content ── */
  .bd-main {
    max-width: 1100px;
    margin: 0 auto;
    padding: 32px 28px 56px;
  }

  /* ── Page title ── */
  .bd-page-title {
    margin-bottom: 24px;
  }
  .bd-page-title h1 {
    margin: 0 0 4px;
    font-size: 24px;
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
    font-family: inherit;
    transition: background 0.15s;
  }
  .bd-btn-primary:hover { background: ${C.primaryDark}; }

  /* ── Layout: form panel + cards grid ── */
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
    font-family: inherit;
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
    font-family: inherit;
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
    font-family: inherit;
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
    font-family: inherit;
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
  .pill-active    { background: #E7F4EC; color: #1F6F4A; }
  .pill-inactive  { background: #F0F0F0; color: #6B7280; }
  .pill-pending   { background: #FFF4E5; color: #E8A33D; }
  .pill-completed { background: #E7F4EC; color: #1F6F4A; }
  .pill-failed    { background: #FDECEA; color: #B3261E; }

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

  /* ── Raise dispute button (transactions) ── */
  .bd-dispute-btn {
    width: 100%;
    margin-top: 10px;
    padding: 9px 0;
    border-radius: 8px;
    border: 1px solid ${C.accent};
    background: transparent;
    color: #B07818;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
    font-family: inherit;
    transition: background 0.15s;
  }
  .bd-dispute-btn:hover { background: #FBF3E4; }
  .bd-disputed-note {
    margin: 12px 0 0;
    font-size: 13px;
    color: ${C.danger};
    font-weight: 600;
    text-align: center;
  }

  /* ════════════════════════════════
     Responsive breakpoints
  ════════════════════════════════ */

  @media (min-width: 640px) {
    .bd-grid { grid-template-columns: repeat(2, 1fr); }
  }

  @media (min-width: 1024px) {
    .bd-layout.has-form {
      display: grid;
      grid-template-columns: 340px 1fr;
      gap: 24px;
      align-items: start;
    }
    .bd-layout.has-form .bd-form-panel { margin-bottom: 0; }
    .bd-grid { grid-template-columns: repeat(2, 1fr); }
  }

  @media (min-width: 1280px) {
    .bd-grid { grid-template-columns: repeat(3, 1fr); }
  }

  /* Mobile: hide sidebar, show top header + tabs */
  @media (max-width: 767px) {
    .bd-sidebar  { display: none; }
    .bd-content  { margin-left: 0; }
    .bd-mobile-top { display: block; }
    .bd-main { padding: 16px 16px 48px; }
    .bd-stats { gap: 10px; }
    .bd-stat  { padding: 14px 12px; }
    .bd-stat-value { font-size: 22px; }
    .bd-page-title { display: none; }
    .bd-form-row { grid-template-columns: 1fr; }
  }

  @media (max-width: 400px) {
    .bd-stats { grid-template-columns: 1fr; }
  }
`;

// "2 mins ago"-style label from a timestamp; falls back to a date past 7 days
function timeAgo(dateStr) {
  if (!dateStr) return '';
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins} min${mins === 1 ? '' : 's'} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;
  return new Date(dateStr).toLocaleDateString('en-KE', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

export default function BuyerDashboard() {
  const { t } = useTranslation();
  const [tab, setTab] = useState('offers');
  const [offers, setOffers] = useState([]);
  const [matches, setMatches] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [disputing, setDisputing] = useState(null); // transaction being disputed
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
  const logout = useAuthStore(s => s.logout);
  const navigate = useNavigate();

  function handleLogout() {
    navigate('/', { replace: true });
    logout();
  }
  const [payState, setPayState] = useState({ txId: null, phone: '', loading: false, sent: false });
  const [receiptState, setReceiptState] = useState({ txId: null, loading: false, error: '' });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deletingOffer, setDeletingOffer] = useState(false);
  const { show } = useToast();

  useEffect(() => {
    Promise.all([getMyOffers(), getMatches(), getMyTransactions()])
      .then(([offersRes, matchesRes, txRes]) => {
        setOffers(offersRes.data.offers);
        setMatches(matchesRes.data.matches);
        setTransactions(txRes.data.transactions);
      })
      .catch(err => setError(err.response?.data?.error || t('buyerDashboard.loadFailed')))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      setError(err.response?.data?.error || t('buyerDashboard.createOfferFailed'));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleStatus(offer) {
    const newStatus = offer.status === 'active' ? 'inactive' : 'active';
    try {
      const res = await updateOffer(offer.offer_id, { status: newStatus });
      setOffers(offers.map(o => o.offer_id === offer.offer_id ? res.data.offer : o));
      if (res.data.warning) show(res.data.warning, { tone: 'warning' });
    } catch (err) {
      setError(err.response?.data?.error || t('buyerDashboard.updateOfferFailed'));
    }
  }

  async function handleDeleteOffer() {
    if (!deleteTarget) return;
    setDeletingOffer(true);
    try {
      await deleteOffer(deleteTarget.offer_id);
      setOffers(offers.filter(o => o.offer_id !== deleteTarget.offer_id));
      setDeleteTarget(null);
      show(t('toast.offerDeleted'), { tone: 'success' });
    } catch (err) {
      show(err.response?.data?.error || t('toast.offerDeleteFailed'), { tone: 'error' });
    } finally {
      setDeletingOffer(false);
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
      setError(err.response?.data?.error || t('buyerDashboard.confirmMatchFailed'));
    }
  }

  async function handlePayment(transactionId) {
    setPayState(s => ({ ...s, loading: true }));
    setError('');
    try {
      await initiatePayment(transactionId, payState.phone);
      setPayState(s => ({ ...s, loading: false, sent: true }));
    } catch (err) {
      setError(err.response?.data?.error || t('buyerDashboard.paymentFailed'));
      setPayState(s => ({ ...s, loading: false }));
    }
  }

  async function handleConfirmReceipt(transactionId) {
    setReceiptState({ txId: transactionId, loading: true, error: '' });
    try {
      await confirmReceipt(transactionId);
      const txRes = await getMyTransactions();
      setTransactions(txRes.data.transactions);
      setReceiptState({ txId: null, loading: false, error: '' });
    } catch (err) {
      setReceiptState({
        txId: transactionId,
        loading: false,
        error: err.response?.data?.error || t('buyerDashboard.confirmReceiptFailed'),
      });
    }
  }

  const handleDisputed = (updated) => {
    setTransactions(prev => prev.map(tx =>
      tx.log_id === updated.log_id ? { ...tx, log_status: updated.status } : tx
    ));
    setDisputing(null);
  };

  const NAV_TABS = [
    { key: 'offers',       label: t('buyerDashboard.navOffers'),       count: offers.length },
    { key: 'matches',      label: t('buyerDashboard.navMatches'),      count: matches.length },
    { key: 'transactions', label: t('buyerDashboard.navTransactions'), count: transactions.length },
  ];

  return (
    <>
      <style>{css}</style>
      <div className="bd-root">

        {/* ── Left sidebar (desktop) ── */}
        <aside className="bd-sidebar">
          <div className="bd-sidebar-logo">
            <div className="bd-sidebar-logo-mark">
              <div className="bd-sidebar-logo-icon">♻</div>
              WasteManagement
            </div>
            <p className="bd-sidebar-logo-sub">{t('buyerDashboard.portalLabel')}</p>
          </div>

          <nav className="bd-sidebar-nav">
            {NAV_TABS.map(item => (
              <button
                key={item.key}
                className={`bd-nav-item${tab === item.key ? ' active' : ''}`}
                onClick={() => setTab(item.key)}
              >
                <span className="bd-nav-icon">{NAV_ICONS[item.key]}</span>
                {item.label}
                {item.count > 0 && <span className="bd-nav-badge">{item.count}</span>}
              </button>
            ))}
          </nav>

          <div className="bd-sidebar-footer">
            <div className="bd-sidebar-user">
              <div className="bd-sidebar-avatar">
                {user?.name?.charAt(0).toUpperCase() || 'B'}
              </div>
              <span className="bd-sidebar-username">{user?.name}</span>
            </div>
            <NotificationBell />
            <button className="bd-nav-item bd-nav-logout" onClick={handleLogout}>
              <span className="bd-nav-icon">🚪</span>
              {t('common.logout')}
            </button>
          </div>
        </aside>

        {/* ── Mobile top bar + tabs (hidden on desktop) ── */}
        <div className="bd-mobile-top">
          <div className="bd-mobile-header">
            <div className="bd-logo">
              <div className="bd-logo-icon">♻</div>
              {t('buyerDashboard.mobileTitle')}
            </div>
            <button className="bd-btn-logout" onClick={handleLogout}>{t('common.logout')}</button>
          </div>
          <div className="bd-mobile-tabs">
            {NAV_TABS.map(item => (
              <button
                key={item.key}
                className={`bd-mobile-tab${tab === item.key ? ' active' : ''}`}
                onClick={() => setTab(item.key)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Main content ── */}
        <div className="bd-content">
          <main className="bd-main">
            <div className="bd-page-title">
              <h1>{t('buyerDashboard.pageTitle')}</h1>
              <p>{t('buyerDashboard.pageSubtitle')}</p>
            </div>

            {/* Stats */}
            <div className="bd-stats">
              <div className="bd-stat">
                <div className="bd-stat-value">{offers.length}</div>
                <div className="bd-stat-label">{t('buyerDashboard.statActiveOffers')}</div>
              </div>
              <div className="bd-stat">
                <div className="bd-stat-value">{matches.length}</div>
                <div className="bd-stat-label">{t('buyerDashboard.statPendingMatches')}</div>
              </div>
              <div className="bd-stat">
                <div className="bd-stat-value">{transactions.length}</div>
                <div className="bd-stat-label">{t('buyerDashboard.statTransactions')}</div>
              </div>
            </div>

            {error && <div className="bd-error">{error}</div>}

            {loading ? (
              <div style={{ textAlign: 'center', color: C.muted, padding: '60px 0', fontSize: 14 }}>
                {t('buyerDashboard.loading')}
              </div>
            ) : (
              <>
                {/* ══ OFFERS TAB ══ */}
                {tab === 'offers' && (
                  <>
                    <div className="bd-toolbar">
                      <h2>{t('buyerDashboard.myOffersTitle')}</h2>
                      <button className="bd-btn-primary" onClick={() => setShowForm(s => !s)}>
                        {showForm ? t('buyerDashboard.cancelForm') : t('buyerDashboard.postNewOffer')}
                      </button>
                    </div>

                    <div className={`bd-layout${showForm ? ' has-form' : ''}`}>
                      {showForm && (
                        <div className="bd-form-panel">
                          <h3>{t('buyerDashboard.newOfferTitle')}</h3>
                          <form onSubmit={handleCreateOffer}>
                            <label className="bd-label">{t('buyerDashboard.wasteTypeLabel')}</label>
                            <select
                              className="bd-input"
                              value={form.category}
                              onChange={e => setForm({ ...form, category: e.target.value })}
                            >
                              {WASTE_TYPES.map(w => <option key={w} value={w}>{t(`categories.${w}`)}</option>)}
                            </select>

                            <div className="bd-form-row">
                              <div>
                                <label className="bd-label">{t('buyerDashboard.pricePerKgLabel')}</label>
                                <input
                                  className="bd-input" type="number" min="0" step="0.01" required
                                  placeholder={t('buyerDashboard.pricePerKgPlaceholder')}
                                  value={form.price_per_kg}
                                  onChange={e => setForm({ ...form, price_per_kg: e.target.value })}
                                />
                              </div>
                              <div>
                                <label className="bd-label">{t('buyerDashboard.minQuantityLabel')}</label>
                                <input
                                  className="bd-input" type="number" min="0" step="0.1"
                                  placeholder={t('buyerDashboard.minQuantityPlaceholder')}
                                  value={form.min_quantity_kg}
                                  onChange={e => setForm({ ...form, min_quantity_kg: e.target.value })}
                                />
                              </div>
                            </div>

                            <label className="bd-label">{t('buyerDashboard.zoneLabel')}</label>
                            <input
                              className="bd-input" type="text" required
                              placeholder={t('buyerDashboard.zonePlaceholder')}
                              value={form.zone}
                              onChange={e => setForm({ ...form, zone: e.target.value })}
                            />

                            <label className="bd-label">{t('buyerDashboard.pickupLocationLabel')}</label>
                            <MapPicker
                              onSelect={({ lat, lng }) => setForm({ ...form, latitude: lat, longitude: lng })}
                              defaultToGPS
                            />

                            <div className="bd-form-actions">
                              <button type="button" className="bd-btn-cancel" onClick={() => setShowForm(false)}>
                                {t('common.cancel')}
                              </button>
                              <button type="submit" className="bd-btn-submit" disabled={submitting}>
                                {submitting ? t('buyerDashboard.postingOffer') : t('buyerDashboard.postOfferButton')}
                              </button>
                            </div>
                          </form>
                        </div>
                      )}

                      <div className="bd-grid">
                        {offers.length === 0 ? (
                          <EmptyState icon="📋" text={t('buyerDashboard.noOffersYet')} sub={t('buyerDashboard.noOffersSub')} />
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
                                  {offer.status === 'active' ? t('buyerDashboard.deactivate') : t('buyerDashboard.activate')}
                                </button>
                                <button
                                  className="bd-btn-sm bd-btn-sm-red"
                                  onClick={() => setDeleteTarget(offer)}
                                >
                                  {t('common.delete')}
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
                      <h2>{t('buyerDashboard.wasteMatchesTitle')}</h2>
                    </div>
                    <div className="bd-grid">
                      {matches.length === 0 ? (
                        <EmptyState icon="🔍" text={t('buyerDashboard.noMatchesYet')} sub={t('buyerDashboard.noMatchesSub')} />
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
                              <span>🕒 Logged {timeAgo(m.logged_at)}</span>
                            </div>
                            <button
                              className="bd-btn-confirm"
                              onClick={() => handleConfirmMatch(m.log_id, m.offer_id)}
                            >
                              {t('buyerDashboard.confirmInterest')}
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
                      <h2>{t('buyerDashboard.transactionsTitle')}</h2>
                    </div>
                    <div className="bd-grid">
                      {transactions.length === 0 ? (
                        <EmptyState icon="🧾" text={t('buyerDashboard.noTransactionsYet')} sub={t('buyerDashboard.noTransactionsSub')} />
                      ) : (
                        transactions.map(tx => (
                          <div key={tx.transaction_id} className="bd-card">
                            <div className="bd-card-header">
                              <div>
                                <p className="bd-card-title">{tx.category} · {tx.weight_kg}kg</p>
                                <p className="bd-card-sub">{tx.collector_name}</p>
                              </div>
                              <StatusPill status={tx.status} />
                            </div>
                            <div className="bd-card-meta">
                              <span style={{ fontWeight: 700, color: C.primary, fontSize: 15 }}>
                                KES {tx.amount}
                              </span>
                              {tx.mpesa_receipt && (
                                <span style={{ color: C.primary, fontSize: 13 }}>
                                  {t('buyerDashboard.receiptLabel')}: {tx.mpesa_receipt}
                                </span>
                              )}
                            </div>

                            {tx.status === 'pending' && (
                              payState.txId === tx.transaction_id ? (
                                payState.sent ? (
                                  <p style={{ margin: '12px 0 0', fontSize: 13, color: C.primary, fontWeight: 600, textAlign: 'center' }}>
                                    {t('buyerDashboard.mpesaPromptSent')}
                                  </p>
                                ) : (
                                  <div style={{ marginTop: 12 }}>
                                    <input
                                      className="bd-input"
                                      type="tel"
                                      placeholder={t('buyerDashboard.phonePlaceholder')}
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
                                          fontFamily: 'inherit',
                                        }}
                                        disabled={payState.loading || !payState.phone}
                                        onClick={() => handlePayment(tx.transaction_id)}
                                      >
                                        {payState.loading ? t('buyerDashboard.sendingPrompt') : t('buyerDashboard.sendMpesaPrompt')}
                                      </button>
                                      <button
                                        style={{
                                          flex: 1, padding: '9px 0', borderRadius: 8,
                                          border: `1px solid ${C.border}`, background: 'transparent',
                                          color: C.muted, fontWeight: 600, fontSize: 13, cursor: 'pointer',
                                          fontFamily: 'inherit',
                                        }}
                                        onClick={() => setPayState({ txId: null, phone: '', loading: false, sent: false })}
                                      >
                                        {t('common.cancel')}
                                      </button>
                                    </div>
                                  </div>
                                )
                              ) : (
                                <button
                                  className="bd-btn-confirm"
                                  onClick={() => setPayState({
                                    txId: tx.transaction_id,
                                    phone: user?.phone_number || '',
                                    loading: false,
                                    sent: false,
                                  })}
                                >
                                  {t('buyerDashboard.payMpesa')}
                                </button>
                              )
                            )}

                            {tx.status === 'escrowed' && (
                              <>
                                <button
                                  className="bd-btn-confirm"
                                  onClick={() => handleConfirmReceipt(tx.transaction_id)}
                                  disabled={receiptState.loading && receiptState.txId === tx.transaction_id}
                                >
                                  {receiptState.loading && receiptState.txId === tx.transaction_id
                                    ? t('buyerDashboard.confirmingReceipt')
                                    : t('buyerDashboard.confirmReceiptPay')}
                                </button>
                                {receiptState.txId === tx.transaction_id && receiptState.error && (
                                  <p style={{ margin: '8px 0 0', fontSize: 12, color: C.danger, textAlign: 'center' }}>
                                    {receiptState.error}
                                  </p>
                                )}
                              </>
                            )}

                            {tx.status === 'payout_initiated' && (
                              <p style={{ margin: '12px 0 0', fontSize: 13, color: C.muted, fontWeight: 600, textAlign: 'center' }}>
                                {t('buyerDashboard.payoutInProgress')}
                              </p>
                            )}

                            {tx.status === 'payout_failed' && (
                              <p style={{ margin: '12px 0 0', fontSize: 13, color: C.danger, fontWeight: 600, textAlign: 'center' }}>
                                {t('buyerDashboard.payoutFailed')}{tx.payout_error ? `: ${tx.payout_error}` : t('buyerDashboard.payoutFailedContact')}
                              </p>
                            )}

                            {tx.status === 'released' && (
                              <p style={{ margin: '12px 0 0', fontSize: 13, color: C.primary, fontWeight: 600, textAlign: 'center' }}>
                                {t('buyerDashboard.payoutReleased')}
                              </p>
                            )}

                            {/* Disputable only once payment is in escrow (log
                                'confirmed') — an unpaid match should be
                                declined, not disputed */}
                            {tx.log_status === 'confirmed' && (
                              <button
                                className="bd-dispute-btn"
                                onClick={() => setDisputing(tx)}
                              >
                                {t('buyerDashboard.raiseDispute')}
                              </button>
                            )}
                            {tx.log_status === 'disputed' && (
                              <p className="bd-disputed-note">
                                {t('buyerDashboard.underDispute')}
                              </p>
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

      </div>

      {/* ── Raise dispute modal ── */}
      {disputing && (
        <DisputeModal
          logId={disputing.log_id}
          context={`${disputing.category} · ${disputing.weight_kg}kg from ${disputing.collector_name} — KES ${disputing.amount}`}
          onClose={() => setDisputing(null)}
          onDisputed={handleDisputed}
        />
      )}

      {/* ── Delete offer confirmation ── */}
      <ConfirmDialog
        open={!!deleteTarget}
        tone="warning"
        title={t('confirmDialog.deleteOfferTitle')}
        message={deleteTarget ? `This removes your ${deleteTarget.category} offer for ${deleteTarget.zone}.` : ''}
        confirmLabel={t('confirmDialog.deleteOfferConfirm')}
        cancelLabel={t('common.cancel')}
        confirming={deletingOffer}
        onConfirm={handleDeleteOffer}
        onCancel={() => setDeleteTarget(null)}
      />
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
    escrowed: 'pill-pending', payout_initiated: 'pill-pending', payout_failed: 'pill-failed', released: 'pill-completed',
  };
  return (
    <span className={`pill ${cls[status] || 'pill-inactive'}`}>{status}</span>
  );
}
