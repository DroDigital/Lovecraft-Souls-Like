import { describe, expect, it, vi } from 'vitest';
import { EPITHETS } from '../src/data/bossCards';
import { arrival, ARRIVAL, ENDING_SCENES, fall, FALL, scaleOf, WAKE, WAKE_RISE, type Scale, type Scene } from '../src/data/cutscenes';
import { getEntity } from '../src/data/registry';
import { ROSTER_IDS } from '../src/data/roster';
import { SAMPLE_SETS } from '../src/data/samples';
import { STINGERS } from '../src/data/sounds';
import { beatsBetween, ease, frameOf, holdOf, sceneLength, shotAt, tremor, type Anchor } from '../src/render/cinemaPlan';
import { createDirector } from '../src/render/cinemaDirector';
import { createGame, createWorldGame } from '../src/systems/game';
import { parseSave, snapshot } from '../src/systems/save';

const SCALES: Scale[] = ['person', 'large', 'giant', 'colossal'];
const player: Anchor = { x: 0, y: 0, z: 0, yaw: 0, height: 1.8 };
const horror = (height: number): Anchor => ({ x: 0, y: 0, z: 9, yaw: Math.PI, height });
const scenes = (): Scene[] => [WAKE, ...Object.values(ENDING_SCENES), ...SCALES.flatMap((s) => [arrival(s, 'X', undefined), fall(s)])];

describe('a scene\'s camera', () => {
  it('runs its shots one after another, and holds the last past its end', () => {
    const s = arrival('person', 'X', undefined);
    const [a, b] = ARRIVAL.person;
    expect(sceneLength(s)).toBeCloseTo(ARRIVAL.person.reduce((n, sh) => n + sh.dur, 0));
    expect(shotAt(s, 0).index).toBe(0);
    expect(shotAt(s, a.dur - 0.01).index).toBe(0);
    expect(shotAt(s, a.dur + 0.01)).toMatchObject({ index: 1 });
    expect(shotAt(s, a.dur + b.dur + 0.01).index).toBe(2);
    expect(shotAt(s, 999)).toMatchObject({ index: 2, u: 1 });
  });

  it('gives a finite lens, looking at something, for every shot at every moment, whatever the size of the horror', () => {
    for (const scene of scenes()) {
      for (const [h, other] of [[0.6, horror(0.6)], [40, horror(40)], [2, null]] as const) {
        for (let t = 0; t <= sceneLength(scene); t += 0.25) {
          const { shot, u } = shotAt(scene, t);
          const on = shot.on === 'target' ? horror(h) : player;
          const f = frameOf(shot, u, on, shot.on === 'target' ? player : other, t);
          for (const n of [f.pos.x, f.pos.y, f.pos.z, f.look.x, f.look.y, f.look.z, f.fov, f.roll]) expect(Number.isFinite(n)).toBe(true);
          expect(f.fov).toBeGreaterThan(20);
          expect(f.fov).toBeLessThan(125);
          expect(Math.hypot(f.pos.x - f.look.x, f.pos.y - f.look.y, f.pos.z - f.look.z)).toBeGreaterThan(0.2);
        }
      }
    }
  });

  it('stands on the line between the two at yaw 0, and behind the subject at 180', () => {
    const shot = { ...ARRIVAL.person[0], yaw: [0, 0], dist: [4, 4], up: [1, 1], body: false, sway: 0 } as const;
    const front = frameOf(shot, 0.5, horror(2), player, 0); // the horror at z 9, the investigator at 0: the lens is nearer the investigator
    expect(front.pos.z).toBeCloseTo(9 - 4, 5);
    const behind = frameOf({ ...shot, yaw: [180, 180] }, 0.5, horror(2), player, 0);
    expect(behind.pos.z).toBeCloseTo(9 + 4, 5);
  });

  it('scales a shot by the height of what it circles, only when it says so', () => {
    const base = { ...ARRIVAL.person[0], yaw: [0, 0], dist: [2, 2], up: [0.5, 0.5], look: [1, 1], sway: 0 } as const;
    const a = frameOf({ ...base, body: true }, 0.5, horror(10), player, 0);
    const b = frameOf({ ...base, body: false }, 0.5, horror(10), player, 0);
    expect(a.pos.y).toBeCloseTo(5);
    expect(b.pos.y).toBeCloseTo(0.5);
    expect(a.look.y).toBeCloseTo(10); // what it looks at is always of the height of what it looks at
  });

  it('eases from its first frame to its last', () => {
    for (const kind of ['linear', 'in', 'out', 'inout'] as const) {
      expect(ease(kind, 0)).toBe(0);
      expect(ease(kind, 1)).toBe(1);
      expect(ease(kind, 0.5)).toBeGreaterThan(0);
    }
  });
});

describe('holding the camera', () => {
  it('comes in from the follow camera and goes back to it, unless the scene opens and closes on black', () => {
    const s = fall('person');
    const len = sceneLength(s);
    expect(holdOf(s, 0)).toBe(0);
    expect(holdOf(s, len / 2)).toBe(1);
    expect(holdOf(s, len)).toBe(0);
    expect(holdOf({ ...s, blend: [0, 0] }, 0)).toBe(1);
    expect(holdOf({ ...s, blend: [0, 0] }, len)).toBe(1);
  });
});

