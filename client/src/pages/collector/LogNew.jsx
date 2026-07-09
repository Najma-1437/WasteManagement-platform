import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import api from '../../api/axiosClient';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import NotificationBell from '../../components/NotificationBell';
import { queueLog }        from '../../utils/offlineQueue';
import { syncQueuedLogs }  from '../../utils/syncQueuedLogs';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;
const NAIROBI = [36.8219, -1.2921]; // [lng, lat]

const C = {
  primary:     '#1e6b3c',
  primaryDark: '#155230',
  bg:          '#F4F7F5',
  text:        '#1A1A1A',
  muted:       '#6B7280',
  border:      '#E5E7EB',
  white:       '#FFFFFF',
  danger:      '#B3261E',
};

// Reordered to match wireframe: Organic, Plastic, Metal, E-waste
const CATEGORIES = [
  { key: 'organic',  label: 'Organic',  icon: '🌿' },
  { key: 'plastic',  label: 'Plastic',  icon: '♻'  },
  { key: 'metal',    label: 'Metal',    icon: '⚙️' },
  { key: 'e-waste',  label: 'E-waste',  icon: '💻' },
];

const css = `
  *, *::before, *::after { box-sizing: border-box; }

  .cd-root {
    min-height: 100vh;
    background: ${C.bg};
    font-family: Inter, system-ui, -apple-system, sans-serif;
    color: ${C.text};
    display: flex;
  }

  /* ── Sidebar (same pattern as Dashboard) ── */
  .cd-sidebar {
    width: 240px;
    flex-shrink: 0;
    background: ${C.primary};
    display: flex;
    flex-direction: column;
    position: fixed;
    top: 0; left: 0; bottom: 0;
    z-index: 200;
    box-shadow: 2px 0 8px rgba(0,0,0,0.12);
  }
  .cd-sidebar-header {
    padding: 24px 20px 20px;
    border-bottom: 1px solid rgba(255,255,255,0.12);
  }
  .cd-logo-mark {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 15px;
    font-weight: 700;
    color: #fff;
    margin-bottom: 12px;
  }
  .cd-logo-icon {
    width: 34px; height: 34px;
    background: rgba(255,255,255,0.2);
    border-radius: 9px;
    display: flex; align-items: center; justify-content: center;
    font-size: 16px; flex-shrink: 0;
  }
  .cd-greeting {
    font-size: 13px;
    color: rgba(255,255,255,0.6);
    font-weight: 400;
    line-height: 1.4;
  }
  .cd-greeting strong { color: rgba(255,255,255,0.92); font-weight: 600; }

  .cd-nav {
    flex: 1;
    padding: 16px 12px;
    display: flex;
    flex-direction: column;
    gap: 2px;
    overflow-y: auto;
  }
  .cd-nav-item {
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
  .cd-nav-item:hover { background: rgba(255,255,255,0.1); color: #fff; }
  .cd-nav-item.active { background: rgba(255,255,255,0.18); color: #fff; }
  .cd-nav-item.soon { opacity: 0.55; cursor: default; }
  .cd-nav-item.soon:hover { background: transparent; color: rgba(255,255,255,0.65); }
  .cd-nav-icon { font-size: 16px; flex-shrink: 0; width: 20px; text-align: center; }
  .cd-soon-badge {
    margin-left: auto;
    font-size: 10px; font-weight: 700;
    color: rgba(255,255,255,0.45);
    background: rgba(255,255,255,0.1);
    border-radius: 8px; padding: 2px 7px;
    letter-spacing: 0.3px;
  }
  .cd-sidebar-footer {
    padding: 12px;
    border-top: 1px solid rgba(255,255,255,0.12);
  }
  .cd-nav-logout { color: rgba(255,255,255,0.6); }
  .cd-nav-logout:hover { background: rgba(255,255,255,0.08); color: #fff; }

  /* ── Main content ── */
  .cd-content {
    margin-left: 240px;
    flex: 1;
    min-width: 0;
  }

  /* ── Offline banner ── */
  .ln-offline-banner {
    background: #FEF3C7;
    color: #92400E;
    border-bottom: 1px solid #FDE68A;
    padding: 12px 32px;
    font-size: 13px;
    font-weight: 500;
    text-align: center;
  }

  .ln-main {
    max-width: 700px;
    margin: 0 auto;
    padding: 36px 32px 56px;
  }

  /* ── Form card ── */
  .ln-card {
    background: ${C.white};
    border-radius: 16px;
    box-shadow: 0 1px 6px rgba(0,0,0,0.07);
    padding: 28px 28px 24px;
    margin-bottom: 16px;
  }

  .ln-section {
    margin-bottom: 28px;
  }
  .ln-section:last-child { margin-bottom: 0; }

  .ln-label {
    display: block;
    font-size: 14px;
    font-weight: 700;
    color: ${C.text};
    margin-bottom: 12px;
  }
  .ln-optional {
    font-weight: 400;
    color: ${C.muted};
    font-size: 13px;
  }

  /* ── Category row ── */
  .ln-cat-row {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 10px;
  }
  .ln-cat-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    padding: 14px 8px;
    border: 1.5px solid ${C.border};
    border-radius: 12px;
    background: #FAFAFA;
    cursor: pointer;
    transition: border-color 0.15s, background 0.15s;
    font-family: inherit;
  }
  .ln-cat-btn:hover { border-color: #a3c4b0; background: #F0F7F3; }
  .ln-cat-btn.active {
    border: 2px solid ${C.primary};
    background: #EAF4EE;
  }
  .ln-cat-icon { font-size: 24px; line-height: 1; }
  .ln-cat-label {
    font-size: 12px;
    font-weight: 700;
    color: ${C.muted};
  }
  .ln-cat-btn.active .ln-cat-label { color: ${C.primary}; }

  /* ── Weight stepper ── */
  .ln-stepper {
    display: flex;
    align-items: center;
    border: 1.5px solid ${C.border};
    border-radius: 12px;
    overflow: hidden;
    height: 52px;
  }
  .ln-step-btn {
    width: 52px;
    flex-shrink: 0;
    height: 100%;
    border: none;
    background: #F5F6F7;
    color: ${C.text};
    font-size: 22px;
    font-weight: 400;
    cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    transition: background 0.12s;
    font-family: inherit;
    line-height: 1;
    user-select: none;
  }
  .ln-step-btn:hover { background: #EAEBED; }
  .ln-step-btn:active { background: #DDE0E2; }
  .ln-step-divider {
    width: 1px;
    height: 100%;
    background: ${C.border};
    flex-shrink: 0;
  }
  .ln-step-value {
    flex: 1;
    border: none;
    outline: none;
    text-align: center;
    font-size: 22px;
    font-weight: 700;
    color: ${C.text};
    font-family: inherit;
    background: transparent;
    height: 100%;
    min-width: 0;
    padding: 0 4px;
  }
  /* hide number input spinners */
  .ln-step-value::-webkit-inner-spin-button,
  .ln-step-value::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
  .ln-step-value[type=number] { -moz-appearance: textfield; }

  /* ── Map container ── */
  .ln-map-wrap {
    height: 180px;
    border-radius: 12px;
    overflow: hidden;
    margin-bottom: 10px;
    border: 1px solid ${C.border};
  }
  .ln-map-wrap > div { height: 100%; width: 100%; }

  /* ── Location block ── */
  .ln-location-block {
    display: flex;
    align-items: center;
    justify-content: center;
    background: #EAF4EE;
    border: 1.5px solid #A8D5B8;
    border-radius: 12px;
    padding: 20px 16px;
    cursor: pointer;
    text-align: center;
    font-size: 14px;
    font-weight: 600;
    color: ${C.primary};
    transition: background 0.15s, border-color 0.15s;
    min-height: 68px;
    user-select: none;
  }
  .ln-location-block:hover { background: #DFF0E7; border-color: ${C.primary}; }
  .ln-location-block.loading {
    color: ${C.muted};
    cursor: default;
    background: #F5F6F7;
    border-color: ${C.border};
  }
  .ln-gps-error {
    margin: 8px 0 0;
    font-size: 12px;
    color: ${C.danger};
  }
  /* ── Place search (Nominatim, same as buyer MapPicker) ── */
  .ln-search-divider {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 12px 0 10px;
  }
  .ln-search-divider-line { flex: 1; height: 1px; background: ${C.border}; }
  .ln-search-divider-text {
    font-size: 11px;
    color: #9CA3AF;
    font-weight: 600;
    letter-spacing: 0.3px;
  }
  .ln-search-row {
    display: flex;
    gap: 6px;
    margin-bottom: 6px;
  }
  .ln-search-input {
    flex: 1;
    padding: 9px 12px;
    border: 1px solid ${C.border};
    border-radius: 8px;
    font-size: 13px;
    font-family: inherit;
    outline: none;
    background: #FAFAFA;
    transition: border-color 0.15s;
    min-width: 0;
  }
  .ln-search-input:focus { border-color: ${C.primary}; background: ${C.white}; }
  .ln-search-btn {
    padding: 9px 14px;
    border-radius: 8px;
    border: none;
    background: ${C.primary};
    color: #fff;
    font-weight: 600;
    font-size: 13px;
    cursor: pointer;
    white-space: nowrap;
    font-family: inherit;
  }
  .ln-search-btn:disabled { opacity: 0.7; cursor: not-allowed; }
  .ln-search-results {
    margin: 0 0 10px;
    padding: 0;
    list-style: none;
    border: 1px solid ${C.border};
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 4px 12px rgba(0,0,0,0.08);
    background: ${C.white};
  }
  .ln-search-result {
    padding: 10px 12px;
    cursor: pointer;
    font-size: 13px;
    border-bottom: 1px solid #F3F4F6;
    line-height: 1.4;
    transition: background 0.1s;
  }
  .ln-search-result:last-child { border-bottom: none; }
  .ln-search-result:hover { background: #F0F7F3; }
  .ln-search-result-name { font-weight: 600; }
  .ln-search-result-detail { color: ${C.muted}; margin-left: 4px; }
  .ln-search-msg {
    margin: 0 0 8px;
    font-size: 12px;
    color: ${C.muted};
  }
  .ln-search-picked {
    margin: 0 0 8px;
    padding: 8px 12px;
    border-radius: 8px;
    background: #EAF4EE;
    color: ${C.primary};
    font-size: 12px;
    word-break: break-word;
  }

  .ln-manual-toggle {
    display: inline-block;
    margin-top: 8px;
    background: none;
    border: none;
    font-size: 12px;
    font-weight: 600;
    color: ${C.muted};
    cursor: pointer;
    padding: 0;
    font-family: inherit;
    text-decoration: underline;
    text-underline-offset: 2px;
  }
  .ln-manual-toggle:hover { color: ${C.primary}; }
  .ln-manual-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    margin-top: 10px;
  }
  .ln-manual-label {
    display: block;
    font-size: 11px;
    font-weight: 600;
    color: ${C.muted};
    margin-bottom: 4px;
  }
  .ln-manual-input {
    width: 100%;
    padding: 8px 10px;
    border: 1px solid ${C.border};
    border-radius: 8px;
    font-size: 13px;
    font-family: inherit;
    outline: none;
    background: #FAFAFA;
    transition: border-color 0.15s;
  }
  .ln-manual-input:focus { border-color: ${C.primary}; background: ${C.white}; }

  /* ── Notes ── */
  .ln-notes {
    width: 100%;
    padding: 10px 12px;
    border: 1px solid ${C.border};
    border-radius: 8px;
    font-size: 14px;
    font-family: inherit;
    background: #FAFAFA;
    resize: vertical;
    outline: none;
    transition: border-color 0.15s;
    color: ${C.text};
  }
  .ln-notes:focus { border-color: ${C.primary}; background: ${C.white}; }

  /* ── Error / Success banners ── */
  .ln-error {
    background: #FDECEA; color: ${C.danger};
    border-radius: 10px; padding: 12px 16px;
    font-size: 13px; margin-bottom: 12px;
  }
  .ln-success {
    background: #E7F4EC; color: ${C.primary};
    border-radius: 10px; padding: 12px 16px;
    font-size: 13px; margin-bottom: 12px;
  }

  /* ── Submit button ── */
  .ln-submit {
    width: 100%;
    padding: 17px;
    border: none;
    border-radius: 12px;
    background: ${C.primary};
    color: #fff;
    font-size: 15px;
    font-weight: 700;
    cursor: pointer;
    font-family: inherit;
    letter-spacing: 0.2px;
    transition: background 0.15s, opacity 0.15s;
  }
  .ln-submit:hover:not(:disabled) { background: ${C.primaryDark}; }
  .ln-submit:disabled { opacity: 0.55; cursor: not-allowed; }

  /* ── Mobile top bar ── */
  .cd-mobile-top { display: none; }
  .cd-mobile-header {
    background: ${C.primary};
    padding: 14px 16px;
    display: flex; align-items: center; justify-content: space-between;
    box-shadow: 0 2px 8px rgba(0,0,0,0.12);
    position: sticky; top: 0; z-index: 100;
  }
  .cd-mobile-logo {
    display: flex; align-items: center; gap: 8px;
    font-size: 15px; font-weight: 700; color: #fff;
  }
  .cd-mobile-logo-icon {
    width: 30px; height: 30px;
    background: rgba(255,255,255,0.2); border-radius: 8px;
    display: flex; align-items: center; justify-content: center; font-size: 14px;
  }
  .cd-mobile-btn {
    padding: 6px 14px; border-radius: 8px;
    border: 1px solid rgba(255,255,255,0.35);
    background: transparent; color: rgba(255,255,255,0.85);
    font-size: 13px; font-weight: 600; cursor: pointer; font-family: inherit;
    transition: background 0.15s;
  }
  .cd-mobile-btn:hover { background: rgba(255,255,255,0.12); }

  @media (max-width: 767px) {
    .cd-sidebar    { display: none; }
    .cd-content    { margin-left: 0; }
    .cd-mobile-top { display: block; }
    .ln-main       { padding: 16px 16px 48px; }
    .ln-card       { padding: 20px 16px; }
    .ln-cat-row    { grid-template-columns: repeat(2, 1fr); }
    .ln-manual-row { grid-template-columns: 1fr; }
  }
`;

