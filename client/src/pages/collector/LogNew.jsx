// client/src/pages/collector/LogNew.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axiosClient';

const CATEGORIES = [
  { key: 'plastic',  label: 'Plastic',  icon: '🌿' },
  { key: 'organic',  label: 'Organic',  icon: '♻' },
  { key: 'metal',    label: 'Metal',    icon: '⚙️' },
  { key: 'e-waste',  label: 'E-waste',  icon: '💻' },
];

const QUICK_ADD = [0.5, 1.0, 5.0];

export default function LogNew() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    category: 'plastic',
    weight_kg: '',
    latitude: '',
    longitude: '',
    notes: '',
  });
  const [gpsLoading, setGpsLoading]   = useState(false);
  const [gpsError, setGpsError]       = useState('');
  const [submitting, setSubmitting]   = useState(false);
  const [error, setError]             = useState('');
  const [success, setSuccess]         = useState('');

  const addWeight = (amount) => {
    const current = parseFloat(form.weight_kg) || 0;
    setForm(f => ({ ...f, weight_kg: (current + amount).toFixed(2) }));
  };

  const captureGPS = () => {
    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by your browser.');
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
      },
      () => {
        setGpsError('Could not get location. Enter coordinates manually.');
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSubmit = async () => {
    if (!form.weight_kg || parseFloat(form.weight_kg) <= 0) {
      setError('Enter a valid weight before submitting.');
      return;
    }
    setError('');
    setSuccess('');
    setSubmitting(true);
    try {
      await api.post('/waste-logs', {
        category:  form.category,
        weight_kg: parseFloat(form.weight_kg),
        latitude:  form.latitude  ? parseFloat(form.latitude)  : undefined,
        longitude: form.longitude ? parseFloat(form.longitude) : undefined,
        notes:     form.notes || undefined,
      });
      setSuccess('Waste log submitted successfully!');
      setTimeout(() => navigate('/collector'), 1500);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const hasGPS = form.latitude && form.longitude;

  return (
    <div style={styles.page}>

      {/* ── Top bar ── */}
      <header style={styles.topBar}>
        <button onClick={() => navigate('/collector')} style={styles.backBtn}>←</button>
        <span style={styles.topBarTitle}>Log New Waste</span>
        <div style={styles.offlinePill}>
          <span style={{ fontSize: 12 }}>☁</span> Offline Ready
        </div>
      </header>

      <div style={styles.content}>

        {error   && <div style={styles.errorBox}>{error}</div>}
        {success && <div style={styles.successBox}>{success}</div>}

        {/* ── 1. Category ── */}
        <div style={styles.card}>
          <p style={styles.stepLabel}>1. Waste Category</p>
          <div style={styles.categoryGrid}>
            {CATEGORIES.map(cat => (
              <button
                key={cat.key}
                onClick={() => setForm(f => ({ ...f, category: cat.key }))}
                style={{
                  ...styles.categoryBtn,
                  ...(form.category === cat.key ? styles.categoryBtnActive : {}),
                }}
              >
                <span style={{ fontSize: 28, marginBottom: 6 }}>{cat.icon}</span>
                <span style={{
                  fontSize: 13, fontWeight: 600,
                  color: form.category === cat.key ? '#1e6b3c' : '#555',
                }}>
                  {cat.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* ── 2. Weight ── */}
        <div style={styles.card}>
          <p style={styles.stepLabel}>2. Measurement</p>
          <div style={styles.weightInputWrap}>
            <label style={styles.weightInputLabel}>Weight Input</label>
            <input
              type="number"
              value={form.weight_kg}
              onChange={e => setForm(f => ({ ...f, weight_kg: e.target.value }))}
              placeholder="0.00"
              min="0.01"
              step="0.01"
              style={styles.weightInput}
            />
          </div>
          <div style={styles.quickAddRow}>
            {QUICK_ADD.map(a => (
              <button key={a} onClick={() => addWeight(a)} style={styles.quickAddBtn}>
                + {a.toFixed(1)}
              </button>
            ))}
          </div>
          {form.weight_kg && (
            <p style={styles.weightHint}>
              {parseFloat(form.weight_kg).toFixed(2)} kg selected
            </p>
          )}
        </div>

        {/* ── 3. Location ── */}
        <div style={styles.card}>
          <p style={styles.stepLabel}>3. Capture Location</p>

          {/* GPS display / map placeholder */}
          <div style={styles.mapPlaceholder}>
            <div style={styles.mapInner}>
              <span style={{ fontSize: 32 }}>📍</span>
              {hasGPS ? (
                <div style={styles.coordBadge}>
                  📍 {parseFloat(form.latitude).toFixed(4)}° N, {parseFloat(form.longitude).toFixed(4)}° E
                </div>
              ) : (
                <p style={{ color: '#aaa', fontSize: 13, margin: '8px 0 0' }}>
                  No location captured yet
                </p>
              )}
            </div>
          </div>

          {gpsError && <p style={{ color: '#dc2626', fontSize: 13, margin: '8px 0' }}>{gpsError}</p>}

          <button
            onClick={captureGPS}
            disabled={gpsLoading}
            style={{ ...styles.gpsBtn, opacity: gpsLoading ? 0.7 : 1 }}
          >
            📍 {gpsLoading ? 'Getting location...' : 'Update GPS Tag'}
          </button>

          {/* Manual fallback */}
          <div style={styles.manualRow}>
            <div style={{ flex: 1 }}>
              <label style={styles.manualLabel}>Latitude</label>
              <input
                type="number"
                value={form.latitude}
                onChange={e => setForm(f => ({ ...f, latitude: e.target.value }))}
                placeholder="-1.2921"
                step="any"
                style={styles.manualInput}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={styles.manualLabel}>Longitude</label>
              <input
                type="number"
                value={form.longitude}
                onChange={e => setForm(f => ({ ...f, longitude: e.target.value }))}
                placeholder="36.8219"
                step="any"
                style={styles.manualInput}
              />
            </div>
          </div>
        </div>

        {/* ── Notes (optional) ── */}
        <div style={styles.card}>
          <p style={styles.stepLabel}>Notes <span style={{ color: '#aaa', fontWeight: 400 }}>(optional)</span></p>
          <textarea
            value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            placeholder="Any additional details about this collection..."
            rows={3}
            style={styles.notesInput}
          />
        </div>

        {/* ── Impact preview ── */}
        <div style={styles.impactRow}>
          <div>
            <p style={styles.impactLabel}>Estimated Impact</p>
            <p style={styles.impactValue}>
              {form.weight_kg ? `+${Math.round(parseFloat(form.weight_kg) * 2)} EcoPoints` : '+ — EcoPoints'}
            </p>
          </div>
          <span style={{ fontSize: 28 }}>⭐</span>
        </div>

        {/* ── Submit ── */}
        <button
          onClick={handleSubmit}
          disabled={submitting || !form.weight_kg}
          style={{
            ...styles.submitBtn,
            opacity: (submitting || !form.weight_kg) ? 0.6 : 1,
          }}
        >
          {submitting ? 'Submitting...' : 'Submit Log'}
        </button>

      </div>
    </div>
  );
}

const GREEN = '#1e6b3c';

const styles = {
  page: {
    minHeight: '100vh',
    background: '#f4f6f8',
    fontFamily: "'Segoe UI', sans-serif",
    paddingBottom: 40,
  },

  topBar: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '14px 16px', background: '#fff',
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
    position: 'sticky', top: 0, zIndex: 100,
  },
  backBtn: {
    background: 'none', border: 'none', fontSize: 22,
    cursor: 'pointer', color: '#333', padding: '0 4px',
  },
  topBarTitle: { fontWeight: 700, fontSize: 16, flex: 1, color: '#1a1a1a' },
  offlinePill: {
    display: 'flex', alignItems: 'center', gap: 4,
    background: '#eaf5ee', color: GREEN,
    padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
  },

  content: { padding: '16px', maxWidth: 540, margin: '0 auto' },

  errorBox: {
    background: '#fde8e8', color: '#c0392b',
    padding: '10px 14px', borderRadius: 8, fontSize: 14, marginBottom: 12,
  },
  successBox: {
    background: '#e8f5e9', color: '#2e7d32',
    padding: '10px 14px', borderRadius: 8, fontSize: 14, marginBottom: 12,
  },

  card: {
    background: '#fff', borderRadius: 14,
    padding: 18, marginBottom: 14,
    boxShadow: '0 1px 6px rgba(0,0,0,0.05)',
  },
  stepLabel: {
    fontWeight: 700, fontSize: 15, color: '#1a1a1a',
    margin: '0 0 14px',
  },

  /* Category */
  categoryGrid: {
    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10,
  },
  categoryBtn: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    padding: '16px 8px', border: '1px solid #e5e7eb',
    borderRadius: 12, background: '#f9fafb', cursor: 'pointer',
    transition: 'all 0.15s',
  },
  categoryBtnActive: {
    border: `2px solid ${GREEN}`,
    background: '#eaf5ee',
  },

  /* Weight */
  weightInputWrap: {
    border: `1.5px solid ${GREEN}`,
    borderRadius: 10, padding: '12px 16px', marginBottom: 12,
  },
  weightInputLabel: {
    display: 'block', fontSize: 11, fontWeight: 600,
    color: GREEN, letterSpacing: '0.5px', marginBottom: 4,
  },
  weightInput: {
    width: '100%', border: 'none', outline: 'none',
    fontSize: 28, fontWeight: 700, color: '#1a1a1a',
    background: 'transparent', boxSizing: 'border-box',
  },
  quickAddRow: { display: 'flex', gap: 8 },
  quickAddBtn: {
    padding: '6px 16px', border: '1px solid #e0e0e0',
    borderRadius: 20, background: '#f0f0f0', cursor: 'pointer',
    fontSize: 13, fontWeight: 600, color: '#555',
  },
  weightHint: { fontSize: 12, color: '#888', margin: '8px 0 0' },

  /* GPS / Location */
  mapPlaceholder: {
    background: '#1a2e22', borderRadius: 12, height: 140,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    marginBottom: 12, overflow: 'hidden', position: 'relative',
  },
  mapInner: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
  },
  coordBadge: {
    background: 'rgba(255,255,255,0.15)', color: '#fff',
    padding: '6px 14px', borderRadius: 20, fontSize: 12,
    marginTop: 8, backdropFilter: 'blur(4px)',
  },
  gpsBtn: {
    width: '100%', padding: '12px',
    border: `1.5px solid ${GREEN}`, borderRadius: 10,
    background: '#fff', color: GREEN,
    fontSize: 14, fontWeight: 600, cursor: 'pointer',
    marginBottom: 12,
  },
  manualRow: { display: 'flex', gap: 10 },
  manualLabel: { display: 'block', fontSize: 12, color: '#888', marginBottom: 4 },
  manualInput: {
    width: '100%', padding: '8px 10px',
    border: '1px solid #e0e0e0', borderRadius: 8,
    fontSize: 13, boxSizing: 'border-box', outline: 'none',
  },

  /* Notes */
  notesInput: {
    width: '100%', padding: '10px 12px',
    border: '1px solid #e0e0e0', borderRadius: 8,
    fontSize: 14, boxSizing: 'border-box',
    resize: 'vertical', outline: 'none',
  },

  /* Impact */
  impactRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    background: '#fff', borderRadius: 14, padding: '14px 18px',
    marginBottom: 14, boxShadow: '0 1px 6px rgba(0,0,0,0.05)',
  },
  impactLabel: { fontSize: 13, color: '#888', margin: '0 0 4px' },
  impactValue: { fontSize: 18, fontWeight: 700, color: GREEN, margin: 0 },

  /* Submit */
  submitBtn: {
    width: '100%', padding: '16px',
    background: GREEN, color: '#fff', border: 'none',
    borderRadius: 12, fontSize: 16, fontWeight: 700,
    cursor: 'pointer', letterSpacing: '0.3px',
  },
};