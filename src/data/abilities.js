import { unlockedRoleIds, classSkillSlotCount, TALENT_STAT_KEY } from './gameState.js';

// ── Universal baseline moves ─────────────────────────────────────────────────
// Every unit starts with these, regardless of class — no cost, no cooldown.
export const ATTACK = {
  id: 'attack', name: 'Attack', icon: '⚔',
  cost: 0, range: 1, targetType: 'enemy', multiplier: 1.0,
  desc: '1× dmg  ·  range 1  ·  always available',
};
export const THROW = {
  id: 'throw', name: 'Throw', icon: '🎯',
  cost: 0, range: 3, targetType: 'enemy', multiplier: 0.5,
  desc: '0.5× dmg  ·  range 3  ·  always available',
};

// ── Ability definitions ──────────────────────────────────────────────────────
// Three categories (Class & Skill System Redesign, Part 5) — replaces the old
// special/classSkill split. NOTE the naming trap the redesign itself calls
// out: 'classSkill' used to mean "slotted active" here; under the new model
// "Class Skill" means passive. To avoid exactly that collision, the category
// tag is 'skill' (not 'classSkill') for the old slotted-active meaning, and
// the brand-new passive category is 'passive' — distinct fresh tags per the
// redesign's own suggestion, nothing reuses the ambiguous name.
//   'special' — SP-cost active (unit.sp), always usable once known. Slot-free.
//   'skill'   — cooldown-gated active, always usable once known. Slot-free
//               (this is the mechanical flip from the old model: cooldown
//               abilities used to require one of 3 equip slots; they no
//               longer do — see 'passive' below for what the slots hold now).
//   'passive' — permanent always-on buff. Equipping one takes one of the 3
//               slots (still unlocked at level 5/10/20). No passive content
//               is authored yet (Layer 2 Designation / Layer 3 Class / Layer
//               4 Role-hidden passives are all Part 5 follow-up work) — the
//               category and slot plumbing exist and are ready for it.
// Every ability that was 'classSkill' (uses-per-battle or cooldown, slotted)
// is now 'skill' (cooldown only, slot-free) — uses-per-battle limits were
// converted to a cooldown per-ability (roughly: 1 use/battle → CD 5, 2
// uses/battle → CD 3), a judgment call flagged per the redesign's own note
// that this conversion should be case-by-case, not a blanket rule.
export const ABILITIES = {
  // ── Striker (T2 of Runner) ─────────────────────────────────────────────────
  power_shot: {
    id: 'power_shot', name: 'Power Shot', icon: '⚽', category: 'special',
    cost: 3, range: 3, targetType: 'enemy', multiplier: 2.2,
    desc: '2.2× dmg  ·  range 3  ·  3 SP',
  },
  sliding_tackle: {
    id: 'sliding_tackle', name: 'Sliding Tackle', icon: '🌀', category: 'skill',
    cooldown: 2, range: 1, targetType: 'enemy', multiplier: 1.1,
    debuff: { type: 'slow', moveReduction: 2, duration: 1 },
    desc: '1.1× dmg  ·  slows target 2 tiles  ·  CD 2',
  },
  dribble: {
    id: 'dribble', name: 'Dribble', icon: '🏃', category: 'skill',
    cooldown: 3, targetType: 'self',
    selfActivate: true, effect: 'atkBuff', atkMultiplier: 0.25,
    desc: '+25% ATK this turn  ·  CD 3',
  },
  tri_shot: {
    id: 'tri_shot', name: 'Tri-Shot', icon: '🎯', category: 'skill',
    cooldown: 3, range: 1, targetType: 'enemy', multiplier: 1.5, hits: 3,
    desc: '3× 1.5× dmg  ·  range 1  ·  CD 3',
  },
  tackle_kick: {
    id: 'tackle_kick', name: 'Tackle Kick', icon: '💥', category: 'skill',
    cooldown: 5, targetType: 'enemy',
    directional: true, aoeFirst: true, maxRange: 3, multiplier: 1.9,
    desc: '1.9× AoE adj  +  1.9× line range 3  ·  CD 5',
  },

  // ── Goalkeeper (Sela) ──────────────────────────────────────────────────────
  force_field: {
    id: 'force_field', name: 'Force Field', icon: '🛡', category: 'special',
    cost: 3, range: 1, targetType: 'player', multiplier: 0,
    effect: 'shield',
    desc: 'Halves next hit on ally  ·  3 SP',
  },
  diving_save: {
    id: 'diving_save', name: 'Diving Save', icon: '🌊', category: 'skill',
    cooldown: 2, range: 2, targetType: 'enemy', multiplier: 0.8,
    debuff: { type: 'push', amount: 1 },
    desc: '0.8× dmg  ·  pushes enemy back 1  ·  CD 2',
  },
  punt_clear: {
    id: 'punt_clear', name: 'Punt Clear', icon: '🦵', category: 'skill',
    cooldown: 3, range: 2, targetType: 'enemy', multiplier: 1.0,
    debuff: { type: 'push', amount: 2 },
    desc: '1.0× dmg  ·  pushes enemy back 2  ·  CD 3',
  },

  // ── Linebacker (Drace) ─────────────────────────────────────────────────────
  power_rush: {
    id: 'power_rush', name: 'Power Rush', icon: '🔥', category: 'special',
    cost: 3, range: 2, targetType: 'enemy', multiplier: 2.4,
    desc: '2.4× dmg  ·  range 2  ·  3 SP',
  },
  tackle: {
    id: 'tackle', name: 'Tackle', icon: '💥', category: 'skill',
    cooldown: 3, range: 1, targetType: 'enemy', multiplier: 1.3,
    debuff: { type: 'stun', duration: 1 },
    desc: '1.3× dmg  ·  stuns 1 turn  ·  CD 3',
  },
  bulldoze: {
    id: 'bulldoze', name: 'Bulldoze', icon: '🚧', category: 'skill',
    cooldown: 3, targetType: 'enemy',
    directional: true, pierce: 2, maxRange: 2, multiplier: 1.6,
    debuff: { type: 'push', amount: 1 },
    desc: '1.6× dmg  ·  pierce 2  ·  pushes back 1  ·  CD 3',
  },

  // ── Spiker (Kael) ──────────────────────────────────────────────────────────
  spike: {
    id: 'spike', name: 'Spike', icon: '⬇', category: 'special',
    cost: 3, range: 3, targetType: 'enemy', multiplier: 2.0,
    desc: '2× dmg  ·  range 3  ·  3 SP',
  },
  set_play: {
    id: 'set_play', name: 'Set Play', icon: '🌀', category: 'skill',
    cooldown: 2, range: 2, targetType: 'enemy', multiplier: 0.7,
    debuff: { type: 'weaken', stat: 'strength', amount: 2, duration: 2 },
    desc: '0.7× dmg  ·  reduces enemy str by 2  ·  CD 2',
  },
  quick_set: {
    id: 'quick_set', name: 'Quick Set', icon: '⚡', category: 'skill',
    cooldown: 3, targetType: 'self',
    selfActivate: true, effect: 'atkBuff', atkMultiplier: 0.2,
    desc: '+20% ATK this turn  ·  CD 3',
  },

  // ── Center (Trice) ─────────────────────────────────────────────────────────
  post_up: {
    id: 'post_up', name: 'Post Up', icon: '🏀', category: 'special',
    cost: 3, range: 1, targetType: 'enemy', multiplier: 2.6,
    desc: '2.6× dmg  ·  adjacent only  ·  3 SP',
  },
  screen: {
    id: 'screen', name: 'Screen', icon: '🛡', category: 'skill',
    cooldown: 2, range: 1, targetType: 'player', multiplier: 0,
    effect: 'shield',
    desc: 'Absorbs next enemy hit for ally  ·  CD 2',
  },
  box_out: {
    id: 'box_out', name: 'Box Out', icon: '📦', category: 'skill',
    cooldown: 3, range: 1, targetType: 'enemy', multiplier: 1.0,
    debuff: { type: 'slow', moveReduction: 2, duration: 1 },
    desc: '1.0× dmg  ·  slows target 2 tiles  ·  CD 3',
  },

  // ── Runner (T1) ────────────────────────────────────────────────────────────
  dash: {
    id: 'dash', name: 'Dash', icon: '➤', category: 'skill',
    cooldown: 2, targetType: 'enemy',
    directional: true, mustBeforeMove: true, consumesMove: true, maxRange: 5,
    scaleByDist: { min: 1.3, max: 1.8, maxRange: 5 },
    desc: '1.3–1.8× dmg  ·  directional  ·  before move  ·  CD 2',
  },
  run_through: {
    id: 'run_through', name: 'Run Through', icon: '💨', category: 'skill',
    cooldown: 3, targetType: 'enemy',
    directional: true, pierce: 3, maxRange: 3, moveThrough: true, multiplier: 1.0,
    desc: '1× dmg  ·  move through  ·  up to 3 enemies  ·  CD 3',
  },
  blitz: {
    id: 'blitz', name: 'Blitz', icon: '⚡', category: 'skill',
    cooldown: 3, targetType: 'enemy',
    directional: true, pierce: 2, maxRange: 2, multiplier: 1.8,
    desc: '1.8× dmg  ·  pierce 2  ·  directional  ·  CD 3',
  },
  speed_up: {
    id: 'speed_up', name: 'Speed Up', icon: '⚡', category: 'skill',
    cooldown: 3, targetType: 'self',
    selfActivate: true, effect: 'moveBuff', moveBonus: 3,
    desc: '+3 move this turn  ·  CD 3',
  },

  // ── Speed talent tree — unlocked by having Speed as a talent and reaching a
  //    speed-stat threshold (see TALENT_SPECIALS below), not by class/level ──
  dash_strike: {
    id: 'dash_strike', name: 'Dash Strike', icon: '💨', category: 'special',
    cost: 10, targetType: 'enemy',
    directional: true, mustBeforeMove: true, consumesMove: true, maxRange: 2, multiplier: 1.2,
    desc: '1.2× dmg  ·  dash 2 tiles then strike  ·  10 SP',
  },
  quick_step: {
    id: 'quick_step', name: 'Quick Step', icon: '🌀', category: 'special',
    cost: 8, targetType: 'self', selfActivate: true, effect: 'dodge',
    desc: 'Blocks the next attack against you  ·  8 SP',
  },
  burst: {
    id: 'burst', name: 'Burst', icon: '💥', category: 'special',
    cost: 15, range: 2, targetType: 'enemy', multiplier: 1.3, hits: 2,
    desc: '2× 1.3× dmg  ·  range 2  ·  15 SP',
  },
  sprint: {
    id: 'sprint', name: 'Sprint', icon: '🏃', category: 'special',
    cost: 5, targetType: 'self', selfActivate: true, effect: 'moveBuff', moveBonus: 1,
    desc: '+1 move this turn, no attack  ·  5 SP',
  },
  speed_break: {
    id: 'speed_break', name: 'Speed Break', icon: '⬇', category: 'special',
    cost: 20, range: 3, targetType: 'enemy', multiplier: 1.0,
    debuff: { type: 'statDown', stat: 'speed', amount: 4, duration: 3 },
    desc: '1× dmg  ·  -4 enemy speed for 3 turns  ·  20 SP',
  },
  overdrive: {
    id: 'overdrive', name: 'Overdrive', icon: '🔥', category: 'skill',
    cooldown: 5, targetType: 'self', selfActivate: true, effect: 'overdrive', duration: 3, statBoost: 10,
    desc: 'All stats +10 for 3 turns  ·  CD 5',
  },

  // ── Strength talent tree — unlocked by having Strength as a talent and
  //    reaching a strength-stat threshold (see TALENT_SPECIALS/TALENT_SKILL_POOL) ──
  crush: {
    id: 'crush', name: 'Crush', icon: '💢', category: 'special',
    cost: 15, range: 3, targetType: 'enemy', multiplier: 1.8,
    desc: '1.8× dmg  ·  range 3  ·  15 SP',
  },
  guard_break: {
    id: 'guard_break', name: 'Guard Break', icon: '🔨', category: 'special',
    cost: 20, range: 2, targetType: 'enemy', multiplier: 1.5,
    desc: '1.5× dmg  ·  range 2  ·  20 SP',
  },
  iron_wall: {
    id: 'iron_wall', name: 'Iron Wall', icon: '🛡', category: 'special',
    cost: 10, targetType: 'self', selfActivate: true, effect: 'damageReduction', duration: 2, reduceAmount: 10,
    desc: '-10 dmg taken/hit for 2 turns  ·  10 SP',
  },
  power_surge: {
    id: 'power_surge', name: 'Power Surge', icon: '💪', category: 'skill',
    cooldown: 5, targetType: 'self', selfActivate: true, effect: 'statBuffPermanent', stat: 'strength', amount: 30,
    desc: 'Strength +30, rest of battle (once active)  ·  CD 5',
  },
  slam: {
    id: 'slam', name: 'Slam', icon: '👊', category: 'special',
    cost: 20, range: 1, targetType: 'enemy', multiplier: 1.4,
    desc: '1.4× dmg  ·  range 1  ·  20 SP',
  },
  endure: {
    id: 'endure', name: 'Endure', icon: '❤', category: 'skill',
    cooldown: 5, targetType: 'self', selfActivate: true, effect: 'endure',
    desc: 'Survive your next lethal hit at 1 HP  ·  CD 5',
  },

  // ── Stamina/Endurance talent tree — unlocked by having Stamina OR Endurance
  //    as a talent, once BOTH stats reach the threshold (see DUAL_TALENT_*) ──
  the_show: {
    id: 'the_show', name: 'The Show', icon: '🌟', category: 'skill',
    cooldown: 5, targetType: 'self', selfActivate: true, effect: 'costReduction', reducePct: 0.2,
    desc: 'Your SP costs -20%, rest of battle (once active)  ·  CD 5',
  },
  intercept: {
    id: 'intercept', name: 'Intercept', icon: '🤝', category: 'skill',
    cooldown: 1, range: 3, targetType: 'player', multiplier: 0, effect: 'guard',
    desc: 'Next attack on target ally hits you instead  ·  CD 1',
  },
  hp_plus: {
    id: 'hp_plus', name: 'Hp++', icon: '❤️‍🩹', category: 'skill',
    cooldown: 5, targetType: 'self', selfActivate: true, effect: 'maxHpBuff', boostPct: 0.2,
    desc: 'Max HP +20% (heals the difference), rest of battle (once active)  ·  CD 5',
  },
  formation: {
    id: 'formation', name: 'Formation', icon: '🧭', category: 'special',
    cost: 25, range: 18, targetType: 'player', multiplier: 0, effect: 'teleportToAlly',
    desc: 'Teleport adjacent to any ally  ·  25 SP',
  },
  performance: {
    id: 'performance', name: 'Performance', icon: '🎤', category: 'skill',
    cooldown: 1, range: 3, targetType: 'player', multiplier: 0, effect: 'restoreSp', restorePct: 0.15,
    desc: 'Restore 15% max SP to target ally  ·  range 3  ·  CD 1',
  },
  freestyle: {
    id: 'freestyle', name: 'Freestyle', icon: '🕺', category: 'skill',
    cooldown: 5, targetType: 'self', selfActivate: true, effect: 'extraTurn',
    desc: 'Take a full extra turn (move + act again)  ·  CD 5',
  },
};

