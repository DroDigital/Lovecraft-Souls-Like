/**
 * Draws hidden-layer geometry (spec §3A): dark stone blocks banded with glyphs that glow in the
 * piece's anomaly colour, shown while their layer is; a hidden door's seal is plain wall until then.
 * For a moment as a piece comes or goes it flickers between there and not there. Read-only on the
 * simulation.
 */

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { Entity } from '../core/ecs';
import { ARENA, type HiddenPieceDef } from '../data/arena';
import { FEEDBACK } from '../data/tuning';
import type { Game } from '../systems/components';
import { box, tileUv } from './meshKit';
import { ANOMALY, BASE, scaleRgb } from './palette';
import { createWorldMaterial } from './worldMaterial';

interface View {
  root: THREE.Group;
  seal: THREE.Mesh | null; // stands in while the piece is hidden: plain wall where a hidden door will open
  shown: boolean;
  since: number; // render seconds of the last change
}

const STONE = scaleRgb(BASE.seaGrey, 1.8); // cold stone, unlike the arena's
const SHEEN = 0.2; // it glows faintly, so it reads in the dark beyond the lantern

function build(p: HiddenPieceDef): THREE.Group {
  const stone: THREE.BufferGeometry[] = [];
  const glyphs: THREE.BufferGeometry[] = [];
  const glow = ANOMALY[p.glow];
  for (const [dx, dz, hw, hd, y0, y1] of p.boxes) {
    const [x, z, h] = [p.x + dx, p.z + dz, y1 - y0];
    stone.push(tileUv(box(hw * 2, h, hd * 2, x, (y0 + y1) / 2, z, STONE, ARENA.lightCell), Math.max(hw, hd) * 2, h));
    // Glyph bands just proud of every face, two per metre of height.
    for (let y = y0 + 0.3; y < y1 - 0.1; y += 0.5) glyphs.push(box(hw * 2 + 0.03, 0.09, hd * 2 + 0.03, x, y, z, glow));
    if (h < 0.5) glyphs.push(box(hw * 2 + 0.03, 0.08, hd * 2 + 0.03, x, (y0 + y1) / 2, z, glow));
  }
  const root = new THREE.Group();
  root.add(new THREE.Mesh(mergeGeometries(stone), createWorldMaterial({ texture: 'stone', seed: 5, emissive: SHEEN, vertexColors: true })));
  root.add(new THREE.Mesh(mergeGeometries(glyphs), createWorldMaterial({ texture: 'stone', seed: 5, emissive: 1, vertexColors: true })));
  return root;
}

const WALL = scaleRgb(BASE.bone, 0.9);

/** The plain wall a hidden door hides behind (a seal drawn as wall; an unseen chasm edge draws nothing). */
function buildSeal(p: HiddenPieceDef): THREE.Mesh | null {
  if (!p.seal || p.seal.look !== 'wall') return null;
  const parts = p.seal.boxes.map(([dx, dz, hw, hd, y0, y1]) => tileUv(box(hw * 2, y1 - y0, hd * 2, p.x + dx, (y0 + y1) / 2, p.z + dz, WALL, 1), Math.max(hw, hd) * 2, y1 - y0));
  return new THREE.Mesh(mergeGeometries(parts), createWorldMaterial({ texture: 'stone', seed: 8, vertexColors: true }));
}

/** A steady pseudo-random 0..1 per flicker tick. */
const coin = (tick: number): number => {
  const s = Math.sin(tick * 91.7) * 43758.5453;
  return s - Math.floor(s);
};

export function createHiddenViews(scene: THREE.Scene, g: Game): { update(seconds: number): void } {
  const views = new Map<Entity, View>();
  for (const [id, p] of g.ecs.c.piece) {
    const root = build(p.def);
    const seal = buildSeal(p.def);
    scene.add(root);
    if (seal) scene.add(seal);
    views.set(id, { root, seal, shown: g.ecs.c.layer.get(id)?.shown ?? false, since: -Infinity });
  }
  return {
    update(seconds) {
      for (const [id, v] of views) {
        const shown = g.ecs.c.layer.get(id)?.shown ?? false;
        if (shown !== v.shown) [v.shown, v.since] = [shown, seconds];
        const k = (seconds - v.since) / FEEDBACK.revealSeconds; // 0 → 1 through the flicker
        v.root.visible = k >= 1 ? shown : coin(Math.floor(seconds * 24)) < (shown ? k : 1 - k);
        if (v.seal) v.seal.visible = !v.root.visible;
      }
    },
  };
}
