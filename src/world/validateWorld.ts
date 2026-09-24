/**
 * validateWorld (spec §3D): the world data holds together. Dungeon graphs lay out; ids are unique;
 * gates pair up; sites stand inside their region, clear of each other; every spot where someone
 * stands or rises is walkable (no collider there); every region boss has an arena in its region;
 * spawn tables resolve; and every region can be reached from the hub by land, gate or dream.
 * Returns a list of problems; empty means sound. Pure.
 */

import { DUNGEONS } from '../data/dungeons';
import { getEntity } from '../data/registry';
import { REGIONS } from '../data/regions';
import { START_SIGN } from '../data/sites';
import { resolveCapsule } from './colliders';
import { worldLayout, type SpawnPoint } from './placements';
import { createWorldCollision } from './worldCollision';
import { rectDistance, regionAt, regionRect, type Rect } from './worldMap';

type Shape = { label: string; region: string } & ({ x: number; z: number; r: number } | { rect: Rect });

const overlaps = (a: Shape, b: Shape): boolean => {
  if ('rect' in a && 'rect' in b) return a.rect.x0 < b.rect.x1 && b.rect.x0 < a.rect.x1 && a.rect.z0 < b.rect.z1 && b.rect.z0 < a.rect.z1;
  if ('rect' in a) return 'r' in b && rectDistance(a.rect, b.x, b.z) < b.r;
  if ('rect' in b) return overlaps(b, a);
  return Math.hypot(a.x - b.x, a.z - b.z) < a.r + b.r;
};

/** Regions reachable from the hub: across shared borders, through gates, and by dreaming at the hub. */
export function reachableRegions(): Set<string> {
  const w = worldLayout();
  const links = new Map<string, Set<string>>(REGIONS.map((r) => [r.id, new Set<string>()]));
  const link = (a: string, b: string): void => void (links.get(a)?.add(b), links.get(b)?.add(a));
  for (const a of REGIONS) {
    for (const b of REGIONS) {
      const [p, q] = [regionRect(a), regionRect(b)];
      const edgeX = (p.x1 === q.x0 || q.x1 === p.x0) && Math.min(p.z1, q.z1) > Math.max(p.z0, q.z0);
      const edgeZ = (p.z1 === q.z0 || q.z1 === p.z0) && Math.min(p.x1, q.x1) > Math.max(p.x0, q.x0);
      if (a !== b && (edgeX || edgeZ)) link(a.id, b.id);
    }
  }
  for (const g of w.gates) {
    const to = w.gates.find((x) => x.id === g.to);
    if (to) link(g.region, to.region);
  }
  const dream = w.dream && regionAt(w.dream.x, w.dream.z);
  if (dream && w.signs.some((s) => s.dream)) link(w.signs.find((s) => s.dream)!.region, dream.id);
  const seen = new Set(['hub']);
  const queue = ['hub'];
  while (queue.length) for (const n of links.get(queue.shift()!) ?? []) if (!seen.has(n)) queue.push(n), seen.add(n);
  return seen;
}

/** Every fixed spot someone stands on: spawns, where the investigator rises, gate arrivals, tomes. */
function spots(): { label: string; x: number; z: number }[] {
  const w = worldLayout();
  return [
    ...w.spawns.map((s) => ({ label: s.id, x: s.at.x, z: s.at.z })),
    ...w.signs.map((s) => ({ label: `sign ${s.id}`, ...s.rest })),
    ...w.gates.map((g) => ({ label: `gate ${g.id}`, ...g.arrive })),
    ...w.tomes.map((t) => ({ label: `tome ${t.name}`, ...t.at })),
    ...(w.dream ? [{ label: 'the dream descent', ...w.dream }] : []),
  ];
}

function checkSpawn(s: SpawnPoint, errors: string[]): void {
  const def = getEntity(s.entity);
  if (!def) return void errors.push(`${s.id}: unknown entity ${s.entity}`);
  if (!def.regions.includes(s.region)) errors.push(`${s.id}: ${s.entity} does not list region ${s.region}`);
  if (s.variant === 'boss' && !def.bossVariant) errors.push(`${s.id}: ${s.entity} has no boss variant`);
}

