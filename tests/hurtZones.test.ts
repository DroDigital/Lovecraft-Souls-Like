/**
 * A colossus's hurt zones (playtest round 24): it was one column struck alike along its height. Its
 * legs take a blow whole, its body soaks it, and its head takes it several times over, out of a
 * blade's reach until the colossus stoops after a blow of its own.
 */
import { describe, expect, it } from 'vitest';
import { emptyInput } from '../src/core/input';
import { globes, zoneShapes } from '../src/data/assemblyShape';
import { ZONES } from '../src/data/bossTuning';
import { getEntity } from '../src/data/registry';
import { PLAYER } from '../src/data/tuning';
import { startMove } from '../src/systems/actions';
import { stepGame } from '../src/systems/game';
import { refreshStoops, stooped, weakSpot, zonesOf } from '../src/systems/hurt';
import { setLock } from '../src/systems/lockOn';
import { bossGame } from './bossHelpers';
import { place, press } from './helpers';

const recipe = (id: string) => getEntity(id)!.assembly!;

/** Damage of each blow the investigator lands on `id` in five seconds, held at the edge of its body. */
function blows(id: string, stoop: boolean): number[] {
  const { g, boss } = bossGame(id, undefined, 30);
  const c = g.ecs.c;
  c.body.get(boss)!.fixed = true;
  c.brain.delete(boss);
  const me = c.health.get(g.player.id)!;
  me.hp = me.max = 1e7;
  g.player.levels.might = 0;
  const at = { ...c.transform.get(boss)!.pos };
  const out: number[] = [];
  g.events.on('Hit', (e) => void (e.attacker === g.player.id && e.target === boss && out.push(e.damage)));
  for (let frame = 0; frame < 300; frame++) {
    place(g, g.player.id, at.x, at.z + c.body.get(boss)!.radius + PLAYER.radius + 0.05, Math.PI);
    c.stamina.get(g.player.id)!.value = PLAYER.stamina;
    g.camera.yaw = g.camera.prevYaw = 0;
    if (frame === 2) setLock(g, boss);
    if (stoop) c.fight.get(boss)!.stoopUntil = g.frame + 5;
    stepGame(g, frame % 40 === 5 ? press('light') : emptyInput());
  }
  return out;
}

describe('hurt zones (round 24)', () => {
  it('belong to the tall assembly bodies, and to no other', () => {
    for (const id of ['cthulhu', 'ghatanothoa', 'father_dagon', 'shub_niggurath', 'yog_sothoth']) {
      const { g, boss } = bossGame(id);
      expect(zonesOf(g, boss), id).not.toBeNull();
    }
    for (const id of ['deep_one', 'dunwich_horror', 'hastur']) {
      const { g, boss } = bossGame(id);
      expect(zonesOf(g, boss), id).toBeNull();
    }
  });

  it('a column is legs, torso and head, the head the weak spot; stooped, the head is down within a blade\'s reach', () => {
    const [h, r] = [20, 6];
    const up = zoneShapes(recipe('ghatanothoa'), r, h, 1, false)!;
    expect(up.map((z) => z.damage)).toEqual([ZONES.legs.damage, ZONES.torso.damage, ZONES.head.damage]);
    expect(up[2].weak).toBe(true);
    expect(up[2].y0).toBeGreaterThan(3); // out of a blade's reach
    const down = zoneShapes(recipe('ghatanothoa'), r, h, 1, true)!;
    expect(down[2].y1).toBeLessThanOrEqual(ZONES.head.stoop);
    expect(down[2].y0).toBe(0);
  });

  it('a body of spheres is its spheres, a ring of them resting low about its foot', () => {
    const r = recipe('yog_sothoth');
    const gl = globes(r, 7);
    expect(gl.length).toBe(r.spheres);
    expect(gl.filter((s) => s.y < 4).length).toBeGreaterThanOrEqual(4);
    expect(globes(r, 7)).toEqual(gl); // the same each time: the picture and the fight agree
    expect(zoneShapes(r, 7.6, 20, 7, false)!.every((z) => z.ball)).toBe(true);
  });

  it('a blow at the feet of a colossus on its feet takes the legs\' share; stooped, the head\'s', () => {
    const feet = blows('ghatanothoa', false);
    const head = blows('ghatanothoa', true);
    expect(feet.length).toBeGreaterThan(0);
    expect(head.length).toBeGreaterThan(0);
    expect(head[0] / feet[0]).toBeCloseTo(ZONES.head.damage / ZONES.legs.damage, 1);
  });

  it('stoops after its own blow: from its recovery on, and a little after', () => {
    const { g, boss } = bossGame('ghatanothoa', undefined, 30);
    const a = g.ecs.c.actor.get(boss)!;
    g.ecs.c.brain.delete(boss);
    expect(stooped(g, boss)).toBe(false);
    startMove(a, 'slam');
    const open = a.moves.slam.open!;
    expect(open).toBeGreaterThan(0);
    a.frame = open - 1;
    refreshStoops(g);
    expect(stooped(g, boss)).toBe(false);
    a.frame = open;
    refreshStoops(g);
    expect(stooped(g, boss)).toBe(true);
    g.frame += ZONES.linger + 1;
    a.move = null;
    expect(stooped(g, boss)).toBe(false);
  });

  it('the revolver aims for a head it can reach, and for the body of one too tall to', () => {
    const near = bossGame('ghatanothoa');
    const high = weakSpot(near.g, near.boss)!;
    expect(high).not.toBeNull();
    expect(high.y).toBeGreaterThan(10);
    const far = bossGame('cthulhu');
    expect(weakSpot(far.g, far.boss)).toBeNull();
  });
});
