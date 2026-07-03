// Born Gifted — Monster List (July 2026 handwritten sheet)
//
// Data model + generation logic for the 10-base-monster roster, the 4-tier
// color-recolor ladder, Alpha Ace bosses, and generated-name unique
// rare-spawns. Deliberately has ZERO imports from scene files (matches the
// existing gameState.js/items.js/abilities.js layering — data modules don't
// depend on scenes) — region/element rolling stays owned by BattleScene's
// existing `rollRegionArchetype`/`REGION_ARCHETYPES`; callers pass the
// rolled `element`/`primaryStat` in rather than this module re-rolling them.
//
// SCOPE (per user's confirmed answers): full roster/tier/skill data is
// authored here for all 10 base monsters, bosses, and uniques. Only Wolf,
// Boar, and Deer have real sprite assets — see `spriteInfoForBase`. Actually
// hooking this generator into live MISSION_CONFIGS enemy AI (beyond the
// Deer spawn point added this pass) is deferred, same "data first" rhythm
// as the Ability Revised and Gear/Forge passes.

import { ABILITIES } from './abilities.js';

// ── Base roster ──────────────────────────────────────────────────────────
// Designation is FIXED per species (a new field, distinct from the
// existing region-based element/primaryStat roll — the sheet's "Monster
// Affinity RESOLVED" note covers the latter, which already works via
// BattleScene's rollRegionArchetype and needs no change here).
export const MONSTER_DESIGNATION = {
  Wolf: 'C', Deer: 'C', Goblin: 'C', Lion: 'C', Boar: 'C',
  Dragon: 'Rg', Wyvern: 'Rg', Hawk: 'Rg',
  Bear: 'D', Golem: 'D',
};
export const BASE_MONSTERS = Object.keys(MONSTER_DESIGNATION);

// First-pass baseline stats (tier 1) — the sheet gives no numbers, only
// designations/tiers/flavor, so these are invented placeholders sized
// relative to each other by flavor (Hawk fastest/frailest, Golem
// slowest/tankiest, etc.) and to the two already-live enemies (Wolf/Boar
// keep their existing M1F/M2 stat blocks as their tier-1 baseline).
export const MONSTER_BASE_STATS = {
  Wolf:   { speed: 5,  strength: 8,  stamina: 6,  endurance: 5  },
  Boar:   { speed: 4,  strength: 12, stamina: 8,  endurance: 9  },
  Deer:   { speed: 8,  strength: 5,  stamina: 5,  endurance: 4  },
  Goblin: { speed: 6,  strength: 6,  stamina: 5,  endurance: 5  },
  Lion:   { speed: 7,  strength: 11, stamina: 7,  endurance: 6  },
  Dragon: { speed: 6,  strength: 14, stamina: 10, endurance: 12 },
  Wyvern: { speed: 9,  strength: 10, stamina: 7,  endurance: 7  },
  Hawk:   { speed: 10, strength: 6,  stamina: 5,  endurance: 4  },
  Bear:   { speed: 4,  strength: 12, stamina: 10, endurance: 12 },
  Golem:  { speed: 2,  strength: 10, stamina: 12, endurance: 16 },
};

// ── Sprite availability ──────────────────────────────────────────────────
// Only these 3 species have usable art (per user's "Full data, 3 wired
// in-game" answer). All 10 base monsters now have art at monster/{file}.png
// (July 2026 batch, replacing the old per-directional critter rigs) — same
// 6x6-grid pipeline as HERO_SPRITES, frame size measured per file since the
// canvas dimensions aren't perfectly uniform (~1495x1052 to 1536x1024).
// Only Wolf/Boar/Deer are wired into BattleScene's loader today; the other
// 7 files exist on disk but aren't loaded anywhere yet.
const SPRITE_INFO = {
  Wolf: { spriteKey: 'wolf-idle', animKey: 'wolf-idle', file: 'monster/wolf.png', fw: 249, fh: 175, spriteScale: 0.35, moveSpeed: 2 },
  Boar: { spriteKey: 'boar-idle', animKey: 'boar-idle', file: 'monster/boar.png', fw: 256, fh: 170, spriteScale: 0.35, moveSpeed: 2 },
  Deer: { spriteKey: 'deer-idle', animKey: 'deer-idle', file: 'monster/deer.png', fw: 248, fh: 175, spriteScale: 0.3,  moveSpeed: 3 },
};
export function spriteInfoForBase(base) {
  return SPRITE_INFO[base] ?? null;
}

