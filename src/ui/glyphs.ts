/**
 * Button names for the device in hand (playtest round 12: every prompt and hint said E, T, Space or
 * Esc even with a pad in hand). With keyboard and mouse a prompt names the key the player bound
 * (core/bindings.ts); with a pad, the standard layout's buttons as Steam shows them (A, B, RB…).
 * Texts carry `{action}` tokens that `fill` replaces.
 */

import { keyLayout, keyName } from '../core/bindings';
import { deviceInUse } from '../core/device';

export type Act = 'move' | 'look' | 'light' | 'heavy' | 'block' | 'parry' | 'dodge' | 'shoot' | 'lock' | 'heal' | 'item' | 'throw' | 'interact' | 'map' | 'pause' | 'back';

const PAD: Readonly<Record<Act, string>> = {
  move: 'the left stick',
  look: 'the right stick',
  light: 'RB',
  heavy: 'RT',
  block: 'LB',
  parry: 'LT',
  dodge: 'B',
  shoot: 'X',
  lock: 'R3',
  heal: 'Y',
  item: 'D-pad ↓',
  throw: 'D-pad ↑',
  interact: 'A',
  map: 'View',
  pause: 'Menu',
  back: 'B',
};

/** What the keyboard and mouse call an act. */
function keysName(act: Act): string {
  const k = keyLayout;
  switch (act) {
    case 'move':
      return [k.forward, k.left, k.back, k.right].map(keyName).join('');
    case 'look':
      return 'the mouse';
    case 'light':
      return 'LMB';
    case 'heavy':
      return 'Shift+LMB';
    case 'block':
      return 'RMB';
    case 'parry':
      return 'Shift+RMB';
    case 'pause':
    case 'back':
      return 'Esc';
    default:
      return keyName(k[act]);
  }
}

/** The name of the button for `act` on the device in hand. */
export const glyph = (act: Act): string => (deviceInUse() === 'pad' ? PAD[act] : keysName(act));

/** `text` with each `{act}` replaced by its button's name (in capitals for a line in capitals). */
export const fill = (text: string, upper = false): string =>
  text.replace(/\{(\w+)\}/g, (m, act: string) => (act in PAD ? (upper ? glyph(act as Act).toUpperCase() : glyph(act as Act)) : m));
