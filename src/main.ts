/** Entry: the Phase 1 combat arena, or the Phase 0 look test at `?look`. */

import { PerspectiveCamera, Vector3 } from 'three';
import { createInput } from './core/input';
import { startLoop } from './core/loop';
import { FX, LIGHT, RENDER, SIM } from './data/tuning';
import { createActorViews } from './render/actorViews';
import { placeCamera } from './render/followCamera';
import { allEffectsOn, computeFx, lensAt, type FxState } from './render/fx';
import { applyLens } from './render/lens';
import { ANOMALY } from './render/palette';
import { createPipeline } from './render/pipeline';
import { updatePostUniforms } from './render/postPass';
import { updateWorldUniforms, worldUniforms } from './render/worldMaterial';
import type { Game } from './systems/components';
import { createGame, stepGame } from './systems/game';
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

/** `debug` exposes the game as `window.game` for console poking and scripted checks. */
function startArena(debug: boolean): void {
  const state: FxState = { sanity: 100, cap: FX.capDefault, anomalyProximity: 0, enabled: allEffectsOn() };
  const pipeline = createPipeline(document.body);
  const canvas = pipeline.renderer.domElement;
  const game = createGame();
  const scene = createArenaScene();
  const views = createActorViews(scene, game);
  const camera = new PerspectiveCamera(RENDER.fovDeg, RENDER.width / RENDER.height, RENDER.near, RENDER.far);
  const input = createInput(canvas);
  const hud = createHud(game, canvas);
  const panel = createDebugPanel(state, HINTS);
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
if (params.has('look')) startLookTest();
else startArena(params.has('debug'));
