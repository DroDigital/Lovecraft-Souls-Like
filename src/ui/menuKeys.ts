/**
 * The line of keys at the foot of a menu page (round 36), named for the device in hand: how to choose,
 * to take, to go back, and, on a page with tabs, to change them.
 */

import { deviceInUse } from '../core/device';
import { glyph } from './glyphs';

export function menuKeys(tabbed = false, choose = 'Choose'): readonly (readonly [string, string])[] {
  const pad = deviceInUse() === 'pad';
  const keys: [string, string][] = [[pad ? 'D-pad' : '↑ ↓', choose], [pad ? 'A' : 'Enter', 'Select'], [glyph('back'), 'Back']];
  if (tabbed) keys.splice(2, 0, [pad ? 'LB RB' : 'PgUp PgDn', 'Tabs']);
  return keys;
}
