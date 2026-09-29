/**
 * The ending card (spec §5, Phase 5): when one of the three endings is chosen, its title and closing
 * words fill the screen, and the ending is remembered beyond the save (records.ts). Round 12: then
 * what became of the people met (data/epilogues.ts), the credits rolling, and the dream's numbers
 * (systems/tally.ts), with the choice: walk on in the world, or begin anew — asked first, then a new
 * game with its opening, as the title's New game, or a new journey carrying the investigator's
 * strength (NG+, systems/cycles.ts). Round 17: the title's theme sounds again under it, and its
 * words come out of the dark one after another. Round 20: the ending's cutscene plays first
 * (main.ts opens the card once it is done).
 */

import { ENDINGS, type EndingId } from '../data/endings';
import { fateOf } from '../data/epilogues';
import { NPCS } from '../data/npcs';
import { QUESTS } from '../data/quests';
import { REGIONS } from '../data/regions';
import type { Game } from '../systems/components';
import { carryOf } from '../systems/cycles';
import { levelsBought } from '../systems/levels';
import { isDone } from '../systems/quests';
import { noteEnding, storeCarry, type Records } from '../systems/records';
import type { SaveStore } from '../systems/save';
import { bossesSlain, playTime } from '../systems/tally';
import { placesOf } from '../world/namedPlaces';
import type { Music } from '../render/audio/music';
import { creditsPage } from './credits';
import { BONE, el, SERIF } from './hudKit';
import { button, createScreen, heading, type Page } from './menuKit';

const BUTTON = `display:inline-block;width:auto;text-align:center;margin:28px 10px 0;padding:6px 16px;font:14px ${SERIF};letter-spacing:2px;color:${BONE};background:#141416;border:1px solid ${BONE}55;cursor:pointer`;

/** Set before a reload: the page opens straight into a new game with its opening (main.ts). */
export const NEW_GAME_FLAG = 'lovecraft-souls-like/new-game';

export interface EndingCard {
  readonly open: boolean;
  /** Opens the card for an ending (main.ts: once its cutscene, render/cinema.ts, is over). */
  show(id: string): void;
}

/** Leaves this dream for a new one: the reload finds the flag, forgets the save and plays the opening. */
export function beginAnew(): void {
  try {
    sessionStorage.setItem(NEW_GAME_FLAG, '1');
  } catch {
    // No session storage: the title's New game is still there after the reload.
  }
  location.href = location.pathname;
}

/** Brings `nodes` out of the dark one after another. */
function staged(nodes: Element[], first = 300, gap = 1100): void {
  nodes.forEach((n, i) => n.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 1600, delay: first + i * gap, easing: 'ease-out', fill: 'backwards' }));
}

/** The people met, each with what became of them under this ending. */
function fates(g: Game, id: EndingId): string[] {
  const met = g.overworld?.met ?? new Set<string>();
  return NPCS.filter((n) => met.has(n.id)).flatMap((n) => {
    const quest = n.topics.find((t) => t.starts)?.starts;
    const line = fateOf(n.id, id, !quest || !QUESTS[quest] || isDone(g, quest));
    return line ? [line] : [];
  });
}

/** The dream's numbers, a line each. */
function numbers(g: Game, records: Records): [string, string][] {
  const t = g.overworld!.tally;
  const [slain, of] = bossesSlain(g);
  return [
    ['Journey', String(g.player.cycle + 1)],
    ['Time in the dream', playTime(t.frames)],
    ['Level', String(levelsBought(g) + 1)],
    ['Horrors put down', `${slain} of ${of}`],
    ['Foes killed', String(t.kills)],
    ['Deaths', String(t.deaths)],
    ['Echoes earned', String(t.echoes)],
    ['Places found', `${g.overworld!.places.size} of ${REGIONS.reduce((n, r) => n + placesOf(r.id).length, 0)}`], // round 18
    ['Endings reached', `${records.endings.length} of 3`],
  ];
}

/** `theme` sounds the title's theme (main.ts), from the ending until the investigator walks on. */
export function createEndingCard(g: Game, store: SaveStore | null, theme?: () => Music): EndingCard {
  const screen = createScreen(4, '#050506', `left:50%;top:34%;width:min(640px,90vw);transform:translate(-50%,-30%);text-align:center;font:16px/1.8 ${SERIF}`);
  let music: Music | undefined;
  const walkOn = (): void => {
    screen.close();
    music?.fadeOut(4);
    music = undefined;
  };
  const show = (id: string): void => {
    const e = ENDINGS[id as EndingId];
    if (!e || !g.overworld) return;
    music ??= theme?.();
    const records = noteEnding(store, id as EndingId);
    const told = fates(g, id as EndingId);
    const goOn = (p: HTMLElement, next: Page): void => void (button(el('', '', p), 'Go on', () => screen.show(next)).style.cssText = BUTTON);
    const card: Page = {
      build(page) {
        const title = el('font-size:26px;letter-spacing:10px;margin-bottom:26px', e.title, page);
        const lines = el('opacity:.85', '', page);
        for (const line of e.lines) el('margin:6px 0', line, lines);
        goOn(page, told.length ? after : credits);
        staged([title, ...lines.children, page.lastElementChild!], 600, 1500);
      },
    };
    const after: Page = {
      back: () => screen.show(card),
      build(page) {
        heading(page, 'AFTERWARDS');
        const fates = told.map((line) => el('opacity:.8;margin:10px 0;font-size:15px;line-height:1.6', line, page));
        goOn(page, credits);
        staged([...fates, page.lastElementChild!]);
      },
    };
    const credits = creditsPage(() => screen.show(end), 'Go on');
    const end: Page = {
      build(page) {
        el('font-size:18px;letter-spacing:8px;margin-bottom:14px', e.title, page);
        const table = el('display:grid;grid-template-columns:1fr auto;gap:0 24px;max-width:340px;margin:0 auto;text-align:left;font-size:14px', '', page);
        for (const [k, v] of numbers(g, records)) (el('opacity:.6', k, table), el('', v, table));
        const buttons = el('', '', page);
        button(buttons, 'Walk on', walkOn).style.cssText = BUTTON;
        button(buttons, 'Begin anew', () => screen.show(confirm)).style.cssText = BUTTON;
      },
    };
    const confirm: Page = {
      back: () => screen.show(end),
      build(page) {
        heading(page, 'BEGIN ANEW?');
        el('opacity:.6;margin-bottom:14px', 'This dream is forgotten and a new one begins. The endings you have reached are remembered.', page);
        el('opacity:.5;font-size:13px;margin-bottom:10px', "You may carry your strength into it: your levels, arms and their stones, the mind's upgrades, vials and Echoes. Its horrors will be hardier for it.", page);
        const buttons = el('', '', page);
        button(buttons, 'No, go back', () => screen.show(end)).style.cssText = BUTTON;
        button(buttons, 'Begin anew', beginAnew).style.cssText = BUTTON;
        button(buttons, `Begin journey ${g.player.cycle + 2}, carrying your strength`, () => (storeCarry(store, carryOf(g)), beginAnew())).style.cssText = BUTTON;
      },
    };
    screen.show(card);
  };
  return {
    show,
    get open() {
      return screen.open;
    },
  };
}
