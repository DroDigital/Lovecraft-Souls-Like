/**
 * Entry: the title screen, then the open world (saved to localStorage; `?fresh` skips the title and
 * starts anew), the combat arena (`?arena`, or `?spawn=<id>[&variant=eldritch|boss]` to add a roster
 * creature), `?bestiary`, or the `?look` test. `?debug` shows the debug panel (as the arena does)
 * and exposes the game on `window`. Settings, the audio engine and the veil outlive the title
 * screen (shell.ts); the world is made under the veil in steps, a frame drawn between them so its
 * sign breathes and its line fills (loading.ts), and every long jump after passes under it (journeys.ts).
 */

import { PerspectiveCamera, Vector3 } from 'three';
import { createInput, emptyInput } from './core/input';
import { startLoop } from './core/loop';
import { LIGHT, RENDER, SIM } from './data/tuning';
import type { Variant } from './data/registry';
import { createActorViews } from './render/actorViews';
import { createGameAudio } from './render/audio/gameAudio';
import { playMenuMusic } from './render/audio/music';
import { createBossFx } from './render/bossFx';
import { createCinema } from './render/cinema';
import { createDirector, wakeKneeling } from './render/cinemaDirector';
import { createCombatFx } from './render/combatFx';
import { createEchoFx } from './render/echoFx';
import { createImpactFx } from './render/impactFx';
import { createShadows } from './render/shadows';
import { createSignViews } from './render/signViews';
import { createSky } from './render/sky';
import { createVolumetricFog } from './render/volumetricFog';
import { createWorldLife } from './render/worldLife';
import { createWorldLights } from './render/worldLights';
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
import { updateWorldUniforms, worldUniforms } from './render/worldMaterial';
import { FEEL } from './render/feel';
import { createGame, createWorldGame, stepGame } from './systems/game';
import { clearSave, loadSave } from './systems/save';
import { haltAutosave, saveNow, startAutosave } from './ui/autosave';
import { showCrash } from './ui/crashScreen';
import { startBestiary } from './ui/bestiary';
import { HINTS, panelOptions, playerStats, spawnHint, worldStats } from './ui/debugHooks';
import { createCinemaUi } from './ui/cinemaUi';
import { createDebugPanel } from './ui/debugPanel';
import { createEndingCard, NEW_GAME_FLAG } from './ui/endingCard';
import { createHud } from './ui/hud';
import { startLookTest } from './ui/lookTest';
import { nextFrame, spriteAtlas } from './ui/loading';
import { createMapPainter } from './ui/mapPainter';
import { createMapScreen } from './ui/mapScreen';
import { createPauseMenu } from './ui/pauseMenu';
import { createDialogue } from './ui/dialogue';
import { showIntro, type Intro } from './ui/intro';
import { journalPage } from './ui/journal';
import { armsPage } from './ui/armsPage';
import { createJourneys } from './ui/journeys';
import { createShell, type Shell } from './ui/shell';
import { createSignMenu, type SignMenu } from './ui/signMenu';
import { createSkyline } from './render/skyline';
import { achievementsPage, watchAchievements } from './ui/achievements';
import { createShopMenu } from './ui/shopMenu';
import { takeCarry } from './systems/records';
import { takeFlag, title } from './ui/titleFlow';
import { createArenaScene } from './world/arenaScene';
import { roofedAt } from './world/terrain';

const INTERACT_GRACE_MS = 350; // after a talk or a menu closes, E is held back this long

interface StartOptions {
  debug: boolean; // exposes the game (and the world scene) on `window` for console poking and scripted checks
  arena: boolean; // the combat arena instead of the open world
  fresh?: boolean; // the open world: forget the save and start anew
  intro?: boolean; // show the new game's opening first (not with ?fresh, which is for testing)
  creature?: string;
  variant?: Variant;
}

