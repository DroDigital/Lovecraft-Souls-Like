/**
 * The open world's scene (spec §3D): terrain and props stream in with the 5 × 5 chunks around the
 * investigator and out beyond the 7 × 7, built a slice at a time (at most WORLD.sliceMs a frame);
 * legacy dungeons and boss arenas stand while any chunk they touch is loaded; a sea plane follows.
 * After a long jump (fast travel, a gate, a respawn) the chunks under the investigator are built at
 * once, so they never stand over nothing; the veil hides that (ui/journeys.ts), and while it does
 * the rest are built at a larger budget.
 */

import * as THREE from 'three';
import { createSlicer } from '../core/slicer';
import { RENDER, WORLD } from '../data/tuning';
import { chunkContent } from '../world/chunks';
import { worldLayout } from '../world/placements';
import { chunkSpan, streamDiff } from '../world/streaming';
import { chunkKey, chunkOf, keyChunk, type Rect } from '../world/worldMap';
import { groundCover } from './groundCover';
import { propJob } from './propMeshes';
import { arenaJob, dungeonJob } from './siteMeshes';
import { terrainJob } from './terrainMesh';
import { createWorldMaterial } from './worldMaterial';

export interface WorldScene {
  scene: THREE.Scene;
  /** Streams around the investigator at (x, z) and spends this frame's generation budget (ms; more while the veil hides the world). */
  update(x: number, z: number, budgetMs?: number): void;
  readonly loaded: number; // chunks
  readonly pending: number; // jobs not finished
}

interface Site {
  chunks: readonly number[]; // keys of the chunks its footprint touches
  job: (done: (meshes: THREE.Mesh[]) => void) => Generator<void, void>;
  meshes: THREE.Mesh[] | null; // null while not loaded
}

const SEA_TILE = 8; // metres per water texture repeat; the plane moves in whole tiles so the ripples stay put

function footprint(r: Rect): number[] {
  const keys: number[] = [];
  for (let cx = chunkOf(r.x0); cx <= chunkOf(r.x1); cx++) for (let cz = chunkOf(r.z0); cz <= chunkOf(r.z1); cz++) keys.push(chunkKey(cx, cz));
  return keys;
}

function sites(): Site[] {
  const w = worldLayout();
  const out: Site[] = w.dungeons.map((d) => ({ chunks: footprint(d.layout.rect), job: (done) => dungeonJob(d, done), meshes: null }));
  for (const a of w.arenas) {
    const r = a.radius + 3;
    out.push({ chunks: footprint({ x0: a.x - r, z0: a.z - r, x1: a.x + r, z1: a.z + r }), job: (done) => arenaJob(a, done), meshes: null });
  }
  return out;
}

function seaPlane(): THREE.Mesh {
  const size = Math.ceil((RENDER.far * 2.4) / SEA_TILE) * SEA_TILE;
  const repeats = size / SEA_TILE;
  const geo = new THREE.PlaneGeometry(size, size, repeats, repeats).rotateX(-Math.PI / 2);
  return new THREE.Mesh(geo, createWorldMaterial({ texture: 'water', uvScale: [repeats, repeats], uvScroll: [0.02, 0.01] }));
}

export function createWorldScene(): WorldScene {
  const scene = new THREE.Scene();
  const slicer = createSlicer(() => performance.now());
  const chunks = new Map<number, THREE.Mesh[]>(); // loaded chunks and the meshes built for them so far
  const all = sites();
  const sea = seaPlane();
  scene.add(sea);
  let at = -1; // the investigator's chunk key

  const add = (list: THREE.Mesh[], m: THREE.Mesh): void => {
    list.push(m);
    scene.add(m);
  };
  const drop = (list: readonly THREE.Mesh[]): void => {
    for (const m of list) {
      scene.remove(m);
      m.geometry.dispose(); // materials are shared
    }
  };

  function* chunkJob(cx: number, cz: number, list: THREE.Mesh[]): Generator<void, void> {
    const content = chunkContent(cx, cz);
    yield;
    yield* terrainJob(cx, cz, (m) => m && add(list, m));
    if (content.region) yield* propJob(content.props, content.region, (ms) => ms.forEach((m) => add(list, m)), groundCover(content.cx, content.cz, content.region, content.roads));
  }

  const load = (cx: number, cz: number, key: number): void => {
    const list: THREE.Mesh[] = [];
    chunks.set(key, list);
    slicer.add(key, chunkJob(cx, cz, list));
  };
  const unload = (key: number): void => {
    slicer.cancel(key);
    drop(chunks.get(key) ?? []);
    chunks.delete(key);
  };

  /** Sites stand while any chunk they touch is loaded. Their jobs use negative keys. */
  const syncSites = (): void => {
    all.forEach((s, k) => {
      const wanted = s.chunks.some((c) => chunks.has(c));
      if (wanted && !s.meshes) {
        const list: THREE.Mesh[] = [];
        s.meshes = list;
        slicer.add(-1 - k, s.job((ms) => ms.forEach((m) => add(list, m))));
      } else if (!wanted && s.meshes) {
        slicer.cancel(-1 - k);
        drop(s.meshes);
        s.meshes = null;
      }
    });
  };

  return {
    scene,
    update(x, z, budgetMs = WORLD.sliceMs) {
      const [cx, cz] = [chunkOf(x), chunkOf(z)];
      const key = chunkKey(cx, cz);
      if (key !== at) {
        const jumped = at < 0 || chunkSpan(cx, cz, ...keyChunk(at)) > 1;
        at = key;
        const diff = streamDiff(new Set(chunks.keys()), cx, cz);
        for (const k of diff.unload) unload(k);
        for (const c of diff.load) load(c.cx, c.cz, c.key);
        syncSites();
        if (jumped) {
          // Just arrived: build what stands under and beside the investigator now.
          for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) slicer.finish(chunkKey(cx + dx, cz + dz));
          all.forEach((s, k) => s.chunks.includes(key) && slicer.finish(-1 - k));
        }
      }
      sea.position.set(Math.round(x / SEA_TILE) * SEA_TILE, WORLD.seaLevel, Math.round(z / SEA_TILE) * SEA_TILE);
      slicer.run(budgetMs);
    },
    get loaded() {
      return chunks.size;
    },
    get pending() {
      return slicer.pending;
    },
  };
}
