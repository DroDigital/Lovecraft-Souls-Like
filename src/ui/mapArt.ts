/**
 * The map's art (playtest round 1): each region drawn once as an investigator's survey, north up —
 * its ground shaded by the lie of the land with contour lines and water, then its roads, houses,
 * walls, groves, graves, standing stones, dungeon plans and boss rings. The ground is sampled in
 * slices a frame at a time (workArt), so no frame stalls; the art is kept once drawn.
 */

import type { GroundTexture, RegionDef } from '../data/regions';
import { WORLD } from '../data/tuning';
import { worldLayout } from '../world/placements';
import type { Prop } from '../world/props';
import { regionPlan } from '../world/regionPlan';
import { surface } from '../world/terrain';
import { regionRect } from '../world/worldMap';

export const ART_PX = 2; // metres a pixel
const STEP = 4; // metres between height samples
const CONTOUR = 6; // metres between contour lines

type Rgb = readonly [number, number, number];
const GROUND: Readonly<Record<GroundTexture, Rgb>> = {
  grass: [104, 100, 76], mud: [86, 76, 62], sand: [150, 134, 100], snow: [186, 186, 192], slab: [94, 94, 102],
  stone: [90, 96, 92], flesh: [112, 82, 78], water: [70, 72, 88], rot: [84, 80, 66],
};
const WATER: Rgb = [38, 50, 58];
const SHORE: Rgb = [92, 104, 104];

export interface Art {
  canvas: HTMLCanvasElement;
  region: RegionDef;
  done: boolean;
  version: number; // grows as more of it is drawn
}

interface Job extends Art {
  ctx: CanvasRenderingContext2D;
  image: ImageData;
  heights: Float32Array; // (cols + 1) × (rows + 1), north row first
  cols: number;
  rows: number;
  row: number; // height rows sampled so far
}

const arts = new Map<string, Job>();
const queue: Job[] = [];

/** The region's art, begun (and queued) the first time it is asked for. */
export function artOf(r: RegionDef): Art {
  let a = arts.get(r.id);
  if (a) return a;
  const rc = regionRect(r);
  const canvas = document.createElement('canvas');
  [canvas.width, canvas.height] = [(rc.x1 - rc.x0) / ART_PX, (rc.z1 - rc.z0) / ART_PX];
  const ctx = canvas.getContext('2d')!;
  const [cols, rows] = [(rc.x1 - rc.x0) / STEP, (rc.z1 - rc.z0) / STEP];
  a = { canvas, region: r, done: false, version: 0, ctx, image: ctx.createImageData(canvas.width, canvas.height), heights: new Float32Array((cols + 1) * (rows + 1)), cols, rows, row: 0 };
  arts.set(r.id, a);
  queue.push(a);
  return a;
}

/** Draws queued art for up to `budgetMs`. */
export function workArt(budgetMs: number): void {
  const t0 = performance.now();
  while (queue.length && performance.now() - t0 < budgetMs) {
    const a = queue[0];
    if (a.row <= a.rows) sampleRow(a);
    else {
      a.ctx.putImageData(a.image, 0, 0);
      overlay(a);
      a.done = true;
      a.version++;
      queue.shift();
    }
  }
}

const hash = (i: number, j: number): number => {
  const s = Math.sin(i * 127.1 + j * 311.7) * 43758.5453;
  return s - Math.floor(s);
};

/** Samples one row of heights and shades the row of cells above it. */
function sampleRow(a: Job): void {
  const rc = regionRect(a.region);
  const j = a.row++;
  const n = a.cols + 1;
  for (let i = 0; i <= a.cols; i++) a.heights[j * n + i] = surface(rc.x0 + i * STEP, rc.z1 - j * STEP);
  if (j === 0) return;
  const base = GROUND[a.region.biome.texture];
  const k = STEP / ART_PX;
  for (let i = 0; i < a.cols; i++) {
    const [nw, ne, sw, se] = [a.heights[(j - 1) * n + i], a.heights[(j - 1) * n + i + 1], a.heights[j * n + i], a.heights[j * n + i + 1]];
    const mean = (nw + ne + sw + se) / 4;
    const lo = Math.min(nw, ne, sw, se);
    const hi = Math.max(nw, ne, sw, se);
    let c: Rgb;
    if (hi < WORLD.seaLevel) c = WATER;
    else if (lo < WORLD.seaLevel) c = SHORE;
    else {
      const lit = 1 + 1.4 * ((ne + se - nw - sw) / 2 + (sw + se - nw - ne) / 2) / STEP; // light from the north-west
      const contour = Math.floor(lo / CONTOUR) !== Math.floor(hi / CONTOUR) ? 0.74 : 1;
      const f = Math.min(1.35, Math.max(0.55, lit)) * contour * (0.96 + 0.08 * hash(i, j)) * (1 + Math.max(-0.2, Math.min(0.25, mean / 60)));
      c = [base[0] * f, base[1] * f, base[2] * f];
    }
    for (let dy = 0; dy < k; dy++) {
      for (let dx = 0; dx < k; dx++) {
        const p = (((j - 1) * k + dy) * a.image.width + i * k + dx) * 4;
        [a.image.data[p], a.image.data[p + 1], a.image.data[p + 2], a.image.data[p + 3]] = [c[0], c[1], c[2], 255];
      }
    }
  }
  if (j % 16 === 0) {
    a.ctx.putImageData(a.image, 0, 0); // show it coming in
    a.version++;
  }
}

