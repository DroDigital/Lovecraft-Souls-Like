/**
 * A floor's inlay drawn (playtest round 32; world/roomStyle.ts says where each lies): a flat piece laid
 * over the slabs, drawn nearer than them as a trim is on a wall (the `+` groups of siteMeshes.ts): the
 * wall's own stone paler or darker, a carpet (each kit's own colour, round 30's choices), or a gilt
 * border. Its top only (it is four centimetres deep), cut into metre cells so that the lamps' light
 * crosses it as it does the floor. Render only.
 */

import * as THREE from 'three';
import { KITS, type DungeonKit } from '../data/kits';
import type { Part } from '../world/dungeonParts';
import { tint, worldUv } from './meshKit';
import { scaleRgb, type Rgb } from './palette';

const RUG: Rgb = [0.5, 0.13, 0.15];
const GILT: Rgb = [0.72, 0.56, 0.24];
const CARPET: Partial<Record<string, Rgb>> = {
  library: [0.5, 0.17, 0.16], church: [0.34, 0.2, 0.44], marble: [0.2, 0.27, 0.5], townhouse: [0.3, 0.42, 0.32], timber: [0.5, 0.36, 0.2], dream: [0.95, 0.78, 0.4],
};

/** The inlay `p` in the colours of its kit (`c`: the kit's stone), UVs counted from `at`; `kind` says which group draws it. */
export function floorInlay(p: Part, c: Rgb, kit: DungeonKit, at: { x: number; z: number }): { kind: 'trim' | 'cloth'; geo: THREE.BufferGeometry } {
  const tone = p.tone ?? 'dark';
  const carpet = CARPET[Object.entries(KITS).find(([, k]) => k === kit)?.[0] ?? ''] ?? RUG;
  const colour = tone === 'rug' ? carpet : tone === 'gilt' ? GILT : scaleRgb(c, tone === 'pale' ? 1.25 : 0.5);
  const flat = p.shape === 'cyl'
    ? new THREE.RingGeometry(p.inner ?? 0.05, p.radius, Math.max(16, Math.round(p.radius * 6)), Math.max(1, Math.ceil(p.radius - (p.inner ?? 0.05)))).translate(p.x, -p.z, p.y1) // laid flat by the turn below, which takes (x, y, z) to (x, z, -y)
    : new THREE.PlaneGeometry(p.max.x - p.min.x, p.max.z - p.min.z, Math.max(1, Math.ceil(p.max.x - p.min.x)), Math.max(1, Math.ceil(p.max.z - p.min.z))).translate((p.min.x + p.max.x) / 2, -(p.min.z + p.max.z) / 2, p.max.y);
  return { kind: tone === 'rug' || tone === 'gilt' ? 'cloth' : 'trim', geo: tint(worldUv(flat.rotateX(-Math.PI / 2), at), colour) };
}
