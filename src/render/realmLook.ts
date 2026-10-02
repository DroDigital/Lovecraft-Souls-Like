/**
 * The look of the realm the investigator is in (playtest round 32; data/looks.ts), eased as they walk
 * from one to the next (a journey under the veil arrives to it at once): the post pass's grade and its
 * palette, the moon and the ambient light, what the land fades into with distance, and (through `now`)
 * the sky's colours and the far silhouettes'. A dungeon's roofed rooms take the realm's grade in a
 * darker key. The mind's failing drains what colour the grade leaves (`apply`).
 */

import * as THREE from 'three';
import { LOOKS, lookOf, type Look } from '../data/looks';
import { NIGHT_DARK, SKY, type Vec3 } from '../data/tuning';
import type { FxParams } from './fx';
import type { PostPass } from './postPass';
import { buildRealmPalette, gradeTints } from './realmPalette';
import { worldUniforms } from './worldMaterial';

export interface RealmLook {
  /** The look now, eased from realm to realm. */
  readonly now: Look;
  /** Every realm's own, to be tuned live (the debug panel: `window.look.looks`). */
  readonly looks: typeof LOOKS;
  /** Lays this frame's: eased toward the realm's, or at once when the camera has leapt (a journey) and `snap` says so. */
  update(time: number, region: string | null, enclosed: boolean, camera?: THREE.Vector3, snap?: boolean, dark?: number): void;
  /** What a failing mind drains from the grade (after computeFx, before the reality hooks). */
  apply(fx: FxParams): void;
  /** Lays the realm's own look at once, whatever it was easing from (the debug panel and the tests). */
  snap(): void;
}

/** The night's light as this realm lays it, before the darkness hook (render/realityFx.ts) takes some away. */
export const night = { ambient: new THREE.Vector3(), moon: new THREE.Vector3() };

const lerp = (a: number, b: number, k: number): number => a + (b - a) * k;
const lerp3 = (a: Vec3, b: Vec3, k: number): Vec3 => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];

/** `from` turned toward `to` by share `k`. */
export function easeLook(from: Look, to: Look, k: number): Look {
  return {
    grade: [lerp3(from.grade[0], to.grade[0], k), lerp3(from.grade[1], to.grade[1], k), lerp3(from.grade[2], to.grade[2], k), lerp3(from.grade[3], to.grade[3], k)],
    native: lerp(from.native, to.native, k),
    accents: [lerp3(from.accents[0], to.accents[0], k), lerp3(from.accents[1], to.accents[1], k)],
    mist: lerp3(from.mist, to.mist, k),
    horizon: lerp3(from.horizon, to.horizon, k),
    zenith: lerp3(from.zenith, to.zenith, k),
    ambient: lerp3(from.ambient, to.ambient, k),
    moon: lerp3(from.moon, to.moon, k),
    moonColor: lerp3(from.moonColor, to.moonColor, k),
    haze: lerp3(from.haze, to.haze, k),
    far: lerp3(from.far, to.far, k),
    glow: lerp(from.glow, to.glow, k),
  };
}

/** The realm's look in a roofed room: the same grade, darker, the land's distance the dark of its shade. */
export function indoors(look: Look): Look {
  const dim = (c: Vec3, k: number): Vec3 => [c[0] * k, c[1] * k, c[2] * k];
  return { ...look, mist: dim(look.mist, 0.55), haze: dim(look.grade[1], 0.6), far: dim(look.far, 0.6) };
}

/** A look in the dark of the night (round 35): its sky, mist, far land and both lights turned down by how deep the dark is (0: as the realm gives them). */
export function darkened(look: Look, dark: number): Look {
  if (dark <= 0) return look;
  const by = (c: Vec3, floor: number): Vec3 => {
    const k = 1 - dark * (1 - floor);
    return [c[0] * k, c[1] * k, c[2] * k];
  };
  return { ...look, horizon: by(look.horizon, NIGHT_DARK.sky), zenith: by(look.zenith, NIGHT_DARK.sky), mist: by(look.mist, NIGHT_DARK.mist), haze: by(look.haze, NIGHT_DARK.mist), far: by(look.far, NIGHT_DARK.far), ambient: by(look.ambient, NIGHT_DARK.ambient), moon: by(look.moon, NIGHT_DARK.moon) };
}

/** How far two looks are apart, for whether the palette must be built again. */
function apart(a: Look, b: Look): number {
  let sum = Math.abs(a.native - b.native);
  const add = (p: Vec3, q: Vec3): void => void (sum += Math.abs(p[0] - q[0]) + Math.abs(p[1] - q[1]) + Math.abs(p[2] - q[2]));
  for (let i = 0; i < 4; i++) add(a.grade[i], b.grade[i]);
  add(a.accents[0], b.accents[0]);
  add(a.accents[1], b.accents[1]);
  add(a.mist, b.mist);
  return sum;
}

export function createRealmLook(post: PostPass): RealmLook {
  let eased = lookOf(null); // the realm's look, eased from realm to realm
  let now = eased; // and as the night leaves it
  let dark = 0;
  let built: Look | null = null;
  let want = eased;
  let at: readonly [string | null, boolean] = [null, false];
  let last = -1;
  const was = new THREE.Vector3(1e9, 0, 0);
  const u = post.uniforms;
  const publish = (): void => {
    now = darkened(eased, dark);
    const tints = gradeTints(eased);
    for (const [v, t] of [[u.uInk, tints[0]], [u.uShade, tints[1]], [u.uMid, tints[2]], [u.uHigh, tints[3]]] as const) v.value.set(t[0], t[1], t[2]);
    if (!built || apart(eased, built) > 0.003) {
      u.uPalette.value.set(buildRealmPalette(eased).flat());
      built = eased;
    }
    worldUniforms.uFogColor.value.set(...now.haze);
    night.ambient.set(...now.ambient);
    night.moon.set(...now.moon);
  };
  publish();
  return {
    looks: LOOKS,
    get now() {
      return now;
    },
    update(time, region, enclosed, camera, snap = false, deep = 0) {
      dark = deep;
      const leapt = !!camera && was.distanceToSquared(camera) > SKY.jump * SKY.jump;
      if (camera) was.copy(camera);
      const dt = last < 0 || leapt || snap ? 1e9 : Math.min(0.1, Math.max(0, time - last));
      last = time;
      at = [region, enclosed];
      want = enclosed ? indoors(lookOf(region)) : lookOf(region);
      eased = dt >= 1e9 ? want : easeLook(eased, want, Math.min(1, dt / SKY.fade));
      publish();
    },
    snap() {
      want = at[1] ? indoors(lookOf(at[0])) : lookOf(at[0]);
      eased = want;
      publish();
    },
    apply(fx) {
      const share = 1 - eased.native; // the grade's own share, at a lucid mind
      fx.desaturate = share + (1 - share) * fx.desaturate; // FX.desaturate: the further share a failing mind takes
    },
  };
}
