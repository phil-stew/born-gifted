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
export const CLASS_SKILL_SLOT_LEVELS = [5, 10, 20];
export function classSkillSlotCount(level) {
  return CLASS_SKILL_SLOT_LEVELS.filter(l => level >= l).length;
}

// Battle loadout — a unit can KNOW far more Special Attacks/Skills than it
// can bring into a single fight (2026-07-07 feedback: previously every known
// Special/Skill was auto-usable in battle with no cap or selection; now
// capped and player-selected via LoadoutScene, mirroring how Class Skills
// already work). Not level-gated like CLASS_SKILL_SLOT_LEVELS — always this
// many slots, some may just be empty if the unit doesn't know enough yet.
export const MAX_EQUIPPED_SPECIALS = 4;
export const MAX_EQUIPPED_SKILLS = 3;

// Dumb bounds-checked setters — mirrors equipPassive below. The "which ids
// are even valid to equip" / "default to the unit's first known abilities"
// logic lives in abilities.js's getEquippedSpecialAbilities/
// getEquippedSkillAbilities instead, since it needs getUnitSpecials/
// getUnitSkills and abilities.js already imports FROM this module (a
// reverse import here would be circular).
export function equipSpecialSlot(unit, slotIndex, abilityId) {
  if (slotIndex >= MAX_EQUIPPED_SPECIALS) return;
  if (!unit.equippedSpecials) unit.equippedSpecials = [];
  unit.equippedSpecials[slotIndex] = abilityId;
}
export function equipSkillSlot(unit, slotIndex, abilityId) {
  if (slotIndex >= MAX_EQUIPPED_SKILLS) return;
  if (!unit.equippedSkills) unit.equippedSkills = [];
  unit.equippedSkills[slotIndex] = abilityId;
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
    { id:'goalkeeper_lax',   name:'Goalkeeper',    designations:['D','C'] },
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
    { id:'setter', name:'Setter', designations:['S','C'] },
  ]},
  cricket:        { name:'Cricket',         tier:2, class:'Bat & Ball',   roles:[
    { id:'batter_cricket',  name:'Batter',  designations:['Rg'] },
    { id:'pitcher_cricket', name:'Pitcher', designations:['Rg'] },
  ]},
  paintball:      { name:'Paintball',       tier:2, class:'Target',       roles:[
    { id:'sniper',   name:'Sniper',   designations:['Rg'] },
    { id:'frontman', name:'Frontman', designations:['C','Rg'] },
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
  'Athletics':    { slots: ['weapon', 'headwear', 'chest', 'handwear'], classItemMultiplier: 2 },
  'Martial Arts': { slots: ['weapon', 'chest', 'footwear', 'headwear'], classItemMultiplier: 2 },
  'Performance':  { slots: ['weapon', 'chest'], classItemMultiplier: 3, weaponItemMultiplier:3},
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
  // T2 must be checked (and offered) before T3 — a unit that jumps straight
  // to level 20+ without ever promoting (e.g. a high-level recruit leveled
  // up to match the party, or a big multi-level XP grant) has t2Sport still
  // null, and checking T3 first used to surface a T3 prompt that let the
  // player promote straight past T2, skipping its sport/role/abilities
  // entirely (2026-07-08 bug report).
  if (unit.level >= CLASS_TIER_LEVELS.t2 && !unit.t2Sport) return 't2';
  if (unit.level >= CLASS_TIER_LEVELS.t3 && !unit.t3Sport) return 't3';
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
    // Defense in depth against the same "T3 before T2" bug pendingPromotion
    // used to have — refuse a T3 promotion for a unit that never chose T2.
    if (!unit.t2Sport) return false;
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
  unlockedMissions: ['M0'],
  currentMission: 'M0',
  // Unused since the M0-M4 redesign's Phase 3 replaced its one cutscene
  // trigger with the real capitalQuest/capitalCraftCount gate — left in
  // place harmlessly for save-shape compatibility.
  forgeVisited: false,
  wildsEntryShown: false,
  // Repurposed (Phase 4, M0-M4 redesign) as M4's one-time "never thought
  // I'd fight our instructor" exam-intro flag — previously gated the old
  // Hollow Caves reveal cutscene, which no longer exists.
  caveEntryShown: false,
  // Generic one-time-intro gate for the region cave/unique-area missions
  // (M5-M12, July 2026) — an array of mission ids rather than one boolean
  // per mission like wildsEntryShown/caveEntryShown above, since there are
  // 8 of these.
  missionIntroShown: [],
  // M1 (wolf battle) doesn't unlock M2 on its own — the player must return
  // to M0 (Hidden Village) to turn it in for the herb/Tytrate reward and the
  // Academy-selection news, which is what actually unlocks M2 (M0-M4
  // redesign, July 2026). This flag gates that one-time turn-in.
  m1TurnedIn: false,
  // The Capital (M3) questline stage machine (M0-M4 redesign, Phase 3) —
  // see WorldMapScene's M3 click handler for the full stage flow:
  // 'not_started' -> 'intro' -> 'test1_active' -> 'test2_active' ->
  // 'craft_pending' -> 'recruit_pending' -> 'exam_ready' -> 'done'.
  capitalQuest: 'not_started',
  // Crafts completed at the Forge while capitalQuest === 'craft_pending' —
  // the questline advances once this reaches 2 AND the player has left the
  // Forge and returned to M3 (see ForgeScene.js).
  capitalCraftCount: 0,
  // M0a (Hidden Cave ore mission, Phase 5) mirrors M1's turn-in pattern —
  // winning it doesn't hand out its 500T first-clear reward until the
  // player returns to M0 and collects it (see WorldMapScene's M0 handler).
  m0aTurnedIn: false,
  // Replay counters, keyed by mission id — M0a and M0b use this (each
  // repeat escalates enemies: level +2, endurance/stamina +25%,
  // strength +10% per repeat, see BattleScene.js), kept as a generic
  // map in case future repeatable missions need the same pattern.
  repeatCounts: {},
  // Academy task boards (Phase 7, M0-M4 redesign) — keyed by hub node id
  // (A1/A2), each a fixed-length array of task-or-null slots. Null/expired
  // slots get rerolled by refreshAcademyTasks() whenever that academy's
  // task-list screen is opened. See generateAcademyTask() below for shape.
  academyTasks: { A1: [null, null], A2: [null, null] },
  // Academy quest lists (Phase 7) — keyed by hub node id, each an array of
  // quest-def ids (see QUEST_DEFS below). Ester (A1) got its own 3
  // (2026-07-11); Hilbert (A2) got its own 3 the same day. Artfall (AF)
  // added later the same day, 'questList' service added to its
  // HUB_CONFIGS entry to go with it — just the one Alpha King Dragon quest.
  academyQuests: { A1: ['defeat_dragon_wyverns', 'rock_damage_race', 'grow_the_party'], A2: ['defeat_king_lion', 'goblin_king', 'clear_northern_cave'], M5: ['gale_monster_hunt', 'kill_alpha_king_dragon', 'gale_legendary_gear'] },
  // Hidden Village quest-acceptance gate (2026-07-07 feedback) — M0a/M0b
  // aren't enterable from the map just because they're in unlockedMissions
  // (that only means "known/available") — the player must separately
  // accept them from the Village's Quest Menu (VillageQuestListScene)
  // before the map node will actually start a battle. Reset to false by
  // VictoryScene after every completion (not just the first), so the
  // player has to return and re-accept before each replay too. A2a/A2b/A2c
  // (2026-07-11) reuse this exact gate, just accepted from
  // AcademyQuestListScene instead of VillageQuestListScene.
  questAccepted: { M0a: false, M0b: false, A1a: false, A1b: false, A2a: false, A2b: false, A2c: false },
  // Which save slot (1/2/3) the current session reads/writes — set by
  // loadGame(slot) or newGame(starter, slot), never persisted itself (it's
  // a runtime pointer, not part of the save data).
  activeSlot: null,
};

// Temporary battle-party-size cap (M0-M4 redesign, Phase 6) — the spec wants
// only 2 units usable in battle for the window between recruiting a 2nd
// party member at the Capital and winning the exam fight, so the player
// can't just steamroll the exam with a full roster before it's "earned."
// Once past that window, the real permanent cap is MAX_BATTLE_PARTY_SIZE
// (2026-07-08 feedback: roster can grow past 20, but only 4 fight at once —
// see getBattleParty/BattlePartySelectScene below for how a larger roster
// picks which 4 go in).
export const MAX_BATTLE_PARTY_SIZE = 4;
export function maxBattlePartySize(state) {
  if (['craft_pending', 'recruit_pending', 'exam_ready'].includes(state.capitalQuest)) {
    return 2;
  }
  return Math.min(MAX_BATTLE_PARTY_SIZE, state.party.length);
}

// Which specific units (by id) fight this battle, when the roster is bigger
// than the cap — set by BattlePartySelectScene, consumed once by BattleScene
// then cleared (state.battlePartyIds below) so a later battle with a changed
// roster (recruit/dismiss) always re-prompts instead of reusing a stale pick.
// Not part of the persisted save shape (see saveGame) — purely a same-session
// handoff between the picker and BattleScene.
state.battlePartyIds = null;
export function getBattleParty(state) {
  const cap = maxBattlePartySize(state);
  if (state.battlePartyIds?.length) {3
    const chosen = state.battlePartyIds
      .map(id => state.party.find(u => u.id === id))
      .filter(Boolean)
      .slice(0, cap);
    if (chosen.length) return chosen;
  }
  return state.party.slice(0, cap);
}

// ── Academy task board (Phase 7, M0-M4 redesign) ─────────────────────────
// Item ids kept as plain strings (not imported from items.js) to avoid a
// circular import — items.js already imports from this module. The task
// board's own scene resolves these ids to display names/icons via items.js.
const TASK_ITEM_POOL = ['heal_herb', 'iron_scrap', 'leather_strip', 'skin', 'fur', 'bone', 'iron_ore', 'mint_sprig', 'lavender_bloom', 'wild_berries'];
const TASK_NPC_POOL = ['Coach Renna', 'Old Tomas', 'Quartermaster Iyla', 'Groundskeeper Bell', 'Nurse Wen'];
export const TASK_SLOT_COUNT = 2;
export const TASK_REFRESH_MS = 20 * 60 * 1000;

let taskIdCounter = 1;
function generateAcademyTask() {
  const itemId = TASK_ITEM_POOL[Math.floor(Math.random() * TASK_ITEM_POOL.length)];
  const targetName = TASK_NPC_POOL[Math.floor(Math.random() * TASK_NPC_POOL.length)];
  const qty = 2 + Math.floor(Math.random() * 4); // 2-5
  const reward = qty * (10 + Math.floor(Math.random() * 15)); // roughly scales with qty
  return {
    id: `task_${taskIdCounter++}`,
    itemId, qty, targetName, reward,
    expiresAt: Date.now() + TASK_REFRESH_MS,
  };
}

// Fills any empty/expired slot in the given academy's task board. Call this
// whenever that academy's task-list screen is opened (not on a timer — the
// game only needs to reroll when someone's looking).
export function refreshAcademyTasks(nodeId) {
  const board = state.academyTasks[nodeId];
  if (!board) return;
  const now = Date.now();
  for (let i = 0; i < board.length; i++) {
    if (!board[i] || board[i].expiresAt <= now) board[i] = generateAcademyTask();
  }
}

// Turn in a completed task: removes the matching materials from inventory,
// grants the reward, and clears the slot (so it rerolls next visit).
// Returns true on success, false if the player doesn't have enough of the
// item yet.
export function turnInAcademyTask(nodeId, slotIndex) {
  const board = state.academyTasks[nodeId];
  const task = board?.[slotIndex];
  if (!task) return false;
  const have = state.inventory.filter(it => it.id === task.itemId);
  if (have.length < task.qty) return false;
  let removed = 0;
  for (let i = state.inventory.length - 1; i >= 0 && removed < task.qty; i--) {
    if (state.inventory[i].id === task.itemId) { state.inventory.splice(i, 1); removed++; }
  }
  state.tytrate += task.reward;
  board[slotIndex] = null;
  return true;
}

// ── Academy quest list (Phase 7, M0-M4 redesign) ─────────────────────────
// Hand-authored story quests (as opposed to the randomly generated task
// board above). `done` is a live check against state, never a stored flag,
// so it can't go stale. Only one quest exists today per the user's spec —
// they said the fuller list would be drafted later.
// `available` gates whether the quest is listed at all — "Kill the King
// Wolf" shouldn't appear here before the player has actually accepted the
// Wolf's Den quest at the Hidden Village (2026-07-07 feedback); reuses
// `unlockedMissions.includes('M0b')` since that flag now only flips once
// the player accepts the Danger Incoming prompt at M0 (see WorldMapScene).
// 2026-07-11 ("hilbert academy will have 3 quest") — Hilbert Academy (A2)
// gets its own 3 hand-authored quests, each with a `missionId` (own new
// map node, off A2 — user: "lets just add it own nodes", not a reuse of
// the Capital-trial M3a/M3b fights). `available` gates on the node being
// unlocked (pushed alongside A1/A2 itself, see WorldMapScene's
// craft_pending stage) so these can't appear before Hilbert Academy does.
export const QUEST_DEFS = {
  kill_king_wolf: {
    text: 'Kill the King Wolf',
    available: (s) => s.unlockedMissions.includes('M0b'),
    check: (s) => s.completedMissions.includes('M0b'),
  },
  // Gale's quest list (2026-07-11 — "gale gives out 3 quest[s]... kill
  // the dragon [is] the 2[nd] quest, so make that repeatable"). Both
  // quests are already replayable via the default isCompleted →
  // showDifficultyPicker flow every NEW_AREA_INTRO-driven node gets (see
  // onMissionClick) — no missionId on either (no separate "accept" step,
  // same as kill_king_wolf above; the map node itself IS the quest here).
  // kill_alpha_king_dragon moved here from Artfall's list (2026-07-11
  // eighth follow-up added it there originally) — Artfall's questList
  // service was removed since it'd be empty otherwise; DK's own node
  // still connects from AF, only the quest-list HOME moved.
  kill_alpha_king_dragon: {
    text: 'Kill the Alpha King Dragon',
    available: (s) => s.unlockedMissions.includes('DK'),
    check: (s) => s.completedMissions.includes('DK'),
  },
  gale_monster_hunt: {
    text: 'Monster Hunt',
    available: (s) => s.unlockedMissions.includes('MH'),
    check: (s) => s.completedMissions.includes('MH'),
  },
  // Gale's 3rd quest (2026-07-11, "third quest should equipment lendary
  // gear on all slots... for one unit") — a pure passive state check, no
  // battle, same shape as grow_the_party. "All slots" means all slots
  // THAT UNIT actually has (per gearLayoutForUnit — Performance-class
  // units only have 2, not the full 5), checked against a SINGLE unit
  // rather than spread across the whole party ("one unit").
  gale_legendary_gear: {
    text: 'Full Legendary Loadout (1 Unit)',
    available: (s) => s.unlockedMissions.includes('M5'),
    check: (s) => s.party.some(u => gearLayoutForUnit(u).slots.every(slot => u.equip[slot]?.rarity === 'legendary')),
  },
  // Ester Academy's 3 quests (2026-07-11) — "3 quest at ester", same
  // own-nodes-with-accept-step treatment as Hilbert Academy's A2a/A2b/A2c.
  // Dropped kill_king_wolf from A1's list to keep the total at 3, matching
  // how A2 dropped it too (see academyQuests below) — the def itself is
  // left in place, just unreferenced, same as A2's treatment.
  defeat_dragon_wyverns: {
    text: 'Defeat the Dragon',
    missionId: 'A1a',
    available: (s) => s.unlockedMissions.includes('A1a'),
    check: (s) => s.completedMissions.includes('A1a'),
  },
  rock_damage_race: {
    text: 'The Great Boulder',
    missionId: 'A1b',
    available: (s) => s.unlockedMissions.includes('A1b'),
    check: (s) => s.completedMissions.includes('A1b'),
  },
  // No missionId — a pure roster-size check, no battle attached (same
  // no-missionId shape as kill_king_wolf above). MAX_BATTLE_PARTY_SIZE=4
  // means "5 party members" can only mean roster size, not battle-party
  // size (see getBattleParty/maxBattlePartySize elsewhere in this file).
  grow_the_party: {
    text: 'Grow the Party (5 Members)',
    check: (s) => s.party.length >= 5,
  },
  defeat_king_lion: {
    text: 'Defeat the King',
    missionId: 'A2a',
    available: (s) => s.unlockedMissions.includes('A2a'),
    check: (s) => s.completedMissions.includes('A2a'),
  },
  goblin_king: {
    text: 'Goblin King',
    missionId: 'A2b',
    available: (s) => s.unlockedMissions.includes('A2b'),
    check: (s) => s.completedMissions.includes('A2b'),
  },
  clear_northern_cave: {
    text: 'Clear the Northern Cave',
    missionId: 'A2c',
    available: (s) => s.unlockedMissions.includes('A2c'),
    check: (s) => s.completedMissions.includes('A2c'),
  },
};

// All 6 hand-authored academy quest ids (A1's 3 + A2's 3) — used to gate the
// Altroes Trials (2026-07-11, "after all 6 questions are done player can
// take the Altroes trials"). Checked directly against QUEST_DEFS rather than
// through getAcademyQuests/state.academyQuests, since grow_the_party has no
// missionId and so never fires a VictoryScene completion event — this gate
// has to be a live, continuously-recomputed check (see WorldMapScene's
// create(), same pattern as the M0b level-8 unlock), not something a single
// mission-complete hook can trigger.
const ACADEMY_QUEST_IDS_ALL = [
  'defeat_dragon_wyverns', 'rock_damage_race', 'grow_the_party',
  'defeat_king_lion', 'goblin_king', 'clear_northern_cave',
];
export function allAcademyQuestsDone(s) {
  return ACADEMY_QUEST_IDS_ALL.every(id => QUEST_DEFS[id].check(s));
}

export function getAcademyQuests(nodeId) {
  return (state.academyQuests[nodeId] ?? []).map(id => {
    const def = QUEST_DEFS[id];
    if (!def || (def.available && !def.available(state))) return null;
    // `missionId` (2026-07-11, Hilbert Academy's 3 quests) marks a quest
    // that needs an explicit accept step before its map node will start a
    // battle — same state.questAccepted gate M0a/M0b already use, just
    // triggered from here instead of VillageQuestListScene. kill_king_wolf
    // has no missionId, so `accepted` stays undefined for it — the scene
    // reads that as "no accept button needed" (pure passive tracker).
    const accepted = def.missionId ? !!state.questAccepted[def.missionId] : undefined;
    return { id, text: def.text, done: def.check(state), missionId: def.missionId, accepted };
  }).filter(Boolean);
}

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

// Recruit a FULL_ROSTER character with a player-chosen class (same choice
// shape as createStarterUnit: sport/role/talents/element) instead of their
// preset FULL_ROSTER identity — only id/name/initials/color are kept from
// the template, matching how the protagonist's own identity is fixed but
// class is chosen. Levels the recruit up to match the party's current
// level (mirrors createStarterUnit's STARTER_LEVEL loop) so a mid-game
// recruit isn't crippled relative to whoever's already fighting.
export function recruitWithChoice(id, { t1Sport, t1Role, talents, element }) {
  if (state.party.find(u => u.id === id)) return null;
  const template = FULL_ROSTER.find(u => u.id === id);
  if (!template) return null;

  const chain = getChainForT1Sport(t1Sport);
  const targetLevel = Math.max(1, ...state.party.map(u => u.level));
  const unit = {
    id: template.id, name: template.name, initials: template.initials, color: template.color,
    element: element ?? template.element,
    chainId: chain?.id ?? null,
    t1Sport, t1Role, t2Sport: null, t2Role: null, t3Sport: null, t3Role: null,
    level: 1, xp: 0,
    speed: 8, strength: 8, stamina: 8, endurance: 8, moveSpeed: 4,
    talents: [...talents], classSkills: [],
    equip: mkEquip(), sp: 4, maxSp: 4,
  };
  while (unit.level < targetLevel) {
    const gains = levelUpGains(unit);
    unit.speed      += gains.speed;
    unit.strength   += gains.strength;
    unit.stamina    += gains.stamina;
    unit.endurance  += gains.endurance;
    unit.level++;
  }
  state.party.push(unit);
  return unit;
}

// Total roster cap (2026-07-08 feedback) — separate from MAX_BATTLE_PARTY_SIZE
// above: a player can recruit up to this many units total, but only
// MAX_BATTLE_PARTY_SIZE of them fight in any one battle.
export const MAX_ROSTER_SIZE = 20;

let genericRecruitCounter = 1;
// Recruit a brand-new, player-named unit (as opposed to recruitWithChoice,
// which reactivates one of the 6 fixed FULL_ROSTER story characters) —
// generated id/initials/color, everything else chosen the same way a
// FULL_ROSTER recruit or the protagonist is (sport/role/talents/element).
// Returns null (no-op) if the roster is already at MAX_ROSTER_SIZE.
export function recruitNewUnit({ name, t1Sport, t1Role, talents, element }) {
  if (state.party.length >= MAX_ROSTER_SIZE) return null;

  const chain = getChainForT1Sport(t1Sport);
  const targetLevel = Math.max(1, ...state.party.map(u => u.level));
  const COLOR_POOL = [0x4488ff, 0x44cc44, 0x44cccc, 0xff8844, 0xaa44ff, 0xff44aa, 0xffdd44, 0x66ddaa];
  const initials = (name.trim().slice(0, 2) || '??').toUpperCase();
  const unit = {
    id: `recruit_${genericRecruitCounter++}`,
    name: name.trim() || 'Recruit',
    initials,
    color: COLOR_POOL[Math.floor(Math.random() * COLOR_POOL.length)],
    element: element ?? 'Fire',
    chainId: chain?.id ?? null,
    t1Sport, t1Role, t2Sport: null, t2Role: null, t3Sport: null, t3Role: null,
    level: 1, xp: 0,
    speed: 8, strength: 8, stamina: 8, endurance: 8, moveSpeed: 4,
    talents: [...talents], classSkills: [],
    equip: mkEquip(), sp: 4, maxSp: 4,
  };
  while (unit.level < targetLevel) {
    const gains = levelUpGains(unit);
    unit.speed      += gains.speed;
    unit.strength   += gains.strength;
    unit.stamina    += gains.stamina;
    unit.endurance  += gains.endurance;
    unit.level++;
  }
  state.party.push(unit);
  return unit;
}

// Remove a unit from the roster (PartyScene's Dismiss action). Refuses to
// drop the last unit — the game has no path forward with an empty party.
export function dismissUnit(id) {
  if (state.party.length <= 1) return false;
  const idx = state.party.findIndex(u => u.id === id);
  if (idx === -1) return false;
  state.party.splice(idx, 1);
  if (state.battlePartyIds) state.battlePartyIds = state.battlePartyIds.filter(bid => bid !== id);
  return true;
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
// Three independent save slots (1/2/3) instead of one shared save.

export const SAVE_SLOTS = [1, 2, 3];
const SAVE_KEY_PREFIX = 'born-gifted-save-v1-slot';
const slotKey = (slot) => `${SAVE_KEY_PREFIX}${slot}`;

// One-time migration: a pre-slots save lived under this flat key. Move it
// into slot 1 the first time this module loads after the update, so nobody
// loses progress. Runs once per page load; a no-op once migrated (or if
// there was never an old-format save).
const LEGACY_SAVE_KEY = 'born-gifted-save-v1';
(function migrateLegacySingleSlotSave() {
  const old = localStorage.getItem(LEGACY_SAVE_KEY);
  if (old && !localStorage.getItem(slotKey(1))) {
    localStorage.setItem(slotKey(1), old);
  }
  if (old) localStorage.removeItem(LEGACY_SAVE_KEY);
})();

export function hasSave(slot) {
  return !!localStorage.getItem(slotKey(slot));
}

// Light-weight peek at a slot for the title screen's slot picker — doesn't
// touch `state`, just reads and summarizes the raw JSON.
export function getSaveSummary(slot) {
  try {
    const raw = localStorage.getItem(slotKey(slot));
    if (!raw) return null;
    const data = JSON.parse(raw);
    const lead = data.party?.[0];
    if (!lead) return null;
    return {
      leadName: lead.name ?? '?',
      level: lead.level ?? 1,
      partySize: data.party?.length ?? 1,
      missionsCompleted: data.completedMissions?.length ?? 0,
      savedAt: data.savedAt ?? null,
    };
  } catch (e) {
    return null;
  }
}

export function deleteSave(slot) {
  localStorage.removeItem(slotKey(slot));
}

export function saveGame(slot = state.activeSlot ?? 1) {
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
        equippedSpecials: [...(u.equippedSpecials ?? [])], equippedSkills: [...(u.equippedSkills ?? [])],
        equip: JSON.parse(JSON.stringify(u.equip)),
      })),
      inventory: state.inventory.map(i => ({ ...i })),
      forgeVisited: state.forgeVisited,
      wildsEntryShown: state.wildsEntryShown,
      caveEntryShown: state.caveEntryShown,
      missionIntroShown: [...state.missionIntroShown],
      m1TurnedIn: state.m1TurnedIn,
      capitalQuest: state.capitalQuest,
      capitalCraftCount: state.capitalCraftCount,
      m0aTurnedIn: state.m0aTurnedIn,
      repeatCounts: { ...state.repeatCounts },
      academyTasks: {
        A1: state.academyTasks.A1.map(t => t ? { ...t } : null),
        A2: state.academyTasks.A2.map(t => t ? { ...t } : null),
      },
      academyQuests: { A1: [...state.academyQuests.A1], A2: [...state.academyQuests.A2], M5: [...state.academyQuests.M5] },
      questAccepted: { ...state.questAccepted },
    };
    localStorage.setItem(slotKey(slot), JSON.stringify(data));
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

