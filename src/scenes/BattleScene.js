import Phaser from 'phaser';
import {
  state, effectiveStats, maxHp as gsMaxHp, elementIcon, currentRoleId, currentDesignations,
  currentSport, sportById,
  DESIGNATION_BEATS, designationIcon, DESIGNATION_CYCLE, ELEMENT_CYCLE, ELEMENT_BEATS,
} from '../data/gameState.js';
import { ATTACK, THROW, getUnitSpecials, getUnitSkills, getEquippedPassives } from '../data/abilities.js';
import { loadHeroSprites, createHeroAnims, stripHeroBackground, heroKey, getSpriteInfo, firstFrame, spriteKeyForRole } from '../data/heroSprites.js';

const COLS = 10, ROWS = 10;
const TILE_W = 64, TILE_H = 32;
const TW2 = TILE_W / 2, TH2 = TILE_H / 2;
const TILE_Y_OFFSET = -4;

const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// Kingdom archetypes: monsters skew heavily toward their kingdom's two primary
// stats and two elements — rerolled fresh for every encounter. "Ice" reuses the
// existing Water element (no separate Ice element defined yet).
const REGION_ARCHETYPES = {
  Altroes: { primary: ['speed', 'strength'],    secondary: ['stamina', 'endurance'], elements: ['Lightning', 'Fire'] },
  Lametus: { primary: ['stamina', 'endurance'], secondary: ['speed', 'strength'],    elements: ['Wind', 'Earth'] },
  Gale:    { primary: ['endurance', 'strength'],secondary: ['speed', 'stamina'],     elements: ['Wind', 'Water'] },
};
const PRIMARY_STAT_BOOST = 1.3;
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

// Stage configs: list of tile image numbers to preload + layout function
// Tile image key convention: 't022' → tiles/isometric tileset/separated images/tile_022.png
// In screen space: col+row=const is a HORIZONTAL line, col-row=const is VERTICAL
const STAGE_CONFIGS = {
  'M1F': {
    // Forest clearing — grass floor, bushy edges, scattered flowers and logs
    tiles: ['022','026','027','033','034','037','041','047','049'],
    label: 'HILBERT FOREST',
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
    label: 'HILBERT OUTSKIRTS',
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
    // Hollow Caves — dark stone floor, rubble and rock accents
    tiles: ['000','001','002','003','055','056','057','061','062'],
    label: 'HOLLOW CAVES',
    bgColor: 0x020406,
    layout(col, row) {
      const p = th(col, row);
      // Cave walls on far edges
      const edge = col === 0 || row === 0 || col === 9 || row === 9;
      if (edge) return p < 50 ? '061' : '062';
      // Dark stone patches scattered throughout
      if (p < 18) return p < 9 ? '055' : '056';
      if (p < 28) return '057';
      // Main cave floor
      const v = (col * 3 + row * 7) % 4;
      return ['000','001','002','003'][v];
    },
  },
};

