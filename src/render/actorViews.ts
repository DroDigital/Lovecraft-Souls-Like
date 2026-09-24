/**
 * Draws every entity that has a `model` as a primitive figure: interpolated transforms, procedural
 * poses, hitstop shake, hit flashes, and the revolver's tracer. Read-only on the simulation.
 */

import * as THREE from 'three';
import type { Entity } from '../core/ecs';
import { wrapAngle, yawOf } from '../core/geom';
import { FEEDBACK, SIM } from '../data/tuning';
import { moveDef } from '../systems/actions';
import type { Game } from '../systems/components';
import { MODEL_PREFIX } from '../systems/creatures';
import { buildFigure, type Figure } from './figures';
import { box } from './meshKit';
import { BASE } from './palette';
import { pose } from './poses';
import { createWorldMaterial } from './worldMaterial';

interface View {
  figure: Figure;
  stride: number;
  lastTime: number;
  hitAt: number; // sim seconds of the last landed blow
}

export interface ActorViews {
  update(alpha: number, time: number): void;
  /** Where the glow light sits this frame (the Echo drop), or null. */
  readonly glow: THREE.Vector3 | null;
}

function dispose(f: Figure): void {
  f.root.traverse((o) => {
    if (o instanceof THREE.Mesh) o.geometry.dispose();
  });
  for (const m of f.materials) m.dispose();
}

export function createActorViews(scene: THREE.Scene, g: Game): ActorViews {
  const views = new Map<Entity, View>();
  const simTime = (): number => g.frame / SIM.hz;
  const tracer = new THREE.Mesh(
    box(0.07, 0.07, 1, 0, 0, 0.5, BASE.bone),
    createWorldMaterial({ texture: 'stone', emissive: 1, vertexColors: true }),
  );
  tracer.visible = false;
  scene.add(tracer);
  let tracerUntil = -1;
  const glowAt = new THREE.Vector3();
  let glow: THREE.Vector3 | null = null;

  g.events.on('Hit', (e) => {
    const v = views.get(e.target);
    if (v && e.outcome !== 'dodged') v.hitAt = simTime();
  });
  g.events.on('Shot', ({ from, to }) => {
    tracer.position.set(from.x, from.y, from.z);
    tracer.lookAt(to.x, to.y, to.z);
    tracer.scale.set(1, 1, Math.max(0.01, Math.hypot(to.x - from.x, to.y - from.y, to.z - from.z)));
    tracerUntil = simTime() + FEEDBACK.tracerSeconds;
  });

  function sync(): void {
    for (const [id, model] of g.ecs.c.model) {
      if (views.has(id) || model.startsWith(MODEL_PREFIX)) continue; // roster creatures: creatureViews
      const figure = buildFigure(model);
      scene.add(figure.root);
      views.set(id, { figure, stride: 0, lastTime: 0, hitAt: -Infinity });
    }
    for (const [id, v] of views) {
      if (g.ecs.c.model.has(id)) continue;
      scene.remove(v.figure.root);
      dispose(v.figure);
      views.delete(id);
    }
  }

  function draw(id: Entity, v: View, alpha: number, time: number): void {
    const tr = g.ecs.c.transform.get(id);
    const f = v.figure;
    f.root.visible = !!tr && !g.ecs.c.dead.has(id);
    if (!tr || !f.root.visible) return;
    const a = g.ecs.c.actor.get(id);
    const lerp = (p: number, q: number): number => p + (q - p) * alpha;
    f.root.position.set(lerp(tr.prev.x, tr.pos.x), lerp(tr.prev.y, tr.pos.y), lerp(tr.prev.z, tr.pos.z));
    f.root.rotation.y = tr.prevYaw + wrapAngle(tr.yaw - tr.prevYaw) * alpha;
    if (a && a.hitstop > 0) {
      f.root.position.x += (Math.random() - 0.5) * FEEDBACK.shakeMetres;
      f.root.position.z += (Math.random() - 0.5) * FEEDBACK.shakeMetres;
    }
    const speed = Math.hypot(tr.pos.x - tr.prev.x, tr.pos.z - tr.prev.z) * SIM.hz;
    v.stride += (speed * Math.max(0, time - v.lastTime) * 2 * Math.PI) / FEEDBACK.strideMetres;
    v.lastTime = time;

    const def = a ? moveDef(a) : undefined;
    const frame = a && def ? Math.min(a.frame + (a.hitstop > 0 ? 0 : alpha), def.frames - 1) : 0;
    const rollYaw = a && def?.motion?.dir === 'input' ? wrapAngle(yawOf(a.dir.x, a.dir.z) - tr.yaw) : 0;
    const since = time - v.hitAt;
    const flinch = Math.max(0, 1 - since / FEEDBACK.flinchSeconds);
    pose(f, { move: a?.move ?? null, def, frame, speed, stride: v.stride, guard: a?.guard ?? false, flinch, rollYaw, time });
    const flash = FEEDBACK.flashLevel * Math.max(0, 1 - since / FEEDBACK.flashSeconds);
    for (const m of f.materials) m.uniforms.uEmissive.value = (m.userData.emissive as number) + flash;
    if (f.rig === 'echo') glow = glowAt.set(f.root.position.x, f.root.position.y + FEEDBACK.echoGlowHeight, f.root.position.z);
  }

  return {
    get glow() {
      return glow;
    },
    update(alpha, time) {
      sync();
      glow = null;
      for (const [id, v] of views) draw(id, v, alpha, time);
      tracer.visible = time < tracerUntil;
    },
  };
}
