/**
 * The minimap (playtest round 1): top right, round and centred on the investigator, showing the
 * ground they have seen within EXPLORE.minimap metres and what is marked on it, and where the story
 * leads (on the rim when it lies beyond). It turns with the camera, what lies ahead of it up (playtest
 * round 7), an N on the rim marking north. It also drives the map art's slow drawing, a little each
 * frame. Absent in the arena.
 */

import { EXPLORE, SIM } from '../data/tuning';
import { hourName, phaseOf } from '../systems/clock';
import type { Game } from '../systems/components';
import { mainLead } from '../systems/lead';
import { realmOf } from '../world/mapData';
import { regionAt } from '../world/worldMap';
import { glyph } from './glyphs';
import { BONE, el, setText } from './hudKit';
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
  const north = el(`position:absolute;left:50%;top:0;transform:translate(-50%,-50%);font-size:10px;text-shadow:0 0 3px #000,0 0 3px #000`, 'N', frame);
  const label = el(`position:absolute;left:0;right:0;bottom:-16px;text-align:center;font-size:9px;letter-spacing:2px;opacity:.55`, '', frame);
  // The night's clock (round 35), small and under the map: a hair line the night runs along, a moon on it where the night is, and the hour's name.
  const clock = el(`position:absolute;left:14px;right:14px;bottom:-34px;height:12px`, '', frame);
  el(`position:absolute;left:0;right:0;top:5px;height:1px;background:linear-gradient(90deg,${BONE}55,${BONE}33 70%,#9a9aa866)`, '', clock);
  const moon = el(`position:absolute;top:1px;width:8px;height:8px;margin-left:-4px;border-radius:50%;background:#e9e3cf;box-shadow:inset -3px -1px 0 0 #0b0a0e,0 0 5px #e9e3cf55;opacity:.85`, '', clock);
  const hour = el(`position:absolute;left:0;right:0;top:12px;text-align:center;font-size:8px;letter-spacing:3px;opacity:.5`, '', frame);
  hour.style.top = `${SIZE + 37}px`;
  const ctx = canvas.getContext('2d')!;
  let tick = 0;
  if (!g.overworld) frame.style.display = 'none';
  return {
    update() {
      setText(label, `${glyph('map').toUpperCase()}  MAP`); // the device in hand's button
      if (!g.overworld) return;
      const phase = phaseOf(g.frame / SIM.hz);
      moon.style.left = `${(phase * 100).toFixed(1)}%`;
      setText(hour, hourName(phase));
      workArt(ART_MS);
      if (tick++ % 2) return; // thirty times a second is plenty
      const p = g.ecs.c.transform.get(g.player.id)!.pos;
      const region = g.overworld.region ?? regionAt(p.x, p.z)?.id;
      if (!region) return;
      const view = { cx: p.x, cz: p.z, scale: SIZE / 2 / EXPLORE.minimap, w: SIZE, h: SIZE };
      const yaw = g.camera.yaw; // yaw 0 looks north; turning right lessens it
      ctx.clearRect(0, 0, SIZE, SIZE);
      ctx.save();
      ctx.translate(SIZE / 2, SIZE / 2);
      ctx.rotate(yaw); // what the camera looks at, up (the round face hides the square's turned corners)
      ctx.translate(-SIZE / 2, -SIZE / 2);
      painter.paint(ctx, view, realmOf(region), false);
      drawLead(ctx, view, mainLead(g)?.at ?? null, realmOf(region), true);
      ctx.restore();
      const r = SIZE / 2 - 1;
      north.style.left = `${SIZE / 2 + Math.sin(yaw) * r}px`;
      north.style.top = `${SIZE / 2 - Math.cos(yaw) * r}px`;
    },
  };
}