// Special Attack (SP-cost) abilities per role, keyed by role id, gated by
// minLevel. Always usable once known — no slotting. Re-keyed from the old
// class-name-keyed CLASS_SPECIALS onto the redesign's role ids (same content
// — these seed Layer 4's role-exclusive uniques, per Part 5's own note that
// "existing class skills seed many uniques").
export const ROLE_SPECIALS = {
  striker:            [{ id: 'power_shot',  minLevel: 1 }],
  goalkeeper_soccer:  [{ id: 'force_field', minLevel: 1 }],
  defender_amfb:      [{ id: 'power_rush',  minLevel: 1 }],
  spiker:             [{ id: 'spike',       minLevel: 1 }],
  ace_defence_bball:  [{ id: 'post_up',     minLevel: 1 }],
};

// Special (SP-cost) abilities gated by talent + stat threshold instead of class/level.
// Always usable once known (no slotting) — same as CLASS_SPECIALS, just gated
// differently: any unit with this talent picked unlocks these once their stat
// (unit[TALENT_STAT_KEY[talent]]) reaches minStat.
export const TALENT_SPECIALS = {
  Speed: [
    { id: 'dash_strike', minStat: 15 },
    { id: 'quick_step',  minStat: 25 },
    { id: 'burst',       minStat: 35 },
    { id: 'sprint',      minStat: 45 },
    { id: 'speed_break', minStat: 60 },
  ],
  Strength: [
    { id: 'crush',       minStat: 15 },
    { id: 'guard_break', minStat: 25 },
    { id: 'iron_wall',   minStat: 35 },
    { id: 'slam',        minStat: 60 },
  ],
};

