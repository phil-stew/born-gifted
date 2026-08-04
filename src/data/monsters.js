// Fantasy Sports Tactics — Monster List (July 2026 handwritten sheet)
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
// keep their existing M1/M2 stat blocks as their tier-1 baseline).
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
  Wolf:   { spriteKey: 'wolf-idle',   animKey: 'wolf-idle',   file: 'monster/wolf.webp',   fw: 249, fh: 175, spriteScale: 0.35, moveSpeed: 2 },
  Boar:   { spriteKey: 'boar-idle',   animKey: 'boar-idle',   file: 'monster/boar.webp',   fw: 256, fh: 170, spriteScale: 0.35, moveSpeed: 2 },
  Deer:   { spriteKey: 'deer-idle',   animKey: 'deer-idle',   file: 'monster/deer.webp',   fw: 248, fh: 175, spriteScale: 0.3,  moveSpeed: 3 },
  // Wired up for M3a (Northern Cave)/M3b (Hilbert Low Lands), the M0-M4
  // redesign's Capital test battles — same 1495×1052 canvas as Wolf, so the
  // same fw/fh. Goblin: slower art scale reads well for its stockier flavor;
  // Lion: faster moveSpeed to match its higher speed stat vs Wolf.
  Goblin: { spriteKey: 'goblin-idle', animKey: 'goblin-idle', file: 'monster/goblin.webp', fw: 249, fh: 175, spriteScale: 0.35, moveSpeed: 2 },
  Lion:   { spriteKey: 'lion-idle',   animKey: 'lion-idle',   file: 'monster/lion.webp',   fw: 249, fh: 175, spriteScale: 0.35, moveSpeed: 3 },
  // Wired for Ester Academy's "Defeat 1 dragon and two wyverns" quest
  // (2026-07-11). Same 1536x1024 canvas as Boar, so the same fw/fh (256x170).
  Dragon: { spriteKey: 'dragon-idle', animKey: 'dragon-idle', file: 'monster/dragon.webp', fw: 256, fh: 170, spriteScale: 0.4,  moveSpeed: 2 },
  Wyvern: { spriteKey: 'wyven-idle',  animKey: 'wyven-idle',  file: 'monster/wyven.webp',  fw: 256, fh: 170, spriteScale: 0.35, moveSpeed: 3 },
  // Golem (2026-07-18, "North of A3 they will fight the Golems as their
  // last trial") — no Golem art exists on disk (still one of the 7
  // "data first" species from the original monster redesign). No `file`
  // key on purpose: BattleScene.js's monsterSpriteInfos() only preloads
  // entries that have one, so this is deliberately skipped there and
  // instead generated at spawn time as a procedural texture (same trick
  // Ester Academy's "Rock" quest uses for rock-proc) — see
  // ensureGolemTexture()/spawnEnemyVisual in BattleScene.js. No animKey
  // (nothing to play), slow moveSpeed matching Golem's low `speed` stat.
  Golem:  { spriteKey: 'golem-proc',  animKey: null, spriteScale: 0.55, moveSpeed: 1 },
};
export function spriteInfoForBase(base) {
  return SPRITE_INFO[base] ?? null;
}

