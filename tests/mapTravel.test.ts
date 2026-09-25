import { describe, expect, it } from 'vitest';
import { START_SIGN } from '../src/data/sites';
import { signPlace, travel, travelBar } from '../src/systems/checkpoints';
import { isAbsent } from '../src/systems/components';
import { createWorldGame } from '../src/systems/game';
import { litSigns, signAt } from '../src/ui/mapTravel';
import { realmOf } from '../src/world/mapData';

describe('playtest round 7: fast travel from the map', () => {
  it('the map offers the realm’s lit signs, nearest first, and picks the one under the pointer', () => {
    const g = createWorldGame();
    const realm = realmOf(g.overworld!.region!);
    const here = g.ecs.c.transform.get(g.player.id)!.pos;
    expect(litSigns(g, realm, here).map((s) => s.id)).toEqual([START_SIGN]);
    g.overworld!.discovered.add('arkham_streets');
    g.overworld!.discovered.add('rlyeh_door'); // another realm: not on this map
    const lit = litSigns(g, realm, here);
    expect(lit.map((s) => s.id)).toEqual([START_SIGN, 'arkham_streets']);
    const s = lit[1];
    const view = { cx: s.x, cz: s.z, scale: 1, w: 400, h: 300 };
    expect(signAt(lit, view, 205, 148)?.id).toBe('arkham_streets'); // a few pixels off
    expect(signAt(lit, view, 240, 150)).toBeNull();
  });

  it('no journey while a foe hunts close by, or a boss fight is on; otherwise the sign is reached', () => {
    const g = createWorldGame();
    expect(travelBar(g)).toBeNull();
    const foe = [...g.overworld!.alive.values()].find((e) => !isAbsent(g, e) && !g.ecs.c.fight.has(e))!;
    const p = g.ecs.c.transform.get(g.player.id)!.pos;
    g.ecs.c.transform.get(foe)!.pos = { x: p.x + 4, y: p.y, z: p.z };
    const br = g.ecs.c.brain.get(foe)!;
    Object.assign(br, { state: 'engage', target: g.player.id });
    expect(travelBar(g)).toBe('foes');
    Object.assign(br, { state: 'idle', target: null });
    const boss = g.ecs.spawn();
    g.ecs.c.fight.set(boss, { engaged: true } as never);
    g.ecs.c.health.set(boss, { hp: 100, max: 100, calm: 0 } as never);
    expect(travelBar(g)).toBe('boss');
    g.ecs.despawn(boss);
    expect(travelBar(g)).toBeNull();
    g.overworld!.discovered.add('arkham_streets');
    expect(travel(g, 'arkham_streets')).toBe(true);
    expect(g.ecs.c.transform.get(g.player.id)!.pos).toMatchObject({ x: signPlace('arkham_streets')!.rest.x, z: signPlace('arkham_streets')!.rest.z });
  });
});
