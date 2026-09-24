/**
 * Draws roster creatures (models `creature:<id>[#variant]`): sprites as one instanced billboard
 * batch over the atlas, colossi as animated assemblies. The sprite state and frame come from the
 * creature's current move; ambushers and burrowers stay unseen while hidden, invisible stalkers
 * show only while they strike, the unseen (the Dunwich Horror) only while revealed, and a creature
 * on a hidden layer only while the layer shows. A creature whose recipe lies `outside` the palette
 * is marked for the post pass to leave its hue alone. A variant swap changes the model, and a
 * colossus is rebuilt for it. Read-only on the simulation.
 */

import * as THREE from 'three';
import type { Entity } from '../core/ecs';
import { wrapAngle } from '../core/geom';
import type { Variant } from '../data/registry';
import { FEEDBACK, SIM } from '../data/tuning';
import { moveDef } from '../systems/actions';
import { isAbsent, isUnseen, type Game } from '../systems/components';
import { MODEL_PREFIX, resolveCreature } from '../systems/creatures';
import { strikeFrame } from '../systems/realityTricks';
import { buildAssembly, type Assembly } from './assemblies';
import { SPRITE_FRAG, SPRITE_VERT } from './shaders/sprite';
import { CELL, spriteKey, type SpriteAtlas, type SpriteState } from './sprites/atlas';
import { worldUniforms } from './worldMaterial';

const CAPACITY = 64;
const REACTIONS = new Set(['stagger', 'guardBreak', 'parried']);

interface Look {
  state: SpriteState;
  frame: number;
  opacity: number;
  sink: number; // 0..1 through the death move
  lash: number; // 0..1 around an attack's strike
}

/** Which frame of which state a creature shows, from its move and speed. */
export function lookOf(g: Game, id: Entity, time: number): Look | null {
  const c = g.ecs.c;
  const br = c.brain.get(id);
  if (isAbsent(g, id) || br?.state === 'hidden' || isUnseen(g, id)) return null;
  const a = c.actor.get(id)!;
  const def = moveDef(a);
  const tr = c.transform.get(id)!;
  const invisible = br?.def.params.hide === 'invisible';
  let look: Look;
  if (a.move === 'death' && def) {
    const t = a.frame / def.frames;
    look = { state: 'hurt', frame: 1, opacity: 1 - t, sink: t, lash: 0 };
  } else if (a.move !== null && REACTIONS.has(a.move)) {
    look = { state: 'hurt', frame: a.frame < 8 ? 0 : 1, opacity: 1, sink: 0, lash: 0 };
  } else if (a.move !== null && def) {
    const strike = strikeFrame(def) ?? Math.floor(def.frames / 3);
    const end = def.hit?.window[1] ?? strike + 6;
    const frame = a.frame < strike ? 0 : a.frame < end ? 1 : 2;
    look = { state: 'attack', frame, opacity: 1, sink: 0, lash: frame === 1 ? 1 : frame === 0 ? a.frame / Math.max(1, strike) * 0.3 : 0.3 };
  } else {
    const moving = Math.hypot(tr.pos.x - tr.prev.x, tr.pos.z - tr.prev.z) * SIM.hz > 0.3;
    look = moving ? { state: 'move', frame: Math.floor(time * 5) % 2, opacity: 1, sink: 0, lash: 0 } : { state: 'idle', frame: Math.floor(time * 1.6) % 2, opacity: 1, sink: 0, lash: 0 };
  }
  if (invisible && look.state !== 'attack' && look.state !== 'hurt') look.opacity = Math.min(look.opacity, 0.08);
  return look;
}

export interface CreatureViews {
  update(alpha: number, time: number, camera: THREE.Camera): void;
}

