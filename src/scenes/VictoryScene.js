import Phaser from 'phaser';
import { state, addXP, xpToNext, completeMission, recruitCharacter } from '../data/gameState.js';
import { randomLoot, getMissionMaterials, getKillDrops, rarityColor, ENEMY_KILL_DROPS } from '../data/items.js';

const XP_PER_ENEMY = 40;

const CUTSCENE_AFTER = {
  M1F: {
    location: 'SIRBLANC  ·  Reno\'s Home',
    lines: [
      { speaker:'Reno',     color:'#4488ff', text:'That should be the last of them. Time to head back.' },
      { speaker:'Narrator', color:'#888899', text:'Reno returns home with herbs and pelts in hand — but a stranger\'s horse is tied outside.' },
      { speaker:'Father',   color:'#cc9955', text:'You\'re back. Good timing. We have a visitor.' },
      { speaker:'Scout',    color:'#88bbaa', text:'I am Cassel. A scout from Hilbert Academy. We\'ve had observers in the region — your son\'s Gift has been noticed.' },
      { speaker:'Reno',     color:'#4488ff', text:'...Hilbert Academy noticed me?' },
      { speaker:'Scout',    color:'#88bbaa', text:'Master Hilbert has personally requested you come and demonstrate your abilities. A formal trial. An opportunity very few receive.' },
      { speaker:'Mother',   color:'#88aacc', text:'Reno. This is exactly what we always hoped for. Don\'t let it pass you by.' },
      { speaker:'Father',   color:'#cc9955', text:'The outskirts road is the fastest route north. Leave at dawn. And keep your guard up — the boars have been very territorial lately.' },
      { speaker:'Reno',     color:'#4488ff', text:'...I\'ll be ready.' },
    ],
  },
  M2: {
    location: 'HILBERT ACADEMY  ·  Main Hall',
    lines: [
      { speaker:'Narrator',       color:'#888899', text:'After clearing the outskirts road, Reno arrives at Hilbert Academy — a towering institution at the heart of the northern district.' },
      { speaker:'Drace',          color:'#44cc44', text:'Hey. You must be the new recruit. I\'m Drace. Football linebacker. Gift of Fire.' },
      { speaker:'Sela',           color:'#44cccc', text:'Sela. Soccer goalkeeper. Water-element. Master Hilbert will meet with you shortly.' },
      { speaker:'Kael',           color:'#ff8844', text:'Kael. Volleyball spiker. Don\'t let the academy size throw you off — it\'s just a building.' },
      { speaker:'Trice',          color:'#aa44ff', text:'Trice. Basketball center. If Hilbert brought you here himself, you must have something worth seeing.' },
      { speaker:'Reno',           color:'#4488ff', text:'...Good to meet you all.' },
      { speaker:'Master Hilbert', color:'#ddcc88', text:'Reno Sirblanc. Welcome. You arrive at a critical time.' },
      { speaker:'Master Hilbert', color:'#ddcc88', text:'The Kingdom Tournament is held once every four years. Districts across the realm send their best athletes. It begins in three months.' },
      { speaker:'Master Hilbert', color:'#ddcc88', text:'To compete, your team must be ready on four fronts.' },
      { speaker:'Master Hilbert', color:'#ddcc88', text:'First — craft your gear. The borderlands have materials. Gather them and forge equipment that suits your team\'s strengths.' },
      { speaker:'Master Hilbert', color:'#ddcc88', text:'Second — upgrade that gear. Stronger materials make stronger equipment. Push your tools to their peak.' },
      { speaker:'Master Hilbert', color:'#ddcc88', text:'Third — train through battle. Real growth comes from real conflict. The field teaches what no classroom can.' },
      { speaker:'Master Hilbert', color:'#ddcc88', text:'Fourth — build your team. Five individuals is not a team. Learn each other\'s strengths. Fight as one.' },
      { speaker:'Reno',           color:'#4488ff', text:'...Where do we start?' },
      { speaker:'Master Hilbert', color:'#ddcc88', text:'The Greenfield Plains to the north. Wolves have been crossing the border. Clear them out and bring back what they drop — you\'ll need it for the forge.' },
    ],
  },
  M3: {
    location: 'HILBERT ACADEMY  ·  Training Hall',
    lines: [
      { speaker:'Master Hilbert', color:'#ddcc88', text:'Well done. The Greenfield Plains are clear, and you\'ve returned with materials.' },
      { speaker:'Drace',          color:'#44cc44', text:'Iron ore and leather strips. That\'s solid. We can work with that.' },
      { speaker:'Sela',           color:'#44cccc', text:'The forge is open to you now. Head to the academy smith and start crafting.' },
      { speaker:'Kael',           color:'#ff8844', text:'Better gear means better fighting. Don\'t skip it.' },
      { speaker:'Reno',           color:'#4488ff', text:'...The forge. Let\'s see what we can make.' },
    ],
  },
  M4: {
    location: 'HILBERT ACADEMY  ·  Grand Hall',
    lines: [
      { speaker:'Master Hilbert', color:'#ddcc88', text:'The caves are clear. Outstanding work — those were no ordinary creatures.' },
      { speaker:'Narrator',       color:'#888899', text:'As the team steps out of the briefing room, a figure leans against the far wall — arms crossed, watching.' },
      { speaker:'Zora',           color:'#ff44aa', text:'So you\'re the soccer kid who cleared Hollow Caves. Not bad.' },
      { speaker:'Reno',           color:'#4488ff', text:'...Who are you?' },
      { speaker:'Zora',           color:'#ff44aa', text:'Zora Fen. Track and Field. Sprinter. Master Hilbert says I\'m joining your team.' },
      { speaker:'Zora',           color:'#ff44aa', text:'I\'m fast. Faster than anyone here. If the tournament requires speed, I\'m your answer. Try to keep up.' },
      { speaker:'Master Hilbert', color:'#ddcc88', text:'Zora is one of our most gifted athletes. Her speed will prove invaluable in the battles ahead.' },
      { speaker:'Reno',           color:'#4488ff', text:'...Welcome to the team, Zora.' },
      { speaker:'Zora',           color:'#ff44aa', text:'Don\'t slow me down.' },
    ],
  },
};

