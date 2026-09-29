/**
 * Meshes for the world's sites (spec §3D): a legacy dungeon from its kit parts (stone walls with
 * their plinths, cornices, pilasters, sconces and rubble; blocks, pillars with bases and capitals,
 * and well rims; slab floors and steps; wooden bridge decks; dark pits and chasms seen from
 * inside), and an arena's ring of standing stones (and the well at its heart), or its style's dressing (round 13). Built a few parts at
 * a time (a sliced job). Round 12: each dungeon's kit (data/kits.ts) chooses its walls' and floors'
 * textures and tone, its trim (masonry, timber beams and posts, or none) and how many flames it holds.
 */

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { V3 } from '../core/geom';
import type { DungeonKit, KitTexture } from '../data/kits';
import { getRegion } from '../data/regions';
import { DUNGEON } from '../data/tuning';
import { kitOfRoom } from '../world/dungeonKit';
import { propJob } from './propMeshes';
import type { Part } from '../world/dungeonParts';
import { dungeonShell } from './dungeonShell';
import type { ArenaPlace, Dungeon } from '../world/placements';
import { box, tileUv, tint } from './meshKit';
import { mixRgb, scaleRgb, type Rgb } from './palette';
import type { LightSpot } from './worldLights';
import { createWorldMaterial } from './worldMaterial';

const STONE: Rgb = [0.9, 0.9, 0.88];
const WOOD: Rgb = [0.75, 0.7, 0.62];
const PER_STEP = 12;
const SLAB = 0.3; // a floor slab's depth (world/dungeonParts.ts)

type Kind = 'wall' | 'floor' | 'wood' | 'glow'; // a kit gives the first two their textures
type Built = { kind: Kind; geo: THREE.BufferGeometry; light?: LightSpot }; // a flame is a light too (worldLights.ts)
const FLAME: Rgb = [1, 0.78, 0.5];
const IRON: Rgb = [0.3, 0.29, 0.3];
const DARK_WOOD: Rgb = [0.42, 0.36, 0.3];
const materials = new Map<string, THREE.ShaderMaterial>();
const material = (texture: KitTexture | 'glow'): THREE.ShaderMaterial => {
  let m = materials.get(texture);
  if (!m) {
    const o = texture === 'glow' ? { texture: 'cloth' as const, emissive: 1 } : { texture, vary: 0.7, ...(texture === 'wood' && { uvScale: [0.5, 0.5] as const }) };
    materials.set(texture, (m = createWorldMaterial({ seed: 8, vertexColors: true, ...o })));
  }
  return m;
};
/** The texture of each kind in this kit. */
const textureOf = (k: Kind, kit: DungeonKit): KitTexture | 'glow' => (k === 'wall' ? kit.wall : k === 'floor' ? kit.floor : k);

/**
 * A wall's trim: a plinth and a cornice along it and pilasters every few metres (masonry), or a
 * skirting, a beam and posts of dark wood (timber), or none; on some of them an iron sconce with its
 * flame (the kit's share); and rubble at its foot.
 */
