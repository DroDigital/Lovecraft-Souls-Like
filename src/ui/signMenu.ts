/**
 * The Elder Sign's menu (spec §3D), opened by resting at one: spend Echoes on a level of Vigour,
 * Endurance or Might (playtest round 4) and insight on Resolve or a Draught; set star-stones into a
 * weapon (round 12); travel to any Elder Sign
 * found, chosen by region and then by name (playtest round 12: one list grew past forty); at the hub's
 * Sleeper's Sign, descend the Seventy Steps into the Dreamlands; and at the Court's, once Azathoth
 * slumbers, choose one of two endings (Phase 5), first of all. A menu screen (menuKit.ts: mouse, keys
 * or pad; E or Esc leaves); the investigator takes no input while it is open.
 */

import { getRegion } from '../data/regions';
import { DESCENT_LINE } from '../data/loreLines';
import { PLAYER_MOVES } from '../data/moves';
import { GUN, LEVELS, REINFORCE, UPGRADES, type LevelId, type UpgradeId } from '../data/tuning';
import { WEAPONS } from '../data/weapons';
import { canReinforce, edgeAt, reinforce, reinforceCost } from '../systems/arms';
import { ENDINGS } from '../data/endings';
import { descentOpen, dream, signPlace, travel } from '../systems/checkpoints';
import { courtEndings, endGame } from '../systems/endings';
import { canUpgradeGun, gunCost, gunEdge, upgradeGun } from '../systems/gun';
import type { Game } from '../systems/components';
import { buyUpgrade, upgradeName } from '../systems/insight';
import { buyLevel, canLevel, LEVEL_IDS, levelName, levelsBought, might, nextLevelCost } from '../systems/levels';
import { worldLayout, type SignPlace } from '../world/placements';
import { button, createScreen, el, heading, type Page } from './menuKit';
import { keyLayout } from '../core/bindings';
import { glyph } from './glyphs';

/** What one more level of each gives, in words. */
const GAINS: Record<LevelId | UpgradeId, string> = {
  vigour: `+${LEVELS.vigour.hp} health`,
  endurance: `+${LEVELS.endurance.stamina} stamina, and it returns faster`,
  might: `+${Math.round(LEVELS.might.damage! * 100)}% damage`,
  resolve: `sanity losses −${Math.round(UPGRADES.resolve.resist! * 100)}%`,
  draught: `+${UPGRADES.draught.doses} Laudanum`,
};

export interface SignMenu {
  readonly open: boolean;
}