// Skills (cooldown, slot-free) gated by talent + stat threshold instead of
// class/level.
export const TALENT_SKILL_POOL = {
  Speed: [
    { id: 'overdrive', minStat: 100 },
  ],
  Strength: [
    { id: 'power_surge', minStat: 45 },
    { id: 'endure',      minStat: 100 },
  ],
};

// Dual-gated tree: unlocked by having ANY of the listed talents, once the
// combined "tech" stat (stamina + endurance summed) clears the threshold —
// per the redesign's explicit decision ("the dual-talent tree migrates to
// tech, stamina + endurance sum — one unified formula... thresholds keep
// their existing numbers, now read against the tech sum"). This replaces the
// old per-stat-individually gating (both stamina AND endurance had to clear
// the bar on their own); tech-sum is easier to hit by design.
export const DUAL_TALENT_SPECIALS = {
  StaminaEndurance: {
    talents: ['Stamina', 'Endurance'],
    skills: [
      { id: 'formation', minStat: 130 },
    ],
  },
};
export const DUAL_TALENT_SKILL_POOL = {
  StaminaEndurance: {
    talents: ['Stamina', 'Endurance'],
    skills: [
      { id: 'the_show',    minStat: 35 },
      { id: 'intercept',   minStat: 55 },
      { id: 'hp_plus',     minStat: 80 },
      { id: 'performance', minStat: 230 },
      { id: 'freestyle',   minStat: 400 },
    ],
  },
};

