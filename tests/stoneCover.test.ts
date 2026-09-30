/**
 * Ghatanothoa's monoliths (playtest round 24 asked: do they stand where they can be used from the foot of
 * its body?). Behind each, a little way out from the ring, the investigator is out of its sight; and its
 * gaze, four seconds to stone, gives the time to run there from anywhere in the ring.
 */
import { describe, expect, it } from 'vitest';
import { distXZ } from '../src/core/geom';
import { BOSS, REALITY, SIM } from '../src/data/tuning';
import { playerEye } from '../src/systems/lockOn';
import { hasLineOfSight } from '../src/world/colliders';
import { bossGame, calm, engage } from './bossHelpers';
import { place, steps } from './helpers';

describe('Ghatanothoa\'s monoliths are cover (round 25)', () => {
  const b = bossGame('ghatanothoa');
  const { g, boss, fight } = b;
  const c = g.ecs.c;
  const centre = { x: fight.arena.x, z: fight.arena.z };
  place(g, boss, centre.x, centre.z, 0); // the heart of its ring, as a dungeon's boss stands
  engage(b);
  calm(b);
  steps(g, 3);
  const stones = fight.props.filter((p) => c.prop.get(p)?.kind === 'monolith').map((p) => c.transform.get(p)!.pos);

  it('raises its ring of them', () => expect(stones.length).toBe(BOSS.monoliths));

  it('hides a man a little way behind each, from the boss\'s eye', () => {
    const bossEye = { x: centre.x, y: c.transform.get(boss)!.pos.y + c.body.get(boss)!.aimHeight, z: centre.z };
    for (const s of stones) {
      const d = Math.hypot(s.x - centre.x, s.z - centre.z);
      const [x, z] = [centre.x + ((s.x - centre.x) / d) * (d + 1.6), centre.z + ((s.z - centre.z) / d) * (d + 1.6)];
      place(g, g.player.id, x, z, 0);
      expect(hasLineOfSight(g.world, bossEye, playerEye(g)), `behind the stone at ${s.x.toFixed(0)},${s.z.toFixed(0)}`).toBe(false);
    }
  });

  it('is reached in time from anywhere in the ring: the nearest is no farther than four seconds of running', () => {
    const run = 6.4; // metres a second, sprinting
    const reach = (REALITY.petrifyRate ** -1 / SIM.hz) * run; // metres covered while the stone fills
    for (let k = 0; k < 16; k++) {
      const t = (k / 16) * Math.PI * 2;
      const at = { x: centre.x + Math.sin(t) * fight.arena.radius * 0.9, z: centre.z + Math.cos(t) * fight.arena.radius * 0.9 };
      const nearest = Math.min(...stones.map((s) => distXZ(s, at)));
      expect(nearest, `from angle ${k}`).toBeLessThan(reach);
    }
  });
});
