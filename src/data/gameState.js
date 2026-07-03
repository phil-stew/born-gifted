// Central game state — module singleton, persists across all scenes

const mkEquip = () => ({ weapon: null, footwear: null, handwear: null, chest: null, headwear: null });

// The 4 core talents == the 4 core stats. Every unit picks exactly 2 talents
// at creation (repeats allowed). Each pick doubles that stat's level-up growth,
// so picking the same talent twice quadruples it.
export const TALENTS = ['Speed', 'Strength', 'Endurance', 'Stamina'];

// Elements pickable at character creation — purely identity/flavor today
// (matches the elements already assigned across FULL_ROSTER).
export const ELEMENTS = [
  { name: 'Fire',      icon: '🔥' },
  { name: 'Water',     icon: '💧' },
  { name: 'Lightning', icon: '⚡' },
  { name: 'Wind',      icon: '🌪' },
  { name: 'Earth',     icon: '🌍' },
];
export function elementIcon(name) {
  return ELEMENTS.find(e => e.name === name)?.icon ?? '';
}

// Elemental affinity cycle — each element beats the next, wrapping around:
// Fire beats Wind, Wind beats Earth, Earth beats Lightning, Lightning beats
// Water, Water beats Fire. Beating an opponent's element deals 1.5x damage;
// being beaten reduces incoming damage to 0.8x (mirrors the designation
// triangle's disadvantage multiplier below).
export const ELEMENT_CYCLE = ['Fire', 'Wind', 'Earth', 'Lightning', 'Water'];
export const ELEMENT_BEATS = Object.fromEntries(
  ELEMENT_CYCLE.map((el, i) => [el, ELEMENT_CYCLE[(i + 1) % ELEMENT_CYCLE.length]])
);

// Talent name → stat key on a unit
export const TALENT_STAT_KEY = { Speed:'speed', Strength:'strength', Endurance:'endurance', Stamina:'stamina' };

// Level cap and class-tier unlock levels
export const LEVEL_CAP = 30;
export const CLASS_TIER_LEVELS = { t2: 10, t3: 20 };

// Class skill slots: 3 total, unlocking one at a time at these levels.
// NOTE: per the Class & Skill System Redesign (Part 5), these slots now hold
// passive "Class Skills" (equipped permanent buffs) — not active abilities.
// Active abilities (Skill/Special Attack) are slot-free, usable whenever known.
export const CLASS_SKILL_SLOT_LEVELS = [5, 10, 20];
export function classSkillSlotCount(level) {
  return CLASS_SKILL_SLOT_LEVELS.filter(l => level >= l).length;
}

// ── Designations (combat triangle) ──────────────────────────────────────────
// Combat beats Ranged, Ranged beats Defender, Defender beats Combat.
// Support sits outside the triangle.
export const DESIGNATIONS = ['C', 'Rg', 'S', 'D'];
export const DESIGNATION_NAMES = { C: 'Combat', Rg: 'Ranged', S: 'Support', D: 'Defender' };
export const DESIGNATION_BEATS = { C: 'Rg', Rg: 'D', D: 'C' };
export const DESIGNATION_CYCLE = ['C', 'Rg', 'D']; // Support sits outside the triangle
// Combat = crossed swords, Ranged = bow, Defender = shield, Support = healing symbol.
export const DESIGNATION_ICONS = { C: '⚔', Rg: '🏹', D: '🛡', S: '✚' };
export function designationIcon(code) {
  return DESIGNATION_ICONS[code] ?? '';
}

