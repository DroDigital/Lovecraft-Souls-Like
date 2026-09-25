/**
 * Entry: the title screen, then the open world (saved to localStorage; `?fresh` skips the title and
 * starts anew), the combat arena (`?arena`, or `?spawn=<id>[&variant=eldritch|boss]` to add a roster
 * creature), `?bestiary`, or the `?look` test. `?debug` shows the debug panel (as the arena does)
 * and exposes the game on `window`. Settings and the audio engine outlive the title screen.
 */

import { PerspectiveCamera, Vector3 } from 'three';
import { createInput, emptyInput } from './core/input';
import { startLoop } from './core/loop';
import { STINGERS } from './data/sounds';
import { LIGHT, RENDER, SIM, UPGRADES, type UpgradeId } from './data/tuning';
import type { Variant } from './data/registry';
import { createActorViews } from './render/actorViews';
import { createDrones, type Drones } from './render/audio/drones';
import { createAudioEngine, type AudioEngine } from './render/audio/engine';
import { createGameAudio } from './render/audio/gameAudio';
import { playMenuMusic, type Music } from './render/audio/music';
import { playSound } from './render/audio/synth';
import { createBossFx } from './render/bossFx';
import { createCombatFx } from './render/combatFx';
import { createHurtFx } from './render/hurtFx';
import { createParticles } from './render/particles';
import { createCreatureViews } from './render/creatureViews';
import { createFightViews } from './render/fightViews';
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
import { applyReality, lightReality } from './render/realityFx';
import { buildAtlas } from './render/sprites/atlas';
import { updateWorldUniforms, worldUniforms } from './render/worldMaterial';
import type { Game } from './systems/components';
import { resolveCreature } from './systems/creatures';
import { createGame, createWorldGame, stepGame } from './systems/game';
import { buyUpgrade, changeInsight, upgradeName } from './systems/insight';
import { setSanity } from './systems/sanity';
import { clearSave, loadSave, type SaveStore } from './systems/save';
import { browserStore, startAutosave } from './ui/autosave';
import { startBestiary } from './ui/bestiary';
import { createDebugPanel, type PanelOptions } from './ui/debugPanel';
import { createEndingCard } from './ui/endingCard';
import { createHud } from './ui/hud';
import { startLookTest } from './ui/lookTest';
import { setMenuSound } from './ui/menuKit';
import { createMapPainter } from './ui/mapPainter';
import { createMapScreen } from './ui/mapScreen';
import { createPauseMenu } from './ui/pauseMenu';
import { clampSetting, loadSettings, storeSettings, type SettingId, type Settings } from './ui/settings';
import { createSignMenu, type SignMenu } from './ui/signMenu';
import { showTitle } from './ui/titleScreen';
import { createArenaScene } from './world/arenaScene';

const HINTS = ['Esc: pause, settings, controls', '?arena: the combat arena · ?fresh: new game'];

function playerStats(g: Game): string {
  const c = g.ecs.c;
  const a = c.actor.get(g.player.id)!;
  const s = c.stamina.get(g.player.id)!;
  const lock = g.lock.target === null ? '—' : (c.combatant.get(g.lock.target)?.name ?? '?');
  return `${a.move ?? (a.guard ? 'guard' : 'free')}:${a.frame} · stamina ${s.value.toFixed(0)}\nlock ${lock}`;
}

/** What outlives the title screen: the settings (kept in localStorage) and the audio. */
interface Shell {
  music?: Music; // the title screen's, while it plays
  settings: Settings;
  change(id: SettingId, v: number): void;
  store: SaveStore | null;
  engine: AudioEngine;
  drones: Drones;
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

/** Debug controls: sanity, FX cap and insight sliders that drive the game, and upgrade purchases. */
function panelOptions(game: Game, shell: Shell): PanelOptions {
  return {
    sanity: { get: () => game.mind.sanity, set: (v) => setSanity(game, v) },
    cap: { get: () => shell.settings.fxCap, set: (v) => shell.change('fxCap', v) },
    insight: { get: () => game.mind.insight, set: (v) => changeInsight(game, v - game.mind.insight, 'debug', 'debug panel') },
    actions: (Object.keys(UPGRADES) as UpgradeId[]).map((id) => ({
      label: `spend ${UPGRADES[id].cost} insight: ${upgradeName(id)}`,
      run: () => void buyUpgrade(game, id),
    })),
  };
}

function startGame(opts: StartOptions, shell: Shell): void {
  const { debug, creature, variant } = opts;
  const { settings } = shell;
  const state: FxState = { sanity: 100, cap: settings.fxCap, anomalyProximity: 0, enabled: allEffectsOn() };
  const pipeline = createPipeline(document.body);
  const canvas = pipeline.renderer.domElement;
  const store = opts.arena ? null : shell.store;
  if (store && opts.fresh) clearSave(store);
  const game = opts.arena ? createGame({ creature, variant }) : createWorldGame({ save: (store && loadSave(store)) ?? undefined });
  const world = opts.arena ? null : createWorldScene();
  const scene = world?.scene ?? createArenaScene();
  const menu: SignMenu | null = opts.arena ? null : createSignMenu(game);
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
    quit: () => void (location.href = location.pathname),
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
  const hurt = createHurtFx(game);
  const camera = new PerspectiveCamera(RENDER.fovDeg, RENDER.width / RENDER.height, RENDER.near, RENDER.far);
  const input = createInput(canvas);
  const painter = createMapPainter(game);
  const hud = createHud(game, canvas, painter);
  const map = createMapScreen(game, painter, capture);
  const panel = debug || opts.arena ? createDebugPanel(state, [...HINTS, ...(opts.arena ? spawnHint(opts) : [])], panelOptions(game, shell)) : null;
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
        if (pause.open || map.open) return; // the world stands still
        simTime += dt;
        stepGame(game, menu?.open || ending.open ? emptyInput() : frame);
      },
      render(blend) {
        const alpha = pause.open || map.open ? 1 : blend;
        const time = simTime + alpha / SIM.hz;
        input.sensitivity = settings.sensitivity;
        state.cap = settings.fxCap;
        if (lowRes !== state.enabled.pixelate || scale !== settings.resolution) {
          [lowRes, scale] = [state.enabled.pixelate, settings.resolution];
          resize();
        }
        placeCamera(camera, game, alpha);
        hurt.update(pipeline.post, camera, time);
        const at = game.ecs.c.transform.get(game.player.id)!.pos;
        world?.update(at.x, at.z);
        views.update(alpha, time);
        placeLantern(game, alpha);
        creatures.update(alpha, time, camera);
        hidden.update(time);
        fights.update(alpha, time);
        combatFx.update();
        bossFx.update(alpha, time, camera);
        particles.update(time, camera);

        fxController.update(state, camera.position, time);
        const fx = computeFx(state);
        applyReality(fx, game.reality);
        lightReality(game.reality);
        audio.update(fx, time, camera, pause.open || map.open);
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

/** Settings, the audio engine and the drones, made once for the page. */
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
  const shell: Shell = { settings, change, store, engine, drones: createDrones(engine) };
  return shell;
}

/** The title screen, with its music, until a choice starts the world. */
function title(opts: StartOptions, shell: Shell): void {
  shell.music = playMenuMusic(shell.settings.volume);
  showTitle({
    hasSave: !!(shell.store && loadSave(shell.store)),
    settings: shell.settings,
    change: shell.change,
    start(fresh) {
      shell.music?.fadeOut(2.5);
      shell.music = undefined;
      startGame({ ...opts, fresh }, shell);
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