const MISSION_NAMES = {
  M1F:'Hilbert Forest', M2:'Hilbert Outskirts', M3:'Greenfield Plains',
  M4:'Hollow Caves',    M5:'Neutral Ground',    M6:'Hilbert Field',
  M7:'Arena Altroes',   M8:'Arena Altroes',     M9:'Arena Altroes',
  M10:'Grand Arena',    M11:'Grand Arena',       M12:'Grand Arena',
  M13:'Grand Arena',    M14:'Grand Arena',       M15:'Grand Arena',
};

const MISSION_NEXT = {
  M1F:'M2', M2:'M3', M3:'M4', M4:'M5', M5:'M6', M6:'M7',
  M7:'M8', M8:'M9', M9:'M10', M10:'M11', M11:'M12', M12:'M13',
  M13:'M14', M14:'M15',
};

export class VictoryScene extends Phaser.Scene {
  constructor() { super({ key: 'VictoryScene' }); }

  init(data) {
    this.missionId     = data.mission       ?? 'M1';
    this.enemiesKilled = data.enemiesKilled ?? 0;
    this.killsByType   = data.killsByType   ?? {};
    this.xpEarned      = data.xpEarned     ?? this.enemiesKilled * XP_PER_ENEMY;
    // Capture first-clear BEFORE completeMission is called in create()
    this.isFirstClear  = !state.completedMissions.includes(this.missionId);
  }

