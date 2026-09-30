import { describe, expect, it } from 'vitest';
import { PLAYER_MOVES } from '../src/data/moves';
import { NPCS } from '../src/data/npcs';
import { DUNGEONS } from '../src/data/dungeons';
import { REGIONS } from '../src/data/regions';
import { GUN, LEVELS, PLAYER } from '../src/data/tuning';
import { SHOPS, WARES } from '../src/data/wares';
import { startMove } from '../src/systems/actions';
import { carryOf, parseCarry } from '../src/systems/cycles';
import { rest, signPlace } from '../src/systems/checkpoints';
import type { GameEvents } from '../src/systems/components';
import { emptyInput } from '../src/core/input';
import { createGame, createWorldGame, stepGame } from '../src/systems/game';
import { canUpgradeGun, falloff, gunCost, gunEdge, giveRounds, loadRounds, scatterAt, shotDamage, upgradeGun } from '../src/systems/gun';
import { spawnTome } from '../src/systems/insight';
import { parseSave, snapshot } from '../src/systems/save';
import { buy, canBuy } from '../src/systems/trade';
import { roundCaches } from '../src/world/caches';
import { worldLayout } from '../src/world/placements';
import { place, press, scriptedGame, steps } from './helpers';

const SHOT = PLAYER_MOVES.shoot.shot;
const RELOAD = PLAYER_MOVES.reload;

/** A game with the investigator `d` metres from a Deep One that cannot be killed, and a record of what the revolver does to it. */
function range(d: number) {
  const { g, player, deepOne } = scriptedGame();
  place(g, player, 0, d, Math.PI);
  place(g, deepOne, 0, 0, 0);
  g.lock.target = deepOne;
  g.ecs.c.health.get(deepOne)!.hp = g.ecs.c.health.get(deepOne)!.max = 1e6;
  const hits: GameEvents['Hit'][] = [];
  g.events.on('Hit', (e) => e.attacker === player && hits.push(e));
  const shots: GameEvents['Shot'][] = [];
  g.events.on('Shot', (e) => shots.push(e));
  /** Fires `n` shots, each with a full cylinder and a full bar, so neither ammunition nor breath limits them. */
  const fire = (n: number): void => {
    for (let i = 0; i < n; i++) {
      g.player.ammo = GUN.chamber;
      g.ecs.c.stamina.get(player)!.value = PLAYER.stamina;
      steps(g, 1, press('shoot'));
      steps(g, PLAYER_MOVES.shoot.frames);
    }
  };
  /** `n` shots in as many steps: each begins on the step before its shot frame, for a count of hits over many. */
  const volley = (n: number): void => {
    const a = g.ecs.c.actor.get(player)!;
    for (let i = 0; i < n; i++) {
      g.player.ammo = GUN.chamber;
      startMove(a, 'shoot');
      a.frame = SHOT.frame - 1;
      a.hitstop = 0;
      stepGame(g, emptyInput());
    }
  };
  return { g, player, deepOne, hits, shots, fire, volley };
}

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

