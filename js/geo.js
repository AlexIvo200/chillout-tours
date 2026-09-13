// Геометрия карты: проекция lon/lat в плоскость сцены, point-in-polygon, кластеры остановок.
export const MAP_ORIGIN = Object.freeze({ lat: 42.25, lon: 43.45 });
export const MAP_SCALE = 9;
const LON_FACTOR = Math.cos((MAP_ORIGIN.lat * Math.PI) / 180);

export function project(lon, lat) {
  return {
    x: (lon - MAP_ORIGIN.lon) * LON_FACTOR * MAP_SCALE,
    z: -(lat - MAP_ORIGIN.lat) * MAP_SCALE,
  };
}

export function unproject(x, z) {
  return {
    lon: x / (LON_FACTOR * MAP_SCALE) + MAP_ORIGIN.lon,
    lat: -z / MAP_SCALE + MAP_ORIGIN.lat,
  };
}

/** Ray casting. ring: массив [lon, lat]. */
export function pointInPolygon(lon, lat, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const crosses = yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (crosses) inside = !inside;
  }
  return inside;
}

/** Расстояние в «исправленных градусах» (долгота сжата по широте). */
export function geoDistance(a, b) {
  return Math.hypot((a.lon - b.lon) * LON_FACTOR, a.lat - b.lat);
}

function distanceToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const lengthSq = dx * dx + dy * dy;
  const t = lengthSq === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lengthSq));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/** line: массив [lon, lat]. */
export function distanceToPolyline(lon, lat, line) {
  let best = Infinity;
  for (let i = 0; i < line.length - 1; i++) {
    const [ax, ay] = line[i];
    const [bx, by] = line[i + 1];
    const d = distanceToSegment(lon * LON_FACTOR, lat, ax * LON_FACTOR, ay, bx * LON_FACTOR, by);
    if (d < best) best = d;
  }
  return best;
}

/** Склеивает близкие остановки, чтобы на карте не было наложений. Порядок сохраняется. */
export function clusterStops(stops, threshold = 0.045) {
  return stops.reduce((clusters, stop) => {
    const index = clusters.findIndex((c) => geoDistance(c.anchor, stop) < threshold);
    if (index === -1) return [...clusters, { anchor: stop, members: [stop] }];
    return clusters.map((c, i) => (i === index ? { ...c, members: [...c.members, stop] } : c));
  }, []);
}
