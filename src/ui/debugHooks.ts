/** The debug panel's side of a game (main.ts): its hints, stats lines and controls. */

import type { Variant } from '../data/registry';
import { UPGRADES, type UpgradeId } from '../data/tuning';
import type { WorldScene } from '../render/worldScene';
import type { Game } from '../systems/components';
import { resolveCreature } from '../systems/creatures';
import { buyUpgrade, changeInsight, upgradeName } from '../systems/insight';
import { setSanity } from '../systems/sanity';
import type { PanelOptions } from './debugPanel';
import type { SettingId, Settings } from './settings';

export const HINTS = ['Esc: pause, settings, controls', '?arena: the combat arena · ?fresh: new game'];

export function playerStats(g: Game): string {
  const c = g.ecs.c;
  const a = c.actor.get(g.player.id)!;
  const s = c.stamina.get(g.player.id)!;
  const lock = g.lock.target === null ? '—' : (c.combatant.get(g.lock.target)?.name ?? '?');
  return `${a.move ?? (a.guard ? 'guard' : 'free')}:${a.frame} · stamina ${s.value.toFixed(0)}\nlock ${lock}`;
}

/** The world's stats line: where the investigator is, streaming, and the creatures awake. */
export function worldStats(g: Game, w: WorldScene): string {
  const ow = g.overworld!;
  return `\n${ow.region ?? 'the sea'} · ${w.loaded} chunks (${w.pending} building) · ${ow.alive.size} awake`;
}

/** A hint line naming the spawned creature (or the problem with the request). */
export function spawnHint(creature: string | undefined, variant: Variant | undefined): string[] {
  if (creature === undefined) return ['?bestiary: pick a creature to fight'];
  const def = resolveCreature(creature, variant);
  if (!def) return [`unknown creature "${creature}${variant ? `#${variant}` : ''}" · ?bestiary`];
  const { minInsight, maxSanity } = def.hidden ?? {};
  const veil = [minInsight && `insight ${minInsight}`, maxSanity && `sanity < ${maxSanity}`].filter(Boolean).join(', ');
  return [`spawned: ${def.name} (${def.tier.replace(/_/g, ' ')})${veil ? ` · unseen until ${veil}` : ''} · ?bestiary`];
}

/** Debug controls: sanity, FX cap and insight sliders that drive the game, and upgrade purchases. */
export function panelOptions(game: Game, settings: Settings, change: (id: SettingId, v: number) => void): PanelOptions {
  return {
    sanity: { get: () => game.mind.sanity, set: (v) => setSanity(game, v) },
    cap: { get: () => settings.fxCap, set: (v) => change('fxCap', v) },
    insight: { get: () => game.mind.insight, set: (v) => changeInsight(game, v - game.mind.insight, 'debug', 'debug panel') },
    actions: [
      ...(Object.keys(UPGRADES) as UpgradeId[]).map((id) => ({
        label: `spend ${UPGRADES[id].cost} insight: ${upgradeName(id)}`,
        run: () => void buyUpgrade(game, id),
      })),
      { label: '+1000 Echoes', run: () => void (game.player.echoes += 1000) },
    ],
  };
}
