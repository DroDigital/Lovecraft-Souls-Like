/**
 * Journeys (playtest round 2): every long jump happens under the veil (veil.ts), so the world is
 * built out of sight — arriving in a game begun or continued, fast travel, the descent into dream,
 * a gate, waking after death. The veil covers while the world stands still; the jump is made; the
 * world takes one step without the investigator's hand (the creatures about the arrival rise), then
 * waits in the dark while the chunks about it are built at a larger budget, the veil's line filling
 * as they stand (playtest round 10); the shaders the world needs are made ready out of sight (`ready`:
 * nothing is drawn while the veil covers all), and the veil lifts, the world moving again as it does.
 * Dying, the veil falls as the investigator does, and the death throes wait for it before the respawn.
 */

import { emptyInput, type InputFrame } from '../core/input';
import { WORLD } from '../data/tuning';
import { gatePlace, interactable, passGate, signPlace } from '../systems/checkpoints';
import type { Game } from '../systems/components';
import { regionAt } from '../world/worldMap';
import type { Veil } from './veil';

export interface Journeys {
  /** Covers, makes the jump, and lifts once the world about the investigator stands. */
  go(words: string, jump: () => void): void;
  /** The veil already covers (a game begun, even before its making is done): names the region the investigator stands in, lifts once the world stands, then calls `then`. */
  arrive(then?: () => void): void;
  /** Before a step: the input the world steps with, or null while it stands still. E at a gate becomes a journey through it. */
  before(frame: InputFrame): InputFrame | null;
  /** Each drawn frame, with the chunk jobs still pending. */
  update(pending: number): void;
  readonly still: boolean; // the world waits (no step this frame)
  readonly budget: number; // ms of chunk building this frame
}

const HOLD_MS = [900, 4000] as const; // under the veil after a jump, from its first drawn frame: at least (the sign shows), and at most while chunks build
const BUILD_MS = 24; // chunk building a frame while nothing shows (nothing is drawn under the veil, so it has the frame)
const DYING_MS = 900; // the fall shows this long before the veil comes

/** `ready` makes the world ready to be seen before the veil lifts (the shaders it needs, main.ts). */
export function createJourneys(g: Game, veil: Veil, ready?: () => Promise<void>): Journeys {
  let phase: 'idle' | 'covering' | 'dying' | 'holding' | 'readying' = 'idle';
  let since = 0;
  let then: (() => void) | undefined;
  let fallen = false; // the veil has begun to fall on a death
  let rise = 0; // steps the world takes on arrival, before it waits
  let [from, peak] = [0, 0]; // the hold's line: the share made before it, and the most chunk jobs it has seen pending

  const hold = (after?: () => void): void => {
    [phase, since, then, rise] = ['holding', -1, after, 1];
  };
  const lift = (): void => {
    phase = 'idle';
    void veil.lift(1.4);
    const after = then;
    then = undefined;
    after?.();
  };
  const dyingWaits = (): boolean => {
    const a = g.ecs.c.actor.get(g.player.id)!;
    return phase === 'dying' && !veil.covered && a.move === 'death' && a.frame >= a.moves.death.frames - 2;
  };
  const restPlace = (): string => (g.overworld ? signPlace(g.overworld.sign)?.name : undefined)?.toUpperCase() ?? 'THE ELDER SIGN';

  g.events.on('Died', ({ entity }) => {
    if (entity !== g.player.id || phase !== 'idle') return;
    [phase, since, fallen] = ['dying', performance.now(), false];
  });
  g.events.on('Respawned', () => void (phase === 'dying' && hold()));

  const self: Journeys = {
    go(words, jump) {
      if (phase !== 'idle') return;
      phase = 'covering';
      void veil.cover(words, 0.9).then(() => {
        jump();
        hold();
      });
    },
    arrive(after) {
      const at = g.ecs.c.transform.get(g.player.id)!.pos;
      if (g.overworld) veil.darken(regionAt(at.x, at.z)?.name.toUpperCase());
      hold(after);
    },
    before(frame) {
      if (phase === 'holding') return rise-- > 0 ? emptyInput() : null;
      if (self.still) return null;
      const t = frame.pressed.interact && phase === 'idle' ? interactable(g) : null;
      if (t?.kind === 'gate') {
        frame.pressed.interact = false;
        self.go((gatePlace(gatePlace(t.id)?.to ?? '')?.name ?? '').toUpperCase(), () => passGate(g, t.id));
      }
      return frame;
    },
    update(pending) {
      const now = performance.now();
      if (phase === 'dying' && !fallen && now - since > DYING_MS) {
        fallen = true;
        void veil.cover(restPlace(), 1.2);
      }
      if (phase !== 'holding') return;
      if (since < 0) [since, from, peak] = [now, veil.fill, 0];
      peak = Math.max(peak, pending);
      veil.progress(from + (1 - from) * (peak > 0 ? 1 - pending / peak : 1));
      if (now - since < HOLD_MS[0] || (pending > 0 && now - since < HOLD_MS[1])) return;
      phase = 'readying';
      if (ready) void ready().then(lift, lift);
      else lift();
    },
    get still() {
      return phase === 'covering' || (phase === 'holding' && rise <= 0) || phase === 'readying' || dyingWaits();
    },
    get budget() {
      return phase === 'holding' || veil.covered ? BUILD_MS : WORLD.sliceMs;
    },
  };
  return self;
}
