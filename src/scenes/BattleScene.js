import Phaser from 'phaser';
import {
  state, effectiveStats, maxHp as gsMaxHp, elementIcon, currentRoleId, currentDesignations,
  currentSport, sportById, maxBattlePartySize, getBattleParty, TRIAL_CLASS,
  DESIGNATION_BEATS, designationIcon, DESIGNATION_CYCLE, ELEMENT_CYCLE, ELEMENT_BEATS,
} from '../data/gameState.js';
import { ATTACK, THROW, getEquippedSpecialAbilities, getEquippedSkillAbilities, getEquippedPassives } from '../data/abilities.js';
import { loadHeroSprites, createHeroAnims, stripHeroBackground, stripBackgroundByKey, trimmedSheetConfig, heroKey, getSpriteInfo, firstFrame, spriteKeyForRole, HERO_SPRITES } from '../data/heroSprites.js';
import { buildMonster, buildMonsterKit, spriteInfoForBase } from '../data/monsters.js';
import { isUsableItem, rollGearItem } from '../data/items.js';
import { BACKDROPS } from '../data/storyBackdrops.js';

const COLS = 10, ROWS = 10;
// Bigger isometric tiles (2026-07-07 feedback) — was 64×32 at .setScale(2)
// (native tile art is 32×32, so scale = TILE_W/32 keeps tiles seamless with
// no gaps/overlap). 80×40 is a 1.25× bump: checked the grid's screen-space
// footprint stays inside the 800×600 canvas at this size (worst-case corner
// lands at x=40/760, y=430 — comfortable margin on all sides) rather than
// picking a bigger multiplier that would start clipping at the board edges.
const TILE_W = 80, TILE_H = 40;
const TW2 = TILE_W / 2, TH2 = TILE_H / 2;
const TILE_SCALE = TILE_W / 32;
const TILE_Y_OFFSET = -5;
// Extra downward nudge for tile-shading diamonds only (on top of TILE_Y_OFFSET)
// so the highlight's widest point lines up with where unit sprites stand,
// tuned empirically against the hero/monster sprite foot anchors (scaled
// proportionally with the tile size above — re-tune if it looks off).
const HL_Y_ADJUST = 13;

const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// Projectile visual for ranged attacks (dist > 1), keyed by the attacker's
// sport `classGrouping` (already computed per-unit — see playerUnits setup)
// rather than per-sport, so every Target-class sport (Archer, Dart Player,
// Paintball) gets an arrow/dart and every ball-handling class gets a ball
// without having to enumerate all ~30 sports individually. Classes not
// listed (Athletics, Martial Arts, Performance) have no natural ranged
// equipment, so ranged attacks from them (e.g. the universal Throw move)
// just skip the projectile — a bare hand doesn't fly across the board.
const PROJECTILE_BY_CLASS = {
  Target:       'arrow',
  Ball:         'ball',
  'Bat & Ball': 'ball',
  Racquet:      'ball',
};

// Kingdom archetypes: monsters skew heavily toward their kingdom's two primary
// stats and two elements — rerolled fresh for every encounter. "Ice" reuses the
// existing Water element (no separate Ice element defined yet).
const REGION_ARCHETYPES = {
  Altroes: { primary: ['speed', 'strength'],    secondary: ['stamina', 'endurance'], elements: ['Lightning', 'Fire'] },
  Lametus: { primary: ['stamina', 'endurance'], secondary: ['speed', 'strength'],    elements: ['Wind', 'Earth'] },
  Gale:    { primary: ['endurance', 'strength'],secondary: ['speed', 'stamina'],     elements: ['Wind', 'Water'] },
};
const PRIMARY_STAT_BOOST = 1.3;
// Repeatable missions (M0a/M0b) escalate enemy level by 2 per replay
// (see the repeat-scaling block in create()) — capped so this can't climb
// forever (2026-07-09 feedback: "when king wolf hit lvl 40 lvl increase
// should stop").
const REPEAT_LEVEL_CAP = 40;
function rollRegionArchetype(region) {
  const cfg = REGION_ARCHETYPES[region] ?? REGION_ARCHETYPES.Altroes;
  const primaryStat = Math.random() < 0.9
    ? cfg.primary[Math.floor(Math.random() * cfg.primary.length)]
    : cfg.secondary[Math.floor(Math.random() * cfg.secondary.length)];
  const element = cfg.elements[Math.floor(Math.random() * cfg.elements.length)];
  return { primaryStat, element };
}

// Deterministic hash: same col/row always → same tile, but looks natural
const th = (col, row) => (((col * 374761393) ^ (row * 668265263)) >>> 0) % 100;

// Shared sandy-arena layout (same shape as AT1/AT2/GT/M4's inline versions)
// factored out for the Noble Deity's 7 Trials (2026-07-17) — 7 near-
// identical STAGE_CONFIGS entries would otherwise repeat this verbatim.
function trialLayout(col, row) {
  const p = th(col, row);
  const edge = col === 0 || row === 0 || col === 9 || row === 9;
  if (edge) return p < 50 ? '061' : '062';
  const ring = col === 1 || row === 1 || col === 8 || row === 8;
  if (ring) return p < 40 ? '057' : (p < 70 ? '055' : '056');
  const v = (col * 3 + row * 7) % 4;
  return ['000','001','002','003'][v];
}

// Stage configs: list of tile image numbers to preload + layout function
// Tile image key convention: 't022' → tiles/isometric tileset/separated images/tile_022.png
// In screen space: col+row=const is a HORIZONTAL line, col-row=const is VERTICAL
const STAGE_CONFIGS = {
  'M0a': {
    // Hidden Cave — ore mission (M0-M4 redesign, Phase 5). Same cave-stone
    // convention as M3a/the old M4, distinguished by a warmer, ore-vein tint.
    tiles: ['000','001','002','003','055','056','057','061','062'],
    label: 'HIDDEN CAVE',
    bgColor: 0x100a04,
    layout(col, row) {
      const p = th(col, row);
      const edge = col === 0 || row === 0 || col === 9 || row === 9;
      if (edge) return p < 50 ? '061' : '062';
      if (p < 18) return p < 9 ? '055' : '056';
      if (p < 28) return '057';
      const v = (col * 3 + row * 7) % 4;
      return ['000','001','002','003'][v];
    },
  },
  'M0b': {
    // Wolf's Den — dark, dense forest, more log/rock cover than Sirblanc
    // Outskirts and no open grass patches (M0-M4 redesign, Phase 4).
    tiles: ['022','026','027','034','047','049','061','062'],
    label: "WOLF'S DEN",
    bgColor: 0x060a04,
    layout(col, row) {
      const p = th(col, row);
      const edge = col === 0 || row === 0 || col === 9 || row === 9;
      if (edge) return p < 60 ? '061' : '062';
      if (p < 10 && col > 1 && col < 8) return p < 5 ? '047' : '049'; // den logs
      if (p < 18) return p < 9 ? '061' : '062'; // scattered den rocks
      if (p < 55) return '027'; // bushy grass dominates — dense cover
      if (p < 80) return '026';
      return '034';
    },
  },
  'M1': {
    // Forest clearing — grass floor, bushy edges, scattered flowers and logs
    // (was M1F's terrain; M1F is gone, folded straight into M1)
    tiles: ['022','026','027','033','034','037','041','047','049'],
    label: 'SIRBLANC OUTSKIRTS',
    bgColor: 0x0a1408,
    layout(col, row) {
      const p = th(col, row);
      const edge = col === 0 || row === 0 || col === 9 || row === 9;
      if (edge)        return p < 55 ? '033' : p < 80 ? '034' : '027';
      if (p < 4)       return '041';   // flower
      if (p < 7 && col > 1 && col < 8) return p < 5 ? '047' : '049'; // log
      if (p < 45)      return '022';   // light grass
      if (p < 70)      return '026';   // medium grass
      if (p < 85)      return '037';   // flat open grass
      return '027';                     // bushy grass
    },
  },
  'M2': {
    // Outskirts road — dirt road cuts horizontally across screen (col+row band)
    tiles: ['000','001','002','003','011','012','022','026','061','062'],
    label: 'THUNDER PLAINS',
    bgColor: 0x10100a,
    layout(col, row) {
      const p  = th(col, row);
      const band = col + row; // horizontal line in screen space
      // Central dirt road (band 7–11 out of 0–18 range → screen center)
      if (band >= 7 && band <= 11) {
        const v = (col * 3 + row * 5) % 4;
        return ['000','001','002','003'][v];
      }
      // Road shoulders
      if (band === 6 || band === 12) return p < 55 ? '011' : '012';
      // Rock accents near far edges
      if ((col <= 1 || col >= 8) && p < 22) return p < 11 ? '061' : '062';
      if ((row <= 1 || row >= 8) && p < 22) return p < 11 ? '062' : '061';
      // Grass off road
      return p < 65 ? '022' : '026';
    },
  },
  // M3 below is the OLD Greenfield-Plains layout, now otherwise unused (M3
  // is a hub — The Capital — not a battle). Kept as the template source for
  // M3b just below rather than duplicating the layout code.
  'M3': {
    // Greenfield Plains — open grass with a natural pond in the center-right
    tiles: ['022','026','027','033','034','037','041','088','089','090'],
    label: 'GREENFIELD PLAINS',
    bgColor: 0x081208,
    layout(col, row) {
      const p = th(col, row);
      // Diamond-shaped pond: Manhattan distance from center point (6,5)
      const dist = Math.abs(col - 6) + Math.abs(row - 5);
      if (dist <= 2) return p < 60 ? '088' : '089';     // deep water
      if (dist === 3) return p < 50 ? '089' : '090';    // shallow water/bank
      // Grassy edges around map perimeter
      const edge = col === 0 || row === 0 || col === 9 || row === 9;
      if (edge) return p < 50 ? '033' : '034';
      // Open field
      if (p < 5)  return '041';   // flowers
      if (p < 40) return '022';   // light grass
      if (p < 65) return '026';   // medium grass
      if (p < 80) return '037';   // flat grass
      return '027';               // bushy grass
    },
  },
  'M4': {
    // Arena Atlros — sandy fighting pit ringed by stone tiers (M0-M4
    // redesign, Phase 4; replaces the old dead "Hollow Caves" layout, which
    // M3a already copied for its own use, so nothing else depended on this
    // key's old content).
    tiles: ['000','001','002','003','055','056','057','061','062'],
    label: 'ARENA ATLROS',
    bgColor: 0x140e08,
    layout(col, row) {
      const p = th(col, row);
      const edge = col === 0 || row === 0 || col === 9 || row === 9;
      if (edge) return p < 50 ? '061' : '062'; // outer stone tier
      const ring = col === 1 || row === 1 || col === 8 || row === 8;
      if (ring) return p < 40 ? '057' : (p < 70 ? '055' : '056'); // inner stone ring
      // Sandy fighting pit floor
      const v = (col * 3 + row * 7) % 4;
      return ['000','001','002','003'][v];
    },
  },

  // ── Capital test battles (M0-M4 redesign, Phase 3) ────────────────────────
  'M3a': {
    // Northern Cave — 3 Goblins, ore-run flavor. Same layout as old M4
    // Hollow Caves under a new label.
    tiles: ['000','001','002','003','055','056','057','061','062'],
    label: 'NORTHERN CAVE',
    bgColor: 0x020406,
    layout(col, row) {
      const p = th(col, row);
      const edge = col === 0 || row === 0 || col === 9 || row === 9;
      if (edge) return p < 50 ? '061' : '062';
      if (p < 18) return p < 9 ? '055' : '056';
      if (p < 28) return '057';
      const v = (col * 3 + row * 7) % 4;
      return ['000','001','002','003'][v];
    },
  },
  'M3b': {
    // Hilbert Low Lands — 2 Lions. Same layout as old M3 Greenfield Plains
    // under a new label.
    tiles: ['022','026','027','033','034','037','041','088','089','090'],
    label: 'HILBERT LOW LANDS',
    bgColor: 0x081208,
    layout(col, row) {
      const p = th(col, row);
      const dist = Math.abs(col - 6) + Math.abs(row - 5);
      if (dist <= 2) return p < 60 ? '088' : '089';
      if (dist === 3) return p < 50 ? '089' : '090';
      const edge = col === 0 || row === 0 || col === 9 || row === 9;
      if (edge) return p < 50 ? '033' : '034';
      if (p < 5)  return '041';
      if (p < 40) return '022';
      if (p < 65) return '026';
      if (p < 80) return '037';
      return '027';
    },
  },

  // ── Hilbert Academy quest battles (2026-07-11) ────────────────────────────
  // Three new locations off Hilbert Academy (A2), distinct from M3a/M3b's
  // Capital-trial fights above (same-flavored area, different place — user
  // confirmed these should be their own nodes rather than reuse M3a/M3b).
  'A2a': {
    // Lion's Pride — Defeat the King quest (King Lion + 2 Lions). Same
    // greenfield layout family as M3b (thematically "more of Hilbert Low
    // Lands"), new label/tint so it doesn't read as a duplicate of M3b.
    tiles: ['022','026','027','033','034','037','041','088','089','090'],
    label: "LION'S PRIDE",
    bgColor: 0x0a1608,
    layout(col, row) {
      const p = th(col, row);
      const dist = Math.abs(col - 6) + Math.abs(row - 5);
      if (dist <= 2) return p < 60 ? '088' : '089';
      if (dist === 3) return p < 50 ? '089' : '090';
      const edge = col === 0 || row === 0 || col === 9 || row === 9;
      if (edge) return p < 50 ? '033' : '034';
      if (p < 5)  return '041';
      if (p < 40) return '022';
      if (p < 65) return '026';
      if (p < 80) return '037';
      return '027';
    },
  },
  'A2b': {
    // Goblin Warcamp — Goblin King quest (wave-spawning goblins). Same cave
    // layout family as M3a/M4, new label/tint.
    tiles: ['000','001','002','003','055','056','057','061','062'],
    label: 'GOBLIN WARCAMP',
    bgColor: 0x140a02,
    layout(col, row) {
      const p = th(col, row);
      const edge = col === 0 || row === 0 || col === 9 || row === 9;
      if (edge) return p < 50 ? '061' : '062';
      if (p < 18) return p < 9 ? '055' : '056';
      if (p < 28) return '057';
      const v = (col * 3 + row * 7) % 4;
      return ['000','001','002','003'][v];
    },
  },
  'A2c': {
    // Cave Depths — Clear the Northern Cave quest (3 random monsters,
    // waves every 3rd turn). Same cave layout family as M3a/A2b, distinct
    // label/tint so it reads as "deeper than" M3a's Northern Cave rather
    // than a duplicate of it.
    tiles: ['000','001','002','003','055','056','057','061','062'],
    label: 'CAVE DEPTHS',
    bgColor: 0x05040a,
    layout(col, row) {
      const p = th(col, row);
      const edge = col === 0 || row === 0 || col === 9 || row === 9;
      if (edge) return p < 50 ? '061' : '062';
      if (p < 18) return p < 9 ? '055' : '056';
      if (p < 28) return '057';
      const v = (col * 3 + row * 7) % 4;
      return ['000','001','002','003'][v];
    },
  },

  // ── Ester Academy quest battles (2026-07-11) ──────────────────────────────
  // Three new locations off Ester Academy (A1), mirroring Hilbert Academy's
  // A2a/A2b/A2c treatment above — own nodes, distinct tile-set tints.
  'A1a': {
    // Dragon's Roost — Defeat 1 dragon and two wyverns quest. Rugged/rocky
    // family (same tiles as M12 Earthscar Basin) reads better for a
    // dragon's lair than a grass/cave layout.
    tiles: ['004','010','015','020','033','034','061','062'],
    label: "DRAGON'S ROOST",
    bgColor: 0x1c1006,
    layout(col, row) {
      const p = th(col, row);
      const edge = col === 0 || row === 0 || col === 9 || row === 9;
      if (edge) return p < 45 ? '033' : '034';
      if (p < 12) return p < 6 ? '061' : '062';
      const v = (col * 5 + row * 3) % 4;
      return ['004','010','015','020'][v];
    },
  },
  'A1b': {
    // The Great Boulder — damage-race quest against a stationary Rock. Same
    // sandy-arena family as M4 Arena Atlros, fitting a training-drill feel.
    tiles: ['000','001','002','003','055','056','057','061','062'],
    label: 'THE GREAT BOULDER',
    bgColor: 0x140e08,
    layout(col, row) {
      const p = th(col, row);
      const edge = col === 0 || row === 0 || col === 9 || row === 9;
      if (edge) return p < 50 ? '061' : '062';
      const ring = col === 1 || row === 1 || col === 8 || row === 8;
      if (ring) return p < 40 ? '057' : (p < 70 ? '055' : '056');
      const v = (col * 3 + row * 7) % 4;
      return ['000','001','002','003'][v];
    },
  },

  // ── Region cave locations + signature elemental areas (July 2026) ────────
  // Each region gets 2 caves + 1 elemental "unique area" per REGION_ARCHETYPES
  // (Altroes=Lightning/Fire, Gale=Wind/Water(Ice), Lametus=Wind/Earth).
  // Altroes previously counted the old M4 "Hollow Caves" as its cave #1;
  // now that M4 is the Arena Atlros exam boss instead, Altroes has no
  // on-the-books cave until M0a "Hidden Cave" (the M0-M4 redesign's new ore
  // mission off the Hidden Village) is wired up as its replacement cave #1
  // — see Phase 5 of the redesign plan. M5 "Ember Hollow" (Altroes cave #2)
  // and M6-M11 (Altroes's own unique area, both Gale caves + unique area,
  // both Lametus caves) were removed entirely 2026-07-11 ("going to
  // rewrite"). M12 (Lametus's unique area) and its M15 side battle briefly
  // replaced them, then were removed the same day too ("remove m12") —
  // nothing is left of this section; the main chain ends at M5 (Gale) now.
  // (M6 reappears further down as a brand-new mission, 2026-07-17 — reuses
  // the freed-up id, unrelated to the M6 described in this paragraph.)

  // ── Altroes Trials + the next school's tournament (2026-07-11) ───────────
  // Same sandy-arena family as M4 Arena Atlros — fitting for hero-vs-hero
  // competitive fights, distinct label/tint per stop.
  'AT1': {
    tiles: ['000','001','002','003','055','056','057','061','062'],
    label: 'ALTROES TRIALS I',
    bgColor: 0x140e08,
    layout(col, row) {
      const p = th(col, row);
      const edge = col === 0 || row === 0 || col === 9 || row === 9;
      if (edge) return p < 50 ? '061' : '062';
      const ring = col === 1 || row === 1 || col === 8 || row === 8;
      if (ring) return p < 40 ? '057' : (p < 70 ? '055' : '056');
      const v = (col * 3 + row * 7) % 4;
      return ['000','001','002','003'][v];
    },
  },
  'AT2': {
    tiles: ['000','001','002','003','055','056','057','061','062'],
    label: 'ALTROES TRIALS II',
    bgColor: 0x1c1206,
    layout(col, row) {
      const p = th(col, row);
      const edge = col === 0 || row === 0 || col === 9 || row === 9;
      if (edge) return p < 50 ? '061' : '062';
      const ring = col === 1 || row === 1 || col === 8 || row === 8;
      if (ring) return p < 40 ? '057' : (p < 70 ? '055' : '056');
      const v = (col * 3 + row * 7) % 4;
      return ['000','001','002','003'][v];
    },
  },
  // Alpha King Dragon (2026-07-11) — boss node NE of Artfall. No dedicated
  // snow/ice tileset exists anywhere in this project (confirmed when M5/
  // M5b were built the same day) — reuses the same rugged/rocky family as
  // M12/A1a's old "Dragon's Roost" layout, close enough for a mountain lair.
  'DK': {
    tiles: ['004','010','015','020','033','034','061','062'],
    label: 'THE FROZEN PEAKS',
    bgColor: 0x0c1420,
    layout(col, row) {
      const p = th(col, row);
      const edge = col === 0 || row === 0 || col === 9 || row === 9;
      if (edge) return p < 45 ? '033' : '034';
      if (p < 12) return p < 6 ? '061' : '062';
      const v = (col * 5 + row * 3) % 4;
      return ['004','010','015','020'][v];
    },
  },
  // Monster Hunt (2026-07-11) — Gale quest, NE of Zester. Same rocky/icy
  // family as DK for map consistency in this corner.
  'MH': {
    tiles: ['004','010','015','020','033','034','061','062'],
    label: 'MONSTER HUNT',
    bgColor: 0x0c1420,
    layout(col, row) {
      const p = th(col, row);
      const edge = col === 0 || row === 0 || col === 9 || row === 9;
      if (edge) return p < 45 ? '033' : '034';
      if (p < 12) return p < 6 ? '061' : '062';
      const v = (col * 5 + row * 3) % 4;
      return ['004','010','015','020'][v];
    },
  },
  // Gale Tournament (2026-07-12) — capstone quest-gated battle NW of
  // Artfall. Same sandy-arena family as AT1/AT2/M4, matching the "real
  // tournament" flavor rather than DK/MH's rocky-peaks family.
  'GT': {
    tiles: ['000','001','002','003','055','056','057','061','062'],
    label: 'GALE TOURNAMENT',
    bgColor: 0x1c1608,
    layout(col, row) {
      const p = th(col, row);
      const edge = col === 0 || row === 0 || col === 9 || row === 9;
      if (edge) return p < 50 ? '061' : '062';
      const ring = col === 1 || row === 1 || col === 8 || row === 8;
      if (ring) return p < 40 ? '057' : (p < 70 ? '055' : '056');
      const v = (col * 3 + row * 7) % 4;
      return ['000','001','002','003'][v];
    },
  },
  // M6 — Blightreach, The Corrupted One's monsters (2026-07-17). Same
  // rugged/rocky tile family as DK/MH (right next door, south-east of
  // Zester) but a sickly dark-purple bgColor instead of their icy-blue tint
  // — reads as the same terrain gone wrong, matching the enemies' aura.
  'M6': {
    tiles: ['004','010','015','020','033','034','061','062'],
    label: 'BLIGHTREACH',
    bgColor: 0x140a1c,
    layout(col, row) {
      const p = th(col, row);
      const edge = col === 0 || row === 0 || col === 9 || row === 9;
      if (edge) return p < 45 ? '033' : '034';
      if (p < 12) return p < 6 ? '061' : '062';
      const v = (col * 5 + row * 3) % 4;
      return ['004','010','015','020'][v];
    },
  },
  // M7 — The Grand Arena, south of Blightreach (2026-07-17). Same
  // sandy-arena family as AT1/AT2/GT/M4 (a real tournament venue, even
  // though the tournament itself never happens) — dark-purple bgColor tint
  // like M6, since it's still the Corrupted One's fight.
  'M7': {
    tiles: ['000','001','002','003','055','056','057','061','062'],
    label: 'THE GRAND ARENA',
    bgColor: 0x1c0a1c,
    layout(col, row) {
      const p = th(col, row);
      const edge = col === 0 || row === 0 || col === 9 || row === 9;
      if (edge) return p < 50 ? '061' : '062';
      const ring = col === 1 || row === 1 || col === 8 || row === 8;
      if (ring) return p < 40 ? '057' : (p < 70 ? '055' : '056');
      const v = (col * 3 + row * 7) % 4;
      return ['000','001','002','003'][v];
    },
  },
  // The Noble Deity's 7 Trials (2026-07-17) — all share one "training
  // grounds" tile family (same sandy-arena tiles as M7/GT, matching
  // lametusTrainingField's backdrop), distinguished only by a per-trial
  // bgColor tint so each still reads as its own place on replay.
  'T1': { tiles: ['000','001','002','003','055','056','057','061','062'], label: 'TRIAL OF ATHLETICS',    bgColor: 0x141c0a, layout: trialLayout },
  'T2': { tiles: ['000','001','002','003','055','056','057','061','062'], label: 'TRIAL OF MARTIAL ARTS', bgColor: 0x1c0a0a, layout: trialLayout },
  'T3': { tiles: ['000','001','002','003','055','056','057','061','062'], label: 'TRIAL OF PERFORMANCE',  bgColor: 0x1c0a14, layout: trialLayout },
  'T4': { tiles: ['000','001','002','003','055','056','057','061','062'], label: 'TRIAL OF TARGET',       bgColor: 0x0a1414, layout: trialLayout },
  'T5': { tiles: ['000','001','002','003','055','056','057','061','062'], label: 'TRIAL OF BALL',         bgColor: 0x0a141c, layout: trialLayout },
  'T6': { tiles: ['000','001','002','003','055','056','057','061','062'], label: 'TRIAL OF BAT & BALL',   bgColor: 0x14140a, layout: trialLayout },
  'T7': { tiles: ['000','001','002','003','055','056','057','061','062'], label: 'TRIAL OF RACQUET',      bgColor: 0x1c1c0a, layout: trialLayout },
};

// Per-mission configuration: player start positions + enemy definitions.
// M1/M2 below are the wolf-battle/Thunder Plains tutorial missions from the
// M0-M4 redesign (July 2026) — M1 reuses the old M1F "3 Wolves" roster
// (M1F itself is gone, folded straight into M1), M2 is unchanged (already
// matched the new "Thunder Plains, 2 Boars" spec exactly). M3 is now a hub
// (The Capital), not a battle, so the old M3 roster is gone entirely; M4
// (Arena Atlros exam boss) has its own fresh content below.
// Cave Depths' "3 random type of monster" (2026-07-11) — restricted to the
// 5 base species with real sprite art (monsterSpriteInfos() only preloads
// these by default; the other 5 base monsters have no sprite loaded in
// this scene, see monsters.js's own "data first" scope note).
const RANDOM_MONSTER_POOL = ['Wolf', 'Boar', 'Deer', 'Goblin', 'Lion'];
function pickRandomSpecies(n) {
  return Array.from({ length: n }, () => RANDOM_MONSTER_POOL[Math.floor(Math.random() * RANDOM_MONSTER_POOL.length)]);
}

