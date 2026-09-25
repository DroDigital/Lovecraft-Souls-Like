/**
 * Paints a view of the map (playtest round 1), for the minimap and the full map alike: the fog,
 * each region's art where it has been seen (its edges soft), the places marked there — Elder Signs
 * (bright once lit), gates, dungeon doors with an eye for a boss met within, an eye over each boss's
 * ring (struck through once it is slain) — the Echoes left behind, region names, and the
 * investigator's arrow. North is up.
 */

import type { RegionDef } from '../data/regions';
import type { Game } from '../systems/components';
import { cellsOf, isExplored } from '../systems/exploration';
import { mapPlaces, type MapPlace } from '../world/mapData';
import { regionRect } from '../world/worldMap';
import { artOf, type Art } from './mapArt';

export interface MapView {
  cx: number; // world point at the centre
  cz: number;
  scale: number; // pixels a metre
  w: number;
  h: number;
}

export interface MapPainter {
  paint(ctx: CanvasRenderingContext2D, view: MapView, realm: readonly RegionDef[], labels: boolean): void;
}

const FOG = '#0b0b0d';
const BONE = '#d9d0b8';
const DIM = '#8a8474';
const MAGENTA = '#d80073';
const PURPLE = '#9a5ad0';
const GREEN = '#2bffa0';

interface Veil {
  canvas: HTMLCanvasElement;
  mask: HTMLCanvasElement;
  art: Art;
  artVersion: number;
  seenVersion: number;
}

/** The unknown: a dark sheet with faint specks and the survey's ruled squares. */
function fogPattern(ctx: CanvasRenderingContext2D): CanvasPattern | null {
  const tile = document.createElement('canvas');
  [tile.width, tile.height] = [64, 64];
  const t = tile.getContext('2d')!;
  t.fillStyle = FOG;
  t.fillRect(0, 0, 64, 64);
  for (let i = 0; i < 90; i++) {
    t.fillStyle = `rgba(217,208,184,${0.02 + 0.04 * Math.random()})`;
    t.fillRect(Math.floor(Math.random() * 64), Math.floor(Math.random() * 64), 1, 1);
  }
  t.fillStyle = 'rgba(217,208,184,0.035)';
  t.fillRect(0, 0, 64, 1);
  t.fillRect(0, 0, 1, 64);
  return ctx.createPattern(tile, 'repeat');
}

