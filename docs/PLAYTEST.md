# Playtest round 24

The game played again, looking for bugs and inconsistencies, and for whatever may want a second look.
What was fixed is in `DECISIONS.md` (round 24); this page is the wider account: how it was played,
what was found, what was checked and found sound, and a list of things that may need improvement or a
decision from a person. Numbers are from this pass and will drift; the tests named hold the ones that matter.

## How it was played

The headless browser here draws two to seven frames a second, so nothing that depends on the *feel* of
a fight could be judged in it. The pass leaned on the simulation, which runs the same code at any speed.

- **Random play** (`tests/soak.test.ts`): random keys and buttons for thousands of frames across every
  realm, with creatures of every tier conjured about the investigator, teleports, rests, sudden wounds and
  sanity shocks; every few frames the invariants are read (a number, in its range, a whole count of rounds, a
  bounded number of entities) and now and then a save is written, read and compared. Ten seeds of 5000 frames,
  clean. `SOAK_SEEDS`, `SOAK_FRAMES` and `SOAK_FIRST` widen it.
- **A bot that fights** (`tests/botHelpers.ts`): closes to the edge of a body, strikes, dodges, shoots from
  afar, presses E where a fight offers something, and cannot be killed. `bossBot.test.ts` sets it on every scripted
  boss (two and a half minutes each), `foeBot.test.ts` on every other creature in every variant it has, `reach.test.ts`
  holds the sword-cane to every body from as near as it lets the investigator stand.
- **Audits of the data** (throwaway, results below): which arenas are too tight for their bosses, whether the
  revolver can hit everything at three metres, whether Shub-Niggurath's roots can be struck, every `{token}` in every
  text against the buttons that exist.
- **The browser**: the title and every menu at five window sizes (640 × 480 to 2560 × 1080); the HUD and the pause
  pages at three UI scales and four sizes; a new game through the intro pages and the wake; the pause menu and its
  pages; the shop, an Elder Sign's menus, the map; all thirteen realms and twelve dungeons entered in the running
  game and looked at (console errors and failed requests listened for: none); a death, the continue, and an ending;
  a dungeon's boss entered for real. Seven runs of a monkey that presses random keys, clicks random buttons and
  resizes the window: two ran their 500 actions out with no page error, the others were cut short by the driver's own
  trouble (a reload racing a reload; `window.game` gone once the monkey had quit to the title), never by the game.
  It did rebind the investigator's keys to nonsense, which is what the Controls page is for (note 12).

## Found and fixed