export function validateWorld(): string[] {
  const w = worldLayout();
  const errors = [...w.errors];
  const unique = (label: string, ids: string[]): void => {
    const seen = new Set<string>();
    for (const id of ids) {
      if (seen.has(id)) errors.push(`${label} ${id} is used twice`);
      seen.add(id);
    }
  };
  unique('sign', w.signs.map((s) => s.id));
  unique('gate', w.gates.map((g) => g.id));
  unique('tome', w.tomes.map((t) => t.name));
  unique('spawn', w.spawns.map((s) => s.id));
  unique('dungeon', w.dungeons.map((d) => d.layout.def.id));
  for (const d of DUNGEONS) if (!w.dungeons.some((x) => x.layout.def === d)) errors.push(`dungeon ${d.id} is never placed`);
  if (!w.signs.some((s) => s.id === START_SIGN)) errors.push(`the start sign ${START_SIGN} does not exist`);
  if (w.signs.filter((s) => s.dream).length !== 1 || !w.dream) errors.push('needs one dream sign and the dream descent');
  for (const g of w.gates) {
    const to = w.gates.find((x) => x.id === g.to);
    if (!to) errors.push(`gate ${g.id} opens onto unknown gate ${g.to}`);
    else if (to.to !== g.id) errors.push(`gate ${g.id} → ${g.to}, but ${g.to} → ${to.to}`);
  }
  for (const s of w.spawns) checkSpawn(s, errors);
  for (const r of REGIONS) {
    for (const [id, weight] of Object.entries(r.spawns.table)) {
      checkSpawn({ id: `spawn table ${r.id}`, entity: id, region: r.id, at: { x: 0, z: 0, yaw: 0 }, unique: false }, errors);
      if (!(weight > 0)) errors.push(`spawn table ${r.id}: ${id} has no weight`);
    }
    for (const b of r.bosses) if (!w.spawns.some((s) => s.id === `boss:${b}` && s.region === r.id)) errors.push(`region ${r.id}: boss ${b} has no arena there`);
  }
  for (const d of DUNGEONS) for (const room of d.rooms) if (room.sign && room.spawns?.length) errors.push(`dungeon ${d.id}: ${room.id} has an Elder Sign and spawns`);

  const shapes: Shape[] = [
    ...w.signs.map((s) => ({ label: `sign ${s.id}`, region: s.region, x: s.x, z: s.z, r: 2.5 })),
    ...w.gates.map((g) => ({ label: `gate ${g.id}`, region: g.region, x: g.x, z: g.z, r: 3 })),
    ...w.arenas.map((a) => ({ label: `arena of ${a.bosses.join(' & ')}`, region: a.region, x: a.x, z: a.z, r: a.radius + 2.5 })),
    ...w.dungeons.map((d) => ({ label: `dungeon ${d.layout.def.id}`, region: d.layout.region, rect: { x0: d.layout.rect.x0 - 2, z0: d.layout.rect.z0 - 2, x1: d.layout.rect.x1 + 2, z1: d.layout.rect.z1 + 2 } })),
  ].filter((s) => !('x' in s) || !w.dungeons.some((d) => rectDistance(d.layout.rect, s.x, s.z) === 0)); // things inside dungeons are the rooms' business
  for (const [i, a] of shapes.entries()) {
    const rr = regionRect(REGIONS.find((r) => r.id === a.region)!);
    const inset = { x0: rr.x0 + 6, z0: rr.z0 + 6, x1: rr.x1 - 6, z1: rr.z1 - 6 };
    const inside = 'rect' in a ? a.rect.x0 >= inset.x0 && a.rect.z0 >= inset.z0 && a.rect.x1 <= inset.x1 && a.rect.z1 <= inset.z1 : rectDistance(inset, a.x, a.z) === 0 && a.x - a.r >= rr.x0 && a.x + a.r <= rr.x1 && a.z - a.r >= rr.z0 && a.z + a.r <= rr.z1;
    if (!inside) errors.push(`${a.label} strays out of region ${a.region}`);
    for (const b of shapes.slice(i + 1)) if (overlaps(a, b)) errors.push(`${a.label} overlaps ${b.label}`);
  }

  const world = createWorldCollision();
  for (const s of spots()) {
    if (!regionAt(s.x, s.z)) errors.push(`${s.label} stands off the land`);
    const pos = { x: s.x, y: world.ground(s.x, s.z), z: s.z };
    resolveCapsule(world, pos, 0.45, 1.8);
    if (Math.hypot(pos.x - s.x, pos.z - s.z) > 0.01) errors.push(`${s.label} stands inside a wall or stone`);
  }
  const reached = reachableRegions();
  for (const r of REGIONS) if (!reached.has(r.id)) errors.push(`region ${r.id} cannot be reached from the hub`);
  return errors;
}

/** Where each entity can be met: spawn tables, arenas (bosses and optional bosses), ally locations and dungeon rooms. */
export function placements(): Map<string, string[]> {
  const out = new Map<string, string[]>();
  const add = (id: string, where: string): void => void out.set(id, [...(out.get(id) ?? []), where]);
  for (const r of REGIONS) for (const id of Object.keys(r.spawns.table)) add(id, `spawn table ${r.id}`);
  for (const s of worldLayout().spawns) add(s.entity, s.id);
  return out;
}
