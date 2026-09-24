/**
 * Entry: the open world (saved to localStorage; `?fresh` starts anew), the combat arena (`?arena`, or
 * `?spawn=<id>[&variant=eldritch|boss]` to add a roster creature), `?bestiary`, or the `?look` test.
 */

import { PerspectiveCamera, Vector3 } from 'three';
import { createInput, emptyInput } from './core/input';
import { startLoop } from './core/loop';
import { FX, LIGHT, RENDER, SIM, UPGRADES, type UpgradeId } from './data/tuning';
import type { Variant } from './data/registry';
import { createActorViews } from './render/actorViews';
import { createAudioFx } from './render/audioFx';
import { createCreatureViews } from './render/creatureViews';
import { placeCamera } from './render/followCamera';
import { allEffectsOn, computeFx, lensAt, type FxState } from './render/fx';
import { createFxController } from './render/fxController';
import { createHiddenViews } from './render/hiddenViews';
import { createWorldScene, type WorldScene } from './render/worldScene';
import { lightNight, placeLantern } from './render/lantern';
import { applyLens } from './render/lens';
import { ANOMALY } from './render/palette';
import { createPipeline } from './render/pipeline';
import { updatePostUniforms } from './render/postPass';
import { buildAtlas } from './render/sprites/atlas';
import { updateWorldUniforms, worldUniforms } from './render/worldMaterial';
import type { Game } from './systems/components';
import { resolveCreature } from './systems/creatures';
import { createGame, createWorldGame, stepGame } from './systems/game';
import { buyUpgrade, changeInsight, upgradeName } from './systems/insight';
import { setSanity } from './systems/sanity';
import { clearSave, loadSave } from './systems/save';
import { browserStore, startAutosave } from './ui/autosave';
import { startBestiary } from './ui/bestiary';
import { createDebugPanel, type PanelOptions } from './ui/debugPanel';
import { createHud } from './ui/hud';
import { startLookTest } from './ui/lookTest';
import { createSignMenu, type SignMenu } from './ui/signMenu';
import { createArenaScene } from './world/arenaScene';

const HINTS = [
  'click: mouse look · WASD move',
  'LMB light · ⇧LMB heavy · F revolver',
  'RMB block · ⇧RMB parry',
  'Space dodge, hold: sprint',
  'Q lock-on · ←/→ switch target',
  'R Laudanum (restores sanity)',
];
const WORLD_HINTS = ['E rest at an Elder Sign · pass a gate', '?arena: the combat arena · ?fresh: new game'];

function playerStats(g: Game): string {
  const c = g.ecs.c;
  const a = c.actor.get(g.player.id)!;
  const s = c.stamina.get(g.player.id)!;
  const lock = g.lock.target === null ? '—' : (c.combatant.get(g.lock.target)?.name ?? '?');
  return `${a.move ?? (a.guard ? 'guard' : 'free')}:${a.frame} · stamina ${s.value.toFixed(0)}\nlock ${lock}`;
}

interface StartOptions {
  debug: boolean; // exposes the game (and the world scene) on `window` for console poking and scripted checks
  arena: boolean; // the combat arena instead of the open world
  fresh?: boolean; // the open world: forget the save and start anew
  creature?: string;
  variant?: Variant;
}

/** The world's stats line: where the investigator is, streaming, and the creatures awake. */
function worldStats(g: Game, w: WorldScene): string {
  const ow = g.overworld!;
  return `\n${ow.region ?? 'the sea'} · ${w.loaded} chunks (${w.pending} building) · ${ow.alive.size} awake`;
}

