import { describe, expect, it } from 'vitest';
import { shaperCurve } from '../src/render/audio/engine';
import { REGIONS } from '../src/data/regions';
import { ENTITIES, getEntity } from '../src/data/registry';
import { STINGERS, type Sound } from '../src/data/sounds';
import { validateRegistry } from '../src/data/validate';
import { DRONES, VOICES, voiceOf } from '../src/data/voices';
import { cueFor, nextCall, placeSound } from '../src/render/audio/cues';
import type { HitOutcome } from '../src/systems/components';
import { createGame } from '../src/systems/game';

const audible = (hz: number | undefined): boolean => hz === undefined || (hz >= 20 && hz <= 20000);

/** Problems with a recipe: every layer must be playable and bounded. */
function problems(sound: Sound): string[] {
  const out: string[] = [];
  if (sound.length === 0) out.push('no layers');
  sound.forEach((l, i) => {
    const bad = (why: string): number => out.push(`layer ${i}: ${why}`);
    if (l.src !== 'noise' && !audible(l.hz)) bad(`pitch ${l.hz}`);
    if (l.src !== 'noise' && l.hz === undefined) bad('an oscillator needs a pitch');
    if (l.src === 'noise' && !l.filter) bad('noise needs a filter');
    if (!audible(l.to)) bad(`glide to ${l.to}`);
    if (!(l.dur > 0 && l.dur <= 10)) bad(`duration ${l.dur}`);
    if (!((l.at ?? 0) >= 0 && (l.at ?? 0) < 5)) bad(`start ${l.at}`);
    if (!(l.gain > 0 && l.gain <= 1)) bad(`gain ${l.gain}`);
    if ((l.attack ?? 0) < 0 || (l.attack ?? 0) > l.dur) bad(`attack ${l.attack}`);
    if (l.filter && (!audible(l.filter.hz) || !audible(l.filter.to) || (l.filter.q ?? 1) <= 0)) bad('filter out of range');
    if (l.vibrato && !(l.vibrato[0] > 0 && l.vibrato[0] < 50 && l.vibrato[1] >= 0 && l.vibrato[1] <= 200)) bad('vibrato out of range');
  });
  return out;
}

describe('sound data', () => {
  it('every stinger and voice is a playable recipe', () => {
    for (const [id, s] of Object.entries(STINGERS)) expect(problems(s), id).toEqual([]);
    for (const [id, v] of Object.entries(VOICES)) {
      expect(problems(v.call), id).toEqual([]);
      expect(v.every[0] > 0 && v.every[0] <= v.every[1], id).toBe(true);
      expect(v.range, id).toBeGreaterThan(5);
    }
  });

  it('every region, the arena, the title and a boss fight have a drone (and madness none of its own)', () => {
    for (const id of [...REGIONS.map((r) => r.id), 'arena', 'title', 'boss']) {
      const d = (DRONES as Record<string, (typeof DRONES)['hub']>)[id];
      expect(d, id).toBeDefined();
      expect(d.hz * Math.min(...d.ratios)).toBeGreaterThanOrEqual(20);
      expect(d.gain).toBeGreaterThan(0);
    }
    expect((DRONES as Record<string, unknown>).sanity).toBeUndefined();
  });

  it('gives the polyps their whistling and the shoggoth its piping; night-gaunts are silent; allies keep quiet', () => {
    expect(voiceOf(getEntity('flying_polyp')!)).toBe(VOICES.whistle);
    expect(voiceOf(getEntity('shoggoth')!)).toBe(VOICES.tekeli);
    expect(voiceOf(getEntity('night_gaunt')!)).toBeNull();
    expect(voiceOf(getEntity('nodens')!)).toBeNull();
    expect(voiceOf(getEntity('gug')!)).toBe(VOICES.bellow); // a greater entry without its own voice
    expect(ENTITIES.filter((d) => voiceOf(d)).length).toBeGreaterThan(90);
  });

  it('the validator catches a voice that does not resolve', () => {
    const deep = getEntity('deep_one')!;
    const bad = { ...deep, voice: 'kazoo' } as unknown as typeof deep;
    expect(validateRegistry(ENTITIES.map((d) => (d.id === 'deep_one' ? bad : d)))).toContain('deep_one: unknown voice kazoo');
  });
});

