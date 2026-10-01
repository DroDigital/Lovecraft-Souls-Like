# The balance table

Written by `tests/balance.test.ts` (`BALANCE_WRITE=1 npm run audit`; round 25, playtest note 8). A bot fights each scripted boss
in the arena at the standing a person has when they reach it (`tests/balanceModel.ts`): the bosses are met in order of
their health, the world's lesser foes give 60% of their Echoes in step with them and each boss slain most of its
own; the Echoes are spent on levels as a person builds (Vigour and Might most, Endurance less), and the star-stones the
bosses leave are set into the sword-cane. The bot closes to the edge of the body and strikes without pause, reads the
wind-up of every blow and rolls from 55% of them, takes the Alert's helm, and keeps behind a monolith from a gaze that
turns flesh to stone. It cannot be killed, and what it took is the tally.

- **Seconds** is how long the boss took at that steady pace. A person strikes for perhaps a third of a fight, so their fight
  is about three times as long.
- **Lives** is the damage taken against the health a person has there and the Reagent they carry (4 doses of 45%):
  1 is a fight that spends all of it, for a bot that rolls from 55% of blows.
- Ghatanothoa is fought with the gaze waived (its seconds scaled by the half of a fight in its sight), and Shub-Niggurath with
  its roots down (forty seconds more, to cut them): the bot plays those badly. Azathoth and the Haunter of the Dark are not held
  to the bounds: Azathoth is blind and cannot be wounded (the piping is outlasted, and what it costs the bot is the noise the bot
  makes), the Haunter is hurt only by lamplight (a person lures it to a lamp).


