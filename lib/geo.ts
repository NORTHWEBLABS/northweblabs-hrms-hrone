// lib/geo.ts — shared geolocation helpers for attendance check-in/out.

export interface Coords { latitude: number; longitude: number; accuracy?: number; }
export interface OfficeLoc { id: string; name: string; latitude: number | null; longitude: number | null; geofence_radius_m: number | null; }
export interface GeoResult {
  coords: Coords | null;        // null if denied/unavailable
  denied: boolean;              // true if user blocked permission
  nearest: OfficeLoc | null;    // closest office that has coordinates
  distance_m: number | null;    // metres to nearest office
  geo_flagged: boolean;         // true if outside that office's radius
}

// Capture the browser's current position. Resolves with coords or a denied flag —
// never rejects, so a denied permission still lets the punch proceed.
export function getCurrentCoords(timeoutMs = 8000): Promise<{ coords: Coords | null; denied: boolean }> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      resolve({ coords: null, denied: false });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({
        coords: { latitude: pos.coords.latitude, longitude: pos.coords.longitude, accuracy: pos.coords.accuracy },
        denied: false,
      }),
      (err) => resolve({ coords: null, denied: err.code === err.PERMISSION_DENIED }),
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 0 }
    );
  });
}

// Haversine distance in metres between two lat/long points.
export function haversineM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // earth radius, metres
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

// Given captured coords and the org's offices, find the nearest office (with coords)
// and decide whether the punch is outside its geofence radius.
export function evaluateGeo(coords: Coords | null, offices: OfficeLoc[]): Omit<GeoResult, "denied"> {
  if (!coords) return { coords: null, nearest: null, distance_m: null, geo_flagged: false };
  const withCoords = offices.filter(o => o.latitude != null && o.longitude != null);
  if (withCoords.length === 0) {
    // No office coordinates set → record coords but can't flag (nothing to measure against)
    return { coords, nearest: null, distance_m: null, geo_flagged: false };
  }
  let nearest: OfficeLoc | null = null;
  let best = Infinity;
  for (const o of withCoords) {
    const d = haversineM(coords.latitude, coords.longitude, o.latitude!, o.longitude!);
    if (d < best) { best = d; nearest = o; }
  }
  const radius = nearest?.geofence_radius_m ?? 200;
  return { coords, nearest, distance_m: best === Infinity ? null : best, geo_flagged: best > radius };
}

// Full convenience flow: capture + evaluate in one call.
export async function captureAndEvaluate(offices: OfficeLoc[]): Promise<GeoResult> {
  const { coords, denied } = await getCurrentCoords();
  const evaln = evaluateGeo(coords, offices);
  return { ...evaln, denied };
}