// tech = stamina + endurance (Part 5's Layer 2 requirement stat — reused here
// for the dual-talent tree per the same decision).
function techStat(unit) {
  return (unit.stamina ?? 0) + (unit.endurance ?? 0);
}

// Shared lookup for the dual-gated structures above.
function dualTalentMatches(unit, dualMap) {
  const talents = unit.talents ?? [];
  const tech = techStat(unit);
  return Object.values(dualMap).flatMap(({ talents: reqTalents, skills }) => {
    if (!reqTalents.some(t => talents.includes(t))) return [];
    return skills.filter(e => tech >= e.minStat);
  }).map(e => ABILITIES[e.id]);
}

// Skill pool (cooldown, slot-free) per role, keyed by role id, gated by
// minLevel. Re-keyed from the old class-name-keyed CLASS_SKILL_POOL onto the
// redesign's role ids — same content, seeding Layer 4's role-exclusive kit.
export const ROLE_SKILL_POOL = {
  runner: [
    { id: 'dash',        minLevel: 1 },
    { id: 'run_through', minLevel: 5 },
    { id: 'blitz',       minLevel: 8 },
    { id: 'speed_up',    minLevel: 10 },
  ],
  striker: [
    { id: 'sliding_tackle', minLevel: 1 },
    { id: 'dribble',        minLevel: 8 },
    { id: 'tri_shot',       minLevel: 15 },
    { id: 'tackle_kick',    minLevel: 22 },
  ],
  goalkeeper_soccer: [
    { id: 'diving_save', minLevel: 1 },
    { id: 'punt_clear',  minLevel: 10 },
  ],
  defender_amfb: [
    { id: 'tackle',   minLevel: 1 },
    { id: 'bulldoze', minLevel: 10 },
  ],
  spiker: [
    { id: 'set_play',  minLevel: 1 },
    { id: 'quick_set', minLevel: 10 },
  ],
  ace_defence_bball: [
    { id: 'screen',  minLevel: 1 },
    { id: 'box_out', minLevel: 10 },
  ],
};

