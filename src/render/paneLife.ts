/**
 * Lit windows that are lived behind (playtest round 18: a town's windows glowed on and on and nothing
 * stirred behind them): each lit pane has its own seed, and by it some are put out for a spell and
 * lit again, some dim for a moment as someone passes the lamp inside, and some waver as a candle
 * does. Round 26: and as the night wears on the windows go out, the last seeds first (systems/clock.ts:
 * all lit in the gloaming, a third in the hour before the dawn that does not come, lit again at the
 * turn). The same rule twice, kept alike: here for the window's light and halo (worldLights.ts), and
 * as GLSL for its glass (shaders/world.ts, PANES).
 */

import { windowShare, phaseOf } from '../systems/clock';
import { CLOCK } from '../data/tuning';

const fract = (x: number): number => x - Math.floor(x);
const smoothstep = (a: number, b: number, x: number): number => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** How lit a pane of seed `s` (0..1) is at `t` seconds: 1 fully, 0 put out. */
export function paneLit(s: number, t: number): number {
  let lit = 1 - 0.08 * (0.5 + 0.5 * Math.sin(t * (5 + 4 * s) + s * 40)) * (fract(s * 7) < 0.5 ? 0 : 1); // a candle's waver
  if (s < 0.4) {
    const ph = fract(t / (70 + s * 275) + s * 3.1); // put out for a quarter of a minute or two
    lit *= 1 - smoothstep(0.55, 0.556, ph) * (1 - smoothstep(0.8, 0.806, ph));
  }
  if (fract(s * 13) < 0.3) {
    const q = fract(t / (18 + s * 20) + s * 5); // someone passes the lamp
    lit *= 1 - 0.55 * smoothstep(0, 0.02, q) * (1 - smoothstep(0.05, 0.07, q));
  }
  return lit * (1 - smoothstep(windowShare(phaseOf(t)), windowShare(phaseOf(t)) + 0.03, s)); // the night has put it out
}

export const PANE_GLSL = /* glsl */ `
float windowShare(float t) {
  float p = fract(t / ${CLOCK.night.toFixed(1)} + ${CLOCK.start.toFixed(4)});
  if (p < 0.14) return 1.0;
  if (p < 0.7) return 1.0 - 0.3 * smoothstep(0.14, 0.7, p);
  if (p < 0.96) return 0.7 - 0.4 * smoothstep(0.7, 0.96, p);
  return 0.3 + 0.7 * smoothstep(0.96, 1.0, p);
}
float paneLit(float s, float t) {
  float lit = 1.0 - 0.08 * (0.5 + 0.5 * sin(t * (5.0 + 4.0 * s) + s * 40.0)) * step(0.5, fract(s * 7.0));
  if (s < 0.4) {
    float ph = fract(t / (70.0 + s * 275.0) + s * 3.1);
    lit *= 1.0 - smoothstep(0.55, 0.556, ph) * (1.0 - smoothstep(0.8, 0.806, ph));
  }
  if (fract(s * 13.0) < 0.3) {
    float q = fract(t / (18.0 + s * 20.0) + s * 5.0);
    lit *= 1.0 - 0.55 * smoothstep(0.0, 0.02, q) * (1.0 - smoothstep(0.05, 0.07, q));
  }
  float share = windowShare(t);
  return lit * (1.0 - smoothstep(share, share + 0.03, s));
}
// Someone behind the glass (round 35): in some windows only, and only for a few seconds in a long round, a dark shape of a head and shoulders crosses the lit pane and is gone. Not to be seen unless looked for.
float paneFigure(float s, float t, vec2 uv) {
  if (fract(s * 5.0) > 0.2) return 1.0;
  float q = fract(t / (95.0 + s * 160.0) + s * 9.0);
  float span = 0.04;
  if (q > span) return 1.0;
  float k = q / span;
  float x = mix(0.2, 0.8, k);
  if (fract(s * 3.0) > 0.5) x = 1.0 - x;
  float bob = 0.012 * sin(k * 20.0);
  float dx = uv.x - x;
  float head = 1.0 - smoothstep(0.07, 0.1, length(vec2(dx * 1.3, uv.y - 0.64 - bob)));
  float body = 1.0 - smoothstep(0.16, 0.2, length(vec2(dx * 0.85, (uv.y - 0.18) * 1.4)));
  float seen = smoothstep(0.0, 0.14, k) * (1.0 - smoothstep(0.86, 1.0, k));
  return 1.0 - 0.8 * max(head, body) * seen;
}
`;
