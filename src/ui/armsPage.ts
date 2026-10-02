/**
 * Arms (playtest round 4), from the pause menu: the weapons the investigator owns, how each
 * handles, and which is in hand; choosing one takes it up (systems/arms.ts). A line says how many
 * more lie somewhere in the dream. Round 12: each shows its numbers, its blows with Might and its
 * reinforcement counted, and how far it is reinforced. Round 22: the revolver's rounds and levels.
 */

import { PLAYER_MOVES } from '../data/moves';
import { GUN, SIM } from '../data/tuning';
import { WEAPON_IDS, WEAPONS, type WeaponDef } from '../data/weapons';
import { edgeAt, equip } from '../systems/arms';
import type { Game } from '../systems/components';
import { falloff, gunEdge } from '../systems/gun';
import { might } from '../systems/levels';
import { button, el, footer, heading, title, type Page } from './menuKit';
import { fill } from './glyphs';
import { menuKeys } from './menuKeys';

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
      title(p, 'ARMS');
      heading(p, 'MELEE').style.margin = '0 14px 4px';
      const list = el(p, 'div');
      for (const id of g.player.arms) {
        const w = WEAPONS[id];
        const level = g.player.reinforced[id];
        const b = button(list, `${w.name}${level ? ` +${level}` : ''}${id === g.player.weapon ? '    ·  in hand' : ''}`, () => {
          equip(g, id);
          show(page);
        });
        b.dataset.hint = `${w.note}\n${weaponStats(w, might(g, g.player.id) * edgeAt(level))}`;
      }
      heading(p, 'SIDEARM').style.margin = '14px 14px 4px';
      const shot = Math.round(PLAYER_MOVES.shoot.shot.damage * might(g, g.player.id) * gunEdge(g.player.gun));
      const left = (m: number): number => Math.round(100 * falloff(m, g.player.gun));
      el(p, 'div', `Revolver${g.player.gun ? ` +${g.player.gun}` : ''}   ·   ${g.player.ammo}/${GUN.chamber} loaded   ·   ${g.player.rounds} spare`, 'padding:4px 14px 0');
      el(p, 'div', `shot ${shot}  ·  ${left(6)}% at 6 m  ·  ${left(9)}% at 9 m  ·  ${left(12)}% at 12 m`, 'padding:0 14px;opacity:.55;font-size:12px;font-variant-numeric:lining-nums tabular-nums');
      const unfound = WEAPON_IDS.length - g.player.arms.length;
      if (unfound > 0) el(p, 'div', `${unfound === 1 ? 'One more weapon lies' : `${unfound} more weapons lie`} somewhere in the dream.`, 'opacity:.4;font-style:italic;margin:10px 14px 0;font-size:13px');
      footer(p, fill('Choose a weapon to take it up. The revolver is loaded with {reload}; its rounds are found in boxes and caches, and sold by those who trade.'), menuKeys(false, 'Choose'));
    },
  };
  return page;
}