export default function LogNew() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const [form, setForm] = useState({
    category: 'plastic',
    weight_kg: 1,
    latitude:  '',
    longitude: '',
    notes:     '',
  });
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError]     = useState('');
  const [showManual, setShowManual] = useState(false);
  const [searchQuery, setSearchQuery]     = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching]         = useState(false);
  const [searchMsg, setSearchMsg]         = useState('');
  const [searchPicked, setSearchPicked]   = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState('');
  const [success, setSuccess]       = useState('');
  const [isOnline, setIsOnline]     = useState(navigator.onLine);

  const mapContainerRef = useRef(null);
  const mapRef          = useRef(null);
  const markerRef       = useRef(null);

  const captureGPS = () => {
    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by your browser.');
      setShowManual(true);
      return;
    }
    setGpsLoading(true);
    setGpsError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm(f => ({
          ...f,
          latitude:  pos.coords.latitude.toFixed(6),
          longitude: pos.coords.longitude.toFixed(6),
        }));
        setGpsLoading(false);
        setShowManual(false);
        setSearchPicked('');
      },
      () => {
        setGpsError('Could not get location. Enter coordinates manually.');
        setGpsLoading(false);
        setShowManual(true);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  // Place search (Nominatim / OpenStreetMap) — same flow as the buyer-side MapPicker
  const handleSearch = async () => {
    if (!searchQuery.trim() || searching) return;
    setSearching(true);
    setSearchResults([]);
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&limit=5&addressdetails=1`;
      const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
      const data = await res.json();
      setSearchResults(data);
      setSearchMsg(data.length === 0 ? 'No places found. Try a different name or enter coordinates manually.' : '');
    } catch {
      setSearchMsg('Search failed. Check your connection or enter coordinates manually.');
    } finally {
      setSearching(false);
    }
  };

  const pickSearchResult = (r) => {
    setForm(f => ({
      ...f,
      latitude:  parseFloat(r.lat).toFixed(6),
      longitude: parseFloat(r.lon).toFixed(6),
    }));
    setSearchPicked(r.display_name);
    setSearchResults([]);
    setSearchQuery('');
    setSearchMsg('');
    setGpsError('');
  };

  // Auto-capture GPS on mount + track online status
  useEffect(() => {
    // Deferred a tick: captureGPS sets state synchronously, which isn't
    // allowed directly in an effect body (react-hooks/set-state-in-effect).
    const gpsTimer = setTimeout(captureGPS, 0);
    const onOnline = () => {
      setIsOnline(true);
      syncQueuedLogs().catch(() => {}); // drain queue on reconnect
    };
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online',  onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      clearTimeout(gpsTimer);
      window.removeEventListener('online',  onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  // Initialise map with a draggable marker; dragend writes back to form state
  useEffect(() => {
    if (mapRef.current || !mapContainerRef.current) return;
    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style:     'mapbox://styles/mapbox/streets-v12',
      center:    NAIROBI,
      zoom:      12,
    });
    const marker = new mapboxgl.Marker({ color: C.primary, draggable: true })
      .setLngLat(NAIROBI)
      .addTo(map);
    marker.on('dragend', () => {
      const { lng, lat } = marker.getLngLat();
      setForm(f => ({
        ...f,
        latitude:  lat.toFixed(6),
        longitude: lng.toFixed(6),
      }));
      setSearchPicked('');
    });
    mapRef.current    = map;
    markerRef.current = marker;
    return () => {
      map.remove();
      mapRef.current    = null;
      markerRef.current = null;
    };
  }, []);

  // Keep marker in sync whenever lat/lng changes (GPS capture, manual entry, or dragend)
  useEffect(() => {
    if (!markerRef.current || !form.latitude || !form.longitude) return;
    const lat = parseFloat(form.latitude);
    const lng = parseFloat(form.longitude);
    if (!isFinite(lat) || !isFinite(lng)) return;
    markerRef.current.setLngLat([lng, lat]);
    mapRef.current?.easeTo({ center: [lng, lat], zoom: 14, duration: 500 });
  }, [form.latitude, form.longitude]);

  const adjustWeight = (delta) => {
    setForm(f => ({
      ...f,
      weight_kg: Math.max(0.5, Math.round(((parseFloat(f.weight_kg) || 0) + delta) * 2) / 2),
    }));
  };

  const hasGPS     = form.latitude && form.longitude;
  const weightValid = form.weight_kg && parseFloat(form.weight_kg) > 0;
  const canSubmit  = !submitting && weightValid && hasGPS;

  const handleSubmit = async () => {
    if (!weightValid) {
      setError('Enter a valid weight before submitting.');
      return;
    }
    if (!hasGPS) {
      setError('Location is required — tap the location block or enter coordinates manually.');
      return;
    }
    setError('');
    setSuccess('');
    setSubmitting(true);

    // clientId is an idempotency key sent with every submission so the
    // server can deduplicate retried offline syncs.
    const clientId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;

    try {
      await api.post('/waste-logs', {
        category:  form.category,
        weight_kg: parseFloat(form.weight_kg),
        latitude:  parseFloat(form.latitude),
        longitude: parseFloat(form.longitude),
        notes:     form.notes || undefined,
        client_id: clientId,
      });
      setSuccess('Waste log submitted successfully!');
      setTimeout(() => navigate('/collector'), 1500);
    } catch (err) {
      if (!err.response) {
        // No response = request never reached the server = offline.
        // Queue for automatic retry; show a success-like message (the
        // data is safely saved locally).
        await queueLog({
          clientId,
          category:  form.category,
          weight_kg: parseFloat(form.weight_kg),
          latitude:  parseFloat(form.latitude),
          longitude: parseFloat(form.longitude),
          notes:     form.notes || null,
        }).catch(() => {});
        setSuccess("Saved offline — will sync automatically when you're back online.");
        setTimeout(() => navigate('/collector'), 2000);
      } else {
        // Server responded with an error (validation, auth, etc.) — not
        // a network failure, so don't queue.
        setError(err.response?.data?.error || 'Failed to submit. Try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  function handleLogout() {
    navigate('/', { replace: true });
    logout();
  }

  return (
    <>
      <style>{css}</style>
      <div className="cd-root">

        {/* ── Left sidebar ── */}
        <aside className="cd-sidebar">
          <div className="cd-sidebar-header">
            <div className="cd-logo-mark">
              <div className="cd-logo-icon">♻</div>
              WasteManagement
            </div>
            <p className="cd-greeting">
              Hello, <strong>{user?.name ?? 'Collector'}</strong>
            </p>
          </div>

          <nav className="cd-nav">
            <button className="cd-nav-item" onClick={() => navigate('/collector')}>
              <span className="cd-nav-icon">📊</span>
              Dashboard
            </button>
            <button className="cd-nav-item active">
              <span className="cd-nav-icon">➕</span>
              Log Waste
            </button>
            <NotificationBell />
            <button
              className="cd-nav-item"
              onClick={() => navigate('/collector/leaderboard')}
            >
              <span className="cd-nav-icon">🏆</span>
              Leaderboard
            </button>
            <button
              className="cd-nav-item"
              onClick={() => navigate('/collector/earnings')}
            >
              <span className="cd-nav-icon">💰</span>
              My Earnings
            </button>
            <button
              className="cd-nav-item"
              onClick={() => navigate('/collector/matches')}
            >
              <span className="cd-nav-icon">🤝</span>
              Buyer Matches
            </button>
          </nav>

          <div className="cd-sidebar-footer">
            <button className="cd-nav-item cd-nav-logout" onClick={handleLogout}>
              <span className="cd-nav-icon">🚪</span>
              Logout
            </button>
          </div>
        </aside>

        {/* ── Mobile top bar ── */}
        <div className="cd-mobile-top">
          <div className="cd-mobile-header">
            <div className="cd-mobile-logo">
              <div className="cd-mobile-logo-icon">♻</div>
              Log Waste
            </div>
            <button className="cd-mobile-btn" onClick={() => navigate('/collector')}>
              ← Back
            </button>
          </div>
        </div>

        {/* ── Main content ── */}
        <div className="cd-content">
          {!isOnline && (
            <div className="ln-offline-banner">
              You're offline — this log will sync automatically when you're back online
            </div>
          )}

          <main className="ln-main">

            {error   && <div className="ln-error">{error}</div>}
            {success && <div className="ln-success">{success}</div>}

            <div className="ln-card">

              {/* ── 1. Waste category ── */}
              <div className="ln-section">
                <span className="ln-label">Waste category</span>
                <div className="ln-cat-row">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat.key}
                      className={`ln-cat-btn${form.category === cat.key ? ' active' : ''}`}
                      onClick={() => setForm(f => ({ ...f, category: cat.key }))}
                    >
                      <span className="ln-cat-icon">{cat.icon}</span>
                      <span className="ln-cat-label">{cat.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* ── 2. Weight stepper ── */}
              <div className="ln-section">
                <span className="ln-label">Estimated weight (kg)</span>
                <div className="ln-stepper">
                  <button className="ln-step-btn" onClick={() => adjustWeight(-1)}>−</button>
                  <div className="ln-step-divider" />
                  <input
                    className="ln-step-value"
                    type="number"
                    min="0.5"
                    step="0.5"
                    value={form.weight_kg}
                    onChange={e => setForm(f => ({ ...f, weight_kg: e.target.value }))}
                  />
                  <div className="ln-step-divider" />
                  <button className="ln-step-btn" onClick={() => adjustWeight(1)}>+</button>
                </div>
              </div>

              {/* ── 3. Location ── */}
              <div className="ln-section">
                <span className="ln-label">Location</span>
                <div className="ln-map-wrap">
                  <div ref={mapContainerRef} />
                </div>
                <div
                  className={`ln-location-block${gpsLoading ? ' loading' : ''}`}
                  onClick={() => { if (!gpsLoading) captureGPS(); }}
                >
                  {gpsLoading ? (
                    'Getting location…'
                  ) : hasGPS ? (
                    <>
                      📍 {parseFloat(form.latitude).toFixed(4)}, {parseFloat(form.longitude).toFixed(4)}
                      {' '}— tap to adjust
                    </>
                  ) : (
                    '📍 Tap to capture location'
                  )}
                </div>

                {gpsError && <p className="ln-gps-error">{gpsError}</p>}

                <div className="ln-search-divider">
                  <div className="ln-search-divider-line" />
                  <span className="ln-search-divider-text">OR SEARCH BY PLACE NAME</span>
                  <div className="ln-search-divider-line" />
                </div>

                <div className="ln-search-row">
                  <input
                    className="ln-search-input"
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleSearch(); } }}
                    placeholder="e.g. Kibera, Nairobi"
                  />
                  <button
                    type="button"
                    className="ln-search-btn"
                    onClick={handleSearch}
                    disabled={searching}
                  >
                    {searching ? '…' : 'Search'}
                  </button>
                </div>

                {searchMsg && <p className="ln-search-msg">{searchMsg}</p>}

                {searchResults.length > 0 && (
                  <ul className="ln-search-results">
                    {searchResults.map(r => (
                      <li
                        key={r.place_id}
                        className="ln-search-result"
                        onClick={() => pickSearchResult(r)}
                      >
                        <span className="ln-search-result-name">
                          {r.address?.suburb || r.address?.neighbourhood || r.address?.city || r.name}
                        </span>
                        <span className="ln-search-result-detail">
                          {[r.address?.city, r.address?.county, r.address?.country]
                            .filter(Boolean).join(', ')}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}

                {searchPicked && (
                  <p className="ln-search-picked">✓ {searchPicked}</p>
                )}

                <button
                  className="ln-manual-toggle"
                  onClick={() => setShowManual(s => !s)}
                >
                  {showManual ? '↑ Hide manual entry' : 'Enter coordinates manually'}
                </button>

                {showManual && (
                  <div className="ln-manual-row">
                    <div>
                      <label className="ln-manual-label">Latitude</label>
                      <input
                        className="ln-manual-input"
                        type="number"
                        value={form.latitude}
                        onChange={e => setForm(f => ({ ...f, latitude: e.target.value }))}
                        placeholder="-1.2921"
                        step="any"
                      />
                    </div>
                    <div>
                      <label className="ln-manual-label">Longitude</label>
                      <input
                        className="ln-manual-input"
                        type="number"
                        value={form.longitude}
                        onChange={e => setForm(f => ({ ...f, longitude: e.target.value }))}
                        placeholder="36.8219"
                        step="any"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* ── 4. Notes (optional) ── */}
              <div className="ln-section">
                <span className="ln-label">
                  Notes <span className="ln-optional">(optional)</span>
                </span>
                <textarea
                  className="ln-notes"
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Any additional details about this collection…"
                  rows={2}
                />
              </div>

            </div>

            <button
              className="ln-submit"
              onClick={handleSubmit}
              disabled={!canSubmit}
            >
              {submitting ? 'Submitting…' : 'Submit waste log'}
            </button>

          </main>
        </div>

      </div>
    </>
  );
}
