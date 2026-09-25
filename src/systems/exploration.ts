/**
 * What the investigator has seen of the world (playtest round 1): the ground within sight of where
 * they have walked, kept for good, cell by 16 m cell, region by region. The map draws only that;
 * the rest lies under fog. Saved packed as bits. Pure: no Three.js.
 */

import type { XZ } from '../core/geom';
import { REGIONS, type RegionDef } from '../data/regions';
import { EXPLORE } from '../data/tuning';
import { regionAt, regionRect } from '../world/worldMap';
import type { Game } from './components';

/** Seen cells by region: one byte a cell, row by row from the region's south-west corner. */
export type Explored = Map<string, Uint8Array>;

/** A region's cells across (x) and along (z). */
export function cellsOf(r: RegionDef): { cols: number; rows: number } {
  const rc = regionRect(r);
  return { cols: Math.round((rc.x1 - rc.x0) / EXPLORE.cell), rows: Math.round((rc.z1 - rc.z0) / EXPLORE.cell) };
}

function cellAt(r: RegionDef, x: number, z: number): number {
  const rc = regionRect(r);
  const { cols, rows } = cellsOf(r);
  const [ix, iz] = [Math.floor((x - rc.x0) / EXPLORE.cell), Math.floor((z - rc.z0) / EXPLORE.cell)];
  return ix < 0 || iz < 0 || ix >= cols || iz >= rows ? -1 : iz * cols + ix;
}

function cellsFor(ex: Explored, r: RegionDef): Uint8Array {
  let a = ex.get(r.id);
  if (!a) {
    const { cols, rows } = cellsOf(r);
    ex.set(r.id, (a = new Uint8Array(cols * rows)));
  }
  return a;
}

/** Whether the ground at (x, z) has been seen. */
export function isExplored(ex: Explored, x: number, z: number): boolean {
  const r = regionAt(x, z);
  const i = r ? cellAt(r, x, z) : -1;
  return i >= 0 && (ex.get(r!.id)?.[i] ?? 0) > 0;
}

/** Marks every cell whose centre lies within `radius` of `at` as seen; the regions that gained any. */
export function explore(ex: Explored, at: XZ, radius: number = EXPLORE.sight): Set<string> {
  const s = EXPLORE.cell;
  const gained = new Set<string>();
  const [x0, x1] = [Math.floor((at.x - radius) / s), Math.floor((at.x + radius) / s)];
  const [z0, z1] = [Math.floor((at.z - radius) / s), Math.floor((at.z + radius) / s)];
  for (let ix = x0; ix <= x1; ix++) {
    for (let iz = z0; iz <= z1; iz++) {
      const [cx, cz] = [(ix + 0.5) * s, (iz + 0.5) * s];
      if (Math.hypot(cx - at.x, cz - at.z) > radius) continue;
      const r = regionAt(cx, cz);
      const i = r ? cellAt(r, cx, cz) : -1;
      if (i < 0) continue;
      const cells = cellsFor(ex, r!);
      if (cells[i]) continue;
      cells[i] = 1;
      gained.add(r!.id);
    }
  }
  return gained;
}

/** The share (0..1) of a region seen. */
export function exploredShare(ex: Explored, r: RegionDef): number {
  const a = ex.get(r.id);
  return a ? a.reduce((n, v) => n + (v ? 1 : 0), 0) / a.length : 0;
}

/** Looks around every few frames, once the investigator has moved to a new cell. */
export function explorationSystem(g: Game): void {
  const ow = g.overworld;
  if (!ow || g.frame % EXPLORE.every !== 0) return;
  const p = g.ecs.c.transform.get(g.player.id)!.pos;
  const cell = Math.floor(p.x / EXPLORE.cell) * 65536 + Math.floor(p.z / EXPLORE.cell);
  if (cell === ow.lookedFrom) return;
  ow.lookedFrom = cell;
  for (const region of explore(ow.explored, p)) g.events.emit('Explored', { region });
}

/** Packs the seen cells as base64 bits, region by region (for the save). */
export function packExplored(ex: Explored): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [id, cells] of ex) {
    const bits = new Uint8Array(Math.ceil(cells.length / 8));
    cells.forEach((v, i) => v && (bits[i >> 3] |= 1 << (i & 7)));
    out[id] = btoa(String.fromCharCode(...bits));
  }
  return out;
}

/** The seen cells from a save's packing; regions that no longer exist or do not fit are dropped. */
export function unpackExplored(o: Record<string, string> | undefined): Explored {
  const ex: Explored = new Map();
  for (const r of REGIONS) {
    const packed = o?.[r.id];
    if (typeof packed !== 'string') continue;
    let raw: string;
    try {
      raw = atob(packed);
    } catch {
      continue;
    }
    const cells = cellsFor(ex, r);
    if (raw.length !== Math.ceil(cells.length / 8)) {
      ex.delete(r.id);
      continue;
    }
    for (let i = 0; i < cells.length; i++) cells[i] = (raw.charCodeAt(i >> 3) >> (i & 7)) & 1;
  }
  return ex;
}
