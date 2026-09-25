/**
 * Entry: the title screen, then the open world (saved to localStorage; `?fresh` skips the title and
 * starts anew), the combat arena (`?arena`, or `?spawn=<id>[&variant=eldritch|boss]` to add a roster
 * creature), `?bestiary`, or the `?look` test. `?debug` shows the debug panel (as the arena does)
 * and exposes the game on `window`. Settings, the audio engine and the veil outlive the title
 * screen; the world is built under the veil, and every long jump after passes under it (journeys.ts).
 */

import { PerspectiveCamera, Vector3 } from 'three';
import { createInput, emptyInput } from './core/input';
import { startLoop } from './core/loop';
import { STINGERS } from './data/sounds';
import { LIGHT, RENDER, SIM } from './data/tuning';
import type { Variant } from './data/registry';
import { createActorViews } from './render/actorViews';
import { createDrones, type Drones } from './render/audio/drones';
import { createAudioEngine, type AudioEngine } from './render/audio/engine';
import { createGameAudio } from './render/audio/gameAudio';
import { playMenuMusic, type Music } from './render/audio/music';
import { playSound } from './render/audio/synth';
import { createBossFx } from './render/bossFx';
import { createCombatFx } from './render/combatFx';
import { createShadows } from './render/shadows';
import { createSky, inDungeon } from './render/sky';
import { createHurtFx } from './render/hurtFx';
import { createParticles } from './render/particles';
import { createCreatureViews } from './render/creatureViews';
import { createFightViews } from './render/fightViews';
import { placeCamera } from './render/followCamera';
import { allEffectsOn, computeFx, lensAt, type FxState } from './render/fx';
import { createFxController } from './render/fxController';
import { createHiddenViews } from './render/hiddenViews';
import { createWorldScene } from './render/worldScene';
import { lightNight, placeLantern } from './render/lantern';
import { applyLens } from './render/lens';
import { ANOMALY } from './render/palette';
import { createPipeline } from './render/pipeline';
import { updatePostUniforms } from './render/postPass';
import { applyReality, lightReality } from './render/realityFx';
import { buildAtlas } from './render/sprites/atlas';
import { updateWorldUniforms, worldUniforms } from './render/worldMaterial';
import { createGame, createWorldGame, stepGame } from './systems/game';
import { clearSave, loadSave, type SaveStore } from './systems/save';
import { browserStore, startAutosave } from './ui/autosave';
import { startBestiary } from './ui/bestiary';
import { HINTS, panelOptions, playerStats, spawnHint, worldStats } from './ui/debugHooks';
import { createDebugPanel } from './ui/debugPanel';
import { createEndingCard } from './ui/endingCard';
import { createHud } from './ui/hud';
import { startLookTest } from './ui/lookTest';
import { setMenuSound } from './ui/menuKit';
import { createMapPainter } from './ui/mapPainter';
import { createMapScreen } from './ui/mapScreen';
import { createPauseMenu } from './ui/pauseMenu';
import { createDialogue } from './ui/dialogue';
import { showIntro, type Intro } from './ui/intro';
import { journalPage } from './ui/journal';
import { createJourneys } from './ui/journeys';
import { clampSetting, loadSettings, storeSettings, type SettingId, type Settings } from './ui/settings';
import { createSignMenu, type SignMenu } from './ui/signMenu';
import { startTitleBackdrop } from './ui/titleBackdrop';
import { showTitle } from './ui/titleScreen';
import { createVeil, type Veil } from './ui/veil';
import { createArenaScene } from './world/arenaScene';

/** What outlives the title screen: the settings (kept in localStorage), the audio and the veil. */
interface Shell {
  music?: Music; // the title screen's, while it plays (through a new game's opening)
  settings: Settings;
  change(id: SettingId, v: number): void;
  store: SaveStore | null;
  engine: AudioEngine;
  drones: Drones;
  veil: Veil;
}