// ── Tier ladder ───────────────────────────────────────────────────────────
export const MONSTER_TIERS = [
  { tier: 1, prefix: null,       tint: null,     label: 'Base colors'  },
  { tier: 2, prefix: 'Rookie',   tint: 0x4d94ff, label: 'Blue tint'    },
  { tier: 3, prefix: 'Training', tint: 0xaa55ff, label: 'Purple glow'  },
  { tier: 4, prefix: 'Ace',      tint: 0xffd700, label: 'Golden color' },
];
// ASSUMPTION: no exact stat curve given ("Get Stronger, Color Changers"
// implies stats scale with tier, not just visuals) — flat multiplicative
// ladder loosely matching the existing PRIMARY_STAT_BOOST=1.3 convention.
export const TIER_STAT_MULT = [1.0, 1.3, 1.6, 2.0];
export const BOSS_STAT_MULT = 3.0;
export const UNIQUE_STAT_MULT = 2.2;

export const BOSS_PREFIX = 'Alpha Ace';
export function bossName(base) {
  return `${BOSS_PREFIX} ${base}`;
}

// ── Unique rare-spawn name generation ────────────────────────────────────
// Sheet: "simple pattern pools, e.g. adjective + noun" — scoped narrowly to
// THIS (uniques only), not to skill naming generally (see monsterSkillName).
const UNIQUE_ADJECTIVES = [
  'Ashen', 'Gilded', 'Feral', 'Ancient', 'Storm-Born',
  'Ironclad', 'Ghostly', 'Sable', 'Radiant', 'Warped',
];
const UNIQUE_NOUNS = [
  'Fang', 'Reaver', 'Warden', 'Marauder', 'Sovereign',
  'Wraith', 'Talon', 'Bane', 'Colossus', 'Harbinger',
];
export function rollUniqueName() {
  const adj = UNIQUE_ADJECTIVES[Math.floor(Math.random() * UNIQUE_ADJECTIVES.length)];
  const noun = UNIQUE_NOUNS[Math.floor(Math.random() * UNIQUE_NOUNS.length)];
  return `${adj} ${noun}`;
}

// ── Skill assignment ─────────────────────────────────────────────────────
// Reuses the hero Designation ability sets verbatim (schema + effects,
// per the sheet's own instruction), keyed by the monster's fixed
// designation. counter_hit is technically a talent (not designation)
// ability, but is included in the Combat pool specifically because the
// sheet's own worked example names it ("Counter (C) -> Savage Reprisal"
// on an Alpha Ace Lion) — a deliberate one-off inclusion, not a rule that
// monster pools draw from talent trees generally.
//
// Abilities WITHOUT a fixedElement (fake_out, ace, tri_throw, shield,
// stopper, ranged_plus_range, focus) automatically flavor with whatever
// element the monster rolled at spawn — this falls out of the existing
// elementMultiplier logic for free and needs no special-casing here.
// Abilities WITH one (offside=Wind, counter_hit=Earth) override it, same
// as for heroes.
const MONSTER_ABILITY_POOL = {
  C:  ['fake_out', 'offside', 'ace', 'counter_hit'],
  Rg: ['tri_throw', 'sharp_throw', 'ranged_plus_range', 'focus'],
  D:  ['shield', 'stopper'],
};

// Species-specific flavor renames — hand-picked (a lookup table, not a
// generator: the sheet's own resolved examples for skill naming are
// hand-picked renames, e.g. Tri-Throw -> "Talon Barrage" on Hawk). Falls
// back to a generic per-ability rename, then the hero ability's own name.
const MONSTER_SKILL_NAME_OVERRIDES = {
  Lion:   { counter_hit: 'Savage Reprisal' },
  Golem:  { shield: 'Stone Hide' },
  Hawk:   { tri_throw: 'Talon Barrage' },
  Dragon: { fake_out: "Wyrm's Feint", offside: 'Wing Gale', sharp_throw: "Dragon's Breath" },
  Wolf:   { fake_out: 'Snarling Lunge', offside: 'Pack Tactics' },
  Bear:   { stopper: 'Mother Bear' },
  Boar:   { ace: 'Tusked Fury' },
  Wyvern: { sharp_throw: 'Diving Strike' },
  Goblin: { fake_out: 'Cheap Shot' },
  Deer:   { ace: "Prey's Instinct" },
};
const MONSTER_SKILL_NAME_GENERIC = {
  fake_out: 'Feint', offside: 'Blindside', ace: 'Alpha Instinct', counter_hit: 'Counter',
  tri_throw: 'Triple Strike', sharp_throw: 'Piercing Shot',
  ranged_plus_range: 'Keen Reach', focus: 'Keen Eye',
  shield: 'Hardened Shell', stopper: 'Guardian Stance',
};
export function monsterSkillName(base, abilityId) {
  return MONSTER_SKILL_NAME_OVERRIDES[base]?.[abilityId]
    ?? MONSTER_SKILL_NAME_GENERIC[abilityId]
    ?? ABILITIES[abilityId]?.name
    ?? abilityId;
}

