/**
 * The Bestiary (round 34), a page of the journal: every creature the investigator has beheld (the
 * first sight of it, kept in the save: `g.mind.seen`), by tier; each opens to its field note
 * (data/bestiaryNotes.ts), how it fights and what hurts it (data/bestiaryFacts.ts), and where it is met.
 * The ones not yet seen are only counted.
 */

import { FIELD_NOTES } from '../data/bestiaryNotes';
import { HABITS, TIER_NAMES, weaknessLine, wherever } from '../data/bestiaryFacts';
import { ENTITIES } from '../data/registry';
import { TIERS, type EntityDef } from '../data/schema';
import type { Game } from '../systems/components';
import { BONE } from './hudKit';
import { button, el, heading, title, type Page } from './menuKit';
import { glyph } from './glyphs';

/** The creatures beheld, in the order of the roster. */
export const beheld = (g: Pick<Game, 'mind'>): EntityDef[] => ENTITIES.filter((e) => g.mind.seen.has(e.id));

function entryPage(e: EntityDef, back: () => void): Page {
  return {
    back,
    build(p) {
      el(p, 'div', e.name.toUpperCase(), `letter-spacing:3px;color:${BONE};margin-bottom:4px`);
      el(p, 'div', `${TIER_NAMES[e.tier].toLowerCase().replace(/^the /, '')} · from “${e.source}”`, 'opacity:.45;font-size:11px;margin-bottom:14px');
      el(p, 'p', FIELD_NOTES[e.id] ?? '', 'font-size:15px;line-height:1.6;margin:0 0 10px');
      el(p, 'p', HABITS[e.behavior.archetype], 'font-size:14px;line-height:1.5;margin:0 0 6px;opacity:.8');
      const weak = weaknessLine(e);
      if (weak) el(p, 'p', weak, 'font-size:14px;line-height:1.5;margin:0 0 6px;opacity:.8');
      el(p, 'p', `Met in: ${wherever(e)}.`, 'font-size:12px;line-height:1.5;margin:8px 0 12px;opacity:.5');
      button(p, 'Back', back);
    },
  };
}

export function bestiaryPage(g: Game, back: () => void, show: (p: Page) => void): Page {
  const page: Page = {
    back,
    build(p) {
      const seen = beheld(g);
      title(p, 'BESTIARY');
      el(p, 'div', `${seen.length} of ${ENTITIES.length} beheld`, 'opacity:.6;margin-bottom:2px');
      if (!seen.length) el(p, 'div', 'Nothing yet. What the investigator sees, the investigator may write down.', 'opacity:.5;line-height:1.5;margin-top:8px');
      for (const tier of TIERS) {
        const list = seen.filter((e) => e.tier === tier);
        if (!list.length) continue;
        heading(p, TIER_NAMES[tier]);
        for (const e of list) button(p, e.name, () => show(entryPage(e, () => show(page))));
      }
      heading(p, '');
      button(p, `Back  (${glyph('back')})`, back);
    },
  };
  return page;
}
