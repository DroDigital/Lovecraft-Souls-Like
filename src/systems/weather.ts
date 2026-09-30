/**
 * The weather (round 26: the sky did nothing but sit there): over each region that knows any, spells of rain,
 * of a gale, or of the dream's own glowing motes come on, last a few minutes and pass, with clear skies between.
 * It eases in and out over seconds, so a spell is walked into and out of, and is chosen from the game's own
 * random stream (a replay sees the same sky). In rain and gale the investigator's footsteps and blows carry
 * less far (the sound is lost in it: an opening for one who would creep by), drawn by render/weather.ts and
 * heard in render/audio/weatherBed.ts. Pure: no Three.js.
 */

import { SIM, WEATHER } from '../data/tuning';
import type { Game } from './components';

export type WeatherKind = 'clear' | 'rain' | 'gale' | 'motes';

export interface Weather {
  kind: WeatherKind; // what is blowing, or has been and is going
  want: WeatherKind; // what is coming
  amount: number; // 0..1: how much of it there is
  until: number; // the frame the present spell (or the clear between) ends
}

export const newWeather = (): Weather => ({ kind: 'clear', want: 'clear', amount: 0, until: 0 });

const between = (g: Game, [lo, hi]: readonly [number, number]): number => Math.round((lo + (hi - lo) * g.rng()) * SIM.hz);

/** The kinds a region may have, by weight. */
export const kindsOf = (region: string | null): [WeatherKind, number][] =>
  Object.entries((region && WEATHER.regions[region]) || {}).filter(([, w]) => (w ?? 0) > 0) as [WeatherKind, number][];

/** One step: a spell begins or ends when its time is up; the weather eases toward what is wanted, and what is wanted is clear where the region knows none. */
export function weatherSystem(g: Game, dt: number): void {
  const w = g.overworld?.weather;
  if (!w) return;
  const kinds = kindsOf(g.overworld!.region);
  if (w.want !== 'clear' && !kinds.some(([k]) => k === w.want)) w.want = 'clear'; // out of the region that had it
  if (g.frame >= w.until) {
    if (w.want !== 'clear' || !kinds.length) {
      w.want = 'clear';
      w.until = g.frame + between(g, WEATHER.calm);
    } else {
      const total = kinds.reduce((n, [, weight]) => n + weight, 0);
      let roll = g.rng() * total * 1.6; // the rest of the time, clear
      const pick = kinds.find(([, weight]) => (roll -= weight) < 0)?.[0] ?? 'clear';
      w.want = pick;
      w.until = g.frame + (pick === 'clear' ? between(g, WEATHER.calm) : between(g, WEATHER.spell));
    }
  }
  const step = dt / WEATHER.ease;
  if (w.kind === w.want) w.amount = w.kind === 'clear' ? 0 : Math.min(1, w.amount + step);
  else {
    w.amount = Math.max(0, w.amount - step);
    if (w.amount === 0) w.kind = w.want; // the last has gone: the next comes on
  }
}

/** How much of the investigator's noise survives the weather: less in rain and in a gale, at its fullest by WEATHER.quiet. */
export const quietOf = (g: Game): number => {
  const w = g.overworld?.weather;
  return w && (w.kind === 'rain' || w.kind === 'gale') ? 1 - WEATHER.quiet * w.amount : 1;
};
