/**
 * Health bars over ordinary foes: a name and a thin bar above the head of each foe that is hunting the
 * investigator, wounded or locked on to, within reach and in plain sight, nearest first. Bosses keep
 * theirs at the bottom of the screen (bossHud.ts), and so do their decoys (none here, which would give
 * them away). Round 14: the damage a run of blows adds up to shows beside the name, and the lost
 * share lingers pale behind the bar before draining (damageTally.ts). Round 19: allies at the
 * investigator's side wear theirs too, marked and in the sea's colour, so none is taken for a foe.
 * Round 32: plates are laid out so none lies over another (plateLayout.ts), and a long name is centred.
 */

import { Vector3, type Camera } from 'three';
import type { Entity } from '../core/ecs';
import { FOE_BARS } from '../data/tuning';
import { isAbsent, isConcealed, isUnseen, type Game } from '../systems/components';
import { hasLineOfSight } from '../world/colliders';
import { BLOOD, BONE, el, percent, SEA, setStyle, setText } from './hudKit';
import { createTally } from './damageTally';
import { layoutPlates, plateWidth, type PlateIn } from './plateLayout';
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
    const root = el('position:absolute;min-width:74px;transform:translateX(-50%);text-align:center;display:none;font-size:10px;letter-spacing:1px;text-shadow:0 0 2px #000', '', parent); // as wide as its name, about its middle (round 32: a long name ran off to the right of its bar)
    const name = el('white-space:nowrap;overflow:visible;opacity:.85', '', root);
    const frame = el(`position:relative;height:5px;margin-top:1px;border:1px solid ${BONE}66;background:#000c`, '', root); // five pixels, in the player's own red (round 32: three, in rust)
    const chip = el(`position:absolute;left:0;top:0;height:100%;background:${BONE}99`, '', frame);
    const fill = el(`position:relative;height:100%;background:${BLOOD}`, '', frame);
    const sum = el(`position:absolute;left:100%;bottom:-2px;margin-left:5px;font-size:12px;color:${BONE};white-space:nowrap`, '', root);
    return { root, name, sum, chip, fill };
  });
  const v = new Vector3();
  const eye = new Vector3();
  const tally = createTally(g);

  /** An ally at the investigator's side: following them, or fighting for them. */
  const ally = (id: Entity): boolean => {
    const br = g.ecs.c.brain.get(id);
    return br?.def.archetype === 'ally' && (br.state === 'follow' || br.state === 'engage');
  };

  function shown(id: Entity): boolean {
    const c = g.ecs.c;
    const cb = c.combatant.get(id);
    if (cb && ally(id)) return !isAbsent(g, id) && !isUnseen(g, id) && c.actor.get(id)?.move !== 'death';
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
      picks.sort((a, b) => (a[1] === g.lock.target ? -1 : b[1] === g.lock.target ? 1 : a[0] - b[0])); // the foe locked on to first, then the nearest
      const r = canvas.getBoundingClientRect();
      const k = uiScale(); // screen pixels, in the HUD's scaled layer
      const names = new Map<Entity, string>();
      const want: PlateIn[] = [];
      for (const [, id] of picks) {
        if (want.length >= slots.length) break;
        const p = c.transform.get(id)!.pos;
        const top = { x: p.x, y: p.y + (c.body.get(id)?.height ?? 1.8) + FOE_BARS.height, z: p.z };
        v.set(top.x, top.y, top.z).project(camera);
        if (v.z >= 1 || Math.abs(v.x) > 1.1 || Math.abs(v.y) > 1.1) continue;
        if (!hasLineOfSight(g.world, { x: eye.x, y: eye.y, z: eye.z }, { x: top.x, y: top.y - 0.4, z: top.z })) continue;
        const name = ally(id) ? `✦ ${c.combatant.get(id)!.name}` : c.combatant.get(id)!.name;
        names.set(id, name);
        want.push({ id, x: Math.round((((v.x + 1) / 2) * r.width) / k), y: Math.round((((1 - v.y) / 2) * r.height) / k) - 16, width: plateWidth(name), keep: id === g.lock.target }); // the layer is the picture's box
      }
      let n = 0;
      for (const at of layoutPlates(want)) {
        const s = slots[n++];
        const h = c.health.get(at.id)!;
        setText(s.name, names.get(at.id)!);
        setStyle(s.fill, 'background', ally(at.id) ? SEA : BLOOD);
        const now = performance.now();
        setStyle(s.fill, 'width', percent(h.hp, h.max));
        setStyle(s.chip, 'width', `${(tally.chip(at.id, h.hp / h.max, now) * 100).toFixed(1)}%`);
        const [sum, shown] = tally.total(at.id, now);
        setText(s.sum, sum);
        setStyle(s.sum, 'opacity', shown.toFixed(2));
        setStyle(s.root, 'left', `${at.x}px`);
        setStyle(s.root, 'top', `${at.y}px`);
        setStyle(s.root, 'display', 'block');
      }
      for (; n < slots.length; n++) setStyle(slots[n].root, 'display', 'none');
    },
  };
}
