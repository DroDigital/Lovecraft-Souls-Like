/**
 * validateRegistry (spec §3C): every roster id has a definition (and nothing else is defined),
 * every reference resolves (archetype, attack, region, summon, reality hook, variant), and every
 * number is in range. Returns a list of problems; empty means the registry is sound.
 */

import { ARCHETYPES } from './archetypes';
import { REGIONS } from './regions';
import { applyOverride, ENTITIES, paramsOf } from './registry';
import { ROSTER } from './roster';
import {
  ATTACK_IDS,
  CREATURE_PALETTES,
  DAMAGE_TYPES,
  REALITY_HOOKS,
  SILHOUETTES,
  TIERS,
  type BossScript,
  type EntityDef,
  type Tier,
} from './schema';

type Report = (msg: string) => void;

const has = <T>(list: readonly T[], x: unknown): boolean => list.includes(x as T);

function num(report: Report, label: string, x: number | undefined, lo: number, hi: number, int = false): void {
  if (x === undefined) return;
  if (!Number.isFinite(x) || x < lo || x > hi || (int && !Number.isInteger(x))) report(`${label} = ${x}, expected ${int ? 'an integer ' : ''}in [${lo}, ${hi}]`);
}

function checkLook(report: Report, d: EntityDef): void {
  if (!d.sprite === !d.assembly) report('needs exactly one of sprite or assembly');
  const s = d.sprite;
  if (s) {
    if (!has(SILHOUETTES, s.silhouette)) report(`unknown silhouette ${s.silhouette}`);
    if (!has(CREATURE_PALETTES, s.palette)) report(`unknown palette ${s.palette}`);
    num(report, 'sprite.scale', s.scale, 0.3, 16);
    num(report, 'sprite.eyes', s.eyes, 0, 16, true);
    num(report, 'sprite.tentacles', s.tentacles, 0, 16, true);
    num(report, 'sprite.wings', s.wings, 0, 4, true);
    num(report, 'sprite.limbs', s.limbs, 0, 12, true);
  }
  const a = d.assembly;
  if (a) {
    if (!has(['lathe', 'spheres', 'mound'], a.body)) report(`unknown assembly body ${a.body}`);
    if (!has(CREATURE_PALETTES, a.palette)) report(`unknown palette ${a.palette}`);
    num(report, 'assembly.scale', a.scale, 4, 60);
    num(report, 'assembly.tentacles', a.tentacles, 0, 16, true);
    num(report, 'assembly.eyes', a.eyes, 0, 16, true);
    num(report, 'assembly.wings', a.wings, 0, 4, true);
    num(report, 'assembly.spheres', a.spheres, 0, 24, true);
  }
  const glow = s?.glow ?? a?.glow;
  if (glow !== undefined && !has(['magenta', 'purple', 'green'], glow)) report(`unknown glow ${glow}`);
}

function checkBehavior(report: Report, d: EntityDef): void {
  const b = d.behavior;
  if (!(b.archetype in ARCHETYPES)) return report(`unknown archetype ${b.archetype}`);
  for (const a of b.attacks) if (!has(ATTACK_IDS, a)) report(`unknown attack ${a}`);
  if (new Set(b.attacks).size !== b.attacks.length) report('lists an attack twice');
  if (b.attacks.length === 0 && d.stats.damage > 0) report('deals damage but has no attacks');
  for (const k of Object.keys(b.params ?? {})) if (!(k in ARCHETYPES.brute)) report(`unknown archetype param ${k}`);
  const p = paramsOf(b);
  for (const [k, lo, hi] of [['aggro', 0, 100], ['fov', 0, 360], ['hearing', 0, 100], ['leash', 0, 1000], ['strafe', 0, 1], ['flee', 0, 1], ['reveal', 0, 50], ['hover', 0, 20], ['turnRate', 0.1, 20]] as const) {
    num(report, `params.${k}`, p[k], lo, hi);
  }
  for (const k of ['range', 'cooldown'] as const) if (!(p[k][0] >= 0 && p[k][0] <= p[k][1])) report(`params.${k} must be [min, max]`);
  if (d.stats.speed === 0 && p.mobile) report('has speed 0 but a mobile archetype');
  if ((d.tier === 'ally') !== (b.archetype === 'ally')) report('allies, and only allies, use the ally archetype');
  if (b.archetype === 'boss' && !d.bossScript) report('boss archetype without a boss script');
}