function wallDetail(min: V3, max: V3, c: Rgb, kit: DungeonKit): Built[] {
  const [w, h, d] = [max.x - min.x, max.y - min.y, max.z - min.z];
  if (h < 2 || Math.max(w, d) < 2) return [];
  const alongX = w >= d;
  const [len, thick] = alongX ? [w, d] : [d, w];
  const [cx, cz] = [(min.x + max.x) / 2, (min.z + max.z) / 2];
  const at = (t: number, across: number): [number, number] => (alongX ? [cx + t, cz + across] : [cx + across, cz + t]);
  const slab = (l: number, t: number, hh: number, y: number, tt: number, a = 0, tone = 1): THREE.BufferGeometry => {
    const [x, z] = at(tt, a);
    return tileUv(box(alongX ? l : t, hh, alongX ? t : l, x, y, z, scaleRgb(c, tone)), l, hh);
  };
  const stone: THREE.BufferGeometry[] = [];
  const wood: THREE.BufferGeometry[] = [];
  const trim = kit.trim === 'timber' ? wood : stone;
  const tc = kit.trim === 'timber' ? DARK_WOOD : c;
  const trimSlab = (l: number, t: number, hh: number, y: number, tt: number, tone: number): THREE.BufferGeometry => tint(slab(l, t, hh, y, tt), scaleRgb(tc, tone));
  if (kit.trim !== 'none') trim.push(trimSlab(len, thick + 0.16, 0.45, min.y + 0.22, 0, 0.8), trimSlab(len, thick + 0.12, 0.22, max.y - 0.11, 0, 0.85));
  const glow: Built[] = [];
  const n = Math.floor(len / 4);
  const seed = Math.abs(Math.round(cx * 7 + cz * 13));
  for (let k = 1; k < n && kit.trim !== 'none'; k++) {
    const t = -len / 2 + (k * len) / n;
    trim.push(trimSlab(kit.trim === 'timber' ? 0.3 : 0.5, thick + 0.3, h - 0.3, min.y + (h - 0.3) / 2, t, 0.92));
    if (((k * 7919 + seed * 104729) % 1000) / 1000 >= kit.flames) continue;
    for (const side of [-1, 1]) { // a sconce on either face
      const a = side * (thick / 2 + 0.28);
      const [x, z] = at(t, a);
      stone.push(tint(box(0.08, 0.3, 0.08, x, min.y + 2.1, z, IRON), IRON));
      glow.push({ kind: 'glow', geo: box(0.12, 0.18, 0.12, x, min.y + 2.35, z, FLAME), light: { x, y: min.y + 2.4, z, kind: 'torch' } });
    }
  }
  for (let k = 0; k < Math.floor(len / 3); k++) { // rubble fallen from it
    const r = 0.12 + ((seed * (k + 3)) % 7) * 0.03;
    const t = -len / 2 + ((seed * (k + 1) * 37) % 100) / 100 * len;
    const side = (seed + k) % 2 ? 1 : -1;
    const [x, z] = at(t, side * (thick / 2 + 0.35 + r));
    stone.push(tint(new THREE.IcosahedronGeometry(r, 0).scale(1, 0.6, 1).translate(x, min.y + r * 0.4, z), scaleRgb(c, 0.75)));
  }
  for (const g of [...stone, ...wood]) if (!g.index) g.setIndex([...Array(g.getAttribute('position').count).keys()]);
  return [...(stone.length ? [{ kind: 'wall' as const, geo: mergeGeometries(stone) }] : []), ...(wood.length ? [{ kind: 'wood' as const, geo: mergeGeometries(wood) }] : []), ...glow];
}

/**
 * An open-topped box seen from inside: a pit's four walls and its floor, in shadow. Its walls stop
 * under the floor slabs about it, whose own faces make its brim (round 19: they rose flush with
 * those faces, and the two fought, dark and pale, all along the rim).
 */
export function pit(min: V3, max: V3, c: Rgb): THREE.BufferGeometry {
  const top = max.y - SLAB;
  const [w, h, d] = [max.x - min.x, top - min.y, max.z - min.z];
  const [cx, cy, cz] = [(min.x + max.x) / 2, (min.y + top) / 2, (min.z + max.z) / 2];
  const faces = [
    new THREE.PlaneGeometry(w, h).translate(cx, cy, min.z),
    new THREE.PlaneGeometry(w, h).rotateY(Math.PI).translate(cx, cy, max.z),
    new THREE.PlaneGeometry(d, h).rotateY(Math.PI / 2).translate(min.x, cy, cz),
    new THREE.PlaneGeometry(d, h).rotateY(-Math.PI / 2).translate(max.x, cy, cz),
    new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2).translate(cx, min.y, cz),
  ];
  return tint(tileUv(mergeGeometries(faces), Math.max(w, d), h), scaleRgb(c, 0.22));
}

/** Turns a geometry's faces to look the other way (its winding and normals reversed). */
function inward(g: THREE.BufferGeometry): THREE.BufferGeometry {
  const index = g.getIndex()!;
  for (let i = 0; i < index.count; i += 3) {
    const b = index.getX(i + 1);
    index.setX(i + 1, index.getX(i + 2));
    index.setX(i + 2, b);
  }
  const n = g.getAttribute('normal');
  for (let i = 0; i < n.count; i++) n.setXYZ(i, -n.getX(i), -n.getY(i), -n.getZ(i));
  return g;
}

/**
 * A well: a stone rim knee-high above its floor, and the dark water far below. The rim has its
 * inner face down to the water (round 19: without it, the floor beyond and whatever stood there
 * showed through the far side of the rim).
 */
