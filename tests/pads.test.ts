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

  describe('the desktop shell\u2019s native pads (round 36: Chromium on macOS lists none)', () => {
    async function withShell(web: () => unknown[], shell: () => unknown[]): Promise<typeof import('../src/core/pads')> {
      vi.resetModules();
      vi.stubGlobal('navigator', { getGamepads: web });
      vi.stubGlobal('desktop', { pads: shell });
      return import('../src/core/pads');
    }

    it('reads a pad the browser does not list, once a button is pressed on it', async () => {
      let down: number[] = [];
      const { activePad, padReport } = await withShell(() => [null, null, null, null], () => [pad(0, { id: 'Pro Controller', down })]);
      expect(activePad()).toBeNull();
      expect(padReport()).toMatch(/1 controller found/);
      down = [0];
      const r = activePad()!;
      expect(r.id).toBe('Pro Controller');
      expect(r.buttons[0].pressed).toBe(true);
    });

    it('reads it where the page is refused the browser\u2019s list altogether', async () => {
      vi.resetModules();
      vi.stubGlobal('navigator', { getGamepads: () => { throw new Error('blocked by policy'); } });
      vi.stubGlobal('desktop', { pads: () => [pad(0, { down: [1] })] });
      const { activePad, padFacts } = await import('../src/core/pads');
      activePad(); // seen with B already down: ignored until let go
      expect(padFacts()).toMatch(/blocked by policy/);
      expect(padFacts()).toMatch(/1 by the shell/);
    });

    it('hears a pad plugged in later, and none once it is gone', async () => {
      let shell: unknown[] = [];
      let down: number[] = [];
      const { activePad } = await withShell(() => [null], () => shell);
      expect(activePad()).toBeNull();
      shell = [pad(0, { id: 'late', down })];
      expect(activePad()).toBeNull();
      down = [0];
      shell = [pad(0, { id: 'late', down })];
      expect(activePad()?.id).toBe('late');
      shell = [];
      expect(activePad()).toBeNull();
    });

    it('keeps the browser\u2019s own pad, and does not flip to the shell\u2019s reading of the same one', async () => {
      let down: number[] = [];
      let t = 1;
      const { activePad } = await withShell(() => [pad(0, { id: 'same', down, t })], () => [pad(0, { id: 'same (sdl)', down })]);
      activePad(); // both seen at rest
      down = [0];
      t = 5;
      for (let i = 0; i < 5; i++) expect(activePad()?.id).toBe('same');
    });

    it('is as before on the web, where there is no bridge', async () => {
      let down: number[] = [];
      vi.resetModules();
      vi.stubGlobal('navigator', { getGamepads: () => [pad(0, { down })] });
      const { activePad } = await import('../src/core/pads');
      expect(activePad()).toBeNull();
      down = [0];
      expect(activePad()?.buttons[0].pressed).toBe(true);
    });
  });
});