interface StartOptions {
  debug: boolean; // exposes the game (and the world scene) on `window` for console poking and scripted checks
  arena: boolean; // the combat arena instead of the open world
  fresh?: boolean; // the open world: forget the save and start anew
  intro?: boolean; // show the new game's opening first (not with ?fresh, which is for testing)
  creature?: string;
  variant?: Variant;
}

function startGame(opts: StartOptions, shell: Shell): void {
  const { debug, creature, variant } = opts;
  const { settings, veil } = shell;
  if (!veil.covered) veil.darken(); // the world is built out of sight
  const state: FxState = { sanity: 100, cap: settings.fxCap, anomalyProximity: 0, enabled: allEffectsOn() };
  const pipeline = createPipeline(document.body);
  const canvas = pipeline.renderer.domElement;
  const store = opts.arena ? null : shell.store;
  if (store && opts.fresh) clearSave(store);
  const game = opts.arena ? createGame({ creature, variant }) : createWorldGame({ save: (store && loadSave(store)) ?? undefined });
  const world = opts.arena ? null : createWorldScene();
  const scene = world?.scene ?? createArenaScene();
  const journeys = createJourneys(game, veil);
  const menu: SignMenu | null = opts.arena ? null : createSignMenu(game, journeys.go);
  const ending = createEndingCard(game);
  const capture = (): void => {
    try {
      const r: unknown = canvas.requestPointerLock();
      if (r instanceof Promise) r.catch(() => undefined);
    } catch {
      // No pointer lock: a click on the canvas captures the mouse, as ever.
    }
  };
  const pause = createPauseMenu({
    settings,
    change: shell.change,
    resume: capture,
    map: opts.arena ? undefined : () => map.show(),
    journal: opts.arena ? undefined : (back, show) => journalPage(game, back, show),
    quit: () => void veil.cover('', 0.8).then(() => (location.href = location.pathname)),
  });
  if (store) startAutosave(game, store);
  const views = createActorViews(scene, game);
  const creatures = createCreatureViews(scene, game, buildAtlas());
  const hidden = createHiddenViews(scene, game);
  const fights = createFightViews(scene, game);
  const fxController = createFxController(game);
  const audio = createGameAudio(shell.engine, shell.drones, game);
  const particles = createParticles(scene);
  const combatFx = createCombatFx(game, particles);
  const bossFx = createBossFx(scene, game, particles);
  const shadows = createShadows(scene, game);
  const sky = createSky();
  scene.add(sky.mesh);
  const hurt = createHurtFx(game);
  const camera = new PerspectiveCamera(RENDER.fovDeg, RENDER.width / RENDER.height, RENDER.near, RENDER.far);
  const input = createInput(canvas);
  const dialogue = createDialogue(game);
  const reveal = (): void => {
    shell.music?.fadeOut(2.5); // the title's music plays on until the world shows
    shell.music = undefined;
  };
  const intro: Intro | null = opts.intro ? showIntro(() => (capture(), journeys.arrive(reveal))) : null;
  if (!intro) journeys.arrive(reveal);
  const painter = createMapPainter(game);
  const hud = createHud(game, canvas, painter);
  const map = createMapScreen(game, painter, capture);
  const panel = debug || opts.arena ? createDebugPanel(state, [...HINTS, ...(opts.arena ? spawnHint(creature, variant) : [])], panelOptions(game, settings, shell.change)) : null;
  lightNight();
  worldUniforms.uGlowColor.value.set(...ANOMALY.green).multiplyScalar(LIGHT.echoGlowIntensity); // Echo drops glow
  worldUniforms.uGlowRange.value = LIGHT.echoGlowRange;
  const noGlow = new Vector3(0, -1e4, 0);
  if (debug) Object.assign(window, { game, world, audio: shell.engine });

  let lowRes = state.enabled.pixelate;
  let scale = settings.resolution;
  const resize = (): void => pipeline.resize(lowRes, scale);
  resize();
  addEventListener('resize', resize);

  let simTime = 0;
  let frames = 0;
  let statsAt = performance.now();

  startLoop(
    {
      step(dt) {
        const frame = input.poll(); // polled even when unused, so no press is left latched for later
        const through = pause.open || map.open || dialogue.open || intro?.open ? null : journeys.before(frame);
        if (!through) return; // the world stands still
        simTime += dt;
        stepGame(game, menu?.open || ending.open ? emptyInput() : through);
      },
      render(blend) {
        const still = pause.open || map.open || dialogue.open || !!intro?.open || journeys.still;
        const alpha = still ? 1 : blend;
        const time = simTime + alpha / SIM.hz;
        input.sensitivity = settings.sensitivity;
        state.cap = settings.fxCap;
        if (lowRes !== state.enabled.pixelate || scale !== settings.resolution) {
          [lowRes, scale] = [state.enabled.pixelate, settings.resolution];
          resize();
        }
        placeCamera(camera, game, alpha);
        sky.update(camera, time, game.overworld?.region ?? null, !!world && inDungeon(camera.position.x, camera.position.z));
        hurt.update(pipeline.post, camera, time);
        const at = game.ecs.c.transform.get(game.player.id)!.pos;
        world?.update(at.x, at.z, journeys.budget);
        journeys.update(world?.pending ?? 0);
        views.update(alpha, time);
        placeLantern(game, alpha);
        creatures.update(alpha, time, camera);
        hidden.update(time);
        fights.update(alpha, time);
        combatFx.update();
        bossFx.update(alpha, time, camera);
        shadows.update(alpha);
        particles.update(time, camera);

        fxController.update(state, camera.position, time);
        const fx = computeFx(state);
        applyReality(fx, game.reality);
        lightReality(game.reality);
        audio.update(fx, time, camera, still);
        const lens = lensAt(fx, time);
        applyLens(camera, lens.fovDeg, lens.skew);
        updateWorldUniforms(fx, time, camera.position, views.glow ?? noGlow, pipeline.size);
        updatePostUniforms(pipeline.post, fx, time, pipeline.size);
        pipeline.render(scene, camera);
        hud.update(camera);
        if (!panel) return;
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

/** Settings, the audio engine, the drones and the veil, made once for the page. */
function createShell(): Shell {
  const store = browserStore();
  const settings = loadSettings(store);
  const engine = createAudioEngine(settings.volume);
  setMenuSound(() => playSound(engine, STINGERS.select));
  const change = (id: SettingId, v: number): void => {
    settings[id] = clampSetting(id, v);
    storeSettings(store, settings);
    if (id === 'volume') {
      engine.setVolume(settings.volume);
      shell.music?.setVolume(settings.volume);
    }
  };
  const shell: Shell = { settings, change, store, engine, drones: createDrones(engine), veil: createVeil() };
  return shell;
}

/** The title screen over its live stair, with its music, until a choice starts the world. */
function title(opts: StartOptions, shell: Shell): void {
  shell.music = playMenuMusic(shell.settings.volume);
  shell.veil.haunt(true);
  const backdrop = startTitleBackdrop(shell.settings.fxCap, shell.settings.resolution);
  showTitle({
    hasSave: !!(shell.store && loadSave(shell.store)),
    settings: shell.settings,
    change: shell.change,
    start(fresh, close) {
      void shell.veil.cover('', 1.1).then(() => {
        close();
        backdrop.stop();
        startGame({ ...opts, fresh, intro: fresh }, shell);
      });
    },
  });
}

const params = new URLSearchParams(location.search);
const variant = params.get('variant');
if (params.has('look')) startLookTest();
else if (params.has('bestiary')) startBestiary();
else {
  const opts: StartOptions = {
    debug: params.has('debug'),
    arena: params.has('arena') || params.has('spawn'),
    fresh: params.has('fresh'),
    creature: params.get('spawn') ?? undefined,
    variant: variant === 'eldritch' || variant === 'boss' ? variant : undefined,
  };
  if (opts.arena || opts.fresh) startGame(opts, createShell());
  else title(opts, createShell());
}
