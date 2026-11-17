import {
  PRIMARY_ROAD_COORDINATES,
  BYPASS_ROAD_COORDINATES,
} from './roadRoutingData';

export { PRIMARY_ROAD_COORDINATES, BYPASS_ROAD_COORDINATES };

export interface RoadPosition {
  lat: number;
  lng: number;
  heading: number;
}

export function haversineMeters(a: [number, number], b: [number, number]): number {
  const R = 6371000;
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLng = ((b[1] - a[1]) * Math.PI) / 180;
  const lat1 = (a[0] * Math.PI) / 180;
  const lat2 = (b[0] * Math.PI) / 180;
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const x =
    sinDLat * sinDLat +
    Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
  return 2 * R * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function computeCumulativeDistances(coords: [number, number][]): number[] {
  const cum: number[] = [0];
  for (let i = 1; i < coords.length; i++) {
    cum.push(cum[i - 1] + haversineMeters(coords[i - 1], coords[i]));
  }
  return cum;
}

/**
 * Interpolates [lat, lng, heading] strictly along the road polyline by true arc-length distance.
 */
export function interpolateAlongRoad(
  coords: [number, number][],
  progress: number
): RoadPosition {
  if (!coords || coords.length === 0) {
    return { lat: 13.0694, lng: 77.6186, heading: 0 };
  }
  if (coords.length === 1) {
    return { lat: coords[0][0], lng: coords[0][1], heading: 0 };
  }

  const clamped = Math.max(0, Math.min(1, progress));
  const cum = computeCumulativeDistances(coords);
  const totalDist = cum[cum.length - 1];

  if (totalDist <= 0) {
    return { lat: coords[0][0], lng: coords[0][1], heading: 0 };
  }

  const targetDist = clamped * totalDist;

  // Binary search for segment containing targetDist
  let lo = 0;
  let hi = cum.length - 2;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (cum[mid] <= targetDist) {
      lo = mid;
    } else {
      hi = mid - 1;
    }
  }

  const p1 = coords[lo];
  const p2 = coords[lo + 1];
  const segLen = cum[lo + 1] - cum[lo];
  const frac = segLen > 0 ? (targetDist - cum[lo]) / segLen : 0;

  const lat = p1[0] + (p2[0] - p1[0]) * frac;
  const lng = p1[1] + (p2[1] - p1[1]) * frac;

  const dLat = p2[0] - p1[0];
  const dLng = p2[1] - p1[1];
  let heading = (Math.atan2(dLng, dLat) * 180) / Math.PI;
  if (heading < 0) heading += 360;

  return { lat, lng, heading: Math.round(heading) };
}

/**
 * Computes exact normalized progress [0..1] along the road polyline for each bus stop.
 */
export function computeStopRoadProgresses(
  coords: [number, number][],
  stops: Array<{ lat?: number; lng?: number }>
): number[] {
  if (!coords || coords.length < 2 || stops.length === 0) {
    return stops.map((_, i) => (stops.length > 1 ? i / (stops.length - 1) : 0));
  }

  const cum = computeCumulativeDistances(coords);
  const totalDist = cum[cum.length - 1] || 1;

  return stops.map((stop, idx) => {
    if (idx === 0) return 0;
    if (idx === stops.length - 1) return 1;
    if (typeof stop.lat !== 'number' || typeof stop.lng !== 'number') {
      return idx / Math.max(1, stops.length - 1);
    }

    const target: [number, number] = [stop.lat, stop.lng];
    let bestIdx = 0;
    let bestDist = Infinity;
    for (let i = 0; i < coords.length; i++) {
      const d = haversineMeters(coords[i], target);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }
    return cum[bestIdx] / totalDist;
  });
}

const roadRouteCache = new Map<string, [number, number][]>();

/**
 * Fetches live OpenStreetMap road-snapped driving geometry from OSRM for arbitrary stop waypoints,
 * falling back cleanly to the pre-snapped road coordinates if network/API is unavailable.
 */