/** A hint line naming the spawned creature (or the problem with the request). */
function spawnHint({ creature, variant }: StartOptions): string[] {
  if (creature === undefined) return ['?bestiary: pick a creature to fight'];
  const def = resolveCreature(creature, variant);
  if (!def) return [`unknown creature "${creature}${variant ? `#${variant}` : ''}" · ?bestiary`];
  const { minInsight, maxSanity } = def.hidden ?? {};
  const veil = [minInsight && `insight ${minInsight}`, maxSanity && `sanity < ${maxSanity}`].filter(Boolean).join(', ');
  return [`spawned: ${def.name} (${def.tier.replace(/_/g, ' ')})${veil ? ` · unseen until ${veil}` : ''} · ?bestiary`];
}

/** Arena debug controls: sanity and insight sliders that drive the game, and upgrade purchases. */
function panelOptions(game: Game): PanelOptions {
  return {
    sanity: { get: () => game.mind.sanity, set: (v) => setSanity(game, v) },
    insight: { get: () => game.mind.insight, set: (v) => changeInsight(game, v - game.mind.insight, 'debug', 'debug panel') },
    actions: (Object.keys(UPGRADES) as UpgradeId[]).map((id) => ({
      label: `spend ${UPGRADES[id].cost} insight: ${upgradeName(id)}`,
      run: () => void buyUpgrade(game, id),
    })),
  };
}

function startGame(opts: StartOptions): void {
  const { debug, creature, variant } = opts;
  const state: FxState = { sanity: 100, cap: FX.capDefault, anomalyProximity: 0, enabled: allEffectsOn() };
  const pipeline = createPipeline(document.body);
  const canvas = pipeline.renderer.domElement;
  const store = opts.arena ? null : browserStore();
  if (store && opts.fresh) clearSave(store);
  const game = opts.arena ? createGame({ creature, variant }) : createWorldGame({ save: (store && loadSave(store)) ?? undefined });
  const world = opts.arena ? null : createWorldScene();
  const scene = world?.scene ?? createArenaScene();
  const menu: SignMenu | null = opts.arena ? null : createSignMenu(game);
  if (store) startAutosave(game, store);
  const views = createActorViews(scene, game);
  const creatures = createCreatureViews(scene, game, buildAtlas());
  const hidden = createHiddenViews(scene, game);
  const fxController = createFxController(game);
  const audio = createAudioFx();
  const camera = new PerspectiveCamera(RENDER.fovDeg, RENDER.width / RENDER.height, RENDER.near, RENDER.far);
  const input = createInput(canvas);
  const hud = createHud(game, canvas);
  const panel = createDebugPanel(state, [...HINTS, ...(opts.arena ? spawnHint(opts) : WORLD_HINTS)], panelOptions(game));
  lightNight();
  worldUniforms.uGlowColor.value.set(...ANOMALY.green).multiplyScalar(LIGHT.echoGlowIntensity); // Echo drops glow
  worldUniforms.uGlowRange.value = LIGHT.echoGlowRange;
  const noGlow = new Vector3(0, -1e4, 0);
  if (debug) Object.assign(window, { game, world });

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
        const frame = input.poll();
        stepGame(game, menu?.open ? emptyInput() : frame);
      },
      render(alpha) {
        const time = simTime + alpha / SIM.hz;
        if (lowRes !== state.enabled.pixelate) pipeline.resize((lowRes = state.enabled.pixelate));
        placeCamera(camera, game, alpha);
        const at = game.ecs.c.transform.get(game.player.id)!.pos;
        world?.update(at.x, at.z);
        views.update(alpha, time);
        placeLantern(game, alpha);
        creatures.update(alpha, time, camera);
        hidden.update(time);

        fxController.update(state, camera.position, time);
        const fx = computeFx(state);
        audio.update(fx, time);
        const lens = lensAt(fx, time);
        applyLens(camera, lens.fovDeg, lens.skew);
        updateWorldUniforms(fx, time, camera.position, views.glow ?? noGlow, pipeline.size);
        updatePostUniforms(pipeline.post, fx, time, pipeline.size);
        pipeline.render(scene, camera);
        hud.update(camera);
        panel.refresh();

        frames++;
        const now = performance.now();
        if (now - statsAt >= 500) {
          const fps = Math.round((frames * 1000) / (now - statsAt));
          panel.setStats(`${fps} fps · ${pipeline.renderer.info.render.calls} draws\n${playerStats(game)}${world ? worldStats(game, world) : ''}`);
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
  startGame({
    debug: params.has('debug'),
    arena: params.has('arena') || params.has('spawn'),
    fresh: params.has('fresh'),
    creature: params.get('spawn') ?? undefined,
    variant: variant === 'eldritch' || variant === 'boss' ? variant : undefined,
  });
}
