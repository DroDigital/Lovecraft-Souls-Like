/**
 * Pure geometry for the simulation (no Three.js): vectors, yaw angles, segment distance and
 * segment-vs-box/cylinder casts. Yaw convention: forward(yaw) = (sin yaw, cos yaw) in xz, and
 * right(yaw) = (-cos yaw, sin yaw).
 */

export interface V3 {
  x: number;
  y: number;
  z: number;
}

/** Anything with a horizontal position. */
export interface XZ {
  x: number;
  z: number;
}

const EPS = 1e-9;

export const v3 = (x = 0, y = 0, z = 0): V3 => ({ x, y, z });
export const clamp = (x: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, x));
export const dist3 = (a: V3, b: V3): number => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
export const distXZ = (a: XZ, b: XZ): number => Math.hypot(a.x - b.x, a.z - b.z);

/** Wraps an angle to [-π, π). */
export function wrapAngle(a: number): number {
  const t = (a + Math.PI) % (2 * Math.PI);
  return (t < 0 ? t + 2 * Math.PI : t) - Math.PI;
}

/** Yaw that faces along the horizontal direction (dx, dz). */
export const yawOf = (dx: number, dz: number): number => Math.atan2(dx, dz);

/** Turns `from` toward `to` by at most `maxStep` radians. */
export function turnToward(from: number, to: number, maxStep: number): number {
  return wrapAngle(from + clamp(wrapAngle(to - from), -maxStep, maxStep));
}

/** Squared distance between segments p1q1 and p2q2 (Ericson, Real-Time Collision Detection §5.1.9). */
export function segSegDist2(p1: V3, q1: V3, p2: V3, q2: V3): number {
  const d1 = { x: q1.x - p1.x, y: q1.y - p1.y, z: q1.z - p1.z };
  const d2 = { x: q2.x - p2.x, y: q2.y - p2.y, z: q2.z - p2.z };
  const r = { x: p1.x - p2.x, y: p1.y - p2.y, z: p1.z - p2.z };
  const dot = (a: V3, b: V3): number => a.x * b.x + a.y * b.y + a.z * b.z;
  const a = dot(d1, d1);
  const e = dot(d2, d2);
  const f = dot(d2, r);
  let s = 0;
  let t = 0;
  if (a > EPS || e > EPS) {
    if (a <= EPS) {
      t = clamp(f / e, 0, 1);
    } else {
      const c = dot(d1, r);
      if (e <= EPS) {
        s = clamp(-c / a, 0, 1);
      } else {
        const b = dot(d1, d2);
        const denom = a * e - b * b;
        s = denom > EPS ? clamp((b * f - c * e) / denom, 0, 1) : 0;
        t = (b * s + f) / e;
        if (t < 0) {
          t = 0;
          s = clamp(-c / a, 0, 1);
        } else if (t > 1) {
          t = 1;
          s = clamp((b - c) / a, 0, 1);
        }
      }
    }
  }
  const dx = r.x + d1.x * s - d2.x * t;
  const dy = r.y + d1.y * s - d2.y * t;
  const dz = r.z + d1.z * s - d2.z * t;
  return dx * dx + dy * dy + dz * dz;
}

/** First contact of the segment o → o + d with an axis-aligned box, as a fraction in [0, 1]; Infinity if none. */
export function segmentBox(o: V3, d: V3, min: V3, max: V3): number {
  let t0 = 0;
  let t1 = 1;
  for (const k of ['x', 'y', 'z'] as const) {
    if (Math.abs(d[k]) < EPS) {
      if (o[k] < min[k] || o[k] > max[k]) return Infinity;
      continue;
    }
    let ta = (min[k] - o[k]) / d[k];
    let tb = (max[k] - o[k]) / d[k];
    if (ta > tb) [ta, tb] = [tb, ta];
    t0 = Math.max(t0, ta);
    t1 = Math.min(t1, tb);
    if (t0 > t1) return Infinity;
  }
  return t0;
}

/** Same for a vertical cylinder (axis along y from y0 to y1), including its top cap. */
export function segmentCylinder(o: V3, d: V3, cx: number, cz: number, r: number, y0: number, y1: number): number {
  const ox = o.x - cx;
  const oz = o.z - cz;
  const c = ox * ox + oz * oz - r * r;
  let t = 0;
  if (c > 0) {
    const a = d.x * d.x + d.z * d.z;
    const b = 2 * (ox * d.x + oz * d.z);
    const disc = b * b - 4 * a * c;
    if (a < EPS || disc < 0) return Infinity;
    t = (-b - Math.sqrt(disc)) / (2 * a);
    if (t < 0 || t > 1) return Infinity;
  }
  const y = o.y + d.y * t;
  if (y >= y0 && y <= y1) return t;
  if (y > y1 && d.y < 0) {
    // Enters from above: through the top cap?
    const tc = (y1 - o.y) / d.y;
    const px = ox + d.x * tc;
    const pz = oz + d.z * tc;
    if (tc >= t && tc <= 1 && px * px + pz * pz <= r * r) return tc;
  }
  return Infinity;
}