// ── Sports (tiered promotion destinations) ──────────────────────────────────
// Each sport belongs to a Class (grouping) and offers 1+ Roles, each role
// carrying 1-2 Designations. Source: Class & Skill System Redesign, Part 3/4.
export const SPORTS = {
  // Tier 1
  running:        { name:'Running',        tier:1, class:'Athletics',    roles:[
    { id:'runner', name:'Runner', designations:['C'] },
  ]},
  ice_skating:    { name:'Ice Skating',     tier:1, class:'Athletics',    roles:[
    { id:'skater_ice', name:'Skater', designations:['C'] },
  ]},
  boxing:         { name:'Boxing',          tier:1, class:'Martial Arts', roles:[
    { id:'lightweight_box', name:'Lightweight', designations:['C'] },
    { id:'heavyweight_box', name:'Heavyweight', designations:['C','D'] },
  ]},
  netball:        { name:'Netball',         tier:1, class:'Ball',         roles:[
    { id:'goal_attack',  name:'Goal Attack',  designations:['C'] },
    { id:'goal_defence', name:'Goal Defence', designations:['D'] },
  ]},
  lacrosse:       { name:'Lacrosse',        tier:1, class:'Racquet',      roles:[
    { id:'ace_attacker_lax', name:'Ace Attacker', designations:['Rg'] },
    { id:'goalkeeper_lax',   name:'Goalkeeper',    designations:['D'] },
  ]},
  darts:          { name:'Darts',           tier:1, class:'Target',       roles:[
    { id:'arrow_chucker', name:'Arrow Chucker', designations:['Rg'] },
  ]},
  softball:       { name:'Softball',        tier:1, class:'Bat & Ball',   roles:[
    { id:'batter_softball',  name:'Batter',  designations:['Rg'] },
    { id:'pitcher_softball', name:'Pitcher', designations:['Rg'] },
  ]},
  dance:          { name:'Dance',           tier:1, class:'Performance',  roles:[
    { id:'dancer', name:'Dancer', designations:['S'] },
  ]},

  // Tier 2
  football_soccer:{ name:'Football (soccer)', tier:2, class:'Ball',       roles:[
    { id:'striker',           name:'Striker',    designations:['C'] },
    { id:'goalkeeper_soccer', name:'Goalkeeper', designations:['S','D'] },
  ]},
  jumping:        { name:'Jumping',         tier:2, class:'Athletics',    roles:[
    { id:'long_jumper', name:'Long Jumper', designations:['Rg'] },
    { id:'high_jumper', name:'High Jumper', designations:['C'] },
  ]},
  speed_skating:  { name:'Speed Skating',   tier:2, class:'Athletics',    roles:[
    { id:'skater_speed', name:'Skater', designations:['C'] },
  ]},
  karate:         { name:'Karate',          tier:2, class:'Martial Arts', roles:[
    { id:'wado_ryu',   name:'Wado-ryu',   designations:['D'] },
    { id:'kyokushin',  name:'Kyokushin',  designations:['C'] },
  ]},
  volleyball:     { name:'Volleyball',      tier:2, class:'Ball',         roles:[
    { id:'spiker', name:'Spiker', designations:['C'] },
    { id:'setter', name:'Setter', designations:['S'] },
  ]},
  cricket:        { name:'Cricket',         tier:2, class:'Bat & Ball',   roles:[
    { id:'batter_cricket',  name:'Batter',  designations:['Rg'] },
    { id:'pitcher_cricket', name:'Pitcher', designations:['Rg'] },
  ]},
  paintball:      { name:'Paintball',       tier:2, class:'Target',       roles:[
    { id:'sniper',   name:'Sniper',   designations:['Rg'] },
    { id:'frontman', name:'Frontman', designations:['C'] },
  ]},
  tennis:         { name:'Tennis',          tier:2, class:'Racquet',      roles:[
    { id:'singles', name:'Singles', designations:['Rg'] },
    { id:'doubles', name:'Doubles', designations:['Rg'], partySlots:2 },
  ]},
  cheerleading:   { name:'Cheerleading',    tier:2, class:'Performance',  roles:[
    { id:'cheerleader', name:'Cheerleader', designations:['S'] },
  ]},
  gymnastics:     { name:'Gymnastics',      tier:2, class:'Performance',  roles:[
    { id:'gymnast', name:'Gymnast', designations:['S'] },
  ]},

  // Tier 3
  rugby:          { name:'Rugby',           tier:3, class:'Ball',         roles:[
    { id:'ace_attacker_rugby', name:'Ace Attacker', designations:['C'] },
    { id:'ace_defender_rugby', name:'Ace Defender', designations:['S','D'] },
  ]},
  am_football:    { name:'Am Football',     tier:3, class:'Ball',         roles:[
    { id:'qb',            name:'QB',       designations:['Rg'] },
    { id:'defender_amfb', name:'Defender', designations:['D'] },
  ]},
  sprinting:      { name:'Sprinting',       tier:3, class:'Athletics',    roles:[
    { id:'starter', name:'Starter', designations:['C'] },
    { id:'anchor',  name:'Anchor',  designations:['C'] },
  ]},
  hockey:         { name:'Hockey',          tier:3, class:'Ball',         roles:[
    { id:'ace_forward',      name:'Ace Forward', designations:['C','Rg'] },
    { id:'goalkeeper_hockey',name:'Goalkeeper',  designations:['S','D'] },
  ]},
  mma:            { name:'MMA',             tier:3, class:'Martial Arts', roles:[
    { id:'heavyweight_mma', name:'Heavyweight', designations:['C'] },
    { id:'lightweight_mma', name:'Lightweight', designations:['C','D'] },
  ]},
  kendo:          { name:'Kendo',           tier:3, class:'Martial Arts', roles:[
    { id:'master', name:'Master', designations:['C'] },
  ]},
  basketball:     { name:'Basketball',      tier:3, class:'Ball',         roles:[
    { id:'ace_attack_bball',  name:'Ace Attack',  designations:['C'] },
    { id:'ace_defence_bball', name:'Ace Defence', designations:['D'] },
  ]},
  baseball:       { name:'Baseball',        tier:3, class:'Bat & Ball',   roles:[
    { id:'batter_baseball',  name:'Batter',  designations:['Rg'] },
    { id:'pitcher_baseball', name:'Pitcher', designations:['Rg'] },
  ]},
  archery:        { name:'Archery',         tier:3, class:'Target',       roles:[
    { id:'archer', name:'Archer', designations:['Rg'] },
  ]},
  golf:           { name:'Golf',            tier:3, class:'Racquet',      roles:[
    { id:'golfer', name:'Golfer', designations:['Rg'] },
  ]},
  figure_skating: { name:'Figure Skating',  tier:3, class:'Performance',  roles:[
    { id:'figure_skater', name:'Figure Skater', designations:['S'] },
  ]},
  aerial_fitness: { name:'Aerial Fitness',  tier:3, class:'Performance',  roles:[
    { id:'aerial', name:'Aerial', designations:['S'] },
  ]},
};

