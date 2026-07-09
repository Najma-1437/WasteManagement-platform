import { useState } from 'react';
import api from '../api/axiosClient';
import MapPicker from './MapPicker';

const C = {
  primary: '#1e6b3c',
  text:    '#1A1A1A',
  muted:   '#6B7280',
  border:  '#E5E7EB',
  danger:  '#B3261E',
};

const CATEGORIES = [
  { key: 'organic', label: 'Organic', icon: '🌿' },
  { key: 'plastic', label: 'Plastic', icon: '♻'  },
  { key: 'metal',   label: 'Metal',   icon: '⚙️' },
  { key: 'e-waste', label: 'E-waste', icon: '💻' },
];

const css = `
  .elm-overlay {
    position: fixed; inset: 0; z-index: 500;
    background: rgba(0,0,0,0.45);
    display: flex; align-items: center; justify-content: center;
    padding: 16px;
  }
  .elm-modal {
    background: #fff; border-radius: 16px;
    width: 100%; max-width: 480px;
    max-height: 90vh; overflow-y: auto;
    padding: 22px 22px 20px;
    box-shadow: 0 12px 40px rgba(0,0,0,0.22);
    font-family: Inter, system-ui, -apple-system, sans-serif;
    color: ${C.text};
  }
  .elm-header {
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 16px;
  }
  .elm-title { font-size: 16px; font-weight: 700; margin: 0; }
  .elm-close {
    background: none; border: none; font-size: 16px; cursor: pointer;
    color: ${C.muted}; padding: 4px; line-height: 1; font-family: inherit;
  }
  .elm-label {
    display: block; font-size: 13px; font-weight: 700;
    margin: 0 0 8px; color: ${C.text};
  }
  .elm-section { margin-bottom: 18px; }
  .elm-cat-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
  .elm-cat-btn {
    display: flex; flex-direction: column; align-items: center; gap: 4px;
    padding: 10px 6px; border: 1.5px solid ${C.border}; border-radius: 10px;
    background: #FAFAFA; cursor: pointer; font-family: inherit;
    transition: border-color 0.15s, background 0.15s;
  }
  .elm-cat-btn:hover { border-color: #a3c4b0; background: #F0F7F3; }
  .elm-cat-btn.active { border: 2px solid ${C.primary}; background: #EAF4EE; }
  .elm-cat-icon { font-size: 18px; line-height: 1; }
  .elm-cat-label { font-size: 11px; font-weight: 700; color: ${C.muted}; }
  .elm-cat-btn.active .elm-cat-label { color: ${C.primary}; }
  .elm-weight-input {
    width: 100%; padding: 10px 12px; border: 1.5px solid ${C.border};
    border-radius: 10px; font-size: 15px; font-weight: 700;
    font-family: inherit; outline: none; box-sizing: border-box;
  }
  .elm-weight-input:focus { border-color: ${C.primary}; }
  .elm-error {
    background: #FDECEA; color: ${C.danger}; border-radius: 10px;
    padding: 10px 14px; font-size: 13px; margin-bottom: 12px;
  }
  .elm-actions { display: flex; gap: 10px; margin-top: 4px; }
  .elm-btn {
    flex: 1; padding: 12px; border-radius: 10px; font-size: 14px;
    font-weight: 700; cursor: pointer; font-family: inherit;
    transition: background 0.15s, opacity 0.15s;
  }
  .elm-btn-cancel {
    background: #fff; border: 1.5px solid ${C.border}; color: ${C.text};
  }
  .elm-btn-cancel:hover { background: #F3F4F6; }
  .elm-btn-save {
    background: ${C.primary}; border: none; color: #fff;
  }
  .elm-btn-save:hover:not(:disabled) { background: #155230; }
  .elm-btn-save:disabled { opacity: 0.55; cursor: not-allowed; }
  @media (max-width: 420px) {
    .elm-cat-row { grid-template-columns: repeat(2, 1fr); }
  }
`;

/**
 * Modal for editing a still-pending waste log (category, weight, location).
 * The server rejects the edit (409) once a buyer has claimed the log.
 */
export default function EditLogModal({ log, onClose, onSaved }) {
  const [category, setCategory] = useState(log.category);
  const [weight, setWeight]     = useState(String(parseFloat(log.weight_kg)));
  const [lat, setLat]           = useState(log.latitude);
  const [lng, setLng]           = useState(log.longitude);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');

  const weightValid = Number.isFinite(parseFloat(weight)) && parseFloat(weight) > 0;
  const hasLocation = lat != null && lng != null;

  const handleSave = async () => {
    if (!weightValid) {
      setError('Enter a valid weight greater than 0.');
      return;
    }
    if (!hasLocation) {
      setError('Pick a location before saving.');
      return;
    }
    setError('');
    setSaving(true);
    try {
      const res = await api.patch(`/waste-logs/${log.log_id}`, {
        category,
        weight_kg: parseFloat(weight),
        latitude:  parseFloat(lat),
        longitude: parseFloat(lng),
      });
      onSaved(res.data.log);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save changes. Try again.');
      setSaving(false);
    }
  };

  return (
    <>
      <style>{css}</style>
      <div className="elm-overlay" onClick={onClose}>
        <div className="elm-modal" onClick={e => e.stopPropagation()}>
          <div className="elm-header">
            <p className="elm-title">Edit waste log</p>
            <button className="elm-close" onClick={onClose}>✕</button>
          </div>

          {error && <div className="elm-error">{error}</div>}

          <div className="elm-section">
            <span className="elm-label">Waste category</span>
            <div className="elm-cat-row">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.key}
                  type="button"
                  className={`elm-cat-btn${category === cat.key ? ' active' : ''}`}
                  onClick={() => setCategory(cat.key)}
                >
                  <span className="elm-cat-icon">{cat.icon}</span>
                  <span className="elm-cat-label">{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="elm-section">
            <span className="elm-label">Estimated weight (kg)</span>
            <input
              className="elm-weight-input"
              type="number"
              min="0.5"
              step="0.5"
              value={weight}
              onChange={e => setWeight(e.target.value)}
            />
          </div>

          <div className="elm-section">
            <span className="elm-label">Location</span>
            <MapPicker
              initial={{ lat: log.latitude, lng: log.longitude }}
              onSelect={({ lat: newLat, lng: newLng }) => { setLat(newLat); setLng(newLng); }}
            />
          </div>

          <div className="elm-actions">
            <button className="elm-btn elm-btn-cancel" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button className="elm-btn elm-btn-save" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
