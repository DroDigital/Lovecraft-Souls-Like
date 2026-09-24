/**
 * The Dunwich Horror (spec §3E): invisible (its script is `unseen`). Armitage's sprayer holds three
 * doses of the Powder of Ibn Ghazi: E scatters one at the Horror within reach, and it shows itself
 * for a while, to be seen, locked on to and beheld. No blade finishes it: in its last phase it
 * cannot fall below a sliver of health, and only the incantation destroys it, chanted to its end
 * (E, and not staggered out of it) within earshot.
 */

import { distXZ } from '../../core/geom';
import { DUNWICH } from '../../data/tuning';
import { startMove } from '../actions';
import type { Fight, Game } from '../components';
import type { Signature } from '../signatures';

const lastPhase = (f: Fight): boolean => f.phase === f.script.phases.length - 1;

const near = (g: Game, e: number, range: number): boolean =>
  distXZ(g.ecs.c.transform.get(e)!.pos, g.ecs.c.transform.get(g.player.id)!.pos) <= range + (g.ecs.c.body.get(e)?.radius ?? 0);

/** The incantation's last word: the Horror is undone. */
function destroy(g: Game, e: number): void {
  const c = g.ecs.c;
  const h = c.health.get(e)!;
  [h.floor, h.hp] = [undefined, 0];
  c.unseen.delete(e); // it is seen as it dies
  startMove(c.actor.get(e)!, 'death');
  g.events.emit('Died', { entity: e, killer: g.player.id, at: { ...c.transform.get(e)!.pos } });
}

export const DUNWICH_SIGNATURE: Signature = {
  engage: (_g, _e, f) => void (f.sig.powder = DUNWICH.powder),
  step(g, e, f) {
    const c = g.ecs.c;
    const u = c.unseen.get(e);
    if (u && u.revealed > 0) u.revealed--;
    c.health.get(e)!.floor = lastPhase(f) ? 1 : undefined;
    const a = c.actor.get(g.player.id)!;
    if (lastPhase(f) && a.move === 'chant' && a.frame >= a.moves.chant.frames - 1 && near(g, e, DUNWICH.chantRange)) destroy(g, e);
  },
  reset(g, e) {
    const c = g.ecs.c;
    c.health.get(e)!.floor = undefined;
    if (c.unseen.has(e)) c.unseen.set(e, { revealed: 0 });
  },
  action(g, e, f) {
    const c = g.ecs.c;
    const player = c.actor.get(g.player.id)!;
    if (lastPhase(f) && near(g, e, DUNWICH.chantRange)) return { label: 'chant the incantation', run: () => startMove(player, 'chant') };
    if ((f.sig.powder ?? 0) <= 0 || !near(g, e, DUNWICH.reach)) return null;
    return {
      label: `scatter the Powder of Ibn Ghazi (${f.sig.powder})`,
      run() {
        f.sig.powder--;
        c.unseen.set(e, { revealed: DUNWICH.reveal });
        startMove(player, 'scatter');
        g.events.emit('Revealed', { entity: e, doses: f.sig.powder });
      },
    };
  },
};