// A handful of named uniques ship their own dedicated art instead of
// reusing their base species' regular sprite — keyed by the unique's fixed
// `name`, checked in buildMonster() ahead of the per-species lookup. Same
// ~1492-1495 x ~1052-1054 / 6x6-grid canvas as the rest, so same fw/fh
// ballpark as Lion (kingwolf.png measures a hair differently, 1492x1054).
// King Lion's kinglion.png isn't wired into any mission yet (same "data
// first" status spriteInfoForBase carries for 7 of the 10 base species
// above); King Wolf's kingwolf.png IS wired — see M0b in
// BattleScene.js's MISSION_CONFIGS — with a bumped spriteScale (2026-07-08
// feedback: "the wolf should be bigger, taking up 4 tiles") so the boss
// visually dominates roughly a 2x2 tile footprint, AND a real 2x2 tile
// footprint (`size: 2` on the M0b enemy entry) — BattleScene.js's
// occupiedTiles/registerUnit generalize movement/targeting/collision for it.
// `fixedIdleFrames` (2026-07-08, after 3 iterations on this same sprite) —
// kingwolf.webp's idle row has TWO separate defects on every one of its 6
// poses, confirmed by direct raw-pixel analysis, not guesswork:
//  1. The tail is painted wider than its own ~249px cell on frames 0-5 (a
//     connected-component flood fill from each frame's own torso, seeded
//     away from any neighboring frame, gives the TRUE per-frame silhouette
//     bounding box — frame 5 is the exception that proves the rule: its
//     tail's rightmost pixel lands exactly on x=1491, the sheet's own last
//     column, i.e. the source image is cropped mid-tail with no further
//     pixels to recover. Frames 0-4 all overflow past their nominal cell by
//     ~20-30px but have empty buffer space before the next cell's own body
//     starts (also confirmed via the same bbox scan), so a wider custom
//     texture frame per pose captures the whole tail with no bleed.
//     CORRECTION (2026-07-09, "tail is moving infront"): widening every
//     frame's cropWidth this way makes each frame's crop OVERLAP the next
//     frame's nominal cell in the shared sheet, so frame N's own crop
//     re-reads frame (N-1)'s tail overflow that lands in that overlap zone
//     — visible as a stray tail/mane sliver flickering in at the left edge
//     of frames 1-4 each animation tick. Since `tex.add` points several
//     frames at overlapping windows of the SAME shared canvas (see
//     BattleScene.js), this can't be patched away like the belly shadow
//     (there's no distinguishing "this frame's real pixel" from "leaked
//     neighbor pixel" once both read the same source bytes) — the fix
//     instead moves each frame's cropX forward to exactly where the
//     previous frame's own crop ends (0/300/542/797/1046), shrinking
//     cropWidth by the same amount so the right edge — where each pose's
//     own tail overflow lives — is untouched. Verified with cropped
//     preview renders of all 5 frames: clean silhouette, no bleed, no
//     clipped tail.
//  2. Every pose's under-belly shadow (between the front/hind legs) is
//     painted pure black (0,0,0), byte-identical to the sheet's own
//     background — BattleScene's background flood-fill strip can't tell
//     the two apart (confirmed via pixel sampling) and erases the shadow as
//     if it were background, punching a hole that shows the tile through
//     the wolf's torso. A regular Wolf's equivalent pose has no such gap
//     (compared stripped, side by side) — unique to this art. No
//     tolerance/band tweak fixes it either (identical RGB, not just
//     similar). Fix: restore opacity over a small rect per frame after
//     stripping — stripping only zeroes alpha, never touches RGB, so the
//     original black paints itself right back in.
//     CORRECTION (2026-07-09, "moving shadow under the wolf's back leg"):
//     the original hand-picked patch rects were too loose (e.g. frame 0's
//     72x56 vs the shadow's real ~19x22 footprint) and, on frames 2-3,
//     landed partly over ground that should stay transparent next to the
//     lifted hind leg — a hard-edged black rectangle bigger than the actual
//     shadow, whose position (fixed per frame, but loose enough to drift
//     relative to the animated leg) read as a shadow sliding around under
//     the leg each tick. Rects can't be judged by eye — the shadow is
//     byte-identical black to the background, so a screenshot can't tell
//     "real shadow" from "should be transparent here" any better than the
//     flood fill can. Re-derived precisely instead: a standalone script
//     (scratchpad, not checked in) re-implements stripBackgroundByKey's
//     exact algorithm (same TOL=30, same corner/cell seeding) in plain
//     Node against the raw PNG, then connected-component-labels whatever
//     near-black pixels survive the simulated strip within each frame's own
//     crop window. Each frame has exactly one dominant surviving component
//     (hundreds of px) far bigger than the handful of scattered near-black
//     speckles elsewhere (eyes, nose, dark fur linework) — that dominant
//     component's bounding box, plus a ~3-4px margin, is the patch rect now
//     used below. Confirmed live (dumped the actual post-strip texture
//     frames to an on-page canvas, not a screenshot, to dodge JPEG
//     compression) that the patch is now a tight blob hugging the true
//     shadow shape, not a block overlapping the leg.
// Earlier attempts froze on a single frame (first 1, then 0) to dodge these
// — cheaper, but "no animation at all" was itself the next complaint. This
// entry instead fixes frames 0-4 individually (crop + patch each) and skips
// only frame 5 (genuinely unrecoverable), so BattleScene.js can build a real
// multi-frame idle loop instead of either a static freeze or the broken raw
// animation. `fixedIdleOriginX` is one shared horizontal origin across all
// 5 frames (each pose's true visual center drifts a few px — not worth
// per-frame pivot data for an idle wobble that already varies pose to
// pose). Monsters never play any OTHER animation (playAttackAnim is a
// no-op for anything without a `.portrait`), so this idle loop is the only
// animation King Wolf ever needs.
const UNIQUE_SPRITE_INFO = {
  'King Lion': { spriteKey: 'kinglion-idle', animKey: 'kinglion-idle', file: 'monster/kinglion.webp', fw: 249, fh: 175, spriteScale: 0.35, moveSpeed: 3 },
  // Goblin King (A2b) — dedicated art, same 1495x1052/6x6 canvas as King
  // Lion, single-tile (no size:2 override, unlike King Wolf). bgBand:5
  // (2026-08-04, "goblin sprite... two frames going") — the held mace
  // overflows its own idle-row cell by a few px on some poses, bleeding a
  // disconnected weapon-tip fragment into the NEXT cell (confirmed via
  // direct pixel comparison: present after stripBackgroundByKey, absent in
  // the raw source cell) — same class of bug as King Wolf's tail overflow,
  // just small enough that widening clearGridBoundaries' divider-clearing
  // band (default 3px) is enough to erase it, no custom per-frame crop
  // needed. Trade-off checked and accepted: band:5 also clips a couple px
  // off frame 1's own mace shaft (disconnects the head slightly from the
  // hand) — a much smaller, easy-to-miss defect at this sheet's actual
  // 0.35 battle scale than the fragment it replaces.
  'Goblin King': { spriteKey: 'goblinking-idle', animKey: 'goblinking-idle', file: 'monster/goblinking.webp', fw: 249, fh: 175, spriteScale: 0.35, moveSpeed: 2, bgBand: 5 },
  'King Wolf': {
    spriteKey: 'kingwolf-idle', animKey: 'kingwolf-idle', file: 'monster/kingwolf.webp',
    fw: 249, fh: 176, spriteScale: 0.65, moveSpeed: 2,
    fixedIdleOriginX: 0.55,
    fixedIdleFrames: [
      { frame: 0, cropX: 0,    cropWidth: 300, patch: { x: 151,  y: 74, w: 25, h: 28 } },
      { frame: 1, cropX: 300,  cropWidth: 242, patch: { x: 411,  y: 80, w: 28, h: 22 } },
      { frame: 2, cropX: 542,  cropWidth: 255, patch: { x: 645,  y: 78, w: 31, h: 57 } },
      { frame: 3, cropX: 797,  cropWidth: 249, patch: { x: 907,  y: 77, w: 39, h: 34 } },
      { frame: 4, cropX: 1046, cropWidth: 235, patch: { x: 1163, y: 80, w: 29, h: 26 } },
    ],
  },
};

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
  // jab/inner_focus/power_shot (2026-08-04) fill the gap noted below — all
  // 3 are existing hero abilities with a real targetType:'enemy' multiplier
  // (same "reuse the hero catalog" approach every other designation's pool
  // already uses), so Bear/Golem finally get real attack skills instead of
  // falling back to a plain basic attack every time. power_shot is renamed
  // to "Rock Throw" for both species via MONSTER_SKILL_NAME_OVERRIDES below
  // — same shape (2.2x dmg, range 3, 3 SP), just re-flavored rather than
  // redefined, matching how every other reused ability gets a species name.
  D:  ['shield', 'stopper', 'jab', 'inner_focus', 'power_shot'],
};