// Flat role index for O(1) lookup by role id.
const ROLE_INDEX = Object.fromEntries(
  Object.entries(SPORTS).flatMap(([sportId, sport]) =>
    sport.roles.map(role => [role.id, { ...role, sportId }]))
);
export function roleById(roleId) {
  return ROLE_INDEX[roleId] ?? null;
}
export function sportById(sportId) {
  return SPORTS[sportId] ?? null;
}

// ── Gear slots per class (Gear & Forge, July 2026) ──────────────────────────
// Replaces the old uniform 5-slot system with per-class slot COUNTS/layouts.
// The slot KEYS themselves are unchanged ('weapon'/'headwear'/'footwear'/
// 'chest'/'handwear' — see items.js/EquipmentScene.js) to avoid touching the
// ~80 existing hand-authored items and their sprite-frame coordinates
// (ITEM_FRAMES in items.js is keyed by these exact slot names); 'weapon' is
// simply the slot the redesign calls the "Class Item" — that's a rename at
// the display/label level for a later UI pass, not a stored-data rename.
// classItemMultiplier is the stat multiplier applied to a Class Item's own
// rolled lines (see rollGearItem in items.js) — classes with fewer slots
// get a stronger Class Item to compensate.
export const CLASS_GEAR_LAYOUT = {
  'Bat & Ball':   { slots: ['weapon', 'headwear', 'footwear', 'chest', 'handwear'], classItemMultiplier: 1 },
  'Ball':         { slots: ['weapon', 'headwear', 'footwear', 'chest', 'handwear'], classItemMultiplier: 1 },
  'Racquet':      { slots: ['weapon', 'headwear', 'footwear', 'chest', 'handwear'], classItemMultiplier: 1 },
  'Target':       { slots: ['weapon', 'headwear', 'footwear', 'chest', 'handwear'], classItemMultiplier: 1 },
  'Athletics':    { slots: ['weapon', 'headwear', 'chest', 'handwear'], classItemMultiplier: 1 },
  'Martial Arts': { slots: ['weapon', 'chest', 'footwear', 'headwear'], classItemMultiplier: 2 },
  'Performance':  { slots: ['weapon', 'chest'], classItemMultiplier: 3 },
};
// Fallback for any class grouping that somehow doesn't match above — full
// 5-slot layout, no bonus. Shouldn't be hit in practice (every SPORTS class
// grouping is covered above).
const DEFAULT_GEAR_LAYOUT = { slots: ['weapon', 'headwear', 'footwear', 'chest', 'handwear'], classItemMultiplier: 1 };
// Figure Skater (Performance class, per SPORTS.figure_skating) is CONFIRMED
// to use the Athletics 4-slot layout instead of Performance's 2-slot one —
// "skating heritage from the Ice Skating chain roots," per the sheet.
// Keyed by sportId (not roleId — figure_skating has a single role anyway).
const GEAR_LAYOUT_SPORT_OVERRIDE = { figure_skating: 'Athletics' };

// The gear slot layout that applies to a unit right now, based on its
// CURRENT class grouping (same current-tier-only philosophy as
// currentDesignations — see that function's comment).
export function gearLayoutForUnit(unit) {
  const sportId = currentSport(unit);
  const layoutKey = GEAR_LAYOUT_SPORT_OVERRIDE[sportId] ?? sportById(sportId)?.class;
  return CLASS_GEAR_LAYOUT[layoutKey] ?? DEFAULT_GEAR_LAYOUT;
}