// Layer 2 (Designation) and Layer 3 (Class grouping) pools — structurally
// wired below but intentionally empty. Part 1's Implementation Checklist is
// data/plumbing, not content authoring; the redesign's Layer 2 skill sets
// (Fighting Spirit, Counter, Defensive Stance, Play Fool, Assists, Double or
// Nothing, Healing, Talented) and Layer 3 class sets (all still "TBA" in the
// source spec) are Part 5's separate authoring pass. These pools exist now so
// that pass is a pure content drop-in with no further refactor.
export const DESIGNATION_SPECIALS = {};   // keyed by designation code ('C'/'Rg'/'S'/'D')
export const DESIGNATION_SKILL_POOL = {}; // keyed by designation code
export const CLASS_GROUPING_SKILL_POOL = {}; // keyed by class grouping name ('Ball', 'Athletics', ...)

// ── Lookup helpers ────────────────────────────────────────────────────────────

// Special Attack (SP-cost) abilities a unit currently knows — accumulated
// across every tier reached so far (promoting doesn't erase earlier-tier
// specials — see unlockedRoleIds). Slot-free, always usable once known.
export function getUnitSpecials(unit) {
  const level = unit.level ?? 1;
  const rolePool = unlockedRoleIds(unit)
    .flatMap(roleId => ROLE_SPECIALS[roleId] ?? [])
    .filter(e => level >= e.minLevel)
    .map(e => ABILITIES[e.id]);

  const talents = [...new Set(unit.talents ?? [])];
  const talentSpecials = talents
    .flatMap(t => (TALENT_SPECIALS[t] ?? []).map(e => ({ ...e, statKey: TALENT_STAT_KEY[t] })))
    .filter(e => (unit[e.statKey] ?? 0) >= e.minStat)
    .map(e => ABILITIES[e.id]);

  const dualSpecials = dualTalentMatches(unit, DUAL_TALENT_SPECIALS);

  // Empty until Layer 2 content is authored (see DESIGNATION_SPECIALS note above).
  const designationSpecials = (unit.designations ?? [])
    .flatMap(d => DESIGNATION_SPECIALS[d] ?? [])
    .map(e => ABILITIES[e.id]);

  return [...rolePool, ...talentSpecials, ...dualSpecials, ...designationSpecials].filter(Boolean);
}

