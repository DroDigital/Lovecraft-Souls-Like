/**
 * Draws what boss fights put into the world (spec §3E): bolts in flight as self-lit shards, pools
 * as sickly discs on the ground, the arenas' props (a lamp: its post, and while it is lit its flame
 * and a faint circle of light where a light-bound boss burns), the flood's water over the arena,
 * and under hidden_platforms the void over its floor with the platforms the enlightened see.
 * Bolts, pools and props have models starting with `fx:`. Read-only on the simulation.
 */

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { Entity } from '../core/ecs';
import { REALITY } from '../data/tuning';
import { engagedFights } from '../systems/bossFight';
import type { Fight, Game } from '../systems/components';
import { hooksOf, platformsOf, platformsShown } from '../systems/reality';
import { box, tint } from './meshKit';
import { BASE, mixRgb, scaleRgb } from './palette';
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
    for (const [id] of c.prop) {
      if (views.has(id)) continue;
      const p = c.transform.get(id)!.pos;
      const root = lamp();
      root.position.set(p.x, p.y, p.z);
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
      for (const [id, p] of c.prop) views.get(id)!.traverse((o) => o.name === 'lit' && (o.visible = p.lit));
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
