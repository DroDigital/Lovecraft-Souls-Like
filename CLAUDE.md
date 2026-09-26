# CLAUDE.md

Lovecraftian open-world soulslike in retro 3D. **Spec: `docs/SPEC.md`.** At session start read it and this
file, then do only the phase named in the message. Log judgment calls in `docs/DECISIONS.md`.

## Commands
- `npm run dev`: title (it opens out of the dark with its theme on the first key or click, at once where the browser allows sound; New game opens on the intro), then the open world saved to localStorage (click captures the mouse; E rests,
  talks, passes gates; R Reagent, T Laudanum; M map (click a lit ★ twice: travel); Esc/Start: pause, map, journal, settings, controls). `?fresh` new game, no title; `?arena` combat arena; `?bestiary` every roster entity (click to fight); `?spawn=<id>
  [&variant=eldritch|boss]`; `?look` look test (1–9, drag/wheel/O); `?debug` debug panel (sliders, H hides) + `window.game`/`world`/`audio`.
- `npm run check`: typecheck + Vitest. Must pass before every commit.
- `npm run build`: typecheck + production build into `dist/`.

## Folder map
- `src/core`: 60 Hz loop with interpolation, ECS (typed Maps), typed event bus, input (keys/mouse/pad → `InputFrame`), geom, rng, noise, time `slicer`.
- `src/systems`: the simulation, no Three.js. `game.ts` builds the world and fixes the system order; actions + input buffer, movement, combat, revolver, stamina, lock-on (+ `targets`), camera rig, archetype `brain` + `perception` + `tactics` (the hunt: awareness, noise, pack calls, search; turn-taking in a fight), `creatures` (EntityDef → combatant), death/Echoes, `levels` (Echoes buy Vigour, Endurance, Might), `arms` (weapons owned and in hand), `reagent` (healing); the mind: `sanity`, `insight`, hooks `hiddenLayer`, `variantSwap`, `hallucinations`; the world: `overworld`, `population`, `checkpoints` (signs, travel, gates, interact), `exploration` (the map's fog), `npcs` + `quests` (+ `lead`: where the main line leads), `save`; bosses: `bossFight` (phases), `bossArena` (ring bond, sidesteps), `specials` + `projectiles` + `hazards` + `strikes` (attack effects: marks, quakes, sweeps, barrages, vortices), `reality` + `realityTricks` (hooks), `arenaChanges`, `signatures/` (+ Hastur's calling, Nyarlathotep's watching), `fightActions` (E), `endings`.
- `src/render`: pipeline, post pass (grade + hurt vignette), world material, `lantern.ts` (night: moon + lantern), `worldLights` (lamps, fires, torches, windows: point lights + halos), `sky` (moon, stars, haze per realm), `shaders/` (+ `eldritch`), palette, textures (+ `textureMasonry`), `fx.ts`; figures (+ `investigator`, `npcFigures`) + `poses.ts` + `swings.ts` + `gait.ts` (strides, feet on the ground) + `poseBlend` (crossfades), actor views, follow camera; `sprites/` (pixel sprite generator + atlas + `skins`), `assemblies` (colossi), `eldritch` (tier wrongness, echoes, halos), `creatureViews`, `hiddenViews`; `fxController` (sanity FX hook), `hurtFx`, `particles` + `combatFx`, `shadows`; `worldScene` (chunk streaming) with `terrainMesh`, `propMeshes` (+ `propShapes`, `houseMesh`, `groundCover`), `siteMeshes`, `signMeshes` + `signViews` (the Elder Signs' shrines: glow, runes, motes, flares); `fightViews` (bolts, pools, props, water) + `realityFx`; `bossFx` = `telegraphs` (on `decals`) + `beams` + `attackFx`; `rigidBatch` (colossi in ≤3 draws); `audio/` (engine, synth, drones, cues, gameAudio, music, `bossMusic`, `sampler` + `ambience` + `foley`: the recorded sounds).
- `src/data`: `tuning.ts` holds every tunable number (boss numbers in `bossTuning`, play numbers in `playTuning`, re-exported); `schema`, `roster` (every id), `entities/` (one file per tier), `registry`, `validate`, `archetypes`, `attacks`, `regions` (+ `regionFeatures`: roads, towns, features); `moves` + `weapons` (the investigator's arms), `placeholders` (dummy + Deep One), `arena`; `sites`, `dungeons` and `lairs` (the world's places and room graphs); story: `intro`, `npcs`, `quests`, `documents`; `endings`; `sounds` + `voices` (audio recipes) + `samples` (recorded sets, ambience) + `music` (boss scores).
- `src/world`: pure world math: `worldMap`, `land` + `terrain`, `placements` (resolved sites), `regionPlan` (+ `roads`, `features`, `planSpawns`, `props`), `chunks`, `streaming`, `dungeonKit` + `dungeonParts`, `worldCollision`, `validateWorld`, `mapData` (realms, map places), `shrine` (an Elder Sign's layout and colliders); colliders, arena collision + meshes, Phase 0 test scene.
- `src/ui`: HUD (+ `mindHud`, `bossHud`, `foeBars`, `hints`, `hudKit`), debug panel (+ `debugHooks`), `veil` + `journeys` (long jumps and loading under a transition) + `loading` (the world made in steps, sprites drawn ahead), `shell` (what outlives the title), `menuKit` (screens, keys/pad nav) for `titleScreen`, `intro`, `pauseMenu`, `menuPages`, `journal`, `dialogue` (talk + read), Elder Sign `signMenu`, `endingCard`; the map: `minimap` + `mapScreen` (+ `mapTravel`) over `mapPainter` + `mapArt` (+ `leadMark`); `settings`, `autosave`, `?bestiary`, `?look` look test, orbit rig.
- `tests/`: Vitest, runs in Node; `helpers.ts` scripts inputs and a hand-driven Deep One.
- `docs/`: SPEC.md, DECISIONS.md.

## Rules (spec §0, condensed)
- Do only the requested phase; never scaffold later ones. Plan in ≤15 lines, then execute without asking.
- Ambiguity: pick the simplest option that fits the spec, log one line in `docs/DECISIONS.md`, keep going.
- No file dumps or large diffs in chat. End each phase with a ≤10-line summary and a git commit.
- Surgical edits. Files under 300 lines with one responsibility each.
- Verify with `npm run check` and read only the failing output. Never open `node_modules/` or `dist/`.
- No asset files: textures, sprites, meshes and audio are generated in code. Exceptions: the title theme (`public/music`) and the recorded sounds (`public/audio`: CC0 recordings cut and treated for the game, each credited in its `CREDITS.md`; playtest round 6).
- Creatures are data, not classes (15–30 lines each); boss phase scripts are data too.
- Deps: `three` (+ `@types/three`), `typescript`, `vite`, `vitest`. Ask before adding anything else.
- Simulation code (combat, stamina, sanity, AI, registry, streaming math) must not import Three.js.
- Out of scope: multiplayer, skeletal animation, imported models/textures, mobile.

## Conventions
- Sim: fixed system order in `stepGame`; moves are 60 Hz frame windows `[from, to)`; yaw 0 faces +z, right = (−cos, sin).
- Colours are display sRGB end to end (`ColorManagement` off); every material is a `ShaderMaterial`.
- World materials share one uniform set (`worldUniforms`). FX flow: `FxState → computeFx() → update*Uniforms()`.
- Sanity FX are `[calm, mad]` ramps in `tuning.ts`, blended by stress = min(1 − sanity/100, fx cap); hooks listen to `SanityBandChanged`/`InsightChanged`.
- New creature: its id in `roster.ts` + an entry in its tier file (a `voice`, or its tier's); `npm run check` runs `validateRegistry()`.
