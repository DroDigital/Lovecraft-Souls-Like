/**
 * The realms' far silhouettes (playtest round 12; data/skylines.ts): Kadath's crowned peak, the
 * Mountains of Madness, R'lyeh's city, Yuggoth's towers, the Round Hills. The camera's far plane is
 * 90 m, so each is drawn just inside it, after the sky and behind everything else: a flat shape
 * darker than the haze, its foot fading into it, at the bearing of where it truly stands, sized to
 * the angle it would fill from there (so it drifts as the investigator walks, no more than a far thing
 * would), up to SKY.farAngle. Each realm's fade in as it is entered; a dungeon's walls hide them.
 * Render only.
 */

import * as THREE from 'three';
import { createRng, type Rng } from '../core/rng';
import { getRegion } from '../data/regions';
import { SKYLINES, type Silhouette, type SilhouetteKind } from '../data/skylines';
import { FX, RENDER, SKY } from '../data/tuning';
import { regionRect } from '../world/worldMap';
import { ANOMALY } from './palette';
import { titanGlow, type TitanGlow } from './titanGlow';

const R = RENDER.far * 0.7; // metres from the camera they are drawn at
const SAMPLES = 260;
const TALLEST = Math.tan((SKY.farAngle * Math.PI) / 180); // height over distance at the most

const VERT = 'varying float vUp; void main() { vUp = position.y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }';
const FRAG = `uniform vec3 uColor; uniform float uAlpha; varying float vUp;
void main() { gl_FragColor = vec4(uColor, uAlpha * mix(0.12, 1.0, smoothstep(-0.05, ${SKY.farFoot.toFixed(3)}, vUp))); }`;

/** Height (share of the silhouette's) along its width, x from −0.5 to 0.5. */
function profile(kind: SilhouetteKind, rng: Rng): (x: number) => number {
  const r = (lo: number, hi: number): number => lo + (hi - lo) * rng();
  const bumps = Array.from({ length: 64 }, () => rng());
  const rough = (x: number, k: number): number => bumps[Math.floor((x + 0.5) * 63.99)] * k;
  switch (kind) {
    case 'peak': { // one great mountain, a castle of towers on its summit
      const towers = [0.93, 0.87, 1, 0.9, 0.96, 0.85];
      return (x) => {
        if (Math.abs(x) < 0.08) return towers[Math.min(5, Math.floor(((x + 0.08) / 0.16) * 6))];
        const t = 1 - (Math.abs(x) - 0.08) / 0.42;
        return 0.84 * Math.max(0, t) ** 1.7 + rough(x, 0.03);
      };
    }
    case 'range': { // peaks upon peaks, cubes on the highest (the Elder Things' ramparts)
      const peaks = Array.from({ length: 8 }, () => ({ c: r(-0.45, 0.45), h: r(0.35, 1), w: r(0.05, 0.13) }));
      const cubes = [...peaks].sort((a, b) => b.h - a.h).slice(0, 3);
      return (x) => {
        let y = 0.06 + rough(x, 0.02);
        for (const p of peaks) y = Math.max(y, p.h * Math.max(0, 1 - Math.abs(x - p.c) / p.w) ** 0.9);
        for (const p of cubes) if (Math.abs(x - p.c) < 0.012) y = Math.max(y, p.h + 0.07);
        return y;
      };
    }
    case 'city': { // a black mass of masonry, and spires leaning out of it at every angle
      const spires = Array.from({ length: 22 }, () => ({ c: r(-0.46, 0.46), h: r(0.35, 1), w: r(0.008, 0.03) }));
      return (x) => {
        let y = 0.22 + rough(x, 0.08) * (1 - Math.abs(x) * 1.6);
        for (const s of spires) y = Math.max(y, s.h * Math.max(0, 1 - Math.abs(x - s.c) / s.w) ** 0.35);
        return Math.max(0, y);
      };
    }
    case 'towers': { // Yuggoth's: windowless, in terraces
      const towers = Array.from({ length: 14 }, () => ({ c: r(-0.45, 0.45), h: r(0.3, 1), w: r(0.012, 0.03) }));
      return (x) => {
        let y = 0.08 + rough(x, 0.03);
        for (const t of towers) {
          const d = Math.abs(x - t.c);
          y = Math.max(y, d < t.w ? t.h * 0.85 : 0, d < t.w * 0.6 ? t.h : 0, d < t.w * 0.25 ? t.h * 1.1 : 0);
        }
        return y;
      };
    }
    case 'titan': { // a great shape, hunched, its wings half open and a crown of feelers on its head
      const r2 = (lo: number, hi: number): number => lo + (hi - lo) * rng();
      const feelers = Array.from({ length: 7 }, (_, i) => ({ c: -0.045 + i * 0.015, h: r2(0.05, 0.16), w: r2(0.004, 0.009) }));
      return (x) => {
        const a = Math.abs(x);
        let y = 0.7 * Math.exp(-((x / 0.17) ** 2)); // the shoulders
        y = Math.max(y, 0.82 * Math.exp(-(((x - 0.02) / 0.06) ** 2))); // the head, bowed a little to one side
        for (const f of feelers) {
          const d = Math.abs(x - 0.02 - f.c);
          if (d < f.w) y = Math.max(y, 0.8 + f.h * (1 - d / f.w));
        }
        const wing = a > 0.15 && a < 0.47 ? 0.9 * Math.max(0, 1 - Math.abs(a - 0.27) / 0.22) ** 1.3 * (0.88 + 0.2 * Math.sin(a * 140)) : 0; // the wings, their edges torn
        return Math.max(y, wing, 0.08 + rough(x, 0.03));
      };
    }
    case 'hills': { // round hills, standing stones on the highest
      const hills = Array.from({ length: 6 }, () => ({ c: r(-0.4, 0.4), h: r(0.4, 1), s: r(0.08, 0.16) }));
      const top = hills.reduce((a, b) => (b.h > a.h ? b : a));
      return (x) => {
        let y = 0;
        for (const h of hills) y = Math.max(y, h.h * Math.exp(-(((x - h.c) / h.s) ** 2)));
        for (let k = -2; k <= 2; k++) if (Math.abs(x - (top.c + k * 0.006)) < 0.0015) y += 0.05;
        return y;
      };
    }
  }
}

