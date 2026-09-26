/**
 * Hints for a new investigator (playtest round 1): a line at the upper left the first time each
 * thing comes up — moving, where the story leads, a fight, a wound, a failing mind, an Elder Sign, dropped Echoes, the map,
 * a level within reach, a quest, a boss, insight, a grab, a hallucination — then never again (remembered in this browser, not in the save).
 */

import { moveDef } from '../systems/actions';
import type { Game } from '../systems/components';
import { canLevel, LEVEL_IDS } from '../systems/levels';
import { fill } from './glyphs';
import { BONE, el, setStyle, setText } from './hudKit';

const KEY = 'lovecraft-souls-like/hints';
const SHOW_MS = 9000;

const HINTS = {
  move: 'Move with {move} and look with {look}. {dodge} dodges; hold it to run.',
  lead: 'The ◇ on the minimap marks where the story leads. The Journal ({pause}) says what to do there.',
  fight: '{light} strikes ({heavy}: a heavy blow). {block} blocks, and calls off a swing that has not landed; {parry} parries. {lock} locks on.',
  hurt: "{heal} injects West's Reagent and closes wounds. Its doses come back when you rest.",
  mind: '{item} takes a swallow of Laudanum and steadies the mind.',
  sign: 'Rest at an Elder Sign with {interact}. You rise at the last one you rested at, and the creatures you killed come back.',
  echoes: 'You dropped your Echoes where you fell. Reach the spot again to take them back.',
  level: 'You carry Echoes enough for a level (▲). Rest at an Elder Sign to grow stronger, before you fall and drop them.',
  map: '{map} opens the map. Ground you have seen stays drawn on it.',
  quest: 'The pause menu ({pause}) has a Journal with what you have been asked to do.',
  boss: 'Watch the ground: a boss shows where its blows will land. Roll through rings and beams.',
  insight: 'Insight buys strength when you rest at an Elder Sign.',
  grab: 'A crimson flare means a grab: no guard stops it. Roll away ({dodge}).',
  phantom: 'It was never there. At the edge of madness the mind conjures horrors: they vanish when struck, and their blows wound only the mind. Laudanum ({item}) or rest steadies it.',
} as const;
type HintId = keyof typeof HINTS;

export interface Hints {
  update(): void;
}

function load(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(KEY) ?? '[]') as string[]);
  } catch {
    return new Set();
  }
}

export function createHints(g: Game, root: HTMLElement): Hints {
  const box = el(`position:absolute;left:16px;top:16px;max-width:360px;font-size:11px;line-height:1.5;padding:6px 10px;background:#050506b0;border-left:2px solid ${BONE}66;opacity:0;transition:opacity .6s`, '', root);
  const seen = load();
  const queue: HintId[] = [];
  let until = 0;
  const hint = (id: HintId): void => {
    if (!g.overworld || seen.has(id) || queue.includes(id)) return;
    queue.push(id);
  };
  g.events.on('Hit', (e) => {
    if (e.target === g.player.id && e.damage > 0) hint('fight');
    const by = g.ecs.c.actor.get(e.attacker);
    if (e.target === g.player.id && by && moveDef(by)?.hit?.unblockable) hint('grab');
    if (e.target === g.player.id && g.ecs.c.phantom.has(e.attacker)) hint('phantom');
    const h = g.ecs.c.health.get(g.player.id);
    if (e.target === g.player.id && h && h.hp < h.max * 0.6) hint('hurt');
  });
  g.events.on('SanityBandChanged', () => hint('mind'));
  g.events.on('Vanished', (e) => e.struck && hint('phantom'));
  g.events.on('Discovered', () => hint('sign'));
  g.events.on('Echoes', (e) => {
    if (e.change === 'dropped') hint('echoes');
    if ((e.change === 'earned' || e.change === 'recovered') && LEVEL_IDS.some((id) => canLevel(g, id))) hint('level');
  });
  g.events.on('RegionEntered', () => hint('map'));
  g.events.on('QuestChanged', () => hint('quest'));
  g.events.on('BossEngaged', () => hint('boss'));
  g.events.on('InsightChanged', (e) => e.change > 0 && e.cause !== 'load' && hint('insight'));
  hint('move');
  hint('lead');
  return {
    update() {
      const now = performance.now();
      if (now < until) return;
      setStyle(box, 'opacity', '0');
      const next = queue.shift();
      if (!next) return;
      seen.add(next);
      try {
        localStorage.setItem(KEY, JSON.stringify([...seen]));
      } catch {
        // No storage: the hints show again next time.
      }
      setText(box, fill(HINTS[next])); // the buttons of the device in hand
      setStyle(box, 'opacity', '1');
      until = now + SHOW_MS;
    },
  };
}
