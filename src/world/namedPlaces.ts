/**
 * The world's lesser places, named (playtest round 18; data/placeNames.ts): every feature of every
 * region's plan (its groves, graveyards, stone rings, ruins, outcrops, camps and landmarks) with a
 * name of its realm's words, the stories' own names first, never the same twice in one region, and
 * the same every time. Pure: no Three.js.
 */

import type { XZ } from '../core/geom';
import { createRng } from '../core/rng';
import { lexiconOf, TOLD } from '../data/placeNames';
import { REGIONS } from '../data/regions';
import type { FeatureKind } from './features';
import { regionPlan } from './regionPlan';
import { regionAt } from './worldMap';

export interface NamedPlace extends XZ {
  id: string; // region:index
  name: string;
  kind: FeatureKind;
  region: string;
  r: number; // metres: within this of its heart, the investigator is there
}

const GENERIC: Readonly<Record<FeatureKind, readonly string[]>> = {
  grove: ['Wood'],
  graveyard: ['Graves'],
  circle: ['Ring'],
  ruin: ['Ruin'],
  outcrop: ['Rock'],
  camp: ['Camp'],
  landmark: ['Stone'],
};

const cache = new Map<string, readonly NamedPlace[]>();

/** Names one region's places, from its realm's words; `used`: every name its realm has given already. */
function name(region: string, used: Set<string>): NamedPlace[] {
  const def = REGIONS.find((r) => r.id === region);
  const lex = lexiconOf(region);
  const rng = createRng([...region].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7));
  const pick = (kind: FeatureKind): string => {
    const told = TOLD[region]?.[kind]?.find((n) => !used.has(n));
    if (told) return told;
    const nouns = lex.nouns[kind] ?? GENERIC[kind];
    for (let tries = 0; tries < 200; tries++) {
      const n = `The ${lex.adjectives[Math.floor(rng() * lex.adjectives.length)]} ${nouns[Math.floor(rng() * nouns.length)]}`;
      if (!used.has(n)) return n;
    }
    return `The ${GENERIC[kind][0]}`;
  };
  return (def ? regionPlan(def).features : []).map((f, i) => {
    const n = pick(f.kind);
    used.add(n);
    return { id: `${region}:${i}`, name: n, kind: f.kind, region, x: f.x, z: f.z, r: f.r * 0.8 };
  });
}

/** A region's named places (the regions that share its words are named with it, in order, so none repeats another's). */
export function placesOf(region: string): readonly NamedPlace[] {
  if (!cache.has(region)) {
    const used = new Set<string>();
    for (const r of REGIONS) if (lexiconOf(r.id) === lexiconOf(region)) cache.set(r.id, name(r.id, used));
    if (!cache.has(region)) cache.set(region, name(region, used));
  }
  return cache.get(region)!;
}

/** The named place the investigator stands in at (x, z), if any. */
export function placeAt(x: number, z: number): NamedPlace | null {
  const region = regionAt(x, z);
  if (!region) return null;
  for (const p of placesOf(region.id)) if (Math.hypot(p.x - x, p.z - z) <= p.r) return p;
  return null;
}