/** The silhouette's shape, a unit wide and a unit tall at most, its foot at the origin. */
function shape(s: Silhouette): THREE.ShapeGeometry {
  const f = profile(s.kind, createRng(s.seed));
  const outline = new THREE.Shape();
  outline.moveTo(-0.5, -0.05);
  for (let i = 0; i <= SAMPLES; i++) {
    const x = -0.5 + i / SAMPLES;
    outline.lineTo(x, Math.max(0, Math.min(1.1, f(x))));
  }
  outline.lineTo(0.5, -0.05);
  return new THREE.ShapeGeometry(outline);
}

interface Far {
  mesh: THREE.Mesh;
  region: string;
  x: number;
  z: number;
  base: number;
  def: Silhouette;
  glow?: TitanGlow; // a titan's halo and eyes
}

export interface Skyline {
  update(camera: THREE.Camera, time: number, region: string | null, enclosed: boolean): void;
  /** How wrong the mind is, 0..1 (round 26): past 0.6, now and then, something stands on the horizon where nothing does, and is gone when looked for. */
  wrong(amount: number): void;
}

/** How much of the false landmark shows at `amount` of madness `since` seconds into its turn (it comes up slowly and goes at once). */
export const falseShown = (amount: number, since: number): number => Math.max(0, Math.min(1, (amount - 0.55) / 0.3)) * (since < 0 ? 0 : since < 6 ? since / 6 : since < 14 ? 1 : 0);