| What | Where | Test |
| --- | --- | --- |
| **The colossi could not be struck.** Cthulhu, Ghatanothoa, Yog-Sothoth and Shub-Niggurath took no blow from any weapon: their hurt capsule stands on a sphere, a few metres across at the height of a blade, and their bodies keep the investigator a colossus's radius away. Cthulhu's and Yog-Sothoth's falls are quest goals and the Beyond's order puts Yog-Sothoth before Azathoth, so the main line and the Court's endings could not be finished. | `COMBAT.foot`, `capsuleGap2` (`systems/combat.ts`) | `reach.test.ts`, `bossBot.test.ts` |
| **The bosses of Innsmouth were not in their room.** Father Dagon and Mother Hydra (15 and 16 m tall) stand in Y'ha-nthlei's temple, whose roof is a solid slab six metres up; the body collision took the slab for a wall and pushed them out through the side of the building at their first step. The room was empty and the fight could not start. The temple's roof is open now (a new `sunken` kit: the drowned look, the vault fallen). | `data/kits.ts`, `data/dungeons.ts` | `bossStand.test.ts`, `kits.test.ts` |
| **The espada could not hit anyone at arm's length.** A thrust is a point at the end of the blade, so it passed beyond everything nearer than about a metre: 34 creatures, all of a man's size or less, could not be touched by it while they stood at contact (they were hit from a step back). A thrust is swept from the hand to the point now. | `HitDef.thrust` (`data/moves.ts`, `data/weapons.ts`), `meleeSystem` (`systems/combat.ts`) | `reach.test.ts` |
| Six attacks in the colossi's scripts could never be chosen: a bracket scaled with body height scaled its minimum too (Yog-Sothoth's beam and teleport began 53 and 63 m out in an arena 34 m across, Shub-Niggurath's summon and charge, the Colossus's charge, Azathoth's darkness). A scaled minimum is at most 20 m now. | `attackRange` (`data/attacks.ts`) | `bossStand.test.ts` |
| The Whisperer in Akeley's Chair, which cannot move, had no blow that wounds within three metres of its chair (its bolts, beam and summons are chosen only at their range; its gaze takes the mind), so its first phase could be cut down untouched. A creature that cannot move now strikes what stands nearer than its blows like. | `chooseAttack` (`systems/tactics.ts`) | `foesStrike.test.ts` |
| The sparks, flare and spray of a landed blow were drawn at the struck body's axis, at the height of its heart: on a colossus, a dozen metres inside it and several above the blade, where nothing could be seen. They are drawn on its near side, at the blade's height (bodies under a metre wide are as they were). | `render/wound.ts`, `impactFx.ts`, `combatFx.ts` | `wound.test.ts` |
| A shot's range was measured to the middle of the body: against a colossus its whole radius counted, so a shot from two metres off its side did about half its damage, and the bullet ran on to the axis. | `firstHit` (`systems/revolver.ts`) | `gun.test.ts` |
| **A crash**: a blow that killed a boss with decoys or summons (the Black Man, the Terrible Old Man, Tsathoggua) threw, reading the position of a body its own fall had just cleared. | `live()` (`systems/targets.ts`) and every loop that strikes | `bossFight.test.ts`, `bossBot.test.ts` |
| Settings and Controls were cut off at the top of a short window (800 × 600). | `ui/titleScreen.ts` | by eye, at five sizes |
| The audio engine told the world-bus filter its target every frame (an automation event a frame, for as long as a wall muffled a sound). | `render/audio/engine.ts` | |
| A merchant's button went grey with no word when the pocket was full. | `hasRoom` (`systems/trade.ts`), `ui/shopMenu.ts` | `trade.test.ts` |
| Resting did not say the revolver is loaded from the spare rounds; the arms page said "4 more lie somewhere in the dream" under the revolver, which reads as four more revolvers; the words under the veil said nothing of the gun's six or of what an unmoored mind costs. | `ui/signMenu.ts`, `ui/armsPage.ts`, `data/loreLines.ts` | |
| Four files past the 300-line rule, split along their seams (`playTuning`, `placements`, `dungeons`, and the sanity and gun tests). | | the whole suite |

## Checked and found sound

- Every creature can be struck by the sword-cane (105 cases) and shot at three metres (105 cases), and every foe but the mind-only ones strikes back at an investigator standing at the edge of its body — after the fixes above.
- Every one of the 47 bosses stands inside its own arena a second after the world puts it there, and every wide one can be reached by a bot from some side (`bossStand.test.ts`). Nothing else in the game is taller than the roof over it.
- Every boss's arena is wide enough for its body: the ring between a colossus and the wall is 17 m at the least, and the tightest of all, the pit thing's in Curwen's catacombs, 6 m.
- Shub-Niggurath's roots are combatants and take blows (700 health each; four of them).
- All 339 spawns the world places stand where it put them: none is moved by a collider. Every attack in a boss's
  script has a place to be chosen from somewhere in its arena (after the bracket fix above), and every boss's
  attack brackets begin inside its arena.
- 44 of 47 scripted bosses fall to the bot within two and a half minutes (Azathoth by outlasting its piping). The
  other three ask for what the bot does not do: take the Alert's helm (Cthulhu; the ram itself is tested), stay
  behind a monolith (Ghatanothoa), cut the roots (Shub-Niggurath).
- Every `{button}` token in the texts names a button that exists; a save from before the revolver's limits loads
  with a full cylinder; respawning loads the cylinder; resting refills it from the spare rounds.
- Realms and dungeons: no console errors, no failed requests, draw calls between 59 and 105 at the busiest sign.

## Notes: what may need improvement or change

Not done, because each is a decision about the game and not a defect, or needs a person at a real screen.
Roughly in the order I would take them.

### Bosses and combat