// ── Promotion chains ─────────────────────────────────────────────────────────
// T1 + secondary talent → T2 → T3. Chains are preserved exactly from the old
// CLASS_TREES (same id/primary/secondary/t1 pairing) — only the T1/T2/T3
// values changed from class-name strings to sport ids, and t3 is now an array
// to support the two branching chains (1/2 share Am Football; 4 branches to
// Kendo). Rollerskater → Skate Boarder → Parkour is cut per the redesign.
export const SPORT_CHAINS = [
  // Speed primary
  { id:'runner_striker', primary:'Speed',    secondary:'Endurance', t1:'running',     t2:'football_soccer', t3:['rugby','am_football'] },
  { id:'runner_jumper',  primary:'Speed',    secondary:'Stamina',   t1:'running',     t2:'jumping',          t3:['sprinting','am_football'] },
  { id:'iceskater',      primary:'Speed',    secondary:'Strength',  t1:'ice_skating', t2:'speed_skating',    t3:['hockey'] },
  // Strength primary
  { id:'boxer',          primary:'Strength', secondary:'Stamina',   t1:'boxing',      t2:'karate',           t3:['mma','kendo'] },
  // Endurance primary
  { id:'netballer',      primary:'Endurance',secondary:'Stamina',   t1:'netball',     t2:'volleyball',       t3:['basketball'] },
  { id:'lacrosse',       primary:'Endurance',secondary:'Stamina',   t1:'lacrosse',    t2:'cricket',          t3:['baseball'] },
  { id:'dart_archer',    primary:'Strength', secondary:'Endurance', t1:'darts',       t2:'paintball',        t3:['archery'] },
  // Stamina primary
  { id:'pitcher',        primary:'Stamina',  secondary:'Endurance', t1:'softball',    t2:'tennis',           t3:['golf'] },
  { id:'cheerleader',    primary:'Stamina',  secondary:'Endurance', t1:'dance',       t2:'cheerleading',     t3:['figure_skating'] },
  { id:'gymnast',        primary:'Strength', secondary:'Stamina',   t1:'dance',       t2:'gymnastics',       t3:['aerial_fitness'] },
];

export function chainById(chainId) {
  return SPORT_CHAINS.find(c => c.id === chainId) ?? null;
}

// Sport ids pickable as a starting (T1) sport at character creation —
// deduped, since 'running' and 'dance' each seed two chains.
export const STARTING_SPORTS = [...new Set(SPORT_CHAINS.map(c => c.t1))];

// Returns the chain for a starting T1 sport, independent of talents (a T1
// sport shared by multiple chains — running, dance — resolves to whichever
// chain appears first; this matches the pre-redesign getTreeForT1 behavior
// exactly, which never actually consulted the secondary talent either).
export function getChainForT1Sport(t1Sport) {
  return SPORT_CHAINS.find(c => c.t1 === t1Sport) ?? null;
}

// The sport a unit currently fights/appears in, gated by level (T1 → T2 @10 → T3 @20).
// Falls back to an earlier tier if the later tier hasn't been chosen yet
// (promotion is optional/deferrable — see pendingPromotion below).
export function currentSport(unit) {
  if (unit.level >= CLASS_TIER_LEVELS.t3 && unit.t3Sport) return unit.t3Sport;
  if (unit.level >= CLASS_TIER_LEVELS.t2 && unit.t2Sport) return unit.t2Sport;
  return unit.t1Sport;
}
export function currentRoleId(unit) {
  if (unit.level >= CLASS_TIER_LEVELS.t3 && unit.t3Role) return unit.t3Role;
  if (unit.level >= CLASS_TIER_LEVELS.t2 && unit.t2Role) return unit.t2Role;
  return unit.t1Role;
}
export function currentRole(unit) {
  return roleById(currentRoleId(unit));
}
export function currentDesignations(unit) {
  return currentRole(unit)?.designations ?? [];
}
// Display label for a unit's current role, e.g. "Striker" — replaces the old
// currentClassName(unit) string everywhere it was used for display/lookup.
export function roleDisplayLabel(unit) {
  return currentRole(unit)?.name ?? '?';
}

// All role ids a unit has ever unlocked (T1, plus T2/T3 once reached) —
// abilities learned at an earlier tier are kept after promotion. Mirrors the
// old unlockedClassNames accumulation exactly (no severance logic here — the
// "switching designation loses old abilities" rule from the redesign applies
// to the new Designation-layer skill pool, which is empty until that content
// is authored; nothing to lose yet).
export function unlockedRoleIds(unit) {
  const ids = [unit.t1Role];
  if (unit.level >= CLASS_TIER_LEVELS.t2 && unit.t2Role) ids.push(unit.t2Role);
  if (unit.level >= CLASS_TIER_LEVELS.t3 && unit.t3Role) ids.push(unit.t3Role);
  return [...new Set(ids)].filter(Boolean);
}

