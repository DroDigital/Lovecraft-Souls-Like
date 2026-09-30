import { describe, expect, it } from 'vitest';
import type { Entity } from '../src/core/ecs';
import { PLAYER_MOVES } from '../src/data/moves';
import { DEEP_ONE } from '../src/data/placeholders';
import { LAUDANUM, SANITY, SIM } from '../src/data/tuning';
import { startMove } from '../src/systems/actions';
import { strike } from '../src/systems/combat';
import type { Band, Game } from '../src/systems/components';
import { createGame, stepGame } from '../src/systems/game';
import { auraShare, bandOf, fighting, loseSanity, mendRate, nextBand, setSanity } from '../src/systems/sanity';
import { callsForLaudanum } from '../src/ui/mindHud';
import { place, press, scriptedGame, steps } from './helpers';

const blow = (damage: number) => ({ damage, poise: 0, guard: 5, hitstop: 2, parryable: false, interrupts: false });
const find = (g: Game, model: string): Entity => [...g.ecs.c.model].find(([, m]) => m === model)![0];

function bandLog(g: Game): [Band, Band][] {
  const log: [Band, Band][] = [];
  g.events.on('SanityBandChanged', (e) => log.push([e.from, e.to]));
  return log;
}

describe('sanity bands', () => {
  it.each([
    [100, 'lucid'],
    [70, 'lucid'],
    [69.9, 'uneasy'],
    [40, 'uneasy'],
    [39.9, 'fractured'],
    [15, 'fractured'],
    [14.9, 'unmoored'],
    [0, 'unmoored'],
  ] as const)('sanity %d is %s', (s, band) => {
    expect(bandOf(s)).toBe(band);
  });

  it('falls at a floor at once, but climbs back only 3 points past it', () => {
    expect(nextBand('lucid', 69.9)).toBe('uneasy');
    expect(nextBand('uneasy', 72.9)).toBe('uneasy');
    expect(nextBand('uneasy', 73)).toBe('lucid');
    expect(nextBand('fractured', 42.9)).toBe('fractured');
    expect(nextBand('fractured', 43)).toBe('uneasy');
    expect(nextBand('unmoored', 17.9)).toBe('unmoored');
    expect(nextBand('unmoored', 18)).toBe('fractured');
    expect(nextBand('unmoored', 100)).toBe('lucid');
    expect(nextBand('lucid', 10)).toBe('unmoored');
  });

  it('announces each band change once, and none while sanity wavers inside the gap', () => {
    const { g } = scriptedGame();
    const log = bandLog(g);
    for (const s of [80, 69, 71, 69.5, 72.5, 60]) setSanity(g, s);
    expect(log).toEqual([['lucid', 'uneasy']]);
    setSanity(g, 73);
    setSanity(g, 10);
    expect(log).toEqual([
      ['lucid', 'uneasy'],
      ['uneasy', 'lucid'],
      ['lucid', 'unmoored'],
    ]);
    expect(g.mind.band).toBe('unmoored');
  });

  it('keeps sanity within 0–100', () => {
    const { g } = scriptedGame();
    setSanity(g, 250);
    expect(g.mind.sanity).toBe(100);
    setSanity(g, -5);
    expect(g.mind.sanity).toBe(0);
  });
});