| # | Boss | Vig/End/Might | Cane + | Health | Seconds | Taken | Our health | Lives | Deaths |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Brown Jenkin | 2/1/1 | 0 | 300 | 20 | 58 | 184 | 0.11 | 0 |
| 2 | Dr. Muñoz | 4/1/3 | 1 | 400 | 8 | 69 | 208 | 0.12 | 0 |
| 3 | The Terrible Old Man | 4/2/4 | 2 | 450 | 12 | 68 | 208 | 0.12 | 0 |
| 4 | Charles le Sorcier | 5/2/5 | 2 | 550 | 11 | 126 | 220 | 0.20 | 0 |
| 5 | The Hound | 6/3/5 | 3 | 550 | 13 | 179 | 232 | 0.28 | 0 |
| 6 | The Outsider | 6/3/6 | 3 | 550 | 7 | 31 | 232 | 0.05 | 0 |
| 7 | Ephraim Waite | 7/3/6 | 4 | 600 | 16 | 53 | 244 | 0.08 | 0 |
| 8 | Wilbur Whateley | 8/3/7 | 4 | 600 | 7 | 92 | 256 | 0.13 | 0 |
| 9 | Edward Hutchinson | 8/4/7 | 4 | 650 | 11 | 78 | 256 | 0.11 | 0 |
| 10 | Hypnos | 8/4/8 | 5 | 650 | 10 | 0 | 256 | 0.00 | 0 |
| 11 | Simon Orne | 9/4/8 | 5 | 650 | 8 | 126 | 268 | 0.17 | 0 |
| 12 | Keziah Mason | 9/4/8 | 5 | 700 | 10 | 127 | 268 | 0.17 | 0 |
| 13 | The Unnamable | 9/4/9 | 5 | 700 | 8 | 144 | 268 | 0.19 | 0 |
| 14 | The Black Man | 10/4/9 | 5 | 750 | 10 | 0 | 280 | 0.00 | 0 |
| 15 | Lilith | 10/5/9 | 5 | 750 | 12 | 231 | 280 | 0.29 | 0 |
| 16 | The Shunned House Entity | 10/5/10 | 5 | 750 | 8 | 99 | 280 | 0.13 | 0 |
| 17 | Zkauba the Wizard | 10/5/10 | 5 | 750 | 10 | 100 | 280 | 0.13 | 0 |
| 18 | The Gorgon of Medusa's Coil | 11/5/10 | 5 | 800 | 14 | 0 | 292 | 0.00 | 0 |
| 19 | The Whisperer in Akeley's Chair | 11/5/10 | 5 | 850 | 8 | 85 | 292 | 0.10 | 0 |
| 20 | The Thing Beyond Erich Zann's Window | 11/5/11 | 5 | 850 | 9 | 78 | 292 | 0.10 | 0 |
| 21 | Joseph Curwen | 12/5/11 | 5 | 900 | 11 | 86 | 304 | 0.10 | 0 |
| 22 | The Colour Out of Space | 12/5/11 | 5 | 1000 | 20 | 379 | 304 | 0.45 | 0 |
| 23 | High Priest Not to Be Described | 12/6/11 | 5 | 1000 | 11 | 60 | 304 | 0.07 | 0 |
| 24 | The Haunter of the Dark | 12/6/12 | 5 | 1050 | 179 | 3578 | 304 | 4.20 | 0 |
| 25 | The Daemon Pipers | 12/6/12 | 5 | 1200 | 13 | 170 | 304 | 0.20 | 0 |
| 26 | The Horror at Martin's Beach | 13/6/12 | 5 | 1200 | 12 | 20 | 316 | 0.02 | 0 |
| 27 | The Ancient Ones | 13/6/12 | 5 | 1550 | 21 | 142 | 316 | 0.16 | 0 |
| 28 | The Dunwich Horror | 13/6/13 | 5 | 1550 | 21 | 713 | 316 | 0.81 | 0 |
| 29 | The Colossus Beneath the Pyramids | 14/6/13 | 5 | 1650 | 16 | 579 | 328 | 0.63 | 0 |
| 30 | The Other Gods | 14/6/13 | 5 | 1900 | 26 | 518 | 328 | 0.56 | 0 |
| 31 | Nug | 14/7/13 | 5 | 2600 | 38 | 1455 | 328 | 1.58 | 0 |
| 32 | Rhan-Tegoth | 14/7/14 | 5 | 2600 | 33 | 1076 | 328 | 1.17 | 0 |
| 33 | Yeb | 15/7/14 | 5 | 2600 | 41 | 1237 | 340 | 1.30 | 0 |
| 34 | The Great Ones | 15/7/14 | 5 | 2950 | 43 | 2002 | 340 | 2.10 | 0 |
| 35 | Yig | 15/7/15 | 5 | 2950 | 46 | 2243 | 340 | 2.36 | 0 |
| 36 | Mother Hydra | 16/7/15 | 5 | 3100 | 25 | 1031 | 352 | 1.05 | 0 |
| 37 | Bokrug | 16/8/15 | 5 | 3250 | 52 | 1903 | 352 | 1.93 | 0 |
| 38 | Father Dagon | 16/8/16 | 5 | 3250 | 35 | 1374 | 352 | 1.39 | 0 |
| 39 | Tsathoggua | 16/8/16 | 5 | 3250 | 50 | 2836 | 352 | 2.88 | 0 |
| 40 | 'Umr at-Tawil | 17/8/16 | 5 | 3600 | 88 | 2455 | 364 | 2.41 | 0 |
| 41 | Hastur | 17/8/17 | 5 | 4200 | 62 | 1413 | 364 | 1.39 | 0 |
| 42 | Cthulhu | 18/8/17 | 5 | 4300 | 133 | 2794 | 376 | 2.65 | 0 |
| 43 | Ghatanothoa | 18/9/18 | 5 | 4850 | 112 | 2893 | 376 | 2.75 | 0 |
| 44 | Nyarlathotep | 19/9/18 | 5 | 5150 | 75 | 2181 | 388 | 2.01 | 0 |
| 45 | Shub-Niggurath | 19/9/19 | 5 | 5450 | 98 | 2604 | 388 | 2.40 | 0 |
| 46 | Yog-Sothoth | 20/9/19 | 5 | 6100 | 118 | 4669 | 400 | 4.17 | 0 |
| 47 | Azathoth | 20/10/20 | 5 | 6700 | 90 | 9474 | 400 | 8.46 | 0 |

Bounds held by the test: each boss finishes within 6 to 260 seconds, and costs at most 3 lives (a colossus, 6), and the bot does not die.
