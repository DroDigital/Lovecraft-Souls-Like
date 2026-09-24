/** Entry: the combat arena (`?spawn=<id>[&variant=eldritch|boss]` adds a roster creature), `?bestiary`, or the `?look` test. */

import { PerspectiveCamera, Vector3 } from 'three';
import { createInput } from './core/input';
import { startLoop } from './core/loop';
import { FX, LIGHT, RENDER, SIM } from './data/tuning';
import type { Variant } from './data/registry';
import { createActorViews } from './render/actorViews';
import { createCreatureViews } from './render/creatureViews';
import { placeCamera } from './render/followCamera';
import { allEffectsOn, computeFx, lensAt, type FxState } from './render/fx';
import { applyLens } from './render/lens';
import { ANOMALY } from './render/palette';
import { createPipeline } from './render/pipeline';
import { updatePostUniforms } from './render/postPass';
import { buildAtlas } from './render/sprites/atlas';
import { updateWorldUniforms, worldUniforms } from './render/worldMaterial';
import type { Game } from './systems/components';
import { resolveCreature } from './systems/creatures';
import { createGame, stepGame } from './systems/game';
import { startBestiary } from './ui/bestiary';
import { createDebugPanel } from './ui/debugPanel';
import { createHud } from './ui/hud';
import { startLookTest } from './ui/lookTest';
import { createArenaScene } from './world/arenaScene';

const HINTS = [
  'click: mouse look · WASD move',
  'LMB light · ⇧LMB heavy · F revolver',
  'RMB block · ⇧RMB parry',
  'Space dodge, hold: sprint',
  'Q lock-on · ←/→ switch target',
];

function playerStats(g: Game): string {
  const c = g.ecs.c;
  const a = c.actor.get(g.player.id)!;
  const s = c.stamina.get(g.player.id)!;
  const lock = g.lock.target === null ? '—' : (c.combatant.get(g.lock.target)?.name ?? '?');
  return `${a.move ?? (a.guard ? 'guard' : 'free')}:${a.frame} · stamina ${s.value.toFixed(0)}\nlock ${lock}`;
}

interface ArenaOptions {
  debug: boolean; // exposes the game as `window.game` for console poking and scripted checks
  creature?: string;
  variant?: Variant;
}

/** A hint line naming the spawned creature (or the problem with the request). */
function spawnHint({ creature, variant }: ArenaOptions): string[] {
  if (creature === undefined) return ['?bestiary: pick a creature to fight'];
  const def = resolveCreature(creature, variant);
  return [def ? `spawned: ${def.name} (${def.tier.replace(/_/g, ' ')}) · ?bestiary` : `unknown creature "${creature}${variant ? `#${variant}` : ''}" · ?bestiary`];
}

function startArena(opts: ArenaOptions): void {
  const { debug, creature, variant } = opts;
  const state: FxState = { sanity: 100, cap: FX.capDefault, anomalyProximity: 0, enabled: allEffectsOn() };
  const pipeline = createPipeline(document.body);
  const canvas = pipeline.renderer.domElement;
  const game = createGame({ creature, variant });
  const scene = createArenaScene();
  const views = createActorViews(scene, game);
  const creatures = createCreatureViews(scene, game, buildAtlas());
  const camera = new PerspectiveCamera(RENDER.fovDeg, RENDER.width / RENDER.height, RENDER.near, RENDER.far);
  const input = createInput(canvas);
  const hud = createHud(game, canvas);
  const panel = createDebugPanel(state, [...HINTS, ...spawnHint(opts)]);
  worldUniforms.uGlowColor.value.set(...ANOMALY.green).multiplyScalar(LIGHT.echoGlowIntensity); // Echo drops glow
  worldUniforms.uGlowRange.value = LIGHT.echoGlowRange;
  const noGlow = new Vector3(0, -1e4, 0);
  if (debug) Object.assign(window, { game });

  let lowRes = state.enabled.pixelate;
  pipeline.resize(lowRes);
  addEventListener('resize', () => pipeline.resize(lowRes));

  let simTime = 0;
  let frames = 0;
  let statsAt = performance.now();

  startLoop(
    {
      step(dt) {
        simTime += dt;
        stepGame(game, input.poll());
      },
      render(alpha) {
        const time = simTime + alpha / SIM.hz;
        if (lowRes !== state.enabled.pixelate) pipeline.resize((lowRes = state.enabled.pixelate));
        placeCamera(camera, game, alpha);
        views.update(alpha, time);
        creatures.update(alpha, time, camera);

        const fx = computeFx(state);
        const lens = lensAt(fx, time);
        applyLens(camera, lens.fovDeg, lens.skew);
        updateWorldUniforms(fx, time, camera.position, views.glow ?? noGlow, pipeline.size);
        updatePostUniforms(pipeline.post, fx, time, pipeline.size);
        pipeline.render(scene, camera);
        hud.update(camera);

        frames++;
        const now = performance.now();
        if (now - statsAt >= 500) {
          const fps = Math.round((frames * 1000) / (now - statsAt));
          panel.setStats(`${fps} fps · ${pipeline.renderer.info.render.calls} draws\n${playerStats(game)}`);
          frames = 0;
          statsAt = now;
        }
      },
    },
    SIM.hz,
    SIM.maxFrameSeconds,
  );
}

const params = new URLSearchParams(location.search);
const variant = params.get('variant');
if (params.has('look')) startLookTest();
else if (params.has('bestiary')) startBestiary();
else {
  startArena({
    debug: params.has('debug'),
    creature: params.get('spawn') ?? undefined,
    variant: variant === 'eldritch' || variant === 'boss' ? variant : undefined,
  });
}
