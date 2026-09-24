import { describe, expect, it } from 'vitest';
import { ARENA } from '../src/data/arena';
import { FX } from '../src/data/tuning';
import { allEffectsOn, type FxState } from '../src/render/fx';
import { createFxController, nearestAnomaly } from '../src/render/fxController';
import { spawnCreature } from '../src/systems/creatures';
import { createGame } from '../src/systems/game';
import { changeInsight } from '../src/systems/insight';
import { setSanity } from '../src/systems/sanity';
import { spawnDrop } from '../src/systems/spawn';

const fresh = (): FxState => ({ sanity: 100, cap: 1, anomalyProximity: 0, enabled: allEffectsOn() });
const far = { x: 0, y: 1.6, z: -20 };

describe('FX controller', () => {
  it("follows the game's sanity and pulses when the band worsens", () => {
    const g = createGame();
    const fx = createFxController(g);
    const state = fresh();
    setSanity(g, 50);
    fx.update(state, far, 10);
    expect(state.sanity).toBe(50);
    expect(state.pulse).toBe(1);
    fx.update(state, far, 10 + FX.pulseSeconds / 2);
    expect(state.pulse).toBeCloseTo(0.5);
    fx.update(state, far, 10 + FX.pulseSeconds);
    expect(state.pulse).toBe(0);
    setSanity(g, 80); // climbing back does not pulse
    fx.update(state, far, 20);
    expect(state.pulse).toBe(0);
  });

  it('finds anomalies: dropped Echoes, shown hidden stone, glowing horrors', () => {
    const g = createGame();
    expect(nearestAnomaly(g, far)).toBe(0);
    spawnDrop(g, 10, { x: 0, y: 0, z: -20 });
    expect(nearestAnomaly(g, far)).toBe(1);

    const h = createGame();
    const door = { x: ARENA.hidden[0].x, y: 1.6, z: ARENA.hidden[0].z + 2 };
    expect(nearestAnomaly(h, door)).toBe(0);
    changeInsight(h, 1, 'debug', 'test');
    expect(nearestAnomaly(h, door)).toBe(1);

    setSanity(h, 30);
    spawnCreature(h, 'deep_one', { x: 0, z: -20, yaw: 0 }); // arrives eldritch: glowing eyes
    expect(nearestAnomaly(h, far)).toBe(1);
  });
});
