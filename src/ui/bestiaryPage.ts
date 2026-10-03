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
import { button, el, footer, heading, title, type Page } from './menuKit';
import { glyph } from './glyphs';
import { menuKeys } from './menuKeys';

/** The creatures beheld, in the order of the roster. */
export const beheld = (g: Pick<Game, 'mind'>): EntityDef[] => ENTITIES.filter((e) => g.mind.seen.has(e.id));

function entryPage(e: EntityDef, back: () => void): Page {
  return {
    back,
    build(p) {
      title(p, e.name.toUpperCase());
      el(p, 'div', `${TIER_NAMES[e.tier].toLowerCase().replace(/^the /, '')} · from “${e.source}”`, 'opacity:.45;font-size:11px;letter-spacing:2px;text-align:center;margin:-6px 0 12px');
      el(p, 'p', FIELD_NOTES[e.id] ?? '', 'font-size:15px;line-height:1.6;margin:0 0 10px');
      el(p, 'p', HABITS[e.behavior.archetype], 'font-size:14px;line-height:1.5;margin:0 0 6px;opacity:.8');
      const weak = weaknessLine(e);
      if (weak) el(p, 'p', weak, 'font-size:14px;line-height:1.5;margin:0 0 6px;opacity:.8');
      el(p, 'p', `Met in: ${wherever(e)}.`, 'font-size:12px;line-height:1.5;margin:8px 0 4px;opacity:.5');
      footer(p, '', [[glyph('back'), 'Back']], back);
    },
  };
}

export function bestiaryPage(g: Game, back: () => void, show: (p: Page) => void): Page {
  const page: Page = {
    back,
    build(p) {
      const seen = beheld(g);
      title(p, 'BESTIARY');
      el(p, 'div', `${seen.length} of ${ENTITIES.length} beheld`, 'opacity:.5;font-size:12px;letter-spacing:2px;padding:0 14px 4px');
      if (!seen.length) el(p, 'div', 'Nothing yet. What the investigator sees, the investigator may write down.', 'opacity:.5;line-height:1.5;padding:0 14px');
      for (const tier of TIERS) {
        const list = seen.filter((e) => e.tier === tier);
        if (!list.length) continue;
        heading(p, `${TIER_NAMES[tier]} · ${list.length}`).style.margin = '12px 14px 4px';
        for (const e of list) button(p, e.name, () => show(entryPage(e, () => show(page))));
      }
      footer(p, '', menuKeys(), back);
    },
  };
  return page;
}