  create() {
    const { width, height } = this.scale;
    const totalXP = this.xpEarned;

    // Apply XP and collect level-up results
    this.levelUps = [];
    for (const unit of state.party) {
      const result = addXP(unit, totalXP);
      if (result) this.levelUps.push({ unit, gains: result });
    }

    // Drop loot: per-kill drops → guaranteed materials → random equipment
    const killDrops = getKillDrops(this.killsByType);
    for (const item of killDrops) state.inventory.push(item);
    const materials = getMissionMaterials(this.missionId);
    for (const mat of materials) state.inventory.push(mat);
    const drop = randomLoot(this.missionId);
    if (drop) state.inventory.push(drop);

    // Group kill drops by name for display (e.g. Wolf Pelt × 3)
    const killDropSummary = [];
    for (const [name, count] of Object.entries(this.killsByType)) {
      const id = ENEMY_KILL_DROPS[name];
      if (!id) continue;
      const item = killDrops.find(i => i.id === id);
      if (item) killDropSummary.push({ item, count });
    }
    this.allDrops = [
      ...killDropSummary,
      ...materials.map(item => ({ item, count: 1 })),
      ...(drop ? [{ item: drop, count: 1 }] : []),
    ];

    // Complete mission and unlock next
    const nextMission = MISSION_NEXT[this.missionId];
    completeMission(this.missionId, nextMission);

    // M4 first clear: Zora joins the party
    if (this.missionId === 'M4' && this.isFirstClear) {
      recruitCharacter('zora');
    }

    // ── Background ────────────────────────────────────────────────────────
    const bg = this.add.graphics();
    bg.fillStyle(0x0a0a18, 1);
    bg.fillRect(0, 0, width, height);

    // Gold accent line
    bg.fillStyle(0xddaa00, 1);
    bg.fillRect(width * 0.15, 90, width * 0.7, 2);
    bg.fillRect(width * 0.15, height - 70, width * 0.7, 2);

    // ── Header ────────────────────────────────────────────────────────────
    this.add.text(width / 2, 40, 'VICTORY!', {
      fontSize: '42px', fontFamily: 'Georgia, serif', fontStyle: 'bold',
      color: '#ffdd44', stroke: '#000000', strokeThickness: 5,
    }).setOrigin(0.5);

    this.add.text(width / 2, 78, `${this.missionId} — ${MISSION_NAMES[this.missionId]}`, {
      fontSize: '13px', fontFamily: 'monospace', color: '#888888',
    }).setOrigin(0.5);

    this.add.text(width / 2, 104, `+${totalXP} XP  ·  ${this.enemiesKilled} enemies defeated`, {
      fontSize: '14px', fontFamily: 'monospace', color: '#aaaacc',
    }).setOrigin(0.5);

    // ── Party XP rows ─────────────────────────────────────────────────────
    let y = 138;
    for (const unit of state.party) {
      this.drawUnitRow(unit, y, width, totalXP);
      y += 54;
    }

    // ── Loot drop ─────────────────────────────────────────────────────────
    const lootY = y + 10;
    if (this.allDrops.length > 0) {
      this.add.text(width / 2, lootY, 'LOOT', {
        fontSize: '11px', fontFamily: 'monospace', color: '#666666',
      }).setOrigin(0.5);
      let dy = lootY + 20;
      for (const { item, count } of this.allDrops) {
        const isMat = item.type === 'material';
        const col = isMat ? '#aacc88' : '#' + rarityColor(item.rarity).toString(16).padStart(6, '0');
        const tag  = isMat ? 'Material' : item.rarity.charAt(0).toUpperCase() + item.rarity.slice(1);
        const label = count > 1 ? `${item.name}  ×${count}` : item.name;
        this.add.text(width / 2, dy, label, {
          fontSize: '15px', fontFamily: 'monospace', fontStyle: 'bold', color: col,
        }).setOrigin(0.5);
        this.add.text(width / 2, dy + 16, tag, {
          fontSize: '9px', fontFamily: 'monospace', color: '#444455',
        }).setOrigin(0.5);
        dy += 36;
      }
    }

    // ── Level up notice ───────────────────────────────────────────────────
    if (this.levelUps.length > 0) {
      this.add.text(width / 2, height - 90, '★  LEVEL UP! ★', {
        fontSize: '17px', fontFamily: 'Georgia, serif', color: '#ffdd44',
      }).setOrigin(0.5);
      this.add.text(width / 2, height - 70, this.levelUps.map(lu => lu.unit.name).join('  ·  '), {
        fontSize: '12px', fontFamily: 'monospace', color: '#aaaaff',
      }).setOrigin(0.5);
    }

    // ── Continue button ───────────────────────────────────────────────────
    const cutscene = this.isFirstClear ? CUTSCENE_AFTER[this.missionId] : null;
    const afterScene     = cutscene ? 'StoryScene'    : 'WorldMapScene';
    const afterSceneData = cutscene ? { lines: cutscene.lines, location: cutscene.location, nextScene: 'WorldMapScene', nextSceneData: {} } : {};

    const btnLabel = this.levelUps.length > 0 ? 'LEVEL UP  ▶' : (cutscene ? 'CONTINUE  ▶' : 'WORLD MAP  ▶');
    const btn = this.add.text(width / 2, height - 30, btnLabel, {
      fontSize: '16px', fontFamily: 'monospace', fontStyle: 'bold',
      color: '#ffffff', backgroundColor: '#224422', padding: { x: 20, y: 8 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    btn.on('pointerover', () => btn.setStyle({ color: '#ffff88' }));
    btn.on('pointerout',  () => btn.setStyle({ color: '#ffffff' }));
    btn.on('pointerdown', () => {
      if (this.levelUps.length > 0) {
        this.scene.start('LevelUpScene', { levelUps: this.levelUps, nextScene: afterScene, nextSceneData: afterSceneData });
      } else {
        this.scene.start(afterScene, afterSceneData);
      }
    });
  }

  drawUnitRow(unit, y, width, xpGained) {
    const lx = 60, barW = 480, barH = 10;
    const level   = unit.level;
    const xpPrev  = unit.xp;                // already updated by addXP
    const needed  = xpToNext(level);
    const pct     = Math.min(xpPrev / needed, 1);

    // Color badge
    const gfx = this.add.graphics();
    gfx.fillStyle(unit.color, 1);
    gfx.fillCircle(lx, y + 14, 10);

    // Name + level
    this.add.text(lx + 18, y + 4, `${unit.name}`, {
      fontSize: '13px', fontFamily: 'monospace', color: '#dddddd',
    });
    this.add.text(lx + 18, y + 20, `Lv.${level}`, {
      fontSize: '11px', fontFamily: 'monospace', color: '#888888',
    });

    // XP bar background
    gfx.fillStyle(0x222233, 1);
    gfx.fillRect(lx + 70, y + 18, barW, barH);
    // XP fill
    gfx.fillStyle(0x44aaff, 1);
    gfx.fillRect(lx + 70, y + 18, barW * pct, barH);

    // XP label
    this.add.text(lx + 70 + barW + 8, y + 16, `${xpPrev}/${needed}`, {
      fontSize: '10px', fontFamily: 'monospace', color: '#666688',
    });

    // LEVEL UP badge
    const wasLevelUp = this.levelUps?.some(lu => lu.unit === unit);
    if (wasLevelUp) {
      this.add.text(lx + 70 + barW + 55, y + 6, 'LEVEL UP!', {
        fontSize: '11px', fontFamily: 'monospace', fontStyle: 'bold', color: '#ffdd44',
      });
    }
  }
}
