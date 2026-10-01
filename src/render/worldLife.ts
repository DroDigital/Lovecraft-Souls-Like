/**
 * The open world's own life (playtest round 18: nothing in it moved of itself), drawn over the
 * simulation: its small creatures (fauna.ts), what crosses its sky (skyLife.ts), the lightning where
 * storms roll (lightning.ts), and the glimmer of things worth finding (glints.ts). Made and updated
 * in one place, so the frame loop (main.ts) holds a line for it. Read-only on the simulation.
 */

import type * as THREE from 'three';
import type { Game } from '../systems/components';
import { madnessOf } from '../systems/sanity';
import type { GameAudio } from './audio/gameAudio';
import { createBeacons } from './beacons';
import { SEA } from './sea';
import { createBossFog } from './bossFog';
import { createDoors } from './doorViews';
import { createFauna, type Fauna } from './fauna';
import { createGlints } from './glints';
import { LIGHT_NERVES } from './worldLights';
import { createLightning } from './lightning';
import type { Particles } from './particles';
import { createNightFx } from './nightFx';
import { createOmenFx } from './omenFx';
import { createPresence } from './presence';
import type { PostPass } from './postPass';
import { createSkyLife } from './skyLife';
import { createWatchers } from './watchers';
import { createTentacles } from './tentacles';
import { createWeatherFx } from './weather';
import type { Skyline } from './skyline';
import type { SpriteAtlas } from './sprites/atlas';

export interface WorldLife {
  /** Each drawn frame, once the night's light is set; `enclosed`: under a dungeon's roof. */
  update(camera: THREE.Camera, time: number, enclosed: boolean): void;
  readonly fauna: Fauna;
}

export interface LifeParts {
  sky: THREE.Mesh; // the sky dome, whose haze the lightning brightens
  post: PostPass; // the post pass, whose mist it lights
  sheet: { atlas: SpriteAtlas; texture: THREE.Texture }; // the creatures' sprites, for the great winged things
  skyline: Skyline; // the far silhouettes, given a false one by a failing mind (round 26)
  particles: Particles; // dust and grit (round 26: what a colossus throws up)
}

/** How hard the wind drives the sea: R'lyeh's lies restless, a gale and rain raise any. */
export function seaChop(g: Game): number {
  const wx = g.overworld?.weather;
  const wind = wx ? (wx.kind === 'gale' ? 0.9 : wx.kind === 'rain' ? 0.3 : 0) * wx.amount : 0;
  return (g.overworld?.region === 'rlyeh' ? 1.5 : g.overworld?.region === 'innsmouth' ? 1.15 : 1) * (1 + wind);
}

export function createWorldLife(scene: THREE.Scene, g: Game, audio: GameAudio, parts: LifeParts): WorldLife {
  const fauna = createFauna(scene, g, (voice, at) => audio.cry(voice, at));
  const sky = createSkyLife(scene, g, fauna, parts.sheet, (voice, at) => audio.cry(voice, at, 1.4));
  const lightning = createLightning(parts.sky, parts.post, (gain) => audio.far('thunder', gain));
  const glints = createGlints(scene, g);
  const watchers = createWatchers(scene, g);
  const omens = createOmenFx(g, parts.sky, parts.post, audio);
  const presence = createPresence(g, parts.particles, audio); // round 26: what a colossus does to the ground and the air
  const beacons = createBeacons(scene, g); // round 26: pale columns over the Elder Signs not yet found
  const night = createNightFx(g, parts.sky, parts.post); // round 26: the moon's course, and the grey of the last hour
  const weather = createWeatherFx(scene, g, parts.particles); // round 26: rain, gale and motes
  const deep = createTentacles(scene, g, parts.particles, audio); // round 30: now and then, far out, a tentacle in the water
  const doors = createDoors(scene, g, audio); // round 27: a door in each doorway that has one
  const fog = createBossFog(scene, g, parts.particles, audio); // round 27: a wall of mist before each horror
  return {
    fauna,
    update(camera, time, enclosed) {
      const outside = !enclosed && !!g.overworld;
      fauna.update(camera, time, !outside);
      sky.update(camera, time, !outside);
      lightning.update(time, g.overworld?.region ?? null, !outside);
      beacons.update(camera, time, !outside);
      night.update(time);
      LIGHT_NERVES.madness = madnessOf(g.mind.sanity); // the flames waver harder in a failing mind's world
      weather.update(camera, time, !outside);
      deep.update(camera, time, !outside);
      SEA.chop.value += (seaChop(g) - SEA.chop.value) * 0.02; // the wind raises the sea, slowly (round 30)
      fog.update(camera, time, !g.overworld);
      doors.update(camera, time, !g.overworld);
      glints.update(camera.position, time, !g.overworld);
      presence.update(camera, time);
      omens.update(time);
      parts.skyline.wrong(Math.min(1, Math.max(0, 1 - g.mind.sanity / 100)));
      watchers.update(camera, time, !outside, () => audio.sample('whisper', { gain: 0.5, pitch: 0.8 })); // round 26: what a failing mind makes of the dark
    },
  };
}
