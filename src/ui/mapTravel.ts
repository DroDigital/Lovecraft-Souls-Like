/**
 * Fast travel from the full map (playtest round 7): a lit Elder Sign of the realm on show is picked
 * under the pointer, or in turn (nearest the investigator first) with Tab or the pad's shoulders.
 * The one chosen glows in a breathing ring, bone in Cosmic Purple like the veil's sign; choosing it
 * again (a second click, Enter, the pad's A) makes the journey, unless the words say why not
 * (checkpoints.ts's travelBar: a boss fight on, a foe hunting close by).
 */

import { distXZ, type XZ } from '../core/geom';
import type { RegionDef } from '../data/regions';
import type { Game } from '../systems/components';
import { mapPlaces, type MapPlace } from '../world/mapData';
import type { MapView } from './mapPainter';

const PICK_PX = 14; // a sign this near the pointer is picked
export const BAR_WORDS = {
  boss: 'NO JOURNEY WHILE THE FIGHT IS ON',
  foes: 'FOES HUNT YOU  ·  NO JOURNEY NOW',
  fallen: 'NO JOURNEY NOW',
} as const;

/** The lit Elder Signs of the realm, nearest `from` first. */
export function litSigns(g: Game, realm: readonly RegionDef[], from: XZ): MapPlace[] {
  const ids = new Set(realm.map((r) => r.id));
  return mapPlaces()
    .filter((p) => p.kind === 'sign' && ids.has(p.region) && !!g.overworld?.discovered.has(p.id))
    .sort((a, b) => distXZ(a, from) - distXZ(b, from));
}

const screenOf = (view: MapView, p: XZ): [number, number] => [(p.x - view.cx) * view.scale + view.w / 2, (view.cz - p.z) * view.scale + view.h / 2];

/** The lit sign nearest a point on the canvas (pixels), within PICK_PX, if any. */
export function signAt(signs: readonly MapPlace[], view: MapView, px: number, py: number): MapPlace | null {
  let best: MapPlace | null = null;
  let bestD = PICK_PX;
  for (const p of signs) {
    const [x, y] = screenOf(view, p);
    const d = Math.hypot(x - px, y - py);
    if (d < bestD) [best, bestD] = [p, d];
  }
  return best;
}

/** A ring about a sign: breathing and glowing for the one chosen (grey when barred), faint under the pointer. */
export function drawRing(ctx: CanvasRenderingContext2D, view: MapView, p: XZ, chosen: boolean, barred: boolean, now: number): void {
  const [x, y] = screenOf(view, p);
  const breath = 0.5 + 0.5 * Math.sin(now / 260);
  ctx.save();
  ctx.lineWidth = chosen ? 2 : 1;
  ctx.strokeStyle = barred ? '#8a8474' : chosen ? '#d9d0b8' : '#d9d0b899';
  ctx.shadowColor = barred ? '#000' : '#9a3cff';
  ctx.shadowBlur = chosen ? 10 + 8 * breath : 4;
  ctx.beginPath();
  ctx.arc(x, y, chosen ? 11 + 2 * breath : 10, 0, Math.PI * 2);
  ctx.stroke();
  if (chosen) {
    for (let i = 0; i < 4; i++) { // four ticks turning slowly about it, like a compass rose
      const a = now / 1800 + (i * Math.PI) / 2;
      const [r0, r1] = [15 + 2 * breath, 20 + 2 * breath];
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(a) * r0, y + Math.sin(a) * r0);
      ctx.lineTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1);
      ctx.stroke();
    }
  }
  ctx.restore();
}
