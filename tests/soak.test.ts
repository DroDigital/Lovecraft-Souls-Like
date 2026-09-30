/**
 * Soak (playtest round 24): random inputs for a few thousand frames across every realm, with the
 * roster's creatures conjured about the investigator, and the game's invariants checked as it runs:
 * nothing throws, nothing is not a number or out of its range, and a save loads as it was written.
 * The environment sets it wider (SOAK_SEEDS seeds of SOAK_FRAMES frames, from seed SOAK_FIRST); a finding fails the test with all of them listed.
 */
import { describe, expect, it } from 'vitest';
import { createRng } from '../src/core/rng';
import { BUTTONS, emptyInput, type Button, type InputFrame } from '../src/core/input';
import { GUN, SANITY } from '../src/data/tuning';
import { ROSTER_IDS } from '../src/data/roster';
import { createWorldGame, stepGame } from '../src/systems/game';
import { rest, teleport } from '../src/systems/checkpoints';
import { spawnCreature } from '../src/systems/creatures';
import { parseSave, snapshot } from '../src/systems/save';
import { setSanity } from '../src/systems/sanity';
import type { Game } from '../src/systems/components';
import { worldLayout } from '../src/world/placements';

const env = (globalThis as unknown as { process?: { env: Record<string, string | undefined> } }).process?.env ?? {}; // (the tests carry no Node typings)
const SEEDS = Number(env.SOAK_SEEDS ?? 2);
const FRAMES = Number(env.SOAK_FRAMES ?? 2500);
const FIRST = Number(env.SOAK_FIRST ?? 1);
const out: string[] = [];
const say = (s: string): void => void out.push(s);
const summaries: string[] = [];

const finite = (n: unknown): boolean => typeof n === 'number' && Number.isFinite(n);

function invariants(g: Game): string[] {
  const bad: string[] = [];
  const c = g.ecs.c;
  for (const [id, t] of c.transform) {
    if (![t.pos.x, t.pos.y, t.pos.z, t.yaw].every(finite)) bad.push(`entity ${id} (${c.model.get(id) ?? c.combatant.get(id)?.name ?? '?'}) transform not finite: ${JSON.stringify(t.pos)} yaw ${t.yaw}`);
    else if (Math.abs(t.pos.x) > 6000 || Math.abs(t.pos.z) > 6000 || t.pos.y < -80 || t.pos.y > 400) bad.push(`entity ${id} (${c.combatant.get(id)?.name ?? c.model.get(id) ?? '?'}) far off: ${JSON.stringify(t.pos)}`);
  }
  for (const [id, h] of c.health) {
    if (!finite(h.hp) || !finite(h.max)) bad.push(`entity ${id} health not finite ${h.hp}/${h.max}`);
    else if (h.hp > h.max + 1e-6) bad.push(`entity ${id} hp ${h.hp} > max ${h.max}`);
    else if (h.hp < 0) bad.push(`entity ${id} hp ${h.hp} < 0`);
  }
  for (const [id, s] of c.stamina) if (!finite(s.value) || s.value < -1e-6 || s.value > s.max + 1e-6) bad.push(`entity ${id} stamina ${s.value}/${s.max}`);
  const m = g.mind;
  if (!finite(m.sanity) || m.sanity < 0 || m.sanity > SANITY.max) bad.push(`sanity ${m.sanity}`);
  const p = g.player;
  if (!Number.isInteger(p.ammo) || p.ammo < 0 || p.ammo > GUN.chamber) bad.push(`ammo ${p.ammo}`);
  if (!Number.isInteger(p.rounds) || p.rounds < 0 || p.rounds > GUN.carry) bad.push(`rounds ${p.rounds}`);
  for (const k of ['laudanum', 'reagent', 'echoes', 'oil'] as const) if (!finite(p[k]) || p[k] < 0) bad.push(`${k} ${p[k]}`);
  if (g.ecs.c.transform.size > 4000) bad.push(`entities ${g.ecs.c.transform.size}`);
  return bad;
}

function makeInput(prev: Set<Button>, want: Set<Button>, rng: () => number, dir: { x: number; y: number }): InputFrame {
  const f = emptyInput();
  for (const b of BUTTONS) {
    const [was, is] = [prev.has(b), want.has(b)];
    f.held[b] = is;
    f.pressed[b] = is && !was;
    f.released[b] = was && !is;
  }
  f.moveX = dir.x;
  f.moveY = dir.y;
  f.lookX = (rng() - 0.5) * 0.06;
  f.lookY = (rng() - 0.5) * 0.02;
  f.switchTarget = rng() < 0.01 ? (rng() < 0.5 ? -1 : 1) : 0;
  return f;
}

