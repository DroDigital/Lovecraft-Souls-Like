import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync } from 'node:fs';
import { DUNGEONS } from '../src/data/dungeons';
import { REALM_MUSIC, REALM_TRACKS, REALM_TRACK_IDS, realmFile, realmTrackOf } from '../src/data/realmMusic';
import { REGIONS } from '../src/data/regions';
import { analyse, dB, fromDB, loopRegion, passLength } from '../src/render/audio/loudness';
import { createRealmLoop, passTimes } from '../src/render/audio/realmLoop';
import { realmLevel } from '../src/render/audio/realmMusic';

const RATE = 4000;
/** A track: `fadeIn` seconds rising, `body` seconds of a tone at `amp`, `fadeOut` falling. */
function track(fadeIn: number, body: number, fadeOut: number, amp: number, spike = 0): Float32Array[] {
  const n = Math.round((fadeIn + body + fadeOut) * RATE);
  const ch = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / RATE;
    const env = t < fadeIn ? t / fadeIn : t > fadeIn + body ? Math.max(0, 1 - (t - fadeIn - body) / fadeOut) : 1;
    ch[i] = amp * env * Math.sin(2 * Math.PI * 220 * t);
  }
  if (spike) ch[Math.round((fadeIn + body / 2) * RATE)] = spike;
  return [ch, ch];
}

