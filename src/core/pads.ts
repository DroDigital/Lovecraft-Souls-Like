/**
 * The pad in hand (playtest round 13; no pad was heard in the desktop shell): Chromium may list a
 * phantom device first (a virtual pad, a headset's buttons, a wheel's driver), and taking the first
 * connected one read that phantom. The pad chosen is the standard-mapped one used most recently,
 * else any pad used most recently. Round 36: Chromium on macOS lists no pad to the page at all, so the
 * desktop shell reads them natively (SDL2, desktop/padWorker.js) and hands them over its bridge in the
 * Gamepad API's own shape; those are read as the browser's are, the browser's list first.
 */

/** A pad as the Gamepad API gives it, and as the desktop shell's bridge does. */
interface PadLike {
  readonly index: number;
  readonly id: string;
  readonly connected: boolean;
  readonly mapping: string;
  readonly timestamp: number;
  readonly axes: readonly number[];
  readonly buttons: readonly { readonly pressed: boolean; readonly value: number }[];
}
type Source = 'browser' | 'shell';
const STAY_MS = 4000; // a pad used this lately keeps the hand, whichever list is newer: the same pad may be in both

/** What the game reads of a pad: buttons and sticks as the pad reports them, less what it only ever reports at rest. */
export interface PadReading {
  readonly id: string;
  readonly mapping: string;
  readonly axes: readonly number[];
  readonly buttons: readonly { pressed: boolean; value: number }[];
}

/**
 * What is known of each pad seen (round 31: in the desktop shell attacks failed and the investigator
 * walked on alone, and the pad that was wanted was not heard). A pad is not believed until it is used:
 * a button pressed that was not pressed when it was first seen, or a stick moved well off where it
 * lay. Buttons already down when first seen (a trigger that rests at 1, a wheel's pedal) are ignored
 * until let go once, and an axis that lay off centre (a trigger read as a stick) is read from there;
 * none of these can then hold a button down, or push the stick, for ever.
 */
interface Seen {
  rest: number[];
  stuck: Set<number>; // buttons down since first seen, ignored until let go
  armedAt: number; // timestamp of the last real use (0: not yet used)
}
const seen = new Map<string, Seen>();
const PUSH = 0.5; // how far off its rest an axis must be to count as used
let report = '';
let listed = -1; // how many devices the browser lists (-1: it has not been asked)
let blocked = ''; // why it could not be asked
let shellPads = 0; // how many the desktop shell's SDL worker reports
const events: string[] = []; // the pads the browser has said it saw come and go
let shellIds = new Set<string>();
let source: Source | null = null; // the list the pad in hand was last read from
/** The pads the desktop shell reads natively (none on the web, or where its worker could not start). */
function shellList(): PadLike[] {
  try {
    const list = (globalThis as { desktop?: { pads?: () => PadLike[] } }).desktop?.pads?.() ?? [];
    const ids = new Set(list.map((p) => p.id));
    for (const id of ids) if (!shellIds.has(id)) events.push(`connected (shell): ${id}`);
    for (const id of shellIds) if (!ids.has(id)) events.push(`gone (shell): ${id}`);
    shellIds = ids;
    return list.filter((p) => p.connected);
  } catch {
    return [];
  }
}
if (typeof addEventListener === 'function') {
  addEventListener('gamepadconnected', (e) => void events.push(`connected: ${(e as GamepadEvent).gamepad.id} (${(e as GamepadEvent).gamepad.mapping || 'no mapping'})`));
  addEventListener('gamepaddisconnected', (e) => void events.push(`gone: ${(e as GamepadEvent).gamepad.id}`));
}
/** A line for the controls page: what pad is heard, or what to do. */
export const padReport = (): string => report;
/** What the browser itself says of pads, for the controls page (round 33: the desktop shell heard none, and nothing said why). */
export const padFacts = (): string => [blocked ? `the browser refused: ${blocked}` : listed < 0 ? 'not asked yet' : `${listed} device${listed === 1 ? '' : 's'} listed by the browser`, `${shellPads} by the shell's SDL`, ...events.slice(-3)].join(' · ');