describe('sanity drains', () => {
  it('an aura is whole within auraNear of the body and gone past auraFar', () => {
    expect(auraShare(0)).toBe(1);
    expect(auraShare(SANITY.auraNear)).toBe(1);
    expect(auraShare((SANITY.auraNear + SANITY.auraFar) / 2)).toBeCloseTo(0.5);
    expect(auraShare(SANITY.auraFar)).toBe(0);
  });

  it('drains near a creature with an aura, fading with distance', () => {
    const { g, player, deepOne } = scriptedGame();
    const d = g.ecs.c.dread.get(deepOne)!;
    const aura = d.aura * (d.tier === 'lesser' ? SANITY.lesserAura : 1); // the vermin's weigh less (round 17)
    const r = g.ecs.c.body.get(deepOne)!.radius;
    g.mind.fought = Infinity; // (in a fight, the mind does not mend: round 22)
    place(g, deepOne, 0, 0, 0);
    place(g, player, 0, r + SANITY.auraNear - 0.5, Math.PI);
    steps(g, 60);
    expect(g.mind.sanity).toBeCloseTo(100 - aura, 5);
    place(g, player, 0, r + (SANITY.auraNear + SANITY.auraFar) / 2, Math.PI);
    steps(g, 60);
    expect(g.mind.sanity).toBeCloseTo(100 - aura * 1.5, 5);
    place(g, player, 0, r + SANITY.auraFar + 1, Math.PI);
    const before = g.mind.sanity;
    steps(g, 60);
    expect(g.mind.sanity).toBe(before);
  });

  it('a crowd weighs on the mind, but not as its sum: the strongest aura whole, the rest in part (round 17)', () => {
    const { g, player, deepOne } = scriptedGame();
    const d = g.ecs.c.dread.get(deepOne)!;
    const one = d.aura * (d.tier === 'lesser' ? SANITY.lesserAura : 1);
    const twin = g.ecs.spawn();
    g.ecs.c.dread.set(twin, { ...d });
    g.ecs.c.transform.set(twin, { pos: { x: 0, y: 0, z: 0 }, prev: { x: 0, y: 0, z: 0 }, yaw: 0, prevYaw: 0 });
    g.ecs.c.body.set(twin, { ...g.ecs.c.body.get(deepOne)! });
    place(g, deepOne, 0, 0, 0);
    place(g, player, 0, g.ecs.c.body.get(deepOne)!.radius + 1, Math.PI);
    steps(g, 60);
    expect(g.mind.sanity).toBeCloseTo(100 - one * (1 + SANITY.auraStack), 5);
  });

  it("landed blows take the attacker's sanityDamage; blocked and dodged ones do not", () => {
    const { g, player, deepOne } = scriptedGame();
    const loss = g.ecs.c.dread.get(deepOne)!.blow;
    place(g, player, 0, 0, 0);
    place(g, deepOne, 0, 1.5, Math.PI);
    strike(g, deepOne, player, blow(10));
    expect(g.mind.sanity).toBe(100 - loss);
    const a = g.ecs.c.actor.get(player)!;
    a.guard = true;
    expect(strike(g, deepOne, player, blow(10))).toBe('blocked');
    a.guard = false;
    startMove(a, 'roll');
    a.frame = 5;
    expect(strike(g, deepOne, player, blow(10))).toBe('dodged');
    expect(g.mind.sanity).toBe(100 - loss);
  });

  it('a roar takes sanity from the investigator in range, and a muffled share through walls', () => {
    const g = createGame({ creature: 'dagon_priest' });
    g.mind.fought = Infinity; // (in a fight, the mind does not mend: round 22)
    const priest = find(g, 'creature:dagon_priest');
    g.ecs.c.brain.delete(priest);
    g.ecs.c.dread.get(priest)!.aura = 0;
    g.mind.seen.add('dagon_priest'); // no first-sight shock
    const roar = g.ecs.c.actor.get(priest)!.moves.roar.sanity!;
    place(g, priest, -8, -2, 0);
    place(g, g.player.id, -8, 4, Math.PI); // the pillar at (-8, 1) stands between them
    startMove(g.ecs.c.actor.get(priest)!, 'roar');
    steps(g, 60);
    const muffled = 100 - roar.amount * SANITY.muffled;
    expect(g.mind.sanity).toBeCloseTo(muffled, 5);
    place(g, g.player.id, -4, -2, -Math.PI / 2); // in the open
    startMove(g.ecs.c.actor.get(priest)!, 'roar');
    steps(g, 60);
    expect(g.mind.sanity).toBeCloseTo(muffled - roar.amount, 5);
    place(g, g.player.id, -8, -2 + roar.range + 1, Math.PI);
    startMove(g.ecs.c.actor.get(priest)!, 'roar');
    steps(g, 60);
    expect(g.mind.sanity).toBeCloseTo(muffled - roar.amount, 5);
  });

  it('a gaze needs line of sight', () => {
    const g = createGame({ creature: 'yekubian' });
    g.mind.fought = Infinity; // (in a fight, the mind does not mend: round 22)
    const gazer = find(g, 'creature:yekubian');
    g.ecs.c.brain.delete(gazer);
    g.ecs.c.dread.get(gazer)!.aura = 0;
    g.mind.seen.add('yekubian'); // no first-sight shock
    const gaze = g.ecs.c.actor.get(gazer)!.moves.gaze.sanity!;
    expect(gaze.sight).toBe(true);
    place(g, gazer, -8, -2, 0);
    place(g, g.player.id, -8, 4, Math.PI);
    startMove(g.ecs.c.actor.get(gazer)!, 'gaze');
    steps(g, 80);
    expect(g.mind.sanity).toBe(100);
    place(g, g.player.id, -4, 4, Math.PI);
    startMove(g.ecs.c.actor.get(gazer)!, 'gaze');
    steps(g, 80);
    expect(g.mind.sanity).toBeCloseTo(100 - gaze.amount, 5);
  });
});

