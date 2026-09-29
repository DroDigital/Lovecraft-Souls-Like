import { describe, expect, it } from 'vitest';
import { SAMPLE_SETS } from '../src/data/samples';
import { IMPACT } from '../src/data/tuning';
import { blowWeight, impactLayers, landedBlow, LANDS, type Landed } from '../src/render/audio/impact';
import { createImpactFx } from '../src/render/impactFx';
import type { ParticleSpec, Particles } from '../src/render/particles';
import { startMove } from '../src/systems/actions';
import { strike, type Blow } from '../src/systems/combat';
import { place, scriptedGame } from './helpers';

const blow = (o: Partial<Landed> = {}): Landed => ({ outcome: 'hit', damage: 25, heavy: false, chop: false, size: 0.5, great: false, ...o });
const sets = (l: Landed): string[] => impactLayers(l).map((x) => x.set);

describe('the weight of the investigator’s blows (round 20: render/audio/impact.ts)', () => {
  it('a blow weighs more the more it hurts and the more it does, and never past the most', () => {
    const [w0, w1, w2] = [blowWeight(blow({ damage: 0 })), blowWeight(blow({ damage: 25 })), blowWeight(blow({ damage: 80 }))];
    expect(w0).toBeCloseTo(IMPACT.weight.base);
    expect(w0).toBeLessThan(w1);
    expect(w1).toBeLessThan(w2);
    expect(blowWeight(blow({ damage: 80, heavy: true, outcome: 'stagger' }))).toBeGreaterThan(w2);
    for (const outcome of ['riposte', 'kill'] as const) expect(blowWeight(blow({ outcome, damage: 90, heavy: true }))).toBeLessThanOrEqual(IMPACT.weight.most);
    expect(blowWeight(blow({ outcome: 'kill' }))).toBeGreaterThan(blowWeight(blow({ outcome: 'riposte' })));
  });

  it('only what lands on flesh sounds: nothing for a guard, a parry, a dodge or a broken guard', () => {
    for (const outcome of ['blocked', 'parried', 'dodged', 'guardBreak', 'interrupted'] as const) expect(impactLayers(blow({ outcome })), outcome).toEqual([]);
    for (const outcome of LANDS) expect(sets(blow({ outcome }))[0], outcome).toBe('flesh');
  });

  it('a light cut is flesh alone; a hard one a smack over it; a killing blow or a riposte bone and a wet burst', () => {
    expect(sets(blow({ damage: 10 }))).toEqual(['flesh']);
    expect(sets(blow({ damage: 60, heavy: true }))).toContain('smack');
    for (const outcome of ['kill', 'riposte'] as const) expect(sets(blow({ outcome })), outcome).toEqual(expect.arrayContaining(['flesh', 'crunch', 'splat']));
    expect(sets(blow({ damage: 10 }))).not.toContain('crunch');
  });

  it('an axe bites; the low boom is for a great foe’s fall or a crushing blow, and no light cut booms', () => {
    expect(sets(blow({ chop: true }))).toContain('chop');
    expect(sets(blow({ chop: true }))).not.toContain('smack');
    expect(sets(blow({ outcome: 'kill', great: true }))).toContain('boom');
    expect(sets(blow({ outcome: 'kill', size: 0.3, damage: 8 }))).not.toContain('boom');
    expect(sets(blow({ heavy: true, damage: 90, outcome: 'riposte', chop: true }))).toContain('boom');
    expect(sets(blow({ heavy: true, damage: 90, outcome: 'stagger', chop: true }))).not.toContain('boom'); // a hard blow that merely staggers does not
    expect(sets(blow({ damage: 20 }))).not.toContain('boom');
  });

  it('a bigger body sounds lower, and the layers land a moment apart, the heaviest not first of the lighter ones', () => {
    const pitch = (size: number): number => impactLayers(blow({ size }))[0].pitch;
    expect(pitch(2)).toBeLessThan(pitch(0.5));
    expect(pitch(0.1)).toBeLessThanOrEqual(1.25);
    expect(pitch(9)).toBeGreaterThanOrEqual(0.7);
    const layers = impactLayers(blow({ outcome: 'kill', great: true }));
    const delays = layers.map((l) => l.delay);
    expect(Math.min(...delays)).toBe(0);
    for (const l of layers) {
      expect(SAMPLE_SETS[l.set], l.set).toBeDefined();
      expect(l.gain).toBeGreaterThan(0);
      expect(l.gain).toBeLessThanOrEqual(1.3);
      expect(l.delay).toBeLessThan(0.1);
    }
  });

  it('is read off the investigator’s blow only', () => {
    const { g, player, deepOne } = scriptedGame();
    const hit = (attacker: number, target: number) => landedBlow(g, { attacker, target, outcome: 'hit', damage: 20 });
    expect(hit(player, deepOne)).toMatchObject({ outcome: 'hit', damage: 20, chop: false });
    expect(hit(deepOne, player)).toBeNull();
    expect(landedBlow(g, { attacker: player, target: deepOne, outcome: 'hit', damage: 20, lingering: true })).toBeNull();
    g.player.weapon = 'axe';
    expect(hit(player, deepOne)!.chop).toBe(true);
    g.ecs.c.body.get(deepOne)!.radius = 1.4;
    expect(hit(player, deepOne)!.great).toBe(true); // a body as big as a great one
  });
});

