/**
 * Health bars over ordinary foes: a name and a thin bar above the head of each foe that is hunting the
 * investigator, wounded or locked on to, within reach and in plain sight, nearest first. Bosses keep
 * theirs at the bottom of the screen (bossHud.ts), and so do their decoys (none here, which would give
 * them away). Round 14: the damage a run of blows adds up to shows beside the name, and the lost
 * share lingers pale behind the bar before draining (damageTally.ts).
 */

import { Vector3, type Camera } from 'three';
import type { Entity } from '../core/ecs';
import { FOE_BARS } from '../data/tuning';
import { isAbsent, isConcealed, isUnseen, type Game } from '../systems/components';
import { hasLineOfSight } from '../world/colliders';
import { BONE, el, percent, RUST, setStyle, setText } from './hudKit';
import { createTally } from './damageTally';
import { uiScale } from './uiScale';

export interface FoeBars {
  update(camera: Camera, canvas: HTMLCanvasElement): void;
}

interface Slot {
  root: HTMLDivElement;
  name: HTMLDivElement;
  sum: HTMLDivElement;
  chip: HTMLDivElement;
  fill: HTMLDivElement;
}

export function createFoeBars(g: Game, parent: HTMLElement): FoeBars {
  const slots: Slot[] = Array.from({ length: FOE_BARS.max }, () => {
    const root = el('position:absolute;width:74px;margin-left:-37px;text-align:center;display:none;font-size:10px;letter-spacing:1px;text-shadow:0 0 2px #000', '', parent);
    const name = el('white-space:nowrap;overflow:visible;opacity:.85', '', root);
    const frame = el(`position:relative;height:3px;margin-top:1px;border:1px solid ${BONE}44;background:#000a`, '', root);
    const chip = el(`position:absolute;left:0;top:0;height:100%;background:${BONE}99`, '', frame);
    const fill = el(`position:relative;height:100%;background:${RUST}`, '', frame);
    const sum = el(`position:absolute;left:100%;bottom:-2px;margin-left:5px;font-size:12px;color:${BONE};white-space:nowrap`, '', root);
    return { root, name, sum, chip, fill };
  });
  const v = new Vector3();
  const eye = new Vector3();
  const tally = createTally(g);

  function shown(id: Entity): boolean {
    const c = g.ecs.c;
    const cb = c.combatant.get(id);
    if (!cb || cb.faction !== 'enemy' || c.fight.has(id) || c.phantom.get(id)?.decoy) return false;
    if (isAbsent(g, id) || isConcealed(g, id) || isUnseen(g, id) || c.actor.get(id)?.move === 'death') return false;
    const br = c.brain.get(id);
    if (br?.def.params.hide === 'invisible' && g.lock.target !== id) return false;
    const h = c.health.get(id);
    return !!h && (h.hp < h.max || g.lock.target === id || (br?.state === 'engage' && br.target === g.player.id));
  }

  return {
    update(camera, canvas) {
      const c = g.ecs.c;
      const me = c.transform.get(g.player.id)!.pos;
      eye.copy(camera.position);
      const picks: [number, Entity][] = [];
      for (const id of c.combatant.keys()) {
        const p = c.transform.get(id)?.pos;
        if (!p || id === g.player.id) continue;
        const d = Math.hypot(p.x - me.x, p.z - me.z);
        if (d <= FOE_BARS.range && shown(id)) picks.push([d, id]);
      }
      picks.sort((a, b) => a[0] - b[0]);
      const r = canvas.getBoundingClientRect();
      let n = 0;
      for (const [, id] of picks) {
        if (n >= slots.length) break;
        const p = c.transform.get(id)!.pos;
        const top = { x: p.x, y: p.y + (c.body.get(id)?.height ?? 1.8) + FOE_BARS.height, z: p.z };
        v.set(top.x, top.y, top.z).project(camera);
        if (v.z >= 1 || Math.abs(v.x) > 1.1 || Math.abs(v.y) > 1.1) continue;
        if (!hasLineOfSight(g.world, { x: eye.x, y: eye.y, z: eye.z }, { x: top.x, y: top.y - 0.4, z: top.z })) continue;
        const s = slots[n++];
        const h = c.health.get(id)!;
        setText(s.name, c.combatant.get(id)!.name);
        const now = performance.now();
        setStyle(s.fill, 'width', percent(h.hp, h.max));
        setStyle(s.chip, 'width', `${(tally.chip(id, h.hp / h.max, now) * 100).toFixed(1)}%`);
        const [sum, shown] = tally.total(id, now);
        setText(s.sum, sum);
        setStyle(s.sum, 'opacity', shown.toFixed(2));
        const k = uiScale(); // screen pixels, in the HUD's scaled layer
        setStyle(s.root, 'left', `${Math.round((((v.x + 1) / 2) * r.width) / k)}px`); // the layer is the picture's box
        setStyle(s.root, 'top', `${Math.round((((1 - v.y) / 2) * r.height) / k) - 16}px`);
        setStyle(s.root, 'display', 'block');
      }
      for (; n < slots.length; n++) setStyle(slots[n].root, 'display', 'none');
    },
  };
}
