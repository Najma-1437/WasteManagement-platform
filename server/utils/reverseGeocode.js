// Resolve coordinates to a human-readable address via Nominatim (OpenStreetMap).
// Returns the display_name string, or null on any failure — callers treat the
// address as best-effort and must never let a geocoding error break the request.
async function reverseGeocode(latitude, longitude) {
  try {
    const url =
      `https://nominatim.openstreetmap.org/reverse` +
      `?lat=${encodeURIComponent(latitude)}&lon=${encodeURIComponent(longitude)}` +
      `&format=json&zoom=16`;
    const res = await fetch(url, {
      headers: {
        // Nominatim usage policy requires an identifying User-Agent
        'User-Agent': 'WasteManagementPlatform/1.0',
        'Accept-Language': 'en',
      },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.display_name || null;
  } catch {
    return null;
  }
}

module.exports = reverseGeocode;
