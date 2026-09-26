/**
 * The device in hand (playtest round 12): keyboard and mouse, or a pad, whichever was used last.
 * The prompts, hints and menus name the buttons of that device (ui/glyphs.ts), and change as soon
 * as the player picks up the other.
 */

export type Device = 'keys' | 'pad';

let current: Device = 'keys';
const listeners = new Set<(d: Device) => void>();

export const deviceInUse = (): Device => current;

/** The player used `d`: if it is not the one in hand, everyone listening hears of the change. */
export function useDevice(d: Device): void {
  if (d === current) return;
  current = d;
  for (const fn of listeners) fn(d);
}

export const onDeviceChange = (fn: (d: Device) => void): void => void listeners.add(fn);