// ── Altroes Trials + the next school's tournament (2026-07-11) ─────────────
// "Fight other units, 4 random classes" — samples n DISTINCT class names
// from the full HERO_SPRITES roster (all 47 have real wired art, unlike
// monsters' "data first" 5-of-10 situation, so no restriction needed).
// Sampled without replacement so a single fight never repeats a class.
const TOURNAMENT_HERO_CLASSES = Object.keys(HERO_SPRITES);
function pickRandomHeroClasses(n) {
  const pool = [...TOURNAMENT_HERO_CLASSES];
  const picks = [];
  for (let i = 0; i < n && pool.length; i++) {
    picks.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  }
  return picks;
}

// Real Epic-rarity gear across all 5 slots (2026-07-11, "all units will
// have epic gears") — reuses rollGearItem(), the same roller player loot
// uses, with no talents/class-grouping resolution (tournament enemies
// aren't full player-shaped units) — flat DEFAULT_GEAR_LAYOUT treatment for
// all of them regardless of class. Consumed by buildEnemyUnit via
// effectiveStats(), same generic stat/bonusHp/bonusSp aggregation player
// gear already goes through.
function rollEpicEquip() {
  const equip = {};
  for (const slot of ['weapon', 'headwear', 'footwear', 'chest', 'handwear']) {
    equip[slot] = rollGearItem({ slot, rarity: 'epic', talents: [] });
  }
  return equip;
}

// Builds one raw tournament enemy def (M4 Instructor's shape: heroClass +
// explicit stat block, not buildMonster) — `epic` attaches rollEpicEquip().
// AT1 uses it (real tournament team, 2026-07-11 third follow-up); AT2
// fights the same random classes without it.
function tournamentEnemyDef(col, row, className, level, stats, epic = false) {
  return {
    col, row, name: className, heroClass: className,
    spriteKey: heroKey(className), animKey: `${heroKey(className)}-idle`,
    spriteScale: 0.38, moveSpeed: 3, level,
    ...stats,
    ...(epic ? { equip: rollEpicEquip() } : {}),
  };
}

const MISSION_CONFIGS = {
  // Hidden Cave — M0a, the ore mission (unlocked alongside M3, see
  // SIDE_MISSION_UNLOCK in VictoryScene.js). Repeatable with escalating
  // Goblins — see the state.repeatCounts.M0a handling in create() below,
  // which is why these two are left as plain (unbuilt) objects rather than
  // buildMonster() calls: the repeat scaling is applied uniformly to
  // whatever's here at battle-creation time, same trick as the base
  // diff-multiplier scaling already does for every mission.
  'M0a': {
    region: 'Altroes',
    playerPos: { reno:[1,3], drace:[1,4], sela:[1,2], kael:[1,5], trice:[1,1] },
    enemies: [
      { col:7, row:2, ...buildMonster({ base: 'Goblin', tier: 1 }) },
      { col:8, row:6, ...buildMonster({ base: 'Goblin', tier: 1 }) },
    ],
  },
  // Wolf's Den — M0b, King Wolf (unlocked once any party unit hits level 8,
  // see WorldMapScene.js). Unique-tier Wolf, no differential stat override
  // (the spec only calls out an explicit multiplier for M4's instructor) —
  // just the standard UNIQUE_STAT_MULT ladder with a fixed name so it
  // doesn't roll a random "Ashen Fang"-style unique name. Now has its own
  // dedicated (bigger-scaled) sprite — see UNIQUE_SPRITE_INFO['King Wolf']
  // in monsters.js — and 2 regular-tier escort wolves flanking it
  // (2026-07-08 feedback), same tier-1 buildMonster() pattern M0a's Goblins use.
  'M0b': {
    region: 'Altroes',
    playerPos: { reno:[1,3], drace:[1,4], sela:[1,2], kael:[1,5], trice:[1,1] },
    enemies: [
      // size:2 — King Wolf occupies a 2x2 block anchored here: (5,5),(6,5),
      // (5,6),(6,6) (see occupiedTiles/registerUnit in BattleScene.js). The
      // 2 escort wolves must sit clear of all 4 of those tiles.
      { col:5, row:5, size:2, ...buildMonster({ base: 'Wolf', kind: 'unique', name: 'King Wolf' }) },
      { col:6, row:3, ...buildMonster({ base: 'Wolf', tier: 1 }) },
      { col:8, row:6, ...buildMonster({ base: 'Wolf', tier: 1 }) },
    ],
  },
  'M1': {
    region: 'Altroes',
    playerPos: { reno:[1,2], drace:[1,3], sela:[1,4], kael:[1,5], trice:[1,6] },
    enemies: [
      { col:8, row:2, name:'Wolf', spriteKey:'wolf-idle', animKey:'wolf-idle', spriteScale:0.35, moveSpeed:2, speed:5, strength:8,  stamina:6, endurance:5, level:1 },
      { col:8, row:5, name:'Wolf', spriteKey:'wolf-idle', animKey:'wolf-idle', spriteScale:0.35, moveSpeed:2, speed:5, strength:8,  stamina:6, endurance:5, level:1 },
      { col:8, row:8, name:'Wolf', spriteKey:'wolf-idle', animKey:'wolf-idle', spriteScale:0.35, moveSpeed:2, speed:5, strength:8,  stamina:6, endurance:5, level:1 },
    ],
  },
  'M2': {
    region: 'Altroes',
    playerPos: { reno:[1,3], drace:[1,4], sela:[1,2], kael:[1,5], trice:[1,1] },
    enemies: [
      { col:7, row:2, name:'Boar', spriteKey:'boar-idle', animKey:'boar-idle', spriteScale:0.35, moveSpeed:2, speed:4, strength:12, stamina:8, endurance:9, level:2 },
      { col:8, row:7, name:'Boar', spriteKey:'boar-idle', animKey:'boar-idle', spriteScale:0.35, moveSpeed:2, speed:4, strength:12, stamina:8, endurance:9, level:2 },
    ],
  },

  // ── Capital test battles (M0-M4 redesign, Phase 3) ────────────────────────
  'M3a': {
    // Northern Cave — test 1: 3 Goblins, via buildMonster (same pipeline as
    // the Deer spawn — Goblin/Lion now have sprite art wired, see monsters.js).
    region: 'Altroes',
    playerPos: { reno:[1,3], drace:[1,4], sela:[1,2], kael:[1,5], trice:[1,1] },
    enemies: [
      { col:7, row:2, ...buildMonster({ base: 'Goblin', tier: 1 }) },
      { col:8, row:5, ...buildMonster({ base: 'Goblin', tier: 1 }) },
      { col:7, row:8, ...buildMonster({ base: 'Goblin', tier: 1 }) },
    ],
  },
  'M3b': {
    // Hilbert Low Lands — test 2: 2 Lions, tier 2 (slightly stronger than
    // the first test, matching the escalating-trial pacing).
    region: 'Altroes',
    playerPos: { reno:[1,3], drace:[1,4], sela:[1,2], kael:[1,5], trice:[1,1] },
    enemies: [
      { col:7, row:3, ...buildMonster({ base: 'Lion', tier: 2 }) },
      { col:8, row:6, ...buildMonster({ base: 'Lion', tier: 2 }) },
    ],
  },

  // ── Hilbert Academy quests (2026-07-11) ───────────────────────────────────
  // "Hilbert Academy will have 3 quests" — own nodes (A2a/A2b/A2c), separate
  // from the Capital-trial M3a/M3b fights above (user: "lets just add it
  // own nodes i was trying to reuse nodes extentions on M3b and M3a").
  // Wired to the map/quest-accept flow in WorldMapScene.js/gameState.js.
  'A2a': {
    // Defeat the King — King Lion + 2 regular Lions (tier 2, matching
    // M3b's own Lion tier — a reasonable "same difficulty class" default,
    // not specified by the sheet). Standard win condition (all dead).
    region: 'Altroes',
    playerPos: { reno:[1,3], drace:[1,4], sela:[1,2], kael:[1,5], trice:[1,1] },
    enemies: [
      { col:6, row:4, ...buildMonster({ base: 'Lion', kind: 'unique', name: 'King Lion' }) },
      { col:8, row:2, ...buildMonster({ base: 'Lion', tier: 2 }) },
      { col:8, row:7, ...buildMonster({ base: 'Lion', tier: 2 }) },
    ],
  },
  'A2b': {
    // Goblin King — 2 Goblins start on the board (the wave cadence's own
    // "turn one" per the user's spec is read as already-present at battle
    // start, not a special-cased extra spawn — see startPlayerTurn's
    // reinforce hook, which only fires turn 4+). `reinforce.pool()` spawns
    // 2 more Goblins every 3rd turn after that (turns 4, 7, 10...).
    // winCondition is boss-only: the regular Goblins (starting AND
    // wave-spawned) never need to be cleared, only the King.
    region: 'Altroes',
    playerPos: { reno:[1,3], drace:[1,4], sela:[1,2], kael:[1,5], trice:[1,1] },
    enemies: [
      { col:7, row:4, ...buildMonster({ base: 'Goblin', kind: 'unique', name: 'Goblin King' }) },
      { col:8, row:2, ...buildMonster({ base: 'Goblin', tier: 1 }) },
      { col:8, row:7, ...buildMonster({ base: 'Goblin', tier: 1 }) },
    ],
    reinforce: { every: 3, tier: 1, pool: () => ['Goblin', 'Goblin'] },
    winCondition: { type: 'bossName', name: 'Goblin King' },
  },
  'A2c': {
    // Cave Depths — 3 random-type monsters, redrawn fresh every time the
    // mission is entered (`enemies` as a function — see create()'s
    // typeof-check). Every 3rd turn, 3 more of random type spawn. No
    // winCondition override — "monster count needs to equal zero to win"
    // is the standard all-dead check, called out explicitly by the user
    // just to confirm it still holds despite the waves, not because it
    // needs different logic. Species pool is the 5 base monsters with
    // real sprite art (see RANDOM_MONSTER_POOL) — Bear/Golem/Dragon/
    // Wyvern/Hawk have no sprite loaded by default in this scene
    // (monsterSpriteInfos only preloads Wolf/Boar/Deer/Goblin/Lion).
    region: 'Altroes',
    playerPos: { reno:[1,3], drace:[1,4], sela:[1,2], kael:[1,5], trice:[1,1] },
    enemies: () => {
      const [s1, s2, s3] = pickRandomSpecies(3);
      return [
        { col:7, row:2, ...buildMonster({ base: s1, tier: 2 }) },
        { col:8, row:5, ...buildMonster({ base: s2, tier: 2 }) },
        { col:7, row:8, ...buildMonster({ base: s3, tier: 2 }) },
      ];
    },
    reinforce: { every: 3, tier: 2, pool: () => pickRandomSpecies(3) },
  },

  // ── Ester Academy quests (2026-07-11) ─────────────────────────────────────
  // "3 quest at ester" — own nodes (A1a/A1b), separate from A1's existing
  // kill_king_wolf (dropped from A1's quest list, same treatment kill_king_
  // wolf got when Hilbert's own 3 quests replaced it there).
  'A1a': {
    // Defeat 1 dragon and two wyverns — Dragon at boss tier (Alpha Ace
    // Dragon, matching the existing Alpha Ace convention rather than
    // inventing a fixed name), 2 regular-tier Wyverns as escorts — same
    // "1 elevated + N regular" shape as A2a's King Lion. Standard win
    // condition (all three dead).
    region: 'Altroes',
    playerPos: { reno:[1,3], drace:[1,4], sela:[1,2], kael:[1,5], trice:[1,1] },
    enemies: [
      { col:6, row:4, ...buildMonster({ base: 'Dragon', kind: 'boss' }) },
      { col:8, row:2, ...buildMonster({ base: 'Wyvern', tier: 2 }) },
      { col:8, row:7, ...buildMonster({ base: 'Wyvern', tier: 2 }) },
    ],
  },
  'A1b': {
    // "Do as much damage to the rock as possible, must deal 15,000 damage
    // within 10 turns" — fixedMaxHp:15000 makes "kill it" and "deal 15,000
    // damage" the same win condition (enemy HP never regenerates, nothing
    // heals monsters), so the standard all-dead check already covers it —
    // no new winCondition type needed. turnLimit:10 (checked in
    // startPlayerTurn) fails the mission if the Rock is still alive after
    // turn 10. alwaysWeak:true — "weak to everything" (see designation/
    // elementMultiplier). noAttack:true + moveSpeed:0 — a stationary
    // punching bag, never acts. size:2 — 4-tile footprint, same mechanism
    // as King Wolf. Raw enemy def (no `base`/buildMonster — there's no
    // "Rock" species in MONSTER_BASE_STATS) with a procedurally-generated
    // placeholder texture (see spawnEnemyVisual's ensureRockTexture).
    region: 'Altroes',
    playerPos: { reno:[1,3], drace:[1,4], sela:[1,2], kael:[1,5], trice:[1,1] },
    turnLimit: 10,
    enemies: [
      {
        col: 5, row: 5, size: 2, name: 'Rock',
        spriteKey: 'rock-proc', animKey: null, spriteScale: 0.95, moveSpeed: 0,
        speed: 0, strength: 0, stamina: 1, endurance: 1, level: 12,
        fixedMaxHp: 15000, alwaysWeak: true, noAttack: true,
      },
    ],
  },

  // Arena Atlros — M4, the exam boss (non-repeatable, gated by
  // WorldMapScene's onMissionClick). Not a Monster — a hero-sprite enemy
  // (Hockey Player Ace Forward class), the first of its kind: preload()/
  // create() load+animate `enemyHeroClasses` the same way they already do
  // for the player party's hero sprites (see the `for (const heroClass of
  // missionCfg.enemyHeroClasses ...)` loops below). "300% more health, 10%
  // more attack" read as: base endurance/stamina ×4 (300% *more* health,
  // i.e. 4× the original), strength ×1.1, speed left alone — baseline
  // pre-boost numbers (speed 12, strength 14, stamina 11, endurance 10) are
  // an invented "normal T3 athlete" reference point, not from any existing
  // stat table.
  'M4': {
    region: 'Altroes',
    playerPos: { reno:[1,3], drace:[1,4], sela:[1,2], kael:[1,5], trice:[1,1] },
    enemyHeroClasses: ['Hockey Player'],
    enemies: [
      { col:5, row:5, name:'Instructor', heroClass:'Hockey Player',
        spriteKey: heroKey('Hockey Player'), animKey: `${heroKey('Hockey Player')}-idle`,
        spriteScale: 0.38, moveSpeed:3, level:10,
        speed:12, strength:15, stamina:44, endurance:40 },
    ],
  },

  // ── Region cave/unique-area missions (July 2026) ──────────────────────────
  // M6-M11 removed 2026-07-11 ("going to rewrite"); M12 (this section's last
  // survivor) removed the same day too ("remove m12") — nothing left here.

  // ── Altroes Trials + the next school's tournament (2026-07-11) ───────────
  // "After all 6 questions are done player can take the Altroes trials...
  // go to the next school to take part in their tournament, which is M5...
  // fight other units, 4 random classes, in two battles." Each fight rolls
  // 4 DISTINCT random hero classes fresh every attempt (pickRandomHeroClasses)
  // — same "randomized roster" shape as Cave Depths' random monsters.
  // `enemyHeroClasses` preloads the FULL 47-class roster (not just this
  // battle's 4 picks) so preload() and create() never disagree on which
  // classes actually got sprite-loaded, regardless of what create()'s own
  // independent pickRandomHeroClasses() call happens to roll.
  // AT1 (2026-07-11 third follow-up, "the m5a should be one of the At1
  // battles where the units are players with epic gear... remove m5a") —
  // absorbs the old M5a's content wholesale (epic gear, level 13, that
  // stat baseline) instead of AT1's own original weaker/ungeared stats.
  // AT1/AT2 ARE the tournament battles now, cleared before Gale (M5)
  // becomes reachable — no separate "trial, then tournament" tiering.
  // region stays 'Altroes' (unchanged location/flavor, only the enemy
  // quality changed).
  'AT1': {
    region: 'Altroes',
    playerPos: { reno:[1,3], drace:[1,4], sela:[1,2], kael:[1,5], trice:[1,1], zora:[1,0] },
    enemyHeroClasses: TOURNAMENT_HERO_CLASSES,
    enemies: () => {
      const classes = pickRandomHeroClasses(4);
      const pos = [[7,2],[8,4],[7,6],[8,8]];
      const stats = { speed:13, strength:21, stamina:15, endurance:14 };
      return classes.map((c, i) => tournamentEnemyDef(pos[i][0], pos[i][1], c, 13, stats, true));
    },
  },
  'AT2': {
    region: 'Altroes',
    playerPos: { reno:[1,3], drace:[1,4], sela:[1,2], kael:[1,5], trice:[1,1], zora:[1,0] },
    enemyHeroClasses: TOURNAMENT_HERO_CLASSES,
    enemies: () => {
      const classes = pickRandomHeroClasses(4);
      const pos = [[7,2],[8,4],[7,6],[8,8]];
      const stats = { speed:15, strength:26, stamina:18, endurance:16 };
      return classes.map((c, i) => tournamentEnemyDef(pos[i][0], pos[i][1], c, 12, stats));
    },
  },
  // M5b removed (2026-07-11 fourth follow-up, "need to remove m5b") — Gale
  // (M5, see WorldMapScene.js's HUB_CONFIGS) has no battle attached to it
  // at all now; M5a was folded into AT1 earlier the same day.

  // Alpha King Dragon (2026-07-11) — boss node NE of Artfall Academy.
  // "3 times hp and 3 times attack" is exactly what kind:'boss' already
  // gives via BOSS_STAT_MULT=3.0 in monsters.js — applied uniformly to
  // speed/strength/stamina/endurance, so both the HP formula
  // ((endurance+stamina)*(2+level)) and the attack formula
  // (strength + 0.5*speed) come out ~3x a same-level regular Dragon's,
  // with no new multiplier mechanic needed. `name` override reuses the
  // same fixed-name pattern as King Wolf/King Lion/Goblin King (skips the
  // random bossName()/rollUniqueName() generation). `level:16` overrides
  // buildMonster()'s boss/unique placeholder (always 5) — this is meant
  // to read as end-of-content-so-far, above AT1/AT2's 12-13.
  'DK': {
    region: 'Gale',
    playerPos: { reno:[1,3], drace:[1,4], sela:[1,2], kael:[1,5], trice:[1,1], zora:[1,0] },
    enemies: [
      { col:5, row:5, ...buildMonster({ base: 'Dragon', kind: 'boss', name: 'Alpha King Dragon' }), level: 16 },
    ],
  },

  // Monster Hunt (2026-07-11, "kill as many monster as you can in 6 turn,
  // 5 monster spawn each to a max of 10") — repeatable score-attack quest,
  // NE of Zester. turnLimit:6 + turnLimitVictory:true (see startPlayerTurn)
  // means turn 7 ends the battle in VICTORY regardless of how many enemies
  // are left standing — kills/XP already banked stand as the "score",
  // there's no fail state. reinforce.maxTotal:10 caps the SECOND wave of 5
  // (spawning turn 4, same as Goblin King's every:3 cadence) so nothing
  // spawns a 3rd time even though 3 turns remain after it — 5 initial +
  // 5 reinforced = the stated cap exactly. Standard all-dead check still
  // applies if the player manages to clear all 10 before turn 6 (early/
  // full-credit finish, no override needed). No missionId — same
  // no-accept-gate shape as DK above and kill_king_wolf, "quest" here just
  // means "tracked in Gale's list", not "needs an accept step first".
  'MH': {
    region: 'Gale',
    playerPos: { reno:[1,3], drace:[1,4], sela:[1,2], kael:[1,5], trice:[1,1], zora:[1,0] },
    turnLimit: 6,
    turnLimitVictory: true,
    enemies: () => {
      const species = pickRandomSpecies(5);
      const pos = [[6,1],[8,2],[6,4],[8,6],[6,8]];
      return species.map((s, i) => ({ col: pos[i][0], row: pos[i][1], ...buildMonster({ base: s, tier: 3 }) }));
    },
    reinforce: { every: 3, tier: 3, pool: () => pickRandomSpecies(5), maxTotal: 10 },
  },

  // Gale Tournament (2026-07-12, "after clearing the 3 quest[s] the
  // tournament opens... facing other units with epic gears") — capstone
  // battle NW of Artfall, unlocked once all 3 of Gale's quests
  // (gale_monster_hunt/kill_alpha_king_dragon/gale_legendary_gear) are
  // done. Same real-epic-gear tournament-team treatment as AT1, just a
  // level higher (17, above DK's 16) and slightly bumped stats to read as
  // the actual endgame-so-far fight.
  'GT': {
    region: 'Gale',
    playerPos: { reno:[1,3], drace:[1,4], sela:[1,2], kael:[1,5], trice:[1,1], zora:[1,0] },
    enemyHeroClasses: TOURNAMENT_HERO_CLASSES,
    enemies: () => {
      const classes = pickRandomHeroClasses(4);
      const pos = [[7,2],[8,4],[7,6],[8,8]];
      const stats = { speed:15, strength:24, stamina:17, endurance:16 };
      return classes.map((c, i) => tournamentEnemyDef(pos[i][0], pos[i][1], c, 17, stats, true));
    },
  },

  // M6 — The Corrupted One's monsters (2026-07-17), south-east of Gale.
  // Required main-chain step now that GT is cleared (see the live check in
  // WorldMapScene's create()) — reframed the same day as "Lametus's trial"
  // (see CUTSCENE_AFTER.GT in VictoryScene.js and NEW_AREA_INTRO.M6 in
  // WorldMapScene.js), so region is 'Lametus' (its own REGION_ARCHETYPES
  // entry already existed, just never had a mission using it) rather than
  // 'Gale'. Every enemy carries `corrupted:true`: it's what flags them for
  // the shared-target focus-fire AI (getCorruptedTarget()) and the pulsing
  // purple aura (spawnEnemyVisual) — both read as "something is
  // controlling/empowering them" without inventing a whole new stat system.
  // "Very strong" is just the existing kind:'boss'/tier:3 ladder stacked
  // with that coordinated targeting, rather than a new multiplier — a
  // boss-tier lieutenant plus 3 tier-3 regulars, one level above MH's
  // tier-3 mobs (level:16, matching DK). `enemyFirst` (2026-07-17, "the
  // monsters attack so in the M6 battle the enemy will go first") — the
  // party gets ambushed mid-conversation (see NEW_AREA_INTRO.M6's last
  // line), so the corrupted monsters open with the first move instead of
  // the player (see the enemyFirst branch at the end of create()).
  'M6': {
    region: 'Lametus',
    enemyFirst: true,
    playerPos: { reno:[1,3], drace:[1,4], sela:[1,2], kael:[1,5], trice:[1,1], zora:[1,0] },
    enemies: [
      { col:5, row:5, ...buildMonster({ base: 'Dragon', kind: 'boss', name: 'Ashveil, the Corrupted' }), level: 16, corrupted: true },
      { col:7, row:2, ...buildMonster({ base: 'Wyvern', tier: 3 }), corrupted: true },
      { col:7, row:8, ...buildMonster({ base: 'Wyvern', tier: 3 }), corrupted: true },
      { col:8, row:5, ...buildMonster({ base: 'Lion', tier: 3 }), corrupted: true },
    ],
  },

  // M7 — the villain's reveal, south of M6 (2026-07-17, "the corrupt one
  // will attack with armor of monster who are 10000X stronger... the hero
  // should lose them fight no matter what"). "10000x" is read as flavor
  // for "unwinnable," NOT a literal stat multiplier to compute (that would
  // just produce absurd on-screen damage numbers for a fight whose outcome
  // is scripted either way) — `oneShotKill` makes any hit that connects
  // lethal regardless of real combat math, and `fixedMaxHp` (the same
  // primitive Ester Academy's "Rock" quest uses) makes the enemies read as
  // unkillable in the time the player gets. `corrupted:true` is kept too
  // (still the same coordinated focus-fire + aura, still his monsters) —
  // this fight is NOT enemyFirst like M6 was; the party sees this one
  // coming (see NEW_AREA_INTRO.M7), so they still get to act, they just
  // can't win. `scriptedDefeat:true` routes the inevitable wipe through
  // triggerScriptedDefeat() instead of the normal DEFEAT path — see
  // checkEndConditions().
  'M7': {
    region: 'Lametus',
    scriptedDefeat: true,
    playerPos: { reno:[1,3], drace:[1,4], sela:[1,2], kael:[1,5], trice:[1,1], zora:[1,0] },
    enemies: [
      { col:5, row:4, ...buildMonster({ base: 'Dragon', kind: 'boss', name: "The Corrupted One's Champion" }), level: 20, corrupted: true, oneShotKill: true, fixedMaxHp: 999999 },
      { col:5, row:6, ...buildMonster({ base: 'Wyvern', kind: 'boss', name: "The Corrupted One's Herald" }), level: 20, corrupted: true, oneShotKill: true, fixedMaxHp: 999999 },
      { col:8, row:4, ...buildMonster({ base: 'Dragon', kind: 'boss' }), level: 20, corrupted: true, oneShotKill: true, fixedMaxHp: 999999 },
      { col:8, row:6, ...buildMonster({ base: 'Wyvern', kind: 'boss' }), level: 20, corrupted: true, oneShotKill: true, fixedMaxHp: 999999 },
    ],
  },

  // The Noble Deity's 7 Trials (2026-07-17) — one single strong rival duel
  // per classGrouping (TRIAL_CLASS in gameState.js), same
  // tournamentEnemyDef() shape AT1/AT2/GT already use for a "real
  // hero-shaped opponent," just ONE fixed-class opponent instead of 4
  // random ones — reads as "a trial," not "a tournament." Level 19/stats
  // sit a notch above GT's 17 (the hardest content that existed before
  // this arc) since these are meant to be the last real gear-check before
  // whatever the Corrupted One rematch turns out to be. No epic gear on
  // these — the point of the trial is the fight itself, the reward is the
  // God Tier weapon (see VictoryScene.js's TRIAL_CLASS reward wiring), not
  // another gear check layered on top of it.
  'T1': { region: 'Lametus', playerPos: { reno:[1,3], drace:[1,4], sela:[1,2], kael:[1,5], trice:[1,1], zora:[1,0] }, enemyHeroClasses: [TRIAL_CLASS.T1], enemies: () => [tournamentEnemyDef(7, 5, TRIAL_CLASS.T1, 19, { speed:17, strength:26, stamina:19, endurance:18 })] },
  'T2': { region: 'Lametus', playerPos: { reno:[1,3], drace:[1,4], sela:[1,2], kael:[1,5], trice:[1,1], zora:[1,0] }, enemyHeroClasses: [TRIAL_CLASS.T2], enemies: () => [tournamentEnemyDef(7, 5, TRIAL_CLASS.T2, 19, { speed:17, strength:26, stamina:19, endurance:18 })] },
  'T3': { region: 'Lametus', playerPos: { reno:[1,3], drace:[1,4], sela:[1,2], kael:[1,5], trice:[1,1], zora:[1,0] }, enemyHeroClasses: [TRIAL_CLASS.T3], enemies: () => [tournamentEnemyDef(7, 5, TRIAL_CLASS.T3, 19, { speed:17, strength:26, stamina:19, endurance:18 })] },
  'T4': { region: 'Lametus', playerPos: { reno:[1,3], drace:[1,4], sela:[1,2], kael:[1,5], trice:[1,1], zora:[1,0] }, enemyHeroClasses: [TRIAL_CLASS.T4], enemies: () => [tournamentEnemyDef(7, 5, TRIAL_CLASS.T4, 19, { speed:17, strength:26, stamina:19, endurance:18 })] },
  'T5': { region: 'Lametus', playerPos: { reno:[1,3], drace:[1,4], sela:[1,2], kael:[1,5], trice:[1,1], zora:[1,0] }, enemyHeroClasses: [TRIAL_CLASS.T5], enemies: () => [tournamentEnemyDef(7, 5, TRIAL_CLASS.T5, 19, { speed:17, strength:26, stamina:19, endurance:18 })] },
  'T6': { region: 'Lametus', playerPos: { reno:[1,3], drace:[1,4], sela:[1,2], kael:[1,5], trice:[1,1], zora:[1,0] }, enemyHeroClasses: [TRIAL_CLASS.T6], enemies: () => [tournamentEnemyDef(7, 5, TRIAL_CLASS.T6, 19, { speed:17, strength:26, stamina:19, endurance:18 })] },
  'T7': { region: 'Lametus', playerPos: { reno:[1,3], drace:[1,4], sela:[1,2], kael:[1,5], trice:[1,1], zora:[1,0] }, enemyHeroClasses: [TRIAL_CLASS.T7], enemies: () => [tournamentEnemyDef(7, 5, TRIAL_CLASS.T7, 19, { speed:17, strength:26, stamina:19, endurance:18 })] },

  // ── Side battles (optional, July 2026) ────────────────────────────────────
  // M13/M14 (off M6/M9) removed 2026-07-11 along with M6/M9 themselves;
  // M15 (off M12) removed the same day too, alongside M12 ("remove m12") —
  // nothing left here either. (M6 itself was reused for a brand-new mission
  // above, 2026-07-17 — unrelated to the one removed here.)
};

