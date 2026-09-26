import { describe, expect, it } from 'vitest';
import { DEFAULT_KEYS, keyLayout, keyName, parseKeys, rebind, type KeyLayout } from '../src/core/bindings';
import { useDevice } from '../src/core/device';
import { fill, glyph } from '../src/ui/glyphs';
import { scaleFor } from '../src/ui/uiScale';
import { UI } from '../src/data/tuning';

describe('key bindings (playtest round 12)', () => {
  it('a key given to one action is taken from another, which gets the first one\'s old key', () => {
    const k: KeyLayout = { ...DEFAULT_KEYS };
    expect(rebind(k, 'heal', 'KeyE')).toBe(true);
    expect(k.heal).toBe('KeyE');
    expect(k.interact).toBe('KeyR');
    expect(new Set(Object.values(k)).size).toBe(Object.keys(k).length);
  });

  it('the menus\' own keys cannot be taken', () => {
    const k: KeyLayout = { ...DEFAULT_KEYS };
    for (const code of ['Escape', 'Enter', 'Tab', 'ArrowUp']) expect(rebind(k, 'dodge', code)).toBe(false);
    expect(k).toEqual(DEFAULT_KEYS);
  });

  it('a stored layout parses; a broken, hostile or doubled one stays playable', () => {
    expect(parseKeys(null)).toEqual(DEFAULT_KEYS);
    expect(parseKeys('{not json')).toEqual(DEFAULT_KEYS);
    expect(parseKeys('{"dodge":"ShiftLeft","map":"<b>","heal":7}')).toEqual({ ...DEFAULT_KEYS, dodge: 'ShiftLeft' });
    const doubled = parseKeys('{"forward":"KeyE","interact":"KeyE"}');
    expect(new Set(Object.values(doubled)).size).toBe(Object.keys(doubled).length);
    expect(parseKeys('{"interact":"Escape"}').interact).toBe('KeyE');
  });

  it('keys are shown by their names', () => {
    expect(keyName('KeyE')).toBe('E');
    expect(keyName('Digit3')).toBe('3');
    expect(keyName('ShiftLeft')).toBe('Shift');
    expect(keyName('Space')).toBe('Space');
  });
});

describe('prompts name the device in hand', () => {
  it('keys as bound, or the pad\'s buttons', () => {
    const was = { ...keyLayout };
    try {
      useDevice('keys');
      expect(fill('{interact} rest · {move} walk · {light} strike')).toBe('E rest · WASD walk · LMB strike');
      rebind(keyLayout, 'interact', 'KeyG');
      expect(glyph('interact')).toBe('G');
      expect(fill('press {interact}', true)).toBe('press G');
      useDevice('pad');
      expect(fill('{interact} rest · {move} walk · {light} strike')).toBe('A rest · the left stick walk · RB strike');
      expect(fill('{unknown} stays')).toBe('{unknown} stays');
    } finally {
      Object.assign(keyLayout, was);
      useDevice('keys');
    }
  });
});

describe('UI scale', () => {
  it('follows the window\'s height, within bounds, times the setting', () => {
    expect(scaleFor(UI.baseHeight, 1)).toBe(1);
    expect(scaleFor(1440, 1)).toBe(2);
    expect(scaleFor(400, 1)).toBe(UI.least);
    expect(scaleFor(99999, 1)).toBe(UI.most);
    expect(scaleFor(1440, 0.75)).toBe(1.5);
  });
});
