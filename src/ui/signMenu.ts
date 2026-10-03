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
import { DEFAULT_DIFFICULTY, DIFFICULTIES, GUN, LEVELS, REINFORCE, UPGRADES, type LevelId, type UpgradeId } from '../data/tuning';
import { WEAPONS } from '../data/weapons';
import { canReinforce, edgeAt, reinforce, reinforceCost } from '../systems/arms';
import { ENDINGS } from '../data/endings';
import { descentOpen, dream, signPlace, travel } from '../systems/checkpoints';
import { courtEndings, endGame } from '../systems/endings';
import { canUpgradeGun, gunCost, gunEdge, upgradeGun } from '../systems/gun';
import type { Game } from '../systems/components';
import { buyUpgrade, upgradeName } from '../systems/insight';
import { mainLead } from '../systems/lead';
import { buyLevel, canLevel, LEVEL_IDS, levelName, levelsBought, might, nextLevelCost } from '../systems/levels';
import { worldLayout, type SignPlace } from '../world/placements';
import { deviceInUse } from '../core/device';
import { ACCENT, button, createScreen, el, footer, heading, option, tabs, title, type Page } from './menuKit';
import { menuKeys } from './menuKeys';
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

  const TABS = ['Grow', 'Arms', 'Travel'];
  let tab = 0; // the tab open: Grow again at each rest
  const REST = 'You rest. Your health, sanity, Laudanum and Reagent are restored, the revolver is loaded from your spare rounds, and the creatures you killed are back.';

  /** Levels and the mind's upgrades: what the Echoes and the insight buy. */
  function grow(panel: HTMLElement): void {
    heading(panel, `BODY  ·  ECHOES  ·  NEXT LEVEL ${nextLevelCost(g)}`).style.margin = '0 0 4px';
    for (const id of LEVEL_IDS) {
      const full = g.player.levels[id] >= LEVELS[id].max;
      option(panel, `${levelName(id)}  ${g.player.levels[id]}/${LEVELS[id].max}  ·  ${GAINS[id]}  ·  ${full ? 'fully grown' : `${nextLevelCost(g)} Echoes`}`, () => (buyLevel(g, id), main.redraw?.()), canLevel(g, id), full ? `${levelName(id)} is fully grown.` : `Not enough Echoes: the next level costs ${nextLevelCost(g)}, and you carry ${g.player.echoes}.`);
    }
    heading(panel, `MIND  ·  INSIGHT ${g.mind.insight}`).style.margin = '12px 0 4px';
    for (const id of Object.keys(UPGRADES) as UpgradeId[]) {
      const u = UPGRADES[id];
      const level = g.mind.upgrades[id];
      option(panel, `${upgradeName(id)}  ${level}/${u.max}  ·  ${GAINS[id]}  ·  ${level < u.max ? `${u.cost} insight` : 'fully grown'}`, () => (buyUpgrade(g, id), main.redraw?.()), level < u.max && g.mind.insight >= u.cost, level >= u.max ? `${upgradeName(id)} is fully grown.` : `Not enough insight: ${u.cost}, and you hold ${g.mind.insight}. Insight comes of tomes, and of what the mind has borne.`);
    }
  }

  /** Star-stones set into the weapons owned, and the revolver, a level at a time (round 12; round 38: a tab, no longer a page of its own). */
  function arms(panel: HTMLElement): void {
    el(panel, 'div', `Star-stones: ${g.player.stones}. The horrors slain for good leave them; each level set into a weapon adds ${Math.round(REINFORCE.damage * 100)}% to its blows, and into the revolver ${Math.round(GUN.level.damage * 100)}% to its shots, with a truer aim and a longer reach.`, 'opacity:.6;font-size:13px;line-height:1.5;padding:0 14px 8px');
    const [level, price] = [g.player.gun, gunCost(g)];
    const shot = (n: number): number => Math.round(PLAYER_MOVES.shoot.shot.damage * might(g, g.player.id) * gunEdge(n));
    const whole = (n: number): number => GUN.reach.near + n * GUN.level.reach;
    const gunName = `Revolver +${level}`;
    option(panel, price === undefined ? `${gunName}  ·  fully set` : `${gunName} → +${level + 1}  ·  ${price} star-stone${price === 1 ? '' : 's'}  ·  shot ${shot(level)} → ${shot(level + 1)}  ·  whole to ${whole(level)} → ${whole(level + 1)} m`, () => (upgradeGun(g), main.redraw?.()), canUpgradeGun(g), price === undefined ? 'The revolver is fully set.' : `Not enough star-stones: ${price}, and you carry ${g.player.stones}.`);
    for (const id of g.player.arms) {
      const level = g.player.reinforced[id];
      const cost = reinforceCost(g, id);
      const light = (n: number): number => Math.round((WEAPONS[id].moves.light1?.hit?.damage ?? 0) * might(g, g.player.id) * edgeAt(n));
      const name = `${WEAPONS[id].name} +${level}`;
      const label = cost === undefined ? `${name}  ·  fully reinforced` : `${name} → +${level + 1}  ·  ${cost} star-stone${cost === 1 ? '' : 's'}  ·  light ${light(level)} → ${light(level + 1)}`;
      option(panel, label, () => (reinforce(g, id), main.redraw?.()), canReinforce(g, id), cost === undefined ? `${WEAPONS[id].name} is fully reinforced.` : `Not enough star-stones: ${cost}, and you carry ${g.player.stones}.`);
    }
  }

  /** The regions with signs found: one line each rather than every sign in one long list (round 12). */
  function travelTab(panel: HTMLElement): void {
    const regions = found();
    if (!regions.size) return void el(panel, 'div', 'No other Elder Sign found yet. Each you find, and rest at, can be travelled to from any other.', 'opacity:.6;line-height:1.5;padding:0 14px');
    el(panel, 'div', 'Choose a region, then the Elder Sign to wake beside.', 'opacity:.6;font-size:13px;padding:0 14px 6px');
    for (const [region, signs] of regions) {
      if (signs.length === 1) button(panel, `${regionName(region)}  ·  ${signs[0].name}`, () => journey(signs[0]));
      else button(panel, `${regionName(region)}  ·  ${signs.length} signs  ›`, () => screen.show(regionPage(region)));
    }
  }

  const pinned = (panel: HTMLElement): HTMLElement => {
    const box = el(panel, 'div');
    box.dataset.pin = ''; // stays above the tabs' body
    return box;
  };

  function build(panel: HTMLElement): void {
    const ow = g.overworld!;
    const here = signPlace(ow.sign);
    panel.dataset.body = '366';
    title(panel, (here?.name ?? 'Elder Sign').toUpperCase());
    const lead = `${g.player.cycle ? `JOURNEY ${g.player.cycle + 1}  ·  ` : ''}${g.player.difficulty === DEFAULT_DIFFICULTY ? '' : `${DIFFICULTIES[g.player.difficulty].name.toUpperCase()}  ·  `}`;
    const stat = el(panel, 'div', `${lead}LEVEL ${levelsBought(g) + 1}  ·  ECHOES ${g.player.echoes}  ·  INSIGHT ${g.mind.insight}  ·  STAR-STONES ${g.player.stones}`, `margin:-6px 0 12px;text-align:center;font-size:11px;letter-spacing:2px;color:${ACCENT}`);
    stat.dataset.pin = '';
    const next = mainLead(g)?.text; // what the story asks next: a resting place is where it is thought of (round 38)
    if (next) {
      const line = el(panel, 'div', `NEXT  ·  ${next}`, `margin:-6px 14px 10px;text-align:center;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;opacity:.7`);
      [line.title, line.dataset.pin] = [next, ''];
    }
    const endings = courtEndings(g, ow.sign); // the choice the whole dream led to comes first (round 12)
    if (endings.length) {
      const box = pinned(panel);
      heading(box, 'THE COURT OF AZATHOTH').style.marginTop = '0';
      for (const id of endings) button(box, ENDINGS[id].choice, () => void (close(), endGame(g, id)));
    }
    if (here?.dream) {
      const box = pinned(panel);
      heading(box, 'THE SLEEPER’S SIGN').style.marginTop = '0';
      if (descentOpen(g)) button(box, 'Descend the Seventy Steps of Light Slumber', () => (close(), go('THE SEVENTY STEPS OF LIGHT SLUMBER', () => dream(g), DESCENT_LINE)));
      else el(box, 'div', 'The stair will not open while Keziah Mason troubles the sleepers, in the Witch House in Arkham.', 'opacity:.6;margin:4px 0 8px;font-size:13px');
    }
    tabs(panel, TABS, tab, (i) => ((tab = i), main.redraw?.()), main);
    if (tab === 0) grow(panel);
    else if (tab === 1) arms(panel);
    else travelTab(panel);
    const pad = deviceInUse() === 'pad';
    footer(panel, REST, [...menuKeys(true).slice(0, 3), [pad ? glyph('back') : `${glyph('interact')} / ${glyph('back')}`, 'Back']], close);
  }

  // E and Esc leave without reaching the game (E would rest again at once).
  const main: Page = {
    build,
    back: close,
    get backKeys() {
      return [keyLayout.interact];
    },
  };
  const regionPages = new Map<string, Page>(); // one each, so coming back finds the focus where it was
  const regionPage = (region: string): Page => {
    let p = regionPages.get(region);
    if (!p) {
      const page: Page = {
        back: () => screen.show(main),
        build(panel) {
          title(panel, regionName(region).toUpperCase());
          for (const s of found().get(region) ?? []) button(panel, s.name, () => journey(s));
          footer(panel, '', menuKeys(), page.back);
        },
      };
      regionPages.set(region, (p = page));
    }
    return p;
  };

  g.events.on('Rested', () => ((tab = 0), screen.show(main)));
  return {
    get open() {
      return screen.open;
    },
  };
}