// Full pool of Skills (cooldown, slot-free) a unit currently knows —
// accumulated across every tier reached so far.
export function getUnitSkills(unit) {
  const level = unit.level ?? 1;
  const rolePool = unlockedRoleIds(unit)
    .flatMap(roleId => ROLE_SKILL_POOL[roleId] ?? [])
    .filter(e => level >= e.minLevel)
    .map(e => ABILITIES[e.id]);

  const talents = [...new Set(unit.talents ?? [])];
  const talentPool = talents
    .flatMap(t => (TALENT_SKILL_POOL[t] ?? []).map(e => ({ ...e, statKey: TALENT_STAT_KEY[t] })))
    .filter(e => (unit[e.statKey] ?? 0) >= e.minStat)
    .map(e => ABILITIES[e.id]);

  const dualPool = dualTalentMatches(unit, DUAL_TALENT_SKILL_POOL);

  // Empty until Layer 2 content is authored (see DESIGNATION_SKILL_POOL note above).
  const designationPool = (unit.designations ?? [])
    .flatMap(d => DESIGNATION_SKILL_POOL[d] ?? [])
    .map(e => ABILITIES[e.id]);

  return [...rolePool, ...talentPool, ...dualPool, ...designationPool].filter(Boolean);
}

// Full pool of passives (Class Skills) a unit currently knows — empty until
// Layer 2/3/4 passive content is authored (Part 5 follow-up). Structurally
// wired so the 3 equip slots (see getEquippedPassives) are ready for it.
export function getUnitPassivePool(unit) {
  return [];
}

// Passives currently equipped (slotted) — these are the only passives that
// apply in battle. Slots hold passives now, not actives — see the category
// note at the top of this file for the mechanical flip.
export function getEquippedPassives(unit) {
  const pool = getUnitPassivePool(unit);
  const slots = classSkillSlotCount(unit.level ?? 1);
  const ids = unit.classSkills ?? [];
  const equipped = [];
  for (let i = 0; i < slots; i++) {
    const ab = pool.find(a => a.id === ids[i]);
    if (ab) equipped.push(ab);
  }
  return equipped;
}