export function createMapPainter(g: Game): MapPainter {
  const seen = new Map<string, number>(); // region → how often more of it has been seen
  g.events.on('Explored', ({ region }) => void seen.set(region, (seen.get(region) ?? 0) + 1));
  const veils = new Map<string, Veil>();
  let fog: CanvasPattern | string = FOG;

  /** The region's art, with only what has been seen showing (rebuilt as either changes). */
  function veiled(r: RegionDef): HTMLCanvasElement | null {
    const ex = g.overworld?.explored.get(r.id);
    if (!ex) return null;
    let v = veils.get(r.id);
    if (!v) {
      const art = artOf(r);
      const { cols, rows } = cellsOf(r);
      const canvas = document.createElement('canvas');
      [canvas.width, canvas.height] = [art.canvas.width, art.canvas.height];
      const mask = document.createElement('canvas');
      [mask.width, mask.height] = [cols + 2, rows + 2]; // a border cell each side, copied from the edge, so the blur leaves no seam between regions
      veils.set(r.id, (v = { canvas, mask, art, artVersion: -1, seenVersion: -1 }));
    }
    const now = seen.get(r.id) ?? 0;
    if (v.artVersion === v.art.version && v.seenVersion === now) return v.canvas;
    [v.artVersion, v.seenVersion] = [v.art.version, now];
    const m = v.mask.getContext('2d')!;
    const [mw, mh] = [v.mask.width, v.mask.height];
    const [cols, rows] = [mw - 2, mh - 2];
    const img = m.createImageData(mw, mh);
    for (let y = 0; y < mh; y++) {
      const iz = Math.min(rows - 1, Math.max(0, rows - y)); // north row first; border rows copy their neighbours
      for (let x = 0; x < mw; x++) img.data[(y * mw + x) * 4 + 3] = ex[iz * cols + Math.min(cols - 1, Math.max(0, x - 1))] ? 255 : 0;
    }
    m.putImageData(img, 0, 0);
    const cell = v.canvas.width / cols;
    const c = v.canvas.getContext('2d')!;
    c.globalCompositeOperation = 'copy';
    c.drawImage(v.art.canvas, 0, 0);
    c.globalCompositeOperation = 'destination-in';
    c.imageSmoothingEnabled = true;
    c.filter = 'blur(5px)'; // the fog's edge soft, not stepped cell by cell
    c.drawImage(v.mask, -cell, -cell, v.canvas.width + 2 * cell, v.canvas.height + 2 * cell);
    c.filter = 'none';
    c.globalCompositeOperation = 'source-over';
    return v.canvas;
  }

  const star = (ctx: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string): void => {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
      const d = i % 2 ? r * 0.45 : r;
      ctx.lineTo(x + Math.cos(a) * d, y + Math.sin(a) * d);
    }
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.stroke();
  };
  const eye = (ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, struck: boolean): void => {
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x - r, y);
    ctx.quadraticCurveTo(x, y - r * 1.1, x + r, y);
    ctx.quadraticCurveTo(x, y + r * 1.1, x - r, y);
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, r * 0.35, 0, Math.PI * 2);
    ctx.fill();
    if (!struck) return;
    ctx.beginPath();
    ctx.moveTo(x - r, y + r * 0.8);
    ctx.lineTo(x + r, y - r * 0.8);
    ctx.stroke();
  };

  function place(ctx: CanvasRenderingContext2D, p: MapPlace, x: number, y: number, labels: boolean): void {
    const ow = g.overworld!;
    const slain = (id: string): boolean => ow.slain.has(`boss:${id}`);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    if (p.kind === 'sign') star(ctx, x, y, 5.5, ow.discovered.has(p.id) ? BONE : DIM);
    else if (p.kind === 'gate') {
      ctx.strokeStyle = PURPLE;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, 4.5, 0, Math.PI * 2);
      ctx.stroke();
    } else if (p.kind === 'dungeon') {
      ctx.fillStyle = '#161618';
      ctx.strokeStyle = BONE;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x - 4, y + 4);
      ctx.lineTo(x - 4, y - 1);
      ctx.arc(x, y - 1, 4, Math.PI, 0);
      ctx.lineTo(x + 4, y + 4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      const met = p.bosses.filter((b) => g.mind.seen.has(b) || slain(b));
      if (met.length) eye(ctx, x + 9, y - 3, 4, met.every(slain) ? DIM : MAGENTA, met.every(slain));
    } else eye(ctx, x, y, 6, p.bosses.every(slain) ? DIM : MAGENTA, p.bosses.every(slain));
    if (labels && p.kind === 'sign' && ow.discovered.has(p.id)) {
      ctx.fillStyle = BONE;
      ctx.font = '10px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(p.name, x + 8, y + 3);
    }
  }

  return {
    paint(ctx, view, realm, labels) {
      const ow = g.overworld;
      if (typeof fog === 'string') fog = fogPattern(ctx) ?? FOG;
      ctx.fillStyle = fog;
      ctx.fillRect(0, 0, view.w, view.h);
      if (!ow) return;
      const sx = (x: number): number => (x - view.cx) * view.scale + view.w / 2;
      const sy = (z: number): number => (view.cz - z) * view.scale + view.h / 2;
      ctx.imageSmoothingEnabled = view.scale < 1;
      for (const r of realm) {
        const rc = regionRect(r);
        const [x0, y0, x1, y1] = [sx(rc.x0), sy(rc.z1), sx(rc.x1), sy(rc.z0)];
        if (x1 < 0 || y1 < 0 || x0 > view.w || y0 > view.h) continue;
        const img = veiled(r);
        if (img) ctx.drawImage(img, x0 - 0.5, y0 - 0.5, x1 - x0 + 1, y1 - y0 + 1); // half a pixel over, so no seam shows between regions
      }
      const inRealm = new Set(realm.map((r) => r.id));
      for (const p of mapPlaces()) {
        if (!inRealm.has(p.region)) continue;
        const [x, y] = [sx(p.x), sy(p.z)];
        if (x < -20 || y < -20 || x > view.w + 20 || y > view.h + 20) continue;
        if (isExplored(ow.explored, p.x, p.z) || (p.kind === 'sign' && ow.discovered.has(p.id))) place(ctx, p, x, y, labels);
      }
      for (const d of g.ecs.query('drop')) {
        const at = g.ecs.c.transform.get(d)!.pos;
        const [x, y] = [sx(at.x), sy(at.z)];
        ctx.fillStyle = GREEN;
        ctx.beginPath();
        ctx.moveTo(x, y - 4);
        ctx.lineTo(x + 3, y);
        ctx.lineTo(x, y + 4);
        ctx.lineTo(x - 3, y);
        ctx.fill();
      }
      if (labels) {
        ctx.font = '12px monospace';
        ctx.textAlign = 'center';
        for (const r of realm) {
          if (!ow.explored.get(r.id)?.some((v) => v > 0)) continue;
          const rc = regionRect(r);
          ctx.fillStyle = 'rgba(217,208,184,0.55)';
          ctx.fillText(r.name.toUpperCase(), sx((rc.x0 + rc.x1) / 2), sy(rc.z1) + 16);
        }
      }
      const tr = g.ecs.c.transform.get(g.player.id)!;
      const [px, py] = [sx(tr.pos.x), sy(tr.pos.z)];
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(tr.yaw); // yaw 0 faces north (up); east is a quarter turn clockwise
      ctx.beginPath();
      ctx.moveTo(0, -7);
      ctx.lineTo(5, 5);
      ctx.lineTo(0, 2.5);
      ctx.lineTo(-5, 5);
      ctx.closePath();
      ctx.fillStyle = BONE;
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fill();
      ctx.restore();
    },
  };
}
