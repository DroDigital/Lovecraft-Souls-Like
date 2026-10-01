# The voices

Every recording in this folder is one line of the game, spoken by a synthetic voice made with
[ElevenLabs](https://elevenlabs.io) Text to Speech, model **Eleven v4** (`eleven_v4`). The people of the
realms (`npc:<id>`) and the horrors that speak (`boss:<roster id>`) each have a voice from ElevenLabs'
voice library, cast in `src/data/speechCast.ts` (by voice id); what each says, with its [audio tags]
(`[weary]`, `[whispers]`, `[pause]`: performed, not read aloud), is in `src/data/speechNpcs.ts`,
`speechFar.ts` and `speechBosses.ts`.

A file is named by who says the line and a hash of its words (`src/data/speech.ts`, `clipOf`), so a line
whose words change needs a new recording, and one whose capitals or marks change does not.
`index.json` lists the files there are; a line with no file here is shown, and not heard.
`VOICES_INDEX=1 npx vitest run tests/voiceCoverage.test.ts` writes it again from the folder;
`VOICES_TODO=todo.json npx vitest run tests/voiceCoverage.test.ts` writes the lines that have no recording yet.
More in `docs/VOICES.md`.

## Before the game is sold

The terms of the ElevenLabs plan a recording was made under decide what may be done with it: their free
plan has asked for attribution and has not covered commercial use, and a voice from the library carries
its own licence. Check the current terms for the plan and for each voice cast, and make the recordings
again under a plan that covers selling the game if it does not. Steam also asks that AI-generated
content in a game be disclosed on its store page.