1. **The colossi fight their scripts for the first time, and nobody has balanced them.** Blows reach them and all their listed attacks can fire (Yog-Sothoth's beams are a third of its first and last phases). Expect the first human play to show spikes either way: HP, damage and the new attack mix are as they were written, untested.
2. **A colossus is now a wall you hit.** With the flat foot the blade lands anywhere along a 12 m column. That
   makes the fights possible; it does not make them good. Suggest hurt regions per colossus (feet and legs, the
   tentacles that can be severed or staggered, a weak spot at the top for the revolver) or a blow that only counts
   at the base with a stagger to open the rest. Until then Cthulhu's 4500 health to the Alert, Yog-Sothoth's 6100 and
   Shub-Niggurath's 8250 (roots and all) are about 2 to 4 minutes of *uninterrupted contact* at the sword-cane's best
   (some 40 a second), which will be 5 to 10 in a fight where they hit back. Watch a person do one of them before
   trusting the numbers.
3. **Two bodies that overlap are pushed apart by half each** (`separate`, `systems/movement.ts`), so the
   investigator shoves a 40 m colossus about at half their pace, and one that starts inside its body (the test
   harness does) sends it 17 m. Weighting by radius (or a mass) would be right and is a few lines; it changes the
   feel of every fight in small ways, so it wants a play.
4. **Ghatanothoa turns flesh to stone in four seconds of sight and lets it go in five** (`REALITY.petrifyRate`,
   `petrifyDecay`), so at most 44% of a fight can be spent in view of it. Whether the monoliths stand where they can be used from
   the foot of its body cannot be told from the code. A human play, and perhaps a sign of the buildup (a crack in
   the picture at half) so it is a rule and not a surprise.
5. **Only Azathoth has a first-time hint.** Cthulhu's ship, the Dunwich Horror's powder and incantation, Ghatanothoa's
   cover, Shub-Niggurath's roots and Yog-Sothoth's spheres each ask the investigator to do something other than
   strike, and nothing says so before the fight but the E prompt when they are close enough. The same treatment as
   `HINTS.blind` (one line, once).
6. **The colossi's bodies and their hurt shapes do not match.** A hurt shape is one upright cylinder (now on a flat foot) whatever the model is: Yog-Sothoth's is fourteen spheres, several of them well above the ground, so a blade can meet the cylinder where the model shows nothing, and the sparks are drawn on its side. Fine for a first pass; a per-assembly hurt list (one capsule to a sphere or a limb) would make the blows and the picture agree.
7. **`?spawn=<colossus>` puts the investigator inside the body** (7 m from the axis of a 12 m radius), so the bodies push each other out in the first step, the boss's arrival cutscene plays over it and the fight starts with the boss already upon them. Only a debugging mode, but it is how anyone looks at a colossus quickly: place the investigator at its edge.
8. **No realistic balance bot.** The bot fights at Might 150 to keep the run short. A bot at the level a person
   has when they reach each boss (Echoes spent on the curve, the arms they have found) would give a time-to-kill and
   a damage-taken table to tune HP and damage against, which is what a balance pass has lacked.

### The revolver and the economy

9. A box of six cartridges costs 180 Echoes; a median lesser bounty is 80. One round is about two-fifths of a lesser
   kill, a full reserve of 24 is 720 Echoes, and six rounds close up do at most 180 damage. The revolver is, by the
   numbers, an emergency tool whose best use is interrupting a wind-up, which is what it was made to be. If the
   pass after this finds nobody uses it, the price or the found boxes are the levers (`GUN.find`, `WARES.rounds`).
10. The shop says a ware cannot be carried; it does not say how many are carried. "Oil 5 of 5" and "Rounds 24 of 24"
   on the line would answer the question before it is asked.

### Interface and words

11. The words under the veil are picked at random, so a new game's first line under MISKATONIC UNIVERSITY can be about
   fog closing before a horror or about Echoes that lie where you fell, before either has come up. The hints
   (`ui/hints.ts`) already know what has been seen; the veil could take the first line it has not shown yet and
   that has come up, and only then Lovecraft's.
12. **Shift can be bound to a movement key** (only Escape, Enter, Tab and the arrows are reserved), and Shift is also
   the heavy attack's and the parry's modifier: "Move back" on Shift makes every step back a heavy blow. Reserve it,
   or say so on the Controls page. (The monkey found this by doing it.)

### Presentation and what this pass could not judge

13. **Not judged at all**: how any of it sounds (the headless browser has no speakers: the muffle fix, the heart near
    death, the recorded ambience), how it plays on a pad (the mapping and the menus are tested, never held), and how
    fast it draws on a real GPU (headless is software: two to seven frames a second, 59 to 105 draw calls). One hour
    at a real screen with `npm run desktop` would answer more than another round in here.
14. `npm run check` now takes about a minute and a half, most of it audits that walk every dungeon and prop. A
    `npm run audit` for the slow ones (the soak, the bots, `dungeonView`, `objectView`) would keep the everyday check
    fast without dropping any of them from CI.

## Round 25: what was done with these notes

| Note | What became of it |
| --- | --- |
| 1 | The colossi are balanced against a bot now (note 8): `docs/BALANCE.md`, held by `tests/balance.test.ts`. Cthulhu's health and damage, Yog-Sothoth's damage and Tsathoggua's were brought in; Azathoth and the Haunter are exempt and said to be. |
| 2, 6 | A colossus has zones (legs, torso, head; a body of spheres is its spheres), and stoops after each blow of its own with its head down in reach: `data/assemblyShape.ts`, `systems/hurt.ts`, `DECISIONS.md` round 25 (c). |
| 3 | Bodies shove by their weight (`separate`). |
| 4 | Petrification drains the colour, closes the edges and cracks the picture (`uStone`); the monoliths are proved to be cover and reachable in time (`tests/stoneCover.test.ts`). Its numbers are as they were. |
| 5 | Every boss that asks for more than striking says so once before the fight (`bossHints`). |
| 7 | `?spawn=<colossus>` stands the investigator off the body's near edge. |
| 8 | `tests/balance.test.ts`, `tests/balanceModel.ts`, `tests/botHelpers.ts`: the table. |
| 9 | Not changed: the note makes it conditional on nobody using the gun, which this pass could not see. `WARES.rounds` and `GUN.find` are the levers. |
| 10 | The shop says what is carried. |
| 11 | The veil says what has come up before it says anything else. |
| 12 | Shift is kept. |
| 13 | Still open: it needs a person at a real screen, a pair of speakers and a pad. |
| 14 | `npm run audit`, `npm run check:all`; `check` runs in under half a minute. |

# Playtest round 38

The game played again after the menus were rebuilt (round 36) and the controllers moved to SDL in the desktop shell
(round 36): what a person meets first, what they meet most, and what the audits could not see. The headless browser is
still software GL (two to seven frames a second), so nothing of *feel* is judged here, and nothing of how it sounds.

## How it was played

- **The audits**: `npm run audit` (the soak, the bots that fight every boss and creature, `dungeonView`, `objectView`, `roam`,
  `balance`): 8 files, 215 tests, clean. The soak widened to 40 seeds of 6000 frames (`SOAK_SEEDS=40 SOAK_FRAMES=6000
  SOAK_FIRST=100`): clean.
- **The browser, as a person**: the title (it opens by itself where sound is allowed), New game, the intro, the wake, a
  conversation by keyboard (Peaslee: the quest begins, the journal says so), a rest at an Elder Sign and a purchase made with
  Down and Enter, a merchant's wares, a death (UNMADE, its line, the rise), the pause menu, Settings and every tab of it by
  PageUp, PageDown and the arrows, the journal, the arms, the achievements, the credits.
- **Every place**: the 102 map places (every Elder Sign, gate, dungeon door and arena) visited one after another with the
  page's errors and console errors listened for: none. Triangles drawn a frame: 202 000 on average, 540 000 at the hub and
  640 000 at Whateley's farm (shadow passes included), 63 to 257 draw calls: not a cost that matters on a machine from the
  last ten years, but the hub and the farm are where it would show first. Five dungeons entered and looked at.
- **The menus at their worst**: every weapon, tome and creature given (53 documents, 100 creatures, six arms) and each page
  opened at 960 × 540, at 1280 × 720, at 640 × 360 (the smallest window the shell allows) and at a UI scale of 1.5.
- **Bots**: a level-0 bot (55% of telegraphed blows rolled) against every creature that is not a scripted boss; the weapons'
  numbers laid side by side; which creatures the world places.

## Found and fixed

| What | Where | Test |
| --- | --- | --- |
| **Long pages ran off the panel**: 53 tomes, 100 creatures, 22 achievements and the Elder Sign's fourteen lines pushed the foot, the keys and Back out of the panel at 960 × 540. | `ui/menuParts.ts` (`footer` pins the title and tabs over a scrolling body and the foot under it) | browser |
| **No way back for a mouse** from the pages that lost their Back button in round 36. | the foot's Back is clickable | browser |
| **Tabs trapped the arrows**: with the focus on the tab row, Down went to the next tab (Enter then changed it) instead of into the list. The tab row is one stop; left and right change tabs (keys, pad d-pad and bumpers). | `ui/menuKit.ts` | browser |
| **A line that could not be taken was unreadable and unreachable** (Echoes short: nearly invisible, and it could not be chosen to be read). Such a line is dimmed, can be chosen, and says why. | `option()` in `menuParts.ts`; the Elder Sign's menu and the merchant | browser |
| **The Elder Sign's menu was fourteen lines and a sub-page for arms and for travel.** Three tabs (Grow, Arms, Travel) under a line of what is held and what the story asks next. | `ui/signMenu.ts` | browser |
| **Panels were 90% of the window plus 40 px** (content-box): at 640 × 360 the foot touched the edge. | `ui/menuKit.ts` | browser |
| **`menuKit.ts` was 342 lines** (the rule is 300). | split: `menuParts.ts` | |
| **The map's drop marker was a neon green** (`#2bffa0`), the one loud colour left. | `ui/mapPainter.ts` | |
| **The HUD's words had no halo**: INSIGHT and ECHOES vanished into a pale floor. | `ui/hud.ts` | browser |
| **The Straight Razor was dominated** (1.5 damage a stamina and 37 a second, against the cane's 1.6 and 41, with the shortest reach). | `data/weapons.ts` | `arms.test.ts` |
| **Five tests failed by the clock** whenever the machine was busy (a world is built in each). | `vitest.config.ts`: 30 s | |

## Added

- **Foe damage** (Settings › Play, 50–150%): the dream had no assist and no harder road but the next journey. `tests/assist.test.ts`.
- **Where you stand, when you return**: the pause menu says what the story asks next; the title's Continue says where that
  dream was left; the Elder Sign's menu says both.
- `tests/coverage.test.ts`: every creature, and every entry of every region's spawn table, is placed in the world.

## Checked and found sound

- No page error, console error or failed request in any of the 102 places, the five modes (`?arena`, `?bestiary`, `?look`,
  `?spawn`, `?debug`), or the menus.
- Every creature of the roster is met somewhere (a first reading of the *fixed* spawns said five were not; the open ground's
  are in the region plans, and the new test says so for good). The Being from Beyond cannot be struck at full sanity: it is
  there only for a mind at 15 or below (`hidden`), as designed.
- The lesser foes are killed by a level-0 bot in 3 to 13 seconds for 0 to 60 of its 160 health; the greater ones (Shoggoth,
  Gug, Star-spawn, Dhole) cost it 7 to 10 lives each: the first region is gentle and the later ones are not, which is the shape.
- The nearest enemy to the first Elder Sign is a hundred metres off (rats, a troglodyte, a corpse): nothing meets a person
  at the stone.
- Arkham is 320 m from the first sign: a minute's walk.
- The weapon table (light chain, damage a second, damage a stamina, reach): cane 41, 1.6, 1.3 m; axe 52, 1.8, 1.5 m; cutlass 55,
  1.9, 1.25 m; espada 48, 1.8, 1.75 m; razor 42, 1.7, 1.05 m (after this round): each has a reason to be taken up.

## Not judged, and worth a person's hour

1. **Anything of feel, and all sound**, as before, and **the native controller path** (round 36): it was built and run here without
   a controller. One hour at a real screen with a pad (`npm run desktop`) would say more than another round here.
2. The **pause menu, the Elder Sign's menu and the settings at 640 × 360 with a UI scale of 1.5** keep every foot on screen but
   show three or four lines of their body; they scroll. If that window is one anyone plays in, the tabs want fewer lines each.
3. **Difficulty**: the balance table (`docs/BALANCE.md`) says a perfect bot takes 0.0–0.3 of its health from each boss; a person
   will take several times that, but how many lives a first-time player spends on each horror is a number only players have.
   *Foe damage* is the lever a player now has; whether the defaults want to move is for the data.
4. The hub and Whateley's farm draw the most triangles (shadow passes included); if a slower machine struggles anywhere it
   will be there (the lamp and moon casters, `render/colliderShadow.ts`, draw 170 000 triangles of proxies at the hub).