export function loadGame(slot) {
  try {
    const raw = localStorage.getItem(slotKey(slot));
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
    state.unlockedMissions  = data.unlockedMissions  ?? ['M0'];
    // Backfill for saves made before Hilbert Academy's 3 quests existed
    // (2026-07-11) — anyone who already unlocked A2 has already passed the
    // one-time story beat that would normally unlock A2a/A2b/A2c alongside
    // it (see WorldMapScene's craft_pending stage), so retroactively grant
    // those too rather than leaving them permanently unreachable.
    if (state.unlockedMissions.includes('A2')) {
      for (const id of ['A2a', 'A2b', 'A2c']) {
        if (!state.unlockedMissions.includes(id)) state.unlockedMissions.push(id);
      }
    }
    state.currentMission    = data.currentMission    ?? 'M0';
    state.forgeVisited      = data.forgeVisited      ?? false;
    state.wildsEntryShown   = data.wildsEntryShown   ?? false;
    state.caveEntryShown    = data.caveEntryShown    ?? false;
    state.missionIntroShown = data.missionIntroShown ?? [];
    state.m1TurnedIn        = data.m1TurnedIn        ?? false;
    state.capitalQuest      = data.capitalQuest      ?? 'not_started';
    state.capitalCraftCount = data.capitalCraftCount ?? 0;
    state.m0aTurnedIn       = data.m0aTurnedIn        ?? false;
    state.repeatCounts      = { ...(data.repeatCounts ?? {}) };
    state.academyTasks      = {
      A1: data.academyTasks?.A1 ?? [null, null],
      A2: data.academyTasks?.A2 ?? [null, null],
    };
    // Fixed content, not player-customizable — always set to the current
    // roster rather than trusting a possibly-stale stored value, so an
    // existing save picks up newly-added academy quests automatically
    // (2026-07-11: Hilbert's 3 quests replacing its old single entry).
    state.academyQuests     = { A1: ['defeat_dragon_wyverns', 'rock_damage_race', 'grow_the_party'], A2: ['defeat_king_lion', 'goblin_king', 'clear_northern_cave'], M5: ['gale_monster_hunt', 'kill_alpha_king_dragon', 'gale_legendary_gear'] };
    state.questAccepted     = { M0a: false, M0b: false, A1a: false, A1b: false, A2a: false, A2b: false, A2c: false, ...(data.questAccepted ?? {}) };
    state.activeSlot        = slot;
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

// Start a new game in the given slot. Pass the unit built by the
// character-creation flow (createStarterUnit); falls back to the default
// roster lead if omitted.
export function newGame(starterUnit, slot) {
  state.party             = [ starterUnit ?? { ...FULL_ROSTER[0], equip: mkEquip(), sp: 4, maxSp: 4, classSkills: [] } ];
  state.inventory         = [];
  state.tytrate           = 150;
  state.completedMissions = [];
  state.unlockedMissions  = ['M0'];
  state.currentMission    = 'M0';
  state.forgeVisited      = false;
  state.wildsEntryShown   = false;
  state.caveEntryShown    = false;
  state.missionIntroShown = [];
  state.m1TurnedIn        = false;
  state.capitalQuest      = 'not_started';
  state.capitalCraftCount = 0;
  state.m0aTurnedIn       = false;
  state.repeatCounts      = {};
  state.academyTasks      = { A1: [null, null], A2: [null, null] };
  state.academyQuests     = { A1: ['defeat_dragon_wyverns', 'rock_damage_race', 'grow_the_party'], A2: ['defeat_king_lion', 'goblin_king', 'clear_northern_cave'], M5: ['gale_monster_hunt', 'kill_alpha_king_dragon', 'gale_legendary_gear'] };
  state.questAccepted     = { M0a: false, M0b: false, A1a: false, A1b: false, A2a: false, A2b: false, A2c: false };
  state.activeSlot        = slot;
  localStorage.removeItem(slotKey(slot));
}
