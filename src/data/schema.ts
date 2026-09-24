/**
 * Entity registry schema (spec §3C). Creatures are data: an EntityDef names its look (a sprite
 * recipe, or a primitive assembly for colossi), its behaviour archetype and attacks, its numbers,
 * and optional sanity/boss overrides. Pure types, no Three.js.
 */

export const TIERS = ['lesser', 'greater', 'named', 'great_old_one', 'outer_god', 'ally'] as const;
export type Tier = (typeof TIERS)[number];

export const ARCHETYPE_IDS = [
  'pack_hunter',
  'ambusher',
  'brute',
  'skirmisher',
  'caster',
  'flyer_swoop',
  'hover_ranged',
  'burrower',
  'swarm',
  'invisible_stalker',
  'mind_thief',
  'stationary_horror',
  'boss',
  'ally',
] as const;
export type ArchetypeId = (typeof ARCHETYPE_IDS)[number];

/** The shared attack library (spec §3E). */
export const ATTACK_IDS = [
  'sweep',
  'slam',
  'lunge',
  'charge',
  'grab',
  'bite',
  'tentacle_burst',
  'projectile',
  'projectile_fan',
  'beam',
  'spit',
  'wind_push',
  'aoe_ring',
  'pool',
  'dive',
  'teleport',
  'summon',
  'roar',
  'gaze',
  'darkness',
] as const;
export type AttackId = (typeof ATTACK_IDS)[number];

/** Boss reality hooks (spec §3E). */
export const REALITY_HOOKS = [
  'arena_reconnect',
  'darkness',
  'flood',
  'camera_warp',
  'hidden_platforms',
  'decoys',
  'time_skip',
  'control_swap',
  'petrify_buildup',
  'light_dependency',
] as const;
export type RealityHook = (typeof REALITY_HOOKS)[number];

/** What a boss phase does to its arena as it begins (systems/arenaChanges.ts). */
export const ARENA_CHANGES = ['lamps'] as const;
export type ArenaChange = (typeof ARENA_CHANGES)[number];

export const DAMAGE_TYPES = ['slash', 'blunt', 'shot', 'fire', 'light', 'arcane'] as const;
export type DamageType = (typeof DAMAGE_TYPES)[number];

/** Body plans the sprite generator can draw. */
export const SILHOUETTES = [
  'humanoid',
  'hunched',
  'robed',
  'quadruped',
  'serpent',
  'winged',
  'crustacean',
  'barrel',
  'cone',
  'blob',
  'orb',
  'swarm',
  'cephalopod',
  'giant',
  'toad',
  'spectre',
] as const;
export type Silhouette = (typeof SILHOUETTES)[number];

/** Muted creature palettes (see render/palette.ts). Only `glow` features carry anomaly colour. */
export const CREATURE_PALETTES = [
  'sea',
  'bone',
  'charcoal',
  'rust',
  'flesh',
  'fungus',
  'rubber',
  'pallid',
  'mold',
  'sand',
  'ichor',
  'stone',
] as const;
export type CreaturePalette = (typeof CREATURE_PALETTES)[number];

export type Glow = 'magenta' | 'purple' | 'green';

/** Sprite recipe (spec §2): silhouette archetype + palette + feature params. */
export interface SpriteRecipe {
  silhouette: Silhouette;
  palette: CreaturePalette;
  scale: number; // metres: side of the square sprite in the world
  eyes?: number;
  tentacles?: number;
  wings?: number;
  limbs?: number; // total arms/legs, overriding the silhouette's default
  glow?: Glow; // eyes and markings glow in this anomaly colour
  outside?: boolean; // drawn in a hue outside the palette (the Colour Out of Space)
  seed?: number;
}

/** Colossal bosses: low-poly primitive assemblies built from the same data (spec §2). */
export interface AssemblyRecipe {
  body: 'lathe' | 'spheres' | 'mound';
  palette: CreaturePalette;
  scale: number; // metres tall
  tentacles?: number;
  wings?: number;
  eyes?: number;
  spheres?: number;
  glow?: Glow;
}

export interface Stats {
  hp: number;
  poise: number;
  damage: number; // base damage the attack library scales
  speed: number; // m/s
  sanityAura: number; // sanity per second nearby (Phase 3)
  sanityDamage: number; // sanity per landed hit (Phase 3)
}

/** Tunes an archetype's FSM (see archetypes.ts); everything is optional. */
export interface ArchetypeParams {
  aggro: number; // metres of sight
  fov: number; // degrees of the sight cone
  hearing: number; // metres: noticed regardless of facing or cover
  leash: number; // metres from home before giving up
  range: readonly [min: number, max: number]; // preferred distance to its target
  cooldown: readonly [min: number, max: number]; // frames between attacks
  strafe: number; // 0..1: circles its target inside the preferred range
  flee: number; // health fraction below which it keeps its distance
  hide: 'none' | 'ambush' | 'burrow' | 'invisible';
  reveal: number; // metres: a hidden one strikes when its target comes this close
  hover: number; // metres above the ground it is drawn at
  mobile: boolean;
  turnRate: number; // rad/s
}

export interface Behavior {
  archetype: ArchetypeId;
  params?: Partial<ArchetypeParams>;
  attacks: readonly AttackId[];
  summons?: readonly string[]; // what its summon attack calls up (bosses: their phase's summons)
}

export interface BossPhase {
  hpBelow: number; // active once health fraction drops below this (first phase: 1)
  attacks: readonly { id: AttackId; weight: number }[];
  summons?: readonly string[]; // entity ids
  realityHooks?: readonly RealityHook[];
  arenaChange?: ArenaChange;
}

export interface BossScript {
  phases: readonly BossPhase[];
  unseen?: boolean; // invisible until revealed: not drawn, locked on to or beheld (the Dunwich Horror)
}

export interface EntityDef {
  id: string;
  name: string;
  tier: Tier;
  source: string; // the story title
  regions: readonly string[];
  canonLooks: boolean; // false where Lovecraft barely describes it
  sprite?: SpriteRecipe;
  assembly?: AssemblyRecipe;
  behavior: Behavior;
  stats: Stats;
  resist?: readonly DamageType[];
  weak?: readonly DamageType[];
  drops: { echoes: number };
  insightOnSight: number;
  eldritchVariant?: EntityOverride; // at Fractured sanity or lower (Phase 3)
  bossVariant?: EntityOverride; // a boss version of a regular entry (Elder Shoggoth, Polyp Swarm)
  hidden?: { minInsight?: number; maxSanity?: number };
  bossScript?: BossScript;
}

/** Partial overrides, merged one level deep. */
export interface EntityOverride {
  name?: string;
  sprite?: Partial<SpriteRecipe>;
  assembly?: Partial<AssemblyRecipe>;
  behavior?: Partial<Behavior>;
  stats?: Partial<Stats>;
  resist?: readonly DamageType[];
  weak?: readonly DamageType[];
  drops?: { echoes: number };
  insightOnSight?: number;
  bossScript?: BossScript;
}
