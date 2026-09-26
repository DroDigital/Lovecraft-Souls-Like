/**
 * Arms (playtest round 4), from the pause menu: the weapons the investigator owns, how each
 * handles, and which is in hand; choosing one takes it up (systems/arms.ts). A line says how many
 * more lie somewhere in the dream. Round 12: each shows its numbers, its blows with Might counted.
 */

import { SIM } from '../data/tuning';
import { WEAPON_IDS, WEAPONS, type WeaponDef } from '../data/weapons';
import { equip } from '../systems/arms';
import type { Game } from '../systems/components';
import { might } from '../systems/levels';
import { button, el, heading, type Page } from './menuKit';
import { glyph } from './glyphs';

/** A weapon's numbers: its first light and heavy blows (times `k`, the Might bonus), how soon the light one lands, its reach and cost. */
export function weaponStats(w: WeaponDef, k = 1): string {
  const [light, heavy] = [w.moves.light1, w.moves.heavy1];
  const dmg = (m: typeof light): number => Math.round((m?.hit?.damage ?? 0) * k);
  const lands = ((light?.hit?.window[0] ?? 0) / SIM.hz).toFixed(2);
  return `light ${dmg(light)}  ·  heavy ${dmg(heavy)}  ·  lands in ${lands} s  ·  reach ${(light?.hit?.reach ?? 0).toFixed(1)} m  ·  ${light?.stamina ?? 0} stamina`;
}

export function armsPage(g: Game, back: () => void, show: (p: Page) => void): Page {
  const page: Page = {
    back,
    build(p) {
      el(p, 'div', 'ARMS', 'font-size:18px;letter-spacing:6px;margin-bottom:10px');
      for (const id of g.player.arms) {
        const w = WEAPONS[id];
        button(p, `${w.name}${id === g.player.weapon ? '  ·  in hand' : ''}`, () => {
          equip(g, id);
          show(page);
        });
        el(p, 'div', w.note, 'opacity:.55;font-size:13px;line-height:1.4;margin:0 0 2px 10px');
        el(p, 'div', weaponStats(w, might(g, g.player.id)), 'opacity:.75;font:11px/1.4 monospace;margin:0 0 10px 10px');
      }
      const unfound = WEAPON_IDS.length - g.player.arms.length;
      if (unfound > 0) el(p, 'div', `${unfound === 1 ? 'One more lies' : `${unfound} more lie`} somewhere in the dream.`, 'opacity:.4;font-style:italic;margin-top:6px');
      heading(p, '');
      button(p, `Back  (${glyph('back')})`, back);
    },
  };
  return page;
}
