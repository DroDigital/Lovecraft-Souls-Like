/**
 * The journal (playtest round 1), from the pause menu: the quests under way with the line for what
 * is to be done next (before any, who will ask the first: systems/lead.ts), those done, and every tome and note read, each of which opens again to be
 * reread.
 */

import { DOCUMENTS } from '../data/documents';
import { QUESTS } from '../data/quests';
import type { Game } from '../systems/components';
import { mainLead } from '../systems/lead';
import { isDone, stageOf, UNSTARTED } from '../systems/quests';
import { documentPage } from './dialogue';
import { BONE } from './hudKit';
import { button, el, heading, type Page } from './menuKit';

export function journalPage(g: Game, back: () => void, show: (p: Page) => void): Page {
  const page: Page = {
    back,
    build(p) {
      el(p, 'div', 'JOURNAL', 'font-size:18px;letter-spacing:6px;margin-bottom:6px');
      const begun = Object.keys(QUESTS).filter((id) => stageOf(g, id) !== UNSTARTED);
      const open = begun.filter((id) => !isDone(g, id)).sort((a, b) => Number(!!QUESTS[b].main) - Number(!!QUESTS[a].main));
      const done = begun.filter((id) => isDone(g, id));
      heading(p, 'UNDER WAY');
      if (!open.length) el(p, 'div', mainLead(g)?.text ?? 'Nothing yet. Talk to the people you meet.', 'opacity:.6;line-height:1.5');
      for (const id of open) {
        const q = QUESTS[id];
        el(p, 'div', `${q.main ? '◆ ' : ''}${q.title}`, `color:${BONE};margin-top:6px`);
        el(p, 'div', q.stages[stageOf(g, id)].note, 'opacity:.75;line-height:1.5');
      }
      if (done.length) {
        heading(p, 'DONE');
        for (const id of done) el(p, 'div', `${QUESTS[id].title}. ${QUESTS[id].done}`, 'opacity:.45;line-height:1.5;margin-top:4px');
      }
      const read = [...(g.overworld?.read ?? [])].filter((n) => DOCUMENTS[n]);
      heading(p, `DOCUMENTS · ${read.length} of ${Object.keys(DOCUMENTS).length}`);
      for (const name of read) button(p, name, () => show(documentPage(name, () => show(page))));
      heading(p, '');
      button(p, 'Back  (Esc)', back);
    },
  };
  return page;
}
