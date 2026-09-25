/**
 * Talking and reading (playtest round 1): what someone says, a line at a time in a box at the
 * bottom of the screen, and the text of a tome or note as it is picked up, on a page of its own.
 * The world stands still while either is open (main.ts). E, Enter or Space (pad A) goes on; Esc
 * (pad B) closes.
 */

import { DOCUMENTS } from '../data/documents';
import type { Game } from '../systems/components';
import { BONE } from './hudKit';
import { button, createScreen, el, type Page } from './menuKit';

export interface Dialogue {
  readonly open: boolean;
}

const ADVANCE = new Set(['KeyE']); // Enter and Space press the focused button already

export function createDialogue(g: Game): Dialogue {
  const talk = createScreen(8, 'transparent', 'left:50%;bottom:7%;transform:translateX(-50%);width:min(680px,92vw);padding:14px 18px;background:#0b0b0de8;border:1px solid #d9d0b833');
  const read = createScreen(8, '#050506cc', 'left:50%;top:50%;transform:translate(-50%,-50%);width:min(520px,92vw);max-height:84vh;overflow:auto;padding:22px 26px;background:#0e0d0c;border:1px solid #d9d0b833');

  g.events.on('Talked', ({ name, title, lines }) => {
    let i = 0;
    const page: Page = {
      back: () => talk.close(),
      keys: (e) => void (ADVANCE.has(e.code) && !e.repeat && next()),
      build(p) {
        el(p, 'div', name.toUpperCase(), `letter-spacing:3px;color:${BONE}`);
        el(p, 'div', title, 'opacity:.5;font-size:11px;margin-bottom:8px');
        el(p, 'div', lines[i], 'font-size:13px;line-height:1.55;min-height:3.1em');
        const last = i >= lines.length - 1;
        const row = el(p, 'div', '', 'display:flex;justify-content:space-between;align-items:center;margin-top:6px');
        el(row, 'div', `${i + 1} / ${lines.length}`, 'opacity:.35;font-size:10px');
        button(row, last ? 'E · Leave' : 'E · Go on', next).style.cssText = 'width:auto;display:inline-block';
      },
    };
    const next = (): void => {
      if (++i >= lines.length) talk.close();
      else talk.show(page);
    };
    talk.show(page);
  });

  g.events.on('Read', ({ name }) => {
    const doc = DOCUMENTS[name];
    if (!doc) return;
    read.show(documentPage(name, () => read.close(), 'E · Put it away'));
  });

  return {
    get open() {
      return talk.open || read.open;
    },
  };
}

/** A tome's or note's text on a page; `back` closes it. */
export function documentPage(name: string, back: () => void, label = 'Back'): Page {
  const doc = DOCUMENTS[name];
  return {
    back,
    keys: (e) => void (ADVANCE.has(e.code) && !e.repeat && back()),
    build(p) {
      el(p, 'div', name.toUpperCase(), `letter-spacing:3px;color:${BONE};margin-bottom:4px`);
      el(p, 'div', doc?.kind === 'tome' ? 'a tome' : 'a note', 'opacity:.45;font-size:11px;margin-bottom:14px');
      for (const para of doc?.text ?? []) el(p, 'p', para, 'font-size:13px;line-height:1.6;margin:0 0 10px');
      button(p, label, back);
    },
  };
}
