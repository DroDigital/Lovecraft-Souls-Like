// The mind's mending apart from a fight (round 22) and what Unmoored costs the body (round 23); split from sanity.test.ts in round 24.
import { describe, expect, it } from 'vitest';
import { SANITY, SIM } from '../src/data/tuning';
import { startMove } from '../src/systems/actions';
import { strike } from '../src/systems/combat';
import type { Band, Game } from '../src/systems/components';
import { fighting, mendRate, setSanity } from '../src/systems/sanity';
import { place, press, scriptedGame, steps } from './helpers';

const blow = (damage: number) => ({ damage, poise: 0, guard: 5, hitstop: 2, parryable: false, interrupts: false });

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

describe('Unmoored (round 23): the body suffers with the mind, a little', () => {
  const seconds = (g: Game, n: number): void => steps(g, Math.round(n * SIM.hz));
  /** A game with the mind at `sanity`, held there: far from the foe's aura, and in a fight as far as mending goes. */
  function held(sanity: number) {
    const s = scriptedGame();
    place(s.g, s.player, 0, 20, Math.PI);
    place(s.g, s.deepOne, 0, -15, 0);
    s.g.mind.fought = Infinity;
    setSanity(s.g, sanity);
    return s;
  }

  it('gets its stamina back at a share of the pace, and only in the fourth band', () => {
    const regained = (sanity: number): number => {
      const { g, player } = held(sanity);
      const st = g.ecs.c.stamina.get(player)!;
      [st.value, st.delay] = [0, 0];
      seconds(g, 2);
      return st.value;
    };
    const whole = regained(100);
    expect(whole).toBeGreaterThan(0);
    expect(regained(30)).toBeCloseTo(whole, 6); // fractured
    expect(regained(5)).toBeCloseTo(whole * SANITY.unmoored.stamina, 6);
    expect(SANITY.unmoored.stamina).toBeLessThan(1);
  });

  it('wears the body away by a little of full health a second, and nothing in the bands above', () => {
    const lost = (sanity: number): number => {
      const { g, player } = held(sanity);
      const h = g.ecs.c.health.get(player)!;
      seconds(g, 10);
      return h.max - h.hp;
    };
    expect(lost(100)).toBe(0);
    expect(lost(30)).toBe(0);
    const { g, player } = held(5);
    expect(lost(5)).toBeCloseTo(g.ecs.c.health.get(player)!.max * SANITY.unmoored.bleed * 10, 3);
    expect(SANITY.unmoored.bleed).toBeLessThan(0.005); // (it is a wearing, not a wound: under a whole life in three minutes)
  });

  it('never wears it to death, and a shot of Reagent holds it off', () => {
    const { g, player } = held(5);
    const h = g.ecs.c.health.get(player)!;
    h.hp = 1.2;
    seconds(g, 20);
    expect(h.hp).toBe(1);
    h.hp = 100;
    g.player.mended = SIM.hz * 3;
    seconds(g, 2);
    expect(h.hp).toBe(100);
    seconds(g, 2); // (the hold runs out a second in)
    expect(h.hp).toBeLessThan(100);
    h.hp = 0; // fallen
    seconds(g, 2);
    expect(h.hp).toBe(0);
  });
});