async function startGame(opts: StartOptions, shell: Shell): Promise<void> {
  const { debug, creature, variant } = opts;
  const { settings, veil } = shell;
  if (!veil.covered) veil.darken(); // the world is made out of sight
  const made = (share: number): Promise<void> => (veil.progress(share), nextFrame());
  const state: FxState = { sanity: 100, cap: settings.fxCap, anomalyProximity: 0, enabled: allEffectsOn() };
  let pipeline: ReturnType<typeof createPipeline>;
  try {
    pipeline = createPipeline(document.body);
  } catch (e) {
    return showCrash('webgl', e instanceof Error ? e.message : String(e)); // no WebGL 2: say so, rather than black
  }
  const canvas = pipeline.renderer.domElement;
  canvas.addEventListener('webglcontextlost', (e) => (e.preventDefault(), saveNow(), showCrash('lost')));
  const store = opts.arena ? null : shell.store;
  if (store && opts.fresh) clearSave(store);
  const carry = store && opts.fresh ? takeCarry(store) : null; // a new journey, begun from an ending (NG+)
  const game = opts.arena ? createGame({ creature, variant }) : createWorldGame({ save: (store && loadSave(store)) ?? undefined, carry: carry ?? undefined });
  if (opts.intro && !opts.arena) wakeKneeling(game); // the wake (render/cinema.ts) begins on one knee
  const capture = (): void => {
    try {
      const r: unknown = canvas.requestPointerLock();
      if (r instanceof Promise) r.catch(() => undefined);
    } catch {
      // No pointer lock: a click on the canvas captures the mouse, as ever.
    }
  };
  const reveal = (): void => {
    shell.music?.fadeOut(); // the title's theme plays on until the world shows, then sinks away under its ambience
    shell.music = undefined;
    if (opts.intro) director.wake(); // a new game: the investigator wakes in the dream (round 20)
  };
  const journeys = createJourneys(game, veil, () => pipeline.warm(scene, camera).then(nextFrame)); // before the veil lifts, once the GPU has caught up
  const intro: Intro | null = opts.intro ? showIntro(() => (capture(), journeys.arrive(reveal))) : null; // the world is made behind it
  if (!intro) journeys.arrive(reveal); // names where the investigator wakes while the world is made
  await made(0.1);
  const lights = createWorldLights();
  const world = opts.arena ? null : createWorldScene(lights);
  const scene = world?.scene ?? createArenaScene();
  scene.add(lights.halos);
  const menu: SignMenu | null = opts.arena ? null : createSignMenu(game, journeys.go);
  const ending = createEndingCard(game, store, () => (shell.music = playMenuMusic(shell.engine, settings.volume))); // the title's theme again, under an ending
  const pause = createPauseMenu({
    settings,
    change: shell.change,
    saveKeys: shell.saveKeys,
    resume: capture,
    map: opts.arena ? undefined : () => map.show(),
    journal: opts.arena ? undefined : (back, show) => journalPage(game, back, show),
    arms: (back, show) => armsPage(game, back, show),
    achievements: opts.arena ? undefined : (back) => achievementsPage(store, back),
    quit: () => void veil.cover('', 0.8).then(() => (location.href = location.pathname)),
    held: () => cinema.active, // a cutscene has the screen
  });
  if (store) startAutosave(game, store);
  if (!opts.arena) watchAchievements(game, store);
  const views = createActorViews(scene, game);
  const creatures = createCreatureViews(scene, game, await spriteAtlas((p) => veil.progress(0.1 + 0.4 * p)));
  const hidden = createHiddenViews(scene, game);
  const fights = createFightViews(scene, game);
  const fxController = createFxController(game);
  const audio = createGameAudio(shell.engine, shell.drones, game);
  const particles = createParticles(scene);
  const combatFx = createCombatFx(game, particles);
  const impactFx = createImpactFx(game, particles); // round 20: the weight of the investigator's blows
  const echoFx = createEchoFx(game, particles, audio); // round 20: a slain foe's Echoes leave the body and are drawn into the investigator
  const cinema = createCinema(game, createCinemaUi(), audio, particles, { enabled: () => settings.cutscenes > 0.5 }); // round 20: wake, arrivals, falls, endings
  const director = createDirector(game, cinema, (id) => ending.show(id));
  const signs = createSignViews(scene, game, particles, lights);
  const bossFx = createBossFx(scene, game, particles);
  const shadows = createShadows(scene, game);
  const sky = createSky();
  const mist = createVolumetricFog(pipeline.post); // round 16
  const life = createWorldLife(scene, game, audio, { sky: sky.mesh, post: pipeline.post, sheet: creatures.sheet }); // round 18: the world's own life
  scene.add(sky.mesh);
  const skyline = createSkyline(scene);
  const hurt = createHurtFx(game);
  const camera = new PerspectiveCamera(RENDER.fovDeg, RENDER.width / RENDER.height, RENDER.near, RENDER.far);
  const input = createInput(canvas);
  const dialogue = createDialogue(game);
  const shop = createShopMenu(game);
  const painter = createMapPainter(game);
  const hud = createHud(game, canvas, painter, echoFx.pending);
  const map = createMapScreen(game, painter, capture, journeys.go);
  const panel = debug || opts.arena ? createDebugPanel(state, [...HINTS, ...(opts.arena ? spawnHint(creature, variant) : [])], panelOptions(game, settings, shell.change)) : null;
  lightNight();
  worldUniforms.uGlowColor.value.set(...ANOMALY.green).multiplyScalar(LIGHT.echoGlowIntensity); // Echo drops glow
  worldUniforms.uGlowRange.value = LIGHT.echoGlowRange;
  const noGlow = new Vector3(0, -1e4, 0);
  if (debug) Object.assign(window, { game, world, audio: shell.engine, life, cinema });
  placeCamera(camera, game, 1);
  void pipeline.compile(scene, camera); // compiling while the chunks are built (in parallel, where the browser can)
  await made(0.55);

  let lowRes = state.enabled.pixelate;
  let scale = settings.resolution;
  const resize = (): void => pipeline.resize(lowRes, scale);
  resize();
  addEventListener('resize', resize);

  let simTime = 0;
  let frames = 0;
  let statsAt = performance.now();

  let heldAt = 0; // when a talk or a menu last held the investigator
  startLoop(
    {
      step(dt) {
        const frame = input.poll(); // polled even when unused, so no press is left latched for later
        if (menu?.open || shop.open || dialogue.open || pause.open || map.open) heldAt = performance.now();
        else if (performance.now() - heldAt < INTERACT_GRACE_MS) frame.pressed.interact = false; // E mashed through a talk does not rest at the sign behind it (round 17)
        const through = pause.open || map.open || dialogue.reading || intro?.open ? null : journeys.before(frame);
        if (!through) return; // the world stands still
        simTime += dt;
        if (!cinema.step(dt)) return; // a cutscene: the world stands still, or takes only some of its steps
        stepGame(game, menu?.open || shop.open || ending.open || dialogue.talking || cinema.active ? emptyInput() : through); // talking, the world goes on while the investigator listens
      },
      render(blend) {
        const still = pause.open || map.open || dialogue.reading || !!intro?.open || journeys.still;
        const alpha = still || cinema.frozen ? 1 : cinema.alpha(blend);
        const time = simTime + alpha / SIM.hz;
        input.sensitivity = settings.sensitivity;
        input.invertY = settings.invertY > 0.5;
        FEEL.shake = settings.shake;
        pipeline.post.uniforms.uGamma.value = 1 / settings.brightness;
        state.cap = settings.fxCap;
        if (lowRes !== state.enabled.pixelate || scale !== settings.resolution) {
          [lowRes, scale] = [state.enabled.pixelate, settings.resolution];
          resize();
        }
        placeCamera(camera, game, alpha);
        cinema.update(camera, still ? 0 : blend); // over the follow camera's pose
        hud.hide(cinema.active);
        const enclosed = !!world && roofedAt(camera.position.x, camera.position.z); // open ruins keep the sky (round 13)
        sky.update(camera, time, game.overworld?.region ?? null, enclosed);
        const feet = game.ecs.c.transform.get(game.player.id)!.pos.y;
        mist.update(camera, time, { region: game.overworld?.region ?? null, enclosed, ground: feet, stress: Math.min(1 - game.mind.sanity / 100, settings.fxCap), setting: settings.fog });
        skyline.update(camera, time, game.overworld?.region ?? null, enclosed);
        hurt.update(pipeline.post, camera, time);
        impactFx.update(camera, time);
        const at = game.ecs.c.transform.get(game.player.id)!.pos;
        world?.update(at.x, at.z, journeys.budget);
        journeys.update(world?.pending ?? 0);
        views.update(alpha, time);
        placeLantern(game, alpha);
        lights.update(camera.position, time, views.flame);
        creatures.update(alpha, time, camera);
        hidden.update(time);
        fights.update(alpha, time);
        combatFx.update();
        echoFx.update(time);
        signs.update(time, camera.position);
        bossFx.update(alpha, time, camera);
        shadows.update(alpha);
        particles.update(time, camera);
        fxController.update(state, camera.position, time);
        const fx = computeFx(state);
        applyReality(fx, game.reality);
        lightReality(game.reality);
        life.update(camera, time, enclosed); // after the night's light: the lightning adds to it
        audio.update(fx, time, camera, still);
        const lens = lensAt(fx, time);
        applyLens(camera, cinema.lensFov(lens.fovDeg), lens.skew);
        updateWorldUniforms(fx, time, camera.position, views.glow ?? noGlow, pipeline.size);
        updatePostUniforms(pipeline.post, fx, time, pipeline.size);
        if (!veil.covered) pipeline.render(scene, camera); // nothing shows under the veil: its frames go to the making
        hud.update(camera);
        if (!panel) return;
        panel.refresh();
        frames++;
        const now = performance.now();
        if (now - statsAt >= 500) {
          const fps = Math.round((frames * 1000) / (now - statsAt));
          panel.setStats(`${fps} fps · ${pipeline.renderer.info.render.calls} draws\n${playerStats(game)}${world ? worldStats(game, world) : ''}`);
          [frames, statsAt] = [0, now];
        }
      },
    },
    SIM.hz,
    SIM.maxFrameSeconds,
    (e) => (console.error(e), haltAutosave(), showCrash('error', e instanceof Error ? e.message : String(e))), // a frame threw: stop, and say so
  );
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
  if (opts.arena || opts.fresh) void startGame(opts, createShell());
  else if (takeFlag(NEW_GAME_FLAG)) void startGame({ ...opts, fresh: true, intro: true }, createShell()); // begun anew from an ending
  else {
    const shell = createShell();
    title(shell, (fresh) => void startGame({ ...opts, fresh, intro: fresh }, shell));
  }
}