describe('beats', () => {
  it('fall in the span asked for, and no beat is missed or heard twice across steps', () => {
    for (const s of scenes()) {
      let seen = beatsBetween(s, -1, 0).length; // those at the very start
      for (let t = 0; t < sceneLength(s); t += 1 / 60) seen += beatsBetween(s, t, t + 1 / 60).length;
      expect(seen, s.id).toBe(s.beats.length);
      expect(s.beats.every((b) => b.at >= 0 && b.at <= sceneLength(s)), s.id).toBe(true); // every beat is inside its scene
    }
  });

  it('only use sounds and recordings that exist', () => {
    for (const s of scenes()) {
      for (const b of s.beats) {
        if (b.sound) expect(STINGERS).toHaveProperty(b.sound);
        if (b.set) expect(SAMPLE_SETS).toHaveProperty(b.set);
        if (b.burst) expect(b.burst.count).toBeGreaterThan(0);
      }
    }
  });

  it('let an ending end on black, so its card comes up out of it', () => {
    for (const [id, s] of Object.entries(ENDING_SCENES)) {
      expect(s.shut, id).toBe(true);
      const last = [...s.beats].sort((a, b) => a.at - b.at).at(-1)!;
      expect(last.fade).toBe('black');
      expect(last.at).toBeGreaterThan(sceneLength(s) - 2);
    }
  });

  it('tremble hardest at first and die away', () => {
    expect(tremor(1, 0, 2)).toBe(1);
    expect(tremor(1, 1, 2)).toBeLessThan(0.3);
    expect(tremor(1, 2.1, 2)).toBe(0);
    expect(tremor(1, -1, 2)).toBe(0);
  });
});

describe('the wake (round 22)', () => {
  it('gets the investigator up slowly, the camera with them, and ends on no title', () => {
    expect(WAKE.beats.some((b) => b.title)).toBe(false);
    const rise = WAKE.beats.find((b) => b.rise !== undefined)!;
    expect(rise.rise).toBe(WAKE_RISE);
    expect(WAKE_RISE).toBeGreaterThanOrEqual(3);
    expect(rise.at + WAKE_RISE).toBeLessThan(sceneLength(WAKE) - 1); // standing a moment before the scene lets go
    expect(rise.at).toBeGreaterThan(shotAt(WAKE, 0).shot.dur - 1); // kneeling for the shot that opens it
    const captions = WAKE.beats.filter((b) => b.caption);
    for (const c of captions) expect(c.at + (c.hold ?? 3)).toBeLessThan(sceneLength(WAKE)); // each said in full before the end
  });
});

describe('the horrors', () => {
  it('are told apart by their height', () => {
    expect(scaleOf(0.6)).toBe('person');
    expect(scaleOf(1.9)).toBe('person');
    expect(scaleOf(3.5)).toBe('large');
    expect(scaleOf(14)).toBe('giant');
    expect(scaleOf(40)).toBe('colossal');
  });

  it('are named after their first shot, in every size', () => {
    for (const s of SCALES) {
      const scene = arrival(s, 'Cthulhu', 'A line');
      const title = scene.beats.find((b) => b.title)!;
      expect(title.title).toEqual(['CTHULHU', 'A line']);
      expect(title.at).toBeGreaterThan(ARRIVAL[s][0].dur);
      expect(title.at).toBeLessThan(sceneLength(scene));
      expect(FALL[s].dur).toBeGreaterThan(2);
    }
  });

  it('have a line each, but for those who are unseen or join another\'s fight', () => {
    for (const id of ROSTER_IDS) {
      const s = getEntity(id)?.bossScript;
      if (!s) continue;
      if (s.unseen || s.joins) continue;
      expect(EPITHETS[id], id).toBeTruthy();
    }
    for (const id of Object.keys(EPITHETS)) expect(ROSTER_IDS).toContain(id);
  });
});

describe('which scene plays', () => {
  const stub = () => {
    const play = vi.fn(() => Promise.resolve());
    return { play, cinema: { play, active: false } as never };
  };

  it('shows a horror\'s arrival once, however many times it turns on the investigator, and its fall', () => {
    const g = createGame({ creature: 'joseph_curwen' });
    const { play, cinema } = stub();
    createDirector(g, cinema, () => undefined);
    const [e] = [...g.ecs.c.fight.keys()];
    g.events.emit('BossEngaged', { entity: e, name: 'Joseph Curwen' });
    g.events.emit('BossEngaged', { entity: e, name: 'Joseph Curwen' });
    expect(play).toHaveBeenCalledTimes(1);
    expect((play.mock.calls[0] as unknown[])[0]).toMatchObject({ id: 'arrival:person' });
    g.events.emit('Vanquished', { entity: e, name: 'Joseph Curwen' });
    expect(play).toHaveBeenCalledTimes(2);
    expect((play.mock.calls[1] as unknown[])[0]).toMatchObject({ id: 'fall:person' });
  });

  it('keeps which arrivals were shown in the save', () => {
    const g = createWorldGame();
    g.overworld!.watched.add('cthulhu');
    const back = parseSave(JSON.stringify(snapshot(g)));
    expect(back?.watched).toEqual(['cthulhu']);
    expect(createWorldGame({ save: back! }).overworld!.watched.has('cthulhu')).toBe(true);
  });

  it('opens an ending\'s card once its scene has played, and even when no scene plays', async () => {
    const g = createGame({});
    const { play, cinema } = stub();
    const opened: string[] = [];
    createDirector(g, cinema, (id) => opened.push(id));
    g.events.emit('Ending', { id: 'seal' });
    expect(play).toHaveBeenCalledTimes(1);
    expect(opened).toEqual([]); // not before the scene is done
    await Promise.resolve();
    await Promise.resolve();
    expect(opened).toEqual(['seal']);
    g.events.emit('Ending', { id: 'not_an_ending' });
    await Promise.resolve();
    await Promise.resolve();
    expect(opened).toEqual(['seal', 'not_an_ending']);
  });
});