function checkBossScript(report: Report, s: BossScript, self: string, ids: ReadonlySet<string>): void {
  if (s.phases.length === 0) return report('boss script has no phases');
  if (s.phases[0].hpBelow !== 1) report('first boss phase must start at hpBelow 1');
  s.phases.forEach((ph, i) => {
    num(report, `phase ${i} hpBelow`, ph.hpBelow, 0.01, 1);
    if (i > 0 && ph.hpBelow >= s.phases[i - 1].hpBelow) report(`phase ${i} must start below phase ${i - 1}`);
    if (ph.attacks.length === 0) report(`phase ${i} has no attacks`);
    for (const a of ph.attacks) {
      if (!has(ATTACK_IDS, a.id)) report(`phase ${i}: unknown attack ${a.id}`);
      num(report, `phase ${i} weight of ${a.id}`, a.weight, 0.01, 100);
    }
    for (const x of ph.summons ?? []) if (!ids.has(x) || x === self) report(`phase ${i}: summon ${x} does not resolve`);
    for (const h of ph.realityHooks ?? []) if (!has(REALITY_HOOKS, h)) report(`phase ${i}: unknown reality hook ${h}`);
  });
}

function checkDef(report: Report, d: EntityDef, ids: ReadonlySet<string>, variant = false): void {
  if (!d.name.trim() || !d.source.trim()) report('needs a name and a source');
  if (d.regions.length === 0) report('belongs to no region');
  for (const r of d.regions) if (!REGIONS.some((x) => x.id === r)) report(`unknown region ${r}`);
  checkLook(report, d);
  checkBehavior(report, d);
  const s = d.stats;
  num(report, 'hp', s.hp, 1, 20000);
  num(report, 'poise', s.poise, 0, 5000);
  num(report, 'damage', s.damage, 0, 200);
  num(report, 'speed', s.speed, 0, 12);
  num(report, 'sanityAura', s.sanityAura, 0, 10);
  num(report, 'sanityDamage', s.sanityDamage, 0, 30);
  for (const t of [...(d.resist ?? []), ...(d.weak ?? [])]) if (!has(DAMAGE_TYPES, t)) report(`unknown damage type ${t}`);
  if (d.resist?.some((t) => d.weak?.includes(t))) report('resists and is weak to the same damage type');
  num(report, 'drops.echoes', d.drops.echoes, 0, 50000, true);
  num(report, 'insightOnSight', d.insightOnSight, 0, 5, true);
  if (!variant) {
    const rank: Record<Tier, boolean | null> = { lesser: false, greater: false, named: true, great_old_one: true, outer_god: true, ally: null };
    const gives = rank[d.tier];
    if (gives !== null && gives !== d.insightOnSight > 0) report(`${d.tier} entities ${gives ? 'must' : 'must not'} grant insight on sight`);
  }
  if (d.tier === 'ally' && d.drops.echoes !== 0) report('allies drop nothing');
  if (d.hidden) {
    num(report, 'hidden.minInsight', d.hidden.minInsight, 0, 99, true);
    num(report, 'hidden.maxSanity', d.hidden.maxSanity, 0, 100);
  }
  if (d.bossScript) checkBossScript(report, d.bossScript, d.id, ids);
}

export function validateRegistry(defs: readonly EntityDef[] = ENTITIES, roster: Readonly<Record<Tier, readonly string[]>> = ROSTER): string[] {
  const errors: string[] = [];
  const byId = new Map<string, EntityDef>();
  for (const d of defs) {
    if (byId.has(d.id)) errors.push(`${d.id}: defined twice`);
    byId.set(d.id, d);
  }
  const ids = new Set(byId.keys());
  const listed = new Set<string>();
  for (const t of TIERS) {
    for (const id of roster[t]) {
      if (listed.has(id)) errors.push(`${id}: listed twice in the roster`);
      listed.add(id);
      const d = byId.get(id);
      if (!d) errors.push(`${id}: in the roster but has no definition`);
      else if (d.tier !== t) errors.push(`${id}: roster tier ${t} but defined as ${d.tier}`);
    }
  }
  const names = new Set<string>();
  for (const d of defs) {
    const report = (label: string): Report => (msg) => errors.push(`${label}: ${msg}`);
    if (!listed.has(d.id)) errors.push(`${d.id}: defined but not in the roster`);
    if (names.has(d.name)) errors.push(`${d.id}: duplicate name ${d.name}`);
    names.add(d.name);
    checkDef(report(d.id), d, ids);
    if (d.eldritchVariant) checkDef(report(`${d.id} (eldritch variant)`), applyOverride(d, d.eldritchVariant), ids, true);
    if (d.bossVariant) {
      const b = applyOverride(d, d.bossVariant);
      checkDef(report(`${d.id} (boss variant)`), b, ids, true);
      if (!b.bossScript) errors.push(`${d.id} (boss variant): needs a boss script`);
    }
  }
  for (const r of REGIONS) {
    for (const id of r.bosses) {
      const d = byId.get(id);
      if (!d) errors.push(`region ${r.id}: boss ${id} does not resolve`);
      else if (!d.bossScript && !d.bossVariant?.bossScript) errors.push(`region ${r.id}: boss ${id} has no boss script`);
      else if (!d.regions.includes(r.id)) errors.push(`region ${r.id}: boss ${id} does not list the region`);
    }
  }
  return errors;
}
