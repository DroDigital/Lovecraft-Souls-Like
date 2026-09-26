/**
 * The keyboard's layout (playtest round 12): every key the investigator acts with can be rebound
 * from the Controls page and is kept apart from the save. The mouse keeps its buttons (strikes,
 * guard, lock-on); Esc, the arrows and Enter stay fixed so the menus can always be reached. A key
 * given to one action is taken from any other that had it, which gets the first one's old key.
 */

export const ACTIONS = ['forward', 'back', 'left', 'right', 'dodge', 'shoot', 'lock', 'heal', 'item', 'interact', 'map'] as const;
export type Action = (typeof ACTIONS)[number];
export type KeyLayout = Record<Action, string>;

export const DEFAULT_KEYS: Readonly<KeyLayout> = {
  forward: 'KeyW',
  back: 'KeyS',
  left: 'KeyA',
  right: 'KeyD',
  dodge: 'Space',
  shoot: 'KeyF',
  lock: 'KeyQ',
  heal: 'KeyR',
  item: 'KeyT',
  interact: 'KeyE',
  map: 'KeyM',
};

/** Keys no action may take: the menus' own. */
export const FIXED_KEYS: ReadonlySet<string> = new Set(['Escape', 'Enter', 'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);

export const KEYS_KEY = 'lovecraft-souls-like/keys';

/** The layout in use (the input reads it at every key press). */
export const keyLayout: KeyLayout = { ...DEFAULT_KEYS };

/** Binds `code` to `action`; an action holding it already takes the key `action` had. False for a fixed key. */
export function rebind(layout: KeyLayout, action: Action, code: string): boolean {
  if (FIXED_KEYS.has(code)) return false;
  const other = ACTIONS.find((a) => a !== action && layout[a] === code);
  if (other) layout[other] = layout[action];
  layout[action] = code;
  return true;
}

/** A stored layout: every action its stored key if it is one a key could be, else its default. */
export function parseKeys(json: string | null): KeyLayout {
  const out: KeyLayout = { ...DEFAULT_KEYS };
  let raw: unknown = null;
  try {
    raw = json ? JSON.parse(json) : null;
  } catch {
    // A broken entry: the defaults.
  }
  if (typeof raw !== 'object' || raw === null) return out;
  for (const a of ACTIONS) {
    const code = (raw as Record<string, unknown>)[a];
    if (typeof code === 'string' && /^[A-Za-z0-9]+$/.test(code)) rebind(out, a, code);
  }
  return out;
}

/** The name a key is shown by: `KeyE` → E, `Digit1` → 1, `ShiftLeft` → Shift. */
export function keyName(code: string): string {
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  if (code.startsWith('Numpad')) return `Num ${code.slice(6)}`;
  const names: Record<string, string> = { Space: 'Space', ShiftLeft: 'Shift', ShiftRight: 'R-Shift', ControlLeft: 'Ctrl', ControlRight: 'R-Ctrl', AltLeft: 'Alt', AltRight: 'R-Alt', Backquote: '`', Minus: '-', Equal: '=', BracketLeft: '[', BracketRight: ']', Semicolon: ';', Quote: "'", Comma: ',', Period: '.', Slash: '/', Backslash: '\\', CapsLock: 'Caps', Backspace: 'Backspace' };
  return names[code] ?? code;
}