const enemyMaxHp = u => (u.endurance + u.stamina) * (2 + (u.level ?? 1));
const calcAtk    = u => Math.round((u.strength + Math.round(u.speed * 0.5) + rand(0, 3)) * (u.atkBuff ?? 1.0));

// ── Designation combat triangle ─────────────────────────────────────────────
// C beats Rg, Rg beats D, D beats C (Support sits outside the triangle).
// Which of the attacker's designations is "live" for this hit follows the
// move type per the redesign: melee (range<=1, or no range on directional
// dash-strikes) activates C, ranged (range>=2) activates Rg — "move type
// must match a designation the unit has to gain advantage, otherwise
// neutral" (the redesign's own recommendation for this open item). Defender
// (D) has no move-type binding described in the spec at all — read as
// always-on, since it's the one edge of the triangle not tied to an attack
// type. Duals can have two live designations at once (e.g. a melee hit from
// a C+D unit) — advantage/disadvantage are each true if ANY live designation
// triggers them; a hit that has both cancels out to neutral.
//
// fixedDesignationType (e.g. Tackle) forces a specific designation live for
// THIS move regardless of the attacker's own designation set — mirrors
// fixedElement overriding the natural element cycle. It's additive with D's
// always-on check, not a replacement (Drace's Tackle can have both C and D
// live at once, same dual-designation cancel-to-neutral rule as above).
function attackDesignations(attacker, ability) {
  const desigs = attacker.designations ?? [];
  const live = [];
  if (ability.fixedDesignationType) live.push(ability.fixedDesignationType);
  if (!desigs.length) return [...new Set(live)];
  // exactRange abilities (3-Point) have no plain .range at all — fall back
  // to it before the ?? 1 default so they aren't misread as melee.
  const isMelee = (ability.exactRange ?? ability.range ?? 1) <= 1;
  if (isMelee && desigs.includes('C'))  live.push('C');
  if (!isMelee && desigs.includes('Rg')) live.push('Rg');
  if (desigs.includes('D')) live.push('D');
  return [...new Set(live)];
}
function designationMultiplier(attacker, defender, ability) {
  // alwaysWeak (Ester Academy's "Rock" quest, 2026-07-11) — a defender that's
  // "weak to everything" always takes the same advantage bonus a matching
  // designation would give, regardless of the attacker's own designation set.
  if (defender.alwaysWeak) return 1.25;
  const live = attackDesignations(attacker, ability);
  const defDesigs = defender.designations ?? [];
  if (!live.length || !defDesigs.length) return 1.0;
  const advantage    = live.some(ad => defDesigs.includes(DESIGNATION_BEATS[ad]));
  const disadvantage = live.some(ad => defDesigs.some(dd => DESIGNATION_BEATS[dd] === ad));
  if (advantage && !disadvantage) return 1.25;
  if (disadvantage && !advantage) return 0.8;
  return 1.0;
}

// ── Elemental affinity cycle ────────────────────────────────────────────────
// Fire > Wind > Earth > Lightning > Water > Fire. Beating the defender's
// element deals 1.5x damage; being beaten by it reduces damage to 0.8x.
function elementMultiplier(attacker, defender) {
  if (defender.alwaysWeak) return 1.5; // see designationMultiplier's alwaysWeak note
  const a = attacker.element, d = defender.element;
  if (!a || !d) return 1.0;
  if (ELEMENT_BEATS[a] === d) return 1.5;
  if (ELEMENT_BEATS[d] === a) return 0.8;
  return 1.0;
}

// ── Distance-dependent damage scaling (single-target ability casts) ────────
// scaleByRange (Blitz: "RNG1=2.0/RNG2=1.5/RNG3=1.0") is a discrete lookup by
// the exact cast distance, straight from the sheet's given numbers.
// rangeFalloff (Extreme Speed: "loses damage the further away", infinite
// range) is an ASSUMPTION — the sheet never gives a curve, so this applies
// exponential decay, -15% per tile beyond the first, multiplier =
// ability.multiplier * 0.85^(dist-1). That never reaches exactly zero
// (matching "infinite range" — always a hit, just a weak one), but rounds
// down to 0 actual damage well before the far edge of a 10x10 board.
// Abilities with neither field just use their flat ability.multiplier, so
// this is a no-op for everything else.
const RANGE_FALLOFF_DECAY_PER_TILE = 0.85;
function distanceMultiplier(ability, dist) {
  if (ability.scaleByRange) return ability.scaleByRange[dist] ?? ability.multiplier ?? 0;
  if (ability.rangeFalloff) return (ability.multiplier ?? 0) * Math.pow(RANGE_FALLOFF_DECAY_PER_TILE, Math.max(0, dist - 1));
  return ability.multiplier ?? 0;
}

export class BattleScene extends Phaser.Scene {
  constructor() { super({ key: 'BattleScene' }); }

  init(data) {
    this.difficulty = data?.difficulty ?? 1.0;
    this._initData = data ?? {};
  }

  // The 5 always-loaded base species (every mission might spawn any of
  // them) plus any named-unique sprite this mission's own enemy list
  // references (King Wolf's kingwolf-idle, wired via M0b — see
  // UNIQUE_SPRITE_INFO in monsters.js) — deduped by spriteKey. Generalizing
  // this instead of hand-listing each named unique here means a future
  // wired-up unique (King Lion, ...) needs no BattleScene.js change at all,
  // just a MISSION_CONFIGS enemy entry built via buildMonster().
  monsterSpriteInfos(missionCfg) {
    const infos = new Map();
    for (const base of ['Wolf', 'Boar', 'Deer', 'Goblin', 'Lion']) {
      const info = spriteInfoForBase(base);
      infos.set(info.spriteKey, info);
    }
    // `enemies` can be a function for a mission with a randomized roster
    // (Cave Depths, 2026-07-11) — resolve it the same way create() does so
    // preload() doesn't crash trying to iterate a function.
    const enemyDefs = typeof missionCfg?.enemies === 'function' ? missionCfg.enemies() : (missionCfg?.enemies ?? []);
    for (const e of enemyDefs) {
      if (e.spriteKey && e.file && !infos.has(e.spriteKey)) infos.set(e.spriteKey, e);
    }
    return [...infos.values()];
  }

  preload() {
    // Load stage tiles for this mission
    const stageCfg = STAGE_CONFIGS[state.currentMission] ?? STAGE_CONFIGS['M1'];
    for (const num of stageCfg.tiles) {
      const key = `t${num}`;
      if (!this.textures.exists(key)) {
        this.load.image(key, `tiles/isometric tileset/separated images/tile_${num}.png`);
      }
    }

    // Hero-sprite enemies (e.g. M4's instructor) — Phase 4, M0-M4 redesign.
    // Same HERO_SPRITES pipeline as the party below, just for a mission's
    // `enemyHeroClasses` instead of the player roster. Computed here (not
    // just below) since monsterSpriteInfos also needs missionCfg.
    const missionCfg = MISSION_CONFIGS[state.currentMission ?? 'M1'];

    // Monster sheets: 6x6 grid (row0=idle, row1=run, row2=attack, row3=power
    // attack, row4=taunt/howl, row5=death) — same convention as HERO_SPRITES,
    // per-file frame size since canvas dims aren't perfectly uniform.
    for (const info of this.monsterSpriteInfos(missionCfg)) {
      this.load.spritesheet(info.spriteKey, info.file, trimmedSheetConfig(info.fw, info.fh));
    }

    // Load hero sprites for current party — uses each unit's CURRENT (post-
    // promotion) role sprite, not always T1, so a promoted unit shows its
    // promoted appearance in battle.
    // Whichever units will actually fight — the capped first-N by default,
    // or the player's own picks from BattlePartySelectScene once the roster
    // outgrows the cap (see getBattleParty/battlePartyIds in gameState.js).
    const battleParty = getBattleParty(state);
    const classNames = battleParty.map(u => spriteKeyForRole(currentRoleId(u))).filter(Boolean);
    loadHeroSprites(this, classNames);

    if (missionCfg?.enemyHeroClasses) loadHeroSprites(this, missionCfg.enemyHeroClasses);
  }

