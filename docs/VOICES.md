# The voices

Every line the people of the realms and the horrors that speak say is spoken by a recording in
`public/voice`: 177 clips of ElevenLabs' **Eleven v4** (`eleven_v4`), about 24 minutes, 25.7 MB. 123 are
the lines of the fifteen people met at the Elder Signs (`npc:<id>`, written in `data/npcs.ts` and
`npcsFar.ts`); 54 are those of the horrors that speak in their own stories (`boss:<roster id>`, written for
this: no horror spoke before): a line as it arrives and a last as it falls. Two have no scene, the Dunwich
Horror (unseen) and Brown Jenkin (who joins a fight already begun), and say only a last, shown as a notice.
A line with no recording is shown and not heard, as every line was before.

## Where it is

| | |
|---|---|
| `data/speech.ts` | `clipOf(speaker, text)`: a recording's name, the speaker and a hash of the line's words (`wordsOf`: lower case, letters only, tags out); `plain` (tags out), `shown` (tags out and a leaned-on CAPITAL let down again) |
| `data/speechNpcs.ts`, `speechFar.ts`, `speechBosses.ts` | each line as it is **performed**, with its [audio tags] |
| `data/speechLines.ts` | every line said aloud, gathered (`speechLines()`); `spokenFor`: how long a caption is held |
| `data/speechCast.ts` | who speaks in which voice, and how the game plays it |
| `render/audio/speech.ts` | the player: `public/voice/index.json` once, a recording fetched and decoded when its line is first said (a talk's next five are fetched ahead), ten decoded ones kept, one voice at a time (the next cuts off the last in 0.14 s), the cast's playback rate (lowers and slows a great voice) and echo |
| `render/audio/engine.ts`, `gameAudio.ts` | the speech bus (before the limiter, after the sanity shaper and the muffle, so a failing mind does not smear the voices; `AUDIO.speech`, a make-up gain of 1.5); the `Said`, `Silenced` and `Talked` events |
| `render/cinemaDirector.ts`, `cinema.ts` | a horror's scene: `speaking()` lays a caption beat and a voice beat over its arrival and its fall and holds the last shot until it is said; skipping a scene silences it |
| `ui/dialogue.ts`, `ui/menuPages.ts` | a person's line is said as it is shown; Settings › Audio › **Voices** |
| `tests/speech*.test.ts`, `voiceCoverage.test.ts` | the words performed are the words shown; every speaker is cast; the names are stable; the folder, `index.json` and the lines agree; the sizes |

## How a line is performed

Eleven v4 is directed with square-bracket **audio tags** in the text. Its own guidance, which the lines follow
(`speechNpcs.ts`' header has it): a tag says *how* a line is spoken (`[weary]`, `[whispers]`, `[low voice]`,
`[sighs]`), never what the speaker does; it sits where the delivery changes, before the words it changes, and
tags stack (`[low voice] [elderly voice]`); the word leaned on is written in capitals; a trailing off is an
ellipsis; a beat is `[pause]` or `[long pause]`; no hyphens, commas or digits inside a tag (v4 reads them as
words: a test holds this). A hard name is given in IPA between slashes where v4 says it wrongly: in the request
only (never in the data), *Yog-Sothoth*, *Dunwich* and *Pawtuxet* (`/ˈjɒɡ ˈsɒθoʊθ/`, `/ˈdʌnɪtʃ/`, `/pɔːˈtʌksɪt/`).

**The words are never changed.** A performed line is the shown line with tags and capitals added, and
`tests/speech.test.ts` holds `wordsOf(performed) === wordsOf(shown)` for every line. A boss's caption is made
from its performed line (`shown`); a person's is the text in `data/npcs.ts`, unchanged.

A recording is named by its speaker and its **words**: a changed word is a new recording (the old file is
then of no line, and `voiceCoverage` says so); changed capitals, marks or tags keep the name, so a line's
performance can be tried again over the same file.

## The cast

Chosen from the voices' descriptions (nobody has listened to the casting). Ordinary speakers have ElevenLabs'
own **premade** voices, which any plan can use; the monstrous, the old and the foreign have **library** voices,
which a recording can be made with only on the Creator plan or above. `rate` lowers a voice and slows it
(playback rate: pitch and pace together); `echo` puts some hall behind it. They are the game's, applied at
playback, so a recast does not need them again.

| speaker | voice (ElevenLabs) | voice id | played with |
|---|---|---|---|
| `npc:peaslee` | Eric - Smooth, Trustworthy (premade) | `cjVigY5qzO86Huf0OWal` | — |
| `npc:gilman` | Will - Relaxed Optimist (premade) | `bIHbv24MWmeRgasZH58o` | — |
| `npc:morgan` | Adam - Dominant, Firm (premade) | `pNInz6obpgDQGcFmaJgB` | — |
| `npc:kuranes` | Desmond (UK) - Distinguished Persuasion | `jAW0IMxOTz75sgLAYWp6` | — |
| `npc:zadok` | Jessie - Vintage Narrator | `KgUSWQPFmuiZ5ycRbnty` | — |
| `npc:wilmarth` | Roger - Laid-Back, Casual, Resonant (premade) | `CwhRBWXzGAHq8TQ4Fs17` | — |
| `npc:willett` | Brian - Deep, Resonant and Comforting (premade) | `nPczCjzI2devNBz1zQrb` | — |
| `npc:curtis` | Callum - Husky Trickster (premade) | `N2lVS1w4EtoT3dr4eOWO` | — |
| `npc:dyer` | Chris - Charming, Down-to-Earth (premade) | `iP95p4xoKVk53GoZ742B` | — |
| `npc:nathaniel` | Bill - Wise, Mature, Balanced (premade) | `pqHfZKP75CvOlQylNhV4` | — |
| `npc:zamacona` | Diego - Professional and Smart | `FwXEXFL5y9qj7wNLrZeS` | — |
| `npc:johansen` | Birk - Norwegian Male | `6moWX0dfuSmryJkGegeK` | — |
| `npc:akeley` | Rick - Raspy Narrator | `wcATjh8zBDfepqUbl99V` | — |
| `npc:carter` | Daniel - Steady Broadcaster (premade) | `onwK4e9ZLuTAKqWW03F9` | — |
| `npc:nasht` | Mossbeard – The God of the Wild | `bFrjFL4nlpeYNwNRhXxq` | echo: 0.2 |
| `boss:wilbur_whateley` | Harry - Fierce Warrior (premade) | `SOYHLrjzK2X1ezoPC6cr` | rate: 0.96 |
| `boss:dunwich_horror` | Harry - Fierce Warrior (premade) | `SOYHLrjzK2X1ezoPC6cr` | rate: 0.72, echo: 0.5 |
| `boss:keziah_mason` | The Ancient Evil | `HH3kybY6uEJ2ebSa9Vy3` | — |
| `boss:brown_jenkin` | Parasyte - Whispers from the Deep Dark | `1KFdM0QCwQn4rmn5nn9C` | rate: 1.12 |
| `boss:black_man` | Hellin - Deep Intense British Male | `vfaqCOvlrKi4Zp7C2IAm` | rate: 0.95, echo: 0.25 |
| `boss:joseph_curwen` | Matthew Schmitz - Ancient Sage Dragon Wizard | `HAvvFKatz0uu0Fv55Riy` | — |
| `boss:simon_orne` | Peter | `wldVCiOxtkWPlsr2mHyo` | — |
| `boss:edward_hutchinson` | GERALD - Exciting Older Voice | `fGIZlgPQ75MMlvQ6WxgY` | — |
| `boss:ephraim_waite` | Mora - Gritty and Enigmatic | `YHcCpa6SBWnKDaCPZJQR` | — |
| `boss:whisperer` | Parasyte - Dweller in the Deep-Dark | `k1fCGnhRbXzd6bzwlD2B` | — |
| `boss:voice_in_the_tomb` | Ezekiel Wren - The Voice Beneath the Floorboards | `2tTjAGX0n5ajDmazDcWk` | echo: 0.35 |
| `boss:lilith` | Eleanor - Gracious and Authoritative | `2qQJWjw5XdG80GreshqG` | rate: 0.94, echo: 0.3 |
| `boss:dr_munoz` | Kevo - Calm, slight accent | `4ISzXkLY6aTZQsrFLVme` | — |
| `boss:charles_le_sorcier` | Declan Graves - Haunted Rasps and Old World Dread | `1BfrkuYXmEwp8AWqSLWk` | — |
| `boss:medusa_gorgon` | Harriet - Mature British Actress | `aAsWcN5jdLdiYG7Hq0YL` | — |
| `boss:hypnos` | Rodo - Calm & Low | `HY3TS25BHEPeVdb2Lwn4` | rate: 0.94 |
| `boss:terrible_old_man` | Frederick - Old Gnarly Narrator | `uVKHymY7OYMd6OailpG5` | — |
| `boss:zkauba` | Kalen | `wJitxbuYOmWYd7CIK0KK` | — |
| `boss:cthulhu` | Matthew Schmitz - The Demon | `rCYFsCX2waxtHCgVD0e8` | rate: 0.8, echo: 0.6 |
| `boss:father_dagon` | Malvoryx The Monster | `ysswSXp8U9dFpzPJqFje` | rate: 0.88, echo: 0.45 |
| `boss:mother_hydra` | Blue - Commander with Grit | `YGWwh1G8pUwWmJyCCpma` | rate: 0.92, echo: 0.45 |
| `boss:hastur` | Katie - Soft Whisper Voice | `jdrqQ2ZMWENd1cuRByWG` | echo: 0.5 |
| `boss:tsathoggua` | Justin - Trusting Calm | `NyBVtlh1XAem9yCxNuWk` | rate: 0.78, echo: 0.4 |
| `boss:great_ones` | Malvoryx The Monster | `ysswSXp8U9dFpzPJqFje` | rate: 0.82, echo: 0.6 |
| `boss:yog_sothoth` | Parasyte - Dweller in the Deep-Dark | `k1fCGnhRbXzd6bzwlD2B` | rate: 0.88, echo: 0.7 |
| `boss:umr_at_tawil` | Mossbeard – The God of the Wild | `bFrjFL4nlpeYNwNRhXxq` | — |
| `boss:shub_niggurath` | Beatrice - Mature Female Storyteller | `kkPJzQOWz2Oz9cUaEaQd` | rate: 0.82, echo: 0.55 |
| `boss:nyarlathotep` | George - Warm, Captivating Storyteller (premade) | `JBFqnCBsd6RMkjVDRZzb` | rate: 0.97, echo: 0.15 |

## Making the recordings, and making them again

1. `VOICES_TODO=todo.json npx vitest run tests/voiceCoverage.test.ts` writes every line that has no recording:
   its clip name, speaker, voice and the performed text.
2. Make one take of each in its voice with model `eleven_v4`: in ElevenLabs' Text to Speech, or through the
   ElevenLabs connector (`creative_generate_speech`, one generation each, the voice id from the table, the
   performed text as the prompt, with the three names above respelt in IPA). A take that sounds wrong is made
   again, not cut.
3. Save the MP3 (128 kbit/s, 44.1 kHz, as ElevenLabs gives it) as `public/voice/<clip name>.mp3`.
4. `VOICES_INDEX=1 npx vitest run tests/voiceCoverage.test.ts` rewrites `index.json`; `npm run check`.

To **recast** a speaker: change its voice in `speechCast.ts`, make its lines again (the names do not change),
run the tests. To change a **performance**: edit the line's tags in the `speech*.ts` file and make it again.
To change a **word**: change `data/npcs.ts` (or the line in `speechBosses.ts`) and its performed form together,
delete the old recording and make the new one. A person's line added to `data/npcs.ts` fails `speech.test.ts`
until its performed form is added, and is shown and not heard until its recording is made.

If a plan cannot use library voices, every speaker can be given one of the premade ones (Eric, Will, Adam, Roger,
Brian, Callum, Chris, Bill, Daniel, George, Harry): the first set of recordings was made that way.

## What was checked, and what was not

The takes were made on 1 October 2026 on a Creator plan; v4 then cost no credits.

- Every file is an MP3 of 3.4 to 20.7 seconds (23.6 minutes in all) and at most 350 KB (25.7 MB in all); its
  length is the one ElevenLabs reported for it, to within 0.1 s; the speaking rate (letters a second) of each
  speaker's lines is even, and the five slow ones are the lines with a `[long pause]`.
- **Read back by a machine.** An offline speech-to-text pass (faster-whisper, `base.en`, with `small` for the
  doubtful) over all 177: no `[tag]` was spoken as a word; 97 match the words letter for letter and 172 to 0.9
  or better. The five below that are a chant in an invented tongue (Cthulhu's), a number written in digits
  (Charles's "six hundred") and three names the recogniser could not know (Zamacona, Shub-Niggurath,
  Yog-Sothoth). Five takes whose plain words were misheard (the Black Man's two, Carter's, Zadok's, Curtis's)
  were made again, and by both models together each new take read back closer than the old and replaced it.
  This says what was spoken, not how well. (ElevenLabs' own transcribe node is no use for it: given a speech
  node it hands back the prompt.)
- **Not heard.** Nobody has auditioned the takes or the casting: whether a voice suits its speaker, whether the
  great ones are great enough, whether a `rate` and an `echo` are right, whether a line is acted as it is
  written. The level was measured against the bed (the `AUDIO.speech` make-up gain), not judged by ear. Listen
  to them (the flows below hold every take, with its prompt), then recast or re-perform what is wrong.

The takes are in these ElevenLabs flows (open one to hear each with its prompt; they hold some strays: a
failed take from the free plan, a transcription node):

| the takes of | flow |
|---|---|
| Peaslee | https://elevenlabs.io/app/flows/1TqtoOE11p9jPy5K7yBl |
| Gilman | https://elevenlabs.io/app/flows/i7qeWNwDSuXuJIcXHnpx |
| Morgan | https://elevenlabs.io/app/flows/WyzCqqSa5kd4vnsoN4qK |
| Kuranes | https://elevenlabs.io/app/flows/0Jj6WIeAKV52w3MwMK3o |
| Zadok | https://elevenlabs.io/app/flows/IAH3scJorZ5JL0RpNfzs |
| Wilmarth | https://elevenlabs.io/app/flows/daiFFCALezrPVstxAD5R |
| Willett | https://elevenlabs.io/app/flows/fGCpd3EC5aqNpuo8fOPw |
| Curtis | https://elevenlabs.io/app/flows/Rox5Daq6zOrf9t72VRFE |
| Dyer | https://elevenlabs.io/app/flows/w1Pi37BtbbwbN2qBSdf3 |
| Nathaniel | https://elevenlabs.io/app/flows/z9vwDPvzyk9HQrKFoDFf |
| Zamacona | https://elevenlabs.io/app/flows/EZHSLpdOLz3biacgvxGi |
| Johansen | https://elevenlabs.io/app/flows/iCM4caRlch6txnH3ED7P |
| Akeley | https://elevenlabs.io/app/flows/bJcmDdpjp5QLapux1Vfl |
| Carter | https://elevenlabs.io/app/flows/jaV5DlUOWZe9HqySKsdS |
| Nasht | https://elevenlabs.io/app/flows/Cy5uUNSC9NKiC9sLQcxY |
| Wilbur, the Dunwich Horror, Keziah Mason, Brown Jenkin, the Black Man, Curwen, Orne | https://elevenlabs.io/app/flows/9BYp05KTnTyJHuTy1Ges |
| Hutchinson, Waite, the Whisperer, the Voice in the Tomb, Lilith, Dr Muñoz, Charles le Sorcier | https://elevenlabs.io/app/flows/w90PhVB7eVQVdLnZf8gJ |
| Cthulhu, Dagon, Hydra, Medusa, Hypnos, the Terrible Old Man, Zkauba | https://elevenlabs.io/app/flows/dOQRzJQiBkgIgsQwY5NL |
| Hastur, Tsathoggua, the Great Ones, Yog-Sothoth, 'Umr at-Tawil, Shub-Niggurath, Nyarlathotep | https://elevenlabs.io/app/flows/StyntZxdbmkjrFApkjsc |

## Licence and disclosure

Recordings made under a plan carry that plan's terms, and a library voice has its own licence: check both
before the game is sold (`public/voice/CREDITS.md`). The credits (`data/credits.ts`) say the voices are
synthetic and whose. Steam asks that AI-generated content be disclosed on a game's store page.
