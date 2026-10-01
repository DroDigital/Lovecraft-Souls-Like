// The voices in a horror's scenes: its line is laid over its arrival and its fall, said at a beat with
// its words low on the screen, and the scene is held on long enough for it.
import { describe, expect, it } from 'vitest';
import { arrival, fall, type Scale } from '../src/data/cutscenes';
import { BOSS_SAY } from '../src/data/speechBosses';
import { bossLine, spokenFor, type Moment } from '../src/data/speechLines';
import { sceneLength } from '../src/render/cinemaPlan';
import { speaking } from '../src/render/cinemaDirector';

const SCALES: Scale[] = ['person', 'large', 'giant', 'colossal'];
const plainScene = (moment: Moment, scale: Scale) => (moment === 'arrive' ? arrival(scale, 'A Horror', 'That Speaks') : fall(scale));

describe('a horror that speaks, in its scenes', () => {
  it('says its line at a beat, with the same words low on the screen', () => {
    for (const [id, words] of Object.entries(BOSS_SAY)) {
      for (const moment of ['arrive', 'fall'] as const) {
        const line = bossLine(id, moment);
        expect(line !== undefined, `${id} ${moment}`).toBe(words[moment] !== undefined);
        if (!line) continue;
        for (const scale of SCALES) {
          const scene = speaking(plainScene(moment, scale), id, moment);
          const beat = scene.beats.find((b) => b.voice);
          expect(beat?.voice, `${id} ${moment} ${scale}`).toEqual({ by: `boss:${id}`, text: line.text });
          expect(beat?.caption).toBe(line.text);
          expect(scene.beats.filter((b) => b.voice).length).toBe(1);
        }
      }
    }
  });

  it('holds its last shot until the line has been said, and never shortens a scene', () => {
    for (const id of Object.keys(BOSS_SAY)) {
      for (const moment of ['arrive', 'fall'] as const) {
        const line = bossLine(id, moment);
        if (!line) continue;
        for (const scale of SCALES) {
          const before = plainScene(moment, scale);
          const scene = speaking(before, id, moment);
          const beat = scene.beats.find((b) => b.voice)!;
          expect(sceneLength(scene), `${id} ${moment} ${scale}`).toBeGreaterThanOrEqual(sceneLength(before));
          expect(sceneLength(scene)).toBeGreaterThanOrEqual(beat.at + spokenFor(line.speaker, line.text));
          expect(beat.hold ?? 0).toBeGreaterThanOrEqual(1.2);
          expect(scene.shots.length).toBe(before.shots.length);
          expect(scene.shots.slice(0, -1)).toEqual(before.shots.slice(0, -1)); // only the last shot is held on
        }
      }
    }
  });

  it('leaves a scene as it is for a horror with nothing to say, or no such moment', () => {
    const scene = arrival('large', 'Mute', undefined);
    expect(speaking(scene, 'shoggoth', 'arrive')).toBe(scene);
    expect(speaking(scene, undefined, 'arrive')).toBe(scene);
    const only = fall('giant');
    expect(speaking(only, 'dunwich_horror', 'arrive')).toBe(only); // it has only its last words
    expect(speaking(only, 'dunwich_horror', 'fall')).not.toBe(only);
  });

  it('takes longer to say a line in a lowered voice, and longer for more words', () => {
    expect(spokenFor('boss:dunwich_horror', 'Father. Father!')).toBeGreaterThan(spokenFor('boss:wilbur_whateley', 'Father. Father!'));
    expect(spokenFor('npc:peaslee', 'A longer line, with more to say in it than the short one.')).toBeGreaterThan(spokenFor('npc:peaslee', 'Short.'));
    expect(spokenFor('nobody', 'A line for a stranger')).toBeGreaterThan(0);
  });
});
