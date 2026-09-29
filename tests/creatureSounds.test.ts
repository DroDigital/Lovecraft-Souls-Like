import { describe, expect, it } from 'vitest';
import { ATTACK_SOUNDS, CREATURE_SOUNDS, soundOf } from '../src/data/creatureSounds';
import { ENTITIES, getEntity } from '../src/data/registry';
import { SAMPLE_SETS, VOICE_SAMPLES, type SampleSetId } from '../src/data/samples';
import { ATTACK_IDS } from '../src/data/schema';
import { voiceIdOf } from '../src/data/voices';
import { attackSound, strikeFrame } from '../src/render/audio/foley';
import { compileAttack } from '../src/data/attacks';

const voiced = ENTITIES.filter((d) => voiceIdOf(d) !== null);
const enemies = voiced.filter((d) => d.tier !== 'ally');

/** Every attack a creature may use: its own, and each phase of its script. */
const attacksOf = (id: string): Set<string> => {
  const d = getEntity(id)!;
  return new Set([...d.behavior.attacks, ...(d.bossScript?.phases.flatMap((p) => p.attacks.map((a) => a.id)) ?? []), ...(d.bossVariant?.behavior?.attacks ?? [])]);
};

describe('every creature its own sound (round 20: data/creatureSounds.ts)', () => {
  it('every voiced creature has its sounds, and no silent one does; every set they name is recorded', () => {
    for (const d of voiced) expect(soundOf(d.id), d.id).toBeDefined();
    for (const id of Object.keys(CREATURE_SOUNDS)) expect(voiced.some((d) => d.id === id), `${id} is silent or unknown`).toBe(true);
    for (const [id, c] of Object.entries(CREATURE_SOUNDS)) {
      for (const set of [c.call, c.alert, c.hurt, c.die, ...Object.values(c.attacks ?? {})]) if (set) expect(SAMPLE_SETS[set as SampleSetId], `${id}: ${set}`).toBeDefined();
      expect(c.hurt, id).toBeDefined();
      expect(c.die, id).toBeDefined();
      expect(c.pitch[0], id).toBeGreaterThanOrEqual(0.4);
      expect(c.pitch[0], id).toBeLessThanOrEqual(c.pitch[1]);
      expect(c.pitch[1], id).toBeLessThanOrEqual(1.6);
    }
  });

  it('no two enemies share their call, their alert, their cry when struck and their dying', () => {
    const seen = new Map<string, string>();
    for (const d of enemies) {
      const c = soundOf(d.id)!;
      const key = [c.call ?? `voice:${voiceIdOf(d)}`, c.alert ?? c.call ?? `voice:${voiceIdOf(d)}`, c.hurt, c.die].join('|');
      expect(seen.get(key), `${d.id} sounds as ${seen.get(key)}`).toBeUndefined();
      seen.set(key, d.id);
    }
    expect(seen.size).toBe(enemies.length);
  });

  it('the recorded families are spread: dozens of calls, many cries at a blow and in dying', () => {
    const calls = new Set(enemies.map((d) => soundOf(d.id)!.call).filter(Boolean));
    const hurts = new Set(enemies.map((d) => soundOf(d.id)!.hurt));
    const deaths = new Set(enemies.map((d) => soundOf(d.id)!.die));
    expect(calls.size).toBeGreaterThanOrEqual(24);
    expect(hurts.size).toBeGreaterThanOrEqual(10);
    expect(deaths.size).toBeGreaterThanOrEqual(5);
    for (const share of [calls, hurts, deaths]) for (const set of share) expect(SAMPLE_SETS[set as SampleSetId]).toBeDefined();
  });

  it('the bigger and the older sound lower: the great old ones and the outer gods below the lesser', () => {
    const mean = (tier: string): number => {
      const xs = enemies.filter((d) => d.tier === tier).map((d) => (soundOf(d.id)!.pitch[0] + soundOf(d.id)!.pitch[1]) / 2);
      return xs.reduce((a, b) => a + b, 0) / xs.length;
    };
    expect(mean('great_old_one')).toBeLessThan(mean('greater'));
    expect(mean('greater')).toBeLessThan(mean('lesser'));
    expect(mean('outer_god')).toBeLessThan(mean('lesser'));
    expect(mean('great_old_one')).toBeLessThan(0.7);
  });

  it('a creature’s own sound for a blow is for an attack it has', () => {
    for (const [id, c] of Object.entries(CREATURE_SOUNDS)) {
      for (const attack of Object.keys(c.attacks ?? {})) expect(attacksOf(id).has(attack), `${id} has no ${attack}`).toBe(true);
    }
    for (const id of Object.keys(ATTACK_SOUNDS)) expect(ATTACK_IDS, id).toContain(id);
    for (const a of Object.values(ATTACK_SOUNDS)) expect(SAMPLE_SETS[a!.set]).toBeDefined();
  });

  it('a blow sounds as its creature would have it, else as the library does; its frame is where it lands', () => {
    expect(attackSound('deep_one', 'lunge')).toMatchObject({ set: 'snap' }); // its own
    expect(attackSound('ghoul', 'lunge')).toMatchObject({ set: 'rip' }); // the library's
    expect(attackSound('shoggoth', 'tentacle_burst')).toMatchObject({ set: 'slime' });
    expect(attackSound('ghoul', 'sweep')).toBeUndefined(); // the whoosh alone
    expect(attackSound(undefined, 'bite')).toMatchObject({ set: 'snap' });
    const stats = getEntity('ghoul')!.stats;
    const bite = compileAttack('bite', stats, 2);
    expect(strikeFrame(bite)).toBe(bite.hit!.window[0]);
    const spit = compileAttack('spit', stats, 2);
    expect(strikeFrame(spit)).toBe(spit.volley!.frame);
    expect(strikeFrame(compileAttack('teleport', stats, 2))).toBeUndefined();
  });

  it('the old voice mapping still covers what a profile leaves out (the pipers, the viol, the polyps’ whistle keep their recipes)', () => {
    for (const id of ['flying_polyp', 'zann_window_thing', 'azathoth', 'daemon_pipers']) {
      const c = soundOf(id)!;
      expect(c.call, id).toBeUndefined();
      expect(VOICE_SAMPLES[voiceIdOf(getEntity(id)!)!], id).toBeUndefined(); // no recording of the recipe: it plays
    }
  });
});