// 2026-07-09 ("give all monster enemies one attack skill and one passive
// based on their class") — MONSTER_ABILITY_POOL above mixes active
// (category 'special'/'skill') and passive abilities in one list per
// designation, so a random draw from it could hand a monster two actives
// and zero passives (or vice versa). Split it by each ability's real
// `category` (read from ABILITIES, not hand-copied) so kit-building can
// guarantee at least one of each, per designation.
function splitPoolByCategory(pool) {
  const skills = [], passives = [];
  for (const id of pool) (ABILITIES[id]?.category === 'passive' ? passives : skills).push(id);
  return { skills, passives };
}
const MONSTER_SKILL_POOL = {};
const MONSTER_PASSIVE_POOL = {};
for (const [designation, pool] of Object.entries(MONSTER_ABILITY_POOL)) {
  const { skills, passives } = splitPoolByCategory(pool);
  MONSTER_SKILL_POOL[designation] = skills;
  MONSTER_PASSIVE_POOL[designation] = passives;
}
// Defender (D) gap FIXED 2026-08-04 (was: Shield/Stopper are both
// ally-support/passive, so a D monster's "attack skill" slot stayed empty
// and it fell back to a plain basic attack every time) — jab/inner_focus/
// power_shot added to MONSTER_ABILITY_POOL.D above now give it 3 real
// targetType:'enemy' options, same as every other designation.

