import { describe, expect, it } from 'vitest';
import { emptyInput } from '../src/core/input';
import { PLAYER_MOVES } from '../src/data/moves';
import { COMBAT, LAUDANUM, PLAYER, REAGENT, SIM } from '../src/data/tuning';
import { spawnPool } from '../src/systems/hazards';
import { place, press, scriptedGame, steps } from './helpers';

const forward = (...buttons: Parameters<typeof press>): ReturnType<typeof press> => {
  const f = press(...buttons);
  f.moveY = 1;
  return f;
};

describe('playtest round 7: combat feel', () => {
  it('the investigator walks on slowly while drinking, and walks out of it once the dose is down', () => {
    const { g, player } = scriptedGame();
    place(g, player, 0, 0, 0);
    g.camera.yaw = 0;
    steps(g, 20, forward()); // walking
    const a = g.ecs.c.actor.get(player)!;
    steps(g, 1, forward('item'));
    expect(a.move).toBe('drink');
    const z0 = g.ecs.c.transform.get(player)!.pos.z;
    steps(g, 20, forward());
    const pace = (g.ecs.c.transform.get(player)!.pos.z - z0) / (20 / SIM.hz);
    expect(pace).toBeGreaterThan(PLAYER.walkSpeed * 0.3);
    expect(pace).toBeLessThan(PLAYER.walkSpeed * 0.5);
    steps(g, PLAYER_MOVES.drink.release! - 20, forward());
    expect(a.move).toBeNull(); // walked out of the swallow's tail
  });

  it('a dodge cuts a blow short soon after it lands, before the blow’s cancel window', () => {
    const { g, player } = scriptedGame();
    place(g, player, 0, 0, 0);
    const a = g.ecs.c.actor.get(player)!;
    steps(g, 1, press('light'));
    expect(a.move).toBe('light1');
    const from = PLAYER_MOVES.light1.hit!.window[1] + COMBAT.evadeAfter;
    steps(g, from - 3);
    steps(g, 1, press('dodge')); // tapped: released next step
    steps(g, 1);
    steps(g, 3);
    expect(a.move === 'backstep' || a.move === 'roll').toBe(true);
    expect(from).toBeLessThan(PLAYER_MOVES.light1.cancel!);
  });

  it('moving walks the investigator out of a blow’s late recovery', () => {
    const { g, player } = scriptedGame();
    place(g, player, 0, 0, 0);
    const a = g.ecs.c.actor.get(player)!;
    steps(g, 1, press('light'));
    steps(g, PLAYER_MOVES.light1.release!, forward());
    expect(a.move).toBeNull();
  });

  it('without a lock, a blow turns to a foe just off its line', () => {
    const { g, player, deepOne } = scriptedGame();
    place(g, player, 0, 0, 0);
    const off = (40 * Math.PI) / 180;
    place(g, deepOne, Math.sin(off) * 2, Math.cos(off) * 2, Math.PI);
    steps(g, 1, press('light'));
    expect(g.ecs.c.transform.get(player)!.yaw).toBeCloseTo(off, 1);
    const { g: g2, player: p2, deepOne: d2 } = scriptedGame();
    place(g2, p2, 0, 0, 0);
    place(g2, d2, 0, -2, 0); // behind: no help
    steps(g2, 1, press('light'));
    expect(g2.ecs.c.transform.get(p2)!.yaw).toBeCloseTo(0);
  });

  it('Laudanum steadies the mind: no drain for a while after a swallow', () => {
    const { g, player, deepOne } = scriptedGame();
    place(g, player, 0, 0, 0);
    place(g, deepOne, 0, 1.5, Math.PI);
    g.ecs.c.dread.get(deepOne)!.aura = 5;
    g.mind.sanity = 50;
    steps(g, 1, press('item'));
    steps(g, PLAYER_MOVES.drink.item!);
    const after = g.mind.sanity;
    expect(g.player.steady).toBeGreaterThan(0);
    steps(g, Math.round(LAUDANUM.steady * SIM.hz) - 10);
    expect(g.mind.sanity).toBeCloseTo(after); // held
    steps(g, 60);
    expect(g.mind.sanity).toBeLessThan(after); // and then it drains again
  });

  it('the Reagent mends: a pool does no harm for a while after a shot', () => {
    const { g, player, dummy } = scriptedGame();
    place(g, player, 0, 0, 0);
    const h = g.ecs.c.health.get(player)!;
    h.hp = h.max * 0.4;
    steps(g, 1, press('heal'));
    steps(g, PLAYER_MOVES.inject.frames);
    const healed = h.hp;
    spawnPool(g, dummy, 'enemy', { x: 0, z: 0 }, { radius: 3, life: 600, tick: 20, damage: 5 });
    steps(g, Math.round(REAGENT.mend * SIM.hz) - PLAYER_MOVES.inject.frames - 20, emptyInput());
    expect(h.hp).toBe(healed);
    steps(g, 120);
    expect(h.hp).toBeLessThan(healed);
  });
});
