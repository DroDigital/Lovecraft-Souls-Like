/**
 * `?bestiary` (spec §3C): every roster entity by tier with its name, tier and source. Sprites cycle
 * through their states straight from the atlas; colossi are small live renders of their
 * assemblies. Clicking one spawns it in the arena (`?spawn=<id>`); variant links spawn a variant.
 */

import * as THREE from 'three';
import { ENTITIES, paramsOf, variantOf } from '../data/registry';
import { TIERS, type AssemblyRecipe, type EntityDef } from '../data/schema';
import { FX } from '../data/tuning';
import { buildAssembly, type Assembly } from '../render/assemblies';
import { buildAtlas, CELL, cellOrigin, SPRITE_STATES, spriteKey, STATE_POSES, type SpriteAtlas } from '../render/sprites/atlas';
import { worldUniforms } from '../render/worldMaterial';

const BONE = '#d9d0b8';
const TILE = 128; // CSS pixels per 64-pixel sprite
const TIER_NAMES: Record<string, string> = {
  lesser: 'Lesser',
  greater: 'Greater',
  named: 'Named',
  great_old_one: 'Great Old Ones',
  outer_god: 'Outer Gods',
  ally: 'Allies',
};

/** The frame sequence a tile loops through: every frame of every state, in order. */
const LOOP = SPRITE_STATES.flatMap((s) => STATE_POSES[s].map((_, f) => [s, f] as const));

function el<K extends keyof HTMLElementTagNameMap>(tag: K, style: string, text = '', parent?: HTMLElement): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  e.style.cssText = style;
  e.textContent = text;
  parent?.append(e);
  return e;
}

/** Copies one atlas cell into a 64×64 canvas; glow pixels are drawn opaque. */
function blit(ctx: CanvasRenderingContext2D, atlas: SpriteAtlas, cell: number): void {
  const [cx, cy] = cellOrigin(cell);
  const img = ctx.createImageData(CELL, CELL);
  for (let y = 0; y < CELL; y++) {
    const row = atlas.data.subarray(((cy + y) * atlas.width + cx) * 4, ((cy + y) * atlas.width + cx + CELL) * 4);
    img.data.set(row, y * CELL * 4);
  }
  for (let i = 3; i < img.data.length; i += 4) if (img.data[i] > 0) img.data[i] = 255;
  ctx.putImageData(img, 0, 0);
}

function tile(grid: HTMLElement, d: EntityDef): HTMLCanvasElement {
  const card = el('a', `display:block;width:${TILE + 16}px;padding:8px;background:#0c0c0e;border:1px solid #2a2a2e;color:${BONE};text-decoration:none;cursor:pointer`, '', grid);
  card.href = `?spawn=${d.id}`;
  card.title = `Spawn ${d.name} in the arena`;
  const canvas = el('canvas', `width:${TILE}px;height:${TILE}px;image-rendering:pixelated;background:#16161a`, '', card);
  [canvas.width, canvas.height] = d.sprite ? [CELL, CELL] : [TILE, TILE];
  el('div', 'font:bold 12px/1.3 monospace;margin-top:6px', d.name, card);
  el('div', 'font:11px/1.3 monospace;opacity:.6', `${TIER_NAMES[d.tier]} · ${paramsOf(d.behavior).hide !== 'none' ? `${d.behavior.archetype} (hidden)` : d.behavior.archetype}`, card);
  el('div', 'font:italic 11px/1.3 serif;opacity:.5', `${d.source}${d.canonLooks ? '' : ' · conjectured look'}`, card);
  const links = el('div', 'font:11px/1.6 monospace', '', card);
  for (const v of ['eldritch', 'boss'] as const) {
    if (!variantOf(d, v)) continue;
    const a = el('a', `color:${BONE};opacity:.7;margin-right:8px`, `${v} variant`, links);
    a.href = `?spawn=${d.id}&variant=${v}`;
    a.addEventListener('click', (e) => e.stopPropagation());
  }
  return canvas;
}

/** A tiny renderer for the colossi thumbnails; they share the world materials without fog. */
function assemblyRenderer(): { draw(asm: Assembly, r: AssemblyRecipe, ctx: CanvasRenderingContext2D, time: number): void } {
  THREE.ColorManagement.enabled = false;
  const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true });
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  renderer.setSize(TILE, TILE, false);
  renderer.setClearColor(new THREE.Color(...FX.fogColor));
  worldUniforms.uRes.value.set(TILE, TILE);
  worldUniforms.uFogAmount.value = 0;
  worldUniforms.uSnap.value = 1;
  worldUniforms.uAffine.value = 1;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.5, 400);
  return {
    draw(asm, r, ctx, time) {
      scene.add(asm.root);
      asm.root.rotation.y = time * 0.3;
      asm.animate(time, 0.3 + 0.3 * Math.sin(time), 0);
      const [aim, back] = r.body === 'mound' ? [0.25, 1.3] : [0.5, 1.9];
      camera.position.set(0, r.scale * (aim + 0.1), r.scale * back);
      camera.lookAt(0, r.scale * aim, 0);
      worldUniforms.uTime.value = time;
      renderer.render(scene, camera);
      ctx.drawImage(renderer.domElement, 0, 0);
      scene.remove(asm.root);
    },
  };
}

export function startBestiary(): void {
  document.documentElement.style.cssText = 'height:auto;overflow:auto;background:#050506';
  document.body.style.cssText = `display:block;height:auto;overflow:visible;margin:0;padding:24px;background:#050506;color:${BONE};font-family:monospace`;
  const atlas = buildAtlas();
  const header = el('div', 'margin-bottom:18px', '', document.body);
  el('div', 'font:bold 20px monospace;letter-spacing:.08em', 'BESTIARY', header);
  el('div', 'opacity:.6;margin-top:4px', `${ENTITIES.length} entities · click one to spawn it in the arena · `, header).append(
    Object.assign(el('a', `color:${BONE}`, 'back to the arena'), { href: '?' }),
  );
  const sprites: { ctx: CanvasRenderingContext2D; key: string }[] = [];
  const colossi: { ctx: CanvasRenderingContext2D; asm: Assembly; recipe: AssemblyRecipe }[] = [];
  for (const t of TIERS) {
    const defs = ENTITIES.filter((d) => d.tier === t);
    el('div', 'font:bold 14px monospace;margin:22px 0 10px;opacity:.85;letter-spacing:.06em', `${TIER_NAMES[t].toUpperCase()} (${defs.length})`, document.body);
    const grid = el('div', 'display:flex;flex-wrap:wrap;gap:10px', '', document.body);
    defs.forEach((d, i) => {
      const ctx = tile(grid, d).getContext('2d')!;
      if (d.sprite) sprites.push({ ctx, key: spriteKey(d.id) });
      else colossi.push({ ctx, asm: buildAssembly(d.assembly!, i + 1), recipe: d.assembly! });
    });
  }
  const three = colossi.length > 0 ? assemblyRenderer() : null;
  let tick = 0;
  const paint = (): void => {
    const [state, frame] = LOOP[Math.floor(tick / 2) % LOOP.length];
    for (const s of sprites) blit(s.ctx, atlas, atlas.frames.get(s.key)![state][frame]);
    for (const c of colossi) three?.draw(c.asm, c.recipe, c.ctx, tick * 0.2);
    tick++;
  };
  paint();
  setInterval(paint, 200);
}