describe('sudden losses', () => {
  it('a loss of SANITY.jolt or more at once is announced; a slow drain is not', () => {
    const g = createGame();
    const lost: number[] = [];
    g.events.on('SanityLost', (e) => lost.push(e.amount));
    loseSanity(g, SANITY.jolt / 3);
    loseSanity(g, 6);
    expect(lost).toEqual([6]);
    setSanity(g, 2);
    loseSanity(g, 10); // only what there was to lose
    expect(lost).toEqual([6, 2]);
  });

  it('a failing mind is pointed to its Laudanum while a dose is left and none is being drunk', () => {
    const g = createGame();
    expect(callsForLaudanum(g)).toBe(false);
    setSanity(g, 39);
    expect(callsForLaudanum(g)).toBe(true);
    startMove(g.ecs.c.actor.get(g.player.id)!, 'drink');
    expect(callsForLaudanum(g)).toBe(false);
    g.ecs.c.actor.get(g.player.id)!.move = null;
    g.player.laudanum = 0;
    expect(callsForLaudanum(g)).toBe(false);
  });
});

describe('what sanity does, and what restores it', () => {
  it('a failing mind deals and takes more damage', () => {
    const { g, player, deepOne } = scriptedGame();
    const hp = (id: Entity): number => g.ecs.c.health.get(id)!.hp;
    strike(g, player, deepOne, blow(20));
    expect(DEEP_ONE.hp - hp(deepOne)).toBe(20);
    setSanity(g, 10);
    const foe = hp(deepOne);
    strike(g, player, deepOne, blow(20));
    expect(foe - hp(deepOne)).toBe(Math.round(20 * SANITY.dealt[3]));
    const me = hp(player);
    strike(g, deepOne, player, blow(20));
    expect(me - hp(player)).toBe(Math.round(20 * SANITY.taken[3]));
  });

  it('a dose of Laudanum restores sanity on its item frame; with none left nothing happens', () => {
    const { g, player } = scriptedGame();
    const a = g.ecs.c.actor.get(player)!;
    g.mind.fought = Infinity; // (in a fight, the mind does not mend: round 22)
    setSanity(g, 30);
    stepGame(g, press('item'));
    expect(a.move).toBe('drink');
    expect(g.player.laudanum).toBe(LAUDANUM.doses - 1);
    steps(g, PLAYER_MOVES.drink.item - 1);
    expect(g.mind.sanity).toBe(30);
    steps(g, 1);
    expect(g.mind.sanity).toBe(30 + LAUDANUM.sanity);
    steps(g, PLAYER_MOVES.drink.frames);
    g.player.laudanum = 0;
    stepGame(g, press('item'));
    expect(a.move).toBeNull();
  });

  it('respawning at the Elder Sign restores sanity and Laudanum', () => {
    const { g, player, deepOne } = scriptedGame();
    setSanity(g, 20);
    g.player.laudanum = 0;
    strike(g, deepOne, player, blow(9999));
    steps(g, PLAYER_MOVES.death.frames + 5);
    expect(g.mind.sanity).toBe(SANITY.max);
    expect(g.mind.band).toBe('lucid');
    expect(g.player.laudanum).toBe(LAUDANUM.doses);
  });
});