// If a unit has hit a tier's level threshold but hasn't chosen a role at that
// tier yet, promotion is pending (and optional — the unit stays at its
// current tier, keeping its full known kit, until the player promotes).
// Standalone-folded units (no chainId) never have a pending promotion.
export function pendingPromotion(unit) {
  if (!unit.chainId) return null;
  if (unit.level >= CLASS_TIER_LEVELS.t3 && !unit.t3Sport) return 't3';
  if (unit.level >= CLASS_TIER_LEVELS.t2 && !unit.t2Sport) return 't2';
  return null;
}
// Sport choices available for a unit's pending T3 promotion (branching chains
// offer 2; the rest offer 1). Not meaningful for t2 (always the chain's single t2).
export function t3SportOptions(unit) {
  const chain = chainById(unit.chainId);
  return chain?.t3 ?? [];
}
// Apply a promotion choice: tier is 't2' or 't3'; sportId only needed for t3
// (branching chains); roleId must belong to the destination sport.
export function promoteUnit(unit, tier, roleId, sportId) {
  const chain = chainById(unit.chainId);
  if (!chain) return false;
  if (tier === 't2') {
    if (!chain.t2) return false;
    unit.t2Sport = chain.t2;
    unit.t2Role = roleId;
  } else if (tier === 't3') {
    const sport = sportId ?? chain.t3[0];
    if (!chain.t3.includes(sport)) return false;
    unit.t3Sport = sport;
    unit.t3Role = roleId;
  } else {
    return false;
  }
  return true;
}

// Full character roster — characters join the party as the story progresses.
// Reno/Zora run the full runner_striker chain (Runner → Striker → Ace
// Attacker, per the redesign's own note confirming Reno's T3 Rugby role).
// Sela/Drace/Trice were standalone single-tier classes (Goalkeeper/
// Linebacker/Center, no T2/T3) — folded into their new sport+role per the
// Implementation Checklist, with no chainId so they never see a promotion
// prompt (matching their old "no further tier" behavior exactly).
export const FULL_ROSTER = [
  { id:'reno',  name:'Reno Sirblanc',  initials:'RE', color:0x4488ff, element:'Lightning',
    chainId:'runner_striker', t1Sport:'running', t1Role:'runner', t2Sport:'football_soccer', t2Role:'striker', t3Sport:'rugby', t3Role:'ace_attacker_rugby',
    level:1, xp:0, speed:12, strength:10, stamina:9,  endurance:8,  moveSpeed:5, talents:['Speed','Endurance'] },
  { id:'drace', name:'Drace Vollen',   initials:'DR', color:0x44cc44, element:'Fire',
    chainId:null, t1Sport:'am_football', t1Role:'defender_amfb', t2Sport:null, t2Role:null, t3Sport:null, t3Role:null,
    level:1, xp:0, speed:8,  strength:14, stamina:10, endurance:10, moveSpeed:4, talents:['Strength','Strength'] },
  { id:'sela',  name:'Sela Vorne',     initials:'SE', color:0x44cccc, element:'Water',
    chainId:null, t1Sport:'football_soccer', t1Role:'goalkeeper_soccer', t2Sport:null, t2Role:null, t3Sport:null, t3Role:null,
    level:1, xp:0, speed:9,  strength:8,  stamina:12, endurance:13, moveSpeed:3, talents:['Endurance','Stamina'] },
  { id:'kael',  name:'Kael Druno',     initials:'KA', color:0xff8844, element:'Wind',
    chainId:'netballer', t1Sport:'netball', t1Role:'goal_attack', t2Sport:'volleyball', t2Role:'spiker', t3Sport:'basketball', t3Role:'ace_attack_bball',
    level:1, xp:0, speed:10, strength:9,  stamina:11, endurance:9,  moveSpeed:4, talents:['Stamina','Endurance'] },
  { id:'trice', name:'Trice Ballow',   initials:'TR', color:0xaa44ff, element:'Earth',
    chainId:null, t1Sport:'basketball', t1Role:'ace_defence_bball', t2Sport:null, t2Role:null, t3Sport:null, t3Role:null,
    level:1, xp:0, speed:10, strength:9,  stamina:10, endurance:10, moveSpeed:5, talents:['Strength','Endurance'] },
  { id:'zora',  name:'Zora Fen',       initials:'ZO', color:0xff44aa, element:'Lightning',
    chainId:'runner_striker', t1Sport:'running', t1Role:'runner', t2Sport:'football_soccer', t2Role:'striker', t3Sport:'rugby', t3Role:'ace_attacker_rugby',
    level:1, xp:0, speed:15, strength:7,  stamina:8,  endurance:7,  moveSpeed:6, talents:['Speed','Speed'] },
];

export const state = {
  party: [ { ...FULL_ROSTER[0], equip: mkEquip() } ],  // start with Reno only
  inventory: [],          // array of item objects (from items.js)
  tytrate: 150,
  completedMissions: [],
  unlockedMissions: ['M1'],
  currentMission: 'M1',
  forgeVisited: false,
};

// XP required to go from `level` to `level+1`
export function xpToNext(level) { return level * 100; }

