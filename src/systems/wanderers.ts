/**
 * The sights that cross the dream (round 26; data/wanderers.ts): every so often, where the ground is
 * clear and nothing hunts the investigator, a file of creatures comes out of the dark a good way off and
 * walks across the ground, passing them at some tens of metres, bound for somewhere of its own. They are
 * creatures like any other: one that notices the investigator leaves the file and hunts them; a kill pays
 * as any does. The file is gone once the investigator is far off or the time is out. One at a time, never
 * in a dungeon, never in a fight. Pure: no Three.js.
 */

import type { Entity } from '../core/ecs';
import type { XZ } from '../core/geom';
import { wanderingsIn, type Wandering } from '../data/wanderers';
import { AI, SIM, WANDER } from '../data/tuning';
import { dungeonRoomAt } from '../world/terrain';
import { regionAt } from '../world/worldMap';
import { engagedFights } from './bossFight';
import { hourOf, phaseOf } from './clock';
import type { Game } from './components';
import { spawnCreature } from './creatures';
import { clearStep } from './npcLife';
import { walk } from './tactics';

interface Band {
  id: string;
  members: { e: Entity; goal: XZ }[];
  born: number; // the frame it came
  leader: Entity;
}

const bands = new WeakMap<Game, Band>();

/** The band about now, if any (for the debug console and the tests). */
export const bandOf = (g: Game): Band | undefined => bands.get(g);

const pick = (g: Game, [lo, hi]: readonly [number, number]): number => lo + (hi - lo) * g.rng();

/** A path for a file to walk: from a point `from` metres off the investigator, passing them `pass` metres away, and on past; or null where the ground will not have it. */
export function pathFor(g: Game, me: XZ, region: string): { start: XZ; end: XZ; dir: XZ } | null {
  for (let tries = 0; tries < 6; tries++) {
    const a = g.rng() * Math.PI * 2;
    const d = pick(g, WANDER.from);
    const start = { x: me.x + Math.sin(a) * d, z: me.z + Math.cos(a) * d };
    const [ux, uz] = [(me.x - start.x) / d, (me.z - start.z) / d]; // toward the investigator
    const off = pick(g, WANDER.pass) * (g.rng() < 0.5 ? -1 : 1);
    const target = { x: me.x - uz * off, z: me.z + ux * off }; // where it passes them
    const end = { x: start.x + (target.x - start.x) * 1.9, z: start.z + (target.z - start.z) * 1.9 };
    if (regionAt(start.x, start.z)?.id !== region || regionAt(end.x, end.z)?.id !== region) continue;
    const len = Math.hypot(end.x - start.x, end.z - start.z);
    let ok = true;
    let last: XZ = start;
    for (let s = 6; s <= len && ok; s += 6) {
      const p = { x: start.x + ((end.x - start.x) * s) / len, z: start.z + ((end.z - start.z) * s) / len };
      ok = clearStep(g, last, p) && !dungeonRoomAt(p.x, p.z);
      last = p;
    }
    if (ok) return { start, end, dir: { x: (end.x - start.x) / len, z: (end.z - start.z) / len } };
  }
  return null;
}

function send(g: Game, w: Wandering, me: XZ, region: string): boolean {
  const path = pathFor(g, me, region);
  if (!path) return false;
  const members: Band['members'] = [];
  let i = 0;
  for (const { id, n } of w.who) {
    for (let k = Math.round(pick(g, n)); k > 0; k--, i++) {
      const back = i * WANDER.apart;
      const side = (g.rng() - 0.5) * 1.2;
      const [px, pz] = [-path.dir.z, path.dir.x];
      const at = { x: path.start.x - path.dir.x * back + px * side, z: path.start.z - path.dir.z * back + pz * side };
      const e = spawnCreature(g, id, { x: at.x, z: at.z, yaw: Math.atan2(path.dir.x, path.dir.z) });
      if (e === undefined) continue;
      members.push({ e, goal: { x: path.end.x - path.dir.x * back + px * side, z: path.end.z - path.dir.z * back + pz * side } });
    }
  }
  if (!members.length) return false;
  bands.set(g, { id: w.id, members, born: g.frame, leader: members[0].e });
  const first = !g.overworld!.told.has(`wander:${w.id}`);
  g.overworld!.told.add(`wander:${w.id}`);
  g.events.emit('Wandered', { id: w.id, at: { x: path.start.x, y: g.world.ground(path.start.x, path.start.z), z: path.start.z }, ...(w.sound && { sound: w.sound }), ...(first && { words: w.words }) });
  return true;
}

/** Each step: the file on its way walks, those that have noticed the investigator leave it, and it goes when it is far or old; now and then, another is sent. */
export function wanderSystem(g: Game): void {
  const ow = g.overworld;
  if (!ow) return;
  const c = g.ecs.c;
  const me = c.transform.get(g.player.id)!.pos;
  const band = bands.get(g);
  if (band) {
    band.members = band.members.filter(({ e }) => {
      const [br, h] = [c.brain.get(e), c.health.get(e)];
      return c.transform.has(e) && !!br && !!h && h.hp > 0 && !c.dead.has(e) && (br.state === 'idle' || br.state === 'return'); // one that has noticed is no longer in the file
    });
    const lead = band.members.find((m) => m.e === band.leader) ?? band.members[0];
    const far = !lead || Math.hypot(c.transform.get(lead.e)!.pos.x - me.x, c.transform.get(lead.e)!.pos.z - me.z) > WANDER.leave;
    if (!band.members.length || far || g.frame - band.born > WANDER.stay * SIM.hz) {
      for (const { e } of band.members) g.ecs.despawn(e);
      bands.delete(g);
    } else {
      for (const { e, goal } of band.members) {
        const [tr, br, m] = [c.transform.get(e)!, c.brain.get(e)!, c.mover.get(e)!];
        br.state = 'idle';
        br.roamTo = null;
        if (Math.hypot(goal.x - tr.pos.x, goal.z - tr.pos.z) > 1.5) walk(m, tr.pos, goal, br.speed * AI.amble);
      }
    }
    return;
  }
  if (g.frame % WANDER.every !== 0 || !ow.region || (c.health.get(g.player.id)?.hp ?? 0) <= 0) return;
  const list = wanderingsIn(ow.region);
  if (!list.length || engagedFights(g).length || dungeonRoomAt(me.x, me.z) || g.player.listening !== null) return;
  if (g.rng() > WANDER.chance * (hourOf(phaseOf(g.frame / SIM.hz)) === 'deep' ? 1.3 : 1)) return;
  send(g, list[Math.floor(g.rng() * list.length)], me, ow.region);
}
