import { describe, expect, it } from 'vitest';
import { distXZ } from '../src/core/geom';
import { CLOCK, SIM } from '../src/data/tuning';
import { createWorldGame } from '../src/systems/game';
import { clearStep, npcLife, ROUND } from '../src/systems/npcLife';
import { npcEntity, npcPlace } from '../src/systems/npcs';
import { npcDef } from '../src/data/npcs';
import { place } from './helpers';

const DT = 1 / SIM.hz;

/** A world game with the investigator far from everyone, and the frame set to `phase` of the night. */
function night(phase: number) {
  const g = createWorldGame();
  place(g, g.player.id, -5000, -5000, 0);
  g.frame = Math.round(((phase - CLOCK.start + 1) % 1) * CLOCK.night * SIM.hz);
  return g;
}

describe('the people have somewhere to be (round 26)', () => {
  it('walk a round of their own in the gloaming: away from where they rose, never far, never through a wall', () => {
    const g = night(0.05);
    const e = npcEntity(g, 'morgan')!;
    const home = npcPlace(npcDef('morgan')!)!;
    const tr = g.ecs.c.transform.get(e)!;
    let far = 0;
    for (let i = 0; i < 60 * 150; i++) {
      g.frame++;
      const before = { ...tr.pos };
      npcLife(g, DT);
      expect(clearStep(g, before, tr.pos) || distXZ(before, tr.pos) < 1e-6, `step ${i}`).toBe(true);
      far = Math.max(far, distXZ(tr.pos, home));
    }
    expect(far).toBeGreaterThan(1);
    expect(far).toBeLessThanOrEqual(ROUND.gloaming.reach + 1);
  });

  it('stand at their place in the last hour, turned to the sign', () => {
    const g = night(0.85);
    const e = npcEntity(g, 'morgan')!;
    const home = npcPlace(npcDef('morgan')!)!;
    const tr = g.ecs.c.transform.get(e)!;
    tr.pos = { x: home.x + 2, y: tr.pos.y, z: home.z + 1 }; // out on a round, as the hour changes
    for (let i = 0; i < 60 * 60; i++) {
      g.frame++;
      npcLife(g, DT);
    }
    expect(distXZ(tr.pos, home)).toBeLessThan(1);
  });

  it('stand, and turn to the investigator, when they are close, and take up the round when they have gone', () => {
    const g = night(0.05);
    const e = npcEntity(g, 'morgan')!;
    const tr = g.ecs.c.transform.get(e)!;
    place(g, g.player.id, tr.pos.x + 3, tr.pos.z, Math.PI);
    const at = { ...tr.pos };
    for (let i = 0; i < 60 * 30; i++) {
      g.frame++;
      npcLife(g, DT);
    }
    expect(distXZ(tr.pos, at)).toBeLessThan(1e-6);
    place(g, g.player.id, -5000, -5000, 0);
    let moved = 0;
    for (let i = 0; i < 60 * 120; i++) {
      g.frame++;
      npcLife(g, DT);
      moved = Math.max(moved, distXZ(tr.pos, at));
    }
    expect(moved).toBeGreaterThan(0.5);
  });
});
