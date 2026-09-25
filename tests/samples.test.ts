import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { REGIONS } from '../src/data/regions';
import { ENTITIES } from '../src/data/registry';
import { AMBIENCE, DUNGEON_AMBIENCE, SAMPLE_SETS, STINGER_SAMPLES, VOICE_ALERTS, VOICE_SAMPLES } from '../src/data/samples';
import { WORLD } from '../src/data/tuning';
import { voiceIdOf } from '../src/data/voices';
import { nextSpot } from '../src/render/audio/ambience';
import { reached, strideAt, surfaceAt } from '../src/render/audio/foley';
import { dullness } from '../src/render/audio/cues';
import { pickTake, setFiles } from '../src/render/audio/sampler';
import { createGame, createWorldGame } from '../src/systems/game';
import { chunkContent } from '../src/world/chunks';
import { worldLayout } from '../src/world/placements';
import { chunkOf } from '../src/world/worldMap';

const AUDIO = 'public/audio';
const files = (dir: string): string[] => readdirSync(`${AUDIO}/${dir}`).map((f) => `${dir}/${f.replace(/\.mp3$/, '')}`);
const beds = [...Object.values(AMBIENCE), DUNGEON_AMBIENCE].flatMap((a) => a.beds.map(([f]) => `amb/${f}`));

describe('the recorded sounds (data/samples.ts, public/audio)', () => {
  it('every file a set or a bed names is there, and every file there is named', () => {
    const named = new Set([...setFiles(Object.values(SAMPLE_SETS)), ...beds]);
    for (const f of named) expect(existsSync(`${AUDIO}/${f}.mp3`), f).toBe(true);
    for (const f of [...files('sfx'), ...files('amb')]) expect(named.has(f), `${f} is played by nothing`).toBe(true);
  });

  it('every file is credited, and every one is public domain (CC0)', () => {
    const credits = readFileSync(`${AUDIO}/CREDITS.md`, 'utf8');
    const rows = new Map([...credits.matchAll(/^\| `([^`]+)\.mp3` \| \[[^\]]+\]\((https:\/\/freesound\.org\/people\/[^/]+\/sounds\/\d+\/)\) \| ([^|]+) \| ([^|]+) \|/gm)].map((m) => [m[1], m[4].trim()]));
    for (const f of [...files('sfx'), ...files('amb')]) expect(rows.get(f), f).toBe('CC0');
  });

  it('stays small: under 6 MB in all, no one-shot over 200 KB', () => {
    const size = (f: string): number => statSync(`${AUDIO}/${f}.mp3`).size;
    const all = [...files('sfx'), ...files('amb')];
    expect(all.reduce((n, f) => n + size(f), 0)).toBeLessThan(6 * 2 ** 20);
    for (const f of files('sfx')) expect(size(f), f).toBeLessThan(200 * 1024);
  });

  it('every region, the arena and a dungeon have their ambience; every set is sane', () => {
    for (const id of [...REGIONS.map((r) => r.id), 'arena']) expect(AMBIENCE[id]?.beds.length, id).toBeGreaterThan(0);
    for (const a of [...Object.values(AMBIENCE), DUNGEON_AMBIENCE]) {
      for (const [, gain] of a.beds) expect(gain > 0 && gain <= 1).toBe(true);
      for (const s of a.spots) expect(SAMPLE_SETS[s.set] && s.every[0] > 5 && s.every[0] <= s.every[1]).toBeTruthy();
    }
    for (const [id, s] of Object.entries(SAMPLE_SETS)) {
      expect(s.files.length, id).toBeGreaterThan(0);
      expect(s.gain > 0 && s.gain <= 1, id).toBe(true);
      if (s.pitch) expect(s.pitch[0] > 0.4 && s.pitch[0] <= s.pitch[1] && s.pitch[1] < 1.6, id).toBe(true);
    }
    for (const [, beneath] of Object.values(STINGER_SAMPLES)) expect(beneath >= 0 && beneath <= 1).toBe(true);
  });

  it('the commonest creatures speak with recordings: every tier default, Deep Ones, ghouls, Mi-Go, hounds', () => {
    for (const id of ['growl', 'bellow', 'murmur', 'abyss', 'croak', 'meep', 'buzz', 'bay'] as const) expect(VOICE_SAMPLES[id], id).toBeDefined();
    expect(VOICE_ALERTS.growl).toBe('snarl');
    const voiced = ENTITIES.map((d) => voiceIdOf(d)).filter((v) => v !== null);
    expect(voiced.filter((v) => VOICE_SAMPLES[v]).length / voiced.length).toBeGreaterThan(0.8);
  });
});

describe('playing them (render/audio)', () => {
  it('never plays the same take twice running, when there is another', () => {
    const takes = ['a', 'b', 'c'];
    let last: string | undefined;
    for (let k = 0; k < 200; k++) {
      const t = pickTake(takes, last, Math.random)!;
      expect(t).not.toBe(last);
      last = t;
    }
    expect(pickTake(['a'], 'a', Math.random)).toBe('a');
    expect(pickTake([], undefined, Math.random)).toBeUndefined();
  });

  it('strides lengthen with pace; a moment is reached once; spots come within their interval; far sounds are dull', () => {
    expect(strideAt(1)).toBeCloseTo(0.75);
    expect(strideAt(6.4)).toBeCloseTo(1.3);
    expect(strideAt(4)).toBeGreaterThan(strideAt(2));
    expect(reached(5, 6, 3)).toBe(true);
    expect(reached(5, 6, 5)).toBe(false);
    expect(reached(5, 5, null)).toBe(true);
    expect(reached(5, 4, null)).toBe(false);
    const s = { set: 'owl' as const, every: [10, 20] as const };
    for (const r of [0, 0.5, 1]) expect(nextSpot(s, 100, () => r)).toBe(100 + 10 + 10 * r);
    expect(dullness(1)).toBe(20000);
    expect(dullness(0.1)).toBeLessThan(dullness(0.5));
  });

  it('footsteps know the ground: the arena is flagged, the sea wades, a dungeon is stone, a road is a road', () => {
    expect(surfaceAt(createGame(), 0, 0, 0)).toBe('stone');
    const g = createWorldGame();
    expect(surfaceAt(g, 0, WORLD.seaLevel - 1, 0)).toBe('water');
    const r = worldLayout().dungeons[0].layout.rect;
    expect(surfaceAt(g, (r.x0 + r.x1) / 2, 0, (r.z0 + r.z1) / 2)).toBe('stone');
    const at = g.ecs.c.transform.get(g.player.id)!.pos;
    const road = [-2, -1, 0, 1, 2].flatMap((dx) => [-2, -1, 0, 1, 2].flatMap((dz) => chunkContent(chunkOf(at.x) + dx, chunkOf(at.z) + dz).roads))[0];
    expect(road).toBeDefined();
    const [mx, mz] = [(road.a.x + road.b.x) / 2, (road.a.z + road.b.z) / 2];
    expect(surfaceAt(g, mx, 0, mz)).toBe('road');
    expect(surfaceAt(g, mx + road.width * 3 + 20, 0, mz + road.width * 3 + 20)).not.toBe('water');
  });
});