export function well(x: number, z: number, radius: number, top: number, c: Rgb): THREE.BufferGeometry[] {
  const rim = tint(tileUv(new THREE.CylinderGeometry(radius, radius, 0.9, 10, 1, true).translate(x, top - 0.45, z), Math.PI * 2 * radius, 0.9), c);
  const inner = tint(tileUv(inward(new THREE.CylinderGeometry(radius - 0.35, radius - 0.35, 0.6, 10, 1, true)).translate(x, top - 0.3, z), Math.PI * 2 * radius, 0.6), scaleRgb(c, 0.6));
  const lip = tint(new THREE.RingGeometry(radius - 0.35, radius, 10).rotateX(-Math.PI / 2).translate(x, top, z), c);
  const shaft = tint(new THREE.CircleGeometry(radius - 0.35, 10).rotateX(-Math.PI / 2).translate(x, top - 0.6, z), scaleRgb(c, 0.08));
  return [rim, inner, lip, shaft];
}

/**
 * A ruin's wall (round 13: the roofless dungeons stood whole to the brim): in lengths of two to four
 * metres, each broken off at its own height, the lowest a little over a man's head.
 */
function ruin(min: V3, max: V3, c: Rgb, kit: DungeonKit): Built[] {
  const [w, h, d] = [max.x - min.x, max.y - min.y, max.z - min.z];
  const alongX = w >= d;
  const len = alongX ? w : d;
  const seed = Math.abs(Math.round(min.x * 13 + min.z * 7));
  const pieces: THREE.BufferGeometry[] = [];
  let t = 0;
  for (let k = 0; t < len - 0.01; k++) {
    const l = Math.min(len - t, 2 + ((seed * (k + 5) * 31) % 100) / 50);
    const drop = (((seed + k * 7919) % 100) / 100) * Math.min(h - 2.6, 3.2);
    const hh = h - drop;
    const [cx, cz] = alongX ? [min.x + t + l / 2, (min.z + max.z) / 2] : [(min.x + max.x) / 2, min.z + t + l / 2];
    pieces.push(tileUv(box(alongX ? l : w, hh, alongX ? d : l, cx, min.y + hh / 2, cz, c, 1), l, hh));
    t += l;
  }
  return [{ kind: 'wall', geo: mergeGeometries(pieces) }, ...wallDetail(min, { ...max, y: min.y + Math.min(h, 3.4) }, c, { ...kit, trim: 'none' })];
}

function partGeometry(p: Part, c: Rgb, kit: DungeonKit): Built[] {
  if (p.shape === 'cyl') {
    if (p.look === 'rim') return well(p.x, p.z, p.radius, p.y1, c).map((geo) => ({ kind: 'wall', geo }));
    const h = p.y1 - p.y0;
    const shaft = tint(tileUv(new THREE.CylinderGeometry(p.radius * 0.88, p.radius, h, 7, Math.ceil(h)).translate(p.x, p.y0 + h / 2, p.z), Math.PI * 2 * p.radius, h), c);
    const base = tint(new THREE.CylinderGeometry(p.radius * 1.3, p.radius * 1.4, 0.4, 8).translate(p.x, p.y0 + 0.2, p.z), scaleRgb(c, 0.85));
    const capital = tint(new THREE.CylinderGeometry(p.radius * 1.35, p.radius * 1.05, 0.35, 8).translate(p.x, p.y1 - 0.17, p.z), scaleRgb(c, 0.9));
    return [{ kind: 'wall', geo: mergeGeometries([shaft, base, capital]) }];
  }
  const [w, h, d] = [p.max.x - p.min.x, p.max.y - p.min.y, p.max.z - p.min.z];
  const [x, y, z] = [(p.min.x + p.max.x) / 2, (p.min.y + p.max.y) / 2, (p.min.z + p.max.z) / 2];
  switch (p.look) {
    case 'chasm':
      return [{ kind: 'wall', geo: pit(p.min, p.max, c) }];
    case 'floor':
    case 'step':
      return [{ kind: 'floor', geo: tileUv(box(w, h, d, x, y, z, scaleRgb(c, 0.9), 1), w, d) }];
    case 'deck':
      return [{ kind: 'wood', geo: box(w, h, d, x, y, z, WOOD, 1) }];
    case 'none':
      return [];
    case 'ceiling':
      return [{ kind: kit.roof === 'beams' ? 'wood' : 'wall', geo: tileUv(box(w, h, d, x, y, z, scaleRgb(c, 0.6), 2), w, d) }];
    case 'wall':
      if (kit.roof === 'open' && h > 3) return ruin(p.min, p.max, c, kit);
      return [{ kind: 'wall', geo: tileUv(box(w, h, d, x, y, z, c, 1), Math.max(w, d), h) }, ...wallDetail(p.min, p.max, c, kit)];
    default:
      return [{ kind: 'wall', geo: tileUv(box(w, h, d, x, y, z, c, 1), Math.max(w, d), h) }];
  }
}

