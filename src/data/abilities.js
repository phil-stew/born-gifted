import { unlockedRoleIds, classSkillSlotCount, TALENT_STAT_KEY, CLASS_TIER_LEVELS, roleById, sportById, currentDesignations, MAX_EQUIPPED_SPECIALS, MAX_EQUIPPED_SKILLS } from './gameState.js';

// ── Universal baseline moves ─────────────────────────────────────────────────
// Every unit starts with these, regardless of class — no cost, no cooldown.
export const ATTACK = {
  id: 'attack', name: 'Attack', icon: '⚔',
  cost: 0, range: 1, targetType: 'enemy', multiplier: 1.0,
  desc: '1× dmg  ·  range 1  ·  always available',
};
export const THROW = {
  id: 'throw', name: 'Throw', icon: '🎯',
  cost: 0, range: 4, targetType: 'enemy', multiplier: 1.0,
  desc: '1× dmg  ·  range 4  ·  always available',
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
//               slots (still unlocked at level 5/10/20). Passive content
//               (Layer 2 Designation / Layer 3 Class / talent-tier) is now
//               authored below — see getUnitPassivePool for the lookup.
//               NOTE: the data is authored but BattleScene.js doesn't apply
//               passive effects in combat yet — see the ENGINE TODO note
//               above getUnitPassivePool.
// Every ability that was 'classSkill' (uses-per-battle or cooldown, slotted)
// is now 'skill' (cooldown only, slot-free) — uses-per-battle limits were
// converted to a cooldown per-ability (roughly: 1 use/battle → CD 5, 2
// uses/battle → CD 3), a judgment call flagged per the redesign's own note
// that this conversion should be case-by-case, not a blanket rule.

// Wado-ryu/Heavyweight-exclusive Martial Arts bracket (Inner Focus, Guard,
// Stay Calm) — ASSUMPTION (Ability Revised item j, flagged open by the
// sheets themselves — confirm): read literally as these two specific roles,
// NOT every Defender-designation Martial Arts member. The literal reading
// was chosen as the more conservative/reversible default: it matches the
// sheet's exact wording, and the alternate "any D-designation MA member"
// theory breaks on its own terms (heavyweight_mma is literally named
// "Heavyweight" but doesn't carry the D designation, while lightweight_mma
// does carry D despite not being named "Heavyweight" at all).
const MARTIAL_ARTS_BRACKET_ROLE_IDS = ['wado_ryu', 'heavyweight_box'];

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
    cooldown: 3, range: 4, targetType: 'enemy', multiplier: 1.5, hits: 3,
    desc: '3× 1.5× dmg  ·  range 4  ·  CD 2',
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
    // Always resolves as a Combat-type hit for the designation triangle,
    // regardless of the attacker's own designation (Drace is Defender, not
    // Combat) — mirrors how fixedElement overrides an attacker's natural
    // element for a specific move. See attackDesignations() in BattleScene.js.
    fixedDesignationType: 'C',
    desc: '1.3× dmg  ·  stuns 1 turn  ·  Combat-type  ·  CD 3',
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

  // ── Talent trees (July 2026 Ability Revised sheets) ───────────────────────
  // Replaces the old Speed/Strength trees and the old combined Stamina+
  // Endurance dual tree entirely — Endurance and Stamina are now separate
  // 3-ability trees, same as Speed/Strength (per Ability Revised ruling a/b).
  // Each tree is exactly 3 abilities, unlocked in sheet order at main-talent
  // stat 5 / 30 / 80 (ruling e) — see TALENT_SPECIALS/TALENT_SKILL_POOL/
  // TALENT_PASSIVE_POOL below. New fields introduced by this content:
  //   passiveEffect — the bonus a 'passive' category ability actually grants
  //                   (mirrors 'effect' on selfActivate actives)
  //   fixedElement  — overrides the attacker's own element for this hit
  //                   (Blitz/Counter Hit always deal a fixed element)
  //   nonAffinity   — bypasses the elemental multiplier entirely (neutral dmg)
  //   scaleByRange  — closer-is-harder damage scaling, keyed by exact range
  //                   (inverse of the existing scaleByDist farther-is-harder)
  //   requiresRecentHit — only usable the turn after this unit took damage
  // scaleByRange, fixedElement, nonAffinity, requiresRecentHit, and passive
  // effect application are DATA ONLY here — BattleScene.js doesn't read them
  // yet (see the ENGINE TODO note above getUnitPassivePool below).
  speed_dash: {
    id: 'speed_dash', name: 'Dash', icon: '➤', category: 'special',
    cost: 1, range: 2, targetType: 'enemy', multiplier: 1.5,
    desc: '1.5× dmg  ·  range 2  ·  1 SP',
  },
  mobility: {
    id: 'mobility', name: 'Mobility', icon: '👟', category: 'passive',
    passiveEffect: 'moveBonus', amount: 1,
    desc: 'Move +1 (Class Skill)',
  },
  speed_blitz: {
    id: 'speed_blitz', name: 'Blitz', icon: '⚡', category: 'special',
    cost: 2, range: 3, targetType: 'enemy',
    scaleByRange: { 1: 2.0, 2: 1.5, 3: 1.0 }, fixedElement: 'Lightning',
    desc: '2.0/1.5/1.0× dmg by range (1/2/3)  ·  always Lightning  ·  2 SP',
  },
  strength_tackle: {
    id: 'strength_tackle', name: 'Tackle', icon: '💥', category: 'special',
    cost: 2, range: 1, targetType: 'enemy', multiplier: 2.0,
    desc: '2× dmg  ·  range 1  ·  2 SP',
  },
  strength_flex: {
    id: 'strength_flex', name: 'Flex', icon: '💪', category: 'passive',
    passiveEffect: 'statBoost', stat: 'strength', amount: 10,
    desc: 'Power +10 (Class Skill)',
  },
  slam: {
    id: 'slam', name: 'Slam', icon: '👊', category: 'special',
    cost: 2, range: 1, targetType: 'enemy', multiplier: 1.75, nonAffinity: true,
    desc: '1.75× dmg  ·  non-affinity  ·  range 1  ·  2 SP',
  },
  assist: {
    id: 'assist', name: 'Assist', icon: '🤝', category: 'special',
    // Cost not given on the sheet (quick-reference table marks it '?') —
    // assumed 2 SP to match this tree's other tier-1 actives.
    cost: 2, range: 2, targetType: 'player', effect: 'allyAtkBuff', atkMultiplier: 1.0,
    desc: "Target ally's next attack deals 200% damage  ·  range 2  ·  2 SP (cost assumed)",
  },
  block: {
    id: 'block', name: 'Block', icon: '🛡', category: 'passive',
    passiveEffect: 'damageReductionPct', amount: 0.10,
    desc: 'Damage taken -10% (Class Skill)',
  },
  counter_hit: {
    id: 'counter_hit', name: 'Counter Hit', icon: '👊', category: 'special',
    cost: 3, range: 1, targetType: 'enemy', multiplier: 2.5,
    fixedElement: 'Earth', requiresRecentHit: true,
    desc: '2.5× dmg  ·  Earth  ·  usable only after taking damage  ·  3 SP',
  },
  performance: {
    id: 'performance', name: 'Performance', icon: '🎤', category: 'special',
    // Range not given on the sheet — assumed 3 (matches other ally-support
    // abilities in this file). Heals off the CASTER's max HP per the sheet's
    // literal wording ("5% of this unit's max HP"), not the target's.
    cost: 2, range: 3, targetType: 'player', effect: 'healAllyPctOfCasterMaxHp', amount: 0.05,
    desc: "Heals target ally 5% of THIS unit's max HP  ·  range 3 (assumed)  ·  2 SP",
  },
  life_effort: {
    id: 'life_effort', name: 'Life Effort', icon: '❤', category: 'passive',
    passiveEffect: 'maxHpBuffPct', amount: 0.10,
    desc: 'Max HP +10% (Class Skill)',
  },
  cheer: {
    id: 'cheer', name: 'Cheer', icon: '📣', category: 'skill',
    // Range and restore amount not given on the sheet — assumed 3 / 15% to
    // match the retired dual-tree 'Performance' skill this replaces.
    cooldown: 2, range: 3, targetType: 'player', effect: 'restoreSp', restorePct: 0.15,
    desc: 'Restore SP to target ally  ·  range 3, 15% (assumed)  ·  CD 2',
  },

  // ── Designation ability sets (Combat / Defender / Ranged) ─────────────────
  // Support (S) is untouched — no Support sheet exists yet, so the slot stays
  // empty rather than guessing (Ability Revised ruling c).
  ace: {
    id: 'ace', name: 'Ace', icon: '🏅', category: 'passive',
    passiveEffect: 'statBoostPct', stats: ['speed', 'strength'], amount: 0.10,
    desc: 'Speed & Strength +10% (Class Skill)',
  },
  fake_out: {
    id: 'fake_out', name: 'Fake Out', icon: '🤾', category: 'special',
    // Range not given on the sheet — assumed 2.
    cost: 3, range: 2, targetType: 'enemy', multiplier: 2.2, nonAffinity: true,
    desc: '2.2× dmg  ·  non-affinity  ·  range 2 (assumed)  ·  3 SP',
  },
  offside: {
    id: 'offside', name: 'Offside', icon: '🚩', category: 'special',
    cost: 3, range: 2, targetType: 'enemy', multiplier: 2.5, fixedElement: 'Wind',
    desc: '2.5× dmg  ·  Wind  ·  range 2 (assumed)  ·  3 SP',
  },
  shield: {
    id: 'shield', name: 'Shield', icon: '🛡', category: 'skill',
    cooldown: 3, range: 2, targetType: 'player', multiplier: 0, effect: 'shieldPct', amount: 0.10,
    desc: "Shields target ally for 10% of their max HP  ·  range 2 (assumed)  ·  CD 3",
  },
  stopper: {
    id: 'stopper', name: 'Stopper', icon: '🧱', category: 'passive',
    passiveEffect: 'interceptAdjacent', radius: 2, perTurn: 1,
    desc: 'Takes damage for allies within 2 blocks, once per turn (Class Skill)',
  },
  ranged_plus_range: {
    id: 'ranged_plus_range', name: '+5 RNG', icon: '🏹', category: 'passive',
    passiveEffect: 'attackRangeBonus', amount: 5, onlyWithRangedDesignation: true,
    desc: 'Normal attack range +5 (Class Skill, Ranged designation only)',
  },
  tri_throw: {
    id: 'tri_throw', name: 'Tri-Throw', icon: '🎯', category: 'special',
    cost: 3, range: 5, targetType: 'enemy', multiplier: 1.2, hits: 3,
    desc: '3× 1.2× dmg  ·  range 5  ·  3 SP',
  },
  sharp_throw: {
    id: 'sharp_throw', name: 'Sharp Throw', icon: '🏹', category: 'special',
    cost: 4, range: 6, targetType: 'enemy', multiplier: 3.0, atMaxRangeOnly: true,
    desc: '3.0× dmg at max range (6)  ·  4 SP',
  },
  focus: {
    id: 'focus', name: 'Focus', icon: '🔎', category: 'passive',
    passiveEffect: 'rangeBonus', amount: 1,
    desc: 'RNG +1 (Class Skill)',
  },

  // ── Class grouping ability sets ────────────────────────────────────────────
  // "Same dis" / sports-partner adjacency (2 for 2, Doubles, Lock-On, Set Up,
  // Gracefulness, Duo, Training Buddy) is DATA ONLY — see the ENGINE TODO note
  // above getUnitPassivePool. `partnerAdjacent: true` marks these; nothing
  // reads that flag in combat yet.

  // Bat & Ball (softball/cricket/baseball — all 3 sports in the class)
  two_for_two: {
    id: 'two_for_two', name: '2 for 2', icon: '⚾', category: 'passive',
    passiveEffect: 'partnerDamageDouble', partnerAdjacent: true,
    desc: 'Beside sports partner: damage doubled (Class Skill)',
  },
  home_run: {
    id: 'home_run', name: 'Home Run', icon: '🏟', category: 'special',
    cost: 4, range: 4, targetType: 'enemy', multiplier: 2.5,
    // Same ability, sport-flavored name — "Six" for Cricket members.
    sportNameOverrides: { cricket: 'Six' },
    desc: '2.5× dmg  ·  range 4  ·  4 SP  (renamed "Six" for Cricket)',
  },
  batter_up: {
    id: 'batter_up', name: 'Batter Up', icon: '🏏', category: 'special',
    cost: 3, range: 1, targetType: 'enemy', multiplier: 1.5,
    // "Combat [damage type]" on the sheet — read as flavor/UI typing, not a
    // designation gate (see class-gating assumption above).
    desc: '1.5× dmg  ·  Combat-flavored  ·  range 1  ·  3 SP',
  },
  windward_throw: {
    id: 'windward_throw', name: 'Windward Throw', icon: '🌬', category: 'special',
    // Cost not given on the sheet — assumed 2 (matches this class's other tiers).
    cost: 2, range: 3, targetType: 'enemy', multiplier: 2.0, fixedElement: 'Wind',
    desc: '2× dmg  ·  Wind  ·  range 3  ·  2 SP (cost assumed)',
  },

  // Racquet (lacrosse/tennis/golf — all 3 sports in the class)
  doubles: {
    id: 'doubles', name: 'Doubles', icon: '🎾', category: 'passive',
    passiveEffect: 'partnerFlagged', partnerAdjacent: true,
    desc: 'Beside sports partner: Doubles bonus active (Class Skill)',
  },
  racquet_finisher: {
    id: 'racquet_finisher', name: 'Field Goal', icon: '🥍', category: 'special',
    cost: 5, range: 5, targetType: 'enemy', multiplier: 3.0,
    sportNameOverrides: { tennis: 'Set Match', golf: 'Driver' },
    desc: '3× dmg  ·  range 5  ·  5 SP  ("Set Match" Tennis / "Driver" Golf)',
  },

  // Target (darts/paintball/archery)
  lock_on: {
    id: 'lock_on', name: 'Lock-On', icon: '🎯', category: 'passive',
    passiveEffect: 'partnerDamageAndRange', partnerAdjacent: true, atkMultiplier: 0.5, rangeBonus: 3,
    desc: 'Beside sports partner: 1.5× dmg, +3 RNG (Class Skill)',
  },
  snipe: {
    id: 'snipe', name: 'Snipe', icon: '🔭', category: 'special',
    cost: 5, range: 6, targetType: 'enemy', multiplier: 2.5, nonAffinity: true,
    desc: '2.5× dmg  ·  non-affinity  ·  range 6  ·  5 SP',
  },
  quick_fire: {
    id: 'quick_fire', name: 'Quick Fire', icon: '💨', category: 'special',
    cost: 'ALL', range: 4, targetType: 'enemy', multiplier: 1.1, hits: 10, randomAffinity: true,
    desc: '10× 1.1× dmg  ·  each hit random affinity  ·  range 4  ·  ALL SP',
  },

  // Ball (netball/soccer/volleyball/rugby/am football/hockey/basketball)
  set_up: {
    id: 'set_up', name: 'Set Up', icon: '🤝', category: 'passive',
    passiveEffect: 'partnerDamageReductionAndFollowUp', partnerAdjacent: true, reducePct: 0.5,
    desc: 'Beside sports partner: -50% dmg taken (1/turn); partner follows up your attack (Class Skill)',
  },
  slap_shot: {
    id: 'slap_shot', name: 'Slap Shot', icon: '🏒', category: 'special',
    onlySportIds: ['hockey'],
    cost: 5, range: 5, targetType: 'enemy', multiplier: 2.5,
    desc: '2.5× dmg  ·  range 5  ·  5 SP  ·  Hockey only',
  },
  drive_smash: {
    id: 'drive_smash', name: 'Drive Smash', icon: '🏐', category: 'special',
    onlySportIds: ['volleyball'],
    cost: 5, range: 2, targetType: 'enemy', multiplier: 2.5,
    desc: '2.5× dmg  ·  range 2  ·  5 SP  ·  Volleyball only',
  },
  three_point: {
    id: 'three_point', name: '3-Point', icon: '🏀', category: 'special',
    onlySportIds: ['basketball'],
    cost: 5, exactRange: 3, targetType: 'enemy', multiplier: 2.5,
    desc: '2.5× dmg  ·  EXACTLY range 3 (donut)  ·  5 SP  ·  Basketball only',
  },
  dunk: {
    id: 'dunk', name: 'Dunk', icon: '🏀', category: 'special',
    onlySportIds: ['basketball'],
    cost: 2, range: 1, targetType: 'enemy', multiplier: 2.0,
    desc: '2× dmg  ·  range 1  ·  2 SP  ·  Basketball only',
  },
  foul_play: {
    id: 'foul_play', name: 'Foul Play', icon: '🟨', category: 'special',
    cost: 2, range: 1, targetType: 'enemy', multiplier: 1.8, nonAffinity: true,
    desc: '1.8× dmg  ·  non-affinity  ·  range 1  ·  2 SP',
  },
  spin_shot: {
    id: 'spin_shot', name: 'Spin Shot', icon: '🌀', category: 'special',
    excludeSportIds: ['hockey'],
    cost: 3, range: 4, targetType: 'enemy', multiplier: 2.8, fixedElement: 'Wind',
    desc: '2.8× dmg  ·  Wind  ·  range 4  ·  3 SP  ·  Non-Hockey',
  },
  blitz_ball: {
    id: 'blitz_ball', name: 'Blitz Ball', icon: '⚽', category: 'special',
    // selfActivate: no single target to click — it hits everyone in range at
    // once (see hitsAllUnitsOnField handling in executeSelfAbility).
    selfActivate: true,
    excludeSportIds: ['hockey'], requiresNoPartner: true,
    cost: 'ALL', range: 3, targetType: 'all', multiplier: 2.0, hits: 2, hitsAllUnitsOnField: true,
    desc: '2× dmg × 2 hits, EVERY unit on field (incl. enemies)  ·  range 3  ·  ALL SP  ·  Non-Hockey, only without a sports partner',
  },

  // Performance (dance/cheerleading/gymnastics/figure skating/aerial fitness)
  gracefulness: {
    id: 'gracefulness', name: 'Gracefulness', icon: '💃', category: 'passive',
    passiveEffect: 'partnerEffectDouble', partnerAdjacent: true,
    desc: 'Beside sports partner: all effects doubled (Class Skill)',
  },
  routine: {
    id: 'routine', name: 'Routine', icon: '🌟', category: 'special',
    cost: 10, range: 3, targetType: 'player', multiplier: 0, effect: 'atkBuffAlly', atkMultiplier: 2.0, duration: 1,
    desc: "Target unit's ATK +200% for 1 turn  ·  range 3 (assumed)  ·  10 SP",
  },
  refresh: {
    id: 'refresh', name: 'Refresh', icon: '💫', category: 'skill',
    usesPerBattle: 3, aoeRadius: 1, targetType: 'player', effect: 'restoreSpAndHpPct', amount: 0.15,
    desc: 'Heals SP+HP 15% in a 3×3 area  ·  3× per battle',
  },
  stunt: {
    id: 'stunt', name: 'Stunt', icon: '🤸', category: 'special',
    cost: 2, range: 4, targetType: 'enemy', multiplier: 2.0, nonAffinity: true,
    desc: '2× dmg  ·  non-affinity  ·  range 4  ·  2 SP',
  },
  performance_flex: {
    id: 'performance_flex', name: 'Flex', icon: '🧘', category: 'passive',
    passiveEffect: 'auraMoveBonus', aoeRadius: 2, amount: 2,
    desc: '5×5 radius: allies +2 move (Class Skill)',
  },

  // Athletics — run/jump subgroup (running/jumping/sprinting)
  duo: {
    id: 'duo', name: 'Duo', icon: '👯', category: 'passive',
    passiveEffect: 'freeMoveToPartner', partnerRadius: 5,
    // Always-active passive (2026-07-07 feedback: was previously gated
    // behind manually using the free-move-to-partner action first — see
    // BattleScene.js's finishAbilityTurn) — beside a sports partner after
    // acting = an automatic bonus second attack, no button press needed.
    // The free move (within 5 blocks, player picks which adjacent tile) is
    // now just a repositioning tool for CLOSING the distance, independent
    // of the bonus.
    desc: 'Beside sports partner after acting: free bonus attack. Also: free move to within 5 blocks of partner, player picks the tile (Class Skill)',
  },
  flying_jump: {
    id: 'flying_jump', name: 'Flying Jump', icon: '🦵', category: 'special',
    onlySportIds: ['running', 'jumping', 'sprinting'],
    cost: 3, range: 3, targetType: 'enemy', multiplier: 2.5,
    desc: '2.5× dmg  ·  range 3  ·  3 SP  ·  Sprinter/Jumper/Runner subgroup',
  },
  baton_pass: {
    id: 'baton_pass', name: 'Baton Pass', icon: '🎽', category: 'skill',
    onlySportIds: ['running', 'jumping', 'sprinting'],
    cooldown: 5, range: 3, targetType: 'player', multiplier: 0, effect: 'extraTurnAlly',
    desc: 'Target ally acts again  ·  range 3 (assumed)  ·  CD 5  ·  Sprinter/Jumper/Runner subgroup',
  },
  sky_dive: {
    id: 'sky_dive', name: 'Sky Dive', icon: '🪂', category: 'special',
    onlySportIds: ['running', 'jumping', 'sprinting'],
    cost: 3, range: 2, targetType: 'enemy', multiplier: 3.0,
    desc: '3× dmg  ·  range 2  ·  3 SP  ·  Sprinter/Jumper/Runner subgroup',
  },
  light_speed: {
    id: 'light_speed', name: 'Light Speed', icon: '💫', category: 'special',
    onlySportIds: ['running', 'jumping', 'sprinting'],
    cost: 5, range: 3, targetType: 'enemy', multiplier: 3.0, nonAffinity: true,
    desc: '3× dmg  ·  non-affinity  ·  range 3  ·  5 SP  ·  Sprinter/Jumper/Runner subgroup',
  },

  // Athletics — skating subgroup (ice skating/speed skating)
  ice_cut: {
    id: 'ice_cut', name: 'Ice Cut', icon: '🧊', category: 'special',
    onlySportIds: ['ice_skating', 'speed_skating'],
    // Cost not given on the sheet — assumed 2.
    cost: 2, range: 2, targetType: 'enemy', multiplier: 2.5, fixedElement: 'Water',
    desc: '2.5× dmg  ·  Water  ·  range 2  ·  2 SP (cost assumed)  ·  Skating subgroup',
  },
  extreme_speed: {
    id: 'extreme_speed', name: 'Extreme Speed', icon: '☄', category: 'special',
    onlySportIds: ['ice_skating', 'speed_skating'],
    cost: 'ALL', range: Infinity, targetType: 'enemy', multiplier: 5.0, nonAffinity: true,
    rangeFalloff: true, usesPerBattle: 1,
    desc: '5× dmg, falls off with distance  ·  infinite range  ·  1/battle  ·  ALL SP  ·  Skating subgroup',
  },

  // Martial Arts (boxing/karate/mma/kendo)
  training_buddy: {
    id: 'training_buddy', name: 'Training Buddy', icon: '🥋', category: 'passive',
    passiveEffect: 'partnerDamageReductionPct', partnerAdjacent: true, amount: 0.5,
    desc: 'Beside sports partner: -50% dmg taken (Class Skill)',
  },
  jab: {
    id: 'jab', name: 'Jab', icon: '👊', category: 'special',
    // Cost not given on the sheet — assumed 2.
    cost: 2, range: 1, targetType: 'enemy', multiplier: 1.1, hits: 3,
    desc: '3× 1.1× dmg  ·  range 1  ·  2 SP (cost assumed)  ·  also learnable by Hockey players',
  },
  blazing_low_kick: {
    id: 'blazing_low_kick', name: 'Blazing Low Kick', icon: '🔥', category: 'special',
    excludeSportIds: ['boxing'],
    cost: 3, range: 1, targetType: 'enemy', multiplier: 3.0,
    desc: '3× dmg  ·  range 1  ·  3 SP  ·  Non-Boxer',
  },
  fake_counter: {
    id: 'fake_counter', name: 'Fake Counter', icon: '🙅', category: 'skill',
    cooldown: 2, targetType: 'self', selfActivate: true, effect: 'dodge',
    desc: 'Take no damage from the next attack  ·  CD 2',
  },
  // Wado-ryu/Heavyweight-exclusive bracket — ASSUMPTION (item j, open):
  // gated to those two specific roles by literal name, not to every
  // Defender-designation Martial Arts member (confirm) — see
  // MARTIAL_ARTS_BRACKET_ROLE_IDS below.
  inner_focus: {
    id: 'inner_focus', name: 'Inner Focus', icon: '🧘', category: 'special',
    onlyRoleIds: MARTIAL_ARTS_BRACKET_ROLE_IDS,
    cost: 10, range: 1, targetType: 'enemy', multiplier: 5.0, usesPerBattle: 2,
    desc: '5× dmg  ·  range 1  ·  2/battle  ·  10 SP  ·  Wado-ryu/Heavyweight',
  },
  guard: {
    id: 'guard', name: 'Guard', icon: '🛡', category: 'skill',
    onlyRoleIds: MARTIAL_ARTS_BRACKET_ROLE_IDS,
    cooldown: 3, range: 1, targetType: 'self', selfActivate: true, effect: 'tankForAdjacent', duration: 1,
    desc: 'Takes damage for adjacent units for 1 turn  ·  CD 3  ·  Wado-ryu/Heavyweight',
  },
  stay_calm: {
    id: 'stay_calm', name: 'Stay Calm', icon: '😌', category: 'skill',
    onlyRoleIds: MARTIAL_ARTS_BRACKET_ROLE_IDS,
    // Cooldown not given on the sheet — assumed 3 (matches Guard).
    cooldown: 3, targetType: 'self', selfActivate: true, effect: 'damageReductionPct',
    amount: 0.30, duration: 2, untilMoved: true,
    desc: '-30% dmg taken for 2 turns or until moved  ·  3×3 self-centered  ·  CD 3 (assumed)  ·  Wado-ryu/Heavyweight',
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
// Endurance and Stamina are now separate single-stat trees, same shape as
// Speed/Strength (Ability Revised ruling b — retires the old combined
// tech-sum dual tree entirely).
export const TALENT_SPECIALS = {
  Speed:     [ { id: 'speed_dash',      minStat: 5 }, { id: 'speed_blitz', minStat: 80 } ],
  Strength:  [ { id: 'strength_tackle', minStat: 5 }, { id: 'slam',        minStat: 80 } ],
  Endurance: [ { id: 'assist',          minStat: 5 }, { id: 'counter_hit', minStat: 80 } ],
  Stamina:   [ { id: 'performance',     minStat: 5 } ],
};

// Skills (cooldown, slot-free) gated by talent + stat threshold instead of
// class/level.
export const TALENT_SKILL_POOL = {
  Stamina: [ { id: 'cheer', minStat: 80 } ],
};

// Passives (slot-limited Class Skills) gated by talent + stat threshold —
// the tier-2 (stat 30) ability in every talent tree on the Ability Revised
// sheets. Feeds getUnitPassivePool below.
export const TALENT_PASSIVE_POOL = {
  Speed:     [ { id: 'mobility',      minStat: 30 } ],
  Strength:  [ { id: 'strength_flex', minStat: 30 } ],
  Endurance: [ { id: 'block',         minStat: 30 } ],
  Stamina:   [ { id: 'life_effort',   minStat: 30 } ],
};

// Skill pool (cooldown, slot-free) per role, keyed by role id, gated by
// minLevel. Re-keyed from the old class-name-keyed CLASS_SKILL_POOL onto the
// redesign's role ids — same content, seeding Layer 4's role-exclusive kit.
export const ROLE_SKILL_POOL = {
  runner: [
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

// ── Layer 2: Designation ability sets ───────────────────────────────────────
// Authored from the July 2026 Ability Revised sheets — replaces the earlier
// (never-committed) Fighting Spirit/Counter/Defensive Stance/Play Fool/
// Assists/Double or Nothing set entirely (ruling c). Support (S) keeps no
// content here — no revised Support sheet exists yet, and no Healing/
// Talented abilities were ever authored in code to preserve.
//
// Gated by TIER, not level directly (ruling e): 1st ability unlocks once the
// unit has ever reached T1 (i.e. always), 2nd once promoted to T2, 3rd once
// promoted to T3 — implemented here as the unit's LEVEL crossing
// CLASS_TIER_LEVELS.t2/t3, same thresholds promotion itself uses. Ranged has
// a 4th entry (the +5 RNG passive) which the sheet describes as automatic
// ("only when Designation is Ranged", no separate unlock condition given) —
// modeled as tier-1/always-on rather than consuming a tier slot.
export const DESIGNATION_SPECIALS = {
  C:  [ { id: 'fake_out',   minLevel: CLASS_TIER_LEVELS.t2 }, { id: 'offside', minLevel: CLASS_TIER_LEVELS.t3 } ],
  Rg: [ { id: 'tri_throw',  minLevel: 1 }, { id: 'sharp_throw', minLevel: CLASS_TIER_LEVELS.t2 } ],
};
export const DESIGNATION_SKILL_POOL = {
  D: [ { id: 'shield', minLevel: 1 } ],
};
export const DESIGNATION_PASSIVE_POOL = {
  C:  [ { id: 'ace', minLevel: 1 } ],
  D:  [ { id: 'stopper', minLevel: CLASS_TIER_LEVELS.t2 } ],
  Rg: [ { id: 'ranged_plus_range', minLevel: 1 }, { id: 'focus', minLevel: CLASS_TIER_LEVELS.t3 } ],
};

// ── Layer 3: Class grouping ability sets ────────────────────────────────────
// Authored from the same sheets — one set per sport Class grouping (see
// SPORTS[*].class in gameState.js): Bat & Ball, Racquet, Target, Ball,
// Performance, Athletics, Martial Arts. See classAbilityLevels() below for
// the level-gating rule and CLASS_GROUPING_SKILL_POOL/CLASS_GROUPING_PASSIVE_POOL/
// CROSS_CLASS_GRANTS further down for the actual content.
//
// ASSUMPTION (item j, flagged as open by the sheets themselves — confirm):
// class sets are treated as FLAVOR LABELS, not hard designation gates — every
// unit whose current sport belongs to the class grouping gets that class's
// abilities regardless of their own Designation. This matches the existing
// ROLE_SPECIALS/ROLE_SKILL_POOL architecture (already keyed by role/sport,
// never by designation) and requires no new gating machinery; the "Combat"/
// "Designation Defender" tags on Ball/Martial Arts are read as damage-type
// flavor (e.g. Batter Up dealing Combat-type damage), not access control.
// Class abilities unlock at level 11, then 13, then evenly spaced up to the
// level cap (30) — ruling e. `n` = total abilities in the set (each
// sport-exclusive-variant group counts as ONE slot, since they're mutually
// exclusive reskins of the same move, not separate unlocks).
function classAbilityLevels(n) {
  if (n <= 0) return [];
  if (n === 1) return [11];
  const levels = [11, 13];
  const remaining = n - 2;
  for (let i = 1; i <= remaining; i++) {
    levels.push(Math.round(13 + (30 - 13) * (i / remaining)));
  }
  return levels;
}

// Keyed by SPORTS[*].class grouping name. Sport-exclusive gating
// (onlySportIds/excludeSportIds/onlyRoleIds) and sport-flavored renames
// (sportNameOverrides) live on the ability objects themselves (see ABILITIES
// above); these pools only carry id + minLevel per class-wide unlock tier.
const [BB1, BB2, BB3, BB4] = classAbilityLevels(4); // Bat & Ball: 4 slots
export const CLASS_GROUPING_PASSIVE_POOL = {
  'Bat & Ball':    [ { id: 'two_for_two', minLevel: BB1 } ],
  'Racquet':       [ { id: 'doubles',     minLevel: classAbilityLevels(2)[0] } ],
  'Target':        [ { id: 'lock_on',     minLevel: classAbilityLevels(3)[0] } ],
  'Ball':          [ { id: 'set_up',      minLevel: classAbilityLevels(5)[0] } ],
  'Performance':   [
    { id: 'gracefulness',     minLevel: classAbilityLevels(5)[0] },
    { id: 'performance_flex', minLevel: classAbilityLevels(5)[4] },
  ],
  'Athletics':     [ { id: 'duo', minLevel: 11 } ], // shared by both subgroups
  'Martial Arts':  [ { id: 'training_buddy', minLevel: classAbilityLevels(4)[0] } ],
};
export const CLASS_GROUPING_SPECIALS = {
  'Bat & Ball': [
    { id: 'home_run',        minLevel: BB2 },
    { id: 'batter_up',       minLevel: BB3 },
    { id: 'windward_throw',  minLevel: BB4 },
  ],
  'Racquet': [
    { id: 'racquet_finisher', minLevel: classAbilityLevels(2)[1] },
  ],
  'Target': [
    { id: 'snipe',      minLevel: classAbilityLevels(3)[1] },
    { id: 'quick_fire', minLevel: classAbilityLevels(3)[2] },
  ],
  'Ball': (() => {
    const [, exclusiveLv, foulLv, spinLv, blitzLv] = classAbilityLevels(5);
    return [
      // Sport-exclusive slot — all 4 share one tier; onlySportIds on each
      // ability picks out which sport(s) actually see it (basketball gets
      // both 3-Point and Dunk; netball/soccer/rugby/am football get none).
      { id: 'slap_shot',   minLevel: exclusiveLv },
      { id: 'drive_smash', minLevel: exclusiveLv },
      { id: 'three_point', minLevel: exclusiveLv },
      { id: 'dunk',        minLevel: exclusiveLv },
      { id: 'foul_play',   minLevel: foulLv },
      { id: 'spin_shot',   minLevel: spinLv },
      { id: 'blitz_ball',  minLevel: blitzLv },
    ];
  })(),
  'Performance': (() => {
    const [, routineLv, , stuntLv] = classAbilityLevels(5);
    return [
      { id: 'routine', minLevel: routineLv },
      { id: 'stunt',   minLevel: stuntLv },
    ];
  })(),
  'Athletics': (() => {
    const [, lv2, , lv4, lv5] = classAbilityLevels(5); // run/jump subgroup (Duo + 4); lv3 (baton_pass) is in CLASS_GROUPING_SKILL_POOL
    const [, skateLv2, skateLv3] = classAbilityLevels(3);  // skating subgroup (Duo + 2)
    return [
      { id: 'flying_jump',   minLevel: lv2 },
      { id: 'sky_dive',      minLevel: lv4 },
      { id: 'light_speed',   minLevel: lv5 },
      { id: 'ice_cut',       minLevel: skateLv2 },
      { id: 'extreme_speed', minLevel: skateLv3 },
    ];
  })(),
  'Martial Arts': (() => {
    const [, jabLv, kickLv] = classAbilityLevels(4);
    const bracket = classAbilityLevels(3); // Inner Focus/Guard/Stay Calm side-progression
    return [
      { id: 'jab',              minLevel: jabLv },
      { id: 'blazing_low_kick', minLevel: kickLv },
      { id: 'inner_focus',      minLevel: bracket[0] },
    ];
  })(),
};
export const CLASS_GROUPING_SKILL_POOL = {
  'Performance': [
    { id: 'refresh', minLevel: classAbilityLevels(5)[2] },
  ],
  'Athletics': [
    { id: 'baton_pass', minLevel: classAbilityLevels(5)[2] }, // run/jump subgroup only (3rd of 5 slots)
  ],
  'Martial Arts': (() => {
    const [, , , fakeCounterLv] = classAbilityLevels(4);
    const bracket = classAbilityLevels(3);
    return [
      { id: 'fake_counter', minLevel: fakeCounterLv },
      { id: 'guard',        minLevel: bracket[1] },
      { id: 'stay_calm',    minLevel: bracket[2] },
    ];
  })(),
};

// Ability grants that come from a specific ROLE rather than the unit's
// class/talent/designation — additive on top of whatever pool above already
// applies (Ability Revised ruling h). Both entries here are explicit
// cross-class notes on the sheets:
//  - Jab (Martial Arts) is also learnable by Hockey players.
//  - The Wado-ryu/Heavyweight bracket (Inner Focus/Guard/Stay Calm) plus
//    Fake Counter are also learnable by Defender-designation Ball players,
//    stacked on top of their own Ball class moves.
export const CROSS_CLASS_GRANTS = {
  ace_forward:         [{ id: 'jab', minLevel: classAbilityLevels(4)[1] }],
  goalkeeper_hockey:   [{ id: 'jab', minLevel: classAbilityLevels(4)[1] }],
  goal_defence:        martialArtsBracketGrant(),
  goalkeeper_soccer:   martialArtsBracketGrant(),
  goalkeeper_lax:      martialArtsBracketGrant(),
  ace_defence_bball:   martialArtsBracketGrant(),
  defender_amfb:       martialArtsBracketGrant(),
  // goalkeeper_hockey already has a Jab grant above — merge Ball-Defender bracket in too.
};
CROSS_CLASS_GRANTS.goalkeeper_hockey = [
  ...CROSS_CLASS_GRANTS.goalkeeper_hockey,
  ...martialArtsBracketGrant(),
];

function martialArtsBracketGrant() {
  const bracket = classAbilityLevels(3);
  const [, , , fakeCounterLv] = classAbilityLevels(4);
  return [
    { id: 'inner_focus',   minLevel: bracket[0] },
    { id: 'guard',         minLevel: bracket[1] },
    { id: 'stay_calm',     minLevel: bracket[2] },
    { id: 'fake_counter',  minLevel: fakeCounterLv },
  ];
}

// ── Lookup helpers ────────────────────────────────────────────────────────────

// Sport ids for every role a unit has ever unlocked (T1, plus T2/T3 once
// reached) — feeds class-grouping lookups below, same accumulation-across-
// tiers philosophy as unlockedRoleIds itself.
function unlockedSportIds(unit) {
  return unlockedRoleIds(unit).map(id => roleById(id)?.sportId).filter(Boolean);
}
// Class groupings (SPORTS[*].class, e.g. 'Ball'/'Athletics') a unit has ever
// unlocked, derived from unlockedSportIds.
function unlockedClassNames(unit) {
  return [...new Set(unlockedSportIds(unit).map(sid => sportById(sid)?.class).filter(Boolean))];
}
// Sport/role gating shared by class-grouping and cross-class-grant lookups —
// filters out abilities restricted to a sport/role the unit never unlocked
// (onlySportIds/excludeSportIds/onlyRoleIds fields on the ability itself,
// see ABILITIES above). Checked against every unlocked tier, not just the
// unit's CURRENT sport/role, matching the accumulate-across-tiers rule the
// rest of this file already follows.
function passesSportGate(ability, unit) {
  const sports = unlockedSportIds(unit);
  const roles = unlockedRoleIds(unit);
  if (ability.onlySportIds && !ability.onlySportIds.some(s => sports.includes(s))) return false;
  if (ability.excludeSportIds && ability.excludeSportIds.some(s => sports.includes(s))) return false;
  if (ability.onlyRoleIds && !ability.onlyRoleIds.some(r => roles.includes(r))) return false;
  return true;
}


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

  // currentDesignations(unit) — NOT unit.designations, which is never
  // actually persisted on a real gameState unit (only BattleScene's
  // ephemeral playerUnit copy sets it, as a cache of this same function).
  // Reading the raw field directly silently returned [] for every call from
  // LoadoutScene/PartyScene (and, since 2026-07-07's equip-cap lazy-init
  // runs against the raw persisted unit, from the battle-loadout defaulting
  // too) — any Ranged-designation-only special like Tri-Throw was
  // unreachable outside of battles fought before the cap existed. Bug
  // pre-dates the equip cap; the cap just made it visible (2026-07-07
  // feedback: "ability tri throw what happened to it").
  const designationSpecials = currentDesignations(unit)
    .flatMap(d => DESIGNATION_SPECIALS[d] ?? [])
    .filter(e => level >= e.minLevel)
    .map(e => ABILITIES[e.id]);

  const classSpecials = unlockedClassNames(unit)
    .flatMap(c => CLASS_GROUPING_SPECIALS[c] ?? [])
    .filter(e => level >= e.minLevel)
    .map(e => ABILITIES[e.id])
    .filter(ab => passesSportGate(ab, unit));

  const crossClassSpecials = unlockedRoleIds(unit)
    .flatMap(roleId => CROSS_CLASS_GRANTS[roleId] ?? [])
    .filter(e => level >= e.minLevel)
    .map(e => ABILITIES[e.id])
    .filter(ab => ab.category === 'special');

  return [...rolePool, ...talentSpecials, ...designationSpecials, ...classSpecials, ...crossClassSpecials].filter(Boolean);
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

  // See the identical note in getUnitSpecials above — currentDesignations(),
  // not unit.designations (never actually persisted on a real unit).
  const designationPool = currentDesignations(unit)
    .flatMap(d => DESIGNATION_SKILL_POOL[d] ?? [])
    .filter(e => level >= e.minLevel)
    .map(e => ABILITIES[e.id]);

  const classPool = unlockedClassNames(unit)
    .flatMap(c => CLASS_GROUPING_SKILL_POOL[c] ?? [])
    .filter(e => level >= e.minLevel)
    .map(e => ABILITIES[e.id])
    .filter(ab => passesSportGate(ab, unit));

  const crossClassPool = unlockedRoleIds(unit)
    .flatMap(roleId => CROSS_CLASS_GRANTS[roleId] ?? [])
    .filter(e => level >= e.minLevel)
    .map(e => ABILITIES[e.id])
    .filter(ab => ab.category === 'skill');

  return [...rolePool, ...talentPool, ...designationPool, ...classPool, ...crossClassPool].filter(Boolean);
}

// ── Battle loadout (2026-07-07) ──────────────────────────────────────────────
// getUnitSpecials/getUnitSkills above return everything a unit KNOWS — that
// used to be exactly what battle offered too, uncapped. Now battle only
// offers a player-selected subset (unit.equippedSpecials/equippedSkills,
// arrays of ability ids sized MAX_EQUIPPED_SPECIALS/MAX_EQUIPPED_SKILLS,
// mutated via equipSpecialSlot/equipSkillSlot in gameState.js). The first
// time either array is read (equippedSpecials/equippedSkills still null —
// never visited LoadoutScene, or a freshly recruited/created unit), it's
// lazily initialized to that unit's first known abilities so a unit is never
// stuck with zero battle options out of the box. After that first init it's
// real persisted data — the player can freely empty slots without it ever
// auto-refilling again.
function ensureEquippedAbilities(unit) {
  if (unit.equippedSpecials == null) {
    unit.equippedSpecials = getUnitSpecials(unit).slice(0, MAX_EQUIPPED_SPECIALS).map(a => a.id);
  }
  if (unit.equippedSkills == null) {
    unit.equippedSkills = getUnitSkills(unit).slice(0, MAX_EQUIPPED_SKILLS).map(a => a.id);
  }
}

// Fixed-length (MAX_EQUIPPED_SPECIALS) array of ability objects or null for
// empty/invalid slots — shaped for LoadoutScene's per-slot UI. Iterates a
// fixed 0..MAX-1 range rather than mapping unit.equippedSpecials directly,
// since the lazy-init above can leave that array SHORTER than MAX (e.g. a
// unit who only knows 2 Specials gets a 2-element array) — without this,
// unfilled trailing slots would silently vanish instead of showing as
// empty. A previously equipped id the unit somehow no longer knows
// (shouldn't normally happen — unlockedRoleIds only accumulates) also reads
// back as an empty slot rather than throwing.
export function getEquippedSpecialAbilities(unit) {
  ensureEquippedAbilities(unit);
  const known = new Set(getUnitSpecials(unit).map(a => a.id));
  return Array.from({ length: MAX_EQUIPPED_SPECIALS }, (_, i) => {
    const id = unit.equippedSpecials[i];
    return (id && known.has(id)) ? ABILITIES[id] : null;
  });
}
export function getEquippedSkillAbilities(unit) {
  ensureEquippedAbilities(unit);
  const known = new Set(getUnitSkills(unit).map(a => a.id));
  return Array.from({ length: MAX_EQUIPPED_SKILLS }, (_, i) => {
    const id = unit.equippedSkills[i];
    return (id && known.has(id)) ? ABILITIES[id] : null;
  });
}

// Full pool of passives (Class Skills) a unit currently knows, sourced from
// the talent/designation/class-grouping passive pools authored above.
// ENGINE TODO: BattleScene.js reads getUnitSpecials/getUnitSkills but does
// NOT yet call getEquippedPassives or apply any `passiveEffect` in combat —
// equipping a passive here makes it selectable in PartyScene but currently
// has zero effect in battle. Applying these (moveBonus, damageReductionPct,
// statBoost, the sports-partner-adjacency passives, etc.) is follow-up work.
export function getUnitPassivePool(unit) {
  const level = unit.level ?? 1;

  const talents = [...new Set(unit.talents ?? [])];
  const talentPassives = talents
    .flatMap(t => (TALENT_PASSIVE_POOL[t] ?? []).map(e => ({ ...e, statKey: TALENT_STAT_KEY[t] })))
    .filter(e => (unit[e.statKey] ?? 0) >= e.minStat)
    .map(e => ABILITIES[e.id]);

  // See the identical note in getUnitSpecials above — currentDesignations(),
  // not unit.designations (never actually persisted on a real unit).
  const designationPassives = currentDesignations(unit)
    .flatMap(d => DESIGNATION_PASSIVE_POOL[d] ?? [])
    .filter(e => level >= e.minLevel)
    .map(e => ABILITIES[e.id]);

  const classPassives = unlockedClassNames(unit)
    .flatMap(c => CLASS_GROUPING_PASSIVE_POOL[c] ?? [])
    .filter(e => level >= e.minLevel)
    .map(e => ABILITIES[e.id])
    .filter(ab => passesSportGate(ab, unit));

  return [...talentPassives, ...designationPassives, ...classPassives].filter(Boolean);
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
