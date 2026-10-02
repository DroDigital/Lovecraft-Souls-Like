import { describe, expect, it } from 'vitest';
import { sameSnapshot, snapshot } from '../desktop/padSnapshot.js';

const btn = (pressed: boolean, value = pressed ? 1 : 0): { pressed: boolean; value: number } => ({ pressed, value });

describe('the controllers the desktop shell reads natively (round 36)', () => {
  const pad = { index: 3, id: 'Pro Controller', connected: true, mapping: 'standard', axes: [0.123456, -1, 0, NaN], buttons: [btn(true), btn(false), btn(false, 0.5)] };

  it('turns a Gamepad API list into plain data, numbered from 0, holes and gone pads left out', () => {
    const snap = snapshot([null, pad, { ...pad, connected: false }, undefined]);
    expect(snap).toHaveLength(1);
    expect(snap[0]).toMatchObject({ index: 0, id: 'Pro Controller', connected: true, mapping: 'standard' });
    expect(snap[0].axes).toEqual([0.123, -1, 0, 0]); // noise rounded away, a bad number is rest
    expect(snap[0].buttons.map((b) => b.pressed)).toEqual([true, false, false]);
    expect(snap[0].buttons[2].value).toBe(0.5);
    expect(JSON.parse(JSON.stringify(snap))).toEqual(snap); // it crosses a process as JSON
  });

  it('says a pad has no standard mapping when it does not claim one, and survives a list of nothing', () => {
    expect(snapshot([{ ...pad, mapping: 'something' }])[0].mapping).toBe('');
    expect(snapshot(undefined)).toEqual([]);
    expect(snapshot([])).toEqual([]);
  });

  it('knows a steady pad from one that moved, so only a change is sent', () => {
    const a = snapshot([pad]);
    expect(sameSnapshot(a, snapshot([{ ...pad, axes: [0.1234, -1, 0, 0] }]))).toBe(true); // within the rounding
    expect(sameSnapshot(a, snapshot([{ ...pad, buttons: [btn(false), btn(false), btn(false)] }]))).toBe(false);
    expect(sameSnapshot(a, [])).toBe(false);
  });
});
