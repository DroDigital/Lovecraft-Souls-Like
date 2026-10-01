/**
 * What the people and the horrors say aloud (the voices, recorded with ElevenLabs' Eleven v4): a
 * line is a speaker (`npc:<id>` for someone met at an Elder Sign, `boss:<roster id>` for a horror),
 * the words shown, and how they are performed: the same words with [audio tags] for the voice and
 * now and then a capital or a pause. A recording is `public/voice/<clip>.mp3`, named by `clipOf`;
 * `public/voice/index.json` says which exist. A line without one is shown and not heard. The words
 * are kept by data/speechLines.ts and tests/speech.test.ts. Pure: no DOM, no Three.js.
 */

/** An audio tag and the space after it: "[whispers] ". */
const TAG = /\[[^\]]*\]\s*/g;

export interface Line {
  speaker: string;
  text: string; // the words, as shown
  say: string; // the words, as performed: [tags], and marks of delivery
}

/** The words of a line and nothing else: lower case, no tags, no marks, no spaces. */
export const wordsOf = (s: string): string => s.replace(TAG, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');

/** A performed line as it is shown: its tags out. */
export const plain = (say: string): string => say.replace(TAG, '').replace(/\s+/g, ' ').trim();

/** FNV-1a over a string's UTF-16 units, in base 36. */
/** What is shown of a performed line: its tags out, and a word set in capitals for emphasis let down again (a sentence's first keeps its capital). */
export const shown = (say: string): string =>
  plain(say).replace(/\p{Lu}{2,}/gu, (w: string, at: number, all: string) => {
    const low = w.toLowerCase();
    return at === 0 || /[.!?…]["')\]]*\s$/.test(all.slice(0, at)) ? low[0].toUpperCase() + low.slice(1) : low;
  });

function hash(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193) >>> 0;
  return h.toString(36);
}

/**
 * A line's recording: who says it and a hash of its words. A line changed in a mark or a capital
 * keeps its recording; one changed in a word has none until it is made again.
 */
export const clipOf = (speaker: string, text: string): string => `${speaker.replace(':', '-')}-${hash(wordsOf(text))}`;

/** The folder the recordings are served from (public/voice), beside the page. */
export const VOICE_BASE = 'voice/';