// Species-specific flavor renames — hand-picked (a lookup table, not a
// generator: the sheet's own resolved examples for skill naming are
// hand-picked renames, e.g. Tri-Throw -> "Talon Barrage" on Hawk). Falls
// back to a generic per-ability rename, then the hero ability's own name.
const MONSTER_SKILL_NAME_OVERRIDES = {
  Lion:   { counter_hit: 'Savage Reprisal' },
  Golem:  { shield: 'Stone Hide', power_shot: 'Rock Throw' },
  Hawk:   { tri_throw: 'Talon Barrage' },
  Dragon: { fake_out: "Wyrm's Feint", offside: 'Wing Gale', sharp_throw: "Dragon's Breath" },
  Wolf:   { fake_out: 'Snarling Lunge', offside: 'Pack Tactics' },
  Bear:   { stopper: 'Mother Bear', power_shot: 'Rock Throw' },
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
// hedge (T3's 2 and T4's 3 both fall in the stated 2-3 range). Superseded
// for regular monsters by the level-based curve below (2026-07-09), kept
// only in case some other caller still wants a tier-based count.
export function skillCountForTier(tier) {
  return [1, 2, 2, 3][Math.max(0, Math.min(3, tier - 1))];
}

// 2026-07-09 ("increased number of skills as the monsters level increases
// so level 30 will have 2 passives and 4 skills") — the two anchor points
// given are the baseline (every monster: >=1 skill, >=1 passive) and
// level 30 (4 skills, 2 passives). Brackets below interpolate linearly in
// 10-level steps for skills; passives double up at the same boundary
// where skills hit 3 (level 20) so "2 passives" is already true by 30,
// matching the given anchor exactly. Counts are clamped to each
// designation's actual pool size in buildMonsterKit, so this never asks
// for more abilities than exist.
export function skillCountForLevel(level) {
  if (level >= 30) return 4;
  if (level >= 20) return 3;
  if (level >= 10) return 2;
  return 1;
}
export function passiveCountForLevel(level) {
  return level >= 20 ? 2 : 1;
}

// Monster SP (2026-08-04, "monsters need sp as well. Level 0-10 give them
// 10 [SP]. Level 10-20, 15-20sp. Level 20plus, 20-30") — was a flat 4
// (BattleScene.js's old MONSTER_MAX_SP), the unmodified player default,
// which left inner_focus (10 SP) permanently out of reach for every
// monster. Same 3-band shape as skillCountForLevel/passiveCountForLevel
// above, but continuous within the 10-19 and 20+ bands (given as ranges,
// not flat step values) rather than a single number per band — interpolates
// 15->20 across levels 10-19, then 20->30 across levels 20-30, holding at
// 30 past that (matches skillCountForLevel's own level-30 cap anchor).
// Difficulty's own "a bit more SP at higher difficulty" adjustment is
// layered on top of this by the caller (BattleScene.js's buildEnemyUnit),
// not here — this function only knows about level.
export function spForLevel(level) {
  if (level >= 20) return Math.min(30, 20 + (Math.min(level, 30) - 20));
  if (level >= 10) return 15 + Math.round((level - 10) * 5 / 9);
  return 10;
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

// Builds the skill+passive kit for one monster instance.
//   kind: 'regular' | 'boss' | 'unique'
//   level: the monster's actual battle-time level (not tier) — only
//          meaningful for 'regular' (bosses/uniques keep getting the FULL
//          designation pool regardless of level, "fuller kits" per the
//          sheet, same as before this pass).
function pickFromPool(pool, count) {
  return count >= pool.length ? [...pool] : shuffled(pool).slice(0, count);
}
export function buildMonsterKit(base, { kind = 'regular', level = 1 } = {}) {
  const designation = MONSTER_DESIGNATION[base];
  const skillPool = MONSTER_SKILL_POOL[designation] ?? [];
  const passivePool = MONSTER_PASSIVE_POOL[designation] ?? [];
  const skillCount = kind === 'regular' ? skillCountForLevel(level) : skillPool.length;
  const passiveCount = kind === 'regular' ? passiveCountForLevel(level) : passivePool.length;
  const skillIds = pickFromPool(skillPool, skillCount);
  const passiveIds = pickFromPool(passivePool, passiveCount);
  const skills = skillIds.map(id => abilityEntry(base, id));
  const passives = passiveIds.map(id => abilityEntry(base, id));
  if (kind === 'unique') skills.push(rollGeneratedSkill(designation));
  return { designation, skills, passives };
}

// ── Full monster instance builder ────────────────────────────────────────
// Produces an enemy object shaped to drop directly into a MISSION_CONFIGS
// `enemies[]` entry (matches the existing Wolf/Boar field names exactly),
// plus the new designation/tier/abilities fields. Region/element rolling
// stays the caller's job (BattleScene's rollRegionArchetype) — pass the
// rolled `element`/`primaryStat` through if you have them.
//
// `statMult` (M0-M4 redesign, Phase 4) lets a caller override the flat
// kind/tier multiplier per stat — e.g. M0b's King Wolf wants differential
// scaling ("300% more health, 10% more attack") that the uniform
// BOSS_STAT_MULT/UNIQUE_STAT_MULT ladder can't express. Any stat not in
// `statMult` still falls back to the normal flat `mult`. `name` lets a
// caller pin a fixed name (e.g. "King Wolf") instead of the kind-based
// bossName()/rollUniqueName() generation.
export function buildMonster({ base, tier = 1, kind = 'regular', element = null, primaryStat = null, statMult = null, name: nameOverride = null }) {
  const designation = MONSTER_DESIGNATION[base];
  const baseStats = MONSTER_BASE_STATS[base];
  if (!baseStats) throw new Error(`Unknown base monster: ${base}`);

  const mult = kind === 'boss' ? BOSS_STAT_MULT
    : kind === 'unique' ? UNIQUE_STAT_MULT
    : TIER_STAT_MULT[Math.max(0, Math.min(3, tier - 1))];
  const multFor = (stat) => statMult?.[stat] ?? mult;

  const stats = {
    speed: Math.round(baseStats.speed * multFor('speed')),
    strength: Math.round(baseStats.strength * multFor('strength')),
    stamina: Math.round(baseStats.stamina * multFor('stamina')),
    endurance: Math.round(baseStats.endurance * multFor('endurance')),
  };
  if (primaryStat && stats[primaryStat] != null) {
    stats[primaryStat] = Math.round(stats[primaryStat] * 1.3); // matches PRIMARY_STAT_BOOST
  }

  const tierInfo = MONSTER_TIERS[Math.max(0, Math.min(3, tier - 1))];
  const level = kind === 'regular' ? tier : 5;

  let name = nameOverride;
  if (!name) {
    if (kind === 'boss') name = bossName(base);
    else if (kind === 'unique') name = rollUniqueName();
    else name = tierInfo.prefix ? `${tierInfo.prefix} ${base}` : base;
  }

  // NOTE: `level` here is just the pre-battle tier placeholder (1-4, or 5
  // for boss/unique) — MISSION_CONFIGS entries are built by calling
  // buildMonster() at module-load time, long before BattleScene computes
  // the real scaled/repeat-boosted level a spawned enemy actually gets
  // (see BattleScene.js's `lv`, capped by REPEAT_LEVEL_CAP). So the kit
  // built here is only a placeholder for reference display; BattleScene
  // rebuilds skills/passives with `lv` right after spawning enemies.
  const { skills, passives } = buildMonsterKit(base, { kind, level });
  const sprite = UNIQUE_SPRITE_INFO[name] ?? spriteInfoForBase(base);

  // Baseline SP so monsters can pay for their skills (2026-07-09) — flat
  // 4, matching the player-side unmodified default (gameState.js's
  // `sp: 4, maxSp: 4`). No monster-side talent/gear system exists to vary
  // this, so there's nothing to scale it by yet.
  const MONSTER_MAX_SP = 4;

  return {
    name, base, kind,
    tier: kind === 'regular' ? tier : null,
    designation,
    tint: kind === 'regular' ? tierInfo.tint : (kind === 'boss' ? 0xff3366 : 0x33ffcc),
    element,
    level,
    ...stats,
    abilities: skills,
    passives,
    sp: MONSTER_MAX_SP,
    maxSp: MONSTER_MAX_SP,
    skillCooldowns: {},
    skillUses: {},
    ...(sprite ?? { spriteKey: null, animKey: null, spriteScale: 1.0, moveSpeed: 2 }),
    // Move speed by designation (2026-08-01, "game is too easy"'s
    // follow-up) — overrides whatever SPRITE_INFO/UNIQUE_SPRITE_INFO had
    // (those per-species values, e.g. Golem's moveSpeed:1, predate this and
    // are now dead weight). Defensive (D: Bear/Golem) trades mobility for
    // its tankiness; every other designation (C melee, Rg ranged) gets the
    // higher value so they can actually close distance/keep range instead
    // of being outrun on a 10x10 board.
    moveSpeed: designation === 'D' ? 4 : 5,
  };
}