describe('the realms\' music (round 28)', () => {
  it('has a track for every realm, and the stairs of slumber have two of their own', () => {
    for (const r of REGIONS) expect(realmTrackOf(r.id), r.id).not.toBeNull();
    expect(REALM_TRACK_IDS.length).toBe(15);
    expect(new Set(REGIONS.map((r) => realmTrackOf(r.id))).size).toBe(REGIONS.length); // each realm its own
    expect(realmTrackOf('arena')).toBeNull();
    expect(realmTrackOf(null)).toBeNull();
    const slumber = DUNGEONS.find((d) => d.id === 'slumber')!;
    const tracks = slumber.rooms.map((r) => realmTrackOf('dreamlands', 'slumber', r.id));
    expect(tracks.every((t) => t === 'descente_hypnotique' || t === 'cavernous_tail')).toBe(true); // no room of the stairs falls through to the realm's
    expect(tracks[0]).toBe('descente_hypnotique');
    expect(tracks[tracks.length - 1]).toBe('cavernous_tail');
    expect(realmTrackOf('dreamlands', 'ulthar_kadath', 'ulthar')).toBe('wavering_pads');
    expect(new Set(REALM_TRACK_IDS.map(realmFile)).size).toBe(15);
    for (const id of REALM_TRACK_IDS) expect(REALM_TRACKS[id].title.length).toBeGreaterThan(3);
  });

  it('every file in public/music/realms is a track, and (once there are any) every track has its file', () => {
    const dir = 'public/music/realms';
    if (!existsSync(dir)) return; // the recordings are not in the repository yet
    const files = new Set(readdirSync(dir).filter((f) => f.endsWith('.mp3')));
    const wanted = new Set(REALM_TRACK_IDS.map((id) => realmFile(id).split('/').pop()!));
    for (const f of files) expect(wanted.has(f), `${f} is not a track`).toBe(true);
    for (const f of wanted) expect(files.has(f), `${f} is missing`).toBe(true);
  });

  it('brings a track to the one loudness, from its body and not its fades, with no peak over the ceiling', () => {
    const a = analyse(track(3, 40, 5, 0.5), RATE);
    expect(a.start).toBeGreaterThanOrEqual(2.5);
    expect(a.start).toBeLessThanOrEqual(4);
    expect(a.end).toBeGreaterThanOrEqual(40);
    expect(a.end).toBeLessThanOrEqual(44);
    const loud = track(3, 40, 5, 0.5).map((c) => c.map((x) => x * a.gain));
    expect(dB(analyse(loud, RATE).rms)).toBeCloseTo(REALM_MUSIC.target, 0);
    // a quiet take and a loud one come out alike
    const [quiet, shout] = [analyse(track(2, 30, 2, 0.05), RATE), analyse(track(2, 30, 2, 0.9), RATE)];
    expect(quiet.gain * quiet.rms).toBeCloseTo(shout.gain * shout.rms, 4);
    // a spike caps the gain
    const spiky = analyse(track(2, 30, 2, 0.02, 1), RATE);
    expect(spiky.peak * spiky.gain).toBeLessThanOrEqual(REALM_MUSIC.ceiling + 1e-6);
    expect(spiky.gain).toBeLessThan(fromDB(REALM_MUSIC.target) / spiky.rms);
  });

  it('leaves a silent track alone and loops the whole of a short one by a shorter crossfade', () => {
    const quiet = analyse([new Float32Array(RATE * 20)], RATE);
    expect(quiet.gain).toBe(1);
    const r = loopRegion({ start: 4, end: 10 }, 18);
    expect([r.start, r.end]).toEqual([0, 18]);
    expect(r.overlap).toBeLessThanOrEqual(18 / 4);
    const long = loopRegion({ start: 3, end: 200 }, 210);
    expect([long.start, long.end, long.overlap]).toEqual([3, 200, REALM_MUSIC.overlap]);
    expect(passLength(long)).toBe(200 - 3 - REALM_MUSIC.overlap);
  });

  it('schedules each pass to fade in exactly as the last fades out, and from the body\'s start', () => {
    const calls: { kind: string; args: number[] }[] = [];
    const node = (name: string) => {
      const n: Record<string, unknown> = {
        connect: (to: unknown) => to,
        disconnect: () => undefined,
        start: (...args: number[]) => calls.push({ kind: `${name}.start`, args }),
        stop: () => undefined,
        gain: {
          setValueAtTime: (v: number, t: number) => calls.push({ kind: 'set', args: [v, t] }),
          setValueCurveAtTime: (_c: unknown, t: number, d: number) => calls.push({ kind: 'curve', args: [t, d] }),
        },
      };
      return n;
    };
    const ctx = { currentTime: 0, createBufferSource: () => node('src'), createGain: () => node('gain') } as unknown as BaseAudioContext;
    const region = { start: 5, end: 105, overlap: 10 };
    const loop = createRealmLoop(ctx, node('out') as unknown as AudioNode, { duration: 120 } as AudioBuffer, region);
    loop.begin(2);
    const starts = calls.filter((c) => c.kind === 'src.start').map((c) => c.args);
    expect(starts.length).toBe(3);
    expect(starts.map((s) => s[0])).toEqual(passTimes(2, region, 3));
    for (const s of starts) expect(s.slice(1)).toEqual([5, 100]); // from the body's start, for its length
    const curves = calls.filter((c) => c.kind === 'curve').map((c) => c.args);
    // pass 0 has only a fade-out; pass k > 0 fades in over [at, at + overlap]; each fade-out begins where the next fade-in does
    expect(curves[0]).toEqual([2 + 100 - 10, 10]);
    expect(curves[1]).toEqual([92, 10]); // pass 1 fades in as pass 0 fades out
    expect(curves[2]).toEqual([92 + 90, 10]);
    const firstGain = calls.find((c) => c.kind === 'set')!;
    expect(firstGain.args[0]).toBe(1); // the first pass is not faded: its voice's level is
  });

  it('gives way under a score, goes quiet in the hush, and breathes by no more than its depth', () => {
    expect(realmLevel({ fight: true, hush: 0 }, 10)).toBe(0);
    const calm = realmLevel({ fight: false, hush: 0 }, 0);
    expect(calm).toBeCloseTo(REALM_MUSIC.level, 5);
    expect(realmLevel({ fight: false, hush: 1 }, 0)).toBeCloseTo(REALM_MUSIC.hushTo, 5);
    const lows = Array.from({ length: 200 }, (_, i) => realmLevel({ fight: false, hush: 0 }, i));
    expect(Math.min(...lows)).toBeGreaterThanOrEqual(REALM_MUSIC.level * (1 - REALM_MUSIC.swell.depth) - 1e-6);
    expect(Math.max(...lows)).toBeLessThanOrEqual(REALM_MUSIC.level + 1e-9);
  });
});