// Grant XP to a unit. Returns gain object if leveled up, null otherwise.
// No-ops once the unit is at LEVEL_CAP.
export function addXP(unit, amount) {
  if (unit.level >= LEVEL_CAP) return null;
  unit.xp += amount;
  const needed = xpToNext(unit.level);
  if (unit.xp < needed) return null;

  unit.xp -= needed;
  unit.level = Math.min(LEVEL_CAP, unit.level + 1);
  const gains = levelUpGains(unit);
  unit.speed      += gains.speed;
  unit.strength   += gains.strength;
  unit.stamina    += gains.stamina;
  unit.endurance  += gains.endurance;

  const unlockedSlot = CLASS_SKILL_SLOT_LEVELS.includes(unit.level);
  const promoted = unit.level === CLASS_TIER_LEVELS.t2 || unit.level === CLASS_TIER_LEVELS.t3;
  return { ...gains, newLevel: unit.level, unlockedSlot, promoted };
}

// Base per-level growth (before talent doubling) applied to every unit
const BASE_GROWTH = { speed: 1, strength: 1, stamina: 1, endurance: 1 };

// Stat gains per level-up: base growth, doubled per talent pick that matches
// the stat (so picking the same talent twice quadruples that stat's growth).
function levelUpGains(unit) {
  const talents = unit.talents ?? [];
  const gains = {};
  for (const stat of Object.keys(BASE_GROWTH)) {
    const picks = talents.filter(t => TALENT_STAT_KEY[t] === stat).length;
    gains[stat] = BASE_GROWTH[stat] * Math.pow(2, picks);
  }
  return gains;
}

// Get effective stats (base + all equipped item bonuses). bonusHp/bonusSp
// are new (Gear & Forge redesign) — a gear line can now roll flat HP or SP
// directly (Head's main stat is "HP or SP"), on top of the existing 4 core
// stats. bonusHp already flows into maxHp() below; bonusSp does NOT yet
// reach a unit's actual max SP — that's computed ad hoc in BattleScene.js's
// battle-unit construction (a talent-stat formula, not this function) and
// still needs a follow-up wiring pass to add bonusSp in.
export function effectiveStats(unit) {
  let s = {
    speed: unit.speed, strength: unit.strength, stamina: unit.stamina, endurance: unit.endurance,
    bonusHp: 0, bonusSp: 0,
  };
  for (const item of Object.values(unit.equip)) {
    if (!item) continue;
    s.speed      += item.stats?.speed      ?? 0;
    s.strength   += item.stats?.strength   ?? 0;
    s.stamina    += item.stats?.stamina    ?? 0;
    s.endurance  += item.stats?.endurance  ?? 0;
    s.bonusHp    += item.stats?.hp         ?? 0;
    s.bonusSp    += item.stats?.sp         ?? 0;
  }
  return s;
}

export function maxHp(unit) {
  const s = effectiveStats(unit);
  return (s.endurance + s.stamina) * (2 + unit.level) + s.bonusHp;
}

// Aggregate item-line damage/affinity/designation multiplier bonuses across
// all of a unit's equipped gear (new gear-line stat types — see the "Stat
// pool for gear lines" note in items.js). Returned as decimal fractions
// (0.05 = +5%), summed additively across items/lines.
// ENGINE TODO: not yet folded into BattleScene.js's calcAtk/
// designationMultiplier/elementMultiplier — those still compute damage
// without any gear-multiplier input. That's the follow-up wiring pass.
export function equipMultipliers(unit) {
  const m = { damage: 0, affinity: 0, designation: 0 };
  for (const item of Object.values(unit.equip)) {
    if (!item) continue;
    m.damage      += item.multipliers?.damage      ?? 0;
    m.affinity    += item.multipliers?.affinity    ?? 0;
    m.designation += item.multipliers?.designation ?? 0;
  }
  return m;
}

// Equip an item (from inventory) into a unit's slot.
// Returns the unequipped item (or null) which goes back to inventory.
export function equipItem(unit, item) {
  const slot = item.slot;
  const prev = unit.equip[slot];
  unit.equip[slot] = item;
  state.inventory = state.inventory.filter(i => i !== item);
  if (prev) state.inventory.push(prev);
  return prev;
}

// Unequip a slot, returning item to inventory.
export function unequipSlot(unit, slot) {
  const item = unit.equip[slot];
  if (!item) return;
  unit.equip[slot] = null;
  state.inventory.push(item);
}

// Add a character from FULL_ROSTER to the active party (no-op if already present).
export function recruitCharacter(id) {
  if (state.party.find(u => u.id === id)) return;
  const template = FULL_ROSTER.find(u => u.id === id);
  if (template) state.party.push({ ...template, equip: mkEquip(), classSkills: [] });
}

