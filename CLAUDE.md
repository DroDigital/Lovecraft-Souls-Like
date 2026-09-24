# CLAUDE.md

Lovecraftian open-world soulslike in retro 3D. **Spec: `docs/SPEC.md`.** At session start read it and this
file, then do only the phase named in the message. Log judgment calls in `docs/DECISIONS.md`.

## Commands
- `npm run dev`: the open world, saved to localStorage (click to capture the mouse; E rests at an Elder Sign; debug panel sliders drive
  sanity/insight; H hides it). `?fresh` new game; `?arena` combat arena; `?bestiary` every roster entity (click to fight it); `?spawn=<id>
  [&variant=eldritch|boss]`; `?look` Phase 0 look test (1–9 toggle effects, drag/wheel/O orbit); `?debug` exposes `window.game`/`world`.
- `npm run check`: typecheck + Vitest. Must pass before every commit.
- `npm run build`: typecheck + production build into `dist/`.

## Folder map
- `src/core`: 60 Hz loop with interpolation, ECS (typed Maps), typed event bus, input (keys/mouse/pad → `InputFrame`), geom, rng, noise, time `slicer`.
- `src/systems`: the simulation, no Three.js. `game.ts` builds the world and fixes the system order; actions + input buffer, movement, combat, revolver, stamina, lock-on, camera rig, archetype `brain` + `perception`, `creatures` (EntityDef → combatant), death/Echoes; the mind: `sanity`, `insight`, hooks `hiddenLayer`, `variantSwap`, `hallucinations`; the world: `overworld`, `population`, `checkpoints` (signs, travel, gates), `save`.
- `src/render`: pipeline, post pass (grade + character rim), world material, `lantern.ts` (arena light), `shaders/`, palette, textures, `fx.ts`; figures + `poses.ts`, actor views, follow camera; `sprites/` (pixel sprite generator + atlas), `assemblies` (colossi), `creatureViews`, `hiddenViews`; `fxController` (sanity FX hook) + `audioFx`; `worldScene` (chunk streaming) with `terrainMesh`, `propMeshes`, `siteMeshes`, `signMeshes`.
- `src/data`: `tuning.ts` holds every tunable number; `schema`, `roster` (every id), `entities/` (one file per tier), `registry`, `validate`, `archetypes`, `attacks`, `regions`; `moves`, `placeholders` (dummy + Deep One), `arena`; `sites` and `dungeons` (the world's places and room graphs).
- `src/world`: pure world math: `worldMap`, `land` + `terrain`, `placements` (resolved sites), `chunks`, `streaming`, `dungeonKit` + `dungeonParts`, `worldCollision`, `validateWorld`; colliders, arena collision + meshes, Phase 0 test scene.
- `src/ui`: HUD, debug panel, Elder Sign `signMenu`, `autosave`, `?bestiary`, `?look` look test, orbit rig.
- `tests/`: Vitest, runs in Node; `helpers.ts` scripts inputs and a hand-driven Deep One.
- `docs/`: SPEC.md, DECISIONS.md.

## Rules (spec §0, condensed)
- Do only the requested phase; never scaffold later ones. Plan in ≤15 lines, then execute without asking.
- Ambiguity: pick the simplest option that fits the spec, log one line in `docs/DECISIONS.md`, keep going.
- No file dumps or large diffs in chat. End each phase with a ≤10-line summary and a git commit.
- Surgical edits. Files under 300 lines with one responsibility each.
- Verify with `npm run check` and read only the failing output. Never open `node_modules/` or `dist/`.
- No asset files: textures, sprites, meshes and audio are generated in code.
- Creatures are data, not classes (15–30 lines each); boss phase scripts are data too.
- Deps: `three` (+ `@types/three`), `typescript`, `vite`, `vitest`. Ask before adding anything else.
- Simulation code (combat, stamina, sanity, AI, registry, streaming math) must not import Three.js.
- Out of scope: multiplayer, skeletal animation, imported models/textures, mobile.

## Conventions
- Sim: fixed system order in `stepGame`; moves are 60 Hz frame windows `[from, to)`; yaw 0 faces +z, right = (−cos, sin).
- Colours are display sRGB end to end (`ColorManagement` off); every material is a `ShaderMaterial`.
- World materials share one uniform set (`worldUniforms`). FX flow: `FxState → computeFx() → update*Uniforms()`.
- Sanity FX are `[calm, mad]` ramps in `tuning.ts`, blended by stress = min(1 − sanity/100, fx cap); hooks listen to `SanityBandChanged`/`InsightChanged`.
- New creature: its id in `roster.ts` + an entry in its tier file; `npm run check` runs `validateRegistry()`.