describe('soak', () => {
  it('runs random play for many frames with the invariants held', () => {
    const layout = worldLayout();
    const signs = layout.signs;
    for (let seed = FIRST; seed < FIRST + SEEDS; seed++) {
      const rng = createRng(seed * 7919);
      let g = createWorldGame();
      const t0 = performance.now();
      let held = new Set<Button>();
      let want = new Set<Button>();
      let dir = { x: 0, y: 0 };
      let recent: string[] = [];
      const seen = new Set<string>();
      let slow = 0;
      for (let frame = 0; frame < FRAMES; frame++) {
        // Re-roll the intent now and then
        if (frame % 25 === 0) dir = rng() < 0.2 ? { x: 0, y: 0 } : { x: Math.round(rng() * 2 - 1), y: rng() < 0.7 ? 1 : Math.round(rng() * 2 - 1) };
        for (const b of BUTTONS) {
          const on = want.has(b);
          const flip = b === 'dodge' || b === 'block' ? 0.03 : b === 'light' || b === 'heavy' ? 0.05 : 0.012;
          if (rng() < flip) on ? want.delete(b) : want.add(b);
          if (!on && (b === 'reload' || b === 'heal' || b === 'item' || b === 'throw' || b === 'interact' || b === 'shoot') && rng() < 0.01) want.add(b);
          if (on && (b === 'reload' || b === 'heal' || b === 'item' || b === 'throw' || b === 'interact' || b === 'shoot') && rng() < 0.5) want.delete(b);
        }
        // Orchestration
        if (frame % 300 === 150) {
          const r = rng();
          if (r < 0.35) {
            const s = signs[Math.floor(rng() * signs.length)];
            const yaw = rng() * Math.PI * 2;
            teleport(g, { x: s.x + Math.sin(yaw) * 4, z: s.z + Math.cos(yaw) * 4, yaw });
            recent.push(`teleport ${s.id}`);
          } else if (r < 0.75) {
            const id = ROSTER_IDS[Math.floor(rng() * ROSTER_IDS.length)];
            const pp = g.ecs.c.transform.get(g.player.id)!.pos;
            const a = rng() * Math.PI * 2;
            const d = 3 + rng() * 9;
            const variant = rng() < 0.15 ? 'eldritch' : rng() < 0.1 ? 'boss' : undefined;
            try {
              spawnCreature(g, id, { x: pp.x + Math.sin(a) * d, z: pp.z + Math.cos(a) * d, yaw: a + Math.PI }, variant);
              recent.push(`spawn ${id}${variant ? ':' + variant : ''}`);
            } catch (e) {
              say(`seed ${seed} frame ${frame}: spawnCreature(${id}, ${variant}) threw ${(e as Error).stack?.split('\n').slice(0, 4).join(' | ')}`);
            }
          } else if (r < 0.85) {
            const h = g.ecs.c.health.get(g.player.id)!;
            h.hp = Math.max(1, h.max * rng() * 0.4);
            recent.push('hp shock');
          } else if (r < 0.93) {
            setSanity(g, rng() * 30);
            recent.push('sanity shock');
          } else {
            const s = signs[Math.floor(rng() * signs.length)];
            teleport(g, { x: s.x + 3, z: s.z + 3, yaw: 0 });
            g.player.kneeling = null;
            rest(g, s.id);
            recent.push(`rest ${s.id}`);
          }
        }
        if (frame % 900 === 0) {
          g.player.reagent = Math.max(g.player.reagent, 2);
          g.player.laudanum = Math.max(g.player.laudanum, 2);
          if (g.player.rounds < 6) g.player.rounds = 12;
        }
        const input = makeInput(held, want, rng, dir);
        held = new Set(want);
        const ts = performance.now();
        try {
          stepGame(g, input);
        } catch (e) {
          const msg = (e as Error).stack?.split('\n').slice(0, 6).join(' | ') ?? String(e);
          say(`seed ${seed} frame ${frame}: stepGame threw ${msg} :: recent ${recent.slice(-4).join('; ')}`);
          g = createWorldGame();
          recent = [];
          continue;
        }
        if (performance.now() - ts > 40) slow++;
        if (frame % 20 === 0) {
          for (const b of invariants(g)) {
            const key = b.replace(/\d+(\.\d+)?/g, 'N');
            if (seen.has(key)) continue;
            seen.add(key);
            say(`seed ${seed} frame ${frame}: ${b} :: recent ${recent.slice(-4).join('; ')}`);
          }
        }
        if (frame % 700 === 350) {
          try {
            const json = JSON.stringify(snapshot(g));
            const s = parseSave(json);
            if (!s) say(`seed ${seed} frame ${frame}: parseSave rejected its own snapshot`);
            else {
              const g2 = createWorldGame({ save: s });
              const a = g.player;
              const b = g2.player;
              for (const k of ['echoes', 'ammo', 'rounds', 'gun', 'laudanum', 'reagent', 'weapon', 'cycle'] as const) if (a[k] !== b[k]) say(`seed ${seed} frame ${frame}: save round trip changed player.${k}: ${a[k]} -> ${b[k]}`);
              if (Math.abs(g.mind.sanity - g2.mind.sanity) > 0.01) say(`seed ${seed} frame ${frame}: save round trip changed sanity ${g.mind.sanity} -> ${g2.mind.sanity}`);
              const ha = g.ecs.c.health.get(g.player.id)!;
              const hb = g2.ecs.c.health.get(g2.player.id)!;
              if (Math.abs(Math.max(1, ha.hp) - hb.hp) > 0.01 || ha.max !== hb.max) say(`seed ${seed} frame ${frame}: save round trip changed hp ${ha.hp}/${ha.max} -> ${hb.hp}/${hb.max}`);
            }
          } catch (e) {
            say(`seed ${seed} frame ${frame}: snapshot/load threw ${(e as Error).stack?.split('\n').slice(0, 5).join(' | ')}`);
          }
        }
        if (recent.length > 50) recent = recent.slice(-10);
      }
      summaries.push(`seed ${seed}: ${FRAMES} frames in ${Math.round(performance.now() - t0)} ms; ${slow} slow steps; ${g.ecs.c.transform.size} entities; region ${g.overworld?.region}; echoes ${g.player.echoes}`);
    }
    expect(out, summaries.join('\n')).toEqual([]);
  }, 1_800_000);
});