const PROP_INK: Partial<Record<Prop['kind'], string>> = {
  tree: '#3a4232', pine: '#2c3528', bush: '#46503a', stump: '#5a5446', rock: '#77736a', log: '#5a4a3a',
  grave: '#a39d8e', cross: '#a39d8e', obelisk: '#b0aa9c', monolith: '#6c5f7a', pillar: '#8c877c', altar: '#8a6d60',
  ruin: '#6e665a', wall: '#57524a', fence: '#6a5c48', lamp: '#d9c890', firepit: '#b0603a',
};

function overlay(a: Job): void {
  const { ctx } = a;
  const rc = regionRect(a.region);
  const X = (x: number): number => (x - rc.x0) / ART_PX;
  const Y = (z: number): number => (rc.z1 - z) / ART_PX;
  const plan = regionPlan(a.region);
  ctx.lineCap = ctx.lineJoin = 'round';
  for (const road of plan.roads) {
    ctx.strokeStyle = road.street ? '#b3a88e' : '#c2b699';
    ctx.lineWidth = Math.max(1.2, road.width / ART_PX);
    ctx.beginPath();
    road.pts.forEach((p, i) => (i ? ctx.lineTo(X(p.x), Y(p.z)) : ctx.moveTo(X(p.x), Y(p.z))));
    ctx.stroke();
  }
  const w = worldLayout();
  for (const d of w.dungeons) {
    if (d.layout.region !== a.region.id) continue;
    for (const room of d.layout.rooms) {
      const r = room.rect;
      ctx.fillStyle = '#2a282c';
      ctx.fillRect(X(r.x0), Y(r.z1), (r.x1 - r.x0) / ART_PX, (r.z1 - r.z0) / ART_PX);
      ctx.strokeStyle = '#8a8274';
      ctx.lineWidth = 1;
      ctx.strokeRect(X(r.x0), Y(r.z1), (r.x1 - r.x0) / ART_PX, (r.z1 - r.z0) / ART_PX);
    }
  }
  for (const ar of w.arenas) {
    if (ar.region !== a.region.id) continue;
    ctx.strokeStyle = '#9c927c';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(X(ar.x), Y(ar.z), ar.radius / ART_PX, 0, Math.PI * 2);
    ctx.stroke();
  }
  for (const list of plan.props.values()) for (const p of list) prop(ctx, p, X(p.x), Y(p.z));
}

/** A prop as the surveyor marks it: buildings and walls to scale, everything else as a dot. */
function prop(ctx: CanvasRenderingContext2D, p: Prop, x: number, y: number): void {
  if (p.kind === 'house' || p.kind === 'wall' || p.kind === 'fence' || p.kind === 'ruin' || p.kind === 'monolith' || p.kind === 'altar') {
    const [c, s] = [Math.cos(p.yaw), Math.sin(p.yaw)];
    const [ax, az, bx, bz] = [p.w * c, -p.w * s, p.d * s, p.d * c]; // its own x and z axes, scaled (world metres)
    ctx.fillStyle = p.kind === 'house' ? '#3b2c26' : PROP_INK[p.kind]!;
    ctx.beginPath();
    for (const [u, v] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) ctx.lineTo(x + (u * ax + v * bx) / ART_PX, y - (u * az + v * bz) / ART_PX);
    ctx.fill();
    if (p.kind === 'house') {
      ctx.strokeStyle = '#6a5446';
      ctx.lineWidth = 0.6;
      ctx.stroke();
    }
    return;
  }
  const ink = PROP_INK[p.kind];
  if (!ink) return;
  const r = p.kind === 'tree' ? 1.6 : p.kind === 'pine' ? 1.3 : p.kind === 'rock' ? Math.max(0.6, p.w / ART_PX) : 0.6;
  ctx.fillStyle = ink;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
}