/** `go` makes a long jump under the veil (journeys.ts). */
export function createSignMenu(g: Game, go: (words: string, jump: () => void, line?: string) => void): SignMenu {
  const screen = createScreen(3, '#050506cc');
  screen.onClose = () => void (g.player.kneeling = null); // rested at the stone, they rise when the menu is left, not when they next move (round 29)
  const close = (): void => screen.close();
  const journey = (s: SignPlace): void => (close(), go(s.name.toUpperCase(), () => travel(g, s.id)));
  /** The signs found, but the one rested at, by region in the world's order. */
  const found = (): Map<string, SignPlace[]> => {
    const ow = g.overworld!;
    const regions = new Map<string, SignPlace[]>();
    for (const s of worldLayout().signs) if (ow.discovered.has(s.id) && s.id !== ow.sign) regions.set(s.region, [...(regions.get(s.region) ?? []), s]);
    return regions;
  };
  const regionName = (id: string): string => getRegion(id)?.name ?? id;

  function build(panel: HTMLElement): void {
    const ow = g.overworld!;
    const here = signPlace(ow.sign);
    el(panel, 'div', (here?.name ?? 'Elder Sign').toUpperCase(), 'font-size:18px;letter-spacing:4px');
    el(panel, 'div', 'You rest. Your health, sanity, Laudanum and Reagent are restored, the revolver is loaded from your spare rounds, and the creatures you killed are back.', 'opacity:.6;margin-top:2px');
    const endings = courtEndings(g, ow.sign); // the choice the whole dream led to comes first (round 12)
    if (endings.length) heading(panel, 'THE COURT OF AZATHOTH');
    for (const id of endings) button(panel, ENDINGS[id].choice, () => void (close(), endGame(g, id)));
    if (here?.dream) {
      heading(panel, 'THE SLEEPER’S SIGN');
      if (descentOpen(g)) button(panel, 'Descend the Seventy Steps of Light Slumber', () => (close(), go('THE SEVENTY STEPS OF LIGHT SLUMBER', () => dream(g), DESCENT_LINE)));
      else el(panel, 'div', 'The stair will not open while Keziah Mason troubles the sleepers, in the Witch House in Arkham.', 'opacity:.6;margin:4px 0 8px');
    }
    heading(panel, `${g.player.cycle ? `JOURNEY ${g.player.cycle + 1}  ·  ` : ''}LEVEL ${levelsBought(g) + 1}  ·  ECHOES ${g.player.echoes}  ·  NEXT LEVEL ${nextLevelCost(g)}`);
    for (const id of LEVEL_IDS) {
      button(panel, `${levelName(id)}  ${g.player.levels[id]}/${LEVELS[id].max}  ·  ${GAINS[id]}`, () => (buyLevel(g, id), main.redraw?.()), canLevel(g, id));
    }
    heading(panel, `INSIGHT ${g.mind.insight}`);
    for (const id of Object.keys(UPGRADES) as UpgradeId[]) {
      const u = UPGRADES[id];
      const level = g.mind.upgrades[id];
      button(panel, `${upgradeName(id)}  ${level}/${u.max}  ·  ${GAINS[id]}  ·  ${u.cost} insight`, () => (buyUpgrade(g, id), main.redraw?.()), level < u.max && g.mind.insight >= u.cost);
    }
    heading(panel, `ARMS  ·  STAR-STONES ${g.player.stones}`);
    button(panel, 'Reinforce a weapon  ›', () => screen.show(reinforcePage));
    const regions = found();
    const count = [...regions.values()].reduce((n, l) => n + l.length, 0);
    heading(panel, 'TRAVEL');
    button(panel, count ? `Travel to another Elder Sign  ·  ${count} found` : 'No other Elder Sign found yet', () => screen.show(travelPage), count > 0);
    heading(panel, '');
    button(panel, `Leave  (${glyph('interact')})`, close);
  }

  // E and Esc leave without reaching the game (E would rest again at once).
  const main: Page = {
    build,
    back: close,
    get backKeys() {
      return [keyLayout.interact];
    },
  };
  /** Star-stones set into the weapons owned, a level at a time (round 12). */
  const reinforcePage: Page = {
    back: () => screen.show(main),
    build(panel) {
      el(panel, 'div', 'REINFORCE', 'font-size:18px;letter-spacing:4px');
      el(panel, 'div', `Star-stones: ${g.player.stones}. The horrors slain for good leave them; each level set into a weapon adds ${Math.round(REINFORCE.damage * 100)}% to its blows, and into the revolver ${Math.round(GUN.level.damage * 100)}% to its shots, with a truer aim and a longer reach.`, 'opacity:.6;margin:2px 0 8px');
      const [level, price] = [g.player.gun, gunCost(g)];
      const shot = (n: number): number => Math.round(PLAYER_MOVES.shoot.shot.damage * might(g, g.player.id) * gunEdge(n));
      const whole = (n: number): number => GUN.reach.near + n * GUN.level.reach;
      const gunName = `Revolver +${level}`;
      button(panel, price === undefined ? `${gunName}  ·  fully set` : `${gunName} → +${level + 1}  ·  ${price} star-stone${price === 1 ? '' : 's'}  ·  shot ${shot(level)} → ${shot(level + 1)}  ·  whole to ${whole(level)} → ${whole(level + 1)} m`, () => (upgradeGun(g), reinforcePage.redraw?.()), canUpgradeGun(g));
      for (const id of g.player.arms) {
        const level = g.player.reinforced[id];
        const cost = reinforceCost(g, id);
        const light = (n: number): number => Math.round((WEAPONS[id].moves.light1?.hit?.damage ?? 0) * might(g, g.player.id) * edgeAt(n));
        const name = `${WEAPONS[id].name} +${level}`;
        const label = cost === undefined ? `${name}  ·  fully reinforced` : `${name} → +${level + 1}  ·  ${cost} star-stone${cost === 1 ? '' : 's'}  ·  light ${light(level)} → ${light(level + 1)}`;
        button(panel, label, () => (reinforce(g, id), reinforcePage.redraw?.()), canReinforce(g, id));
      }
      heading(panel, '');
      button(panel, `Back  (${glyph('back')})`, reinforcePage.back!);
    },
  };
  /** The regions with signs found: one line each rather than every sign in one long list (round 12). */
  const travelPage: Page = {
    back: () => screen.show(main),
    build(panel) {
      el(panel, 'div', 'TRAVEL', 'font-size:18px;letter-spacing:4px');
      el(panel, 'div', 'Choose a region, then the Elder Sign to wake beside.', 'opacity:.6;margin:2px 0 8px');
      for (const [region, signs] of found()) {
        if (signs.length === 1) button(panel, `${regionName(region)}  ·  ${signs[0].name}`, () => journey(signs[0]));
        else button(panel, `${regionName(region)}  ·  ${signs.length} signs  ›`, () => screen.show(regionPage(region)));
      }
      heading(panel, '');
      button(panel, `Back  (${glyph('back')})`, travelPage.back!);
    },
  };
  const regionPages = new Map<string, Page>(); // one each, so coming back finds the focus where it was
  const regionPage = (region: string): Page => {
    let p = regionPages.get(region);
    if (!p) {
      const page: Page = {
        back: () => screen.show(travelPage),
        build(panel) {
          el(panel, 'div', regionName(region).toUpperCase(), 'font-size:18px;letter-spacing:4px;margin-bottom:8px');
          for (const s of found().get(region) ?? []) button(panel, s.name, () => journey(s));
          heading(panel, '');
          button(panel, `Back  (${glyph('back')})`, page.back!);
        },
      };
      regionPages.set(region, (p = page));
    }
    return p;
  };

  g.events.on('Rested', () => screen.show(main));
  return {
    get open() {
      return screen.open;
    },
  };
}