export async function fetchOsrmRoadRoute(
  waypoints: [number, number][],
  fallbackCoords: [number, number][]
): Promise<[number, number][]> {
  if (!waypoints || waypoints.length < 2) return fallbackCoords;

  const cacheKey = waypoints
    .map(([lat, lng]) => `${lat.toFixed(5)},${lng.toFixed(5)}`)
    .join(';');

  const cached = roadRouteCache.get(cacheKey);
  if (cached) return cached;

  try {
    const osrmCoords = waypoints
      .map(([lat, lng]) => `${lng.toFixed(6)},${lat.toFixed(6)}`)
      .join(';');
    const url = `https://router.project-osrm.org/route/v1/driving/${osrmCoords}?overview=full&geometries=geojson`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);

    if (!res.ok) return fallbackCoords;
    const data = await res.json();
    const rawCoords: [number, number][] | undefined =
      data?.routes?.[0]?.geometry?.coordinates;

    if (!Array.isArray(rawCoords) || rawCoords.length < 2) {
      return fallbackCoords;
    }

    // OSRM GeoJSON uses [lng, lat]; Leaflet expects [lat, lng]
    const latLngCoords: [number, number][] = rawCoords.map(([lng, lat]) => [
      Number(lat.toFixed(6)),
      Number(lng.toFixed(6)),
    ]);

    roadRouteCache.set(cacheKey, latLngCoords);
    return latLngCoords;
  } catch {
    return fallbackCoords;
  }
}

export const JAKKUR_DEPOT_COORDS: [number, number] = [13.0694, 77.6186];
export const JAKKUR_DEPOT_RADIUS_METERS = 500;
export const ROUTE_14_CORRIDOR_RADIUS_METERS = 650;

export interface RouteGeofenceEvaluation {
  status: 'INSIDE_CORRIDOR' | 'AT_JAKKUR_DEPOT' | 'OUTSIDE_ROUTE_MASKED';
  isAuthorizedZone: boolean;
  insideDepot: boolean;
  insideCorridor: boolean;
  depotDistanceMeters: number;
  corridorDistanceMeters: number;
  zoneLabel: string;
}

function pointToSegmentMeters(
  p: [number, number],
  a: [number, number],
  b: [number, number]
): number {
  const latScale = 111320;
  const lngScale = 111320 * Math.cos((p[0] * Math.PI) / 180);

  const ax = (a[1] - p[1]) * lngScale;
  const ay = (a[0] - p[0]) * latScale;
  const bx = (b[1] - p[1]) * lngScale;
  const by = (b[0] - p[0]) * latScale;

  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;

  if (lenSq <= 0.0001) {
    return Math.hypot(ax, ay);
  }

  const t = Math.max(0, Math.min(1, -(ax * dx + ay * dy) / lenSq));
  const projX = ax + t * dx;
  const projY = ay + t * dy;
  return Math.hypot(projX, projY);
}

/**
 * Evaluates whether a vehicle coordinate lies inside the Jakkur Campus Depot geofence
 * or within the authorized Route 14 corridor buffer.
 */
export function evaluateRoute14Geofence(
  lat: number,
  lng: number,
  routePolyline: [number, number][],
  depotCoords: [number, number] = JAKKUR_DEPOT_COORDS
): RouteGeofenceEvaluation {
  const point: [number, number] = [lat, lng];
  const depotDistanceMeters = Math.round(haversineMeters(point, depotCoords));

  let minCorridorDist = Infinity;
  if (routePolyline && routePolyline.length >= 2) {
    for (let i = 0; i < routePolyline.length - 1; i++) {
      const dist = pointToSegmentMeters(point, routePolyline[i], routePolyline[i + 1]);
      if (dist < minCorridorDist) {
        minCorridorDist = dist;
      }
    }
  } else if (routePolyline && routePolyline.length === 1) {
    minCorridorDist = haversineMeters(point, routePolyline[0]);
  } else {
    minCorridorDist = depotDistanceMeters;
  }

  const corridorDistanceMeters = Math.round(minCorridorDist);
  const insideDepot = depotDistanceMeters <= JAKKUR_DEPOT_RADIUS_METERS;
  const insideCorridor = corridorDistanceMeters <= ROUTE_14_CORRIDOR_RADIUS_METERS;
  const isAuthorizedZone = insideDepot || insideCorridor;

  const status: RouteGeofenceEvaluation['status'] = insideDepot
    ? 'AT_JAKKUR_DEPOT'
    : insideCorridor
    ? 'INSIDE_CORRIDOR'
    : 'OUTSIDE_ROUTE_MASKED';

  const zoneLabel = insideDepot
    ? 'Jakkur Campus Depot Zone (Authorized)'
    : insideCorridor
    ? 'Route 14 Official Corridor (Authorized)'
    : 'Outside Official Corridor — Broadcast Masked';

  return {
    status,
    isAuthorizedZone,
    insideDepot,
    insideCorridor,
    depotDistanceMeters,
    corridorDistanceMeters,
    zoneLabel,
  };
}

