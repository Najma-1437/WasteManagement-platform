import { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import api from '../../api/axiosClient';

const CATEGORIES = ['organic', 'plastic', 'metal', 'e-waste'];

const statusColor = {
  unmatched: '#f59e0b',
  matched: '#3b82f6',
  collected: '#10b981',
};

export default function CollectorDashboard() {
  const { user, logout } = useAuthStore();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [form, setForm] = useState({
    category: 'plastic',
    weight_kg: '',
    latitude: '',
    longitude: '',
    notes: '',
  });

  const fetchLogs = async () => {
    try {
      const res = await api.get('/waste-logs/my');
      setLogs(res.data.logs);
    } catch (err) {
      console.error('Failed to fetch logs', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/waste-logs/my');
        setLogs(res.data.logs);
      } catch (err) {
        console.error('Failed to fetch logs', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);

    try {
      await api.post('/waste-logs', {
        category: form.category,
        weight_kg: parseFloat(form.weight_kg),
        latitude: form.latitude ? parseFloat(form.latitude) : undefined,
        longitude: form.longitude ? parseFloat(form.longitude) : undefined,
        notes: form.notes || undefined,
      });

      setSuccess('Waste log submitted successfully.');
      setForm({ category: 'plastic', weight_kg: '', latitude: '', longitude: '', notes: '' });
      fetchLogs();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit log');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: 32, fontFamily: 'sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <div>
          <h1 style={{ color: '#1e4d2b', margin: 0, fontSize: 22 }}>Collector Dashboard</h1>
          <p style={{ margin: 0, color: '#666' }}>Welcome, {user?.name}</p>
        </div>
        <button onClick={logout} style={{ padding: '8px 16px', cursor: 'pointer', borderRadius: 6, border: '1px solid #ccc' }}>
          Logout
        </button>
      </div>

      {/* Log Waste Form */}
      <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: 24, marginBottom: 32 }}>
        <h2 style={{ marginTop: 0, color: '#1e4d2b' }}>Log Waste</h2>

        {error && <p style={{ color: '#dc2626', marginBottom: 12 }}>{error}</p>}
        {success && <p style={{ color: '#16a34a', marginBottom: 12 }}>{success}</p>}

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>Category</label>
              <select
                name="category"
                value={form.category}
                onChange={handleChange}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #d1d5db', boxSizing: 'border-box' }}
              >
                {CATEGORIES.map(c => (
                  <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>Weight (kg)</label>
              <input
                type="number"
                name="weight_kg"
                value={form.weight_kg}
                onChange={handleChange}
                placeholder="e.g. 5.5"
                min="0.01"
                step="0.01"
                required
                style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #d1d5db', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>Latitude <span style={{ color: '#9ca3af' }}>(optional)</span></label>
              <input
                type="number"
                name="latitude"
                value={form.latitude}
                onChange={handleChange}
                placeholder="-1.2921"
                step="any"
                style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #d1d5db', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>Longitude <span style={{ color: '#9ca3af' }}>(optional)</span></label>
              <input
                type="number"
                name="longitude"
                value={form.longitude}
                onChange={handleChange}
                placeholder="36.8219"
                step="any"
                style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #d1d5db', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>Notes <span style={{ color: '#9ca3af' }}>(optional)</span></label>
            <textarea
              name="notes"
              value={form.notes}
              onChange={handleChange}
              placeholder="Any additional details..."
              rows={3}
              style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #d1d5db', boxSizing: 'border-box', resize: 'vertical' }}
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            style={{ padding: '10px 24px', background: '#1e4d2b', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}
          >
            {submitting ? 'Submitting...' : 'Submit Log'}
          </button>
        </form>
      </div>

      {/* Logs Table */}
      <div>
        <h2 style={{ color: '#1e4d2b' }}>My Waste Logs</h2>
        {loading ? (
          <p>Loading...</p>
        ) : logs.length === 0 ? (
          <p style={{ color: '#6b7280' }}>No logs yet. Submit your first waste log above.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f3f4f6', textAlign: 'left' }}>
                <th style={{ padding: '10px 12px', borderBottom: '1px solid #e5e7eb' }}>Category</th>
                <th style={{ padding: '10px 12px', borderBottom: '1px solid #e5e7eb' }}>Weight (kg)</th>
                <th style={{ padding: '10px 12px', borderBottom: '1px solid #e5e7eb' }}>Status</th>
                <th style={{ padding: '10px 12px', borderBottom: '1px solid #e5e7eb' }}>Date</th>
                <th style={{ padding: '10px 12px', borderBottom: '1px solid #e5e7eb' }}>Notes</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log.log_id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '10px 12px', textTransform: 'capitalize' }}>{log.category}</td>
                  <td style={{ padding: '10px 12px' }}>{log.weight_kg}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{
                      background: statusColor[log.status] + '20',
                      color: statusColor[log.status],
                      padding: '2px 10px',
                      borderRadius: 12,
                      fontSize: 13,
                      fontWeight: 500,
                    }}>
                      {log.status}
                    </span>
                  </td>
                  <td style={{ padding: '10px 12px', color: '#6b7280', fontSize: 13 }}>
                    {new Date(log.created_at).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                  <td style={{ padding: '10px 12px', color: '#6b7280', fontSize: 13 }}>{log.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
