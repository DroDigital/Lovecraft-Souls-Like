import { describe, expect, it } from 'vitest';
import { distXZ } from '../src/core/geom';
import { CTHULHU, HASTUR } from '../src/data/tuning';
import { strike } from '../src/systems/combat';
import { fightAction } from '../src/systems/fightActions';
import { createWorldGame } from '../src/systems/game';
import { applySave, parseSave, snapshot } from '../src/systems/save';
import { setSanity } from '../src/systems/sanity';
import { hasLineOfSight } from '../src/world/colliders';
import { worldLayout } from '../src/world/placements';
import { bossGame, calm, engage } from './bossHelpers';
import { place, press, steps } from './helpers';
import { deathblow, goTo, record, run } from './worldHelpers';

const hasturSpawn = () => worldLayout().spawns.find((s) => s.id === 'boss:hastur')!;

describe('the great old ones (spec §3E)', () => {
  it("Ghatanothoa's monoliths stand in the way of feet and of its petrifying gaze, until the fight is over", () => {
    const b = bossGame('ghatanothoa', undefined, 16);
    const { g, boss, fight } = b;
    const walls = g.world.colliders.length;
    engage(b);
    calm(b);
    const stones = fight.props.filter((p) => g.ecs.c.prop.get(p)!.kind === 'monolith');
    expect(stones).toHaveLength(5);
    expect(g.world.colliders.length).toBe(walls + 5);
    const bp = g.ecs.c.transform.get(boss)!.pos;
    const sp = g.ecs.c.transform.get(stones[0])!.pos;
    const [dx, dz] = [sp.x - bp.x, sp.z - bp.z];
    const d = Math.hypot(dx, dz);
    place(g, g.player.id, sp.x + (dx / d) * 1.6, sp.z + (dz / d) * 1.6, 0); // tucked in behind it
    steps(g, 60);
    expect(g.reality.petrify).toBe(0);
    const eye = { x: bp.x, y: bp.y + g.ecs.c.body.get(boss)!.aimHeight, z: bp.z };
    const open = [0, 1, 2, 3, 4, 5, 6, 7].map((k) => ({ x: bp.x + Math.sin(k * 0.785) * 12, z: bp.z + Math.cos(k * 0.785) * 12 }))
      .find((p) => hasLineOfSight(g.world, eye, { x: p.x, y: 1.6, z: p.z }) && Math.hypot(p.x, p.z) < 20)!;
    place(g, g.player.id, open.x, open.z, 0);
    steps(g, 60);
    expect(g.reality.petrify).toBeGreaterThan(0.2);
    const risen = record(g, 'Respawned');
    strike(g, boss, g.player.id, deathblow);
    for (let i = 0; i < 300 && !risen.length; i++) run(g, 1);
    expect(g.world.colliders.length).toBe(walls); // down with the fight's reset (it raises them again when it re-engages)
  });

  it('no blow kills Cthulhu', () => {
    const b = bossGame('cthulhu', undefined, 20);
    engage(b);
    strike(b.g, b.g.player.id, b.boss, deathblow);
    expect(b.g.ecs.c.health.get(b.boss)!.hp).toBe(1);
  });

  it('the Alert comes; at her helm the investigator rams Cthulhu, which bursts, reforms, and sinks with R’lyeh', () => {
    const b = bossGame('cthulhu', undefined, 20);
    const { g, boss, fight } = b;
    engage(b);
    calm(b);
    g.ecs.c.health.get(boss)!.hp = 1000;
    steps(g, 1);
    expect(fight.phase).toBe(2);
    const ship = fight.props.find((p) => g.ecs.c.prop.get(p)!.kind === 'ship')!;
    expect(ship).toBeDefined();
    const at = g.ecs.c.transform.get(ship)!.pos;
    place(g, g.player.id, at.x + 2, at.z, 0);
    expect(fightAction(g)?.label).toBe("take the Alert's helm");
    const titles = record(g, 'Title');
    const rams = record(g, 'Rammed');
    const deaths = record(g, 'Died');
    const hp = g.ecs.c.health.get(g.player.id)!.hp;
    steps(g, 1, press('interact'));
    for (let i = 0; i < 600 && !rams.length; i++) steps(g, 1);
    expect(rams).toEqual([{ entity: boss }]);
    expect(g.ecs.c.health.get(g.player.id)!.hp).toBe(hp); // untouchable at the helm
    expect(distXZ(g.ecs.c.transform.get(g.player.id)!.pos, g.ecs.c.transform.get(boss)!.pos)).toBeLessThan(g.ecs.c.body.get(boss)!.radius + CTHULHU.ram + 2);
    steps(g, CTHULHU.burst);
    expect(deaths).toEqual([expect.objectContaining({ entity: boss, killer: g.player.id })]);
    expect(titles.map((t) => t.text)).toEqual(['IT BURSTS', "IT REFORMS · R'LYEH SINKS"]);
    expect(g.ecs.c.actor.get(boss)!.move).toBe('death'); // it sinks
  });

  it("Hastur's name flickers each time sanity falls in Yuggoth, and the third time calls it", () => {
    const g = createWorldGame();
    const named = record(g, 'Named');
    setSanity(g, 60); // outside Yuggoth: nothing
    expect(named).toEqual([]);
    setSanity(g, 100);
    const s = hasturSpawn();
    goTo(g, s.at.x - 30, s.at.z);
    run(g, 2);
    expect(g.overworld!.region).toBe(HASTUR.region);
    for (const [i, sanity] of [60, 30, 10].entries()) {
      setSanity(g, sanity);
      expect(named.map((n) => n.count)).toEqual(Array.from({ length: i + 1 }, (_, k) => k + 1));
    }
    expect(g.overworld!.called.has('hastur')).toBe(true);
    const e = g.overworld!.alive.get('boss:hastur')!;
    expect(g.ecs.c.model.get(e)).toBe('creature:hastur');
    const pp = g.ecs.c.transform.get(g.player.id)!.pos;
    expect(distXZ(g.ecs.c.transform.get(e)!.pos, pp)).toBeCloseTo(HASTUR.rise, 0);
  });

  it("Hastur's arena stays empty until it has been called; the calling survives a save", () => {
    const g = createWorldGame();
    const s = hasturSpawn();
    goTo(g, s.at.x, s.at.z + 10);
    run(g, 40);
    expect(g.overworld!.alive.has('boss:hastur')).toBe(false);
    g.overworld!.named = 3;
    g.overworld!.called.add('hastur');
    g.overworld!.dirty = true;
    run(g, 2);
    expect(g.overworld!.alive.has('boss:hastur')).toBe(true);
    const loaded = createWorldGame();
    applySave(loaded, parseSave(JSON.stringify(snapshot(g)))!);
    expect(loaded.overworld!.named).toBe(3);
    expect([...loaded.overworld!.called]).toEqual(['hastur']);
  });
});