export function createCreatureViews(scene: THREE.Scene, g: Game, atlas: SpriteAtlas): CreatureViews {
  const tex = new THREE.DataTexture(atlas.data, atlas.width, atlas.height);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  const material = new THREE.ShaderMaterial({
    // The shared world uniform objects (snap, fog, light), so the world's per-frame updates reach sprites too.
    uniforms: { ...worldUniforms, uAtlas: { value: tex } },
    vertexShader: SPRITE_VERT,
    fragmentShader: SPRITE_FRAG,
  });
  const geo = new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0);
  const cells = new THREE.InstancedBufferAttribute(new Float32Array(CAPACITY * 4), 4).setUsage(THREE.DynamicDrawUsage);
  const info = new THREE.InstancedBufferAttribute(new Float32Array(CAPACITY * 4), 4).setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute('aCell', cells);
  geo.setAttribute('aInfo', info);
  const batch = new THREE.InstancedMesh(geo, material, CAPACITY);
  batch.frustumCulled = false;
  scene.add(batch);

  const assemblies = new Map<Entity, Assembly & { model: string }>();
  const hitAt = new Map<Entity, number>();
  g.events.on('Hit', (e) => void (e.outcome !== 'dodged' && hitAt.set(e.target, g.frame / SIM.hz)));
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const right = new THREE.Vector3();
  const at = new THREE.Vector3();
  const scale = new THREE.Vector3();
  const seen = new Set<Entity>(); // reused each frame: no garbage per frame

  return {
    update(alpha, time, camera) {
      camera.updateMatrixWorld();
      right.setFromMatrixColumn(camera.matrixWorld, 0);
      let n = 0;
      seen.clear();
      for (const [id, model] of g.ecs.c.model) {
        if (!model.startsWith(MODEL_PREFIX)) continue;
        const [cid, variant] = model.slice(MODEL_PREFIX.length).split('#') as [string, Variant | undefined];
        const def = resolveCreature(cid, variant);
        const tr = g.ecs.c.transform.get(id);
        if (!def || !tr) continue;
        seen.add(id);
        const look = lookOf(g, id, time);
        const x = tr.prev.x + (tr.pos.x - tr.prev.x) * alpha;
        const z = tr.prev.z + (tr.pos.z - tr.prev.z) * alpha;
        const hover = g.ecs.c.brain.get(id)?.def.params.hover ?? 0;
        const y = tr.prev.y + (tr.pos.y - tr.prev.y) * alpha + (hover > 0 ? hover + 0.2 * Math.sin(time * 2 + id) : 0);
        const flash = FEEDBACK.flashLevel * Math.max(0, 1 - (time - (hitAt.get(id) ?? -Infinity)) / FEEDBACK.flashSeconds);
        if (def.assembly) {
          let asm = assemblies.get(id);
          if (asm?.model !== model) {
            if (asm) scene.remove(asm.root);
            assemblies.set(id, (asm = { ...buildAssembly(def.assembly, id), model }));
          }
          if (!asm.root.parent) scene.add(asm.root);
          asm.root.visible = look !== null;
          if (!look) continue;
          asm.root.position.set(x, y - look.sink * def.assembly.scale * 0.6, z);
          asm.root.rotation.y = tr.prevYaw + wrapAngle(tr.yaw - tr.prevYaw) * alpha;
          asm.animate(time, look.lash, look.state === 'attack' ? look.lash : look.state === 'hurt' ? -0.3 : 0);
          for (const m of asm.materials) m.uniforms.uEmissive.value = (m.userData.emissive as number) + flash;
          continue;
        }
        const frames = atlas.frames.get(spriteKey(cid, variant));
        if (!look || !frames || !def.sprite || n >= CAPACITY) continue;
        const cell = frames[look.state][look.frame];
        const [cx, cy] = [(cell % (atlas.width / CELL)) * CELL, Math.floor(cell / (atlas.width / CELL)) * CELL];
        cells.setXYZW(n, cx / atlas.width, cy / atlas.height, (cx + CELL) / atlas.width, (cy + CELL) / atlas.height);
        const facingRight = Math.sin(tr.yaw) * right.x + Math.cos(tr.yaw) * right.z >= 0;
        info.setXYZW(n, flash, look.opacity, facingRight ? 0 : 1, def.sprite.outside ? 1 : 0);
        const size = def.sprite.scale;
        batch.setMatrixAt(n++, m4.compose(at.set(x, y - look.sink * size * 0.3, z), q, scale.set(size, size, 1)));
      }
      for (const [id, asm] of assemblies) {
        if (seen.has(id)) continue;
        scene.remove(asm.root);
        assemblies.delete(id);
      }
      batch.count = n;
      batch.instanceMatrix.needsUpdate = true;
      cells.needsUpdate = true;
      info.needsUpdate = true;
    },
  };
}
