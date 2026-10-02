/**
 * The journal (playtest round 1), from the pause menu: the quests under way with the line for what
 * is to be done next (before any, who will ask the first: systems/lead.ts), those done, every tome and note read, each of which opens again to be
 * reread, and (round 34) the Bestiary: every creature beheld, with its field note (ui/bestiaryPage.ts).
 */

import { DOCUMENTS } from '../data/documents';
import { QUESTS } from '../data/quests';
import type { Game } from '../systems/components';
import { mainLead } from '../systems/lead';
import { isDone, stageOf, UNSTARTED } from '../systems/quests';
import { ENTITIES } from '../data/registry';
import { bestiaryPage, beheld } from './bestiaryPage';
import { documentPage } from './dialogue';
import { BONE } from './hudKit';
import { button, el, footer, heading, tabs, title, type Page } from './menuKit';
import { menuKeys } from './menuKeys';

const TABS = ['Under way', 'Documents', 'Bestiary'];

export function journalPage(g: Game, back: () => void, show: (p: Page) => void, at = 0): Page {
  const page: Page = { back, build() {} };
  const open = (i: number): void => show(journalPage(g, back, show, i));
  page.build = (p) => {
    title(p, 'JOURNAL');
    tabs(p, TABS, at, open, page);
    const body = el(p, 'div', '', 'min-height:230px');
    if (at === 0) {
      const begun = Object.keys(QUESTS).filter((id) => stageOf(g, id) !== UNSTARTED);
      const now = begun.filter((id) => !isDone(g, id)).sort((a, b) => Number(!!QUESTS[b].main) - Number(!!QUESTS[a].main));
      const done = begun.filter((id) => isDone(g, id));
      if (!now.length) el(body, 'div', mainLead(g)?.text ?? 'Nothing yet. Talk to the people you meet.', 'opacity:.65;line-height:1.5;padding:4px 14px');
      for (const id of now) {
        const q = QUESTS[id];
        el(body, 'div', `${q.main ? '◆ ' : ''}${q.title}`, `color:${BONE};margin-top:8px;padding:0 14px`);
        el(body, 'div', q.stages[stageOf(g, id)].note, 'opacity:.7;line-height:1.5;padding:0 14px;font-size:14px');
      }
      if (done.length) {
        heading(body, `DONE · ${done.length}`).style.margin = '18px 14px 4px';
        for (const id of done) el(body, 'div', `${QUESTS[id].title}. ${QUESTS[id].done}`, 'opacity:.4;line-height:1.5;margin:4px 14px 0;font-size:13px');
      }
    } else if (at === 1) {
      const read = [...(g.overworld?.read ?? [])].filter((n) => DOCUMENTS[n]);
      el(body, 'div', `${read.length} of ${Object.keys(DOCUMENTS).length} found and read`, 'opacity:.45;font-size:12px;letter-spacing:2px;padding:0 14px 6px');
      if (!read.length) el(body, 'div', 'Tomes, notes and letters are kept here once read.', 'opacity:.6;padding:0 14px');
      for (const name of read) button(body, name, () => show(documentPage(name, () => show(page))));
    } else {
      el(body, 'div', `${beheld(g).length} of ${ENTITIES.length} beheld`, 'opacity:.45;font-size:12px;letter-spacing:2px;padding:0 14px 6px');
      button(body, 'The creatures beheld', () => show(bestiaryPage(g, () => show(page), show)), true, 'Each creature met: a field note, its habits, its weakness, and where it is found.');
    }
    footer(p, '', menuKeys(true));
  };
  return page;
}
