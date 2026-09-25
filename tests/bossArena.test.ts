import { describe, expect, it } from 'vitest';
import { distXZ } from '../src/core/geom';
import { BOSS } from '../src/data/tuning';
import { startMove } from '../src/systems/actions';
import { setArena } from '../src/systems/bossFight';
import { bossGame, engage, type BossGame } from './bossHelpers';
import { place, steps } from './helpers';

/** A boss whose ring is `radius` metres about where it stands, the investigator `gap` metres south. */
function ringed(id: string, radius: number, gap: number): BossGame & { ring: { x: number; z: number; radius: number } } {
  const b = bossGame(id, undefined, gap);
  const at = b.g.ecs.c.transform.get(b.boss)!.pos;
  const ring = { x: at.x, z: at.z, radius };
  setArena(b.g, b.boss, ring);
  return { ...b, ring };
}

/** No attacks (whatever it began as the fight did is called off), but it moves. */
function hold({ g, boss }: BossGame): void {
  Object.assign(g.ecs.c.brain.get(boss)!, { cooldown: 1e6 });
  Object.assign(g.ecs.c.actor.get(boss)!, { move: null, frame: 0 });
}

describe('a boss keeps to its arena (spec §3E)', () => {
  it('wakes as the investigator steps into its ring, not before', () => {
    const b = ringed('the_outsider', 8, 12);
    steps(b.g, 60);
    expect(b.fight.engaged).toBe(false);
    const at = b.ring;
    place(b.g, b.g.player.id, at.x, at.z + 6, Math.PI);
    steps(b.g, 2);
    expect(b.fight.engaged).toBe(true);
  });

  it('holds the fight while the investigator stays in its ring, however far off and out of sight', () => {
    const b = bossGame('keziah_mason', undefined, 20);
    engage(b);
    hold(b);
    b.g.ecs.c.transform.get(b.boss)!.yaw = 0; // its back to them
    steps(b.g, 600);
    expect(b.fight.engaged).toBe(true);
    expect(b.g.ecs.c.brain.get(b.boss)!.state).toBe('engage');
  });

  it('backs off only a little, and never past its rim, even pressed hard at low health', () => {
    const b = ringed('wilbur_whateley', 12, 2);
    engage(b);
    hold(b);
    const h = b.g.ecs.c.health.get(b.boss)!;
    h.hp = h.max * 0.2; // fleeing
    const c = b.g.ecs.c;
    let worst = 0;
    for (let i = 0; i < 600; i++) {
      const p = c.transform.get(b.boss)!.pos;
      const [dx, dz] = [p.x - b.ring.x, p.z - b.ring.z];
      const d = Math.hypot(dx, dz) || 1;
      place(b.g, b.g.player.id, p.x - (dx / d) * 2, p.z - (dz / d) * 2 + (d < 0.5 ? 2 : 0), 0); // hard on its heels, from the centre side
      steps(b.g, 1);
      worst = Math.max(worst, distXZ(c.transform.get(b.boss)!.pos, b.ring));
    }
    expect(worst).toBeLessThanOrEqual(b.ring.radius);
    expect(b.fight.engaged).toBe(true);
  });

  it('gives up only once the investigator has left its ring and stayed away', () => {
    const b = ringed('the_outsider', 6, 3);
    engage(b);
    hold(b);
    place(b.g, b.g.player.id, b.ring.x, b.ring.z + b.ring.radius + BOSS.margin + 4, Math.PI);
    steps(b.g, BOSS.grace - 20);
    expect(b.fight.engaged).toBe(true);
    steps(b.g, 60);
    expect(b.fight.engaged).toBe(false);
    expect(b.g.ecs.c.brain.get(b.boss)!.state).not.toBe('engage');
  });

  it('a quick foe may slip a blow as it winds up, stepping aside inside its ring', () => {
    const b = bossGame('wilbur_whateley', undefined, 2);
    engage(b);
    hold(b);
    const br = b.g.ecs.c.brain.get(b.boss)!;
    br.def = { ...br.def, params: { ...br.def.params, evade: 1 } };
    const before = { ...b.g.ecs.c.transform.get(b.boss)!.pos };
    startMove(b.g.ecs.c.actor.get(b.g.player.id)!, 'light1');
    steps(b.g, 2);
    expect(b.g.ecs.c.actor.get(b.boss)!.move).toBe('evade');
    steps(b.g, 24);
    expect(distXZ(b.g.ecs.c.transform.get(b.boss)!.pos, before)).toBeGreaterThan(2);
    expect(distXZ(b.g.ecs.c.transform.get(b.boss)!.pos, b.fight.arena)).toBeLessThan(b.fight.arena.radius);
  });
});
