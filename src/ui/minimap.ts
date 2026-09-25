/**
 * The minimap (playtest round 1): top right, round, north up and centred on the investigator,
 * showing the ground they have seen within EXPLORE.minimap metres and what is marked on it, and
 * where the story leads (on the rim when it lies beyond). It also drives the map art's slow drawing, a little each frame. Absent in the arena.
 */

import { EXPLORE } from '../data/tuning';
import type { Game } from '../systems/components';
import { mainLead } from '../systems/lead';
import { realmOf } from '../world/mapData';
import { regionAt } from '../world/worldMap';
import { BONE, el } from './hudKit';
import { drawLead } from './leadMark';
import { workArt } from './mapArt';
import type { MapPainter } from './mapPainter';

const SIZE = 128; // pixels across
const ART_MS = 1.5; // milliseconds a frame for drawing the map's art

export interface Minimap {
  update(): void;
}

export function createMinimap(g: Game, root: HTMLElement, painter: MapPainter): Minimap {
  const frame = el(`position:absolute;right:16px;top:16px;width:${SIZE}px;height:${SIZE}px`, '', root);
  const canvas = document.createElement('canvas');
  [canvas.width, canvas.height] = [SIZE, SIZE];
  canvas.style.cssText = `width:100%;height:100%;border-radius:50%;border:1px solid ${BONE}66;box-shadow:0 0 0 2px #000c;opacity:.92`;
  frame.append(canvas);
  el(`position:absolute;left:0;right:0;top:-2px;text-align:center;font-size:10px;text-shadow:0 0 3px #000`, 'N', frame);
  el(`position:absolute;left:0;right:0;bottom:-16px;text-align:center;font-size:9px;letter-spacing:2px;opacity:.55`, 'M  MAP', frame);
  const ctx = canvas.getContext('2d')!;
  let tick = 0;
  if (!g.overworld) frame.style.display = 'none';
  return {
    update() {
      if (!g.overworld) return;
      workArt(ART_MS);
      if (tick++ % 2) return; // thirty times a second is plenty
      const p = g.ecs.c.transform.get(g.player.id)!.pos;
      const region = g.overworld.region ?? regionAt(p.x, p.z)?.id;
      if (!region) return;
      const view = { cx: p.x, cz: p.z, scale: SIZE / 2 / EXPLORE.minimap, w: SIZE, h: SIZE };
      painter.paint(ctx, view, realmOf(region), false);
      drawLead(ctx, view, mainLead(g)?.at ?? null, realmOf(region), true);
    },
  };
}
