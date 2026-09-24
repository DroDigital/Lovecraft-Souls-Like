/**
 * Draws what boss fights put into the world (spec §3E): bolts in flight as self-lit shards, pools
 * as sickly discs on the ground, the arenas' props (a lamp: its post, and while it is lit its flame
 * and a faint circle of light where a light-bound boss burns; a monolith of Mu; the Alert, riding
 * the flood), the flood's water over the arena,
 * and under hidden_platforms the void over its floor with the platforms the enlightened see.
 * Bolts, pools and props have models starting with `fx:`. Read-only on the simulation.
 */

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { Entity } from '../core/ecs';
import { BOSS, REALITY } from '../data/tuning';
import { engagedFights } from '../systems/bossFight';
import type { Fight, Game, Prop } from '../systems/components';
import { hooksOf, platformsOf, platformsShown } from '../systems/reality';
import { box, tileUv, tint } from './meshKit';
import { ANOMALY, BASE, mixRgb, scaleRgb } from './palette';
import { createWorldMaterial } from './worldMaterial';

export const FX_PREFIX = 'fx:';

const CAPACITY = 96; // bolts drawn at once

export interface FightViews {
  update(alpha: number, time: number): void;
}

/** A flat disc in rings about 1.5 m apart, so the vertex-lit lantern pool shows on it. */
const flat = (radius: number, segments = 24): THREE.BufferGeometry =>
  new THREE.RingGeometry(0.05, radius, segments, Math.max(1, Math.ceil(radius / 1.5))).rotateX(-Math.PI / 2);

function pool(radius: number): THREE.Mesh {
  const geo = tint(flat(radius), scaleRgb(mixRgb(BASE.rust, BASE.seaGrey, 0.5), 0.9));
  return new THREE.Mesh(geo, createWorldMaterial({ texture: 'flesh', uvScale: [radius, radius], uvScroll: [0.05, 0.03], emissive: 0.35, vertexColors: true }));
}

/** A lamp on its post: the flame and its circle of light show while it is lit. */
function lamp(): THREE.Group {
  const root = new THREE.Group();
  const iron = scaleRgb(BASE.charcoal, 1.6);
  const post = mergeGeometries([box(0.14, 2.2, 0.14, 0, 1.1, 0, iron), box(0.5, 0.08, 0.5, 0, 2.2, 0, iron), box(0.5, 0.08, 0.5, 0, 2.75, 0, iron)]);
  root.add(new THREE.Mesh(post, createWorldMaterial({ texture: 'stone', vertexColors: true })));
  const flame = new THREE.Mesh(box(0.22, 0.36, 0.22, 0, 2.47, 0, mixRgb(BASE.bone, BASE.rust, 0.25)), createWorldMaterial({ texture: 'cloth', emissive: 1, vertexColors: true }));
  const light = new THREE.Mesh(tint(flat(REALITY.lampRadius, 40), scaleRgb(BASE.bone, 0.5)), createWorldMaterial({ texture: 'slab', uvScale: [6, 6], emissive: 0.22, vertexColors: true }));
  light.position.y = 0.04;
  flame.name = 'lit';
  light.name = 'lit';
  root.add(flame, light);
  return root;
}

/** The void over an arena's floor and its hidden platforms (shown by name 'platforms'). */
function abyss(f: Fight): THREE.Group {
  const root = new THREE.Group();
  const floor = tint(flat(f.arena.radius, 48), scaleRgb(BASE.charcoal, 0.4));
  root.add(new THREE.Mesh(floor, createWorldMaterial({ texture: 'rot', uvScale: [f.arena.radius / 2, f.arena.radius / 2], uvScroll: [0.02, -0.03], emissive: 0.15, vertexColors: true })));
  const stones = platformsOf(f).map((p) => tint(new THREE.CylinderGeometry(REALITY.platformRadius, REALITY.platformRadius, 0.3, 16).translate(p.x - f.arena.x, 0.1, p.z - f.arena.z), scaleRgb(BASE.seaGrey, 1.8)));
  const platforms = new THREE.Mesh(mergeGeometries(stones), createWorldMaterial({ texture: 'stone', seed: 5, emissive: 0.25, vertexColors: true }));
  platforms.name = 'platforms';
  root.add(platforms);
  root.position.set(f.arena.x, 0, f.arena.z);
  return root;
}

/** A standing stone of Mu: dark, banded with faint glyphs. */
function monolith(): THREE.Group {
  const [w, h] = BOSS.monolith;
  const root = new THREE.Group();
  root.add(new THREE.Mesh(tileUv(box(w, h, w, 0, h / 2, 0, scaleRgb(BASE.charcoal, 2.2), 0.5), w, h), createWorldMaterial({ texture: 'stone', seed: 9, vertexColors: true })));
  const bands = [1.2, 2.6, 4.4, 6.1].map((y) => box(w + 0.04, 0.1, w + 0.04, 0, y, 0, ANOMALY.purple));
  root.add(new THREE.Mesh(mergeGeometries(bands), createWorldMaterial({ texture: 'stone', emissive: 0.8, vertexColors: true })));
  return root;
}