  create() {
    // Roster bigger than the battle cap and no pick made yet for this fight
    // (2026-07-08 feedback: "player is given option to pick when party size
    // is 5 or more") — bounce straight to the picker before building any
    // battle state; it hands back into this same BattleScene start (with the
    // original data) once the player confirms a lineup. battlePartyIds is
    // cleared right after getBattleParty() reads it below, so a later battle
    // with a changed roster (recruit/dismiss) always re-prompts instead of
    // silently reusing a stale pick.
    if (state.party.length > maxBattlePartySize(state) && !state.battlePartyIds) {
      this.scene.start('BattlePartySelectScene', { battleData: this._initData });
      return;
    }

    const { width, height } = this.scale;
    this.originX = width / 2;
    this.originY = 70;
    this.turnCount = 1;

    const missionId  = state.currentMission ?? 'M1';
    const missionCfg = MISSION_CONFIGS[missionId] ?? MISSION_CONFIGS['M1'];
    const stageCfg   = STAGE_CONFIGS[missionId]   ?? STAGE_CONFIGS['M1'];
    // Stored so later methods (checkEndConditions' win-condition check,
    // startPlayerTurn's reinforcement-wave trigger) can read it without
    // threading it through every call — 2026-07-11 ("Goblin King"/"Cave
    // Depths" quests, see spawnReinforcements/isVictory below).
    this.missionCfg = missionCfg;

    // phase: 'player_turn' | 'unit_menu' | 'unit_selected' | 'ability_targeting' | 'enemy_turn' | 'victory' | 'defeat'
    this.phase = 'player_turn';
    this.selectedUnit = null;
    this.moveRange = new Set();
    this.hoveredTile = null;

    // Row 0 (frames 0-5) = idle, for every monster sheet this mission needs
    // (the 5 always-loaded base species + any named-unique sprite it uses).
    const monsterSpriteInfos = this.monsterSpriteInfos(missionCfg);
    for (const { spriteKey: key } of monsterSpriteInfos) {
      if (!this.anims.exists(key)) {
        this.anims.create({ key, frames: this.anims.generateFrameNumbers(key, { start: 0, end: 5 }), frameRate: 6, repeat: -1 });
      }
    }

    // Must match preload()'s battleParty exactly so a benched unit's sprite
    // is never half-loaded/animated while still excluded from playerUnits
    // below. Consumes (and clears) battlePartyIds so the next battle always
    // re-prompts on a still-oversized roster instead of reusing this pick.
    const battleParty = getBattleParty(state);
    state.battlePartyIds = null;

    // ── Strip sprite backgrounds, then build animations ───────────────────
    for (const u of battleParty) {
      const className = spriteKeyForRole(currentRoleId(u));
      if (className) stripHeroBackground(this, className);
    }
    for (const heroClass of missionCfg.enemyHeroClasses ?? []) {
      stripHeroBackground(this, heroClass);
    }
    // Monster sheets are baked with a solid black background (no alpha
    // channel), same as the old critter rigs needed no stripping for but
    // the new hero-pipeline art does.
    for (const { spriteKey: key } of monsterSpriteInfos) {
      stripBackgroundByKey(this, key, { cols: 6, rows: 6 });
    }
    for (const u of battleParty) {
      const className = spriteKeyForRole(currentRoleId(u));
      if (className) createHeroAnims(this, className);
    }
    for (const heroClass of missionCfg.enemyHeroClasses ?? []) {
      createHeroAnims(this, heroClass);
    }

    // ── Stage background tint ─────────────────────────────────────────────
    this.cameras.main.setBackgroundColor(stageCfg.bgColor ?? 0x0a0a18);

    // ── Tile sprites (back-to-front creation = natural depth sort) ────────
    this.tileSprites = new Map();
    for (let sum = 0; sum < COLS + ROWS - 1; sum++) {
      for (let col = 0; col <= sum; col++) {
        const row = sum - col;
        if (col < 0 || col >= COLS || row < 0 || row >= ROWS) continue;
        const { x, y } = this.gridToScreen(col, row);
        const tileKey = `t${stageCfg.layout(col, row)}`;
        this.tileSprites.set(`${col},${row}`,
          this.add.image(x, y + TILE_Y_OFFSET, tileKey)
            .setScale(TILE_SCALE).setOrigin(0.5, 0).setDepth((col + row) * 10)
        );
      }
    }

    this.hlPool      = [];
    this.hlPoolIndex = 0;
    this.wolfHpGfx = this.add.graphics().setDepth(650);
    this.unitMap   = new Map();

    this.killedEnemies  = 0;
    this.killsByType    = {};
    this.xpEarned       = 0;
    this.actionMenu     = null;
    this.statusPopup    = null;
    this.activeAbility  = null;
    // The Corrupted One's monsters (M6, 2026-07-17) all share ONE locked
    // target instead of each picking their own nearest hero — see
    // getCorruptedTarget()/enemyAct below.
    this.corruptedTarget = null;

    // ── Player units — read live stats from gameState ─────────────────────

    // missionCfg.playerPos only has entries for the 6 fixed FULL_ROSTER ids
    // (reno/drace/sela/kael/trice/zora) — a generic recruit (recruitNewUnit,
    // 2026-07-08 feedback) has an id like "recruit_3" that's never in that
    // map, so every one of them would fall back to the exact same [1, 1] and
    // stack invisibly on top of each other. usedStartTiles bumps any
    // fallback (or, in theory, any config typo) that collides with a tile
    // already claimed this battle to the next free row in the same column.
    const usedStartTiles = new Set();
    const claimStartTile = (col, row) => {
      while (usedStartTiles.has(`${col},${row}`)) row = (row + 1) % ROWS;
      usedStartTiles.add(`${col},${row}`);
      return [col, row];
    };

    this.playerUnits = battleParty.map(gs => {
      const [col, row] = claimStartTile(...(missionCfg.playerPos[gs.id] ?? [1, 1]));
      const eff = effectiveStats(gs);
      const hp  = gsMaxHp(gs);
      // Talent-tree units get an expanded SP pool so their tree's higher costs
      // become reachable as the relevant stat(s) grow. Units qualifying for
      // multiple trees get the best applicable pool (not stacked).
      const talents = gs.talents ?? [];
      let maxSp = 4;
      if (talents.includes('Speed'))    maxSp = Math.max(maxSp, 4 + Math.floor(eff.speed / 2));
      if (talents.includes('Strength')) maxSp = Math.max(maxSp, 4 + Math.floor(eff.strength / 2));
      if (talents.includes('Stamina') || talents.includes('Endurance')) {
        maxSp = Math.max(maxSp, 4 + Math.floor((eff.stamina + eff.endurance) / 4));
      }
      // Sports-partner adjacency ("same dis") is keyed off the unit's CURRENT
      // class grouping (SPORTS[*].class — Ball/Racquet/Bat & Ball/...), not
      // its accumulated history.
      const classGrouping = sportById(currentSport(gs))?.class ?? null;
      // Lazy-inits gs.equippedSpecials/equippedSkills on the PERSISTENT unit
      // (state.party), not just this battle's copy, if this is the unit's
      // very first battle — so a fresh recruit isn't stuck with zero usable
      // abilities before ever visiting LoadoutScene, and the default sticks
      // for next time too rather than re-rolling every battle.
      getEquippedSpecialAbilities(gs); getEquippedSkillAbilities(gs);
      return {
        id: gs.id, name: gs.name, initials: gs.initials, color: gs.color, element: gs.element,
        // t2Role/t3Role are carried (not just t1Role) so getUnitSpecials/
        // getUnitSkills/getEquippedPassives — which all walk unlockedRoleIds,
        // itself gated on unit.t1Role/t2Role/t3Role/level — see promoted-tier
        // content in battle too. Previously only T1-tier abilities showed up
        // for promoted units; incidental fix, needed for Set Up's follow-up
        // to pick a correct fallback ability from a promoted partner's kit.
        t1Role: gs.t1Role, t2Role: gs.t2Role, t3Role: gs.t3Role,
        roleId: currentRoleId(gs), designations: currentDesignations(gs),
        classGrouping, equippedPassives: getEquippedPassives({ ...gs, designations: currentDesignations(gs) }),
        moveSpeed: gs.moveSpeed, baseMoveSpeed: gs.moveSpeed, col, row, team: 'player',
        speed: eff.speed, strength: eff.strength, stamina: eff.stamina, endurance: eff.endurance,
        hp, maxHp: hp, isDone: false, isDead: false, hitFlash: false,
        sp: maxSp, maxSp, hasActed: false, hasMoved: false, facing: 'right', level: gs.level ?? 1,
        talents: [...(gs.talents ?? [])],
        classSkills: [...(gs.classSkills ?? [])], skillCooldowns: {}, skillUses: {},
        equippedSpecials: [...(gs.equippedSpecials ?? [])], equippedSkills: [...(gs.equippedSkills ?? [])],
        setUpUsedThisTurn: false, duoFreeMoveUsed: false, duoBonusUsed: false,
      };
    });
    for (const u of this.playerUnits) {
      u.gfx = this.add.graphics().setDepth(600);
      u.label = this.add.text(0, 0, u.initials, {
        fontSize: '11px', fontFamily: 'monospace', fontStyle: 'bold', color: '#ffffff',
      }).setOrigin(0.5).setDepth(1000);
      const className = spriteKeyForRole(u.roleId);
      const hKey = heroKey(className);
      const idleAnim = `${hKey}-idle`;
      if (this.textures.exists(hKey)) {
        const { x, y } = this.gridToScreen(u.col, u.row);
        u.portrait = this.add.sprite(x, y + TH2 + 10, hKey)
          .setScale(0.38)
          .setOrigin(0.5, 0.92)
          .setDepth((u.col + u.row) * 10 + 6);
        u.portrait.setFrame(firstFrame(className));
        u.idleAnim = idleAnim;
        this.playIdle(u, className);
        u.label.setVisible(false);
        u.isMoving = false;
      } else {
        u.portrait = null;
        u.idleAnim = null;
        u.isMoving = false;
      }
      this.unitMap.set(`${u.col},${u.row}`, u);
    }

    // ── Enemies — driven by mission config ────────────────────────────────
    const diff = this.difficulty ?? 1.0;
    const scaledLevel = (base) => Math.max(1, Math.round(base + (diff - 1) * 10));
    // M0a/M0b repeat-scaling (M0-M4 redesign, Phase 5; extended to M0b
    // 2026-07-07) — each replay after the first escalates enemies: level
    // +2, HP (endurance/stamina) +25%, attack (strength) +10%, per repeat.
    // Layered on top of the normal diff-multiplier scaling every mission
    // already gets; neutral (0/1) for every other mission since only
    // M0a/M0b's repeat counts ever get incremented (see WorldMapScene).
    // REPEAT_LEVEL_CAP (2026-07-09, "when king wolf hit lvl 40 lvl increase
    // should stop") — applies to the shared repeat-scaling mechanism itself,
    // not just King Wolf/M0b, so it automatically covers every repeatable
    // mission using this same repeatCount path (currently M0a and M0b).
    // Only the level number is capped; HP/attack keep scaling with repeats
    // past that point (not asked to change).
    const repeatCount = (missionId === 'M0a' || missionId === 'M0b') ? (state.repeatCounts[missionId] ?? 0) : 0;
    const repeatLevelBonus = repeatCount * 2;
    const repeatHpMult = 1 + 0.25 * repeatCount;
    const repeatAtkMult = 1 + 0.10 * repeatCount;
    // Stored for spawnReinforcements (2026-07-11) to reuse the exact same
    // scaling a mission's initial roster gets, so a mid-battle wave isn't
    // weaker/stronger than the enemies already on the board.
    this._enemyCtx = { diff, repeatLevelBonus, repeatHpMult, repeatAtkMult, region: missionCfg.region, scaledLevel };
    // `enemies` is normally a static array (built once at module load via
    // inline buildMonster() calls), but a mission that wants a freshly
    // randomized roster each time it's entered (Cave Depths' "3 random
    // type of monster") needs it evaluated NOW instead — see A2c below.
    const enemyDefs = typeof missionCfg.enemies === 'function' ? missionCfg.enemies() : missionCfg.enemies;
    this.enemyUnits = enemyDefs.map(d => this.buildEnemyUnit(d));
    for (const e of this.enemyUnits) this.spawnEnemyVisual(e);

    // ── UI ────────────────────────────────────────────────────────────────
    // Top HUD bar background
    const hudBg = this.add.graphics().setDepth(1000);
    hudBg.fillStyle(0x08101e, 0.95);
    hudBg.fillRect(0, 0, width, 30);
    hudBg.lineStyle(2, 0x2a3a6a, 1);
    hudBg.lineBetween(0, 30, width, 30);

    // Bottom hint bar background
    const hintBg = this.add.graphics().setDepth(1000);
    hintBg.fillStyle(0x08101e, 0.92);
    hintBg.fillRect(0, height - 26, width, 26);
    hintBg.lineStyle(2, 0x2a3a6a, 1);
    hintBg.lineBetween(0, height - 26, width, height - 26);

    // Selected-unit info — centred in header
    this.infoText = this.add.text(width / 2, 6, '', {
      fontSize: '14px', color: '#dde4ff', fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(0.5, 0).setDepth(1001);

    // Dim stage label centered, Turn counter right-aligned
    this.add.text(width / 2, 8, stageCfg.label, {
      fontSize: '10px', color: '#334455', fontFamily: 'monospace',
    }).setOrigin(0.5, 0).setDepth(1001);
    this.turnText = this.add.text(width - 10, 8, 'Turn 1', {
      fontSize: '13px', color: '#99aaee', fontFamily: 'monospace',
    }).setOrigin(1, 0).setDepth(1001);

    if (diff > 1.0) {
      const diffLabel = diff >= 1.5 ? 'ELITE' : 'HARD';
      const diffColor = diff >= 1.5 ? '#ff4444' : '#ffaa33';
      this.add.text(width / 2, 8, diffLabel, {
        fontSize: '12px', fontFamily: 'monospace', fontStyle: 'bold', color: diffColor,
      }).setOrigin(0.5, 0).setDepth(1001);
    }

    this.actionHint = this.add.text(width / 2, height - 6, '', {
      fontSize: '13px', color: '#99bbcc', fontFamily: 'monospace',
    }).setOrigin(0.5, 1).setDepth(1001);

    this.drawReferenceHud(width);

    // Exit button
    const exitBtn = this.add.text(10, 6, '✕  RETREAT', {
      fontSize: '12px', fontFamily: 'monospace', color: '#aa5555',
      padding: { x: 6, y: 3 },
    }).setOrigin(0, 0).setDepth(1002).setInteractive({ useHandCursor: true });
    exitBtn.on('pointerover', () => exitBtn.setStyle({ color: '#ff7777' }));
    exitBtn.on('pointerout',  () => exitBtn.setStyle({ color: '#aa5555' }));
    exitBtn.on('pointerdown', () => {
      this.cameras.main.fadeOut(400, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('WorldMapScene'));
    });

    // ── Input ─────────────────────────────────────────────────────────────
    this.input.on('pointermove', ptr => {
      if (this.phase === 'enemy_turn' || this.phase === 'victory' || this.phase === 'defeat') return;
      const t = this.screenToGrid(ptr.x, ptr.y);
      this.hoveredTile = this.inBounds(t) ? t : null;
      this.redraw();
    });

    this.input.on('pointerdown', ptr => {
      if (this.phase === 'enemy_turn' || this.phase === 'victory' || this.phase === 'defeat') return;
      this.handleClick(ptr.x, ptr.y);
    });

    // enemyFirst (M6, 2026-07-17, "the monsters attack so in the M6 battle
    // the enemy will go first") — an ambush: the corrupted monsters get the
    // opening move instead of the player. Reuses startEnemyTurn() as-is
    // (already guards phase/redraws/paces itself with delayedCall, and
    // chains into startPlayerTurn() when done) rather than duplicating its
    // body — the only visible side effect is Turn 1's player phase reads as
    // "Turn 2" once the ambush round finishes (startPlayerTurn always
    // increments turnCount), which is fine here since Turn 1 IS the ambush.
    if (missionCfg.enemyFirst) {
      this.startEnemyTurn();
    } else {
      this.showPhaseBanner('PLAYER TURN');
      this.redraw();
    }
  }

  // Builds one scaled enemy unit object from a mission-config enemy def (a
  // buildMonster() result plus col/row) — factored out of create()'s
  // initial-roster loop (2026-07-11) so spawnReinforcements can create
  // mid-battle reinforcements with the exact same scaling/kit-rebuild logic
  // instead of duplicating it. Reads this._enemyCtx, set once in create().
  buildEnemyUnit(d) {
    const { diff, repeatLevelBonus, repeatHpMult, repeatAtkMult, region, scaledLevel } = this._enemyCtx;
    const lv = Math.min(REPEAT_LEVEL_CAP, scaledLevel(d.level) + repeatLevelBonus);
    const { primaryStat, element } = rollRegionArchetype(region);
    const scaled = {
      ...d, team: 'enemy',
      level:     lv,
      speed:     Math.round(d.speed     * diff),
      strength:  Math.round(d.strength  * diff * repeatAtkMult),
      stamina:   Math.round(d.stamina   * diff * repeatHpMult),
      endurance: Math.round(d.endurance * diff * repeatHpMult),
      xpValue:   40 * lv,
      primaryStat, element,
    };
    scaled[primaryStat] = Math.round(scaled[primaryStat] * PRIMARY_STAT_BOOST);
    // equip (the next school's tournament, 2026-07-11, "all units will have
    // epic gear") — real Item objects rolled via rollEpicEquip(), applied
    // through the SAME effectiveStats() aggregation player gear already
    // uses (it only needs unit.speed/strength/stamina/endurance/equip, no
    // player-only fields, so it works unmodified on a raw enemy def).
    // Regular enemies have no `d.equip` at all, so this is a pure no-op for
    // every monster/instructor built before this feature existed.
    let bonusHp = 0, bonusSp = 0;
    if (d.equip) {
      scaled.equip = d.equip;
      const gearStats = effectiveStats(scaled);
      scaled.speed = gearStats.speed; scaled.strength = gearStats.strength;
      scaled.stamina = gearStats.stamina; scaled.endurance = gearStats.endurance;
      bonusHp = gearStats.bonusHp; bonusSp = gearStats.bonusSp;
    }
    // 2026-07-09 ("increased number of skills as the monsters level
    // increases") — d.abilities/d.passives were built at module-load
    // time off buildMonster()'s placeholder tier-level (see the NOTE in
    // buildMonster), not the real scaled `lv` computed just above.
    // Rebuild the kit here so skill/passive COUNT actually reflects the
    // level a repeat-scaled enemy ends up at in this specific battle.
    const { skills, passives } = buildMonsterKit(d.base, { kind: d.kind, level: lv });
    // fixedMaxHp (Ester Academy's "Rock" quest, 2026-07-11) — bypasses the
    // endurance/stamina/level HP formula for a one-off encounter that needs
    // an exact HP pool (15,000, matching "deal 15,000 damage to the rock")
    // regardless of the difficulty picker's stat multiplier.
    const maxHp = d.fixedMaxHp ?? (enemyMaxHp(scaled) + bonusHp);
    return {
      ...scaled, abilities: skills, passives,
      hp: maxHp, maxHp, isDead: false, debuffs: [], baseMoveSpeed: d.moveSpeed,
      sp: (scaled.maxSp ?? 0) + bonusSp, skillCooldowns: {}, skillUses: {},
    };
  }

  // Creates the sprite/animation/level-label for an already-built enemy
  // unit and registers it on the board — factored out of create()'s
  // initial-roster loop (2026-07-11) for the same reason as buildEnemyUnit
  // above. Mutates `e` in place (sprite/lvLabel/enemyTint), matching how
  // the rest of BattleScene treats unit objects.
  // Bakes a simple boulder shape into a real texture via
  // Graphics.generateTexture() (Ester Academy's "Rock" damage-race quest,
  // 2026-07-11) — no rock art asset exists, and a raw Shape GameObject
  // doesn't support setTint/clearTint the way every hit-flash call site
  // below assumes, so this drops a procedural texture into the same
  // add.sprite() pipeline every other enemy uses instead.
  ensureRockTexture() {
    if (this.textures.exists('rock-proc')) return;
    const g = this.add.graphics();
    g.fillStyle(0x4a4238, 1);
    g.fillEllipse(120, 130, 220, 150);
    g.fillStyle(0x6a6256, 1);
    g.fillEllipse(85, 85, 130, 95);
    g.fillStyle(0x2e2a22, 1);
    g.fillEllipse(150, 65, 55, 36);
    g.lineStyle(4, 0x201d18, 1);
    g.strokeEllipse(120, 130, 220, 150);
    g.generateTexture('rock-proc', 240, 200);
    g.destroy();
  }

  // The Corrupted One's monsters (M6, 2026-07-17) get a dark-purple glow
  // baked under their feet — same "bake a Graphics blob into a real texture"
  // trick ensureRockTexture() above uses, since there's no radial-gradient
  // primitive on Phaser.Graphics. Concentric circles drawn largest-to-
  // smallest with rising alpha fake the gradient (later/smaller circles
  // paint over earlier/bigger ones, so the center ends up brightest).
  ensureAuraTexture() {
    if (this.textures.exists('aura-proc')) return;
    const g = this.add.graphics();
    for (let r = 70; r >= 10; r -= 6) {
      g.fillStyle(0x8822cc, 0.05 + (1 - r / 70) * 0.35);
      g.fillCircle(80, 80, r);
    }
    g.generateTexture('aura-proc', 160, 160);
    g.destroy();
  }

  spawnEnemyVisual(e) {
    const ENEMY_TINT = 0x4a5566;
    if (e.spriteKey === 'rock-proc') this.ensureRockTexture();
    // footprintScreenPos centers a multi-tile unit (King Wolf, size:2)
    // over its whole block instead of just its anchor tile's own cell.
    const { x, y } = this.footprintScreenPos(e);
    const baseScale = e.spriteScale ?? 1.2;
    const depth = (e.col + e.row) * 10 + 5;
    e.sprite = this.add.sprite(x, y + TH2, e.spriteKey)
      .setOrigin(e.fixedIdleFrames ? (e.fixedIdleOriginX ?? 0.5) : 0.5, 0.75).setScale(baseScale)
      .setTint(ENEMY_TINT).setDepth(depth);
    // fixedIdleFrames (King Wolf, 2026-07-08 feedback, after 2 earlier
    // single-frame-freeze attempts) — kingwolf.png's idle row has the
    // tail painted past its own cell on every pose, AND an under-belly
    // shadow painted the exact same pure black as the sheet's background
    // (so BattleScene's flood-fill strip can't tell them apart and
    // erases it, punching a hole). Freezing on one frame dodged both but
    // killed all motion, which was itself the next complaint. This
    // instead builds one corrected custom frame per listed pose — a
    // wider-than-normal crop (into the empty buffer before the next
    // cell's own art starts) for the tail, plus restoring opacity over a
    // small rect for the belly shadow (stripping only ever zeroes alpha,
    // never touches RGB, so the original black paints itself right back
    // in) — and plays a real animation across all of them. See the long
    // comment on King Wolf's UNIQUE_SPRITE_INFO entry in monsters.js for
    // how each frame's crop/patch numbers were derived. Enemies never
    // play any OTHER animation (playAttackAnim bails out for anything
    // without a `.portrait`, i.e. every monster), so this is the only
    // animation King Wolf needs.
    if (e.fixedIdleFrames) {
      const animKey = `${e.spriteKey}-fixedidle`;
      if (!this.anims.exists(animKey)) {
        const tex = this.textures.get(e.spriteKey);
        const source = tex.source[0];
        const canvas = document.createElement('canvas');
        canvas.width = source.width; canvas.height = source.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(source.image, 0, 0);
        let dirty = false;
        const frameNames = [];
        for (const f of e.fixedIdleFrames) {
          const frameName = `${e.spriteKey}-fixed${f.frame}`;
          frameNames.push(frameName);
          if (tex.has(frameName)) continue;
          tex.add(frameName, 0, f.cropX, 0, f.cropWidth, e.fh);
          if (f.patch) {
            const { x: px, y: py, w: pw, h: ph } = f.patch;
            const patch = ctx.getImageData(px, py, pw, ph);
            for (let i = 3; i < patch.data.length; i += 4) patch.data[i] = 255;
            ctx.putImageData(patch, px, py);
            dirty = true;
          }
        }
        if (dirty) source.updateSource(canvas);
        this.anims.create({
          key: animKey,
          frames: frameNames.map(name => ({ key: e.spriteKey, frame: name })),
          frameRate: 4,
          repeat: -1,
        });
      }
      e.sprite.play(animKey);
    } else if (e.animKey) {
      e.sprite.play(e.animKey);
    }
    e.enemyTint = ENEMY_TINT;
    const lvColor = e.level >= 6 ? '#ff6666' : e.level >= 3 ? '#ffaa44' : '#aaaaaa';
    e.lvLabel = this.add.text(x, y + TH2 - 58, `${elementIcon(e.element)} Lv.${e.level}`, {
      fontSize: '9px', fontFamily: 'monospace', color: lvColor,
    }).setOrigin(0.5, 1).setDepth(660);

    // Corrupted aura (M6) — sits just behind the sprite's feet, pulsing so
    // it reads as an active effect rather than a flat decal.
    if (e.corrupted) {
      this.ensureAuraTexture();
      e.auraGfx = this.add.sprite(x, y + TH2, 'aura-proc')
        .setScale(0.9).setAlpha(0.8).setBlendMode(Phaser.BlendModes.ADD).setDepth(Math.max(0, depth - 1));
      this.tweens.add({
        targets: e.auraGfx, scale: 1.15, alpha: 0.45,
        duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });
    }
    this.registerUnit(e);
  }

  // Picks up to `count` free tiles for a reinforcement wave to spawn on,
  // preferring the enemy half of the board (col >= COLS/2) so newcomers
  // don't appear on top of/adjacent to the player party. Falls back to any
  // free tile if the enemy half is too crowded; may return fewer than
  // `count` if the whole board is nearly full (spawnReinforcements just
  // spawns as many as it got tiles for).
  findSpawnTiles(count) {
    const free = [];
    for (let col = 0; col < COLS; col++) {
      for (let row = 0; row < ROWS; row++) {
        if (!this.unitMap.has(`${col},${row}`)) free.push({ col, row });
      }
    }
    const enemyHalf = free.filter(t => t.col >= Math.floor(COLS / 2));
    const pool = enemyHalf.length >= count ? enemyHalf : free;
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool.slice(0, count);
  }

  // Mid-battle reinforcement wave (2026-07-11, "Goblin King spawns 2
  // goblins every 3rd turn" / "Cave Depths... every 3rd 3 more spawn") —
  // builds each new enemy through the same buildEnemyUnit/spawnEnemyVisual
  // pipeline the initial roster uses, so a spawned-in reinforcement is
  // scaled identically to a mission's starting enemies. `missionCfg.reinforce
  // .pool()` returns an array of base-species names — called fresh each
  // wave so a mission wanting fresh randomization (Cave Depths) gets it;
  // a mission wanting a fixed composition (Goblin King's 2 Goblins) just
  // returns the same array every time.
  spawnReinforcements() {
    const cfg = this.missionCfg?.reinforce;
    if (!cfg) return;
    // maxTotal (Gale's "5 monster spawn each, to a max of 10" quest,
    // 2026-07-11) — caps cumulative spawns across the whole battle, not
    // just currently-alive count (killUnit never removes a dead unit from
    // enemyUnits, only flags isDead, so .length already IS the running
    // total ever spawned — no separate counter needed). Missions without
    // maxTotal (Goblin King, Cave Depths) keep waving indefinitely as before.
    if (cfg.maxTotal && this.enemyUnits.length >= cfg.maxTotal) return;
    const species = cfg.pool();
    const tiles = this.findSpawnTiles(species.length);
    let spawned = 0;
    for (let i = 0; i < tiles.length; i++) {
      const { col, row } = tiles[i];
      const d = { ...buildMonster({ base: species[i], tier: cfg.tier ?? 1 }), col, row };
      const e = this.buildEnemyUnit(d);
      this.enemyUnits.push(e);
      this.spawnEnemyVisual(e);
      spawned++;
    }
    if (spawned > 0) {
      this.showPhaseBanner('REINFORCEMENTS!');
      this.redraw();
    }
  }

  // Standard win condition is "every enemy dead"; a mission can override
  // via missionCfg.winCondition (2026-07-11, "Goblin King... to win player
  // must kill the goblin king" — the regular goblins its wave spawns don't
  // need to be cleared). Only one override kind exists so far; add more
  // `type`s here if a future quest needs a different rule.
  isVictory() {
    const win = this.missionCfg?.winCondition;
    if (win?.type === 'bossName') {
      const boss = this.enemyUnits.find(e => e.name === win.name);
      return !!boss?.isDead;
    }
    return this.enemyUnits.every(e => e.isDead);
  }

  // ── Click handling ────────────────────────────────────────────────────────

  handleClick(sx, sy) {
    // Prefer the raw (unsnapped) tile whenever it's already a valid,
    // currently-highlighted EMPTY destination — covers normal Move
    // (unit_selected) and Duo's free-move tile pick (duo_targeting). Without
    // this, snapToNearbyUnit's forgiveness radius could pull a click on a
    // legitimately-highlighted tile onto a NEARBY unit instead — adjacent
    // tile centers are only ~36px apart (2026-07-07 feedback: "clicking the
    // highlighted square... doesn't register properly to move" — confirmed
    // via measurement, every neighbor of a unit fell inside the old 40px
    // snap radius, so an empty move-tile touching any unit was basically
    // unclickable). Every other phase (selecting a unit, attacking, ability
    // targeting) still benefits from snapping, unaffected by this.
    const rawTile = this.screenToGrid(sx, sy);
    const rawKey  = `${rawTile.col},${rawTile.row}`;
    const rawIsActionableTile = (this.phase === 'unit_selected' || this.phase === 'duo_targeting')
      && this.moveRange.has(rawKey) && !this.unitMap.has(rawKey);
    const t = rawIsActionableTile ? rawTile : this.snapToNearbyUnit(sx, sy, rawTile);
    if (!this.inBounds(t)) return;

    const key      = `${t.col},${t.row}`;
    const occupant = this.unitMap.get(key);

    // Unit menu open: close it (zone buttons already consumed their own clicks via stopPropagation)
    if (this.phase === 'unit_menu') {
      this.hideActionMenu();
      if (occupant?.team === 'player' && !occupant.isDone && occupant !== this.selectedUnit) {
        this.selectUnit(occupant);  // switch to a different ready unit
      } else {
        this.deselect();            // reset phase → player_turn so clicks work again
      }
      this.redraw();
      return;
    }

    if (this.phase === 'player_turn') {
      if (occupant?.team === 'player' && !occupant.isDone) this.selectUnit(occupant);
      else if (occupant?.team === 'enemy') this.showUnitStatus(occupant);

    } else if (this.phase === 'unit_selected') {
      // "Move" was chosen — waiting for a tile
      if (occupant === this.selectedUnit) {
        this.showActionMenu(this.selectedUnit);
      } else if (occupant?.team === 'player' && !occupant.isDone) {
        this.selectUnit(occupant);
      } else if (this.moveRange.has(key) && !occupant) {
        this.moveUnit(this.selectedUnit, t.col, t.row);
        if (this.selectedUnit.hasActed) {
          this.endUnitTurn(this.selectedUnit);
        } else {
          this.showActionMenu(this.selectedUnit);
        }
      } else {
        this.hideActionMenu();
        this.deselect();
      }

    } else if (this.phase === 'ability_targeting') {
      const u    = this.selectedUnit;
      const dist = Math.abs(t.col - u.col) + Math.abs(t.row - u.row);
      if (this.abilityRangeMatches(u, this.activeAbility, dist) && occupant?.team === this.activeAbility.targetType) {
        this.executeAbility(this.activeAbility, u, occupant);
      } else {
        // Cancel targeting — reopen the menu
        this.activeAbility = null;
        this.showActionMenu(u);
      }
    } else if (this.phase === 'directional_targeting') {
      const u = this.selectedUnit;
      const ability = this.activeAbility;
      const maxR = ability.maxRange ?? 5;
      const dCol = t.col - u.col, dRow = t.row - u.row;
      let dir = null;
      if (dCol === 0 && dRow !== 0 && Math.abs(dRow) <= maxR) dir = [0, Math.sign(dRow)];
      else if (dRow === 0 && dCol !== 0 && Math.abs(dCol) <= maxR) dir = [Math.sign(dCol), 0];

      if (dir) {
        this.executeDirectionalAbility(ability, dir[0], dir[1]);
      } else {
        // Tap elsewhere cancels — reopen the menu
        this.activeAbility = null;
        this.showActionMenu(u);
      }
    } else if (this.phase === 'duo_targeting') {
      // Waiting for the player to pick which free tile beside their partner
      // to land on (see useDuoFreeMove/completeDuoMove).
      if (this.moveRange.has(key) && !occupant) {
        this.completeDuoMove(this.selectedUnit, t.col, t.row);
      } else {
        // Tap elsewhere cancels — the unit hasn't moved, so restore its
        // normal move range (overwritten with Duo's candidate tiles while
        // targeting) instead of leaving it empty or Duo-shaped.
        this.moveRange = this.getReachableTiles(this.selectedUnit);
        this.showActionMenu(this.selectedUnit);
      }
    }

    this.redraw();
  }

  selectUnit(unit) {
    this.selectedUnit = unit;
    this.moveRange    = this.getReachableTiles(unit);
    this.showActionMenu(unit);
  }

  deselect() {
    this.selectedUnit = null;
    this.moveRange = new Set();
    this.phase = 'player_turn';
  }

  endUnitTurn(unit) {
    this.hideActionMenu();
    this.activeAbility = null;
    unit.isDone = true;
    this.selectedUnit = null;
    this.moveRange = new Set();
    this.phase = 'player_turn';

    const allDone = this.playerUnits.every(u => u.isDead || u.isDone);
    if (allDone) this.time.delayedCall(400, () => this.startEnemyTurn());
  }

  // `free: true` (Duo's free move to a sports partner) repositions the unit
  // without consuming its normal move for the turn.
  moveUnit(unit, col, row, { free = false } = {}) {
    // Manhattan tile distance — moveUnit is always called with the FINAL
    // destination (getReachableTiles' BFS steps are never replayed visually),
    // so a multi-tile move needs a proportionally longer tween. A fixed
    // duration regardless of distance made long moves warp across the board
    // in the same ~220ms as a 1-tile step, showing only 1-2 run-animation
    // frames before snapping to idle — read as a "slideshow"/jump-cut,
    // worst on classes with strong pose-to-pose contrast (2026-07-08).
    const tileDist = Math.max(1, Math.abs(col - unit.col) + Math.abs(row - unit.row));

    // Track facing direction for future use
    if (unit.portrait && unit.team === 'player') {
      const { x: srcX } = this.gridToScreen(unit.col, unit.row);
      const { x: dstX } = this.gridToScreen(col, row);
      unit.facing = dstX >= srcX ? 'right' : 'left';
    }

    this.unitMap.delete(`${unit.col},${unit.row}`);
    unit.col = col; unit.row = row;
    if (!free) unit.hasMoved = true;
    this.unitMap.set(`${col},${row}`, unit);

    const { x: tx, y: ty } = this.gridToScreen(col, row);

    // Enemy — instant reposition
    if (unit.sprite) {
      unit.sprite.setPosition(tx, ty + TH2).setDepth((col + row) * 10 + 5);
    }

    // Player hero — rAF animation (Phaser 4 tweens broken in scene.start context)
    if (unit.portrait && unit.team === 'player') {
      unit.isMoving = true;
      const spriteKey = spriteKeyForRole(unit.roleId);
      // noMoveAnim (e.g. Dancer — see HERO_SPRITES) — the sheet's run cycle
      // never read well during movement even after capping/timing fixes, so
      // these classes just hold whatever animation they're already on
      // (idle) instead of switching to run for the slide (2026-07-08).
      const skipMoveAnim = getSpriteInfo(spriteKey)?.noMoveAnim;
      const runAnim = `${heroKey(spriteKey)}-run`;
      const runAnimObj = skipMoveAnim ? null : this.anims.get(runAnim);
      // noMoveAnim means NO animation during the slide, not "keep whatever
      // was already playing" — idle was still looping through its own
      // distinct poses the whole time, which read the same as the run-cycle
      // flicker this override was meant to kill (2026-07-08 feedback:
      // "still moving" after the first noMoveAnim pass). Stop it outright so
      // the portrait holds a single static frame for the whole tween.
      if (runAnimObj) unit.portrait.play(runAnim);
      else if (skipMoveAnim) unit.portrait.anims.stop();
      const fromX = unit.portrait.x, fromY = unit.portrait.y;
      const toX = tx, toY = ty + TH2 + 10;
      // A short move (esp. 1 tile) previously got a duration well under one
      // full run-cycle (frames/frameRate), so it only ever showed ~2 of the
      // animation's frames before snapping to idle — arithmetically
      // indistinguishable from "flickering between 2 poses" regardless of
      // tileDist scaling (2026-07-08 feedback: happens on every move, even
      // 1 tile). Flooring dur at one full cycle guarantees every move —
      // however short — plays the run animation through at least once.
      const oneCycleMs = runAnimObj ? (runAnimObj.frames.length / runAnimObj.frameRate) * 1000 : 220;
      const dur = Math.max(oneCycleMs, 180 * tileDist);
      const ease = t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; // easeInOut quad
      const start = performance.now();
      const animate = () => {
        if (!unit.portrait?.scene) return;
        const t = ease(Math.min((performance.now() - start) / dur, 1));
        unit.portrait.setPosition(fromX + (toX - fromX) * t, fromY + (toY - fromY) * t);
        if (t < 1) { requestAnimationFrame(animate); return; }
        unit.isMoving = false;
        unit.portrait.setDepth((col + row) * 10 + 6);
        this.playIdle(unit, spriteKey);
        this.redraw();
      };
      requestAnimationFrame(animate);
    }
  }

  isAdjacent(unit, tile) {
    return Math.abs(unit.col - tile.col) + Math.abs(unit.row - tile.row) === 1;
  }

  // ── Sports-partner adjacency ("same dis") ───────────────────────────────────
  // Only player units carry classGrouping (enemies aren't modeled with a
  // sport/class), so this is a player-party mechanic only.
  hasPassive(unit, id) {
    return unit.equippedPassives?.some(p => p.id === id) ?? false;
  }
  sportsPartnerAdjacent(unit) {
    if (!unit.classGrouping) return false;
    return this.playerUnits.some(o =>
      o !== unit && !o.isDead && o.classGrouping === unit.classGrouping && this.isAdjacent(unit, o)
    );
  }
  // Damage-DEALT multiplier from an equipped partner-adjacency passive —
  // 2 for 2 (Bat & Ball) and Doubles (Racquet) double damage; the sheet gives
  // Doubles no explicit number of its own, so it's assumed to match the "same
  // dis: damage double" definition given at the top of the Ability Revised
  // doc (ASSUMPTION — confirm). Lock-On (Target) adds +50% instead. A unit
  // can, via cross-class promotion chains (e.g. lacrosse→cricket crosses
  // Racquet→Bat & Ball), end up with more than one of these equipped at
  // once — NOT stacked multiplicatively; take the single best bonus.
  partnerAttackMultiplier(unit) {
    if (!this.sportsPartnerAdjacent(unit)) return 1.0;
    if (this.hasPassive(unit, 'two_for_two') || this.hasPassive(unit, 'doubles')) return 2.0;
    if (this.hasPassive(unit, 'lock_on')) return 1.5;
    return 1.0;
  }
  // Damage-TAKEN multiplier from an equipped partner-adjacency passive.
  // Training Buddy (Martial Arts) is unconditional every hit. Set Up (Ball)
  // is explicitly capped "1 time per turn" on the sheet — tracked via
  // unit.setUpUsedThisTurn, reset once per round in startPlayerTurn(). The
  // flag lives on the DEFENDER, so it correctly caps at one reduction total
  // per round even if multiple different enemies hit this unit before its
  // next turn (not once per attacker).
  partnerDefenseMultiplier(unit) {
    if (!this.sportsPartnerAdjacent(unit)) return 1.0;
    if (this.hasPassive(unit, 'training_buddy')) return 0.5;
    if (this.hasPassive(unit, 'set_up') && !unit.setUpUsedThisTurn) {
      unit.setUpUsedThisTurn = true;
      return 0.5;
    }
    return 1.0;
  }
  // Extra range from Lock-On while beside a sports partner.
  partnerRangeBonus(unit) {
    return (this.sportsPartnerAdjacent(unit) && this.hasPassive(unit, 'lock_on')) ? 3 : 0;
  }
  effectiveRange(unit, ability) {
    return (ability.range ?? 1) + this.partnerRangeBonus(unit);
  }
  // Whether `dist` (Manhattan distance from `unit`) is a valid target
  // distance for `ability`. Exact-range abilities (3-Point: "RNG is EXACTLY
  // 3 spaces — no more, no less — confirmed donut targeting") require dist
  // to match precisely, not just fall within a max — a ring, not a filled
  // diamond. Everything else keeps the normal <=effectiveRange check exactly
  // as before (no added lower bound — some ally-support abilities are
  // clickable on the caster's own tile at dist 0).
  abilityRangeMatches(unit, ability, dist) {
    if (ability.exactRange != null) return dist === ability.exactRange + this.partnerRangeBonus(unit);
    return dist <= this.effectiveRange(unit, ability);
  }
  // Gracefulness (Performance): "when adjacent same-sports, all effects are
  // doubled" — read literally per the user's own confirmation (a 20% heal
  // becomes 40%, a 10% buff becomes 20%): doubles the numeric magnitude of
  // ANY percentage/multiplier-based effect this unit casts while beside its
  // sports partner (restoreSp/Cheer, atkBuffAlly/Routine,
  // restoreSpAndHpPct/Refresh) — not restricted to Performance-class
  // abilities specifically, matching "ALL effects". Doesn't apply to
  // binary/positional effects with no magnitude to double (guard,
  // teleportToAlly), or to plain damage (Stunt) — this file already treats
  // "effect" as the distinct non-damage category (see the category note at
  // the top of abilities.js).
  gracefulnessMultiplier(unit) {
    return (this.hasPassive(unit, 'gracefulness') && this.sportsPartnerAdjacent(unit)) ? 2.0 : 1.0;
  }

  // ── Duo (Athletics) ──────────────────────────────────────────────────────
  // A sports partner within 5 blocks but NOT already adjacent (distance 1
  // has nothing to gain from the free move — see useDuoFreeMove).
  findDuoPartner(unit) {
    if (!unit.classGrouping) return null;
    return this.playerUnits.find(o => {
      if (o === unit || o.isDead || o.classGrouping !== unit.classGrouping) return false;
      const dist = Math.abs(unit.col - o.col) + Math.abs(unit.row - o.row);
      return dist >= 2 && dist <= 5;
    }) ?? null;
  }
  // All empty orthogonal neighbors of (col,row) — plural sibling of
  // findFreeTileNear (which just returns the first match, used by
  // 'teleportToAlly'). Duo's free move lets the PLAYER pick which one
  // (2026-07-07 feedback), so it needs the full candidate set, not just one.
  findFreeTilesNear(col, row) {
    const out = [];
    for (const [dc, dr] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
      const c = col + dc, r = row + dr;
      if (c < 0 || c >= COLS || r < 0 || r >= ROWS) continue;
      if (!this.unitMap.has(`${c},${r}`)) out.push({ col: c, row: r });
    }
    return out;
  }
  // Free move to a sports partner within range — doesn't consume the unit's
  // normal move (see moveUnit's `free` option). Sets duoFreeMoveUsed (once
  // per round, reset in startPlayerTurn) so it can't be spammed for
  // ordinary repositioning. No longer arms any bonus itself — the "attack
  // twice" bonus (finishAbilityTurn) is a fully independent always-active
  // check now, triggered by adjacency alone, not by having used this move.
  // Enters a tile-picking phase ('duo_targeting', handled in handleClick)
  // instead of auto-picking a destination, so the player chooses which of
  // the partner's free neighboring tiles to land on.
  useDuoFreeMove(unit) {
    if (unit.duoFreeMoveUsed) return;
    const partner = this.findDuoPartner(unit);
    if (!partner) return;
    const candidates = this.findFreeTilesNear(partner.col, partner.row);
    if (!candidates.length) return;
    this.hideActionMenu();
    this.phase = 'duo_targeting';
    this.moveRange = new Set(candidates.map(t => `${t.col},${t.row}`));
    this.actionHint.setText('Select a tile beside your partner');
    this.redraw();
  }
  // Finishes the tile pick started by useDuoFreeMove — the actual teleport,
  // 'DUO!' effect, and menu reopen (previously inline in useDuoFreeMove
  // before the player got a choice of tile).
  completeDuoMove(unit, col, row) {
    this.moveUnit(unit, col, row, { free: true });
    unit.duoFreeMoveUsed = true;
    const { x, y } = this.gridToScreen(col, row);
    this.showEffect(x, y + TH2, 'DUO!', '#44ffdd');
    // Recompute (not just clear) — the free move doesn't set hasMoved, so
    // the unit can still move normally afterward; the action menu's dim
    // preview and a subsequent "Move" should reflect the NEW position, not
    // the stale pre-move range or an empty one.
    this.moveRange = this.getReachableTiles(unit);
    this.redraw();
    this.showActionMenu(unit);
  }

  // Set Up's follow-up half (Ability Revised ruling g): when a Set-Up-
  // equipped unit lands a single-target hit while beside its sports partner,
  // the partner immediately makes a bonus attack on the same target — using
  // the SAME ability if the partner knows it, otherwise the partner's own
  // known damage-dealing ability whose multiplier is closest to the
  // original's. This is a bonus proc, not the partner taking their turn: no
  // SP/cooldown cost and no hasActed change for the partner. Damage is
  // computed inline here (not via doAttack/executeAbility), so it cannot
  // itself chain into another follow-up.
  // Only wired for doAttack/executeAbility (both always resolve to exactly
  // one target) — not executeDirectionalAbility's multi-target AoE/pierce
  // path, which no current Ball-class ability actually uses.
  triggerSetUpFollowUp(attacker, ability, target) {
    if (!this.hasPassive(attacker, 'set_up')) return;
    if (target.isDead || target.hp <= 0) return;
    const partner = this.playerUnits.find(o =>
      o !== attacker && !o.isDead && o.classGrouping === attacker.classGrouping && this.isAdjacent(attacker, o)
    );
    if (!partner) return;

    const known = [ATTACK, THROW, ...getEquippedSpecialAbilities(partner).filter(Boolean), ...getEquippedSkillAbilities(partner).filter(Boolean)]
      .filter(ab => ab.targetType === 'enemy' && !ab.directional && (ab.multiplier ?? 0) > 0);
    if (!known.length) return;

    const power = ab => (ab.multiplier ?? 0) * (ab.hits ?? 1);
    let followUp = known.find(ab => ab.id === ability.id);
    if (!followUp) {
      const origPower = power(ability);
      followUp = known.reduce((best, ab) =>
        Math.abs(power(ab) - origPower) < Math.abs(power(best) - origPower) ? ab : best
      );
    }

    const hits = followUp.hits ?? 1;
    const followUpDist = Math.abs(partner.col - target.col) + Math.abs(partner.row - target.row);
    const followUpMult = distanceMultiplier(followUp, followUpDist);
    const desigMult = designationMultiplier(partner, target, followUp);
    const elemMult = elementMultiplier(partner, target);
    let dmg = 0;
    for (let h = 0; h < hits; h++) dmg += Math.round(calcAtk(partner) * followUpMult * desigMult * elemMult);
    dmg = Math.round(dmg * this.partnerDefenseMultiplier(target));
    target.hp = Math.max(0, target.hp - dmg);

    const { x, y } = this.gridToScreen(target.col, target.row);
    this.showEffect(x, y + TH2 - 22, 'FOLLOW-UP', '#ffdd44');
    this.showDamage(x, y + TH2, dmg, '#ffcc44');
    if (target.sprite) {
      target.sprite.setTint(0xff3300);
      this.time.delayedCall(180, () => {
        if (!target.isDead && target.sprite) {
          if (target.enemyTint) target.sprite.setTint(target.enemyTint);
          else target.sprite.clearTint();
        }
      });
    }
  }

  // ── Combat ────────────────────────────────────────────────────────────────

  doAttack(attacker, defender) {
    // Guard: redirect the attack to the guardian protecting this ally, if any
    if (defender.guardedBy && !defender.guardedBy.isDead) {
      const guardian = defender.guardedBy;
      defender.guardedBy = null;
      defender = guardian;
    }

    if (defender.dodgeReady) {
      defender.dodgeReady = false;
      const { x, y } = this.gridToScreen(defender.col, defender.row);
      this.showEffect(x, y + TH2, 'BLOCKED', '#66ddff');
      this.redraw();
      return;
    }

    let dmg = Math.round(calcAtk(attacker) * designationMultiplier(attacker, defender, ATTACK) * elementMultiplier(attacker, defender)
      * this.partnerAttackMultiplier(attacker));
    dmg = Math.round(dmg * this.partnerDefenseMultiplier(defender));
    if (defender.damageReduction) {
      dmg = Math.max(0, dmg - defender.damageReduction.amount);
    }
    // oneShotKill (M7, 2026-07-17, "the hero should lose them fight no
    // matter what") — a guaranteed-lethal hit, independent of real combat
    // math (the advisor's flag on NOT literally computing a "10000x"
    // damage number). Only ever set on MISSION_CONFIGS.M7's enemies.
    if (attacker.oneShotKill) dmg = defender.hp;

    const { x, y } = this.gridToScreen(defender.col, defender.row);
    const color = attacker.team === 'player' ? '#ffee44' : '#ff5555';
    this.showDamage(x, y + TH2, dmg, color);

    if (defender.endureReady && defender.hp - dmg <= 0) {
      defender.endureReady = false;
      defender.hp = 1;
      this.showEffect(x, y + TH2 - 22, 'ENDURE!', '#ffcc44');
    } else {
      defender.hp = Math.max(0, defender.hp - dmg);
    }

    // Flash hit
    if (defender.sprite) {
      defender.sprite.setTint(0xff2222);
      this.time.delayedCall(180, () => {
        if (!defender.isDead && defender.sprite) {
          if (defender.enemyTint) defender.sprite.setTint(defender.enemyTint);
          else defender.sprite.clearTint();
        }
      });
    }
    if (defender.team === 'player') {
      defender.hitFlash = true;
      this.time.delayedCall(200, () => { defender.hitFlash = false; this.redraw(); });
    }

    if (defender.hp > 0) this.triggerSetUpFollowUp(attacker, ATTACK, defender);
    if (defender.hp <= 0) this.killUnit(defender);
    else this.redraw();
  }

  killUnit(unit) {
    unit.isDead = true;
    if (unit.team === 'enemy') {
      this.killedEnemies++;
      this.killsByType[unit.name] = (this.killsByType[unit.name] ?? 0) + 1;
      this.xpEarned += unit.xpValue ?? 40;
    }
    this.unregisterUnit(unit);
    if (unit.gfx)     { unit.gfx.clear(); }
    if (unit.label)   { unit.label.setVisible(false); }
    if (unit.portrait){ unit.portrait.setVisible(false); }
    if (unit.lvLabel) { unit.lvLabel.setVisible(false); }
    if (unit.auraGfx) { unit.auraGfx.destroy(); unit.auraGfx = null; }
    if (unit.sprite)  { unit.sprite.destroy(); unit.sprite = null; }
    this.redraw();
    this.checkEndConditions();
  }

  checkEndConditions() {
    if (this.isVictory()) {
      this.triggerVictory();
    } else if (this.playerUnits.every(p => p.isDead)) {
      if (this.missionCfg.scriptedDefeat) {
        this.triggerScriptedDefeat();
      } else {
        this.time.delayedCall(500, () => {
          this.phase = 'defeat';
          this.showEndBanner('DEFEAT', '#ff4444');
          this.time.delayedCall(2500, () => this.scene.start('WorldMapScene'));
        });
      }
    }
  }

  // scriptedDefeat (M7, 2026-07-17) — a loss that ADVANCES the story
  // instead of the normal DEFEAT-then-retry path above. No banner, no
  // "back to WorldMapScene with nothing gained" — straight into a 2-part
  // StoryScene chain (blacking out at the arena, then waking up rescued
  // by the Noble Deity) that unlocks M7a + all 7 trials before landing
  // back on the map. M7/M7a are marked completed (nothing left to "win"
  // at either); T1-T7/M8/A3/A4 are only unlocked, not completed — T1-T7
  // are real winnable battles, M8/A3/A4 are plain hubs (same
  // unlocked-only treatment M5/AF/ZE get, see HUB_CONFIGS.M8/A3/A4).
  // M8 ("after m7a is completed the m8 apears") lands at the same moment
  // as M7a itself, since that's the instant M7a's own completedMissions
  // push above happens. Guarded pushes since a replay of M7 (it stays
  // clickable afterward, same as any other completed mission) would hit
  // this same path again.
  triggerScriptedDefeat() {
    this.phase = 'defeat';
    for (const id of ['M7', 'M7a']) {
      if (!state.completedMissions.includes(id)) state.completedMissions.push(id);
    }
    for (const id of ['M7a', 'T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'M8', 'A3', 'A4']) {
      if (!state.unlockedMissions.includes(id)) state.unlockedMissions.push(id);
    }
    this.time.delayedCall(500, () => {
      this.scene.start('StoryScene', {
        location: 'LAMETUS  ·  The Grand Arena',
        backdrop: BACKDROPS.lametusArena,
        lines: [
          { speaker: 'Narrator',          color: '#888899', text: 'The Corrupted One\'s monsters close in, faster and stronger than anything the party has faced. There\'s no opening, no way through.' },
          { speaker: 'The Corrupted One', color: '#aa44ff', text: 'Rest now. You were never going to win this one.' },
          { speaker: 'Narrator',          color: '#888899', text: 'Everything goes dark.' },
        ],
        nextScene: 'StoryScene',
        nextSceneData: {
          location: 'LAMETUS  ·  ???',
          backdrop: BACKDROPS.lametusWaterWilds,
          lines: [
            { speaker: 'Narrator',      color: '#888899', text: 'Reno wakes beside a quiet stream, far from the arena. The others are already stirring nearby — all breathing, all alive.' },
            { speaker: 'Reno',          color: '#4488ff', text: '...We\'re alive? How—' },
            { speaker: 'Noble Deity',   color: '#ffdd66', text: 'I pulled you out before he could finish what he started. You\'re safe here, for now.' },
            { speaker: 'Reno',          color: '#4488ff', text: '...Who are you?' },
            { speaker: 'Noble Deity',   color: '#ffdd66', text: 'Someone who\'s watched The Corrupted One take far more than a tournament from this world. I can help you beat him — but not as you are now.' },
            { speaker: 'Noble Deity',   color: '#ffdd66', text: 'There are seven trials, one for every fighting style. Clear them, and each will earn you a God Tier weapon — the only thing that can stand against what he\'s become.' },
            { speaker: 'Reno',          color: '#4488ff', text: '...Then let\'s get started.' },
          ],
          nextScene: 'WorldMapScene',
          nextSceneData: {},
        },
      });
    });
  }

  // Factored out of checkEndConditions() (2026-07-11, Gale's "kill as many
  // monsters as you can in 6 turns" quest) so the turnLimit check in
  // startPlayerTurn() can also reach victory on timeout instead of the
  // normal DEFEAT-on-timeout path (see missionCfg.turnLimitVictory) —
  // "as many as you can" always counts as a completed attempt, XP/kills
  // already earned so far stand regardless of how many enemies are left.
  // `this.phase` is set synchronously (not inside the delay) to match how
  // the DEFEAT paths already set phase immediately, closing the same
  // stray-click window a delayed set would leave open.
  triggerVictory() {
    this.phase = 'victory';
    this.time.delayedCall(500, () => {
      this.showPhaseBanner('VICTORY!');
      // Play celebration for all player heroes with the anim
      for (const u of this.playerUnits) {
        if (!u.isDead && u.portrait) {
          const celebAnim = `${heroKey(spriteKeyForRole(u.roleId))}-celebrate`;
          if (this.anims.exists(celebAnim)) u.portrait.play(celebAnim);
        }
      }
      this.time.delayedCall(1000, () =>
        this.scene.start('VictoryScene', {
          mission:       state.currentMission,
          enemiesKilled: this.killedEnemies,
          killsByType:   this.killsByType,
          xpEarned:      this.xpEarned,
        })
      );
    });
  }

  showDamage(x, y, amount, color) {
    const txt = this.add.text(x, y - 10, `-${amount}`, {
      fontSize: '18px', fontFamily: 'monospace', fontStyle: 'bold',
      color, stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(2000);
    // Float up and hold, then fade out
    this.tweens.add({
      targets: txt, y: y - 48, duration: 400, ease: 'Power2',
      onComplete: () => {
        this.time.delayedCall(2500, () => {
          this.tweens.add({
            targets: txt, alpha: 0, duration: 1000, ease: 'Power1',
            onComplete: () => txt.destroy(),
          });
        });
      },
    });
  }

  // ── Ability system ────────────────────────────────────────────────────────

  // ── Contextual action menu ────────────────────────────────────────────────

  showActionMenu(unit) {
    this.hideActionMenu();
    if (this.statusPopup) { this.statusPopup.destroy(true); this.statusPopup = null; }
    this.phase = 'unit_menu';

    const { width, height } = this.scale;
    const { x: ux, y: uy } = this.gridToScreen(unit.col, unit.row);
    // Only the player-selected battle loadout, not every known ability — see
    // getEquippedSpecialAbilities/getEquippedSkillAbilities in abilities.js
    // (2026-07-07: capped at MAX_EQUIPPED_SPECIALS/MAX_EQUIPPED_SKILLS,
    // selected via LoadoutScene).
    const specials = getEquippedSpecialAbilities(unit).filter(Boolean);
    const skills   = getEquippedSkillAbilities(unit).filter(Boolean);

    const IH = 30, PAD = 5;
    const ITEMS = this.buildMenuItems(unit, specials, skills);
    const MW = 148, MH = ITEMS.length * IH + PAD * 2;

    // Position beside unit: right if space, left otherwise
    const toRight = ux + 40 + MW < width - 4;
    const mx = toRight ? ux + 40 : ux - 40 - MW;
    const my = Math.min(Math.max(uy - MH / 2, 6), height - MH - 6);

    const con = this.add.container(mx, my).setDepth(4000);
    this.actionMenu = con;
    const RADIUS = 10;

    // Soft drop shadow — an offset, low-alpha rounded rect fakes depth/blur
    // without a real filter, so the card still reads as "raised" once its
    // own fill goes translucent.
    const shadow = this.add.graphics();
    shadow.fillStyle(0x000000, 0.32);
    shadow.fillRoundedRect(4, 6, MW, MH, RADIUS);
    con.add(shadow);

    // Panel background — modern translucent "glass" card, 50% opacity
    const bg = this.add.graphics();
    bg.fillStyle(0x0d1428, 0.5);
    bg.fillRoundedRect(0, 0, MW, MH, RADIUS);
    bg.lineStyle(1.5, unit.color, 0.75);
    bg.strokeRoundedRect(0, 0, MW, MH, RADIUS);
    // Bright top edge accent — the "modern card" highlight strip
    bg.fillStyle(unit.color, 0.6);
    bg.fillRoundedRect(0, 0, MW, 3, { tl: RADIUS, tr: RADIUS, bl: 0, br: 0 });
    con.add(bg);

    // Arrow connector toward unit
    const ax = toRight ? -7 : MW;
    const ay = MH / 2;
    const arrowG = this.add.graphics();
    arrowG.fillStyle(0x0d1428, 0.5);
    arrowG.fillTriangle(ax, ay - 6, ax, ay + 6, toRight ? ax - 7 : ax + 7, ay);
    con.add(arrowG);

    // Unit name header
    const nameHdr = this.add.text(MW / 2, PAD + 6, unit.name.split(' ')[0].toUpperCase(), {
      fontSize: '9px', fontFamily: 'monospace', fontStyle: 'bold',
      color: '#' + unit.color.toString(16).padStart(6, '0'),
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5, 0);
    con.add(nameHdr);

    ITEMS.forEach(({ label, icon, sub, disabled, separator, action }, i) => {
      const iy = PAD + i * IH;

      if (separator) {
        const sepG = this.add.graphics();
        sepG.lineStyle(1, 0xffffff, 0.08);
        sepG.lineBetween(4, iy + 2, MW - 4, iy + 2);
        con.add(sepG);
      }

      const g = this.add.graphics();
      const draw = (h) => {
        g.clear();
        if (h && !disabled) {
          g.fillStyle(0x2a4a90, 0.5);
          g.fillRoundedRect(2, iy + 3, MW - 4, IH - 5, 6);
          // Left accent bar — modern "selected row" indicator
          g.fillStyle(unit.color, 0.9);
          g.fillRoundedRect(2, iy + 3, 3, IH - 5, 2);
        }
      };
      draw(false);
      con.add(g);

      const tc = disabled ? '#3a3a52' : '#e8eeff';
      const ic = disabled ? '#2a2a44' : '#' + unit.color.toString(16).padStart(6, '0');

      con.add(this.add.text(10, iy + IH / 2, icon, {
        fontSize: '12px', fontFamily: 'monospace', color: ic,
        stroke: '#000000', strokeThickness: 3,
      }).setOrigin(0, 0.5));
      con.add(this.add.text(28, iy + IH / 2, label, {
        fontSize: '12px', fontFamily: 'monospace', fontStyle: disabled ? 'normal' : 'bold', color: tc,
        stroke: '#000000', strokeThickness: disabled ? 0 : 3,
      }).setOrigin(0, 0.5));

      if (sub && !disabled) {
        con.add(this.add.text(MW - 8, iy + IH / 2, sub, {
          fontSize: '9px', fontFamily: 'monospace', color: '#7799cc',
          stroke: '#000000', strokeThickness: 2,
        }).setOrigin(1, 0.5));
      }

      if (!disabled) {
        const z = this.add.zone(MW / 2, iy + IH / 2, MW, IH)
          .setInteractive({ useHandCursor: true });
        z.on('pointerover',  () => draw(true));
        z.on('pointerout',   () => draw(false));
        z.on('pointerdown',  (ptr, lx, ly, evt) => { evt.stopPropagation(); action(); });
        con.add(z);
      }
    });
  }

  buildMenuItems(unit, specials, skills) {
    const items = [
      { icon: '📘', label: 'Playbook', sub: null,
        disabled: unit.hasActed,
        action: () => this.showAbilitySubmenu(unit, [ATTACK, THROW, ...specials, ...skills]) },

      { icon: '→', label: 'Move', sub: unit.hasMoved ? 'done' : null,
        disabled: unit.hasMoved,
        action: () => { this.hideActionMenu(); this.phase = 'unit_selected'; this.actionHint.setText('Select a tile to move to'); this.redraw(); } },
    ];

    // Duo (Athletics) — only shown to units that actually have it equipped,
    // rather than a permanently-disabled placeholder for everyone else.
    if (this.hasPassive(unit, 'duo')) {
      items.push({
        icon: '👯', label: 'To Partner',
        sub: unit.duoFreeMoveUsed ? 'used' : null,
        disabled: unit.duoFreeMoveUsed || !this.findDuoPartner(unit),
        action: () => this.useDuoFreeMove(unit),
      });
    }

    const usableItems = this.usableItemGroups();
    items.push(
      { icon: '◈', label: 'Items',
        sub: usableItems.length ? `${usableItems.reduce((n, g) => n + g.count, 0)}` : null,
        disabled: unit.hasActed || usableItems.length === 0,
        action: () => this.showItemSubmenu(unit) },

      { icon: '◉', label: 'Status',
        disabled: false,
        action: () => this.showUnitStatus(unit) },

      { icon: '⏹', label: 'Wait', separator: true,
        disabled: false,
        action: () => { this.hideActionMenu(); this.endUnitTurn(unit); } },
    );
    return items;
  }

  // Whether an ability can currently be used (SP for Special Attacks, cooldown for Skills — both slot-free)
  // SP cost after The Show's -20%-style cost reduction (spCostMult), if
  // active. cost: 'ALL' (Quick Fire/Blitz Ball/Extreme Speed) always spends
  // every point the unit currently has — spCostMult doesn't apply to it
  // (there's no base number left to discount).
  effectiveSpCost(unit, ab) {
    if (ab.cost === 'ALL') return unit.sp;
    return Math.round((ab.cost ?? 0) * (unit.spCostMult ?? 1.0));
  }

  abilityUsable(unit, ab) {
    if (unit.hasActed) return false;
    if (ab.mustBeforeMove && unit.hasMoved) return false;
    // usesPerBattle (Inner Focus, Extreme Speed) is authored on 'special'
    // abilities too, not just 'skill' ones — checked here regardless of
    // category so it's actually enforced for both.
    if (ab.usesPerBattle != null && (unit.skillUses[ab.id] ?? 0) >= ab.usesPerBattle) return false;
    // Blitz Ball's anti-synergy gate: "can only be used when NO sports
    // partner present" — the solo-build counterweight to every other Ball
    // passive rewarding adjacency.
    if (ab.requiresNoPartner && this.sportsPartnerAdjacent(unit)) return false;
    if (ab.category === 'skill') {
      return (unit.skillCooldowns[ab.id] ?? 0) <= 0;
    }
    if (ab.cost === 'ALL') return unit.sp > 0;
    return unit.sp >= this.effectiveSpCost(unit, ab);
  }

  // Cost/cooldown/uses label shown next to an ability in the submenu
  abilitySubLabel(unit, ab) {
    if (ab.category === 'skill') {
      const cdLeft = unit.skillCooldowns[ab.id] ?? 0;
      if (cdLeft > 0) return `CD ${cdLeft}`;
      if (ab.usesPerBattle != null) {
        const used = unit.skillUses[ab.id] ?? 0;
        return `${ab.usesPerBattle - used}/${ab.usesPerBattle}`;
      }
      return 'Ready';
    }
    if (ab.usesPerBattle != null) {
      const used = unit.skillUses[ab.id] ?? 0;
      if (used >= ab.usesPerBattle) return 'Used';
    }
    if (ab.cost === 'ALL') return unit.sp > 0 ? `${unit.sp} SP (ALL)` : 'No SP';
    const cost = this.effectiveSpCost(unit, ab);
    return cost === 0 ? '' : `${cost} SP`;
  }

  // Deduct the resource an ability uses — SP for specials, cooldown/uses for
  // class skills. usesPerBattle is tracked the same way regardless of
  // category (see abilityUsable).
  consumeAbilityResource(unit, ab) {
    if (ab.usesPerBattle != null) unit.skillUses[ab.id] = (unit.skillUses[ab.id] ?? 0) + 1;
    if (ab.category === 'skill') {
      if (ab.cooldown != null) unit.skillCooldowns[ab.id] = ab.cooldown;
    } else if (ab.cost === 'ALL') {
      unit.sp = 0;
    } else {
      unit.sp = Math.max(0, unit.sp - this.effectiveSpCost(unit, ab));
    }
  }

  showAbilitySubmenu(unit, abilities) {
    this.hideActionMenu();
    this.phase = 'unit_menu';

    const { width, height } = this.scale;
    const { x: ux, y: uy } = this.gridToScreen(unit.col, unit.row);

    const IH = 30, PAD = 4;
    const MW = 200, MH = (abilities.length + 1) * IH + PAD * 2;
    const toRight = ux + 40 + MW < width - 4;
    const mx = toRight ? ux + 40 : ux - 40 - MW;
    const my = Math.min(Math.max(uy - MH / 2, 6), height - MH - 6);

    const con = this.add.container(mx, my).setDepth(4000);
    this.actionMenu = con;
    const RADIUS = 10;

    const shadow = this.add.graphics();
    shadow.fillStyle(0x000000, 0.32);
    shadow.fillRoundedRect(4, 6, MW, MH, RADIUS);
    con.add(shadow);

    const bg = this.add.graphics();
    bg.fillStyle(0x0d1428, 0.5);
    bg.fillRoundedRect(0, 0, MW, MH, RADIUS);
    bg.lineStyle(1.5, unit.color, 0.75);
    bg.strokeRoundedRect(0, 0, MW, MH, RADIUS);
    bg.fillStyle(unit.color, 0.6);
    bg.fillRoundedRect(0, 0, MW, 3, { tl: RADIUS, tr: RADIUS, bl: 0, br: 0 });
    con.add(bg);
    const ax = toRight ? -7 : MW;
    const ay = MH / 2;
    const arrowG = this.add.graphics();
    arrowG.fillStyle(0x0d1428, 0.5);
    arrowG.fillTriangle(ax, ay - 6, ax, ay + 6, toRight ? ax - 7 : ax + 7, ay);
    con.add(arrowG);

    // Back button
    const backG = this.add.graphics();
    const drawBack = (h) => { backG.clear(); if (h) { backG.fillStyle(0x2a4a90, 0.5); backG.fillRoundedRect(2, PAD + 2, MW - 4, IH - 4, 6); } };
    drawBack(false);
    con.add(backG);
    con.add(this.add.text(10, PAD + IH / 2, '← Back', {
      fontSize:'11px', fontFamily:'monospace', color:'#88aadd', stroke:'#000000', strokeThickness:3,
    }).setOrigin(0, 0.5));
    const bz = this.add.zone(MW/2, PAD + IH/2, MW, IH).setInteractive({ useHandCursor:true });
    bz.on('pointerover', () => drawBack(true)); bz.on('pointerout', () => drawBack(false));
    bz.on('pointerdown', (ptr,lx,ly,evt) => { evt.stopPropagation(); this.showActionMenu(unit); });
    con.add(bz);

    abilities.forEach((ab, i) => {
      const iy = PAD + (i + 1) * IH;
      const canUse = this.abilityUsable(unit, ab);
      const g = this.add.graphics();
      const draw = (h) => {
        g.clear();
        if (h && canUse) {
          g.fillStyle(0x2a4a90, 0.5);
          g.fillRoundedRect(2, iy+2, MW-4, IH-4, 6);
          g.fillStyle(unit.color, 0.9);
          g.fillRoundedRect(2, iy+2, 3, IH-4, 2);
        }
      };
      draw(false);
      con.add(g);

      const tc = canUse ? '#ffffff' : '#252535';
      const sc = canUse ? '#66aaff' : '#1e2233';
      con.add(this.add.text(10, iy + IH / 2, `${ab.icon}  ${ab.name}`, {
        fontSize:'12px', fontFamily:'monospace', fontStyle:'bold', color: tc,
        stroke: '#000000', strokeThickness: canUse ? 3 : 0,
      }).setOrigin(0, 0.5));
      con.add(this.add.text(MW - 8, iy + IH / 2, this.abilitySubLabel(unit, ab), {
        fontSize:'10px', fontFamily:'monospace', color: sc,
        stroke: '#000000', strokeThickness: canUse ? 2 : 0,
      }).setOrigin(1, 0.5));

      if (canUse) {
        const z = this.add.zone(MW/2, iy + IH/2, MW, IH).setInteractive({ useHandCursor:true });
        z.on('pointerover', () => draw(true)); z.on('pointerout', () => draw(false));
        z.on('pointerdown', (ptr,lx,ly,evt) => {
          evt.stopPropagation();
          this.hideActionMenu();
          if (ab.selfActivate) this.executeSelfAbility(ab);
          else this.startTargeting(ab);
        });
        con.add(z);
      }
    });
  }

  // Usable consumables currently in inventory (heal_herb, health/focus/
  // vitality_potion — anything with healPct/spPct), grouped by id with a
  // count. Inventory stores N separate copies as N separate array entries
  // (see items.js's MATERIAL_STACK_CAP note), so grouping happens here.
  usableItemGroups() {
    const counts = new Map();
    for (const it of state.inventory) {
      if (!isUsableItem(it)) continue;
      counts.set(it.id, (counts.get(it.id) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([id, count]) => ({ item: state.inventory.find(i => i.id === id), count }))
      .filter(g => g.item);
  }

  // Consumes one copy of `item` from inventory and applies its heal/SP
  // restore to `unit` (self-target only — no ally-targeting UI yet). Ends
  // the unit's turn the same way an ability use does.
  useItemOnUnit(unit, item) {
    const idx = state.inventory.findIndex(i => i.id === item.id);
    if (idx === -1) return;
    state.inventory.splice(idx, 1);

    const parts = [];
    if (item.healPct) {
      const heal = Math.round(unit.maxHp * item.healPct);
      unit.hp = Math.min(unit.maxHp, unit.hp + heal);
      parts.push(`+${heal} HP`);
    }
    if (item.spPct) {
      const sp = Math.round((unit.maxSp ?? 0) * item.spPct);
      unit.sp = Math.min(unit.maxSp ?? unit.sp, (unit.sp ?? 0) + sp);
      parts.push(`+${sp} SP`);
    }
    const { x, y } = this.gridToScreen(unit.col, unit.row);
    this.showEffect(x, y + TH2, parts.join('  '), '#44ffaa');

    this.hideActionMenu();
    this.redraw();
    this.finishAbilityTurn(unit);
  }

  showItemSubmenu(unit) {
    this.hideActionMenu();
    this.phase = 'unit_menu';

    const { width, height } = this.scale;
    const { x: ux, y: uy } = this.gridToScreen(unit.col, unit.row);
    const groups = this.usableItemGroups();

    const IH = 30, PAD = 4;
    const rowCount = Math.max(groups.length, 1);
    const MW = 200, MH = (rowCount + 1) * IH + PAD * 2;
    const toRight = ux + 40 + MW < width - 4;
    const mx = toRight ? ux + 40 : ux - 40 - MW;
    const my = Math.min(Math.max(uy - MH / 2, 6), height - MH - 6);

    const con = this.add.container(mx, my).setDepth(4000);
    this.actionMenu = con;
    const RADIUS = 10;

    const shadow = this.add.graphics();
    shadow.fillStyle(0x000000, 0.32);
    shadow.fillRoundedRect(4, 6, MW, MH, RADIUS);
    con.add(shadow);

    const bg = this.add.graphics();
    bg.fillStyle(0x0d1428, 0.5);
    bg.fillRoundedRect(0, 0, MW, MH, RADIUS);
    bg.lineStyle(1.5, unit.color, 0.75);
    bg.strokeRoundedRect(0, 0, MW, MH, RADIUS);
    bg.fillStyle(unit.color, 0.6);
    bg.fillRoundedRect(0, 0, MW, 3, { tl: RADIUS, tr: RADIUS, bl: 0, br: 0 });
    con.add(bg);
    const ax = toRight ? -7 : MW;
    const ay = MH / 2;
    const arrowG = this.add.graphics();
    arrowG.fillStyle(0x0d1428, 0.5);
    arrowG.fillTriangle(ax, ay - 6, ax, ay + 6, toRight ? ax - 7 : ax + 7, ay);
    con.add(arrowG);

    // Back button
    const backG = this.add.graphics();
    const drawBack = (h) => { backG.clear(); if (h) { backG.fillStyle(0x2a4a90, 0.5); backG.fillRoundedRect(2, PAD + 2, MW - 4, IH - 4, 6); } };
    drawBack(false);
    con.add(backG);
    con.add(this.add.text(10, PAD + IH / 2, '← Back', {
      fontSize:'11px', fontFamily:'monospace', color:'#88aadd', stroke:'#000000', strokeThickness:3,
    }).setOrigin(0, 0.5));
    const bz = this.add.zone(MW/2, PAD + IH/2, MW, IH).setInteractive({ useHandCursor:true });
    bz.on('pointerover', () => drawBack(true)); bz.on('pointerout', () => drawBack(false));
    bz.on('pointerdown', (ptr,lx,ly,evt) => { evt.stopPropagation(); this.showActionMenu(unit); });
    con.add(bz);

    if (!groups.length) {
      con.add(this.add.text(MW / 2, PAD + IH + IH / 2, 'No items', {
        fontSize:'11px', fontFamily:'monospace', color:'#334466',
      }).setOrigin(0.5));
    }

    groups.forEach(({ item, count }, i) => {
      const iy = PAD + (i + 1) * IH;
      const g = this.add.graphics();
      const draw = (h) => {
        g.clear();
        if (h) {
          g.fillStyle(0x2a4a90, 0.5);
          g.fillRoundedRect(2, iy+2, MW-4, IH-4, 6);
          g.fillStyle(unit.color, 0.9);
          g.fillRoundedRect(2, iy+2, 3, IH-4, 2);
        }
      };
      draw(false);
      con.add(g);

      con.add(this.add.text(10, iy + IH / 2, item.name, {
        fontSize:'12px', fontFamily:'monospace', fontStyle:'bold', color:'#ffffff',
        stroke: '#000000', strokeThickness: 3,
      }).setOrigin(0, 0.5));
      con.add(this.add.text(MW - 8, iy + IH / 2, `×${count}`, {
        fontSize:'10px', fontFamily:'monospace', color:'#66aaff',
        stroke: '#000000', strokeThickness: 2,
      }).setOrigin(1, 0.5));

      const z = this.add.zone(MW/2, iy + IH/2, MW, IH).setInteractive({ useHandCursor:true });
      z.on('pointerover', () => draw(true)); z.on('pointerout', () => draw(false));
      z.on('pointerdown', (ptr,lx,ly,evt) => {
        evt.stopPropagation();
        this.useItemOnUnit(unit, item);
      });
      con.add(z);
    });
  }

  // Small always-on reference panel, top-right corner, below the header bar:
  // the designation triangle (Combat > Ranged > Defender > Combat) and the
  // elemental affinity pentagon (Fire > Wind > Earth > Lightning > Water >
  // Fire) — a quick-glance "weakness cheat sheet" for both damage-multiplier
  // systems. Modernized (July 2026) to match the translucent glass-card
  // action menu: each icon gets its own ring-outlined chip instead of a flat
  // arrow-joined text string.
  drawReferenceHud(width) {
    const ROW_H = 24, PAD_Y = 8;
    const PW = 208, PY = 34, PH = PAD_Y * 2 + ROW_H * 2;
    const px = width - PW - 6;
    const RADIUS = 8;

    const shadow = this.add.graphics().setDepth(999);
    shadow.fillStyle(0x000000, 0.28);
    shadow.fillRoundedRect(px + 3, PY + 4, PW, PH, RADIUS);

    const bg = this.add.graphics().setDepth(1000);
    bg.fillStyle(0x08101e, 0.5);
    bg.fillRoundedRect(px, PY, PW, PH, RADIUS);
    bg.lineStyle(1.5, 0x3a5aa0, 0.7);
    bg.strokeRoundedRect(px, PY, PW, PH, RADIUS);
    bg.fillStyle(0x4a7acc, 0.5);
    bg.fillRoundedRect(px, PY, PW, 2, { tl: RADIUS, tr: RADIUS, bl: 0, br: 0 });

    // Draws one cycle (designation or element) as a row of icon chips
    // joined by chevrons, wrapping back to the first icon at the end.
    const drawCycleRow = (list, iconFn, cy, ringColor) => {
      const icons = [...list.map(iconFn), iconFn(list[0])];
      const n = icons.length;
      const chipR = 8, gap = 18;
      const totalW = n * chipR * 2 + (n - 1) * gap;
      let cx = px + PW / 2 - totalW / 2 + chipR;
      icons.forEach((ic, i) => {
        const chip = this.add.graphics().setDepth(1001);
        chip.fillStyle(ringColor, 0.28);
        chip.fillCircle(cx, cy, chipR);
        chip.lineStyle(1.2, ringColor, 0.9);
        chip.strokeCircle(cx, cy, chipR);
        this.add.text(cx, cy, ic, { fontSize: '10px', fontFamily: 'monospace' })
          .setOrigin(0.5).setDepth(1002);
        if (i < n - 1) {
          this.add.text(cx + chipR + gap / 2, cy, '›', {
            fontSize: '11px', fontFamily: 'monospace', fontStyle: 'bold', color: '#6688bb',
          }).setOrigin(0.5).setDepth(1001);
        }
        cx += chipR * 2 + gap;
      });
    };

    drawCycleRow(DESIGNATION_CYCLE, designationIcon, PY + PAD_Y + ROW_H / 2 - 2, 0x4477cc);
    drawCycleRow(ELEMENT_CYCLE,     elementIcon,     PY + PAD_Y + ROW_H + ROW_H / 2 - 2, 0xcc7744);
  }

  showUnitStatus(unit) {
    if (this.statusPopup) { this.statusPopup.destroy(true); this.statusPopup = null; }

    const { x: ux, y: uy } = this.gridToScreen(unit.col, unit.row);
    const { width, height } = this.scale;
    const designations = unit.designations ?? [];
    const PW = 160, PH = 128;
    const px = Math.min(Math.max(ux - PW / 2, 4), width - PW - 4);
    const py = uy > height / 2 ? uy - PH - 50 : uy + 40;

    const con = this.add.container(px, py).setDepth(3500);
    this.statusPopup = con;
    const RADIUS = 8;

    const shadow = this.add.graphics();
    shadow.fillStyle(0x000000, 0.32);
    shadow.fillRoundedRect(3, 5, PW, PH, RADIUS);
    con.add(shadow);

    const bg = this.add.graphics();
    bg.fillStyle(0x0d1428, 0.5);
    bg.fillRoundedRect(0, 0, PW, PH, RADIUS);
    bg.lineStyle(1.5, unit.color, 0.75);
    bg.strokeRoundedRect(0, 0, PW, PH, RADIUS);
    bg.fillStyle(unit.color, 0.6);
    bg.fillRoundedRect(0, 0, PW, 3, { tl: RADIUS, tr: RADIUS, bl: 0, br: 0 });
    con.add(bg);

    con.add(this.add.text(PW / 2, 8, unit.name.split(' ')[0], {
      fontSize:'11px', fontFamily:'monospace', fontStyle:'bold', color:'#aaccff',
      stroke:'#000000', strokeThickness:3,
    }).setOrigin(0.5,0));

    // Affinity + designation icons, right under the name
    const badges = [
      unit.element ? `${elementIcon(unit.element)} ${unit.element}` : null,
      designations.length ? designations.map(d => designationIcon(d)).join(' ') : null,
    ].filter(Boolean).join('   ');
    if (badges) {
      con.add(this.add.text(PW / 2, 22, badges, {
        fontSize:'11px', fontFamily:'monospace', color:'#ddccaa', stroke:'#000000', strokeThickness:3,
      }).setOrigin(0.5, 0));
    }

    const rows = [
      { label: 'HP',  val: `${unit.hp} / ${unit.maxHp}`,    color: '#44cc66' },
      ...(unit.maxSp != null ? [{ label: 'SP', val: `${unit.sp} / ${unit.maxSp}`, color: '#4499ff' }] : []),
      { label: 'ATK', val: `${unit.strength + Math.round(unit.speed * 0.5)}`, color: '#ff8844' },
      { label: 'SPD', val: `${unit.speed}`,  color: '#44aaff' },
      { label: 'END', val: `${unit.endurance}`, color: '#44cccc' },
    ];
    const PH2 = 44 + rows.length * 17 + 6;
    if (PH2 !== PH) {
      shadow.clear();
      shadow.fillStyle(0x000000, 0.32);
      shadow.fillRoundedRect(3, 5, PW, PH2, RADIUS);
      bg.clear();
      bg.fillStyle(0x0d1428, 0.5);
      bg.fillRoundedRect(0, 0, PW, PH2, RADIUS);
      bg.lineStyle(1.5, unit.color, 0.75);
      bg.strokeRoundedRect(0, 0, PW, PH2, RADIUS);
      bg.fillStyle(unit.color, 0.6);
      bg.fillRoundedRect(0, 0, PW, 3, { tl: RADIUS, tr: RADIUS, bl: 0, br: 0 });
    }
    rows.forEach(({ label, val, color }, i) => {
      const ry = 44 + i * 17;
      con.add(this.add.text(10, ry, label, {
        fontSize:'10px', fontFamily:'monospace', color:'#7799bb', stroke:'#000000', strokeThickness:2,
      }));
      con.add(this.add.text(PW - 10, ry, val, {
        fontSize:'10px', fontFamily:'monospace', fontStyle:'bold', color, stroke:'#000000', strokeThickness:2,
      }).setOrigin(1,0));
    });

    // Auto-dismiss after 3s
    this.time.delayedCall(3000, () => {
      if (this.statusPopup === con) { con.destroy(true); this.statusPopup = null; }
    });
  }

  hideActionMenu() {
    if (this.actionMenu)   { this.actionMenu.destroy(true);   this.actionMenu   = null; }
    if (this.statusPopup)  { this.statusPopup.destroy(true);  this.statusPopup  = null; }
  }

  startTargeting(ability) {
    if (ability.directional) { this.startDirectionalTargeting(ability); return; }
    this.activeAbility = ability;
    this.phase = 'ability_targeting';
    let rangeLabel;
    if (ability.exactRange != null) {
      rangeLabel = `exactly ${ability.exactRange + this.partnerRangeBonus(this.selectedUnit)}`;
    } else {
      const range = this.effectiveRange(this.selectedUnit, ability);
      rangeLabel = range === Infinity ? '∞' : range;
    }
    this.actionHint.setText(`${ability.icon ?? '◈'} ${ability.name}  ·  range ${rangeLabel}  ·  pick target`);
    this.redraw();
  }

  // Directional abilities (Dash, Blitz, Tackle Kick, ...) no longer show a
  // direction-button menu — the reachable tiles are highlighted directly
  // (see redraw()'s 'directional_targeting' block) and clicking one fires
  // that direction, same interaction pattern as ranged ability targeting.
  startDirectionalTargeting(ability) {
    this.activeAbility = ability;
    this.phase = 'directional_targeting';
    this.hideActionMenu();
    this.actionHint.setText(`${ability.icon} ${ability.name}  ·  tap a highlighted tile`);
    this.redraw();
  }

  executeDirectionalAbility(ability, dcol, drow) {
    const unit = this.selectedUnit;
    const maxR      = ability.maxRange ?? 5;
    const maxPierce = ability.pierce   ?? 1;
    const targets   = [];

    // Collect directional targets
    for (let step = 1; step <= maxR && targets.length < maxPierce; step++) {
      const c = unit.col + dcol * step, r = unit.row + drow * step;
      if (c < 0 || c >= COLS || r < 0 || r >= ROWS) break;
      const occ = this.unitMap.get(`${c},${r}`);
      if (occ?.team === 'enemy' && !occ.isDead) targets.push({ unit: occ, dist: step });
      else if (occ) break;
    }

    // Collect AoE adjacent targets (Tackle Kick phase 1)
    const aoeTargets = [];
    if (ability.aoeFirst) {
      for (const [dc, dr] of [[-1,0],[1,0],[0,-1],[0,1]]) {
        const c = unit.col + dc, r = unit.row + dr;
        if (c < 0 || c >= COLS || r < 0 || r >= ROWS) continue;
        const occ = this.unitMap.get(`${c},${r}`);
        if (occ?.team === 'enemy' && !occ.isDead) aoeTargets.push(occ);
      }
    }

    // Cancel only if truly nothing to hit
    if (targets.length === 0 && aoeTargets.length === 0) {
      this.hideActionMenu();
      this.showActionMenu(unit);
      return;
    }

    if (unit.portrait && unit.team === 'player') unit.facing = dcol >= 0 ? 'right' : 'left';
    this.playAttackAnim(unit, ability.id);
    this.consumeAbilityResource(unit, ability);

    const partnerAtkMult = this.partnerAttackMultiplier(unit);
    const applyHit = (target, mult) => {
      let dmg = Math.round(calcAtk(unit) * mult * designationMultiplier(unit, target, ability) * elementMultiplier(unit, target) * partnerAtkMult);
      dmg = Math.round(dmg * this.partnerDefenseMultiplier(target));
      target.hp = Math.max(0, target.hp - dmg);
      const { x, y } = this.gridToScreen(target.col, target.row);
      this.showDamage(x, y + TH2, dmg, '#ffaa22');
      if (target.sprite) {
        target.sprite.setTint(0xff3300);
        this.time.delayedCall(180, () => {
          if (!target.isDead && target.sprite) {
            if (target.enemyTint) target.sprite.setTint(target.enemyTint);
            else target.sprite.clearTint();
          }
        });
      }
      if (target.hp <= 0) this.killUnit(target);
    };

    // Phase 1: AoE adjacent hits
    for (const target of aoeTargets) applyHit(target, ability.multiplier);

    // Phase 2: directional hits
    for (const { unit: target, dist } of targets) {
      let mult;
      if (ability.scaleByDist) {
        const { min, max, maxRange } = ability.scaleByDist;
        mult = Math.min(max, min + (dist - 1) * (max - min) / Math.max(1, maxRange - 1));
      } else {
        mult = ability.multiplier ?? 1.0;
      }
      applyHit(target, mult);
    }

    // Run Through: move unit along the path after dealing damage
    if (ability.moveThrough) {
      let landCol = unit.col, landRow = unit.row;
      for (let step = 1; step <= maxR; step++) {
        const c = unit.col + dcol * step, r = unit.row + drow * step;
        if (c < 0 || c >= COLS || r < 0 || r >= ROWS) break;
        const occ = this.unitMap.get(`${c},${r}`);
        if (occ?.team === 'player') break;
        if (!occ) { landCol = c; landRow = r; }
      }
      // If all tiles were enemies, try one beyond the last
      if (landCol === unit.col && landRow === unit.row) {
        const bc = unit.col + dcol * (maxR + 1), br = unit.row + drow * (maxR + 1);
        if (bc >= 0 && bc < COLS && br >= 0 && br < ROWS && !this.unitMap.has(`${bc},${br}`)) {
          landCol = bc; landRow = br;
        }
      }
      if (landCol !== unit.col || landRow !== unit.row) this.moveUnit(unit, landCol, landRow);
      else unit.hasMoved = true;
    } else if (ability.consumesMove) {
      unit.hasMoved = true;
    }

    this.hideActionMenu();
    this.redraw();
    this.finishAbilityTurn(unit);
  }

  executeSelfAbility(ability) {
    const unit = this.selectedUnit;
    this.consumeAbilityResource(unit, ability);

    if (ability.effect === 'moveBuff') {
      unit.moveSpeed += ability.moveBonus;
      this.moveRange = this.getReachableTiles(unit);
      const { x, y } = this.gridToScreen(unit.col, unit.row);
      this.showEffect(x, y + TH2, `+${ability.moveBonus} MOV`, '#44ffaa');
    } else if (ability.effect === 'atkBuff') {
      unit.atkBuff = (unit.atkBuff ?? 1.0) * (1 + ability.atkMultiplier);
      const { x, y } = this.gridToScreen(unit.col, unit.row);
      this.showEffect(x, y + TH2, `+${Math.round(ability.atkMultiplier * 100)}% ATK`, '#ffcc44');
    } else if (ability.effect === 'dodge') {
      unit.dodgeReady = true;
      const { x, y } = this.gridToScreen(unit.col, unit.row);
      this.showEffect(x, y + TH2, 'READY', '#66ddff');
    } else if (ability.effect === 'overdrive') {
      unit.overdriveTurns = ability.duration;
      unit.overdriveBase = { speed: unit.speed, strength: unit.strength, stamina: unit.stamina, endurance: unit.endurance };
      const boost = ability.statBoost ?? 10;
      unit.speed     += boost;
      unit.strength  += boost;
      unit.stamina   += boost;
      unit.endurance += boost;
      const { x, y } = this.gridToScreen(unit.col, unit.row);
      this.showEffect(x, y + TH2, 'OVERDRIVE', '#ff6644');
    } else if (ability.effect === 'damageReduction') {
      unit.damageReduction = { amount: ability.reduceAmount, turnsLeft: ability.duration };
      const { x, y } = this.gridToScreen(unit.col, unit.row);
      this.showEffect(x, y + TH2, `-${ability.reduceAmount} DMG`, '#88aaff');
    } else if (ability.effect === 'statBuffPermanent') {
      // Now on a repeatable cooldown (was 1-use/battle) — guard against
      // restacking an unbounded number of times in a long battle.
      unit.permanentBuffsApplied ??= new Set();
      const { x, y } = this.gridToScreen(unit.col, unit.row);
      if (unit.permanentBuffsApplied.has(ability.id)) {
        this.showEffect(x, y + TH2, 'ALREADY ACTIVE', '#888899');
      } else {
        unit.permanentBuffsApplied.add(ability.id);
        unit[ability.stat] += ability.amount;
        this.showEffect(x, y + TH2, `+${ability.amount} ${ability.stat.toUpperCase()}`, '#ff8844');
      }
    } else if (ability.effect === 'endure') {
      unit.endureReady = true;
      const { x, y } = this.gridToScreen(unit.col, unit.row);
      this.showEffect(x, y + TH2, 'ENDURE READY', '#ffcc44');
    } else if (ability.effect === 'costReduction') {
      unit.permanentBuffsApplied ??= new Set();
      const { x, y } = this.gridToScreen(unit.col, unit.row);
      if (unit.permanentBuffsApplied.has(ability.id)) {
        this.showEffect(x, y + TH2, 'ALREADY ACTIVE', '#888899');
      } else {
        unit.permanentBuffsApplied.add(ability.id);
        unit.spCostMult = (unit.spCostMult ?? 1.0) * (1 - ability.reducePct);
        this.showEffect(x, y + TH2, `-${Math.round(ability.reducePct * 100)}% SP COST`, '#ffdd44');
      }
    } else if (ability.effect === 'maxHpBuff') {
      unit.permanentBuffsApplied ??= new Set();
      const { x, y } = this.gridToScreen(unit.col, unit.row);
      if (unit.permanentBuffsApplied.has(ability.id)) {
        this.showEffect(x, y + TH2, 'ALREADY ACTIVE', '#888899');
      } else {
        unit.permanentBuffsApplied.add(ability.id);
        const delta = Math.round(unit.maxHp * ability.boostPct);
        unit.maxHp += delta;
        unit.hp += delta;
        this.showEffect(x, y + TH2, `+${delta} MAX HP`, '#44cc66');
      }
    } else if (ability.effect === 'extraTurn') {
      const { x, y } = this.gridToScreen(unit.col, unit.row);
      this.showEffect(x, y + TH2, 'FREESTYLE!', '#ff44cc');
    } else if (ability.hitsAllUnitsOnField) {
      this.castBlitzBall(unit, ability);
    }

    if (ability.effect === 'extraTurn') {
      unit.hasMoved = false;
      unit.hasActed = false;
    } else {
      unit.hasActed = true;
    }
    this.activeAbility = null;
    this.redraw();

    if (unit.hasMoved) {
      this.endUnitTurn(unit);
    } else {
      this.showActionMenu(unit);
    }
  }

  // Blitz Ball: hits every "ball player" within range, on EITHER team, at
  // once — the doc's "per-unit-on-field scaling" (more targets in range =
  // more total damage out of this one cast). ASSUMPTION: this engine's
  // enemies (wolves/boars) carry no sport/class data at all, so there's no
  // way to check whether an enemy is a "ball player" — the closest workable
  // reading of "including enemies" given that gap is to always include
  // every enemy in range unconditionally, while allies are still filtered
  // to actual Ball-classGrouping members. The caster itself is excluded.
  castBlitzBall(unit, ability) {
    const range = ability.range ?? 3;
    const targets = [...this.playerUnits, ...this.enemyUnits].filter(o => {
      if (o === unit || o.isDead) return false;
      if (this.distanceToUnit(unit.col, unit.row, o) > range) return false;
      return o.team === 'enemy' || o.classGrouping === 'Ball';
    });

    const hits = ability.hits ?? 1;
    for (const target of targets) {
      const desigMult = designationMultiplier(unit, target, ability);
      const elemMult = elementMultiplier(unit, target);
      let dmg = 0;
      for (let h = 0; h < hits; h++) dmg += Math.round(calcAtk(unit) * ability.multiplier * desigMult * elemMult);
      dmg = Math.round(dmg * this.partnerDefenseMultiplier(target));
      target.hp = Math.max(0, target.hp - dmg);

      const { x, y } = this.gridToScreen(target.col, target.row);
      this.showDamage(x, y + TH2, dmg, target.team === 'player' ? '#ff5555' : '#ffaa22');
      if (target.sprite) {
        target.sprite.setTint(0xff3300);
        this.time.delayedCall(180, () => {
          if (!target.isDead && target.sprite) {
            if (target.enemyTint) target.sprite.setTint(target.enemyTint);
            else target.sprite.clearTint();
          }
        });
      }
      if (target.team === 'player') {
        target.hitFlash = true;
        this.time.delayedCall(200, () => { target.hitFlash = false; this.redraw(); });
      }
      if (target.hp <= 0) this.killUnit(target);
    }

    const { x, y } = this.gridToScreen(unit.col, unit.row);
    this.showEffect(x, y + TH2, targets.length ? `BLITZ BALL ×${targets.length}` : 'NO TARGETS', '#ff8844');
  }

  showEffect(x, y, text, color) {
    const txt = this.add.text(x, y - 10, text, {
      fontSize: '16px', fontFamily: 'monospace', fontStyle: 'bold',
      color, stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(2000);
    this.tweens.add({
      targets: txt, y: y - 48, duration: 400, ease: 'Power2',
      onComplete: () => {
        this.time.delayedCall(2500, () => {
          this.tweens.add({ targets: txt, alpha: 0, duration: 1000, ease: 'Power1', onComplete: () => txt.destroy() });
        });
      },
    });
  }

  playAttackAnim(attacker, abilityId) {
    if (!attacker.portrait || attacker.team !== 'player') return;
    const spriteKey = spriteKeyForRole(attacker.roleId);
    const anim = `${heroKey(spriteKey)}-attack`;
    if (!this.anims.exists(anim)) return;
    attacker.portrait.play(anim);
    attacker.portrait.once('animationcomplete', () => {
      this.playIdle(attacker, spriteKey);
    });
  }

  // Draws a projectile (arrow or ball, see PROJECTILE_BY_CLASS) flying from
  // attacker to target for ranged attacks, then calls onArrive — used to gate
  // the actual damage application so the hit lands when the projectile does,
  // not before. Own rAF loop rather than a Phaser tween (see moveUnit).
  fireProjectile(attacker, target, type, onArrive) {
    const from = this.gridToScreen(attacker.col, attacker.row);
    const to   = this.gridToScreen(target.col, target.row);
    const fromX = from.x, fromY = from.y + TH2;
    const toX   = to.x,   toY   = to.y + TH2;
    const travelDist = Math.hypot(toX - fromX, toY - fromY);
    const dur = Phaser.Math.Clamp(travelDist * 1.1, 120, 260);
    const angle = Math.atan2(toY - fromY, toX - fromX);

    const gfx = this.add.graphics().setDepth(3000);
    if (type === 'arrow') {
      gfx.lineStyle(2, 0x8a6a3a, 1);
      gfx.lineBetween(-12, 0, 4, 0);
      gfx.fillStyle(0xf0e0a0, 1);
      gfx.fillTriangle(8, 0, -2, -4, -2, 4);
    } else {
      gfx.fillStyle(0xffffff, 1);
      gfx.fillCircle(0, 0, 5);
      gfx.lineStyle(1, 0x333333, 0.9);
      gfx.strokeCircle(0, 0, 5);
    }
    gfx.setRotation(angle);

    const start = performance.now();
    const animate = () => {
      if (!gfx.scene) return;
      const t = Math.min((performance.now() - start) / dur, 1);
      const x = fromX + (toX - fromX) * t;
      const y = fromY + (toY - fromY) * t - Math.sin(t * Math.PI) * 14; // slight arc lift
      gfx.setPosition(x, y);
      if (t < 1) { requestAnimationFrame(animate); return; }
      gfx.destroy();
      onArrive();
    };
    requestAnimationFrame(animate);
  }

  // Return a hero portrait to its looping idle animation (falls back to a
  // static first frame if no idle animation exists for that sprite).
  playIdle(unit, spriteKey) {
    if (!unit.portrait) return;
    const idleAnim = `${heroKey(spriteKey)}-idle`;
    if (this.anims.exists(idleAnim)) unit.portrait.play(idleAnim);
    else unit.portrait.stop().setFrame(firstFrame(spriteKey));
  }

  // Shared tail of an ability use: mark acted, clear targeting state, then
  // either end the unit's turn (if it already moved) or reopen its menu.
  // Callers handle their own redraw/kill-check before calling this.
  //
  // Duo's "attack twice" (2026-07-07 feedback: made always-active) — no
  // longer gated behind having used the free-move-to-partner action first.
  // Whenever a Duo-equipped unit finishes ANY action while beside a sports
  // partner (however it got there — free move, normal move, or already
  // starting adjacent), it gets exactly one bonus follow-up action, once
  // per round (`duoBonusUsed`, reset in startPlayerTurn same as before).
  // Still locks hasMoved=true once granted so the bonus is strictly "attack
  // twice," not "attack twice AND also move" — same balance intent as the
  // original mutually-exclusive design, just decoupled from the free move.
  finishAbilityTurn(attacker) {
    attacker.hasActed = true;
    this.activeAbility = null;
    if (this.hasPassive(attacker, 'duo') && !attacker.duoBonusUsed && this.sportsPartnerAdjacent(attacker)) {
      attacker.duoBonusUsed = true;
      attacker.hasActed = false;
      attacker.hasMoved = true;
      this.showActionMenu(attacker);
      return;
    }
    if (attacker.hasMoved) {
      this.endUnitTurn(attacker);
    } else {
      this.showActionMenu(attacker);
    }
  }

  // Nearest unoccupied orthogonal neighbor of (col,row), or null if all four are taken.
  findFreeTileNear(col, row) {
    for (const [dc, dr] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
      const c = col + dc, r = row + dr;
      if (c < 0 || c >= COLS || r < 0 || r >= ROWS) continue;
      if (!this.unitMap.has(`${c},${r}`)) return { col: c, row: r };
    }
    return null;
  }

  executeAbility(ability, attacker, target) {
    // Track facing toward target
    if (attacker.portrait && attacker.team === 'player') {
      const { x: srcX } = this.gridToScreen(attacker.col, attacker.row);
      const { x: dstX } = this.gridToScreen(target.col, target.row);
      attacker.facing = dstX >= srcX ? 'right' : 'left';
    }
    this.playAttackAnim(attacker, ability.id);

    this.consumeAbilityResource(attacker, ability);

    // Ally-support effects deal no damage — handle and return early.
    if (ability.effect === 'guard') {
      target.guardedBy = attacker;
      const { x, y } = this.gridToScreen(target.col, target.row);
      this.showEffect(x, y + TH2, 'GUARDED', '#66ddff');
      this.redraw();
      this.finishAbilityTurn(attacker);
      return;
    }
    if (ability.effect === 'restoreSp') {
      const restored = Math.round(target.maxSp * ability.restorePct * this.gracefulnessMultiplier(attacker));
      target.sp = Math.min(target.maxSp, target.sp + restored);
      const { x, y } = this.gridToScreen(target.col, target.row);
      this.showEffect(x, y + TH2, `+${restored} SP`, '#4499ff');
      this.redraw();
      this.finishAbilityTurn(attacker);
      return;
    }
    if (ability.effect === 'teleportToAlly') {
      const dest = this.findFreeTileNear(target.col, target.row);
      if (dest) this.moveUnit(attacker, dest.col, dest.row);
      attacker.hasMoved = true;
      this.redraw();
      this.finishAbilityTurn(attacker);
      return;
    }
    // Routine (Performance): ally's ATK +200% for 1 turn — reuses the same
    // atkBuff field/reset-every-player-turn mechanism as the self-cast
    // 'atkBuff' effect below, just applied to an ally instead of the caster.
    if (ability.effect === 'atkBuffAlly') {
      const bonus = ability.atkMultiplier * this.gracefulnessMultiplier(attacker);
      target.atkBuff = (target.atkBuff ?? 1.0) * (1 + bonus);
      const { x, y } = this.gridToScreen(target.col, target.row);
      this.showEffect(x, y + TH2, `+${Math.round(bonus * 100)}% ATK`, '#ffcc44');
      this.redraw();
      this.finishAbilityTurn(attacker);
      return;
    }
    // Refresh (Performance): heals SP+HP by a % in a radius around the
    // clicked ally tile (aoeRadius, default 1 = 3x3), including that ally.
    if (ability.effect === 'restoreSpAndHpPct') {
      const amount = ability.amount * this.gracefulnessMultiplier(attacker);
      const radius = ability.aoeRadius ?? 1;
      const affected = this.playerUnits.filter(o =>
        !o.isDead && Math.abs(o.col - target.col) + Math.abs(o.row - target.row) <= radius
      );
      for (const ally of affected) {
        const hpDelta = Math.round(ally.maxHp * amount);
        const spDelta = Math.round((ally.maxSp ?? 0) * amount);
        ally.hp = Math.min(ally.maxHp, ally.hp + hpDelta);
        ally.sp = Math.min(ally.maxSp ?? ally.sp, (ally.sp ?? 0) + spDelta);
        const { x, y } = this.gridToScreen(ally.col, ally.row);
        this.showEffect(x, y + TH2, `+${hpDelta} HP +${spDelta} SP`, '#44ffaa');
      }
      this.redraw();
      this.finishAbilityTurn(attacker);
      return;
    }

    const dist = this.distanceToUnit(attacker.col, attacker.row, target);

    // Ranged (dist > 1) hits from a sport with natural projectile equipment
    // (see PROJECTILE_BY_CLASS) fly there first — damage lands when the
    // projectile arrives, not before, so e.g. an Archer's arrow visibly
    // travels the distance rather than the target flinching instantly.
    const projectileType = dist > 1 ? PROJECTILE_BY_CLASS[attacker.classGrouping] : null;
    const resolveHit = () => {
      const hits = ability.hits ?? 1;
      const mult = distanceMultiplier(ability, dist);
      const desigMult = designationMultiplier(attacker, target, ability);
      const elemMult = elementMultiplier(attacker, target);
      const partnerAtkMult = this.partnerAttackMultiplier(attacker);
      let dmg = 0;
      for (let h = 0; h < hits; h++) dmg += Math.round(calcAtk(attacker) * mult * desigMult * elemMult * partnerAtkMult);
      dmg = Math.round(dmg * this.partnerDefenseMultiplier(target));
      target.hp  = Math.max(0, target.hp - dmg);

      const { x, y } = this.gridToScreen(target.col, target.row);
      this.showDamage(x, y + TH2, dmg, '#ffaa22');

      if (target.sprite) {
        target.sprite.setTint(0xff3300);
        this.time.delayedCall(180, () => {
          if (!target.isDead && target.sprite) {
            if (target.enemyTint) target.sprite.setTint(target.enemyTint);
            else target.sprite.clearTint();
          }
        });
      }
      if (target.team === 'player') {
        target.hitFlash = true;
        this.time.delayedCall(200, () => { target.hitFlash = false; this.redraw(); });
      }

      // Apply debuff
      if (ability.debuff?.type === 'slow') {
        target.debuffs.push({ type: 'slow', moveReduction: ability.debuff.moveReduction, turnsLeft: ability.debuff.duration });
        const slowTotal = target.debuffs.filter(d => d.type === 'slow').reduce((s, d) => s + d.moveReduction, 0);
        target.moveSpeed = Math.max(1, target.baseMoveSpeed - slowTotal);
        this.showDamage(x, y + TH2 - 22, 'SLOW', '#aaaaff');
      } else if (ability.debuff?.type === 'statDown') {
        const { stat, amount, duration } = ability.debuff;
        target[stat] = Math.max(1, target[stat] - amount);
        target.debuffs.push({ type: 'statDown', stat, amount, turnsLeft: duration });
        this.showDamage(x, y + TH2 - 22, `${stat.toUpperCase()} DOWN`, '#ff88ff');
      }

      if (target.hp > 0) this.triggerSetUpFollowUp(attacker, ability, target);
      if (target.hp <= 0) this.killUnit(target);
      else this.redraw();
      this.finishAbilityTurn(attacker);
    };

    if (projectileType) this.fireProjectile(attacker, target, projectileType, resolveHit);
    else resolveHit();
  }

  // ── Enemy AI ──────────────────────────────────────────────────────────────

  startEnemyTurn() {
    if (this.phase === 'victory' || this.phase === 'defeat') return;
    this.phase = 'enemy_turn';
    this.showPhaseBanner('ENEMY TURN');
    this.redraw();

    const aliveEnemies = this.enemyUnits.filter(e => !e.isDead);
    // SP regen + skill-cooldown tick, mirroring startPlayerTurn's player
    // resource regen (2026-07-09, "monster will need sp as well to use
    // skills") — enemies regen on their OWN turn start, same as players do
    // on theirs.
    for (const e of aliveEnemies) {
      if (e.maxSp != null) e.sp = Math.min(e.maxSp, (e.sp ?? 0) + 1);
      for (const id of Object.keys(e.skillCooldowns ?? {})) {
        e.skillCooldowns[id] = Math.max(0, e.skillCooldowns[id] - 1);
      }
    }
    let i = 0;

    const actNext = () => {
      if (i >= aliveEnemies.length) {
        this.time.delayedCall(400, () => this.startPlayerTurn());
        return;
      }
      this.enemyAct(aliveEnemies[i++]);
      this.redraw();
      this.time.delayedCall(400, actNext);
    };

    this.time.delayedCall(700, actNext);
  }

  startPlayerTurn() {
    if (this.phase === 'victory' || this.phase === 'defeat') return;
    this.turnCount++;
    this.turnText.setText(`Turn ${this.turnCount}`);
    // turnLimit (Ester Academy's "Rock" quest, 2026-07-11, "within 10
    // turns") — a hard turn-count loss, distinct from the normal
    // all-players-dead defeat. Checked here (not checkEndConditions, which
    // only fires off a kill) since running out of turns needs no kill to
    // trigger. turnLimitVictory (Gale's "kill as many monsters as you can
    // in 6 turns" quest, same day) flips this to a WIN on timeout instead
    // — "as many as you can" has no fail state, whatever got killed by
    // the deadline stands.
    if (this.missionCfg?.turnLimit && this.turnCount > this.missionCfg.turnLimit) {
      if (this.missionCfg.turnLimitVictory) {
        this.triggerVictory();
      } else {
        this.phase = 'defeat';
        this.showEndBanner('OUT OF TURNS', '#ff4444');
        this.time.delayedCall(2500, () => this.scene.start('WorldMapScene'));
      }
      return;
    }
    // Reinforcement waves (2026-07-11, "Goblin King"/"Cave Depths" quests)
    // — a mission's initial `enemies` roster already covers its "turn one"
    // wave, so the recurring cadence starts at the NEXT multiple of
    // `every` after turn 1: turnCount 4, 7, 10... for every:3. Hooked here
    // (not startEnemyTurn) so newly-spawned enemies always land on a
    // player-turn boundary — matches "monster count must equal zero
    // DURING PLAYER TURN to win" (Cave Depths): the only turn boundary
    // where enemyUnits' size changes from either direction (kills happen
    // during the player's own turn; spawns happen here) is this one.
    const reinforce = this.missionCfg?.reinforce;
    if (reinforce && this.turnCount > 1 && (this.turnCount - 1) % reinforce.every === 0) {
      this.spawnReinforcements();
    }
    for (const u of this.playerUnits) {
      if (!u.isDead) {
        u.isDone = false;
        u.hasActed = false;
        u.hasMoved = false;
        u.sp = Math.min(u.maxSp, u.sp + 1);
        u.moveSpeed = u.baseMoveSpeed; // reset move buff
        u.atkBuff   = 1.0;            // reset atk buff
        u.setUpUsedThisTurn = false;  // Set Up's "-50% dmg taken, 1×/turn" cap
        u.duoFreeMoveUsed = false;    // Duo's free move to partner, once/round
        u.duoBonusUsed = false;       // Duo's "attack twice" bonus, once/round
        if (u.overdriveTurns > 0) {
          u.overdriveTurns--;
          if (u.overdriveTurns <= 0 && u.overdriveBase) {
            Object.assign(u, u.overdriveBase);
            u.overdriveBase = null;
          }
        }
        if (u.damageReduction) {
          u.damageReduction.turnsLeft--;
          if (u.damageReduction.turnsLeft <= 0) u.damageReduction = null;
        }
        for (const id of Object.keys(u.skillCooldowns ?? {})) {
          u.skillCooldowns[id] = Math.max(0, u.skillCooldowns[id] - 1);
        }
      }
    }
    // Tick enemy debuffs — revert statDown stat reductions exactly on expiry
    for (const e of this.enemyUnits) {
      if (!e.debuffs?.length) continue;
      for (const d of e.debuffs) d.turnsLeft--;
      const stillActive = [];
      for (const d of e.debuffs) {
        if (d.turnsLeft > 0) stillActive.push(d);
        else if (d.type === 'statDown') e[d.stat] += d.amount;
      }
      e.debuffs = stillActive;
      const slowTotal = e.debuffs.filter(d => d.type === 'slow').reduce((s, d) => s + d.moveReduction, 0);
      e.moveSpeed = Math.max(1, e.baseMoveSpeed - slowTotal);
    }
    this.phase = 'player_turn';
    this.selectedUnit = null;
    this.moveRange = new Set();
    this.showPhaseBanner('PLAYER TURN');
    this.redraw();
  }

  enemyAct(wolf) {
    // noAttack (Ester Academy's "Rock" quest, 2026-07-11) — a stationary
    // punching-bag target that never moves or fights back.
    if (wolf.noAttack) return;
    const target = wolf.corrupted ? this.getCorruptedTarget() : this.nearestPlayer(wolf);
    if (!target) return;

    // Find path to target
    const path = this.bfsPath(wolf.col, wolf.row, target.col, target.row);
    if (!path) return;

    const size = wolf.size ?? 1;
    if (size <= 1) {
      // Move up to moveSpeed steps, never walking into target's tile
      for (let i = 0; i < path.length - 1 && i < wolf.moveSpeed; i++) {
        const { col, row } = path[i];
        const nk = `${col},${row}`;
        if (this.unitMap.has(nk)) break;
        this.unitMap.delete(`${wolf.col},${wolf.row}`);
        wolf.col = col; wolf.row = row;
        this.unitMap.set(nk, wolf);
      }
    } else {
      // Multi-tile mover (King Wolf) — bfsPath itself is 1-wide/single-tile
      // (fine for finding an approach DIRECTION, since escort wolves are
      // the only clutter nearby), but each step here re-checks that the
      // WHOLE size×size block fits before committing — a step that would
      // squeeze the blob somewhere too narrow just stops the walk early,
      // same "give up rather than corrupt state" fallback the size-1
      // branch already has for a single blocked tile.
      for (let i = 0; i < path.length - 1 && i < wolf.moveSpeed; i++) {
        const { col, row } = path[i];
        if (!this.blockFits(col, row, size, wolf)) break;
        this.unregisterUnit(wolf);
        wolf.col = col; wolf.row = row;
        this.registerUnit(wolf);
      }
    }
    if (wolf.sprite) {
      const { x, y } = this.footprintScreenPos(wolf);
      wolf.sprite.setPosition(x, y + TH2).setDepth((wolf.col + wolf.row) * 10 + 5);
    }

    // 2026-07-09 ("monster will need sp as well to use skills") — try an
    // equipped attack skill first (it may reach targets a plain adjacent
    // basic attack can't, e.g. a Ranged-designation monster's Tri-Throw at
    // range 5); only fall back to the basic attack below if no skill was
    // usable/in-range this turn.
    if (this.tryEnemySkill(wolf)) return;

    // Attack any adjacent player
    const targets = this.getAttackTargets(wolf);
    if (targets.length > 0) {
      // Prefer the original target if adjacent, else first available
      const t = targets.find(t => t.col === target.col && t.row === target.row) || targets[0];
      const enemy = this.unitMap.get(`${t.col},${t.row}`);
      if (enemy && !enemy.isDead) this.doAttack(wolf, enemy);
    }
  }

  // Picks the first equipped, currently-usable, damage-dealing skill with
  // an in-range hostile target and casts it. Scoped to targetType:'enemy'
  // abilities with a numeric `multiplier` — the only kind that's ever
  // meaningfully "an attack skill" (support-only skills like Shield have
  // no wired ally-support engine either, matching the player side's own
  // still-decorative shieldPct — see [[project_ability_revised]]).
  // Returns true if a skill was cast (caller should skip its basic attack).
  tryEnemySkill(attacker) {
    const kit = attacker.abilities;
    if (!kit || !kit.length) return false;
    const hostiles = attacker.team === 'enemy' ? this.playerUnits : this.enemyUnits;
    for (const entry of kit) {
      const ab = entry.ability;
      if (!ab || ab.targetType !== 'enemy' || typeof ab.multiplier !== 'number') continue;
      if (!this.abilityUsable(attacker, ab)) continue;
      if (ab.requiresRecentHit && !attacker.recentlyHit) continue;
      const range = ab.range ?? 1;
      let candidates = hostiles.filter(u => !u.isDead && this.distanceToUnit(attacker.col, attacker.row, u) <= range);
      if (ab.atMaxRangeOnly) candidates = candidates.filter(u => this.distanceToUnit(attacker.col, attacker.row, u) === range);
      if (!candidates.length) continue;
      candidates.sort((a, b) => this.distanceToUnit(attacker.col, attacker.row, a) - this.distanceToUnit(attacker.col, attacker.row, b));
      this.enemySkillAttack(attacker, ab, candidates[0]);
      return true;
    }
    return false;
  }

  // Damage-skill cast for enemy AI — same formula as executeAbility's
  // resolveHit, minus the player-only turn bookkeeping (facing/portrait,
  // projectile visuals, finishAbilityTurn's showActionMenu/endUnitTurn),
  // none of which apply to an AI-controlled unit.
  enemySkillAttack(attacker, ability, target) {
    this.consumeAbilityResource(attacker, ability);

    const dist = this.distanceToUnit(attacker.col, attacker.row, target);
    const hits = ability.hits ?? 1;
    const mult = distanceMultiplier(ability, dist);
    const desigMult = designationMultiplier(attacker, target, ability);
    const elemMult = elementMultiplier(attacker, target);
    const partnerAtkMult = this.partnerAttackMultiplier(attacker);
    let dmg = 0;
    for (let h = 0; h < hits; h++) dmg += Math.round(calcAtk(attacker) * mult * desigMult * elemMult * partnerAtkMult);
    dmg = Math.round(dmg * this.partnerDefenseMultiplier(target));
    if (attacker.oneShotKill) dmg = target.hp; // see doAttack's oneShotKill comment
    target.hp = Math.max(0, target.hp - dmg);

    const { x, y } = this.gridToScreen(target.col, target.row);
    this.showDamage(x, y + TH2, dmg, '#ff8844');

    if (target.sprite) {
      target.sprite.setTint(0xff2222);
      this.time.delayedCall(180, () => {
        if (!target.isDead && target.sprite) {
          if (target.enemyTint) target.sprite.setTint(target.enemyTint);
          else target.sprite.clearTint();
        }
      });
    }
    if (target.team === 'player') {
      target.hitFlash = true;
      this.time.delayedCall(200, () => { target.hitFlash = false; this.redraw(); });
    }

    if (ability.debuff?.type === 'slow') {
      target.debuffs.push({ type: 'slow', moveReduction: ability.debuff.moveReduction, turnsLeft: ability.debuff.duration });
      const slowTotal = target.debuffs.filter(d => d.type === 'slow').reduce((s, d) => s + d.moveReduction, 0);
      target.moveSpeed = Math.max(1, target.baseMoveSpeed - slowTotal);
      this.showDamage(x, y + TH2 - 22, 'SLOW', '#aaaaff');
    } else if (ability.debuff?.type === 'statDown') {
      const { stat, amount, duration } = ability.debuff;
      target[stat] = Math.max(1, target[stat] - amount);
      target.debuffs.push({ type: 'statDown', stat, amount, turnsLeft: duration });
      this.showDamage(x, y + TH2 - 22, `${stat.toUpperCase()} DOWN`, '#ff88ff');
    }

    if (target.hp <= 0) this.killUnit(target);
    else this.redraw();
  }

  nearestPlayer(wolf) {
    let best = null, bestDist = Infinity;
    for (const p of this.playerUnits) {
      if (p.isDead) continue;
      const d = Math.abs(p.col - wolf.col) + Math.abs(p.row - wolf.row);
      if (d < bestDist) { best = p; bestDist = d; }
    }
    return best;
  }

  // The Corrupted One's monsters (M6) read as "something is guiding them" by
  // sharing a single locked target for the WHOLE battle instead of each
  // picking their own nearest hero — every corrupted enemy paths toward and
  // piles onto whoever this returns. Locks onto the lowest-current-HP alive
  // hero the first time it's called, then keeps returning that same unit
  // every subsequent turn (cheapest kill, and reads as focused/deliberate
  // rather than random) until it dies, at which point the next call re-locks
  // onto the new lowest-HP survivor.
  getCorruptedTarget() {
    if (this.corruptedTarget && !this.corruptedTarget.isDead) return this.corruptedTarget;
    let best = null;
    for (const p of this.playerUnits) {
      if (p.isDead) continue;
      if (!best || p.hp < best.hp) best = p;
    }
    this.corruptedTarget = best;
    return best;
  }

  bfsPath(fromCol, fromRow, toCol, toRow) {
    const visited = new Set([`${fromCol},${fromRow}`]);
    const queue = [{ col: fromCol, row: fromRow, path: [] }];

    while (queue.length) {
      const { col, row, path } = queue.shift();
      for (const [dc, dr] of [[-1,0],[1,0],[0,-1],[0,1]]) {
        const nc = col + dc, nr = row + dr;
        const nk = `${nc},${nr}`;
        if (!this.inBounds({ col: nc, row: nr }) || visited.has(nk)) continue;
        visited.add(nk);
        const newPath = [...path, { col: nc, row: nr }];
        if (nc === toCol && nr === toRow) return newPath;
        if (!this.unitMap.has(nk)) queue.push({ col: nc, row: nr, path: newPath });
      }
    }
    return null;
  }

  getReachableTiles(unit) {
    const reachable = new Set();
    const visited = new Map([[`${unit.col},${unit.row}`, 0]]);
    const queue = [{ col: unit.col, row: unit.row, dist: 0 }];

    while (queue.length) {
      const { col, row, dist } = queue.shift();
      if (dist > 0) reachable.add(`${col},${row}`);
      if (dist >= unit.moveSpeed) continue;
      for (const [dc, dr] of [[-1,0],[1,0],[0,-1],[0,1]]) {
        const nc = col + dc, nr = row + dr;
        const nk = `${nc},${nr}`;
        if (!this.inBounds({ col: nc, row: nr }) || visited.has(nk)) continue;
        visited.set(nk, dist + 1);
        queue.push({ col: nc, row: nr, dist: dist + 1 });
      }
    }
    return reachable;
  }

  // Every neighbor tile adjacent to ANY tile `unit` occupies, deduped and
  // excluding the unit's own footprint — for a plain size-1 unit this is
  // just its usual 4 orthogonal neighbors. Generalizes the old
  // single-tile-only version so a multi-tile unit (King Wolf) both finds
  // adjacent enemies from any of its own tiles AND is correctly found by
  // an adjacent enemy checking ITS neighbors (that direction already worked
  // before this generalization, since it's a plain unitMap lookup keyed by
  // whichever tile is adjacent — see registerUnit).
  getAttackTargets(unit) {
    const own = new Set(this.occupiedTiles(unit).map(t => `${t.col},${t.row}`));
    const seen = new Set();
    const targets = [];
    for (const { col, row } of this.occupiedTiles(unit)) {
      for (const [dc, dr] of [[-1,0],[1,0],[0,-1],[0,1]]) {
        const nc = col + dc, nr = row + dr;
        const nk = `${nc},${nr}`;
        if (own.has(nk) || seen.has(nk)) continue;
        seen.add(nk);
        const occ = this.unitMap.get(nk);
        if (occ && occ.team !== unit.team && !occ.isDead) targets.push({ col: nc, row: nr });
      }
    }
    return targets;
  }

  // ── Multi-tile units (King Wolf, 2026-07-08 feedback: "should take up 4
  // spaces, units can move within them") ──────────────────────────────────
  // unit.size (default 1) is an NxN footprint anchored at unit.col/row as
  // its top-left corner. Scoped narrowly to King Wolf, not a general "large
  // unit" system — every other monster/player unit stays plain size-1 and
  // every helper here degrades to the old single-tile behavior for them.
  occupiedTiles(unit) {
    const size = unit.size ?? 1;
    if (size <= 1) return [{ col: unit.col, row: unit.row }];
    const tiles = [];
    for (let dc = 0; dc < size; dc++) {
      for (let dr = 0; dr < size; dr++) tiles.push({ col: unit.col + dc, row: unit.row + dr });
    }
    return tiles;
  }

  // Manhattan distance from (col,row) to the NEAREST tile `unit` occupies —
  // equal to the old plain `|col-unit.col|+|row-unit.row|` for size-1 units,
  // but correct for King Wolf: attacking it from a tile adjacent to one of
  // its far corners (not its stored col/row anchor specifically) must read
  // as range 1, not the anchor's own (possibly much longer) distance.
  distanceToUnit(col, row, unit) {
    let best = Infinity;
    for (const t of this.occupiedTiles(unit)) {
      const d = Math.abs(col - t.col) + Math.abs(row - t.row);
      if (d < best) best = d;
    }
    return best;
  }

  registerUnit(unit) {
    for (const { col, row } of this.occupiedTiles(unit)) this.unitMap.set(`${col},${row}`, unit);
  }

  // Only clears a tile if THIS unit is still the one registered there —
  // guards against a stale unregister call ever clobbering a different
  // unit that has since moved into one of these tiles.
  unregisterUnit(unit) {
    for (const { col, row } of this.occupiedTiles(unit)) {
      const key = `${col},${row}`;
      if (this.unitMap.get(key) === unit) this.unitMap.delete(key);
    }
  }

  // Centered screen position for a unit's footprint — gridToScreen's linear
  // formula tolerates fractional col/row fine, so this is just the
  // footprint's midpoint (equal to gridToScreen(unit.col, unit.row) for the
  // plain size-1 case).
  footprintScreenPos(unit) {
    const size = unit.size ?? 1;
    return this.gridToScreen(unit.col + (size - 1) / 2, unit.row + (size - 1) / 2);
  }

  // Does a size×size block anchored at (col,row) fit entirely on the board
  // with every tile free (or occupied only by `ignoreUnit` itself, e.g. the
  // mover's own current tiles while test-stepping)? Used by enemyAct's
  // multi-tile movement branch.
  blockFits(col, row, size, ignoreUnit) {
    for (let dc = 0; dc < size; dc++) {
      for (let dr = 0; dr < size; dr++) {
        const c = col + dc, r = row + dr;
        if (!this.inBounds({ col: c, row: r })) return false;
        const occ = this.unitMap.get(`${c},${r}`);
        if (occ && occ !== ignoreUnit) return false;
      }
    }
    return true;
  }

  // ── Banners ───────────────────────────────────────────────────────────────

  showPhaseBanner(text) {
    const { width, height } = this.scale;
    const banner = this.add.text(width / 2, height / 2, text, {
      fontSize: '32px', fontFamily: 'Georgia, serif', fontStyle: 'bold',
      color: '#ffffff', stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(2100).setAlpha(0);

    // Phaser 4 tweens don't run in scene.start() context — use native timers
    const fadeIn = (start) => {
      const elapsed = performance.now() - start;
      const t = Math.min(elapsed / 250, 1);
      if (!banner.scene) return;
      banner.setAlpha(t);
      if (t < 1) requestAnimationFrame(() => fadeIn(start));
      else setTimeout(() => fadeOut(performance.now()), 600);
    };
    const fadeOut = (start) => {
      const elapsed = performance.now() - start;
      const t = Math.min(elapsed / 350, 1);
      if (!banner.scene) return;
      banner.setAlpha(1 - t);
      if (t < 1) requestAnimationFrame(() => fadeOut(start));
      else banner.destroy();
    };
    requestAnimationFrame(() => fadeIn(performance.now()));
  }

  showEndBanner(text, color) {
    const { width, height } = this.scale;
    this.add.text(width / 2, height / 2, text, {
      fontSize: '52px', fontFamily: 'Georgia, serif', fontStyle: 'bold', color,
      stroke: '#000000', strokeThickness: 6,
    }).setOrigin(0.5).setDepth(3000);
  }

  // ── Grid geometry ─────────────────────────────────────────────────────────

  gridToScreen(col, row) {
    return {
      x: this.originX + (col - row) * TW2,
      y: this.originY + (col + row) * TH2,
    };
  }

  screenToGrid(sx, sy) {
    const rx = sx - this.originX, ry = sy - this.originY;
    return {
      col: Math.floor((rx / TW2 + ry / TH2) / 2),
      row: Math.floor((ry / TH2 - rx / TW2) / 2),
    };
  }

  inBounds({ col, row }) { return col >= 0 && col < COLS && row >= 0 && row < ROWS; }

  // Touch taps on a unit are easy to miss with raw screenToGrid() math: unit
  // sprites/portraits stand taller than their own tile's isometric diamond
  // footprint (art extends up and to the sides of the actual hit-tested
  // area, especially near the board's edge where a tap above a unit's head
  // can compute to an out-of-bounds tile entirely), so a natural finger-tap
  // on the visible body of a unit can land well outside that tile's own
  // math bounds. Pure pixel-proximity to each unit's actual on-screen
  // position (biased toward the visible sprite body, not the tile center)
  // — first close-enough unit wins over whatever the raw math said.
  snapToNearbyUnit(sx, sy, rawTile) {
    // Was 40 — LARGER than the ~36px distance between adjacent tile
    // centers (see the isometric TW2/TH2 math), so literally every tile
    // touching a unit fell inside its snap zone, and two adjacent units'
    // zones overlapped almost entirely (2026-07-07 feedback: "selecting
    // units when they are close together" didn't register reliably —
    // whichever unit was marginally closer always won, but the margin was
    // often sub-pixel). 24px still comfortably forgives a tap landing
    // above a tall sprite's own tile (the reason this exists at all) without
    // swallowing an entire neighboring tile by default.
    const SNAP_RADIUS = 24;
    let best = null, bestDist = SNAP_RADIUS;
    for (const u of [...this.playerUnits, ...this.enemyUnits]) {
      if (u.isDead) continue;
      const { x, y } = this.gridToScreen(u.col, u.row);
      // Bias toward the visible sprite's body, not the tile's own center —
      // portraits stand at y + TH2 + 10 with a bottom-heavy origin (0.5, 0.92).
      const d = Math.hypot(sx - x, sy - (y + TH2 - 15));
      if (d < bestDist) { bestDist = d; best = u; }
    }
    return best ? { col: best.col, row: best.row } : rawTile;
  }

  // ── Draw ──────────────────────────────────────────────────────────────────

  // Pooled per-tile Graphics objects so each highlight diamond can sit at its
  // own depth (col+row)*10+2 — above that tile's ground image (depth
  // (col+row)*10) but below whatever stands on it (unit sprites/portraits sit
  // at (col+row)*10+5/+6) — matching the tile's own top-face position exactly
  // (same TILE_Y_OFFSET the tile image uses) instead of one flat-depth layer
  // that used to draw above every sprite on the board.
  nextHlGfx(depth) {
    let g = this.hlPool[this.hlPoolIndex];
    if (!g) { g = this.add.graphics(); this.hlPool.push(g); }
    g.clear();
    g.setDepth(depth);
    this.hlPoolIndex++;
    return g;
  }

  drawDiamond(col, row, color, alpha) {
    const { x, y: y0 } = this.gridToScreen(col, row);
    // Nudged past TILE_Y_OFFSET (which only matches the ground-tile art) so the
    // diamond's widest point lines up with where unit sprites actually stand.
    const y = y0 + TILE_Y_OFFSET + HL_Y_ADJUST;
    const g = this.nextHlGfx((col + row) * 10 + 2);
    g.fillStyle(color, alpha);
    g.fillPoints([
      { x, y },
      { x: x + TW2, y: y + TH2 },
      { x, y: y + TILE_H },
      { x: x - TW2, y: y + TH2 },
    ], true);
  }

  redraw() {
    this.hlPoolIndex = 0;
    this.wolfHpGfx.clear();

    const selectedKey = this.selectedUnit ? `${this.selectedUnit.col},${this.selectedUnit.row}` : null;
    const hovKey      = this.hoveredTile  ? `${this.hoveredTile.col},${this.hoveredTile.row}`  : null;

    // Move range: full highlight when picking tile, dim preview in menu.
    // duo_targeting (Duo's free-move tile pick) is treated like
    // unit_selected — actively waiting for a tile click, not just previewing.
    if (this.phase === 'unit_selected' || this.phase === 'unit_menu' || this.phase === 'duo_targeting') {
      const dimmed = this.phase === 'unit_menu';
      for (const key of this.moveRange) {
        if (this.unitMap.has(key)) continue;
        const [col, row] = key.split(',').map(Number);
        this.drawDiamond(col, row, key === hovKey ? 0x9edaff : 0x88aaff, dimmed ? 0.18 : 0.4);
      }
    }

    // Directional ability highlight — show tiles in all 4 directions, mark enemies
    if (this.phase === 'directional_targeting' && this.selectedUnit && this.activeAbility) {
      const { col: uc, row: ur } = this.selectedUnit;
      const maxR = this.activeAbility.maxRange ?? 5;
      // AoE adjacent ring (Tackle Kick phase 1) — always highlighted
      if (this.activeAbility.aoeFirst) {
        for (const [dc, dr] of [[-1,0],[1,0],[0,-1],[0,1]]) {
          const col = uc + dc, row = ur + dr;
          if (col < 0 || col >= COLS || row < 0 || row >= ROWS) continue;
          const occ = this.unitMap.get(`${col},${row}`);
          const isTarget = occ?.team === 'enemy' && !occ.isDead;
          this.drawDiamond(col, row, isTarget ? 0xff2200 : 0xffaa33, isTarget ? 0.7 : 0.32);
        }
      }
      // Directional lines
      for (const [dc, dr] of [[0,-1],[0,1],[-1,0],[1,0]]) {
        for (let step = 1; step <= maxR; step++) {
          const col = uc + dc * step, row = ur + dr * step;
          if (col < 0 || col >= COLS || row < 0 || row >= ROWS) break;
          const occ = this.unitMap.get(`${col},${row}`);
          const isTarget = occ?.team === 'enemy' && !occ.isDead;
          this.drawDiamond(col, row, isTarget ? 0xff4400 : 0xffaa33, isTarget ? 0.55 : 0.3);
          if (occ) break;
        }
      }
    }

    // Ability/skill range highlight — every tile the selected ability can
    // reach lights up in amber, so the range is visible before picking a
    // target; a ring (not a filled diamond) for exact-range abilities like
    // 3-Point since abilityRangeMatches already enforces dist === exactRange.
    if (this.phase === 'ability_targeting' && this.selectedUnit && this.activeAbility) {
      const { col: uc, row: ur } = this.selectedUnit;
      for (let col = 0; col < COLS; col++) {
        for (let row = 0; row < ROWS; row++) {
          const dist = Math.abs(col - uc) + Math.abs(row - ur);
          if (dist < 1 || !this.abilityRangeMatches(this.selectedUnit, this.activeAbility, dist)) continue;
          const occ = this.unitMap.get(`${col},${row}`);
          const isTarget = occ?.team === this.activeAbility.targetType;
          this.drawDiamond(col, row, isTarget ? 0xff8800 : 0xffaa33, isTarget ? 0.55 : 0.32);
        }
      }
    }

    // Selected tile — skip if the occupant has a portrait (the sprite IS the indicator)
    if (selectedKey) {
      const selOcc = this.unitMap.get(selectedKey);
      if (!selOcc?.portrait) {
        const [col, row] = selectedKey.split(',').map(Number);
        this.drawDiamond(col, row, 0xffd700, 0.5);
      }
    }

    // Hover — skip portrait-unit tiles to avoid double-image bleed
    if (hovKey && !this.moveRange.has(hovKey) && hovKey !== selectedKey) {
      const hovOcc = this.unitMap.get(hovKey);
      if (!hovOcc?.portrait) {
        this.drawDiamond(this.hoveredTile.col, this.hoveredTile.row, 0x9edaff, 0.3);
      }
    }

    // Unit tile shading — every player tile shows blue (brighter when selected,
    // darker once the unit is done for the turn), every enemy tile shows dark red.
    for (const u of this.playerUnits) {
      if (u.isDead) continue;
      if (u === this.selectedUnit)   this.drawDiamond(u.col, u.row, 0x55bbff, 0.55);
      else if (u.isDone)             this.drawDiamond(u.col, u.row, 0x152a52, 0.4);
      else                           this.drawDiamond(u.col, u.row, 0x2a6fdb, 0.4);
    }
    for (const e of this.enemyUnits) {
      if (e.isDead) continue;
      this.drawDiamond(e.col, e.row, 0x8b1a1a, 0.4);
    }

    // Player unit circles + HP bars
    for (const u of this.playerUnits) {
      if (u.isDead) continue;
      const { x, y } = this.gridToScreen(u.col, u.row);
      const cx = x, cy = y + TH2;
      const alpha = u.isDone ? 0.4 : 1;

      u.gfx.clear();

      if (u.portrait) {
        const depth = (u.col + u.row) * 10 + 6;
        if (!u.isMoving) u.portrait.setPosition(cx, cy + 10).setDepth(depth);
        u.portrait.setAlpha(u.hitFlash ? 0.3 : alpha);
      } else {
        u.gfx.fillStyle(0x000000, 0.25 * alpha);
        u.gfx.fillEllipse(cx, cy + 4, 30, 10);
        u.gfx.fillStyle(u.hitFlash ? 0xff4444 : u.color, alpha);
        u.gfx.fillCircle(cx, cy, 12);
        if (u === this.selectedUnit) {
          u.gfx.lineStyle(2, 0xffffff, 1);
          u.gfx.strokeCircle(cx, cy, 12);
        }
      }
      // HP bar
      const bw = 40, bh = 5, bx = cx - bw / 2, by = cy + (u.portrait ? 22 : 16);
      u.gfx.fillStyle(0x000000, 0.6);
      u.gfx.fillRect(bx - 1, by - 1, bw + 2, bh + 2);
      u.gfx.fillStyle(0x1a1a1a, 1);
      u.gfx.fillRect(bx, by, bw, bh);
      u.gfx.fillStyle(0x33dd55, 1);
      u.gfx.fillRect(bx, by, bw * (u.hp / u.maxHp), bh);
      // SP bar
      u.gfx.fillStyle(0x000000, 0.6);
      u.gfx.fillRect(bx - 1, by + bh + 2, bw + 2, bh + 2);
      u.gfx.fillStyle(0x0d0d22, 1);
      u.gfx.fillRect(bx, by + bh + 3, bw, bh);
      u.gfx.fillStyle(0x3388ff, 1);
      u.gfx.fillRect(bx, by + bh + 3, bw * (u.sp / u.maxSp), bh);

      u.label.setPosition(cx, cy).setAlpha(u.isDone ? 0.5 : 1);
    }

    // Wolf HP bars + level labels
    for (const e of this.enemyUnits) {
      if (e.isDead) continue;
      const { x, y } = this.gridToScreen(e.col, e.row);
      const bw = 44, bh = 5, bx = x - bw / 2, by = y + TH2 - 52;
      this.wolfHpGfx.fillStyle(0x000000, 0.6);
      this.wolfHpGfx.fillRect(bx - 1, by - 1, bw + 2, bh + 2);
      this.wolfHpGfx.fillStyle(0x1a1a1a, 1);
      this.wolfHpGfx.fillRect(bx, by, bw, bh);
      this.wolfHpGfx.fillStyle(0xdd3333, 1);
      this.wolfHpGfx.fillRect(bx, by, bw * (e.hp / e.maxHp), bh);
      if (e.lvLabel) e.lvLabel.setPosition(x, by - 12);
      if (e.auraGfx) e.auraGfx.setPosition(x, y + TH2).setDepth(Math.max(0, (e.col + e.row) * 10 + 4));
    }

    // Info text
    const u = this.selectedUnit;
    this.infoText.setText(
      u                             ? `${u.name.split(' ')[0].toUpperCase()}  ·  HP ${u.hp}/${u.maxHp}  ·  SP ${u.sp}/${u.maxSp}  ·  Mv ${u.moveSpeed}`
      : this.phase === 'enemy_turn' ? 'Enemy turn...'
      :                               ''
    );

    // Action hint
    const hints = {
      player_turn:      'Select a unit',
      unit_menu:        'Choose an action  |  Tap elsewhere to dismiss',
      unit_selected:    'Select a tile to move to  |  Tap unit to reopen menu',
      ability_targeting:'Tap a target  |  Tap empty tile to cancel',
      directional_targeting:'Tap a highlighted tile to fire that direction  |  Tap elsewhere to cancel',
      enemy_turn:       '', victory: '', defeat: '',
    };
    this.actionHint.setText(hints[this.phase] ?? '');

    // Clear any pooled highlight graphics left over from a frame that used more tiles
    for (let i = this.hlPoolIndex; i < this.hlPool.length; i++) this.hlPool[i].clear();
  }
}
