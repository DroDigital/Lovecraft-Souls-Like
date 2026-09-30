import { describe, expect, it } from 'vitest';
import { PLAYER_MOVES } from '../src/data/moves';
import { GUN, PLAYER } from '../src/data/tuning';
import { startMove } from '../src/systems/actions';
import { rest, signPlace } from '../src/systems/checkpoints';
import type { GameEvents } from '../src/systems/components';
import { createGame, createWorldGame, stepGame } from '../src/systems/game';
import { falloff, gunEdge, loadRounds, scatterAt, shotDamage } from '../src/systems/gun';
import { setLock } from '../src/systems/lockOn';
import { place, press, scriptedGame, steps } from './helpers';
import { bossGame } from './bossHelpers';
import { range, SHOT } from './gunHelpers';

const RELOAD = PLAYER_MOVES.reload;

describe('a shot falls away with distance (round 22: it was seven damage from twenty-two metres, and spammed)', () => {
  it('is whole up close and falls away to a floor, sooner the further it goes, monotonously', () => {
    expect(falloff(0)).toBe(1);
    expect(falloff(GUN.reach.near)).toBe(1);
    expect(falloff(GUN.reach.far)).toBeCloseTo(GUN.reach.floor, 9);
    expect(falloff(1000)).toBeCloseTo(GUN.reach.floor, 9);
    let last = 1;
    for (let d = 0; d <= 25; d += 0.25) {
      expect(falloff(d)).toBeLessThanOrEqual(last + 1e-12);
      last = falloff(d);
    }
    expect(falloff(9)).toBeLessThan(0.4); // a third at nine metres...
    expect(falloff(12)).toBeLessThan(0.2); // ...a tenth by twelve
  });

  it("measures its range to the near side of a big body, not to the middle of it (round 24: a colossus's whole width was counted)", () => {
    const { g, boss } = bossGame('ghatanothoa', undefined, 8); // its axis eight metres off, its near side two
    g.ecs.c.brain.delete(boss);
    g.ecs.c.body.get(boss)!.fixed = true;
    setLock(g, boss);
    const shots: GameEvents['Shot'][] = [];
    const hits: GameEvents['Hit'][] = [];
    g.events.on('Shot', (e) => shots.push(e));
    g.events.on('Hit', (e) => e.attacker === g.player.id && hits.push(e));
    g.player.ammo = GUN.chamber;
    steps(g, 1, press('shoot'));
    steps(g, PLAYER_MOVES.shoot.frames);
    expect(hits).toHaveLength(1);
    expect(hits[0].damage).toBe(SHOT.damage); // whole: two metres to it, not eight
    const [s] = shots;
    expect(Math.hypot(s.to.x - s.from.x, s.to.z - s.from.z)).toBeLessThan(GUN.reach.near + 1); // and the bullet ends on its side
  });

  it('strays in a wider cone the further off it is aimed, and less with each level of the gun', () => {
    expect(scatterAt(0)).toBeCloseTo((GUN.scatter.base * Math.PI) / 180, 9);
    for (let d = 1; d <= 22; d++) expect(scatterAt(d)).toBeGreaterThanOrEqual(scatterAt(d - 1));
    expect(scatterAt(12)).toBeGreaterThan(scatterAt(6) * 2);
    for (let l = 1; l <= GUN.level.max; l++) expect(scatterAt(12, l)).toBeLessThan(scatterAt(12, l - 1));
    expect(12 * Math.tan(scatterAt(12))).toBeGreaterThan(0.9); // a body's width, over a metre off the line, at twelve metres
  });

  it('strikes hard up close, and levels put the fall-off off and the damage up', () => {
    expect(SHOT.damage).toBeGreaterThanOrEqual(25); // it was 7
    expect(shotDamage(SHOT.damage, 2, 0)).toBe(SHOT.damage);
    for (let l = 1; l <= GUN.level.max; l++) {
      expect(gunEdge(l)).toBeGreaterThan(gunEdge(l - 1));
      expect(shotDamage(SHOT.damage, 9, l)).toBeGreaterThan(shotDamage(SHOT.damage, 9, l - 1));
      expect(falloff(9, l)).toBeGreaterThanOrEqual(falloff(9, l - 1));
    }
    expect(shotDamage(SHOT.damage, 2, GUN.level.max)).toBeCloseTo(SHOT.damage * (1 + GUN.level.damage * GUN.level.max), 9);
  });

  it('lands whole on a foe up close every time, and from afar hits for a fraction, and rarely', () => {
    const near = range(3);
    near.fire(20);
    expect(near.hits).toHaveLength(20);
    expect(new Set(near.hits.map((h) => h.damage))).toEqual(new Set([SHOT.damage]));
    const far = range(11);
    far.volley(200);
    expect(far.shots).toHaveLength(200);
    expect(far.hits.length).toBeLessThan(100); // under half of them find it...
    expect(far.hits.length).toBeGreaterThan(0); // ...but some do
    for (const h of far.hits) expect(h.damage).toBeLessThan(SHOT.damage * 0.25); // and for less than a quarter
    const strayed = far.shots.filter((s) => s.target === null).map((s) => Math.hypot(s.to.x, s.to.z - 0));
    expect(strayed.length).toBeGreaterThan(100);
  });

  it('is aimed by lock-on or the way they face, and a small mark is missed more', () => {
    const big = range(9);
    big.volley(300);
    const small = range(9);
    small.g.ecs.c.body.get(small.deepOne)!.radius = 0.2;
    small.volley(300);
    expect(small.hits.length).toBeLessThan(big.hits.length);
    expect(big.hits.length).toBeGreaterThan(150); // a broad foe at nine metres is more often struck than not...
    expect(small.hits.length).toBeLessThan(big.hits.length * 0.7); // ...and a narrow one, much less
  });

  it('interrupts a wind-up only while it keeps half its damage, and its poise falls with it', () => {
    const [close, far] = [range(3), range(11)];
    for (const r of [close, far]) {
      startMove(r.g.ecs.c.actor.get(r.deepOne)!, 'claw');
      steps(r.g, 2);
    }
    close.fire(1);
    expect(close.hits.map((h) => h.outcome)).toEqual(['interrupted']);
    expect(falloff(11)).toBeLessThan(0.5);
    for (let i = 0; i < 30 && !far.hits.length; i++) (startMove(far.g.ecs.c.actor.get(far.deepOne)!, 'claw'), far.fire(1)); // until one finds it
    expect(far.hits.length).toBeGreaterThan(0);
    expect(far.hits.every((h) => h.outcome !== 'interrupted')).toBe(true);
  });
});