describe('cues', () => {
  const g = createGame();
  const [player, dummy] = [...g.ecs.c.combatant.keys()];
  const hit = (outcome: HitOutcome, lingering = false) => cueFor(g, 'Hit', { attacker: player, target: dummy, outcome, damage: 10, lingering });

  it('blows sound by outcome, where they land; pools and the void tick silently', () => {
    expect(hit('blocked')?.sound).toBe('blocked');
    expect(hit('stagger')?.sound).toBe('hit');
    expect(hit('riposte')?.sound).toBe('riposte');
    expect(hit('hit')?.at).toEqual(g.ecs.c.transform.get(dummy)!.pos);
    expect(hit('hit', true)).toBeNull();
  });

  it('the mind sounds inside the head; a band change says which way it went', () => {
    expect(cueFor(g, 'SanityBandChanged', { from: 'lucid', to: 'uneasy', sanity: 69 })).toEqual({ sound: 'worse', at: null });
    expect(cueFor(g, 'SanityBandChanged', { from: 'fractured', to: 'uneasy', sanity: 44 })?.sound).toBe('better');
    const sight = (sanity: number) => cueFor(g, 'FirstSight', { entity: dummy, name: 'x', sanity, insight: 0 });
    expect(sight(0)).toBeNull();
    expect(sight(25)!.pitch!).toBeLessThan(sight(6)!.pitch!); // a greater horror sounds lower
  });

  it('only the investigator’s death and a boss’s later phases get a stinger', () => {
    expect(cueFor(g, 'Died', { entity: player, killer: null, at: { x: 0, y: 0, z: 0 } })?.sound).toBe('death');
    expect(cueFor(g, 'Died', { entity: dummy, killer: null, at: { x: 0, y: 0, z: 0 } })).toBeNull();
    expect(cueFor(g, 'BossPhase', { entity: dummy, phase: 0 })).toBeNull();
    expect(cueFor(g, 'BossPhase', { entity: dummy, phase: 1 })?.sound).toBe('phase');
    expect(cueFor(g, 'Notice', { text: 'x' })).toBeNull();
  });
});

describe('placeSound', () => {
  const o = { x: 0, y: 0, z: 0 };
  const right = { x: 1, y: 0, z: 0 };

  it('is whole up close, fades to nothing at its range, and pans by bearing', () => {
    expect(placeSound(o, right, null, 20)).toEqual({ gain: 1, pan: 0 });
    expect(placeSound(o, right, { x: 0, y: 0, z: 2 }, 20).gain).toBe(1);
    const mid = placeSound(o, right, { x: 0, y: 0, z: 11 }, 20).gain;
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(1);
    expect(placeSound(o, right, { x: 0, y: 0, z: 25 }, 20).gain).toBe(0);
    expect(placeSound(o, right, { x: 5, y: 0, z: 0 }, 20).pan).toBeGreaterThan(0.5);
    expect(placeSound(o, right, { x: -5, y: 0, z: 1 }, 20).pan).toBeLessThan(-0.5);
    expect(placeSound(o, right, { x: 0, y: 4, z: 0 }, 20).pan).toBe(0);
  });

  it('a creature calls again within its voice’s interval', () => {
    const v = VOICES.tekeli;
    expect(nextCall(v, 10, () => 0)).toBe(10 + v.every[0]);
    expect(nextCall(v, 10, () => 1)).toBe(10 + v.every[1]);
  });
});

describe('the sanity saturation (render/audio/engine.ts)', () => {
  it('never turns anything up: quiet sounds pass at their level, only loud ones are squashed', () => {
    for (const amount of [0, 0.3, 0.85, 1]) {
      const c = shaperCurve(amount);
      const n = c.length - 1;
      for (let i = 0; i <= n; i++) {
        const x = (i / n) * 2 - 1;
        expect(Math.abs(c[i]), `${amount} at ${x.toFixed(3)}`).toBeLessThanOrEqual(Math.abs(x) + 1e-6);
      }
      const near = Math.round(n / 2 + n * 0.005); // x ≈ 0.01
      const x = (near / n) * 2 - 1;
      expect(c[near] / x, `slope at silence, ${amount}`).toBeCloseTo(1, 2);
    }
    expect(shaperCurve(0.85).at(-1)!).toBeLessThan(0.7); // full scale is squashed when mad
    expect(shaperCurve(0).at(-1)!).toBeCloseTo(1); // and untouched when lucid
  });
});