describe('a finishing blow hangs (round 20: systems/combat.ts)', () => {
  const swing: Blow = { damage: 10, poise: 5, guard: 5, hitstop: 3, parryable: true, interrupts: false };

  it('the investigator’s riposte or kill holds the moment longer; a plain cut, and a foe’s riposte, do not', () => {
    const { g, player, deepOne } = scriptedGame();
    place(g, player, 0, 0, 0);
    place(g, deepOne, 0, 1.2, Math.PI);
    const held = (): { me: number; foe: number } => ({ me: g.ecs.c.actor.get(player)!.hitstop, foe: g.ecs.c.actor.get(deepOne)!.hitstop });
    expect(strike(g, player, deepOne, swing)).toBe('hit');
    expect(held()).toEqual({ me: 3, foe: 3 });
    for (const id of [player, deepOne]) g.ecs.c.actor.get(id)!.hitstop = 0;
    startMove(g.ecs.c.actor.get(deepOne)!, 'parried');
    expect(strike(g, player, deepOne, swing)).toBe('riposte');
    expect(held()).toEqual({ me: 3 + IMPACT.finisher, foe: 3 + IMPACT.finisher });
    for (const id of [player, deepOne]) g.ecs.c.actor.get(id)!.hitstop = 0;
    startMove(g.ecs.c.actor.get(player)!, 'parried');
    expect(strike(g, deepOne, player, swing)).toBe('riposte');
    expect(held().foe).toBe(3); // theirs is no finisher of the investigator's
  });
});

/** Particles that keep what they are given. */
function counting(): Particles & { made: ParticleSpec[] } {
  const made: ParticleSpec[] = [];
  return { made, spawn: (p) => void made.push(p), update: () => undefined };
}

describe('the blow seen (round 20: render/impactFx.ts)', () => {
  const landOn = (o: { outcome: 'hit' | 'kill' | 'blocked'; damage: number }) => {
    const { g, player, deepOne } = scriptedGame();
    place(g, player, 0, 0, 0);
    place(g, deepOne, 0, 1.4, Math.PI);
    const fx = counting();
    const impact = createImpactFx(g, fx);
    g.events.emit('Hit', { attacker: player, target: deepOne, ...o });
    return { g, fx, impact };
  };
  const camera = () => ({ position: { x: 0, y: 1.6, z: -3 } });

  it('a landed blow flares and throws sparks along the swing; a kill sends a ring; a guarded one nothing', () => {
    const cut = landOn({ outcome: 'hit', damage: 20 });
    const kill = landOn({ outcome: 'kill', damage: 60 });
    expect(cut.fx.made.length).toBeGreaterThan(10);
    expect(kill.fx.made.length).toBeGreaterThan(cut.fx.made.length + 10); // more sparks, more ichor, and the ring
    expect(cut.fx.made.filter((p) => p.glow).length).toBeGreaterThan(8);
    expect(landOn({ outcome: 'blocked', damage: 0 }).fx.made).toEqual([]);
    expect(kill.fx.made.filter((p) => p.gravity && p.life < 0.4 && (p.vx || p.vz)).length).toBeGreaterThan(20); // sparks fly and fall within a third of a second
    expect(kill.fx.made.filter((p) => p.gravity && p.life >= 0.5).length).toBeGreaterThanOrEqual(IMPACT.chunks[0]); // clots of ichor hang longer
  });

  it('the camera is punched toward the blow and eases back within a fifth of a second', () => {
    const { impact } = landOn({ outcome: 'kill', damage: 60 });
    const at = (t: number) => {
      const c = camera();
      impact.update(c as never, t);
      return c.position.z;
    };
    expect(at(10)).toBeCloseTo(-3, 1); // nothing yet: the punch is stamped at the first frame drawn
    const pushed = Math.max(...[10.03, 10.05, 10.08].map((t) => at(t)));
    expect(pushed).toBeGreaterThan(-3 + 0.02); // toward it (+z: the foe is ahead)
    expect(at(10 + IMPACT.kick.seconds + 0.05)).toBeCloseTo(-3, 5);
  });
});
