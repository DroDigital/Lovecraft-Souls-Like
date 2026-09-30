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
