/**
 * Hints for a new investigator (playtest round 1): a line at the upper left the first time each
 * thing comes up — moving, where the story leads, a fight, a wound, a failing mind, an Elder Sign, dropped Echoes, the map,
 * a level within reach, a quest, a boss (and what each asks besides striking: blind Azathoth, Cthulhu's ship, the Dunwich Horror's powder, Ghatanothoa's stone, Shub-Niggurath's roots, Yog-Sothoth's spheres, a colossus's stoop; round 25), insight, a flask of oil bought, a grab, a hallucination — then never again (remembered in this browser, not in the save).
 * Round 14: a journey taken up again from a save first says where the story had led (the lead's line).
 */

import type { Entity } from '../core/ecs';
import { moveDef } from '../systems/actions';
import type { Game } from '../systems/components';
import { zonesOf } from '../systems/hurt';
import { mainLead } from '../systems/lead';
import { canLevel, LEVEL_IDS } from '../systems/levels';
import { fill } from './glyphs';
import { BONE, el, setStyle, setText } from './hudKit';
import { HINTS_KEY as KEY } from './loreLine';

const SHOW_MS = 9000;

const HINTS = {
  move: 'Move with {move} and look with {look}. {dodge} dodges; hold it to run.',
  lead: 'The ◇ on the minimap marks where the story leads. The Journal ({pause}) says what to do there.',
  fight: '{light} strikes ({heavy}: a heavy blow). {block} blocks, and calls off a swing that has not landed; {parry} parries. {lock} locks on.',
  hurt: "{heal} injects West's Reagent and closes wounds. Its doses come back when you rest.",
  mind: '{item} takes a swallow of Laudanum and steadies the mind. Away from a fight it mends by itself (▲), faster by lamplight and firelight (▲▲); the Elder Signs, Echoes and your own lantern do not count.',
  sign: 'Rest at an Elder Sign with {interact}. You rise at the last one you rested at, and the creatures you killed come back.',
  echoes: 'You dropped your Echoes where you fell. Reach the spot again to take them back.',
  level: 'You carry Echoes enough for a level (▲). Rest at an Elder Sign to grow stronger, before you fall and drop them.',
  map: '{map} opens the map. Ground you have seen stays drawn on it.',
  quest: 'The pause menu ({pause}) has a Journal with what you have been asked to do.',
  boss: 'Watch the ground: a boss shows where its blows will land. Roll through rings and beams.',
  stoop: 'A colossus stoops after each blow of its own: its head comes down within reach, and a strike there hurts it several times over. Stand before its face. The revolver ({shoot}) aims for a head it can reach.',
  ship: "No blade finishes Cthulhu. Wound it until the Alert comes, then take her helm ({interact}) and drive her at it.",
  powder: "The Dunwich Horror cannot be seen. Near it, {interact} scatters the Powder of Ibn Ghazi, three doses, and shows it for a while. At the last no blade finishes it: chant the incantation ({interact}) near it.",
  cover: "Ghatanothoa's gaze turns flesh to stone: four seconds in its sight and you are lost, the colour draining and the picture cracking as it takes hold. Stand behind a monolith and it wears off.",
  roots: 'While the spawning roots stand, Shub-Niggurath takes only a fifth of each blow, and they bring forth its young. Cut the roots down.',
  spheres: 'The iridescent spheres are gates: touch one and you come out of the next, and now and then the whole arena leaps. Yog-Sothoth is struck where its own spheres rest.',
  blind: 'Azathoth cannot see you, and nothing you strike it with matters. It hears: running, rolling, swinging and shots carry far, walking less, and walking with {block} held or standing still not at all. Outlast the piping.',
  insight: 'Insight buys strength when you rest at an Elder Sign.',
  gun: '{shoot} fires the revolver: six rounds, and the spare ones you carry. {reload} loads it. It strikes hard up close and little from afar, and misses small things at range. Rounds lie in boxes about the dream and are sold by merchants.',
  oil: '{throw} throws a flask of lamp oil; it bursts and burns where it lands. Lock on first to throw it at a foe.',
  grab: 'A crimson flare means a grab: no guard stops it. Roll away ({dodge}).',
  unmoored: 'Unmoored: you strike weaker and are struck harder, your breath comes back slower, and the body wears away a little. Laudanum ({item}), a lamp or a fire, or rest brings the mind back.',
  phantom: 'It was never there. At the edge of madness the mind conjures horrors: they vanish when struck, and their blows wound only the mind. Laudanum ({item}) or rest steadies it.',
} as const;
type HintId = keyof typeof HINTS;

/** What a boss asks of the investigator besides striking (round 25: only Azathoth's was said before the fight). */
const BOSS_HINTS: Readonly<Record<string, HintId>> = { azathoth: 'blind', cthulhu: 'ship', dunwich_horror: 'powder', ghatanothoa: 'cover', shub_niggurath: 'roots', yog_sothoth: 'spheres' };

/** The hints that belong to a boss that has just been engaged: its own mechanic's, and the colossi's stooping. */
export function bossHints(g: Game, boss: Entity): HintId[] {
  const own = BOSS_HINTS[g.ecs.c.fight.get(boss)?.id ?? ''];
  return [...(own ? [own] : []), ...(zonesOf(g, boss)?.some((z) => z.weak) ? (['stoop'] as const) : [])];
}

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
  g.events.on('Shot', (e) => e.shooter === g.player.id && hint('gun'));
  g.events.on('DryFire', () => hint('gun'));
  g.events.on('SanityBandChanged', (e) => (hint('mind'), e.to === 'unmoored' && hint('unmoored')));
  g.events.on('Vanished', (e) => e.struck && hint('phantom'));
  g.events.on('Discovered', () => hint('sign'));
  g.events.on('Echoes', (e) => {
    if (e.change === 'dropped') hint('echoes');
    if (e.change === 'spent' && g.player.oil > 0) hint('oil');
    if ((e.change === 'earned' || e.change === 'recovered') && LEVEL_IDS.some((id) => canLevel(g, id))) hint('level');
  });
  g.events.on('RegionEntered', () => hint('map'));
  g.events.on('QuestChanged', () => hint('quest'));
  g.events.on('BossEngaged', (e) => {
    hint('boss');
    for (const id of bossHints(g, e.entity)) hint(id);
  });
  g.events.on('InsightChanged', (e) => e.change > 0 && e.cause !== 'load' && hint('insight'));
  hint('move');
  hint('lead');
  let recap = g.overworld && g.overworld.quests.size > 0 ? mainLead(g)?.text : undefined; // a journey taken up again
  return {
    update() {
      const now = performance.now();
      if (now < until) return;
      setStyle(box, 'opacity', '0');
      if (recap && g.frame > 30) { // once the veil has lifted and the world moves
        setText(box, `Where you left off: ${recap}`);
        [recap, until] = [undefined, now + SHOW_MS];
        return setStyle(box, 'opacity', '1');
      }
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
