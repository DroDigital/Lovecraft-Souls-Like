/**
 * The sea's waves (round 30: the sea was a flat plane with a texture sliding over it): a handful of
 * wind waves of different lengths, heading different ways, each with the sharp crest and broad
 * trough of a real swell (h = A·exp(sin φ − 1)). One table, used twice: the shader sums them to lift the water and light it
 * (render/sea.ts), and `seaHeight` sums the same on the CPU, so a thing standing in the sea (a
 * tentacle: render/tentacles.ts) rides the water it is in. Pure but for the GLSL it writes.
 */

export interface Wave {
  dir: number; // radians, the way it travels
  length: number; // metres, crest to crest
  amp: number; // metres at the crest
  phase: number;
}

export const WAVES: readonly Wave[] = [
  { dir: 0.35, length: 38, amp: 0.5, phase: 0 },
  { dir: -0.55, length: 22, amp: 0.3, phase: 1.7 },
  { dir: 1.1, length: 12.5, amp: 0.16, phase: 4.1 },
  { dir: -1.35, length: 7, amp: 0.065, phase: 2.2 },
  { dir: 0.1, length: 3.6, amp: 0.032, phase: 5.3 },
];
export const AMP_SUM = WAVES.reduce((a, w) => a + w.amp, 0);
const SPEED = 0.6; // the share of a deep-water wave's own speed they travel at: a sea in a dream does not hurry
const omega = (w: Wave): number => Math.sqrt(9.81 * ((2 * Math.PI) / w.length)) * SPEED;

/** The water's height above the sea level at (x, z) at `time`, with the sea's `chop` (1: as it lies; more in a gale). */
export function seaHeight(x: number, z: number, time: number, chop = 1): number {
  let h = 0;
  for (const w of WAVES) {
    const k = (2 * Math.PI) / w.length;
    const phi = k * (Math.cos(w.dir) * x + Math.sin(w.dir) * z) + omega(w) * time + w.phase;
    h += w.amp * Math.exp(Math.sin(phi) - 1);
  }
  return h * chop - 0.5 * AMP_SUM * 0.35 * chop; // about the sea level, as a mean
}

const f = (n: number): string => n.toFixed(5);

/** GLSL: `vec3 seaWave(vec2 p)` gives (height, d/dx, d/dz) of the same sum, at `uTime`, before `uChop`. */
export const WAVES_GLSL = /* glsl */ `
vec3 seaWave(vec2 p) {
  vec3 s = vec3(0.0);
${WAVES.map((w) => {
  const k = (2 * Math.PI) / w.length;
  return `  { float phi = ${f(k * Math.cos(w.dir))} * p.x + ${f(k * Math.sin(w.dir))} * p.y + ${f(omega(w))} * uTime + ${f(w.phase)};
    float h = ${f(w.amp)} * exp(sin(phi) - 1.0); float dh = h * cos(phi);
    s += vec3(h, dh * ${f(k * Math.cos(w.dir))}, dh * ${f(k * Math.sin(w.dir))}); }`;
}).join('\n')}
  return s;
}
`;