// Equip a known passive (Class Skill) id into one of a unit's unlocked slots
// (outside battle only). Slots hold passives, not active abilities — see
// CLASS_SKILL_SLOT_LEVELS note above.
export function equipPassive(unit, slotIndex, passiveId) {
  if (slotIndex >= classSkillSlotCount(unit.level)) return;
  if (!unit.classSkills) unit.classSkills = [];
  unit.classSkills[slotIndex] = passiveId;
}

// Complete a mission and unlock the next one.
export function completeMission(missionId, nextMissionId) {
  if (!state.completedMissions.includes(missionId)) {
    state.completedMissions.push(missionId);
  }
  if (nextMissionId && !state.unlockedMissions.includes(nextMissionId)) {
    state.unlockedMissions.push(nextMissionId);
  }
}

// ── Persistence ──────────────────────────────────────────────────────────────

const SAVE_KEY = 'born-gifted-save-v1';

export function hasSave() {
  return !!localStorage.getItem(SAVE_KEY);
}

export function saveGame() {
  try {
    const data = {
      version: 2,
      savedAt: Date.now(),
      tytrate:            state.tytrate,
      completedMissions:  [...state.completedMissions],
      unlockedMissions:   [...state.unlockedMissions],
      currentMission:     state.currentMission,
      party: state.party.map(u => ({
        id: u.id, name: u.name, initials: u.initials, color: u.color, element: u.element,
        chainId: u.chainId ?? null,
        t1Sport: u.t1Sport, t1Role: u.t1Role,
        t2Sport: u.t2Sport ?? null, t2Role: u.t2Role ?? null,
        t3Sport: u.t3Sport ?? null, t3Role: u.t3Role ?? null,
        level: u.level, xp: u.xp,
        speed: u.speed, strength: u.strength, stamina: u.stamina, endurance: u.endurance,
        moveSpeed: u.moveSpeed, sp: u.sp ?? 4, maxSp: u.maxSp ?? 4,
        talents: [...(u.talents ?? [])], classSkills: [...(u.classSkills ?? [])],
        equip: JSON.parse(JSON.stringify(u.equip)),
      })),
      inventory: state.inventory.map(i => ({ ...i })),
      forgeVisited: state.forgeVisited,
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    return true;
  } catch (e) {
    return false;
  }
}

// ── Save migration ───────────────────────────────────────────────────────────
// Pre-redesign saves (version 1, absent, or missing t1Sport) store class
// names as unit.t1/t2/t3 strings. Maps every historical class name to its
// {sport, role} under the new model. Ambiguous roles (e.g. old saves never
// recorded which of Boxing's two designations a Boxer had) default to the
// role that keeps the same designation the unit's T2/T3 name implies where
// possible; genuinely lost chains (Rollerskater → Skate Boarder → Parkour,
// cut entirely) fall back to the nearest same-talent-pair Performance chain
// (Dance → Cheerleading → Figure Skating) rather than crashing or resetting.
const OLD_CLASS_TO_ROLE = {
  // T1
  'Runner':           { sport:'running',     role:'runner' },
  'Ice Skater':       { sport:'ice_skating', role:'skater_ice' },
  'Boxer':            { sport:'boxing',      role:'lightweight_box' },
  'Dart Player':      { sport:'darts',       role:'arrow_chucker' },
  'Dancer':           { sport:'dance',       role:'dancer' },
  'Netballer':        { sport:'netball',     role:'goal_attack' },
  'Rollerskater':     { sport:'dance',       role:'dancer' },       // chain removed — nearest Support fallback
  'Lacrosse Player':  { sport:'lacrosse',    role:'ace_attacker_lax' },
  'Softball Pitcher': { sport:'softball',    role:'pitcher_softball' },
  // T2
  'Striker':          { sport:'football_soccer', role:'striker' },
  'Long Jumper':       { sport:'jumping',        role:'long_jumper' },
  'Speed Skater':      { sport:'speed_skating',   role:'skater_speed' },
  'Black Belt':        { sport:'karate',          role:'kyokushin' },
  'Paintballer':       { sport:'paintball',       role:'sniper' },
  'Gymnast':           { sport:'gymnastics',      role:'gymnast' },
  'Spiker':            { sport:'volleyball',      role:'spiker' },
  'Skate Boarder':     { sport:'cheerleading',    role:'cheerleader' },  // chain removed — nearest fallback
  'Cricket Player':    { sport:'cricket',         role:'batter_cricket' },
  'Tennis Player':     { sport:'tennis',          role:'singles' },
  'Cheerleader':       { sport:'cheerleading',    role:'cheerleader' },
  // T3
  'Rugger':            { sport:'rugby',           role:'ace_attacker_rugby' },
  'Sprinter':          { sport:'sprinting',       role:'starter' },
  'Hockey Player':     { sport:'hockey',          role:'ace_forward' },
  'MMA':                { sport:'mma',             role:'heavyweight_mma' },
  'Archer':             { sport:'archery',         role:'archer' },
  'Aerial Fitness':     { sport:'aerial_fitness',  role:'aerial' },
  'Baller':             { sport:'basketball',      role:'ace_attack_bball' },
  'Parkour':            { sport:'figure_skating',  role:'figure_skater' },  // chain removed — nearest fallback
  'Baseball Player':    { sport:'baseball',        role:'batter_baseball' },
  'Golfer':             { sport:'golf',            role:'golfer' },
  'Figure Skater':      { sport:'figure_skating',  role:'figure_skater' },
  // Standalone (folded into roles, no chain)
  'Goalkeeper':         { sport:'football_soccer', role:'goalkeeper_soccer' },
  'Linebacker':         { sport:'am_football',     role:'defender_amfb' },
  'Center':             { sport:'basketball',      role:'ace_defence_bball' },
};
const STANDALONE_OLD_NAMES = ['Goalkeeper', 'Linebacker', 'Center'];

function migrateLegacyUnit(u) {
  if (u.t1Sport) return u; // already new-format
  const t1 = OLD_CLASS_TO_ROLE[u.t1] ?? { sport:'running', role:'runner' };
  const t2 = u.t2 ? OLD_CLASS_TO_ROLE[u.t2] : null;
  const t3 = u.t3 ? OLD_CLASS_TO_ROLE[u.t3] : null;
  const chain = getChainForT1Sport(t1.sport);
  const { t1:_t1, t2:_t2, t3:_t3, ...rest } = u;
  return {
    ...rest,
    chainId: STANDALONE_OLD_NAMES.includes(u.t1) ? null : (chain?.id ?? null),
    t1Sport: t1.sport, t1Role: t1.role,
    t2Sport: t2?.sport ?? null, t2Role: t2?.role ?? null,
    t3Sport: t3?.sport ?? null, t3Role: t3?.role ?? null,
  };
}

export function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    if (!data?.party) return false;

    state.party = data.party.map(raw => {
      const u = migrateLegacyUnit(raw);
      return {
        ...u,
        equip:     u.equip ?? mkEquip(),
        isDone:    false, isDead: false, hitFlash: false,
        hasActed:  false, hasMoved: false,
      };
    });
    state.inventory         = data.inventory         ?? [];
    state.tytrate           = data.tytrate           ?? 150;
    state.completedMissions = data.completedMissions ?? [];
    state.unlockedMissions  = data.unlockedMissions  ?? ['M1'];
    state.currentMission    = data.currentMission    ?? 'M1';
    state.forgeVisited      = data.forgeVisited      ?? false;
    return true;
  } catch (e) {
    return false;
  }
}