// Per-mission configuration: player start positions + enemy definitions
const MISSION_CONFIGS = {
  'M1F': {
    region: 'Altroes',
    playerPos: { reno:[1,2], drace:[1,3], sela:[1,4], kael:[1,5], trice:[1,6] },
    enemies: [
      { col:8, row:2, name:'Wolf', spriteKey:'wolf-idle', animKey:'wolf-idle', spriteScale:1.2, moveSpeed:2, speed:5, strength:8,  stamina:6, endurance:5, level:1 },
      { col:8, row:5, name:'Wolf', spriteKey:'wolf-idle', animKey:'wolf-idle', spriteScale:1.2, moveSpeed:2, speed:5, strength:8,  stamina:6, endurance:5, level:1 },
      { col:8, row:8, name:'Wolf', spriteKey:'wolf-idle', animKey:'wolf-idle', spriteScale:1.2, moveSpeed:2, speed:5, strength:8,  stamina:6, endurance:5, level:1 },
    ],
  },
  'M2': {
    region: 'Altroes',
    playerPos: { reno:[1,3], drace:[1,4], sela:[1,2], kael:[1,5], trice:[1,1] },
    enemies: [
      { col:7, row:2, name:'Boar', spriteKey:'boar-idle', animKey:'boar-idle', spriteScale:2.0, moveSpeed:2, speed:4, strength:12, stamina:8, endurance:9, level:2 },
      { col:8, row:7, name:'Boar', spriteKey:'boar-idle', animKey:'boar-idle', spriteScale:2.0, moveSpeed:2, speed:4, strength:12, stamina:8, endurance:9, level:2 },
    ],
  },
  'M3': {
    region: 'Altroes',
    playerPos: { reno:[1,3], drace:[1,4], sela:[1,2], kael:[1,5], trice:[1,1] },
    enemies: [
      { col:7, row:1, name:'Wolf', spriteKey:'wolf-idle', animKey:'wolf-idle', spriteScale:1.2, moveSpeed:3, speed:6, strength:10, stamina:7, endurance:6, level:2 },
      { col:8, row:5, name:'Wolf', spriteKey:'wolf-idle', animKey:'wolf-idle', spriteScale:1.2, moveSpeed:3, speed:6, strength:10, stamina:7, endurance:6, level:2 },
      { col:7, row:8, name:'Wolf', spriteKey:'wolf-idle', animKey:'wolf-idle', spriteScale:1.2, moveSpeed:3, speed:6, strength:10, stamina:7, endurance:6, level:2 },
    ],
  },
  'M4': {
    region: 'Altroes',
    playerPos: { reno:[1,3], drace:[1,4], sela:[1,2], kael:[1,5], trice:[1,1] },
    enemies: [
      { col:6, row:2, name:'Wolf', spriteKey:'wolf-idle', animKey:'wolf-idle', spriteScale:1.2, moveSpeed:3, speed:7, strength:12, stamina:9,  endurance:8,  level:3 },
      { col:8, row:4, name:'Boar', spriteKey:'boar-idle', animKey:'boar-idle', spriteScale:2.0, moveSpeed:2, speed:5, strength:15, stamina:11, endurance:12, level:3 },
      { col:7, row:7, name:'Wolf', spriteKey:'wolf-idle', animKey:'wolf-idle', spriteScale:1.2, moveSpeed:3, speed:7, strength:12, stamina:9,  endurance:8,  level:3 },
    ],
  },
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
function attackDesignations(attacker, ability) {
  const desigs = attacker.designations ?? [];
  if (!desigs.length) return [];
  // exactRange abilities (3-Point) have no plain .range at all — fall back
  // to it before the ?? 1 default so they aren't misread as melee.
  const isMelee = (ability.exactRange ?? ability.range ?? 1) <= 1;
  const live = [];
  if (isMelee && desigs.includes('C'))  live.push('C');
  if (!isMelee && desigs.includes('Rg')) live.push('Rg');
  if (desigs.includes('D')) live.push('D');
  return live;
}
function designationMultiplier(attacker, defender, ability) {
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
  }

  preload() {
    // Load stage tiles for this mission
    const stageCfg = STAGE_CONFIGS[state.currentMission] ?? STAGE_CONFIGS['M1F'];
    for (const num of stageCfg.tiles) {
      const key = `t${num}`;
      if (!this.textures.exists(key)) {
        this.load.image(key, `tiles/isometric tileset/separated images/tile_${num}.png`);
      }
    }

    this.load.spritesheet('wolf-idle', 'critters/wolf/no effects/wolf-idle.png', { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet('boar-idle', 'critters/boar/boar_NW_idle_strip.png',   { frameWidth: 40, frameHeight: 30 });

    // Load hero sprites for current party — battle portraits always use the
    // unit's T1 role sprite (promoted appearance isn't modeled in battle yet).
    const classNames = state.party.map(u => spriteKeyForRole(u.t1Role)).filter(Boolean);
    loadHeroSprites(this, classNames);
  }

  create() {
    const { width, height } = this.scale;
    this.originX = width / 2;
    this.originY = 70;
    this.turnCount = 1;

    const missionId  = state.currentMission ?? 'M1F';
    const missionCfg = MISSION_CONFIGS[missionId] ?? MISSION_CONFIGS['M1F'];
    const stageCfg   = STAGE_CONFIGS[missionId]   ?? STAGE_CONFIGS['M1F'];

    // phase: 'player_turn' | 'unit_menu' | 'unit_selected' | 'ability_targeting' | 'enemy_turn' | 'victory' | 'defeat'
    this.phase = 'player_turn';
    this.selectedUnit = null;
    this.moveRange = new Set();
    this.hoveredTile = null;

    if (!this.anims.exists('wolf-idle')) {
      this.anims.create({ key: 'wolf-idle', frames: this.anims.generateFrameNumbers('wolf-idle', { start: 0, end: 3 }), frameRate: 4, repeat: -1 });
    }
    if (!this.anims.exists('boar-idle')) {
      this.anims.create({ key: 'boar-idle', frames: this.anims.generateFrameNumbers('boar-idle', { start: 0, end: 6 }), frameRate: 6, repeat: -1 });
    }

    // ── Strip sprite backgrounds, then build animations ───────────────────
    for (const u of state.party) {
      const className = spriteKeyForRole(u.t1Role);
      if (className) stripHeroBackground(this, className);
    }
    for (const u of state.party) {
      const className = spriteKeyForRole(u.t1Role);
      if (className) createHeroAnims(this, className);
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
            .setScale(2).setOrigin(0.5, 0).setDepth((col + row) * 10)
        );
      }
    }

    this.hlGfx     = this.add.graphics().setDepth(200);
    this.wolfHpGfx = this.add.graphics().setDepth(650);
    this.unitMap   = new Map();

    this.killedEnemies  = 0;
    this.killsByType    = {};
    this.xpEarned       = 0;
    this.actionMenu     = null;
    this.statusPopup    = null;
    this.activeAbility  = null;

    // ── Player units — read live stats from gameState ─────────────────────

    this.playerUnits = state.party.map(gs => {
      const [col, row] = missionCfg.playerPos[gs.id] ?? [1, 1];
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
        setUpUsedThisTurn: false, duoFreeMoveUsed: false, duoBonusUsed: false,
      };
    });
    for (const u of this.playerUnits) {
      u.gfx = this.add.graphics().setDepth(600);
      u.label = this.add.text(0, 0, u.initials, {
        fontSize: '11px', fontFamily: 'monospace', fontStyle: 'bold', color: '#ffffff',
      }).setOrigin(0.5).setDepth(1000);
      const className = spriteKeyForRole(u.t1Role);
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
    this.enemyUnits = missionCfg.enemies.map(d => {
      const lv = scaledLevel(d.level);
      const { primaryStat, element } = rollRegionArchetype(missionCfg.region);
      const scaled = {
        ...d, team: 'enemy',
        level:     lv,
        speed:     Math.round(d.speed     * diff),
        strength:  Math.round(d.strength  * diff),
        stamina:   Math.round(d.stamina   * diff),
        endurance: Math.round(d.endurance * diff),
        xpValue:   40 * lv,
        primaryStat, element,
      };
      scaled[primaryStat] = Math.round(scaled[primaryStat] * PRIMARY_STAT_BOOST);
      return { ...scaled, hp: enemyMaxHp(scaled), maxHp: enemyMaxHp(scaled), isDead: false, debuffs: [], baseMoveSpeed: d.moveSpeed };
    });
    const ENEMY_TINT = 0x4a5566;
    for (const e of this.enemyUnits) {
      const { x, y } = this.gridToScreen(e.col, e.row);
      const baseScale = e.spriteScale ?? 1.2;
      const depth = (e.col + e.row) * 10 + 5;
      e.sprite = this.add.sprite(x, y + TH2, e.spriteKey)
        .play(e.animKey).setOrigin(0.5, 0.75).setScale(baseScale)
        .setTint(ENEMY_TINT).setDepth(depth);
      e.enemyTint = ENEMY_TINT;
      const lvColor = e.level >= 6 ? '#ff6666' : e.level >= 3 ? '#ffaa44' : '#aaaaaa';
      e.lvLabel = this.add.text(x, y + TH2 - 58, `${elementIcon(e.element)} Lv.${e.level}`, {
        fontSize: '9px', fontFamily: 'monospace', color: lvColor,
      }).setOrigin(0.5, 1).setDepth(660);
      this.unitMap.set(`${e.col},${e.row}`, e);
    }

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

    this.showPhaseBanner('PLAYER TURN');
    this.redraw();
  }

  // ── Click handling ────────────────────────────────────────────────────────

  handleClick(sx, sy) {
    const t = this.screenToGrid(sx, sy);
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
      const runAnim = `${heroKey(spriteKeyForRole(unit.t1Role))}-run`;
      if (this.anims.exists(runAnim)) unit.portrait.play(runAnim);
      const fromX = unit.portrait.x, fromY = unit.portrait.y;
      const toX = tx, toY = ty + TH2 + 10;
      const dur = 220;
      const ease = t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; // easeInOut quad
      const start = performance.now();
      const animate = () => {
        if (!unit.portrait?.scene) return;
        const t = ease(Math.min((performance.now() - start) / dur, 1));
        unit.portrait.setPosition(fromX + (toX - fromX) * t, fromY + (toY - fromY) * t);
        if (t < 1) { requestAnimationFrame(animate); return; }
        unit.isMoving = false;
        unit.portrait.setDepth((col + row) * 10 + 6);
        this.playIdle(unit, spriteKeyForRole(unit.t1Role));
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
  // Free move to a sports partner within range — doesn't consume the unit's
  // normal move (see moveUnit's `free` option). Sets duoFreeMoveUsed (once
  // per round, reset in startPlayerTurn) so it can't be spammed for
  // ordinary repositioning, and arms the "attack twice" bonus checked in
  // finishAbilityTurn.
  useDuoFreeMove(unit) {
    if (unit.duoFreeMoveUsed) return;
    const partner = this.findDuoPartner(unit);
    if (!partner) return;
    const dest = this.findFreeTileNear(partner.col, partner.row);
    if (!dest) return;
    this.hideActionMenu();
    this.moveUnit(unit, dest.col, dest.row, { free: true });
    unit.duoFreeMoveUsed = true;
    const { x, y } = this.gridToScreen(dest.col, dest.row);
    this.showEffect(x, y + TH2, 'DUO!', '#44ffdd');
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

    const known = [ATTACK, THROW, ...getUnitSpecials(partner), ...getUnitSkills(partner)]
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
    this.unitMap.delete(`${unit.col},${unit.row}`);
    if (unit.gfx)     { unit.gfx.clear(); }
    if (unit.label)   { unit.label.setVisible(false); }
    if (unit.portrait){ unit.portrait.setVisible(false); }
    if (unit.lvLabel) { unit.lvLabel.setVisible(false); }
    if (unit.sprite)  { unit.sprite.destroy(); unit.sprite = null; }
    this.redraw();
    this.checkEndConditions();
  }

  checkEndConditions() {
    if (this.enemyUnits.every(e => e.isDead)) {
      this.time.delayedCall(500, () => {
        this.phase = 'victory';
        this.showPhaseBanner('VICTORY!');
        // Play celebration for all player heroes with the anim
        for (const u of this.playerUnits) {
          if (!u.isDead && u.portrait) {
            const celebAnim = `${heroKey(spriteKeyForRole(u.t1Role))}-celebrate`;
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
    } else if (this.playerUnits.every(p => p.isDead)) {
      this.time.delayedCall(500, () => {
        this.phase = 'defeat';
        this.showEndBanner('DEFEAT', '#ff4444');
        this.time.delayedCall(2500, () => this.scene.start('WorldMapScene'));
      });
    }
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
    const specials = getUnitSpecials(unit);
    const skills   = getUnitSkills(unit); // slot-free — every known Skill, not just equipped passives

    const IH = 30, PAD = 5;
    const ITEMS = this.buildMenuItems(unit, specials, skills);
    const MW = 148, MH = ITEMS.length * IH + PAD * 2;

    // Position beside unit: right if space, left otherwise
    const toRight = ux + 40 + MW < width - 4;
    const mx = toRight ? ux + 40 : ux - 40 - MW;
    const my = Math.min(Math.max(uy - MH / 2, 6), height - MH - 6);

    const con = this.add.container(mx, my).setDepth(4000);
    this.actionMenu = con;

    // Panel background
    const bg = this.add.graphics();
    bg.fillStyle(0x0d1428, 0.97);
    bg.fillRect(0, 0, MW, MH);
    bg.lineStyle(1, unit.color, 0.5);
    bg.strokeRect(0, 0, MW, MH);

    // Arrow connector toward unit
    const ax = toRight ? -7 : MW;
    const ay = MH / 2;
    bg.fillStyle(0x060810, 1);
    bg.fillTriangle(ax, ay - 6, ax, ay + 6, toRight ? ax - 7 : ax + 7, ay);
    con.add(bg);

    // Unit name header
    const nameHdr = this.add.text(MW / 2, PAD + 6, unit.name.split(' ')[0].toUpperCase(), {
      fontSize: '9px', fontFamily: 'monospace', fontStyle: 'bold',
      color: '#' + unit.color.toString(16).padStart(6, '0'),
    }).setOrigin(0.5, 0);
    con.add(nameHdr);

    ITEMS.forEach(({ label, icon, sub, disabled, separator, action }, i) => {
      const iy = PAD + i * IH;

      if (separator) {
        const sepG = this.add.graphics();
        sepG.lineStyle(1, 0x151520, 1);
        sepG.lineBetween(4, iy + 2, MW - 4, iy + 2);
        con.add(sepG);
      }

      const g = this.add.graphics();
      const draw = (h) => {
        g.clear();
        if (h && !disabled) {
          g.fillStyle(0x162040, 1);
          g.fillRect(2, iy + 3, MW - 4, IH - 5);
        }
      };
      draw(false);
      con.add(g);

      const tc = disabled ? '#3a3a52' : '#e8eeff';
      const ic = disabled ? '#2a2a44' : '#' + unit.color.toString(16).padStart(6, '0');

      con.add(this.add.text(10, iy + IH / 2, icon, {
        fontSize: '12px', fontFamily: 'monospace', color: ic,
      }).setOrigin(0, 0.5));
      con.add(this.add.text(28, iy + IH / 2, label, {
        fontSize: '12px', fontFamily: 'monospace', fontStyle: disabled ? 'normal' : 'bold', color: tc,
      }).setOrigin(0, 0.5));

      if (sub && !disabled) {
        con.add(this.add.text(MW - 8, iy + IH / 2, sub, {
          fontSize: '9px', fontFamily: 'monospace', color: '#334466',
        }).setOrigin(1, 0.5));
      }

      if (!disabled) {
        const z = this.add.zone(MW / 2, iy + IH / 2, MW - 4, IH - 4)
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

    items.push(
      { icon: '◈', label: 'Items',
        disabled: true,
        action: () => {} },

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
    return cost === 0 ? 'Free' : `${cost} SP`;
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

    const IH = 44, PAD = 4;
    const MW = 200, MH = (abilities.length + 1) * IH + PAD * 2;
    const toRight = ux + 40 + MW < width - 4;
    const mx = toRight ? ux + 40 : ux - 40 - MW;
    const my = Math.min(Math.max(uy - MH / 2, 6), height - MH - 6);

    const con = this.add.container(mx, my).setDepth(4000);
    this.actionMenu = con;

    const bg = this.add.graphics();
    bg.fillStyle(0x0d1428, 0.97);
    bg.fillRect(0, 0, MW, MH);
    bg.lineStyle(1, unit.color, 0.5);
    bg.strokeRect(0, 0, MW, MH);
    const ax = toRight ? -7 : MW;
    const ay = MH / 2;
    bg.fillStyle(0x060810, 1);
    bg.fillTriangle(ax, ay - 6, ax, ay + 6, toRight ? ax - 7 : ax + 7, ay);
    con.add(bg);

    // Back button
    const backG = this.add.graphics();
    const drawBack = (h) => { backG.clear(); if (h) { backG.fillStyle(0x0e1228,1); backG.fillRect(2, PAD + 2, MW - 4, IH - 4); } };
    drawBack(false);
    con.add(backG);
    con.add(this.add.text(10, PAD + IH / 2, '← Back', { fontSize:'11px', fontFamily:'monospace', color:'#446688' }).setOrigin(0, 0.5));
    const bz = this.add.zone(MW/2, PAD + IH/2, MW-4, IH-4).setInteractive({ useHandCursor:true });
    bz.on('pointerover', () => drawBack(true)); bz.on('pointerout', () => drawBack(false));
    bz.on('pointerdown', (ptr,lx,ly,evt) => { evt.stopPropagation(); this.showActionMenu(unit); });
    con.add(bz);

    abilities.forEach((ab, i) => {
      const iy = PAD + (i + 1) * IH;
      const canUse = this.abilityUsable(unit, ab);
      const g = this.add.graphics();
      const draw = (h) => { g.clear(); if (h && canUse) { g.fillStyle(0x0e1228,1); g.fillRect(2, iy+2, MW-4, IH-4); } };
      draw(false);
      con.add(g);

      const tc = canUse ? '#ffffff' : '#252535';
      const sc = canUse ? '#4499ff' : '#1e2233';
      con.add(this.add.text(10, iy + 12, `${ab.icon}  ${ab.name}`, { fontSize:'12px', fontFamily:'monospace', fontStyle:'bold', color: tc }));
      con.add(this.add.text(10, iy + 28, ab.desc, { fontSize:'9px', fontFamily:'monospace', color: canUse ? '#556677' : '#1e1e28' }));
      con.add(this.add.text(MW - 8, iy + 12, this.abilitySubLabel(unit, ab), { fontSize:'10px', fontFamily:'monospace', color: sc }).setOrigin(1,0));

      if (canUse) {
        const z = this.add.zone(MW/2, iy + IH/2, MW-4, IH-4).setInteractive({ useHandCursor:true });
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

  // Small always-on reference panel, top-right corner, below the header bar:
  // the designation triangle (Combat > Ranged > Defender > Combat) and the
  // elemental affinity pentagon (Fire > Wind > Earth > Lightning > Water >
  // Fire) — a quick-glance cheat sheet for both damage-multiplier systems.
  drawReferenceHud(width) {
    const PW = 172, PY = 34, PH = 44;
    const px = width - PW - 6;

    const bg = this.add.graphics().setDepth(1000);
    bg.fillStyle(0x08101e, 0.85);
    bg.fillRoundedRect(px, PY, PW, PH, 4);
    bg.lineStyle(1, 0x2a3a6a, 1);
    bg.strokeRoundedRect(px, PY, PW, PH, 4);

    const cycleText = (list, iconFn) => {
      const icons = list.map(iconFn);
      return [...icons, icons[0]].join('›');
    };

    this.add.text(px + PW / 2, PY + 9, cycleText(DESIGNATION_CYCLE, designationIcon), {
      fontSize: '10px', fontFamily: 'monospace', color: '#ccddee',
    }).setOrigin(0.5, 0).setDepth(1001);

    this.add.text(px + PW / 2, PY + 27, cycleText(ELEMENT_CYCLE, elementIcon), {
      fontSize: '10px', fontFamily: 'monospace', color: '#ccddee',
    }).setOrigin(0.5, 0).setDepth(1001);
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

    const bg = this.add.graphics();
    bg.fillStyle(0x0d1428, 0.97);
    bg.fillRect(0, 0, PW, PH);
    bg.lineStyle(1, unit.color, 0.6);
    bg.strokeRect(0, 0, PW, PH);
    con.add(bg);

    con.add(this.add.text(PW / 2, 8, unit.name.split(' ')[0], { fontSize:'11px', fontFamily:'monospace', fontStyle:'bold', color:'#aaaacc' }).setOrigin(0.5,0));

    // Affinity + designation icons, right under the name
    const badges = [
      unit.element ? `${elementIcon(unit.element)} ${unit.element}` : null,
      designations.length ? designations.map(d => designationIcon(d)).join(' ') : null,
    ].filter(Boolean).join('   ');
    if (badges) {
      con.add(this.add.text(PW / 2, 22, badges, { fontSize:'11px', fontFamily:'monospace', color:'#ddccaa' }).setOrigin(0.5, 0));
    }

    const rows = [
      { label: 'HP',  val: `${unit.hp} / ${unit.maxHp}`,    color: '#44cc66' },
      ...(unit.maxSp != null ? [{ label: 'SP', val: `${unit.sp} / ${unit.maxSp}`, color: '#4499ff' }] : []),
      { label: 'ATK', val: `${unit.strength + Math.round(unit.speed * 0.5)}`, color: '#ff8844' },
      { label: 'SPD', val: `${unit.speed}`,  color: '#44aaff' },
      { label: 'END', val: `${unit.endurance}`, color: '#44cccc' },
    ];
    const PH2 = 44 + rows.length * 17 + 6;
    if (PH2 !== PH) { bg.clear(); bg.fillStyle(0x0d1428, 0.97); bg.fillRect(0, 0, PW, PH2); bg.lineStyle(1, unit.color, 0.6); bg.strokeRect(0, 0, PW, PH2); }
    rows.forEach(({ label, val, color }, i) => {
      const ry = 44 + i * 17;
      con.add(this.add.text(10, ry, label, { fontSize:'10px', fontFamily:'monospace', color:'#446677' }));
      con.add(this.add.text(PW - 10, ry, val, { fontSize:'10px', fontFamily:'monospace', fontStyle:'bold', color }).setOrigin(1,0));
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
      if (Math.abs(unit.col - o.col) + Math.abs(unit.row - o.row) > range) return false;
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
    const spriteKey = spriteKeyForRole(attacker.t1Role);
    const anim = `${heroKey(spriteKey)}-attack`;
    if (!this.anims.exists(anim)) return;
    attacker.portrait.play(anim);
    attacker.portrait.once('animationcomplete', () => {
      this.playIdle(attacker, spriteKey);
    });
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
  // Duo's "attack twice" (Ability Revised): after the free move
  // (duoFreeMoveUsed), the FIRST action taken grants exactly one bonus
  // follow-up action instead of ending/handing back to a normal move — but
  // it locks hasMoved=true so the unit can't ALSO take its normal move
  // afterward. That makes "attack twice" and "move again and attack"
  // mutually exclusive, matching the sheet: acting first spends the bonus
  // slot as a 2nd attack; moving first (hasMoved already true by the time
  // this runs) spends it as the normal move instead, and this branch never
  // triggers.
  finishAbilityTurn(attacker) {
    attacker.hasActed = true;
    this.activeAbility = null;
    if (attacker.duoFreeMoveUsed && !attacker.duoBonusUsed && !attacker.hasMoved) {
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

    const hits = ability.hits ?? 1;
    const dist = Math.abs(attacker.col - target.col) + Math.abs(attacker.row - target.row);
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
  }

  // ── Enemy AI ──────────────────────────────────────────────────────────────

  startEnemyTurn() {
    if (this.phase === 'victory' || this.phase === 'defeat') return;
    this.phase = 'enemy_turn';
    this.showPhaseBanner('ENEMY TURN');
    this.redraw();

    const aliveEnemies = this.enemyUnits.filter(e => !e.isDead);
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
    const target = this.nearestPlayer(wolf);
    if (!target) return;

    // Find path to target
    const path = this.bfsPath(wolf.col, wolf.row, target.col, target.row);
    if (!path) return;

    // Move up to moveSpeed steps, never walking into target's tile
    for (let i = 0; i < path.length - 1 && i < wolf.moveSpeed; i++) {
      const { col, row } = path[i];
      const nk = `${col},${row}`;
      if (this.unitMap.has(nk)) break;
      this.unitMap.delete(`${wolf.col},${wolf.row}`);
      wolf.col = col; wolf.row = row;
      this.unitMap.set(nk, wolf);
    }
    if (wolf.sprite) {
      const { x, y } = this.gridToScreen(wolf.col, wolf.row);
      wolf.sprite.setPosition(x, y + TH2).setDepth((wolf.col + wolf.row) * 10 + 5);
    }

    // Attack any adjacent player
    const targets = this.getAttackTargets(wolf);
    if (targets.length > 0) {
      // Prefer the original target if adjacent, else first available
      const t = targets.find(t => t.col === target.col && t.row === target.row) || targets[0];
      const enemy = this.unitMap.get(`${t.col},${t.row}`);
      if (enemy && !enemy.isDead) this.doAttack(wolf, enemy);
    }
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

  getAttackTargets(unit) {
    const targets = [];
    for (const [dc, dr] of [[-1,0],[1,0],[0,-1],[0,1]]) {
      const nc = unit.col + dc, nr = unit.row + dr;
      const occ = this.unitMap.get(`${nc},${nr}`);
      if (occ && occ.team !== unit.team && !occ.isDead) targets.push({ col: nc, row: nr });
    }
    return targets;
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

  // ── Draw ──────────────────────────────────────────────────────────────────

  drawDiamond(x, y, color, alpha) {
    this.hlGfx.fillStyle(color, alpha);
    this.hlGfx.fillPoints([
      { x, y },
      { x: x + TW2, y: y + TH2 },
      { x, y: y + TILE_H },
      { x: x - TW2, y: y + TH2 },
    ], true);
  }

  redraw() {
    this.hlGfx.clear();
    this.wolfHpGfx.clear();

    const selectedKey = this.selectedUnit ? `${this.selectedUnit.col},${this.selectedUnit.row}` : null;
    const hovKey      = this.hoveredTile  ? `${this.hoveredTile.col},${this.hoveredTile.row}`  : null;

    // Move range: full highlight when picking tile, dim preview in menu
    if (this.phase === 'unit_selected' || this.phase === 'unit_menu') {
      const dimmed = this.phase === 'unit_menu';
      for (const key of this.moveRange) {
        if (this.unitMap.has(key)) continue;
        const [col, row] = key.split(',').map(Number);
        const { x, y } = this.gridToScreen(col, row);
        this.drawDiamond(x, y, key === hovKey ? 0x9edaff : 0x88aaff, dimmed ? 0.18 : 0.4);
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
          const { x, y } = this.gridToScreen(col, row);
          const occ = this.unitMap.get(`${col},${row}`);
          const isTarget = occ?.team === 'enemy' && !occ.isDead;
          this.drawDiamond(x, y, isTarget ? 0xff2200 : 0x553300, isTarget ? 0.7 : 0.25);
        }
      }
      // Directional lines
      for (const [dc, dr] of [[0,-1],[0,1],[-1,0],[1,0]]) {
        for (let step = 1; step <= maxR; step++) {
          const col = uc + dc * step, row = ur + dr * step;
          if (col < 0 || col >= COLS || row < 0 || row >= ROWS) break;
          const { x, y } = this.gridToScreen(col, row);
          const occ = this.unitMap.get(`${col},${row}`);
          const isTarget = occ?.team === 'enemy' && !occ.isDead;
          this.drawDiamond(x, y, isTarget ? 0xff4400 : 0x334466, isTarget ? 0.55 : 0.15);
          if (occ) break;
        }
      }
    }

    // Ability range highlight — a ring (not a filled diamond) for exact-range
    // abilities like 3-Point.
    if (this.phase === 'ability_targeting' && this.selectedUnit && this.activeAbility) {
      const { col: uc, row: ur } = this.selectedUnit;
      for (let col = 0; col < COLS; col++) {
        for (let row = 0; row < ROWS; row++) {
          const dist = Math.abs(col - uc) + Math.abs(row - ur);
          if (dist < 1 || !this.abilityRangeMatches(this.selectedUnit, this.activeAbility, dist)) continue;
          const { x, y } = this.gridToScreen(col, row);
          const occ = this.unitMap.get(`${col},${row}`);
          const isTarget = occ?.team === this.activeAbility.targetType;
          this.drawDiamond(x, y, isTarget ? 0xff8800 : 0x888800, isTarget ? 0.55 : 0.18);
        }
      }
    }

    // Selected tile — skip if the occupant has a portrait (the sprite IS the indicator)
    if (selectedKey) {
      const selOcc = this.unitMap.get(selectedKey);
      if (!selOcc?.portrait) {
        const [col, row] = selectedKey.split(',').map(Number);
        const { x, y } = this.gridToScreen(col, row);
        this.drawDiamond(x, y, 0xffd700, 0.5);
      }
    }

    // Hover — skip portrait-unit tiles to avoid double-image bleed
    if (hovKey && !this.moveRange.has(hovKey) && hovKey !== selectedKey) {
      const hovOcc = this.unitMap.get(hovKey);
      if (!hovOcc?.portrait) {
        const { x, y } = this.gridToScreen(this.hoveredTile.col, this.hoveredTile.row);
        this.drawDiamond(x, y, 0x9edaff, 0.3);
      }
    }

    // Unit tile position glows — portrait units only glow when selected or done
    for (const u of this.playerUnits) {
      if (u.isDead) continue;
      const { x, y } = this.gridToScreen(u.col, u.row);
      if (u.portrait) {
        if (u === this.selectedUnit) this.drawDiamond(x, y, u.color, 0.45);
        else if (u.isDone) this.drawDiamond(x, y, u.color, 0.12);
      } else {
        this.drawDiamond(x, y, u.color, u === this.selectedUnit ? 0.55 : (u.isDone ? 0.15 : 0.35));
      }
    }
    for (const e of this.enemyUnits) {
      if (e.isDead) continue;
      const { x, y } = this.gridToScreen(e.col, e.row);
      this.drawDiamond(x, y, 0xff3333, 0.22);
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
  }
}