describe('the cylinder holds six, and rounds are spent (round 22)', () => {
  it('starts full with rounds to spare, and a shot spends one', () => {
    const g = createWorldGame();
    expect(g.player).toMatchObject({ ammo: GUN.chamber, rounds: GUN.start, gun: 0 });
    const { g: h, deepOne } = scriptedGame();
    h.player.rounds = 0;
    place(h, h.player.id, 0, 5, Math.PI);
    place(h, deepOne, 0, 0, 0);
    steps(h, 1, press('shoot'));
    steps(h, SHOT.frame);
    expect(h.player.ammo).toBe(GUN.chamber - 1);
    steps(h, PLAYER_MOVES.shoot.frames);
    steps(h, 1, press('shoot'));
    steps(h, SHOT.frame);
    expect(h.player.ammo).toBe(GUN.chamber - 2);
  });

  it('cannot spam six shots in a breath: a shot every four-tenths of a second at best, and then nothing', () => {
    const { g, deepOne, player } = scriptedGame();
    g.player.rounds = 0;
    place(g, player, 0, 3, Math.PI);
    place(g, deepOne, 0, 0, 0);
    const shots: number[] = [];
    g.events.on('Shot', () => shots.push(g.frame));
    for (let i = 0; i < 400; i++) stepGame(g, press('shoot'));
    expect(shots).toHaveLength(GUN.chamber);
    for (let i = 1; i < shots.length; i++) expect(shots[i] - shots[i - 1]).toBeGreaterThanOrEqual(PLAYER_MOVES.shoot.cancel!);
    expect(g.player.ammo).toBe(0);
  });

  it('on an empty cylinder with nothing to load it from, clicks and says so, and starts no move', () => {
    const g = createGame();
    g.player.ammo = 0;
    g.player.rounds = 0;
    const seen: string[] = [];
    g.events.on('DryFire', () => seen.push('click'));
    g.events.on('Notice', (e) => seen.push(e.text));
    steps(g, 1, press('shoot'));
    expect(seen).toEqual(['click', 'NO ROUNDS']);
    expect(g.ecs.c.actor.get(g.player.id)!.move).toBeNull();
    expect(g.ecs.c.stamina.get(g.player.id)!.value).toBe(PLAYER.stamina); // and it costs nothing
  });

  it('on an empty cylinder with rounds to spare, reloads instead of firing', () => {
    const g = createGame();
    g.player.ammo = 0;
    g.player.rounds = 10;
    const started: string[] = [];
    g.events.on('Reloading', () => started.push('begun'));
    const loaded: number[] = [];
    g.events.on('Reloaded', (e) => loaded.push(e.loaded));
    steps(g, 1, press('shoot'));
    expect(g.ecs.c.actor.get(g.player.id)!.move).toBe('reload');
    expect(started).toEqual(['begun']);
    steps(g, RELOAD.item! - 1);
    expect(g.player).toMatchObject({ ammo: 0, rounds: 10 }); // nothing goes in until its frame
    steps(g, 2);
    expect(g.player).toMatchObject({ ammo: GUN.chamber, rounds: 10 - GUN.chamber });
    expect(loaded).toEqual([GUN.chamber]);
  });

  it('a reload key loads what the cylinder has room for, and a full one is left alone', () => {
    const g = createGame();
    g.player.ammo = 4;
    g.player.rounds = 10;
    steps(g, 1, press('reload'));
    steps(g, RELOAD.item! + 1);
    expect(g.player).toMatchObject({ ammo: GUN.chamber, rounds: 8 });
    steps(g, RELOAD.frames);
    steps(g, 1, press('reload'));
    expect(g.ecs.c.actor.get(g.player.id)!.move).toBeNull(); // nothing to do
    g.player.ammo = 5;
    g.player.rounds = 0;
    const said: string[] = [];
    g.events.on('Notice', (e) => said.push(e.text));
    steps(g, 1, press('reload'));
    expect(said).toEqual(['NO ROUNDS']); // room but nothing to load
  });

  it('a reload cut short by a roll loads nothing and loses nothing', () => {
    const g = createGame();
    g.player.ammo = 0;
    g.player.rounds = 8;
    steps(g, 1, press('reload'));
    steps(g, RELOAD.item! - 10);
    place(g, g.player.id, 0, 0, 0);
    steps(g, 1, press('dodge'));
    steps(g, 1); // (a tap that is released: a backstep with no way to go)
    startMove(g.ecs.c.actor.get(g.player.id)!, 'stagger'); // a blow lands
    steps(g, RELOAD.frames);
    expect(g.player).toMatchObject({ ammo: 0, rounds: 8 });
  });

  it('never drinks Laudanum: a reload is no swallow', () => {
    const g = createGame();
    g.player.ammo = 0;
    g.mind.sanity = 50;
    g.mind.fought = Infinity; // in a fight: the mind does not mend, so any rise would be a swallow's
    steps(g, 1, press('reload'));
    steps(g, RELOAD.frames);
    expect(g.mind.sanity).toBeLessThanOrEqual(50);
    expect(g.player.steady).toBe(0);
  });

  it('resting and rising again load the cylinder from the spare rounds', () => {
    const g = createWorldGame();
    g.player.ammo = 1;
    g.player.rounds = 3;
    expect(rest(g, signPlace('hub_quad')!.id)).toBe(true);
    expect(g.player).toMatchObject({ ammo: 4, rounds: 0 });
    g.player.rounds = 20;
    g.player.ammo = 0;
    g.events.emit('Respawned', { entity: g.player.id });
    expect(g.player).toMatchObject({ ammo: GUN.chamber, rounds: 14 });
    expect(loadRounds(g)).toBe(0);
  });
});