describe('rounds are found and bought (round 22)', () => {
  const at = (g: ReturnType<typeof createGame>) => ({ ...g.ecs.c.transform.get(g.player.id)!.pos, yaw: 0 });

  it('a box lying about is taken on touch, and taken for good', () => {
    const g = createWorldGame();
    g.player.rounds = 2;
    spawnTome(g, { ...at(g), name: 'Cartridges: test', insight: 0, rounds: 6 });
    steps(g, 1);
    expect(g.player.rounds).toBe(8);
    expect(g.overworld!.read.has('Cartridges: test')).toBe(true);
    expect([...g.ecs.c.tome.values()].some((t) => t.name === 'Cartridges: test')).toBe(false);
  });

  it('is left where it lies when they cannot carry it all, with a word now and then, until they can', () => {
    const g = createWorldGame();
    g.player.rounds = GUN.carry - 2;
    const said: string[] = [];
    g.events.on('Notice', (e) => said.push(e.text));
    spawnTome(g, { ...at(g), name: 'Cartridges: full', insight: 0, rounds: 6 });
    steps(g, 200);
    expect([...g.ecs.c.tome.values()].some((t) => t.name === 'Cartridges: full')).toBe(true);
    expect(g.player.rounds).toBe(GUN.carry - 2);
    expect(said.filter((s) => s === 'YOU CARRY ALL THE ROUNDS YOU CAN').length).toBeGreaterThan(0);
    expect(said.length).toBeLessThan(200 / 60 / 3 + 3); // not every step
    g.player.rounds = 0;
    steps(g, 1);
    expect(g.player.rounds).toBe(6);
    expect(giveRounds(g, GUN.carry)).toBe(false);
  });

  it('a merchant sells a box for Echoes, and refuses when the pocket is full or the purse empty', () => {
    const g = createWorldGame();
    g.player.echoes = WARES.rounds.price * 3;
    g.player.rounds = 0;
    expect(buy(g, 'rounds')).toBe(true);
    expect(g.player.rounds).toBe(GUN.box);
    expect(g.player.echoes).toBe(WARES.rounds.price * 2);
    g.player.rounds = GUN.carry - GUN.box + 1;
    expect(canBuy(g, 'rounds')).toBe(false); // it would not fit
    expect(buy(g, 'rounds')).toBe(false);
    g.player.rounds = 0;
    g.player.echoes = WARES.rounds.price - 1;
    expect(buy(g, 'rounds')).toBe(false);
    expect(WARES.rounds.stock).toBeUndefined(); // the pocket is the limit, not the stock
  });

  it('three people trade in them, each a real person with a real shop', () => {
    const sellers = NPCS.filter((n) => n.shop && SHOPS[n.shop]?.includes('rounds')).map((n) => n.id);
    expect(sellers.sort()).toEqual(['curtis', 'dyer', 'morgan']);
    for (const n of NPCS) if (n.shop) expect(SHOPS, n.id).toHaveProperty(n.shop);
  });

  it('lie in every dungeon that keeps a cache, and about the open world of every region', () => {
    const w = worldLayout();
    const boxes = w.tomes.filter((t) => t.rounds);
    for (const d of DUNGEONS) expect(roundCaches(d).size, d.id).toBeGreaterThan(0);
    for (const d of DUNGEONS) {
      for (const room of roundCaches(d).keys()) expect(boxes.some((b) => b.name === `Cartridges: ${d.id}/${room}`), `${d.id}/${room}`).toBe(true);
    }
    for (const r of REGIONS) expect(boxes.filter((b) => b.region === r.id && b.name.startsWith(`Cartridges: ${r.id} `)).length, r.id).toBeGreaterThan(0);
    for (const b of boxes) expect(b.rounds).toBeGreaterThanOrEqual(GUN.find);
    expect(new Set(boxes.map((b) => b.name)).size).toBe(boxes.length);
    const total = boxes.reduce((n, b) => n + b.rounds!, 0);
    expect(total).toBeGreaterThan(100); // enough to be found around the map...
    expect(total).toBeLessThan(350); // ...and few enough to be spent wisely
  });
});

describe('the gun is upgraded with star-stones at an Elder Sign (round 22)', () => {
  it('each level costs its stones, adds to the damage and puts the fall-off off, up to the most', () => {
    const g = createWorldGame();
    g.player.stones = 0;
    expect(canUpgradeGun(g)).toBe(false);
    expect(upgradeGun(g)).toBe(false);
    for (let l = 0; l < GUN.level.max; l++) {
      const cost = GUN.level.cost[l];
      expect(gunCost(g)).toBe(cost);
      g.player.stones = cost - 1;
      expect(upgradeGun(g)).toBe(false);
      g.player.stones = cost + 2;
      expect(upgradeGun(g)).toBe(true);
      expect(g.player.stones).toBe(2);
      expect(g.player.gun).toBe(l + 1);
    }
    g.player.stones = 99;
    expect(gunCost(g)).toBeUndefined();
    expect(upgradeGun(g)).toBe(false);
    expect(g.player.gun).toBe(GUN.level.max);
  });

  it('a levelled gun hits harder and more often from afar', () => {
    const [plain, tuned] = [range(9), range(9)];
    tuned.g.player.gun = GUN.level.max;
    plain.volley(300);
    tuned.volley(300);
    expect(tuned.hits.length).toBeGreaterThan(plain.hits.length);
    const mean = (hs: GameEvents['Hit'][]): number => hs.reduce((n, h) => n + h.damage, 0) / Math.max(1, hs.length);
    expect(mean(tuned.hits)).toBeGreaterThan(mean(plain.hits) * 2);
    expect(LEVELS.might.damage).toBeGreaterThan(0); // (Might still scales it: strike())
  });

  it('is kept in a save, and carried into a new journey with the rounds started again', () => {
    const g = createWorldGame();
    Object.assign(g.player, { ammo: 3, rounds: 11, gun: 2 });
    const back = createWorldGame({ save: parseSave(JSON.stringify(snapshot(g)))! });
    expect(back.player).toMatchObject({ ammo: 3, rounds: 11, gun: 2 });
    const old = JSON.parse(JSON.stringify(snapshot(g))) as Record<string, unknown>;
    for (const k of ['ammo', 'rounds', 'gun']) delete old[k];
    const before = createWorldGame({ save: parseSave(JSON.stringify(old))! });
    expect(before.player).toMatchObject({ ammo: GUN.chamber, rounds: GUN.start, gun: 0 }); // a save from before the limits
    const next = createWorldGame({ carry: parseCarry(JSON.parse(JSON.stringify(carryOf(g))))! });
    expect(next.player).toMatchObject({ gun: 2, ammo: GUN.chamber, rounds: GUN.start });
    expect(parseSave(JSON.stringify({ ...snapshot(g), ammo: 'many' }))).toBeNull();
  });
});
