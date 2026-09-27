/**
 * How strongly the game's jolts land (playtest round 12, the Screen shake setting): the camera's
 * shake when struck (hurtFx.ts) and a figure's at hitstop (actorViews.ts) scale by it. Set each
 * frame from the settings (main.ts).
 */

import { HURT } from '../data/tuning';

export const FEEL = { shake: 1 };

/** Heartbeats a second at `share` of full health (round 14): none above HURT.low or once fallen, faster nearer death. */
export const beatRate = (share: number): number => (share <= 0 || share >= HURT.low ? 0 : share < HURT.low / 2 ? HURT.beats[1] : HURT.beats[0]);
