/**
 * Lines shown under a place's name while the veil is down (playtest round 14): Lovecraft's own words
 * (from stories published by 1928) and the dream's quieter lessons, one at random each time.
 */

/** Lovecraft's own words (from stories published by 1928), which may be said at any time. */
export const QUOTES: readonly string[] = [
  '“The oldest and strongest emotion of mankind is fear.”',
  '“We live on a placid island of ignorance in the midst of black seas of infinity.”',
  '“That is not dead which can eternal lie, and with strange aeons even death may die.”',
  '“Memories and possibilities are ever more hideous than realities.”',
  '“Searchers after horror haunt strange, far places.”',
  '“Men of broader intellect know that there is no sharp distinction between the real and the unreal.”',
  '“Ph’nglui mglw’nafh Cthulhu R’lyeh wgah’nagl fhtagn.”',
  '“Life is a hideous thing, and from the background behind what we know of it peer daemoniacal hints of truth.”',
];

/**
 * The dream's quieter lessons, each said only once what it speaks of has come up (round 24: a new game's
 * first line could be about fog closing before a horror, before any horror had been met): `topic` is the
 * id of the hint (ui/hints.ts) that must have been shown.
 */
export const TIPS: readonly { topic: string; text: string }[] = [
  { topic: 'echoes', text: 'Your Echoes lie where you fell. Walk back to them and they are yours again.' },
  { topic: 'sign', text: 'Rest at an Elder Sign to be made whole, though the slain rise with you.' },
  { topic: 'fight', text: 'A parry timed as the blow lands leaves a foe open to the riposte.' },
  { topic: 'fight', text: 'A blow to a foe’s back lands as a riposte.' },
  { topic: 'hurt', text: 'Laudanum steadies the mind a while; West’s Reagent closes wounds.' },
  { topic: 'gun', text: 'The revolver holds six and hits hardest up close; spare cartridges lie about the world, and some merchants sell them.' },
  { topic: 'unmoored', text: 'A mind come unmoored wounds less and is wounded more. Rest, lamplight and Laudanum mend it.' },
  { topic: 'boss', text: 'Star-stones, set into a weapon at an Elder Sign, make it keener.' },
  { topic: 'insight', text: 'Insight shows what a sound mind cannot see.' },
  { topic: 'boss', text: 'Before a horror the fog closes: no one leaves until one of you falls.' },
  { topic: 'blind', text: 'Azathoth is blind. It hears.' },
];

/** Every line that may be said under the veil. */
export const LORE_LINES: readonly string[] = [...QUOTES, ...TIPS.map((t) => t.text)];

/**
 * The line under the veil: the first lesson that has come up and has not been said yet (`seen`: the
 * hints shown; `shown`: the lines said), and only when there is none, one of Lovecraft's at random.
 */
export function pickLore(seen: ReadonlySet<string>, shown: ReadonlySet<string>, rand: () => number = Math.random): string {
  const tip = TIPS.find((t) => seen.has(t.topic) && !shown.has(t.text));
  return tip ? tip.text : QUOTES[Math.floor(rand() * QUOTES.length)];
}

/** Said under the veil as the investigator first goes down into the dream (round 17), in place of a line at random. */
export const DESCENT_LINE = 'Seventy steps of light slumber, down to the cavern of flame. Behind you the waking world grows thin.';
