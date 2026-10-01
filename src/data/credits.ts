/**
 * The credits (playtest round 12: there were none, nor any third-party notices), shown after an
 * ending and from the title and pause menus (ui/credits.ts). The recorded sounds are credited in
 * full, file by file, in public/audio/CREDITS.md; here, by the recordists. The voices of the people and
 * the horrors are synthetic, and said to be (public/voice/CREDITS.md). Data only.
 */

export interface CreditBlock {
  heading: string;
  lines: readonly string[];
}

export const CREDITS: readonly CreditBlock[] = [
  { heading: 'AFTER THE STORIES OF', lines: ['H. P. Lovecraft', 'and the tales he revised and wrote with Zealia Bishop, Hazel Heald, Sonia Greene, Harry Houdini, E. Hoffmann Price, Kenneth Sterling, and the authors of "The Challenge from Beyond"'] },
  { heading: 'MADE WITH', lines: ['Claude Code', 'every texture, sprite, mesh and synthesised sound generated in code'] },
  { heading: 'RECORDED SOUNDS', lines: ['from Freesound, dedicated to the public domain (CC0 1.0), cut and treated for the game:', 'Craig Smith (craigsmith)', 'Breviceps', 'EvaMusik', 'fonografico', 'corkob', 'Lsoundaccount', 'TheKingOfGeeks360', 'waterboy920'] },
  { heading: 'VOICES', lines: ['the people of the realms and the horrors that speak: synthetic voices, made with ElevenLabs (Eleven v4)'] },
  { heading: 'TITLE THEME', lines: ['"Subterranean Pulse"'] },
  { heading: 'SOFTWARE', lines: ['three.js · MIT License · © 2010–2026 three.js authors', 'Electron · MIT License · © Electron contributors, with Chromium under its own licences', 'built with TypeScript and Vite'] },
  { heading: '', lines: ['Thank you for dreaming.'] },
];
