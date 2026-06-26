import { useState, useRef } from 'react';

const GPS_ERRORS = {
  1: 'Location permission was denied. Please allow location access in your browser, or search for your area below.',
  2: 'Your device could not determine your position right now. Please search for your area below.',
  3: 'Location request timed out. Please try again or search for your area below.',
};

const inputStyle = {
  width: '100%', padding: '9px 12px', borderRadius: 8,
  border: '1px solid #E5E0D8', fontSize: 13, fontFamily: 'inherit',
  boxSizing: 'border-box', outline: 'none', background: '#fff',
};

export default function MapPicker({ onSelect }) {
  const [gpsState, setGpsState] = useState('idle'); // idle | loading | ok | error
  const [gpsMsg, setGpsMsg]     = useState('');
  const [query, setQuery]       = useState('');
  const [results, setResults]   = useState([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState('');
  const [showManual, setShowManual] = useState(false);
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const searchRef = useRef(null);

  /* ── GPS ── */
  function handleGPS() {
    if (!navigator.geolocation) {
      setGpsState('error');
      setGpsMsg('Geolocation is not supported by your browser.');
      return;
    }
    setGpsState('loading');
    setGpsMsg('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const newLat = parseFloat(pos.coords.latitude.toFixed(6));
        const newLng = parseFloat(pos.coords.longitude.toFixed(6));
        setLat(String(newLat));
        setLng(String(newLng));
        setSelected(`${newLat}, ${newLng} (GPS)`);
        setGpsState('ok');
        onSelect({ lat: newLat, lng: newLng });
      },
      (err) => {
        setGpsState('error');
        setGpsMsg(GPS_ERRORS[err.code] || 'Unable to get location. Please search for your area below.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }

  /* ── Place search (Nominatim / OpenStreetMap) ── */
  async function handleSearch(e) {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    setResults([]);
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&addressdetails=1`;
      const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
      const data = await res.json();
      setResults(data);
      if (data.length === 0) setGpsMsg('No places found. Try a different name or enter coordinates manually.');
      else setGpsMsg('');
    } catch {
      setGpsMsg('Search failed. Check your connection or enter coordinates manually.');
    } finally {
      setSearching(false);
    }
  }

  function pickResult(r) {
    const newLat = parseFloat(parseFloat(r.lat).toFixed(6));
    const newLng = parseFloat(parseFloat(r.lon).toFixed(6));
    setLat(String(newLat));
    setLng(String(newLng));
    setSelected(r.display_name);
    setResults([]);
    setQuery('');
    setGpsState('ok');
    setGpsMsg('');
    onSelect({ lat: newLat, lng: newLng });
  }

  /* ── Manual coordinates ── */
  function handleManual(field, value) {
    const num = parseFloat(value);
    if (field === 'lat') {
      setLat(value);
      if (!isNaN(num) && lng !== '') {
        setSelected(`${num}, ${parseFloat(lng)}`);
        onSelect({ lat: num, lng: parseFloat(lng) });
      }
    } else {
      setLng(value);
      if (!isNaN(num) && lat !== '') {
        setSelected(`${parseFloat(lat)}, ${num}`);
        onSelect({ lat: parseFloat(lat), lng: num });
      }
    }
  }

  return (
    <div style={{ fontSize: 13, color: '#1A1A1A' }}>

      {/* GPS button */}
      <button
        type="button"
        onClick={handleGPS}
        disabled={gpsState === 'loading'}
        style={{
          width: '100%', padding: '10px 0', borderRadius: 8,
          border: '1px solid #1F6F4A',
          background: gpsState === 'loading' ? '#f0f0f0' : '#E7F4EC',
          color: '#1F6F4A', fontWeight: 600, fontSize: 13,
          cursor: gpsState === 'loading' ? 'not-allowed' : 'pointer',
          marginBottom: 10, display: 'flex', alignItems: 'center',
          justifyContent: 'center', gap: 6,
        }}
      >
        {gpsState === 'loading' ? '⏳ Detecting…' : '📍 Use my GPS location'}
      </button>

      {/* GPS error */}
      {gpsMsg && (
        <p style={{
          margin: '0 0 10px',
          color: gpsState === 'error' ? '#B3261E' : '#6B7280',
          fontSize: 12, lineHeight: 1.4,
        }}>
          {gpsMsg}
        </p>
      )}

      {/* Divider */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '4px 0 10px' }}>
        <div style={{ flex: 1, height: 1, background: '#E5E0D8' }} />
        <span style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 600 }}>OR SEARCH BY PLACE NAME</span>
        <div style={{ flex: 1, height: 1, background: '#E5E0D8' }} />
      </div>

      {/* Place search */}
      <form onSubmit={handleSearch} style={{ display: 'flex', gap: 6, marginBottom: 6 }} ref={searchRef}>
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="e.g. Kibera, Nairobi"
          style={{ ...inputStyle, flex: 1 }}
        />
        <button
          type="submit"
          disabled={searching}
          style={{
            padding: '9px 14px', borderRadius: 8, border: 'none',
            background: '#1F6F4A', color: '#fff', fontWeight: 600,
            fontSize: 13, cursor: searching ? 'not-allowed' : 'pointer',
            whiteSpace: 'nowrap', opacity: searching ? 0.7 : 1,
          }}
        >
          {searching ? '…' : 'Search'}
        </button>
      </form>

      {/* Search results */}
      {results.length > 0 && (
        <ul style={{
          margin: '0 0 10px', padding: 0, listStyle: 'none',
          border: '1px solid #E5E0D8', borderRadius: 8, overflow: 'hidden',
          boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
        }}>
          {results.map((r, i) => (
            <li
              key={r.place_id}
              onClick={() => pickResult(r)}
              style={{
                padding: '10px 12px', cursor: 'pointer', fontSize: 13,
                borderBottom: i < results.length - 1 ? '1px solid #F3F4F6' : 'none',
                background: '#fff', lineHeight: 1.4,
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#F0FAF5'}
              onMouseLeave={e => e.currentTarget.style.background = '#fff'}
            >
              <span style={{ fontWeight: 600 }}>
                {r.address?.suburb || r.address?.neighbourhood || r.address?.city || r.name}
              </span>
              <span style={{ color: '#6B7280', marginLeft: 4 }}>
                {[r.address?.city, r.address?.county, r.address?.country]
                  .filter(Boolean).join(', ')}
              </span>
            </li>
          ))}
        </ul>
      )}

      {/* Selected location display */}
      {selected && (
        <div style={{
          padding: '8px 12px', borderRadius: 8, background: '#E7F4EC',
          color: '#1F6F4A', fontSize: 12, fontWeight: 600,
          marginBottom: 10, display: 'flex', gap: 6, alignItems: 'flex-start',
        }}>
          <span>✓</span>
          <span style={{ fontWeight: 400, wordBreak: 'break-word' }}>{selected}</span>
        </div>
      )}

      {/* Manual coordinates (collapsed by default) */}
      <button
        type="button"
        onClick={() => setShowManual(s => !s)}
        style={{
          background: 'none', border: 'none', color: '#6B7280',
          fontSize: 12, cursor: 'pointer', padding: '2px 0',
          textDecoration: 'underline',
        }}
      >
        {showManual ? '▲ Hide' : '▼ Enter coordinates manually'}
      </button>

      {showManual && (
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 3 }}>
              Latitude
            </label>
            <input
              type="number" step="any" placeholder="-1.286389"
              value={lat}
              onChange={e => handleManual('lat', e.target.value)}
              style={inputStyle}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 3 }}>
              Longitude
            </label>
            <input
              type="number" step="any" placeholder="36.817223"
              value={lng}
              onChange={e => handleManual('lng', e.target.value)}
              style={inputStyle}
            />
          </div>
        </div>
      )}
    </div>
  );
}
