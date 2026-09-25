import { describe, expect, it } from 'vitest';
import { emptyInput, type InputFrame } from '../src/core/input';
import { PLAYER, SIM } from '../src/data/tuning';
import { stepGame } from '../src/systems/game';
import { place, press, scriptedGame, steps } from './helpers';

/** Stick pushed forward (away from the camera), plus optional button state. */
function forward(extra: Partial<InputFrame> = {}): InputFrame {
  return { ...emptyInput(), moveY: 1, ...extra };
}

describe('dodge button', () => {
  it('a quick tap rolls along the stick, or backsteps with no direction', () => {
    const { g } = scriptedGame();
    const a = g.ecs.c.actor.get(g.player.id)!;
    stepGame(g, forward());
    stepGame(g, forward({ pressed: { ...emptyInput().pressed, dodge: true }, released: { ...emptyInput().released, dodge: true } }));
    expect(a.move).toBe('roll');
    steps(g, 60); // the roll is over
    stepGame(g, press('dodge'));
    steps(g, 3, { ...emptyInput(), held: { ...emptyInput().held, dodge: true } });
    expect(a.move).toBeNull(); // the dodge fires on release
    stepGame(g, { ...emptyInput(), released: { ...emptyInput().released, dodge: true } });
    expect(a.move).toBe('backstep');
  });

  it('holding it sprints, drains stamina, and releasing after a sprint does not roll', () => {
    const { g } = scriptedGame();
    const a = g.ecs.c.actor.get(g.player.id)!;
    const tr = g.ecs.c.transform.get(g.player.id)!;
    const held = { ...emptyInput().held, dodge: true };
    stepGame(g, forward({ pressed: { ...emptyInput().pressed, dodge: true }, held }));
    steps(g, PLAYER.dodgeTapFrames + 1, forward({ held }));
    const z0 = tr.pos.z;
    stepGame(g, forward({ held }));
    expect(g.player.sprinting).toBe(true);
    expect(z0 - tr.pos.z).toBeCloseTo(PLAYER.sprintSpeed / SIM.hz); // camera looks -z at spawn
    expect(g.ecs.c.stamina.get(g.player.id)!.value).toBeLessThan(PLAYER.stamina);
    stepGame(g, forward({ released: { ...emptyInput().released, dodge: true } }));
    expect(g.player.sprinting).toBe(false);
    expect(a.move).toBeNull();
  });
});

describe('locomotion', () => {
  it('walks camera-relative and never enters a pillar', () => {
    const { g, player } = scriptedGame();
    place(g, player, -8, 4, Math.PI); // pillar at (-8, 1) straight ahead
    steps(g, 5); // camera settles behind the player
    steps(g, 120, forward());
    const p = g.ecs.c.transform.get(player)!.pos;
    expect(Math.hypot(p.x + 8, p.z - 1)).toBeGreaterThanOrEqual(0.8 + PLAYER.radius - 1e-6);
  });

  it('strafes while locked on, still facing the target', () => {
    const { g, dummy } = scriptedGame();
    stepGame(g, press('lock'));
    expect(g.lock.target).toBe(dummy);
    steps(g, 30, { ...emptyInput(), moveX: 1 });
    const me = g.ecs.c.transform.get(g.player.id)!;
    const d = g.ecs.c.transform.get(dummy)!.pos;
    const want = Math.atan2(d.x - me.pos.x, d.z - me.pos.z);
    expect(Math.abs(Math.atan2(Math.sin(me.yaw - want), Math.cos(me.yaw - want)))).toBeLessThan(0.05);
  });
});
