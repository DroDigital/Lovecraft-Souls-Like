/**
 * The lead's mark (playtest round 4, systems/lead.ts): a hollow diamond, breathing softly, where
 * the story leads; on the minimap, when that lies beyond its edge, a pointer on the rim toward it.
 * Only within the realm on show: another realm is reached by its gate or stair, which the
 * journal's line names.
 */

import type { XZ } from '../core/geom';
import type { RegionDef } from '../data/regions';
import { regionAt } from '../world/worldMap';
import { BONE } from './hudKit';
import type { MapView } from './mapPainter';

export function drawLead(ctx: CanvasRenderingContext2D, view: MapView, at: XZ | null, realm: readonly RegionDef[], rim: boolean): void {
  if (!at || !realm.some((r) => r.id === regionAt(at.x, at.z)?.id)) return;
  let x = (at.x - view.cx) * view.scale + view.w / 2;
  let y = (view.cz - at.z) * view.scale + view.h / 2;
  const [cx, cy] = [view.w / 2, view.h / 2];
  const edge = Math.min(cx, cy) - 7;
  const d = Math.hypot(x - cx, y - cy);
  const beyond = rim && d > edge;
  if (beyond) [x, y] = [cx + ((x - cx) / d) * edge, cy + ((y - cy) / d) * edge];
  else if (x < -8 || y < -8 || x > view.w + 8 || y > view.h + 8) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha = 0.7 + 0.3 * Math.sin(performance.now() / 300);
  ctx.beginPath();
  if (beyond) {
    ctx.rotate(Math.atan2(y - cy, x - cx));
    ctx.moveTo(5, 0);
    ctx.lineTo(-3, -4);
    ctx.lineTo(-3, 4);
    ctx.closePath();
  } else {
    ctx.moveTo(0, -6);
    ctx.lineTo(6, 0);
    ctx.lineTo(0, 6);
    ctx.lineTo(-6, 0);
    ctx.closePath();
  }
  ctx.lineWidth = 3.5;
  ctx.strokeStyle = '#000';
  ctx.stroke();
  ctx.lineWidth = 1.6;
  ctx.strokeStyle = BONE;
  ctx.stroke();
  if (beyond) {
    ctx.fillStyle = BONE;
    ctx.fill();
  } else ctx.fillRect(-1, -1, 2, 2);
  ctx.restore();
}
