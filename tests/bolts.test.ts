/**
 * Bolts (round 34): a lobbed bolt is aimed to come down where its target stands, but no further than it can be
 * thrown. The soak found one at 665 m: a spitter's wind-up ended after the investigator had travelled far off,
 * and an arc computed for that distance climbed at a kilometre a second.
 */
import { describe, expect, it } from 'vitest';
import { BOSS } from '../src/data/tuning';
import type { VolleyDef } from '../src/data/moves';
import { boltSystem, launch } from '../src/systems/projectiles';
import { place, scriptedGame } from './helpers';

const SPIT: VolleyDef = { frame: 20, count: 1, spread: 0, speed: 9, radius: 0.35, range: 13.5, damage: 5, poise: 0, lob: true };
const FLASK: VolleyDef = { frame: 16, count: 1, spread: 0, speed: 12, radius: 0.25, range: 24, damage: 16, poise: 12, lob: true };

/** Looses `v` from the Deep One at an investigator `away` metres off (and `up` metres above the ground), and flies it out: its highest point and where it was last seen. */
function fly(v: VolleyDef, away: number, up = 0): { top: number; end: { x: number; y: number; z: number }; frames: number; hit: boolean } {
  const { g, player, deepOne } = scriptedGame();
  place(g, deepOne, 0, 0, Math.PI / 2); // facing +x
  place(g, player, away, 0, -Math.PI / 2);
  g.ecs.c.transform.get(player)!.pos.y = up;
  const hp = g.ecs.c.health.get(player)!.hp;
  launch(g, deepOne, v);
  const [bolt] = [...g.ecs.c.bolt.keys()];
  let top = -Infinity;
  let end = { ...g.ecs.c.transform.get(bolt)!.pos };
  let frames = 0;
  while (g.ecs.c.bolt.has(bolt) && frames < BOSS.boltLife + 5) {
    boltSystem(g);
    frames++;
    const at = g.ecs.c.transform.get(bolt)?.pos;
    if (at) {
      end = { ...at };
      top = Math.max(top, at.y);
    }
  }
  return { top, end, frames, hit: g.ecs.c.health.get(player)!.hp < hp };
}

describe('lobbed bolts', () => {
  it('come down on a target in range', () => {
    const near = fly(SPIT, 8);
    expect(near.hit).toBe(true);
    expect(near.top).toBeLessThan(6);
    expect(fly(FLASK, 16).hit).toBe(true);
  });

  it('stay low and come down at the end of their throw when the target is far off', () => {
    for (const [v, away] of [[SPIT, 1500], [SPIT, 40], [FLASK, 300], [FLASK, 60]] as const) {
      const shot = fly(v, away);
      expect(shot.top, `${away} m`).toBeLessThan(12);
      expect(shot.hit, `${away} m`).toBe(false);
      expect(shot.end.x, `${away} m`).toBeLessThanOrEqual(v.range + 3);
      expect(shot.end.x, `${away} m`).toBeGreaterThan(v.range * 0.6); // it was thrown at them: it did not drop at the thrower's feet
      expect(shot.frames, `${away} m`).toBeLessThan(BOSS.boltLife);
    }
  });

  it('stay low when the target is far above or below', () => {
    for (const up of [-150, 150, 900]) {
      const shot = fly(SPIT, 1200, up);
      expect(shot.top, `${up} m up`).toBeLessThan(14);
      expect(Number.isFinite(shot.end.y)).toBe(true);
    }
  });
});