// ASSUMPTION: "1-3 skills, presumably scaling with tier (T1=1, T3-T4=2-3)"
// — no exact mapping given, this is a clean monotonic reading of that
// hedge (T3's 2 and T4's 3 both fall in the stated 2-3 range).
export function skillCountForTier(tier) {
  return [1, 2, 2, 3][Math.max(0, Math.min(3, tier - 1))];
}

function shuffled(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function abilityEntry(base, id) {
  return { id, name: monsterSkillName(base, id), ability: ABILITIES[id] };
}

// Uniques get one bonus "signature" move beyond their full designation
// kit — a lightly randomized damage ability with a generated flavor name.
// Deliberately NOT a general procedural ability generator (see the
// UNIQUE_ADJECTIVES/NOUNS note above) — scoped to this one bonus slot only,
// per the sheet's own framing of uniques specifically getting
// "generated/special skills".
function rollGeneratedSkill(designation) {
  const multiplier = Math.round((1.5 + Math.random() * 1.5) * 10) / 10; // 1.5-3.0
  const range = 1 + Math.floor(Math.random() * 4);                     // 1-4
  const cost = 2 + Math.floor(Math.random() * 4);                      // 2-5
  const name = rollUniqueName();
  const id = `generated_${designation.toLowerCase()}_${Math.random().toString(36).slice(2, 8)}`;
  return {
    id,
    name,
    ability: {
      id, name, icon: '✨', category: 'special',
      cost, range, targetType: 'enemy', multiplier,
      desc: `${multiplier}× dmg · range ${range} · ${cost} SP (generated)`,
    },
  };
}

// Builds the skill kit for one monster instance.
//   kind: 'regular' | 'boss' | 'unique'
//   tier: 1-4, only meaningful for 'regular' (bosses/uniques get the FULL
//         designation pool regardless — "fuller kits" per the sheet).
export function buildMonsterKit(base, { kind = 'regular', tier = 1 } = {}) {
  const designation = MONSTER_DESIGNATION[base];
  const pool = MONSTER_ABILITY_POOL[designation] ?? [];
  const count = kind === 'regular' ? skillCountForTier(tier) : pool.length;
  const ids = count >= pool.length ? [...pool] : shuffled(pool).slice(0, count);
  const skills = ids.map(id => abilityEntry(base, id));
  if (kind === 'unique') skills.push(rollGeneratedSkill(designation));
  return { designation, skills };
}

// ── Full monster instance builder ────────────────────────────────────────
// Produces an enemy object shaped to drop directly into a MISSION_CONFIGS
// `enemies[]` entry (matches the existing Wolf/Boar field names exactly),
// plus the new designation/tier/abilities fields. Region/element rolling
// stays the caller's job (BattleScene's rollRegionArchetype) — pass the
// rolled `element`/`primaryStat` through if you have them.
export function buildMonster({ base, tier = 1, kind = 'regular', element = null, primaryStat = null }) {
  const designation = MONSTER_DESIGNATION[base];
  const baseStats = MONSTER_BASE_STATS[base];
  if (!baseStats) throw new Error(`Unknown base monster: ${base}`);

  const mult = kind === 'boss' ? BOSS_STAT_MULT
    : kind === 'unique' ? UNIQUE_STAT_MULT
    : TIER_STAT_MULT[Math.max(0, Math.min(3, tier - 1))];

  const stats = {
    speed: Math.round(baseStats.speed * mult),
    strength: Math.round(baseStats.strength * mult),
    stamina: Math.round(baseStats.stamina * mult),
    endurance: Math.round(baseStats.endurance * mult),
  };
  if (primaryStat && stats[primaryStat] != null) {
    stats[primaryStat] = Math.round(stats[primaryStat] * 1.3); // matches PRIMARY_STAT_BOOST
  }

  const tierInfo = MONSTER_TIERS[Math.max(0, Math.min(3, tier - 1))];
  const level = kind === 'regular' ? tier : 5;

  let name;
  if (kind === 'boss') name = bossName(base);
  else if (kind === 'unique') name = rollUniqueName();
  else name = tierInfo.prefix ? `${tierInfo.prefix} ${base}` : base;

  const { skills } = buildMonsterKit(base, { kind, tier });
  const sprite = spriteInfoForBase(base);

  return {
    name, base, kind,
    tier: kind === 'regular' ? tier : null,
    designation,
    tint: kind === 'regular' ? tierInfo.tint : (kind === 'boss' ? 0xff3366 : 0x33ffcc),
    element,
    level,
    ...stats,
    abilities: skills,
    ...(sprite ?? { spriteKey: null, animKey: null, spriteScale: 1.0, moveSpeed: 2 }),
  };
}
