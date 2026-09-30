/**
 * How strongly the game's jolts land (playtest round 12, the Screen shake setting): the camera's
 * shake when struck (hurtFx.ts) and a figure's at hitstop (actorViews.ts) scale by it. Set each
 * frame from the settings (main.ts). Round 23: and the heart near death, one for the frame, that the
 * sound, the dark red about the picture's edge and the health bar all keep to.
 */

import { HURT } from '../data/tuning';

export const FEEL = { shake: 1 };

/** How near death `share` of full health is: 0 at HURT.low and above (and once fallen), 1 with none to spare. */
export const nearDeath = (share: number): number => (share <= 0 || share >= HURT.low ? 0 : 1 - share / HURT.low);

/** Heartbeats a second at `share` of full health (round 14): none above HURT.low or once fallen, quickening as it falls (round 23: it had two rates). */
export function beatRate(share: number): number {
  const n = nearDeath(share);
  return n > 0 ? HURT.beats[0] + (HURT.beats[1] - HURT.beats[0]) * n : 0;
}

/** How hard the heart strikes `since` seconds into a beat: a stroke, then a softer one HURT.dub later, each fading over HURT.fade. */
export function swellAt(since: number): number {
  const stroke = (t: number, k: number): number => (t < 0 ? 0 : k * Math.min(1, t / 0.03) * Math.exp(-t / HURT.fade));
  return Math.min(1, stroke(since, 1) + stroke(since - HURT.dub, 0.6));
}

export interface Heart {
  need: number; // 0..1: how near death
  swell: number; // 0..1: how hard it strikes now
  beats: number; // beats begun (the sound plays on each)
  /** Moves the heart on to `time` (render seconds) with `share` of full health left. It beats once at once on coming near death. */
  update(time: number, share: number): void;
}

export function createHeart(): Heart {
  let [phase, last] = [1, -1]; // a share of a beat: 1 waits for the first to begin as soon as it is wanted
  const heart: Heart = {
    need: 0,
    swell: 0,
    beats: 0,
    update(time, share) {
      const dt = last < 0 ? 0 : Math.min(0.1, Math.max(0, time - last));
      last = time;
      const rate = beatRate(share);
      heart.need = nearDeath(share);
      if (rate <= 0) return void ([phase, heart.swell] = [1, 0]);
      phase += rate * dt;
      if (phase >= 1) [phase, heart.beats] = [phase - 1, heart.beats + 1];
      heart.swell = swellAt(phase / rate);
    },
  };
  return heart;
}

/** The investigator's heart: read by the sound (audio/gameAudio.ts), the picture's edge (hurtFx.ts) and the health bar (ui/hud.ts). */
export const HEART = createHeart();
