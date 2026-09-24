{\rtf1\ansi\ansicpg1252\cocoartf2907
\cocoatextscaling0\cocoaplatform0{\fonttbl\f0\fswiss\fcharset0 Helvetica;}
{\colortbl;\red255\green255\blue255;}
{\*\expandedcolortbl;;}
\paperw11900\paperh16840\margl1440\margr1440\vieww11520\viewh8400\viewkind0
\pard\tx720\tx1440\tx2160\tx2880\tx3600\tx4320\tx5040\tx5760\tx6480\tx7200\tx7920\tx8640\pardirnatural\partightenfactor0

\f0\fs24 \cf0 # [WORKING TITLE] \'97 Technical Spec\
A Lovecraftian open-world soulslike in retro 3D (Doom sprites + PS1-era worlds).\
Built with Claude Code, one phase per session. At the start of each session, read this file and CLAUDE.md, then do only the phase named in the message.\
\
## 0. Working rules (these keep cost down)\
- Do only the requested phase. Never scaffold later phases "in advance."\
- Write a plan of 15 lines or fewer, then execute without asking for confirmation. Stop only if blocked.\
- If something is ambiguous, pick the simplest option that fits this spec, log it as one line in `docs/DECISIONS.md`, and keep going.\
- Never echo file contents or large diffs in chat. End each phase with a summary of 10 lines or fewer, plus a git commit.\
- Make surgical edits. Never rewrite a whole file for a small change. Keep files under 300 lines with one responsibility each.\
- Verify with `npm run check` (typecheck + tests). Read only the failing output. Never open `node_modules/` or `dist/`.\
- No asset files. Textures, sprites, meshes, and audio are all generated in code.\
- Creatures are data, not classes. A typical entity is 15\'9630 lines of data. Bosses get phase scripts, and those are data too.\
- Dependencies are limited to `three`, `typescript`, `vite`, and `vitest`. Ask before adding anything else.\
- Out of scope: multiplayer, skeletal animation, imported models/textures, mobile.\
\
## 1. Stack & architecture\
- TypeScript (strict) + Three.js (WebGL2) + Vite, with Vitest for tests. Runs in the browser, with keyboard/mouse and the Gamepad API for input.\
- Minimal hand-rolled ECS:\
  - numeric entity ids\
  - components stored in typed Maps\
  - systems are plain functions run in a fixed order\
  - fixed 60 Hz simulation with interpolated rendering\
- Simulation logic must not import Three.js, so it stays unit-testable in Node. This covers combat, stamina, sanity, AI decisions, the registry, and streaming math.\
- No physics engine. Use a kinematic capsule vs. heightfield, simple box/cylinder colliders, and sphere/capsule hitbox sweeps.\
- A typed event bus carries cross-system signals.\
- Folder layout:\
  - `src/core`: ecs, loop, events, input, rng\
  - `src/render`: pipeline, shaders, procedural textures, sprite generator\
  - `src/systems`\
  - `src/data`: roster, entities by tier, archetypes, attacks, regions, tuning\
  - `src/world`\
  - `src/ui`\
  - `tests/`\
- All gameplay numbers live in `src/data/tuning.ts`.\
\
## 2. Art direction: retro 3D\
The look is Doom's billboarded sprites plus PS1-era low-poly worlds, with a third-person soulslike camera. The world is oppressive, foggy, and nearly colorless. Color means something is wrong.\
\
- **Resolution:** render to a low-res target (default 400\'d7225, configurable) and upscale with nearest-neighbor filtering.\
- **World geometry:**\
  - low-poly and vertex-lit\
  - procedural 64\'d764 textures: stone, wood, rot, wet flesh, water\
  - vertex snapping\
  - affine texture wobble, emulated because WebGL2 has no `noperspective`: pass uv\'b7w and divide in the fragment shader\
  - dense fog fading to near-black, which also hides chunk streaming\
- **Creatures:** instanced billboard sprites, generated at startup from each entity's `sprite` recipe.\
  - A recipe is a silhouette archetype + palette + feature params (eye count, tentacles, wings, limbs, glow, scale).\
  - Each state gets 2\'964 frames, and everything is packed into one atlas.\
  - Colossal bosses are low-poly primitive assemblies (segment-chain tentacles, lathed bodies) built from the same data.\
- **Palette:** charcoal, bone, rust, sea-grey. The saturated anomaly colors are Eldritch Magenta `#D80073`, Cosmic Purple `#6A0DAD`, and Void Green `#2BFFA0`, and nothing else in the world gets saturation.\
- **Post-processing:** one fullscreen post pass handles everything:\
  1. Color isolation: desaturate toward bone/sepia, except hues near the anomaly colors, which get boosted by an `anomalyProximity` uniform.\
  2. Palette quantization (64 colors or fewer) with 4\'d74 Bayer dithering.\
  3. Sanity warp: UV ripple and chromatic split, scaled by (1 \uc0\u8722  sanity/100).\
- **Non-Euclidean distortion:** sanity-driven vertex displacement is injected into all world materials, plus camera FOV "breathing" and a slight projection skew. Clamp it so combat stays readable, and expose an intensity cap in settings for accessibility.\
- **Budgets:** 60 fps on integrated GPUs, at most 150 draw calls, at most 60 active AI, and roughly 80 m view distance.\
\
## 3. Core systems\
\
### A. Sanity & Insight (reality processor)\
- `sanity` ranges from 0 to 100. `insight` is an integer, 0 or higher.\
- Sanity has four bands, with 3-point hysteresis on the boundaries:\
  - Lucid: 70 and above\
  - Uneasy: 40\'9670\
  - Fractured: 15\'9640\
  - Unmoored: below 15\
- The system emits `SanityBandChanged` and `InsightChanged` events.\
- Sanity drains from:\
  - being near an entity with a `sanityAura`\
  - specific attacks\
  - the first sight of any greater-tier or higher entity\
- Sanity is restored at checkpoints and by consumables. Low sanity raises both damage dealt and damage taken.\
- Insight is gained from the first sight of named or boss entities, and from tomes. It can be spent on upgrades, but spending it re-hides whatever it revealed.\
- World hooks are components that listen to the event bus:\
  1. `HiddenLayer \{minInsight?, maxSanity?\}`: eldritch geometry, bridges, and doors that exist only for the enlightened.\
  2. `VariantSwap`: at Fractured or lower, entities switch to their `eldritchVariant` overrides.\
  3. FX controller: sets shader uniforms and applies audio detune/distortion.\
  4. Hallucinations (Unmoored only): fake enemies that deal sanity damage and vanish when struck.\
\
### B. Combat & controller\
- Kinematic capsule controller, with a third-person camera that pulls in on collision.\
- Input buffer: one queued action with a 150 ms window. It is consumed at the end of recovery or at a cancel window.\
- Actions:\
  - light and heavy attacks, with combo chains defined in data\
  - directional dodge roll, with i-frames defined as a frame window\
  - backstep and sprint\
  - block, which takes stamina damage on hit\
  - parry window\
  - off-hand 1920s revolver: low damage, but a well-timed shot interrupts (Bloodborne-style)\
- Stamina: each action has a cost, regen is delayed after spending, and hitting zero causes a guard break.\
- Poise and stagger apply to both the player and enemies. Hits get 2\'964 frames of hitstop.\
- Lock-on:\
  - targets must be within 25 m with line of sight\
  - candidates are scored by distance plus angle from the camera's forward direction\
  - the player can switch targets left/right\
  - lock breaks automatically on range or LOS loss\
- Animation is procedural (tweened primitives and sprite frames). No skeletal assets.\
- Death: the player drops currency ("Echoes") where they fell and respawns at the last Elder Sign (checkpoint). Non-boss enemies reset. Touching the drop recovers it.\
\
### C. Entity registry\
- `src/data/roster.ts` holds every id from \'a74 and is the source of truth.\
- `EntityDef` fields:\
  - `id`, `name`, `tier`, `source` (the story title), `regions[]`, `canonLooks: boolean`\
  - `sprite` or `assembly`\
  - `behavior \{archetype, params\}`\
  - `stats \{hp, poise, damage, speed, sanityAura, sanityDamage\}`\
  - `resist`/`weak`, `drops`, `insightOnSight`\
  - `eldritchVariant?` (partial overrides)\
  - `hidden? \{minInsight?, maxSanity?\}`\
  - `bossScript?`\
- Behavior archetypes are shared finite state machines with perception:\
  - `pack_hunter`, `ambusher`, `brute`, `skirmisher`, `caster`\
  - `flyer_swoop`, `hover_ranged`, `burrower`, `swarm`\
  - `invisible_stalker`, `mind_thief`, `stationary_horror`\
  - `boss`, `ally`\
- Each entity picks one archetype and tunes it with params. Add a new archetype only if three or more entities need it.\
- A `validateRegistry()` test must check that:\
  - every roster id has a definition\
  - every reference (variant, attack, archetype, region) resolves\
  - all numbers are in range\
- Debug routes:\
  - `?bestiary` shows every sprite with its name and tier; clicking one spawns it in an arena.\
  - `?spawn=<id>` spawns an entity directly.\
- Where Lovecraft barely describes something (Hastur, Nug, Yeb, the Unnamable\'85), design from the textual hints and set `canonLooks: false`.\
- Scope is Lovecraft's own fiction, including his revisions and collaborations.\
  - Exclude later-mythos additions such as Cthugha, Ithaqua, Byakhee, Hunting Horrors, Dark Young, and the Tcho-Tcho.\
  - If you are confident something from his fiction is missing from \'a74, add it and log it in DECISIONS.md.\
\
### D. World\
- Streaming:\
  - 64 m chunk grid\
  - load a 5\'d75 area around the player, and unload chunks beyond 7\'d77\
  - chunk generation is time-sliced to 2 ms per frame or less\
- Terrain:\
  - a seeded noise heightfield per region, driven by that region's biome params\
  - props and landmarks come from region data\
  - legacy dungeons are built from a primitive kit (corridor, hall, stair, pit, bridge, well), described as room graphs in data\
- Elden Ring structure:\
  - a central hub\
  - open regions, each with a legacy dungeon and a region boss\
  - Elder Sign checkpoints, with fast travel between discovered ones\
  - optional bosses scattered through the open world\
- The Dreamlands are entered by resting at the hub's special Elder Sign. The path is: 70 Steps of Light Slumber \uc0\u8594  Cavern of Flame \u8594  700 Steps of Deeper Slumber.\
\
| Region | Legacy dungeon | Boss(es) |\
|---|---|---|\
| Hub: Miskatonic University | University Library | \'97 |\
| Arkham & the Blasted Heath | The Witch House | Colour Out of Space; Keziah Mason & Brown Jenkin |\
| Dunwich & the Round Hills | Sentinel Hill | Dunwich Horror; Shub-Niggurath (optional) |\
| Innsmouth & Devil Reef | Y'ha-nthlei | Father Dagon & Mother Hydra |\
| Providence & Kingsport | Curwen's catacombs; Starry Wisdom church | Joseph Curwen; Haunter of the Dark |\
| Vermont Hills | Akeley farmhouse / Mi-Go outpost | The Whisperer in Akeley's Chair |\
| Mountains of Madness | Elder Thing city | Elder Shoggoth (boss variant of Shoggoth) |\
| Pnakotus | Archives of the Great Race | Polyp Swarm (boss variant of Flying Polyp) |\
| K'n-yan & N'kai | Tsath | Yig; Tsathoggua; Nug & Yeb (optional) |\
| Dreamlands | Ulthar \uc0\u8594  Leng \u8594  Vaults of Zin \u8594  Kadath | High Priest Not to Be Described; Bokrug; the Great Ones & Nyarlathotep |\
| Mu & R'lyeh | Risen R'lyeh | Ghatanothoa; Cthulhu |\
| Yuggoth | Mi-Go cities | Rhan-Tegoth; Hastur |\
| Beyond the Gate | The Ultimate Void | 'Umr at-Tawil \uc0\u8594  Yog-Sothoth \u8594  Azathoth's Court |\
\
Place every other entity in the spawn tables of its best-fitting region.\
\
### E. Bosses\
- `bossScript` is data: `phases[] \{hpBelow, attacks[] (weighted ids), summons?, realityHooks?, arenaChange?\}`.\
- Shared attack library, about 20 parameterized attacks:\
  - melee: sweep, slam, lunge, charge, grab, bite, tentacle_burst\
  - ranged: projectile, projectile_fan, beam, spit, wind_push\
  - area: aoe_ring, pool, dive\
  - special: teleport, summon, roar (sanity damage), gaze (buildup), darkness\
- Reality hooks, about 10:\
  - arena_reconnect (non-Euclidean room rewiring)\
  - darkness, flood, camera_warp, hidden_platforms, decoys\
  - time_skip, control_swap, petrify_buildup, light_dependency\
- Signature mechanics are the only bespoke boss logic allowed:\
  - **Cthulhu:** can't be killed. You ram it with the ship set-piece; it reforms, and R'lyeh sinks.\
  - **Colour Out of Space:** heals by draining saturation from the world, and is rendered in a hue outside the palette.\
  - **Dunwich Horror:** invisible. Reveal it with the Powder of Ibn Ghazi, then finish it with the incantation.\
  - **Ghatanothoa:** its gaze builds up petrification, so you must break line of sight.\
  - **Haunter of the Dark:** can't exist in light. It snuffs out light sources while you defend them.\
  - **Great Race:** `control_swap`. Body-theft briefly hands the player's body to the AI.\
  - **Hastur:** its name flickers onto the HUD as sanity falls, and the third appearance summons it.\
  - **Shub-Niggurath:** endlessly spawns the Thousand Young until you destroy the spawning roots.\
  - **Yog-Sothoth:** its iridescent spheres are gates, and the arena teleports between them.\
  - **Nyarlathotep:** appears as avatars throughout the game. Its final form copies earlier bosses' movesets. Nodens can be summoned as an ally for this fight.\
  - **Azathoth:** blind and invulnerable. It tracks sound, so the fight is stealth and survival, not damage.\
\
Every other boss is composed from the shared library.\
\
## 4. Bestiary roster (implement every entry)\
Sanity variants and boss variants are overrides on existing entries, not new roster ids.\
\
**lesser:** Deep One \'b7 Innsmouth Hybrid \'b7 Esoteric Order of Dagon Priest \'b7 Cthulhu Cultist \'b7 Ghoul \'b7 Ghast \'b7 Zoog \'b7 Night-gaunt \'b7 Moon-beast \'b7 Man of Leng \'b7 Cat from Saturn \'b7 Wamp \'b7 Gnorri \'b7 Serpent Man of Valusia \'b7 K'n-yan Dweller \'b7 Y'm-bhi \'b7 Gyaa-yothn \'b7 Reanimated Corpse (Herbert West) \'b7 Martense Degenerate \'b7 Exham Priory Troglodyte \'b7 Rat Swarm \'b7 Winged Hybrid (The Festival) \'b7 Moon-Bog Wraith \'b7 Being of Ib \'b7 Nameless City Reptile \'b7 Hybrid Mummy (Under the Pyramids) \'b7 Venusian Man-Lizard \'b7 The Beast in the Cave \'b7 Child of Yig (snake swarm) \'b7 Blind Albino Penguin (ambient)\
\
**greater:** Mi-Go \'b7 Elder Thing \'b7 Shoggoth \'b7 Star-spawn of Cthulhu \'b7 Yithian \'b7 Flying Polyp \'b7 Gug \'b7 Dhole \'b7 Shantak \'b7 Formless Spawn of Tsathoggua \'b7 Yekubian \'b7 Being from Beyond (visible only when Unmoored or through Tillinghast's resonator) \'b7 Thousand Young of Shub-Niggurath (original design, not the RPG's "Dark Young")\
\
**named:** The Colour Out of Space \'b7 Wilbur Whateley \'b7 The Dunwich Horror \'b7 Keziah Mason \'b7 Brown Jenkin \'b7 The Black Man (Nyarlathotep avatar) \'b7 Joseph Curwen \'b7 Simon Orne \'b7 Edward Hutchinson \'b7 Things in Curwen's Pits \'b7 Ephraim Waite \'b7 The Haunter of the Dark (Nyarlathotep avatar) \'b7 The Whisperer in Akeley's Chair \'b7 The Hound \'b7 The Unnamable \'b7 The Shunned House Entity \'b7 Lilith (Red Hook) \'b7 The Thing Beyond Erich Zann's Window \'b7 The Voice in the Tomb \'b7 High Priest Not to Be Described \'b7 The Colossus Beneath the Pyramids \'b7 The Horror at Martin's Beach \'b7 Dr. Mu\'f1oz \'b7 Charles le Sorcier \'b7 The Gorgon of Medusa's Coil \'b7 Hypnos \'b7 The Outsider \'b7 The Terrible Old Man\
\
**great_old_one:** Cthulhu \'b7 Father Dagon \'b7 Mother Hydra \'b7 Hastur \'b7 Tsathoggua \'b7 Ghatanothoa \'b7 Rhan-Tegoth \'b7 Yig \'b7 Bokrug \'b7 Nug \'b7 Yeb \'b7 The Great Ones (gods of Earth)\
\
**outer_god:** Azathoth \'b7 The Daemon Pipers \'b7 The Other Gods \'b7 Yog-Sothoth \'b7 'Umr at-Tawil \'b7 The Ancient Ones \'b7 Shub-Niggurath \'b7 Nyarlathotep (Crawling Chaos pharaoh + true form)\
\
**ally (non-hostile by default):** Nodens \'b7 Tritons of Nodens' Court \'b7 Cats of Ulthar \'b7 Richard Upton Pickman (ghoul) \'b7 Nasht & Kaman-Thah \'b7 The Light-Being from Algol \'b7 Yithian Archivist\
\
## 5. Phases\
Each phase is one session, and each ends with `npm run check` passing and a commit.\
\
- **Phase 0: Scaffold & look**\
  - Set up Vite/TS/Three/Vitest with `npm run dev | check | build`.\
  - Write `CLAUDE.md` (40 lines or fewer): commands, folder map, the \'a70 rules condensed, and a pointer to this spec.\
  - Build the \'a72 pipeline with a test scene: a terrain patch, some pillars, and one anomaly object.\
  - Add keyboard toggles for each effect, plus a sanity slider.\
  - Done when every effect visibly responds to the slider.\
- **Phase 1: Player & combat**\
  - Implement \'a73B in a flat arena against a training dummy and one placeholder Deep One.\
  - Tests: stamina, i-frame windows, input buffer, lock-on scoring.\
- **Phase 2: Registry & bestiary**\
  - Implement \'a73C: schema, archetypes, sprite generator, and every \'a74 entry as data, one file per tier. Boss scripts can be one-phase stubs for now.\
  - Tests: `validateRegistry`, including roster completeness.\
  - Done when `?bestiary` shows every entity.\
  - If the context gets long, split it: 2a covers lesser + greater, 2b covers the rest.\
- **Phase 3: Sanity & Insight**\
  - Implement \'a73A, the HUD bars, and all four hooks.\
  - Tests: band transitions and hysteresis, variant swap, hidden layers.\
- **Phase 4: World**\
  - Implement \'a73D: streaming, regions, the dungeon kit, checkpoints, the death/Echo loop, fast travel, and save/load (localStorage JSON).\
  - Test: every roster entity is reachable, meaning it appears in a spawn table, a boss arena, or an ally location.\
- **Phase 5: Bosses**\
  - Implement \'a73E in batches: 5a named, 5b great old ones, 5c outer gods plus three endings.\
  - The three endings: wake and seal the Gate \'b7 pass through with 'Umr at-Tawil \'b7 become Nyarlathotep's herald.\
  - Test: every bossScript's phases, attacks, and hooks resolve.\
- **Phase 6: Audio & polish**\
  - Procedural WebAudio: drones, stingers, and per-entity cues such as the polyps' whistling and the shoggoth's "Tekeli-li" piping.\
  - Main menu and settings: FX intensity cap, sensitivity, resolution scale.\
  - Performance pass to meet the \'a72 budgets.}