/** Merges geometry by material into meshes. */
function meshes(groups: Map<KitTexture | 'glow', THREE.BufferGeometry[]>): THREE.Mesh[] {
  const merge = (g: THREE.BufferGeometry[]): THREE.BufferGeometry => mergeGeometries(g.some((x) => !x.index) ? g.map((x) => (x.index ? x.toNonIndexed() : x)) : g); // the shell's pieces carry no index
  return [...groups].filter(([, g]) => g.length).map(([t, g]) => new THREE.Mesh(merge(g), material(t)));
}

/** Builds a legacy dungeon; `done` receives its meshes and its sconces' flames as lights. */
export function* dungeonJob(d: Dungeon, done: (meshes: THREE.Mesh[], lights: LightSpot[]) => void): Generator<void, void> {
  const ground = getRegion(d.layout.region)?.biome.tint ?? STONE;
  const colour = (kit: DungeonKit): Rgb => mixRgb(STONE, kit.tone ?? ground, kit.mix);
  const groups = new Map<KitTexture | 'glow', THREE.BufferGeometry[]>();
  const add = (t: KitTexture | 'glow', geo: THREE.BufferGeometry): void => void (groups.get(t)?.push(geo) ?? groups.set(t, [geo]));
  const lights: LightSpot[] = [];
  for (let k = 0; k < d.parts.length; k++) {
    const kit = kitOfRoom(d.layout, d.layout.rooms[d.parts[k].room]); // each room its own kit (round 13)
    for (const { kind, geo, light } of partGeometry(d.parts[k], colour(kit), kit)) {
      add(textureOf(kind, kit), geo);
      if (light) lights.push(light);
    }
    if (k % PER_STEP === PER_STEP - 1) yield;
  }
  for (const s of dungeonShell(d.layout, d.parts, colour)) add(s.texture, s.geo);
  const built = meshes(groups);
  const region = getRegion(d.layout.region);
  if (d.decor.length && region) yield* propJob(d.decor, region, (m, l) => void (built.push(...m), lights.push(...l))); // the boss room's heart and braziers (round 13)
  done(built, lights);
}

/** Builds an arena's ring of standing stones (and its well) and its dressing; `done` receives the meshes and the braziers' lights. */
export function* arenaJob(a: ArenaPlace, done: (meshes: THREE.Mesh[], lights: LightSpot[]) => void): Generator<void, void> {
  const c = mixRgb(STONE, getRegion(a.region)?.biome.tint ?? STONE, 0.5);
  const parts = a.stones.map((s, k) => {
    const lean = ((k * 37) % 11) / 11 - 0.5;
    return tint(tileUv(new THREE.CylinderGeometry(s.radius * 0.7, s.radius, s.height, 6, Math.ceil(s.height)).translate(0, s.height / 2 - 0.2, 0), 4, s.height), scaleRgb(c, 0.75 + 0.1 * lean))
      .rotateZ(lean * 0.12)
      .translate(s.x, a.y, s.z);
  });
  yield;
  if (a.well) parts.push(...well(a.x, a.z, DUNGEON.well + 0.35, a.y + 0.9, c));
  const out: THREE.Mesh[] = parts.length ? [new THREE.Mesh(mergeGeometries(parts), material('stone'))] : [];
  const lights: LightSpot[] = [];
  const region = getRegion(a.region);
  if (a.decor.length && region) yield* propJob(a.decor, region, (m, l) => void (out.push(...m), lights.push(...l))); // its style's ring, heart and braziers (round 13)
  done(out, lights);
}
