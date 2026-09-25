/**
 * The Elder Sign's menu (spec §3D), opened by resting at one: spend insight on Vigour, Endurance
 * and Resolve; travel to any Elder Sign found, grouped by region; at the hub's Sleeper's Sign,
 * descend the Seventy Steps into the Dreamlands; and at the Court's, once Azathoth slumbers, choose
 * one of two endings (Phase 5). A menu screen (menuKit.ts: mouse, keys or pad; E or Esc leaves);
 * the investigator takes no input while it is open.
 */

import { getRegion } from '../data/regions';
import { UPGRADES, type UpgradeId } from '../data/tuning';
import { ENDINGS } from '../data/endings';
import { dream, signPlace, travel } from '../systems/checkpoints';
import { courtEndings, endGame } from '../systems/endings';
import type { Game } from '../systems/components';
import { buyUpgrade, upgradeName } from '../systems/insight';
import { worldLayout, type SignPlace } from '../world/placements';
import { button, createScreen, el, heading } from './menuKit';

export interface SignMenu {
  readonly open: boolean;
}

export function createSignMenu(g: Game): SignMenu {
  const screen = createScreen(3, '#050506cc');
  const close = (): void => screen.close();

  function page(panel: HTMLElement): void {
    const ow = g.overworld!;
    const here = signPlace(ow.sign);
    el(panel, 'div', (here?.name ?? 'Elder Sign').toUpperCase(), 'font-size:18px;letter-spacing:4px');
    el(panel, 'div', 'You rest. Your health, sanity, Laudanum and Reagent are restored, and the creatures you killed are back.', 'opacity:.6;margin-top:2px');
    heading(panel, `INSIGHT ${g.mind.insight}`);
    for (const id of Object.keys(UPGRADES) as UpgradeId[]) {
      const u = UPGRADES[id];
      const level = g.mind.upgrades[id];
      button(panel, `${upgradeName(id)}  ${level}/${u.max}  ·  ${u.cost} insight`, () => {
        buyUpgrade(g, id);
        show();
      }, level < u.max && g.mind.insight >= u.cost);
    }
    const regions = new Map<string, SignPlace[]>();
    for (const s of worldLayout().signs) if (ow.discovered.has(s.id) && s.id !== ow.sign) regions.set(s.region, [...(regions.get(s.region) ?? []), s]);
    heading(panel, regions.size ? 'TRAVEL' : 'TRAVEL · no other Elder Sign found yet');
    for (const [region, signs] of regions) {
      el(panel, 'div', getRegion(region)?.name ?? region, 'margin:6px 0 0;opacity:.55');
      for (const s of signs) button(panel, s.name, () => void (travel(g, s.id), close()));
    }
    if (here?.dream) {
      heading(panel, 'THE SLEEPER’S SIGN');
      button(panel, 'Descend the Seventy Steps of Light Slumber', () => void (dream(g), close()));
    }
    const endings = courtEndings(g, ow.sign);
    if (endings.length) heading(panel, 'THE COURT OF AZATHOTH');
    for (const id of endings) button(panel, ENDINGS[id].choice, () => void (close(), endGame(g, id)));
    heading(panel, '');
    button(panel, 'Leave  (E)', close);
  }
  // E and Esc leave without reaching the game (E would rest again at once).
  const show = (): void => screen.show({ build: page, back: close, backKeys: ['KeyE'] });

  g.events.on('Rested', show);
  return {
    get open() {
      return screen.open;
    },
  };
}
