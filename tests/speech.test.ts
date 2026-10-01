// The voices: every line a person or a horror says is performed in words that match the words shown,
// has a cast voice, and a recording; the names of the recordings are stable.
import { describe, expect, it } from 'vitest';
import { getEntity } from '../src/data/registry';
import { CREDITS } from '../src/data/credits';
import { NPCS } from '../src/data/npcs';
import { clipOf, plain, shown, wordsOf } from '../src/data/speech';
import { BOSS_SAY } from '../src/data/speechBosses';
import { CAST } from '../src/data/speechCast';
import { FAR_SAID } from '../src/data/speechFar';
import { bossLines, npcLines, performed, speechLines } from '../src/data/speechLines';
import { NPC_SAID } from '../src/data/speechNpcs';

describe('a line as it is shown and as it is performed', () => {
  it('has its tags out of the words, and its marks and capitals out of the name', () => {
    const say = "[weary] You came in through the reading room, didn't you? [sighs] Armitage sent you.";
    expect(plain(say)).toBe("You came in through the reading room, didn't you? Armitage sent you.");
    expect(wordsOf(say)).toBe(wordsOf("You came in through the reading room... didn't you?  ARMITAGE sent you."));
    expect(plain('[a] [b] stacked   tags')).toBe('stacked tags');
    expect(wordsOf('Pánfilo de Zamacona, y Nuñez')).toBe('pánfilodezamaconaynuñez'); // letters of any script count
  });

  it('shows a leaned-on word in lower case again, but keeps a sentence\'s first capital', () => {
    expect(shown("[menacing] I'll HAVE it. [pause] The hills are WAITING.")).toBe("I'll have it. The hills are waiting.");
    expect(shown('[screaming] HELP! [sobbing] Father! [pause] FATHER! Yog-Sothoth!')).toBe('Help! Father! Father! Yog-Sothoth!');
    expect(shown("[smoothly] Iä! Shub-Niggurath! I am THE gate.")).toBe('Iä! Shub-Niggurath! I am the gate.');
    expect(clipOf('boss:x', '[a] I HAVE it')).toBe(clipOf('boss:x', 'i have IT'));
  });

  it('is named by who says it and what, and a changed word changes the name', () => {
    const a = clipOf('npc:peaslee', 'Go on. I will be here.');
    expect(a).toMatch(/^npc-peaslee-[0-9a-z]+$/);
    expect(clipOf('npc:peaslee', 'go on -- I WILL be here!')).toBe(a);
    expect(clipOf('npc:peaslee', 'Go on. I shall be here.')).not.toBe(a);
    expect(clipOf('npc:gilman', 'Go on. I will be here.')).not.toBe(a);
  });
});

describe('the people of the realms', () => {
  it('say every line of every topic, each performed in exactly its own words', () => {
    for (const n of NPCS) {
      for (const t of n.topics) {
        for (const line of t.lines) {
          const found = [...(NPC_SAID[n.id] ?? []), ...(FAR_SAID[n.id] ?? [])].filter((s) => wordsOf(s) === wordsOf(line));
          expect(found.length, `${n.id}: ${line}`).toBe(1);
        }
      }
    }
  });

  it('are performed in no line that is not said: nothing left over when the words are changed', () => {
    for (const [id, list] of Object.entries({ ...NPC_SAID, ...FAR_SAID })) {
      const n = NPCS.find((x) => x.id === id);
      expect(n, `no one is called ${id}`).toBeDefined();
      const lines = new Set(n!.topics.flatMap((t) => t.lines.map(wordsOf)));
      for (const s of list) expect(lines.has(wordsOf(s)), `${id}: ${plain(s)}`).toBe(true);
      expect(list.length, id).toBe(lines.size);
    }
    expect(npcLines().every((l) => performed(l.speaker.slice(4), l.text) !== undefined)).toBe(true);
  });
});

describe('the horrors that speak', () => {
  it('are in the roster, speak once as they arrive or as they fall or both, and keep it short enough to be heard over a scene', () => {
    for (const [id, words] of Object.entries(BOSS_SAY)) {
      expect(getEntity(id), `no horror is called ${id}`).toBeDefined();
      expect(words.arrive ?? words.fall, id).toBeDefined();
      for (const say of [words.arrive, words.fall]) if (say) expect(shown(say).length, `${id}: ${shown(say)}`).toBeLessThanOrEqual(135);
    }
    expect(Object.keys(BOSS_SAY).length).toBeGreaterThanOrEqual(25);
    expect(bossLines().length).toBeGreaterThan(50);
  });
});

describe('every line, whoever says it', () => {
  const lines = speechLines();

  it('has tags that are plain words in brackets, not many, placed before words', () => {
    for (const l of lines) {
      const tags = l.say.match(/\[[^\]]*\]/g) ?? [];
      expect(tags.length, l.say).toBeGreaterThan(0);
      expect(tags.length, l.say).toBeLessThanOrEqual(10);
      for (const t of tags) expect(t, l.say).toMatch(/^\[[a-z][a-z ']*[a-z]\]$/); // no hyphens, commas or digits: v4 reads them as words
      expect(l.say, 'a tag sits before words, never against a mark').not.toMatch(/\[[^\]]*\][.,;:!?…]/);
      expect(l.say.length, l.say).toBeLessThanOrEqual(520);
    }
  });

  it('has a voice for its speaker, and no voice is cast that nobody uses', () => {
    const speakers = new Set(lines.map((l) => l.speaker));
    for (const s of speakers) expect(CAST[s], s).toBeDefined();
    for (const s of Object.keys(CAST)) expect(speakers.has(s), `${s} is cast and says nothing`).toBe(true);
    for (const [s, v] of Object.entries(CAST)) {
      expect(v.voice, s).toMatch(/^[A-Za-z0-9]{20}$/);
      expect(v.rate ?? 1, s).toBeGreaterThanOrEqual(0.6);
      expect(v.rate ?? 1, s).toBeLessThanOrEqual(1.3);
      expect(v.echo ?? 0, s).toBeGreaterThanOrEqual(0);
      expect(v.echo ?? 0, s).toBeLessThanOrEqual(1);
    }
  });

  it('are named apart: no two lines with different words share a name', () => {
    const byName = new Map<string, string>();
    for (const l of lines) {
      const name = clipOf(l.speaker, l.text);
      const words = `${l.speaker}|${wordsOf(l.text)}`;
      expect(byName.get(name) ?? words, name).toBe(words);
      byName.set(name, words);
    }
  });

  it('are said in the credits to be synthetic, and whose', () => {
    const voices = CREDITS.find((b) => b.heading === 'VOICES')!.lines.join(' ');
    expect(voices).toMatch(/synthetic/);
    expect(voices).toMatch(/ElevenLabs/);
  });
});
