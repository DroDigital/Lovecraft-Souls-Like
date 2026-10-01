/**
 * Which scene plays when (playtest round 20): a horror's arrival, the first time it turns on the
 * investigator (remembered in the save: it is not shown again after a death); its fall, slowed; the
 * wake of a new game; an ending's, and then its card. Nothing plays in the arena test or while
 * another scene has the screen, except an ending, which waits its turn. Its size, from its body,
 * chooses how the camera treats it (data/cutscenes.ts). A horror that speaks
 * (data/speechBosses.ts) says its line as it arrives and its last as it falls, the words low on the
 * screen, the last shot held until it is said; one with no scene says its last line as it falls, as a notice.
 */

import type { Entity } from '../core/ecs';
import { yawOf } from '../core/geom';
import { EPITHETS } from '../data/bossCards';
import { arrival, ENDING_SCENES, fall, scaleOf, WAKE, type Scene } from '../data/cutscenes';
import { bossLine, spokenFor, type Moment } from '../data/speechLines';
import { signPlace } from '../systems/checkpoints';
import type { Game } from '../systems/components';
import type { Cinema } from './cinema';
import { sceneLength } from './cinemaPlan';

const BEGINS = { arrive: 0.9, fall: 0.6 }; // seconds into a horror's scene that it begins to speak (the bars are in by then)
const LINGER = 0.5; // seconds the scene holds on once the line is said
const FADE_IN = 0.7; // seconds a caption takes to come up; it is held from then

/** A new game's investigator begins on one knee before the Elder Sign they wake at, the camera behind them; the wake's beat lets them rise. */
export function wakeKneeling(g: Game): void {
  const s = g.overworld && signPlace(g.overworld.sign);
  const t = g.ecs.c.transform.get(g.player.id);
  if (!s || !t) return;
  const yaw = yawOf(s.x - t.pos.x, s.z - t.pos.z);
  t.yaw = t.prevYaw = yaw;
  Object.assign(g.camera, { yaw, prevYaw: yaw });
  g.player.kneeling = { x: s.x, z: s.z };
}

/** `scene` with the horror's line laid over it, if it says one: its recording, its words low on the screen, and the last shot held on until they are said. */
export function speaking(scene: Scene, id: string | undefined, moment: Moment): Scene {
  const line = id ? bossLine(id, moment) : undefined;
  if (!line) return scene;
  const at = BEGINS[moment];
  const said = spokenFor(line.speaker, line.text);
  const short = at + said + LINGER - sceneLength(scene);
  const last = scene.shots[scene.shots.length - 1];
  return {
    ...scene,
    shots: short > 0 ? [...scene.shots.slice(0, -1), { ...last, dur: last.dur + short }] : scene.shots,
    beats: [...scene.beats, { at, caption: line.text, hold: Math.max(1.2, said - FADE_IN), voice: { by: line.speaker, text: line.text } }],
  };
}

export interface Director {
  /** A new game's wake, as the veil lifts on it. */
  wake(): void;
}

export function createDirector(g: Game, cinema: Cinema, opens: (endingId: string) => void): Director {
  const memory = new Set<string>(); // the arrivals shown, where no save keeps them (the arena)
  const height = (e: Entity): number => g.ecs.c.body.get(e)?.height ?? 2;
  const alive = (): boolean => g.ecs.c.actor.get(g.player.id)?.move !== 'death';
  /** Whether a scene is worth playing about this horror: one seen and heard, that stands as itself in the fight. */
  const worth = (e: Entity): boolean => {
    const f = g.ecs.c.fight.get(e);
    return !!f && !f.script.unseen && !f.script.joins && !g.ecs.c.unseen.has(e) && alive();
  };

  g.events.on('BossEngaged', ({ entity, name }) => {
    const f = g.ecs.c.fight.get(entity);
    const seen = g.overworld?.watched ?? memory;
    if (!f || !worth(entity) || seen.has(f.id) || cinema.active) return;
    seen.add(f.id);
    void cinema.play(speaking(arrival(scaleOf(height(entity)), name, EPITHETS[f.id]), f.id, 'arrive'), { target: entity });
  });
  g.events.on('Vanquished', ({ entity }) => {
    const id = g.ecs.c.fight.get(entity)?.id;
    const last = id ? bossLine(id, 'fall') : undefined; // its last words, if it has any
    if (cinema.active) return;
    if (worth(entity)) return void cinema.play(speaking(fall(scaleOf(height(entity))), id, 'fall'), { target: entity });
    if (!last || !alive()) return;
    g.events.emit('Said', { speaker: last.speaker, text: last.text }); // no scene to lay it over: it is heard, and its words shown as a notice
    g.events.emit('Notice', { text: last.text.toUpperCase() });
  });
  g.events.on('Ending', ({ id }) => {
    const scene = ENDING_SCENES[id];
    void (scene ? cinema.play(scene) : Promise.resolve()).then(() => opens(id));
  });

  return { wake: () => void cinema.play(WAKE) };
}