// Temporary: new games start at this level instead of 1, for faster playtesting.
const STARTER_LEVEL = 5;

// Build a fresh protagonist from character-creation choices (starting sport
// + starting role + element + 2 talents). The protagonist's identity
// (id/name/portrait) is fixed as Reno Sirblanc, since the story's dialogue is
// written around that character — only his sport chain, role, element, and
// stat growth are chosen by the player. T2/T3 are left unset (pending
// promotion, chosen later in play) — STARTER_LEVEL (5) is under the T2
// threshold (10) anyway, so this never leaves a starter mid-tier.
export function createStarterUnit({ t1Sport, t1Role, talents, element }) {
  const chain = getChainForT1Sport(t1Sport);
  const unit = {
    id: 'reno', name: 'Reno Sirblanc', initials: 'RE', color: 0x4488ff, element: element ?? 'Lightning',
    chainId: chain?.id ?? null,
    t1Sport, t1Role, t2Sport: null, t2Role: null, t3Sport: null, t3Role: null,
    level: 1, xp: 0,
    speed: 8, strength: 8, stamina: 8, endurance: 8, moveSpeed: 4,
    talents: [...talents], classSkills: [],
    equip: mkEquip(), sp: 4, maxSp: 4,
  };
  // Apply the same per-level growth addXP would, so the starter's stats match
  // what natural leveling to STARTER_LEVEL would have produced.
  while (unit.level < STARTER_LEVEL) {
    const gains = levelUpGains(unit);
    unit.speed      += gains.speed;
    unit.strength   += gains.strength;
    unit.stamina    += gains.stamina;
    unit.endurance  += gains.endurance;
    unit.level++;
  }
  return unit;
}

// Start a new game. Pass the unit built by the character-creation flow
// (createStarterUnit); falls back to the default roster lead if omitted.
export function newGame(starterUnit) {
  state.party             = [ starterUnit ?? { ...FULL_ROSTER[0], equip: mkEquip(), sp: 4, maxSp: 4, classSkills: [] } ];
  state.inventory         = [];
  state.tytrate           = 150;
  state.completedMissions = [];
  state.unlockedMissions  = ['M1'];
  state.currentMission    = 'M1';
  state.forgeVisited      = false;
  localStorage.removeItem(SAVE_KEY);
}
