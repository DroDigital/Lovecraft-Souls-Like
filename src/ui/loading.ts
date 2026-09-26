/**
 * Loading (playtest round 10): Continue and New game held the page on black for seconds while the
 * world was made in one piece, the veil unable to draw a frame. Now the world is made in steps
 * (main.ts), a frame drawn between them, so the Elder Sign keeps breathing over the line that fills
 * beneath it. The sprite atlas, the longest single piece, is drawn a slice at a time, and begun
 * ahead in the idle moments while the title waits for a choice.
 */

import { atlasBuilder, type AtlasBuilder, type SpriteAtlas } from '../render/sprites/atlas';

const IDLE_MS = 8; // atlas drawing per idle moment while the title waits
const FRAME_MS = 28; // atlas drawing per frame while the veil waits on it

/** Resolves once the next frame has been drawn and shown (the veil with it), so the work after it does not hold that frame back. */
export const nextFrame = (): Promise<void> => new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)));

let atlas: AtlasBuilder | null = null;
const builder = (): AtlasBuilder => (atlas ??= atlasBuilder());

/** While the title waits: draws the sprite atlas in the page's idle moments. */
export function makeAhead(): void {
  const b = builder();
  const later = (then: () => void): void => void (typeof requestIdleCallback === 'function' ? requestIdleCallback(then, { timeout: 250 }) : setTimeout(then, 30));
  const slice = (): void => {
    if (!b.step(IDLE_MS)) later(slice);
  };
  later(slice);
}

/** The sprite atlas, finished a frame's slice at a time; `made` hears how far along it is (0..1). */
export async function spriteAtlas(made: (share: number) => void): Promise<SpriteAtlas> {
  const b = builder();
  for (;;) {
    const done = b.step(FRAME_MS);
    made(b.progress);
    if (done) return done;
    await nextFrame();
  }
}