function read(p: PadLike, from: Source): { reading: PadReading; used: number } {
  const key = `${from}:${p.index}:${p.id}`;
  let s = seen.get(key);
  if (!s) {
    s = { rest: [...p.axes], stuck: new Set(p.buttons.flatMap((b, i) => (b.pressed || b.value > 0.5 ? [i] : []))), armedAt: 0 };
    seen.set(key, s);
  }
  const axes = p.axes.map((v, i) => {
    if (p.mapping === 'standard' && i < 4 && Math.abs(v) < 0.1) s.rest[i] = 0; // a stick seen at centre rests at centre
    const r = s.rest[i] ?? 0;
    return Math.abs(r) > 0.3 ? (Math.abs(v - r) > 0.2 ? v - r : 0) : v; // an axis that lay off centre is read from where it lay
  });
  const buttons = p.buttons.map((b, i) => {
    const down = b.pressed || b.value > 0.5;
    if (s.stuck.has(i)) {
      if (!down) s.stuck.delete(i);
      return { pressed: false, value: 0 };
    }
    return { pressed: b.pressed, value: b.value };
  });
  const used = buttons.some((b) => b.pressed || b.value > 0.5) || p.axes.some((v, i) => Math.abs(v - (s.rest[i] ?? 0)) > PUSH) ? p.timestamp : 0;
  if (used) s.armedAt = Math.max(s.armedAt, used);
  return { reading: { id: p.id, mapping: p.mapping, axes, buttons }, used: s.armedAt };
}

/** The best of a list's pads: of those used, the standard-mapped one used most recently, else any used most recently. */
type Used = { reading: PadReading; used: number };
function bestOf(list: readonly (PadLike | null)[], from: Source): { best: Used | null; heard: number } {
  let best: Used | null = null;
  let heard = 0;
  for (const p of list) {
    if (!p || !p.connected) continue;
    heard++;
    const r = read(p, from);
    if (!r.used) continue;
    const std = r.reading.mapping === 'standard';
    const bestStd = best?.reading.mapping === 'standard';
    if (!best || (std && !bestStd) || (std === bestStd && r.used > best.used)) best = r;
  }
  return { best, heard };
}

/** The pad in hand: of those used, the standard-mapped one used most recently, else any used most recently; null while none has been touched. */
export function activePad(): PadReading | null {
  let list: (Gamepad | null)[] = [];
  try {
    if (typeof navigator.getGamepads !== 'function') throw new Error('this window has no gamepad interface');
    list = [...navigator.getGamepads()];
    listed = list.filter(Boolean).length;
    blocked = '';
  } catch (e) {
    blocked = e instanceof Error ? e.message : String(e);
    listed = -1;
  }
  const shell = shellList(); // (a page not allowed pads hears none of the browser's, and the shell's still)
  shellPads = shell.length;
  const [web, native] = [bestOf(list, 'browser'), bestOf(shell, 'shell')];
  const [webUsed, nativeUsed] = [web.best, native.best];
  const now = performance.now();
  let best = webUsed ?? nativeUsed;
  if (webUsed && nativeUsed) { // the same pad in both lists: stay with the one in hand (no flipping between two readings of it)
    const stay = source === 'shell' ? nativeUsed : webUsed;
    const other = stay === webUsed ? nativeUsed : webUsed;
    best = now - stay.used < STAY_MS || stay.used >= other.used ? stay : other;
  }
  source = best ? (best === nativeUsed ? 'shell' : 'browser') : null;
  const heard = Math.max(web.heard, native.heard); // (the same pad may be in both lists)
  report = best ? `${best.reading.id}${best.reading.mapping === 'standard' ? '' : ' (not a standard layout: some buttons may differ)'}` : heard ? `${heard} controller${heard > 1 ? 's' : ''} found: press a button on the one to use` : '';
  return best?.reading ?? null;
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