/** The Alert: a steam yacht's hull, cabin, funnel and mast, bows toward +z. */
function ship(): THREE.Group {
  const wood = scaleRgb(mixRgb(BASE.bone, BASE.rust, 0.45), 1.1); // weathered white paint, pale enough to find in the dark
  const hull = [box(3.4, 1.6, 11, 0, 0.8, 0, wood, 1), box(2.2, 1.2, 2.4, 0, 0.9, 6.4, wood), box(3.5, 0.25, 11.1, 0, 1.2, 0, BASE.rust), box(2.4, 1.4, 3.2, 0, 2.3, -1.5, BASE.bone, 1)];
  const iron = [box(0.6, 2.2, 0.6, 0, 3.1, 0.8, scaleRgb(BASE.charcoal, 1.4)), box(0.18, 8, 0.18, 0, 5.6, 2.8, scaleRgb(BASE.rust, 1.2))];
  const root = new THREE.Group();
  root.add(new THREE.Mesh(mergeGeometries(hull), createWorldMaterial({ texture: 'wood', uvScale: [0.5, 0.5], vertexColors: true })));
  root.add(new THREE.Mesh(mergeGeometries(iron), createWorldMaterial({ texture: 'stone', vertexColors: true })));
  return root;
}

const PROPS: Record<Prop['kind'], () => THREE.Group> = { lamp, monolith, ship };

export function createFightViews(scene: THREE.Scene, g: Game): FightViews {
  const voids = new Map<Fight, THREE.Group>();
  const shard = tint(new THREE.OctahedronGeometry(1, 0), BASE.bone);
  const bolts = new THREE.InstancedMesh(shard, createWorldMaterial({ texture: 'stone', emissive: 1, vertexColors: true }), CAPACITY);
  bolts.frustumCulled = false;
  scene.add(bolts);
  const water = new THREE.Mesh(flat(1, 64), createWorldMaterial({ texture: 'water', uvScale: [12, 12], uvScroll: [0.03, 0.02], emissive: 0.1 }));
  water.visible = false;
  scene.add(water);
  const views = new Map<Entity, THREE.Object3D>();
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const axis = new THREE.Vector3(0.3, 1, 0.2).normalize();
  const at = new THREE.Vector3();
  const size = new THREE.Vector3();

  function sync(): void {
    const c = g.ecs.c;
    for (const [id, h] of c.hazard) {
      if (views.has(id)) continue;
      const p = c.transform.get(id)!.pos;
      const mesh = pool(h.radius);
      mesh.position.set(p.x, p.y + 0.05, p.z);
      scene.add(mesh);
      views.set(id, mesh);
    }
    for (const [id, prop] of c.prop) {
      if (views.has(id)) continue;
      const root = PROPS[prop.kind]();
      scene.add(root);
      views.set(id, root);
    }
    for (const [id, v] of views) {
      if (c.hazard.has(id) || c.prop.has(id)) continue;
      scene.remove(v);
      v.traverse((o) => o instanceof THREE.Mesh && o.geometry.dispose());
      views.delete(id);
    }
  }

  return {
    update(alpha, time) {
      sync();
      const c = g.ecs.c;
      for (const [id, p] of c.prop) {
        const v = views.get(id)!;
        const tr = c.transform.get(id)!;
        const afloat = p.kind === 'ship' && g.reality.floodAt ? REALITY.floodDepth * g.reality.flood - 0.4 : 0;
        v.position.set(tr.prev.x + (tr.pos.x - tr.prev.x) * alpha, tr.pos.y + afloat, tr.prev.z + (tr.pos.z - tr.prev.z) * alpha);
        v.rotation.y = tr.yaw;
        v.traverse((o) => o.name === 'lit' && (o.visible = p.lit));
      }
      let n = 0;
      for (const [id, b] of c.bolt) {
        const tr = c.transform.get(id);
        if (!tr || n >= CAPACITY) continue;
        at.set(tr.prev.x + (tr.pos.x - tr.prev.x) * alpha, tr.prev.y + (tr.pos.y - tr.prev.y) * alpha, tr.prev.z + (tr.pos.z - tr.prev.z) * alpha);
        q.setFromAxisAngle(axis, time * 9 + id);
        bolts.setMatrixAt(n++, m4.compose(at, q, size.setScalar(b.radius)));
      }
      bolts.count = n;
      bolts.instanceMatrix.needsUpdate = true;
      const under = new Set(engagedFights(g).filter(([, f]) => hooksOf(f).includes('hidden_platforms')).map(([, f]) => f));
      for (const f of under) {
        if (voids.has(f)) continue;
        const v = abyss(f);
        v.position.y = g.world.ground(f.arena.x, f.arena.z) + 0.03;
        scene.add(v);
        voids.set(f, v);
      }
      for (const [f, v] of voids) {
        if (under.has(f)) {
          v.getObjectByName('platforms')!.visible = platformsShown(g);
          continue;
        }
        scene.remove(v);
        v.traverse((o) => o instanceof THREE.Mesh && o.geometry.dispose());
        voids.delete(f);
      }
      const r = g.reality;
      water.visible = r.flood > 0.01 && r.floodAt !== null;
      if (r.floodAt) {
        water.position.set(r.floodAt.x, r.floodAt.y - 0.1 + REALITY.floodDepth * r.flood, r.floodAt.z);
        if (water.userData.radius !== r.floodAt.radius) {
          water.geometry.dispose();
          water.geometry = flat(r.floodAt.radius + 2, 64); // built to size: scaling would stretch its rings apart
          water.userData.radius = r.floodAt.radius;
        }
      }
    },
  };
}
