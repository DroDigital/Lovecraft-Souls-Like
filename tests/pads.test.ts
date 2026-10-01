import { afterEach, describe, expect, it, vi } from 'vitest';

type B = { pressed: boolean; value: number };
const btn = (down: boolean): B => ({ pressed: down, value: down ? 1 : 0 });
const pad = (index: number, o: { id?: string; mapping?: string; axes?: number[]; down?: number[]; t?: number } = {}): unknown => ({
  index, id: o.id ?? `pad${index}`, connected: true, mapping: o.mapping ?? 'standard', timestamp: o.t ?? 1,
  axes: o.axes ?? [0, 0, 0, 0], buttons: Array.from({ length: 17 }, (_, i) => btn(o.down?.includes(i) ?? false)),
});

async function fresh(list: () => unknown[]): Promise<typeof import('../src/core/pads')> {
  vi.resetModules();
  vi.stubGlobal('navigator', { getGamepads: list });
  return import('../src/core/pads');
}
afterEach(() => vi.unstubAllGlobals());

describe('the pad in hand (round 31)', () => {
  it('a pad not yet touched is not heard, and one is once a button is pressed on it', async () => {
    let frame = { down: [] as number[] };
    const { activePad, padReport } = await fresh(() => [pad(0, frame)]);
    expect(activePad()).toBeNull();
    expect(padReport()).toMatch(/press a button/);
    frame = { down: [0] };
    expect(activePad()?.buttons[0].pressed).toBe(true);
  });

  it('a button already down when the pad is first seen is ignored until it is let go', async () => {
    let down = [7];
    const { activePad } = await fresh(() => [pad(0, { down })]);
    expect(activePad()).toBeNull(); // nothing used yet
    down = [7, 0];
    const r = activePad()!;
    expect(r.buttons[7].pressed).toBe(false); // the stuck one stays silent
    expect(r.buttons[0].pressed).toBe(true);
    down = [];
    activePad();
    down = [7];
    expect(activePad()!.buttons[7].pressed).toBe(true); // let go once, it counts again
  });

  it('an axis that lay off centre is read from where it lay, and cannot walk the player on its own', async () => {
    const { activePad } = await fresh(() => [pad(0, { mapping: '', axes: [0, 0, -1, 1], down: [] })]);
    expect(activePad()).toBeNull(); // resting at -1 and 1 is not use
  });

  it('a phantom pad does not shadow the real one', async () => {
    let t = 1;
    const { activePad } = await fresh(() => [pad(0, { id: 'phantom', mapping: '', axes: [0, 0, 1, 1] }), pad(1, { id: 'real', down: t > 1 ? [0] : [], t })]);
    activePad();
    t = 2;
    expect(activePad()?.id).toBe('real');
  });
});