export function createSkyline(scene: THREE.Scene): Skyline {
  const tone = new THREE.Vector3(...FX.fogColor).multiplyScalar(0.5);
  const alpha = new Map<string, { value: number }>();
  const fars: Far[] = [];
  for (const [id, list] of Object.entries(SKYLINES)) {
    const region = getRegion(id);
    if (!region) continue;
    const a = { value: 0 };
    alpha.set(id, a);
    const material = new THREE.ShaderMaterial({
      uniforms: { uColor: { value: tone }, uAlpha: a },
      vertexShader: VERT,
      fragmentShader: FRAG,
      // Drawn with the opaque, so its render order puts it after the sky and before the world (round
      // 19: as a transparent it came after the world and, testing no depth, was painted over it, the
      // investigator and all, the mist ghosting what it hid): blended over the sky by hand, the sky's
      // alpha kept.
      blending: THREE.CustomBlending,
      blendSrc: THREE.SrcAlphaFactor,
      blendDst: THREE.OneMinusSrcAlphaFactor,
      blendSrcAlpha: THREE.ZeroFactor,
      blendDstAlpha: THREE.OneFactor,
      depthTest: false,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const rc = regionRect(region);
    for (const def of list) {
      const mesh = new THREE.Mesh(shape(def), material);
      mesh.renderOrder = -999; // after the sky, before the world
      mesh.frustumCulled = false;
      mesh.visible = false;
      scene.add(mesh);
      const glow = def.kind === 'titan' ? titanGlow(a, [...[ANOMALY.green, ANOMALY.purple, ANOMALY.magenta][def.seed % 3]] as [number, number, number], def.seed) : undefined;
      if (glow) mesh.add(glow.halo, glow.eyes);
      fars.push({ mesh, region: id, x: rc.x0 + def.at[0], z: rc.z0 + def.at[1], base: region.biome.base - 2, def, glow });
    }
  }
  const cam = new THREE.Vector3();
  let last = -1;
  // The false landmark: a city of towers where there is none, risen for a while at a bearing of its own.
  const fake = { value: 0 };
  const fakeDef: Silhouette = { kind: 'towers', at: [0, 0], width: 700, height: 240, seed: 97 };
  const fakeMesh = new THREE.Mesh(shape(fakeDef), new THREE.ShaderMaterial({ uniforms: { uColor: { value: tone }, uAlpha: fake }, vertexShader: VERT, fragmentShader: FRAG, blending: THREE.CustomBlending, blendSrc: THREE.SrcAlphaFactor, blendDst: THREE.OneMinusSrcAlphaFactor, blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor, depthTest: false, depthWrite: false, side: THREE.DoubleSide }));
  fakeMesh.renderOrder = -999;
  fakeMesh.frustumCulled = false;
  fakeMesh.visible = false;
  scene.add(fakeMesh);
  let [madness, turnAt, bearing] = [0, -Infinity, 0];
  return {
    wrong(amount) {
      madness = amount;
    },
    update(camera, time, region, enclosed) {
      const dt = last < 0 ? 1 : Math.min(0.1, Math.max(0, time - last));
      last = time;
      const k = Math.min(1, dt / SKY.fade);
      for (const [id, a] of alpha) a.value += ((!enclosed && id === region ? 1 : 0) - a.value) * k;
      camera.getWorldPosition(cam);
      if (madness < 0.55 || enclosed) fake.value = 0;
      else {
        if (time - turnAt > 14 + 10 * Math.random() && time - turnAt > 14) [turnAt, bearing] = [time, Math.random() * Math.PI * 2]; // a new one, somewhere else
        fake.value = falseShown(madness, time - turnAt);
      }
      fakeMesh.visible = fake.value > 0.01;
      if (fakeMesh.visible) {
        const s = R / 2500;
        fakeMesh.position.set(cam.x + Math.sin(bearing) * R, cam.y - 6, cam.z + Math.cos(bearing) * R);
        fakeMesh.scale.set(fakeDef.width * s * 6, fakeDef.height * s * 6, 1);
        fakeMesh.rotation.set(0, Math.atan2(-Math.sin(bearing), -Math.cos(bearing)), 0);
      }
      for (const f of fars) {
        const [dx, dz] = [f.x - cam.x, f.z - cam.z];
        const d = Math.hypot(dx, dz);
        f.mesh.visible = alpha.get(f.region)!.value > 0.01 && d > R * 1.5;
        if (!f.mesh.visible) continue;
        const [ux, uz, s] = [dx / d, dz / d, R / Math.max(d, f.def.height / TALLEST)];
        f.mesh.position.set(cam.x + ux * R, cam.y + (f.base - cam.y) * s, cam.z + uz * R);
        f.glow?.blink(time);
        const breath = f.def.kind === 'titan' ? 1 + 0.012 * Math.sin(time * 0.35 + f.def.seed) : 1; // the great ones breathe: slowly, and not quite as a thing should
        f.mesh.scale.set(f.def.width * s * (2 - breath), f.def.height * s * breath, 1);
        f.mesh.rotation.set(0, Math.atan2(-ux, -uz), 0);
      }
    },
  };
}
