/**
 * The realms' far silhouettes (playtest round 12; data/skylines.ts): Kadath's crowned peak, the
 * Mountains of Madness, R'lyeh's city, Yuggoth's towers, the Round Hills, the great horrors that stand on the
 * horizon (round 26: they breathe, their halos and eyes in titanGlow.ts), and (round 31) the
 * neighbouring towns of the waking world, Devil Reef and the rest. The camera's far plane is 140 m,
 * so each is drawn just inside it, after the sky and behind everything else: a flat shape in its
 * realm's colour (data/looks.ts), darker than the haze, its foot fading into it, at the bearing of
 * where it truly stands, sized to the angle it would fill from there (so it drifts as the investigator
 * walks, no more than a far thing would), up to SKY.farAngle; a town has a few windows lit. Each
 * realm's fade in as it is entered; a dungeon's walls hide them. A failing mind sees a city of towers
 * where there is none (`wrong`). Render only.
 */

import * as THREE from 'three';
import { createRng } from '../core/rng';
import { getRegion } from '../data/regions';
import { SKYLINES, type Silhouette } from '../data/skylines';
import { RENDER, SKY } from '../data/tuning';
import { regionRect } from '../world/worldMap';
import { ANOMALY } from './palette';
import type { RealmLook } from './realmLook';
import { profile } from './skylineShapes';
import { titanGlow, type TitanGlow } from './titanGlow';

const R = RENDER.far * 0.7; // metres from the camera they are drawn at
const SAMPLES = 300;
const TALLEST = Math.tan((SKY.farAngle * Math.PI) / 180); // height over distance at the most
const GLOWS = { amber: [1, 0.78, 0.46], cyan: [0.5, 0.95, 1], gold: [1, 0.86, 0.5] } as const;

const VERT = 'varying float vUp; varying vec2 vPos; void main() { vUp = position.y; vPos = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }';
const FRAG = `uniform vec3 uColor; uniform vec3 uHorizon; uniform vec3 uGlow; uniform float uFade; uniform float uAlpha; uniform float uLit; varying float vUp; varying vec2 vPos;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
void main() {
  vec3 col = mix(uColor, uHorizon, uFade);
  float a = uAlpha * mix(0.12, 1.0, smoothstep(-0.05, ${SKY.farFoot.toFixed(3)}, vUp));
  if (uLit > 0.0) { // a window is a cell of the mass, lit by chance, most of them in its lower half
    float on = step(1.0 - uLit * smoothstep(0.03, 0.14, vUp) * (1.0 - smoothstep(0.3, 0.85, vUp)), hash(floor(vec2(vPos.x * 420.0, vPos.y * 90.0))));
    col = mix(col, uGlow, on);
    a = mix(a, uAlpha, on);
  }
  gl_FragColor = vec4(col, a);
}`;

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

/** The shader material every silhouette is drawn with: its realm's colour, melted `fade` toward the horizon's, `lit` of its windows aglow in `glow`. */
function silhouetteMaterial(tone: THREE.Vector3, horizon: THREE.Vector3, alpha: { value: number }, def: Pick<Silhouette, 'glow' | 'fade' | 'lit'>): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: { uColor: { value: tone }, uHorizon: { value: horizon }, uGlow: { value: new THREE.Vector3(...GLOWS[def.glow ?? 'amber']) }, uFade: { value: def.fade ?? 0 }, uLit: { value: def.lit ?? 0 }, uAlpha: alpha },
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
}

export function createSkyline(scene: THREE.Scene, look: RealmLook): Skyline {
  const tone = new THREE.Vector3(...look.now.far);
  const horizon = new THREE.Vector3(...look.now.horizon);
  const alpha = new Map<string, { value: number }>();
  const fars: Far[] = [];
  for (const [id, list] of Object.entries(SKYLINES)) {
    const region = getRegion(id);
    if (!region) continue;
    const a = { value: 0 };
    alpha.set(id, a);
    const rc = regionRect(region);
    for (const def of list) {
      const material = silhouetteMaterial(tone, horizon, a, def);
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
  const fakeMesh = new THREE.Mesh(shape(fakeDef), silhouetteMaterial(tone, horizon, fake, {}));
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
      tone.set(...look.now.far); // the realm's, already eased (render/realmLook.ts)
      horizon.set(...look.now.horizon);
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
