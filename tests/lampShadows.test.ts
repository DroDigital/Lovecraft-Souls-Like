import { describe, expect, it } from 'vitest';
import { LAMP_SHADOWS } from '../src/data/fxTuning';
import { createLampShadows, type Caster } from '../src/render/lampShadows';
import { worldUniforms } from '../src/render/worldMaterial';

const lamp = (slot: number, x: number): Caster => ({ slot, x, y: 2, z: 0, key: `lamp${x}` });

describe('the lamps cast shadows (round 35)', () => {
  it('a lamp keeps its map while it is among the nearest, the nearest few get one, and its shadow comes in over time', () => {
    const s = createLampShadows();
    s.enabled = true;
    const slots = worldUniforms.uLampSlot.value as number[];
    const four = [lamp(0, 1), lamp(1, 2), lamp(2, 3), lamp(3, 4)];
    s.update(four, 0.05);
    expect(slots.slice(0, 4).filter((v) => v >= 0)).toHaveLength(LAMP_SHADOWS.count);
    const first = slots[0];
    expect(first).toBeGreaterThanOrEqual(0);
    const fade0 = worldUniforms.uLSInfo.value[first].w;
    s.update([four[3], four[0], four[1], four[2]].map((c, i) => ({ ...c, slot: i })), 0.05); // the order changes, the lamps do not
    expect(slots[1]).toBe(first); // lamp 1 (now slot 1) has the same map as before
    expect(worldUniforms.uLSInfo.value[first].w).toBeGreaterThan(fade0);
    for (let i = 0; i < 20; i++) s.update(four, 0.05);
    expect(worldUniforms.uLSInfo.value[first].w).toBe(1);
  });

  it('none cast when shadows are off', () => {
    const s = createLampShadows();
    s.enabled = false;
    s.update([lamp(0, 1)], 0.1);
    expect((worldUniforms.uLampSlot.value as number[]).every((v) => v === -1)).toBe(true);
  });
});
