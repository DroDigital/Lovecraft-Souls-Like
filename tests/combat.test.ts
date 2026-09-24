import { describe, expect, it } from 'vitest';
import { emptyInput } from '../src/core/input';
import { PLAYER_MOVES } from '../src/data/moves';
import { DEEP_ONE } from '../src/data/placeholders';
import { COMBAT, PLAYER } from '../src/data/tuning';
import { createActor, startMove } from '../src/systems/actions';
import { hitCentre, resolveHit, type Blow, type Defender } from '../src/systems/combat';
import type { Game, GameEvents } from '../src/systems/components';
import { stepGame } from '../src/systems/game';
import { place, press, scriptedGame, steps } from './helpers';

const light: Blow = { ...PLAYER_MOVES.light1.hit!, parryable: true, interrupts: false };

function deepOne(): Defender {
  return {
    actor: createActor(DEEP_ONE.moves),
    health: { hp: DEEP_ONE.hp, max: DEEP_ONE.hp, immortal: false, calm: 0 },
    poise: { value: DEEP_ONE.poise, max: DEEP_ONE.poise, calm: 0 },
  };
}

/** Collects the Hit events of a game. */
function hits(g: Game): GameEvents['Hit'][] {
  const seen: GameEvents['Hit'][] = [];
  g.events.on('Hit', (e) => seen.push(e));
  return seen;
}

/** Player 1.3 m in front of the Deep One, facing each other; the Deep One starts its claw. */
function clawSetup(behind = false) {
  const s = scriptedGame();
  place(s.g, s.player, 0, behind ? -1.3 : 1.3, behind ? 0 : Math.PI);
  place(s.g, s.deepOne, 0, 0, 0);
  startMove(s.g.ecs.c.actor.get(s.deepOne)!, 'claw');
  return { ...s, seen: hits(s.g) };
}

describe('hit resolution', () => {
  it('breaks poise on the third light hit, then refills it', () => {
    const d = deepOne();
    expect([1, 2, 3].map(() => resolveHit(d, light, true).outcome)).toEqual(['hit', 'hit', 'stagger']);
    expect(d.actor.move).toBe('stagger');
    expect(d.poise.value).toBe(DEEP_ONE.poise);
    expect(d.health.hp).toBe(DEEP_ONE.hp - 3 * light.damage);
  });

  it('ripostes a parried foe for bonus damage, and kills at zero hp', () => {
    const d = deepOne();
    startMove(d.actor, 'parried');
    expect(resolveHit(d, light, true)).toEqual({ outcome: 'riposte', damage: light.damage * COMBAT.riposte });
    expect(d.actor.move).toBe('stagger');
    d.health.hp = 10;
    expect(resolveHit(d, light, true).outcome).toBe('kill');
    expect(d.actor.move).toBe('death');
  });

  it('keeps an immortal dummy alive', () => {
    const d = deepOne();
    d.health = { hp: 5, max: 300, immortal: true, calm: 0 };
    expect(resolveHit(d, light, true).outcome).not.toBe('kill');
    expect(d.health.hp).toBe(1);
  });

  it('only blocks from the front', () => {
    const d = { ...deepOne(), stamina: { value: 100, max: 100, delay: 0 } };
    d.actor.guard = true;
    expect(resolveHit(d, light, true).outcome).toBe('blocked');
    expect(resolveHit(d, light, false).outcome).toBe('hit');
  });

  it('sweeps the hitbox from the arc start to its end at the move reach', () => {
    const hit = PLAYER_MOVES.light1.hit!; // 70° right to 70° left; facing +z, right is -x
    const a = hitCentre({ x: 0, y: 0, z: 0 }, 0, hit, 0);
    const b = hitCentre({ x: 0, y: 0, z: 0 }, 0, hit, 1);
    expect(a.x).toBeLessThan(0);
    expect(b.x).toBeGreaterThan(0);
    expect(Math.hypot(a.x, a.z)).toBeCloseTo(hit.reach);
    expect(a.y).toBe(hit.height);
  });
});

describe('melee in play', () => {
  it('lands the claw once on a player in front, with hitstop on both', () => {
    const { g, player, deepOne: foe, seen } = clawSetup();
    while (seen.length === 0 && g.frame < 40) stepGame(g, emptyInput());
    const claw = DEEP_ONE.moves.claw.hit!;
    expect(seen).toEqual([{ attacker: foe, target: player, outcome: 'hit', damage: claw.damage }]);
    expect(g.ecs.c.actor.get(player)!.hitstop).toBe(claw.hitstop);
    expect(g.ecs.c.actor.get(foe)!.hitstop).toBe(claw.hitstop);
    steps(g, 40);
    expect(seen).toHaveLength(1);
    expect(g.ecs.c.health.get(player)!.hp).toBe(PLAYER.hp - claw.damage);
  });

  it('misses a player behind the attacker', () => {
    const { g, seen } = clawSetup(true);
    steps(g, 60);
    expect(seen).toEqual([]);
  });

  it('parries a well-timed claw, then ripostes the parried Deep One', () => {
    const { g, player, deepOne: foe, seen } = clawSetup();
    steps(g, 14);
    stepGame(g, press('parry')); // parry frames 3..10 cover claw frames 18..25
    steps(g, 12);
    expect(seen.map((e) => e.outcome)).toEqual(['parried']);
    expect(g.ecs.c.actor.get(foe)!.move).toBe('parried');
    steps(g, 26); // parry recovery
    stepGame(g, press('light'));
    steps(g, 14);
    expect(seen.map((e) => e.outcome)).toEqual(['parried', 'riposte']);
    expect(seen[1].damage).toBe(light.damage * COMBAT.riposte);
    expect(g.ecs.c.health.get(player)!.hp).toBe(PLAYER.hp);
  });
});

describe('revolver', () => {
  it('interrupts a wind-up, but only hurts once the swing is committed', () => {
    for (const [wait, outcome, move] of [
      [2, 'interrupted', 'parried'], // shot lands on claw frame 10, inside its interrupt window
      [17, 'hit', 'claw'], // claw frame 25: too late
    ] as const) {
      const { g, player, deepOne: foe } = scriptedGame();
      const seen = hits(g);
      place(g, player, 0, 8, Math.PI);
      place(g, foe, 0, 0, 0);
      startMove(g.ecs.c.actor.get(foe)!, 'claw');
      const shots: GameEvents['Shot'][] = [];
      g.events.on('Shot', (e) => shots.push(e));
      steps(g, wait);
      stepGame(g, press('shoot'));
      steps(g, PLAYER_MOVES.shoot.shot.frame);
      expect(shots.map((s) => s.target)).toEqual([foe]);
      expect(seen.map((e) => [e.outcome, e.damage])).toEqual([[outcome, PLAYER_MOVES.shoot.shot.damage]]);
      expect(g.ecs.c.actor.get(foe)!.move).toBe(move);
    }
  });
});
