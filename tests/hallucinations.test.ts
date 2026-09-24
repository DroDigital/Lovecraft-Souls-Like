import { describe, expect, it } from 'vitest';
import { distXZ } from '../src/core/geom';
import { getEntity } from '../src/data/registry';
import { HALLUCINATIONS, SANITY } from '../src/data/tuning';
import { strike, targetsOf } from '../src/systems/combat';
import { createGame } from '../src/systems/game';
import { conjure, PHANTOM_POOL } from '../src/systems/hallucinations';
import { viewAngle } from '../src/systems/lockOn';
import { setSanity } from '../src/systems/sanity';
import { place, scriptedGame, steps } from './helpers';

const blow = { damage: 30, poise: 30, guard: 30, hitstop: 3, parryable: true, interrupts: false };

describe('hallucinations', () => {
  it('are lesser horrors that fight in the open', () => {
    expect(PHANTOM_POOL.length).toBeGreaterThan(5);
    for (const id of PHANTOM_POOL) expect(getEntity(id)!.tier).toBe('lesser');
  });

  it('come only while Unmoored, behind the investigator, up to the limit', () => {
    const { g, player } = scriptedGame();
    place(g, player, 0, 0, 0);
    setSanity(g, 20);
    steps(g, 1200);
    expect(g.ecs.c.phantom.size).toBe(0);
    setSanity(g, 10);
    steps(g, HALLUCINATIONS.onset - 1);
    expect(g.ecs.c.phantom.size).toBe(0);
    const view = { x: g.camera.pos.x, z: g.camera.pos.z, yaw: g.camera.yaw };
    steps(g, 1);
    const [first] = g.ecs.c.phantom.keys();
    const at = g.ecs.c.transform.get(first)!.pos;
    expect(distXZ(at, g.ecs.c.transform.get(player)!.pos)).toBeGreaterThan(HALLUCINATIONS.distance[0] - 1);
    expect(Math.abs(viewAngle(view, at))).toBeGreaterThan((SANITY.sightCone * Math.PI) / 180); // out of view
    expect(g.ecs.c.combatant.get(first)!.bounty).toBe(0);
    expect(g.ecs.c.brain.get(first)!.target).toBe(player);
    steps(g, 1500);
    expect(g.ecs.c.phantom.size).toBe(HALLUCINATIONS.max);
  });

  it("a hallucination's blow takes sanity, not health", () => {
    const { g, player } = scriptedGame();
    place(g, player, 0, 0, 0);
    setSanity(g, 10);
    const e = conjure(g)!;
    const hp = g.ecs.c.health.get(player)!.hp;
    strike(g, e, player, blow);
    expect(g.ecs.c.health.get(player)!.hp).toBe(hp);
    expect(g.mind.sanity).toBe(10 - HALLUCINATIONS.sanity);
  });

  it('vanish when struck, when their time is up, and all at once when the mind climbs out', () => {
    const { g, player } = scriptedGame();
    place(g, player, 0, 0, 0);
    setSanity(g, 10);
    const [a, b, c] = [conjure(g)!, conjure(g)!, conjure(g)!];
    strike(g, player, a, { ...blow, damage: 1 });
    expect(g.ecs.c.transform.has(a)).toBe(false);
    expect(g.player.echoes).toBe(0);
    g.ecs.c.phantom.get(b)!.life = 10;
    steps(g, 10);
    expect(g.ecs.c.transform.has(b)).toBe(false);
    setSanity(g, 20);
    expect(g.ecs.c.phantom.size).toBe(0);
    expect(g.ecs.c.transform.has(c)).toBe(false);
  });

  it('only the investigator sees them: allies ignore them, and they hunt no one else', () => {
    const g = createGame({ creature: 'nodens' });
    const ally = [...g.ecs.c.model].find(([, m]) => m === 'creature:nodens')![0];
    setSanity(g, 10);
    const e = conjure(g)!;
    expect(targetsOf(g, ally)).not.toContain(e);
    expect(targetsOf(g, g.player.id)).toContain(e);
    expect(targetsOf(g, e)).toEqual([g.player.id]);
  });
});
