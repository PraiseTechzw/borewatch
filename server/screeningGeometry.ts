export type GeoGeometry = { type: string; coordinates?: unknown; geometries?: GeoGeometry[] };
type GeoFeature = { type: "Feature"; geometry: GeoGeometry | null };
export type GeoJsonInput = GeoGeometry | GeoFeature | { type: "FeatureCollection"; features: GeoFeature[] };
export function parseGeoJson(value: string): GeoJsonInput {
  let parsed: unknown;
  try { parsed = JSON.parse(value); } catch { throw new Error("Layer data must be valid GeoJSON"); }
  const validPosition = (position: unknown): position is number[] => Array.isArray(position) && position.length >= 2 && typeof position[0] === "number" && typeof position[1] === "number" && Number.isFinite(position[0]) && Number.isFinite(position[1]) && position[0] >= -180 && position[0] <= 180 && position[1] >= -90 && position[1] <= 90;
  const validGeometry = (geometry: unknown): geometry is GeoGeometry => {
    if (!geometry || typeof geometry !== "object") return false;
    const item = geometry as GeoGeometry;
    if (item.type === "GeometryCollection") return Array.isArray(item.geometries) && item.geometries.every(validGeometry);
    const c = item.coordinates as any;
    switch (item.type) {
      case "Point": return validPosition(c);
      case "MultiPoint": return Array.isArray(c) && c.every(validPosition);
      case "LineString": return Array.isArray(c) && c.length >= 2 && c.every(validPosition);
      case "MultiLineString": return Array.isArray(c) && c.every((line) => Array.isArray(line) && line.length >= 2 && line.every(validPosition));
      case "Polygon": return Array.isArray(c) && c.length > 0 && c.every((ring) => Array.isArray(ring) && ring.length >= 4 && ring.every(validPosition) && JSON.stringify(ring[0]) === JSON.stringify(ring[ring.length - 1]));
      case "MultiPolygon": return Array.isArray(c) && c.length > 0 && c.every((polygon) => Array.isArray(polygon) && polygon.length > 0 && polygon.every((ring) => Array.isArray(ring) && ring.length >= 4 && ring.every(validPosition) && JSON.stringify(ring[0]) === JSON.stringify(ring[ring.length - 1])));
      default: return false;
    }
  };
  const item = parsed as { type?: string; geometry?: unknown; features?: unknown[] };
  if (item?.type === "FeatureCollection" && Array.isArray(item.features) && item.features.every((feature) => (feature as GeoFeature)?.type === "Feature" && ((feature as GeoFeature).geometry === null || validGeometry((feature as GeoFeature).geometry)))) return parsed as GeoJsonInput;
  if (item?.type === "Feature" && (item.geometry === null || validGeometry(item.geometry))) return parsed as GeoJsonInput;
  if (validGeometry(parsed)) return parsed;
  throw new Error("Layer must be a GeoJSON geometry, Feature or FeatureCollection with valid WGS84 coordinates");
}
const radians = (degrees: number) => degrees * Math.PI / 180;
function pointDistanceMeters(a: number[], b: number[]) {
  const lat1 = radians(a[1]); const lat2 = radians(b[1]); const dLat = lat2 - lat1; const dLon = radians(b[0] - a[0]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 6371008.8 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}
function pointSegmentDistanceMeters(point: number[], a: number[], b: number[]) {
  const lat0 = radians(point[1]); const scaleX = 6371008.8 * Math.cos(lat0) * Math.PI / 180; const scaleY = 6371008.8 * Math.PI / 180;
  const ax = (a[0] - point[0]) * scaleX; const ay = (a[1] - point[1]) * scaleY; const bx = (b[0] - point[0]) * scaleX; const by = (b[1] - point[1]) * scaleY;
  const dx = bx - ax; const dy = by - ay; const t = Math.max(0, Math.min(1, -(ax * dx + ay * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(ax + t * dx, ay + t * dy);
}
function pointInRing(point: number[], ring: number[][]) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]; const [xj, yj] = ring[j];
    const crosses = (yi > point[1]) !== (yj > point[1]) && point[0] < (xj - xi) * (point[1] - yi) / (yj - yi || Number.EPSILON) + xi;
    if (crosses) inside = !inside;
  }
  return inside;
}
function distanceToGeometry(point: number[], geometry: GeoGeometry): number {
  const c = geometry.coordinates as any;
  const lines: number[][][] = []; let best = Number.POSITIVE_INFINITY;
  const addLine = (line: number[][]) => { if (line.length === 1) best = Math.min(best, pointDistanceMeters(point, line[0])); else for (let i = 1; i < line.length; i++) best = Math.min(best, pointSegmentDistanceMeters(point, line[i - 1], line[i])); lines.push(line); };
  switch (geometry.type) {
    case "Point": return pointDistanceMeters(point, c);
    case "MultiPoint": return Math.min(...(c as number[][]).map((p) => pointDistanceMeters(point, p)));
    case "LineString": addLine(c); break;
    case "MultiLineString": for (const line of c as number[][][]) addLine(line); break;
    case "Polygon": {
      const rings = c as number[][][];
      if (rings.length && pointInRing(point, rings[0]) && !rings.slice(1).some((ring) => pointInRing(point, ring))) return 0;
      for (const ring of rings) addLine(ring); break;
    }
    case "MultiPolygon": for (const poly of c as number[][][][]) { if (poly.length && pointInRing(point, poly[0]) && !poly.slice(1).some((ring) => pointInRing(point, ring))) return 0; for (const ring of poly) addLine(ring); } break;
    case "GeometryCollection": return Math.min(...(geometry.geometries ?? []).map((item) => distanceToGeometry(point, item)));
    default: return Number.POSITIVE_INFINITY;
  }
  return best;
}
export function geoJsonDistanceMeters(point: number[], value: unknown): number {
  const data = value as any;
  if (data?.type === "FeatureCollection") { const distances = (data.features ?? []).filter((feature: any) => feature.geometry).map((feature: any) => distanceToGeometry(point, feature.geometry)); return distances.length ? Math.min(...distances) : Number.POSITIVE_INFINITY; }
  if (data?.type === "Feature") return data.geometry ? distanceToGeometry(point, data.geometry) : Number.POSITIVE_INFINITY;
  return distanceToGeometry(point, data);
}