describe('the mind mends by itself, apart from a fight (round 22)', () => {
  /** `n` seconds, at a game's own pace. */
  const seconds = (g: Game, n: number): void => steps(g, Math.round(n * SIM.hz));

  it('slowly in the dark, and not at all once whole', () => {
    const { g } = scriptedGame();
    setSanity(g, 50);
    seconds(g, 10);
    expect(g.mind.sanity).toBeCloseTo(50 + 10 * SANITY.mend.rate, 1);
    expect(g.mind.mending).toBe(SANITY.mend.rate);
    setSanity(g, 100);
    seconds(g, 1);
    expect(g.mind.sanity).toBe(100);
    expect(g.mind.mending).toBe(0);
    expect(SANITY.mend.rate * 60 * 7).toBeGreaterThan(100); // a whole mind in under seven minutes: slow
  });

  it('faster the better lit the ground: a lamp, a fire, a torch, never past the light at its foot', () => {
    const { g } = scriptedGame();
    setSanity(g, 50);
    for (const lit of [0, 0.25, 0.5, 1]) {
      g.lit = () => lit;
      expect(mendRate(g)).toBeCloseTo(SANITY.mend.rate + (SANITY.mend.lit - SANITY.mend.rate) * lit, 9);
    }
    g.lit = () => 7; // (more than whole is whole)
    expect(mendRate(g)).toBe(SANITY.mend.lit);
    g.lit = () => -3;
    expect(mendRate(g)).toBe(SANITY.mend.rate);
    g.lit = () => 1;
    seconds(g, 10);
    expect(g.mind.sanity).toBeCloseTo(50 + 10 * SANITY.mend.lit, 0);
    expect(SANITY.mend.lit).toBeGreaterThan(SANITY.mend.rate * 4);
  });

  it('is held off by a real blow, struck or taken, for a few seconds, and then goes on', () => {
    for (const [by, on] of [['player', 'foe'], ['foe', 'player']] as const) {
      const { g, player, deepOne } = scriptedGame();
      setSanity(g, 50);
      place(g, player, 0, 20, Math.PI);
      place(g, deepOne, 0, -15, 0); // (well beyond its aura)
      const [attacker, target] = by === 'player' ? [player, deepOne] : [deepOne, player];
      strike(g, attacker, target, blow(1));
      const after = g.mind.sanity; // (a foe's blow takes a little of the mind too)
      expect(fighting(g), `${by} → ${on}`).toBe(true);
      seconds(g, SANITY.mend.delay - 0.5);
      expect(g.mind.sanity).toBe(after);
      expect(g.mind.mending).toBe(0);
      seconds(g, 1.5);
      expect(g.mind.sanity).toBeGreaterThan(after);
      expect(fighting(g)).toBe(false);
    }
  });

  it("swinging at the air, or a shot that finds nothing, is no fight; nor is a hallucination's blow, nor a pool's", () => {
    const { g, player, deepOne } = scriptedGame();
    place(g, player, 0, 20, Math.PI);
    place(g, deepOne, 0, -15, 0); // far from the foe, beyond its aura
    setSanity(g, 50);
    steps(g, 1, press('light'));
    steps(g, 40);
    steps(g, 1, press('shoot'));
    steps(g, 40);
    expect(fighting(g)).toBe(false);
    const ghost = g.ecs.spawn();
    g.ecs.c.phantom.set(ghost, { life: 100 } as never);
    g.ecs.c.combatant.set(ghost, { faction: 'enemy', name: 'ghost' } as never);
    g.events.emit('Hit', { attacker: ghost, target: player, outcome: 'hit', damage: 0 }); // a hallucination's
    g.events.emit('Hit', { attacker: deepOne, target: player, outcome: 'hit', damage: 5, lingering: true }); // a pool's tick
    expect(fighting(g)).toBe(false);
    const after = g.mind.sanity; // (the hallucination's blow took its toll on the mind, but was no fight)
    seconds(g, 5);
    expect(g.mind.sanity).toBeGreaterThan(after);
  });

  it('is held off by a foe hunting them within reach, engaged or searching, and not one only alert, idle, or far', () => {
    const { g, player, deepOne } = scriptedGame();
    setSanity(g, 50);
    place(g, player, 0, 5, Math.PI);
    place(g, deepOne, 0, 0, 0);
    const brain = { def: { attacks: [] }, state: 'idle', target: player, lost: 0 } as never as NonNullable<ReturnType<typeof g.ecs.c.brain.get>>;
    g.ecs.c.brain.set(deepOne, brain);
    for (const [state, expected] of [['idle', false], ['alert', false], ['engage', true], ['search', true], ['return', false], ['hidden', false]] as const) {
      brain.state = state;
      expect(fighting(g), state).toBe(expected);
    }
    brain.state = 'engage';
    place(g, deepOne, 0, SANITY.mend.foes + 20, 0); // a long way off
    expect(fighting(g)).toBe(false);
    place(g, deepOne, 0, 0, 0);
    brain.target = null; // hunting someone else
    expect(fighting(g)).toBe(false);
  });

  it('does not begin while an aura presses on the mind, nor while they are fallen', () => {
    const { g, player, deepOne } = scriptedGame();
    setSanity(g, 50);
    const r = g.ecs.c.body.get(deepOne)!.radius;
    place(g, deepOne, 0, 0, 0);
    place(g, player, 0, r + SANITY.auraNear - 0.5, Math.PI);
    seconds(g, 3);
    expect(g.mind.sanity).toBeLessThan(50); // drained, not mended
    expect(g.mind.mending).toBe(0);
    place(g, player, 0, r + SANITY.auraFar + 5, Math.PI);
    const before = g.mind.sanity;
    seconds(g, 2);
    expect(g.mind.sanity).toBeGreaterThan(before);
    startMove(g.ecs.c.actor.get(player)!, 'death');
    expect(mendRate(g)).toBe(0);
  });

  it('climbs back through the bands, with their hysteresis', () => {
    const { g, player, deepOne } = scriptedGame();
    place(g, player, 0, 20, Math.PI);
    place(g, deepOne, 0, -15, 0);
    setSanity(g, 30);
    g.lit = () => 1;
    const log: [Band, Band, number][] = [];
    g.events.on('SanityBandChanged', (e) => log.push([e.from, e.to, e.sanity]));
    seconds(g, 60);
    expect(log.map(([from, to]) => [from, to])).toEqual([['fractured', 'uneasy'], ['uneasy', 'lucid']]);
    expect(log[0][2]).toBeGreaterThanOrEqual(SANITY.bands[1] + SANITY.hysteresis); // not at the floor: three points past it
    expect(log[1][2]).toBeGreaterThanOrEqual(SANITY.bands[0] + SANITY.hysteresis);
  });
});

