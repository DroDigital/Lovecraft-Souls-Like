/**
 * The pad in hand (playtest round 13; no pad was heard in the desktop shell): Chromium may list a
 * phantom device first (a virtual pad, a headset's buttons, a wheel's driver), and taking the first
 * connected one read that phantom. The pad chosen is the standard-mapped one used most recently,
 * else any pad used most recently.
 */

export function activePad(): Gamepad | null {
  let list: (Gamepad | null)[] = [];
  try {
    list = [...(navigator.getGamepads?.() ?? [])];
  } catch {
    return null; // a page not allowed pads (a permissions policy) hears none
  }
  let best: Gamepad | null = null;
  for (const p of list) {
    if (!p || !p.connected) continue;
    const std = p.mapping === 'standard';
    const bestStd = best?.mapping === 'standard';
    if (!best || (std && !bestStd) || (std === bestStd && p.timestamp > best.timestamp)) best = p;
  }
  return best;
}

let resync = false;
/** Buttons held now are not heard by the game until they are let go (a menu closed by the pad's B, or chosen with A). */
export const muteHeldPad = (): void => void (resync = true);
/** Taken once by the game's input: whether it must mute the buttons held now. */
export function takeResync(): boolean {
  const r = resync;
  resync = false;
  return r;
}
