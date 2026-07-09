import { useState, useRef, useEffect } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

const NAIROBI = { lat: -1.2921, lng: 36.8219 };

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

export default function MapPicker({ onSelect, initial }) {
  const hasInitial =
    initial && Number.isFinite(parseFloat(initial.lat)) && Number.isFinite(parseFloat(initial.lng));
  const [gpsState, setGpsState] = useState('idle'); // idle | loading | ok | error
  const [gpsMsg, setGpsMsg]     = useState('');
  const [query, setQuery]       = useState('');
  const [results, setResults]   = useState([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState(
    hasInitial ? `${parseFloat(initial.lat)}, ${parseFloat(initial.lng)} (current location)` : ''
  );
  const [showManual, setShowManual] = useState(false);
  const [lat, setLat] = useState(hasInitial ? String(parseFloat(initial.lat)) : '');
  const [lng, setLng] = useState(hasInitial ? String(parseFloat(initial.lng)) : '');
  // Where the map + marker start; `initial` is only read on mount.
  const startRef = useRef(
    hasInitial ? { lat: parseFloat(initial.lat), lng: parseFloat(initial.lng) } : NAIROBI
  );
  // Mapbox refs
  const mapContainerRef = useRef(null);
  const mapRef    = useRef(null);
  const markerRef = useRef(null);

  // Always-current onSelect, so map handlers never close over a stale prop
  // without forcing the init effect (and therefore the map) to re-run.
  const onSelectRef = useRef(onSelect);
  useEffect(() => {
    onSelectRef.current = onSelect;
  });

  /* ── Init map once, marker starts at Nairobi centre.
     Repositioning only happens via marker drag, GPS, or search —
     no click-anywhere, to match coordinator/buyer map behavior. ── */
  useEffect(() => {
    if (mapRef.current || !mapContainerRef.current) return;

    const start = startRef.current;
    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style:     'mapbox://styles/mapbox/streets-v12',
      center:    [start.lng, start.lat],
      zoom:      12,
    });

    const marker = new mapboxgl.Marker({ color: '#1F6F4A', draggable: true })
      .setLngLat([start.lng, start.lat])
      .addTo(map);

    // Dragging the pin is itself a selection method
    marker.on('dragend', () => {
      const { lng: newLng, lat: newLat } = marker.getLngLat();
      const roundedLat = parseFloat(newLat.toFixed(6));
      const roundedLng = parseFloat(newLng.toFixed(6));
      setLat(String(roundedLat));
      setLng(String(roundedLng));
      setSelected(`${roundedLat}, ${roundedLng} (map pin)`);
      setGpsState('ok');
      onSelectRef.current({ lat: roundedLat, lng: roundedLng });
    });

    mapRef.current    = map;
    markerRef.current = marker;

    return () => {
      map.remove();
      mapRef.current    = null;
      markerRef.current = null;
    };
  }, []);

  /* ── Whenever lat/lng change via GPS, search, or manual entry, move the pin ── */
  useEffect(() => {
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);
    if (!markerRef.current || isNaN(latNum) || isNaN(lngNum)) return;
    markerRef.current.setLngLat([lngNum, latNum]);
    mapRef.current?.easeTo({ center: [lngNum, latNum], zoom: 14, duration: 600 });
  }, [lat, lng]);

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
        onSelectRef.current({ lat: newLat, lng: newLng });
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
    if (e?.preventDefault) e.preventDefault();
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
    onSelectRef.current({ lat: newLat, lng: newLng });
  }

  /* ── Manual coordinates ── */
  function handleManual(field, value) {
    const num = parseFloat(value);
    if (field === 'lat') {
      setLat(value);
      if (!isNaN(num) && lng !== '') {
        setSelected(`${num}, ${parseFloat(lng)}`);
        onSelectRef.current({ lat: num, lng: parseFloat(lng) });
      }
    } else {
      setLng(value);
      if (!isNaN(num) && lat !== '') {
        setSelected(`${parseFloat(lat)}, ${num}`);
        onSelectRef.current({ lat: parseFloat(lat), lng: num });
      }
    }
  }

  return (
    <div style={{ fontSize: 13, color: '#1A1A1A' }}>

      {/* Mapbox map */}
      <div style={{
        position: 'relative', height: 180, borderRadius: 10,
        overflow: 'hidden', marginBottom: 10, border: '1px solid #E5E0D8',
      }}>
        <div ref={mapContainerRef} style={{ height: '100%', width: '100%' }} />
        {!selected && (
          <div style={{
            position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)',
            background: 'rgba(0,0,0,0.55)', color: '#fff', fontSize: 11,
            padding: '4px 10px', borderRadius: 16, pointerEvents: 'none',
            whiteSpace: 'nowrap', zIndex: 5,
          }}>
            Drag the pin, use GPS, or search to set a location
          </div>
        )}
      </div>

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
      <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleSearch(); } }}
          placeholder="e.g. Kibera, Nairobi"
          style={{ ...inputStyle, flex: 1 }}
        />
        <button
          type="button"
          onClick={handleSearch}
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
      </div>

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
