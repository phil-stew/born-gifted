import Phaser from 'phaser';
import { state, saveGame } from '../data/gameState.js';
import { stripBackgroundByKey } from '../data/heroSprites.js';

const NODES = [
  { id:'M1',  x:120, y:160, arc:'Home',       name:'Sirblanc' },
  { id:'M1F', x:168, y:228, arc:'Tutorial',   name:'Hilbert Forest' },
  { id:'M2',  x:258, y:188, arc:'Tutorial',   name:'Hilbert Outskirts' },
  { id:'M3',  x:370, y:158, arc:'Tutorial',   name:'Hilbert Borders' },
  { id:'M4',  x:285, y:280, arc:'Academy',    name:'Hilbert Field' },
  { id:'M5',  x:405, y:268, arc:'Academy',    name:'Neutral Ground' },
  { id:'M6',  x:525, y:255, arc:'Academy',    name:'Hilbert Field' },
  { id:'M7',  x:630, y:170, arc:'Selection',  name:'Arena Altroes' },
  { id:'M8',  x:695, y:255, arc:'Selection',  name:'Arena Altroes' },
  { id:'M9',  x:700, y:360, arc:'Selection',  name:'Arena Altroes' },
  { id:'M10', x:615, y:440, arc:'Tournament', name:'Grand Arena' },
  { id:'M11', x:495, y:488, arc:'Tournament', name:'Grand Arena' },
  { id:'M12', x:378, y:498, arc:'Tournament', name:'Grand Arena' },
  { id:'M13', x:265, y:470, arc:'Unknown',    name:'Grand Arena' },
  { id:'M14', x:165, y:405, arc:'Unknown',    name:'Grand Arena' },
  { id:'M15', x:140, y:310, arc:'Unknown',    name:'Grand Arena' },
];

const ARC_COLORS = {
  Home:       0xffcc66,
  Tutorial:   0x44cc88,
  Academy:    0x4488ff,
  Selection:  0xffaa44,
  Tournament: 0xff4444,
  Unknown:    0xaa44ff,
};

const ARC_LABEL_POS = {
  Home:       { x: 120, y: 128 },
  Tutorial:   { x: 300, y: 130 },
  Academy:    { x: 365, y: 305 },
  Selection:  { x: 690, y: 130 },
  Tournament: { x: 600, y: 518 },
  Unknown:    { x: 130, y: 478 },
};

// tiles/mapasset/treesrock.png — 7 cols × 4 rows of decorative scenery icons
// (trees / rock & ore piles / volcanoes / mountains). Only used here as
// ambient corner dressing for the world map — named cells are just the
// handful actually placed by drawScenery(), not the full sheet.
const MAP_ASSET_SHEET = { cols: 7, rows: 4, cellW: 1536 / 7, cellH: 1024 / 4 };
const MAP_ASSET_CELL = {
  oak_tree:     [0, 0], pine_tree:   [0, 1], willow_tree: [0, 5],
  mountain_snow:[3, 4], mountain_sand:[3, 5], pond:        [3, 6],
};

export class WorldMapScene extends Phaser.Scene {
  constructor() { super({ key: 'WorldMapScene' }); }

  preload() {
    // hero sprites loaded in BattleScene; WorldMap needs none
    if (!this.textures.exists('mapscenery')) this.load.image('mapscenery', 'tiles/mapasset/treesrock.png');
  }

  _registerSceneryFrames() {
    if (!this.textures.exists('mapscenery')) return;
    stripBackgroundByKey(this, 'mapscenery', { cols: MAP_ASSET_SHEET.cols, rows: MAP_ASSET_SHEET.rows });
    const tex = this.textures.get('mapscenery');
    const { cellW, cellH } = MAP_ASSET_SHEET;
    for (const [id, [row, col]] of Object.entries(MAP_ASSET_CELL)) {
      const name = `scenery_${id}`;
      if (!tex.has(name)) tex.add(name, 0, col * cellW, row * cellH, cellW, cellH);
    }
  }

  create() {
    const { width, height } = this.scale;
    saveGame();

    this.tooltipText = null;
    this._registerSceneryFrames();
    this.bg = this.add.graphics();
    this.drawBackground(width, height);
    this.drawScenery();
    this.drawConnections();
    this.drawArcLabels();
    this.drawNodes();
    this.drawUI(width, height);
    this.drawHeroMarker();
  }

  // Ambient corner dressing, tucked into the empty margins around the node
  // cluster (nodes span roughly x:120-700, y:158-498) so nothing overlaps a
  // mission node, arc label, or kingdom name.
  drawScenery() {
    if (!this.textures.exists('mapscenery')) return;
    const placements = [
      { id: 'oak_tree',      x: 46,  y: 540, scale: 0.16 },
      { id: 'pine_tree',     x: 86,  y: 555, scale: 0.14 },
      { id: 'willow_tree',   x: 754, y: 545, scale: 0.15 },
      { id: 'mountain_snow', x: 748, y: 60,  scale: 0.16 },
      { id: 'pond',          x: 60,  y: 60,  scale: 0.13 },
    ];
    for (const { id, x, y, scale } of placements) {
      const frame = `scenery_${id}`;
      if (!this.textures.get('mapscenery').has(frame)) continue;
      this.add.image(x, y, 'mapscenery', frame).setScale(scale).setAlpha(0.8).setDepth(1);
    }
  }

  drawBackground(width, height) {
    this.bg.fillStyle(0x0a0a18, 1);
    this.bg.fillRect(0, 0, width, height);

    // Subtle terrain tint regions
    this.bg.fillStyle(0x112211, 0.4);
    this.bg.fillEllipse(230, 200, 340, 200); // Altroes/Tutorial region
    this.bg.fillStyle(0x111133, 0.3);
    this.bg.fillEllipse(620, 310, 260, 280); // Selection/Tournament region

    // Kingdom label faint text
    this.add.text(70, 100, 'ALTROES', {
      fontSize: '28px', fontFamily: 'Georgia, serif', color: '#113322',
      alpha: 0.5,
    });
    this.add.text(580, 92, 'ALTROES', {
      fontSize: '22px', fontFamily: 'Georgia, serif', color: '#332211',
    }).setAlpha(0.4);
    this.add.text(330, 430, 'LAMETUS', {
      fontSize: '28px', fontFamily: 'Georgia, serif', color: '#111133',
    }).setAlpha(0.4);
  }

  drawConnections() {
    const gfx = this.add.graphics();
    for (let i = 0; i < NODES.length - 1; i++) {
      const a = NODES[i], b = NODES[i + 1];
      const isUnlocked = state.unlockedMissions.includes(b.id) || state.completedMissions.includes(b.id);
      const alpha = isUnlocked ? 0.55 : 0.14;
      const color = ARC_COLORS[a.arc];
      gfx.lineStyle(2, color, alpha);
      gfx.lineBetween(a.x, a.y, b.x, b.y);
    }
  }

  drawArcLabels() {
    for (const [arc, pos] of Object.entries(ARC_LABEL_POS)) {
      const hex = '#' + ARC_COLORS[arc].toString(16).padStart(6, '0');
      this.add.text(pos.x, pos.y, arc.toUpperCase(), {
        fontSize: '9px', fontFamily: 'monospace', color: hex,
      }).setOrigin(0.5).setAlpha(0.5);
    }
  }

  drawNodes() {
    this.nodeObjects = [];

    for (let i = 0; i < NODES.length; i++) {
      const node = NODES[i];
      const { id, x, y, arc } = node;
      const color = ARC_COLORS[arc];
      const isCompleted = state.completedMissions.includes(id);
      const isUnlocked  = state.unlockedMissions.includes(id);

      const gfx = this.add.graphics();

      if (isCompleted) {
        // Completed: muted fill + check
        gfx.fillStyle(color, 0.35);
        gfx.fillCircle(x, y, 18);
        gfx.lineStyle(2, color, 0.6);
        gfx.strokeCircle(x, y, 18);
        this.add.text(x, y, '✓', {
          fontSize: '14px', fontFamily: 'monospace', color: '#ffffff',
        }).setOrigin(0.5).setAlpha(0.7);

      } else if (isUnlocked) {
        // Active: bright fill + pulse ring
        gfx.fillStyle(color, 1);
        gfx.fillCircle(x, y, 18);
        gfx.lineStyle(3, 0xffffff, 0.6);
        gfx.strokeCircle(x, y, 18);

        const pulse = this.add.arc(x, y, 24, 0, 360);
        pulse.setStrokeStyle(2, color, 0.9);
        pulse.isFilled = false;
        this.tweens.add({
          targets: pulse, scaleX: 1.8, scaleY: 1.8, alpha: 0,
          duration: 1500, ease: 'Sine.easeOut', repeat: -1, delay: i * 80,
        });

      } else {
        // Locked: dark
        gfx.fillStyle(0x333344, 0.5);
        gfx.fillCircle(x, y, 16);
        gfx.lineStyle(1, 0x444455, 0.6);
        gfx.strokeCircle(x, y, 16);
      }

      // Mission label
      const active = isUnlocked || isCompleted;
      this.add.text(x, y, id, {
        fontSize: '9px', fontFamily: 'monospace', fontStyle: 'bold',
        color: active ? '#ffffff' : '#555566',
      }).setOrigin(0.5).setAlpha(active ? 1 : 0.5);

      // Hit zone — use Zone (Phaser's invisible interactive object)
      if (isUnlocked || isCompleted) {
        const hit = this.add.zone(x, y, 52, 52).setInteractive({ useHandCursor: true });
        hit.on('pointerover', () => this.showTooltip(node, x, y));
        hit.on('pointerout',  () => this.hideTooltip());
        hit.on('pointerdown', () => this.onMissionClick(node));
      }
    }
  }

  drawUI(width, height) {
    // Title
    this.add.text(width / 2, 16, 'WORLD MAP', {
      fontSize: '14px', fontFamily: 'monospace', fontStyle: 'bold', color: '#888899',
    }).setOrigin(0.5, 0);

    // Bottom bar background
    const barGfx = this.add.graphics();
    barGfx.fillStyle(0x0d0d20, 1);
    barGfx.fillRect(0, height - 48, width, 48);
    barGfx.lineStyle(1, 0x333355, 1);
    barGfx.lineBetween(0, height - 48, width, height - 48);

    // PARTY button
    const partyBtn = this.add.text(60, height - 24, 'PARTY', {
      fontSize: '14px', fontFamily: 'monospace', fontStyle: 'bold',
      color: '#aaaaff', backgroundColor: '#161630', padding: { x: 14, y: 6 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    partyBtn.on('pointerover', () => partyBtn.setStyle({ color: '#ffffff' }));
    partyBtn.on('pointerout',  () => partyBtn.setStyle({ color: '#aaaaff' }));
    partyBtn.on('pointerdown', () => this.scene.start('PartyScene'));

    // INVENTORY button
    const invBtn = this.add.text(180, height - 24, 'INVENTORY', {
      fontSize: '14px', fontFamily: 'monospace', fontStyle: 'bold',
      color: '#ffaa44', backgroundColor: '#221a0e', padding: { x: 14, y: 6 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    invBtn.on('pointerover', () => invBtn.setStyle({ color: '#ffffff' }));
    invBtn.on('pointerout',  () => invBtn.setStyle({ color: '#ffaa44' }));
    invBtn.on('pointerdown', () => this.scene.start('InventoryScene'));

    // SAVE button
    const saveBtn = this.add.text(310, height - 24, 'SAVE', {
      fontSize: '14px', fontFamily: 'monospace', fontStyle: 'bold',
      color: '#88cc88', backgroundColor: '#132213', padding: { x: 14, y: 6 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    saveBtn.on('pointerover', () => saveBtn.setStyle({ color: '#ffffff' }));
    saveBtn.on('pointerout',  () => saveBtn.setStyle({ color: '#88cc88' }));
    saveBtn.on('pointerdown', () => {
      saveGame();
      this.showToast('Game saved');
    });

    // EXIT button — returns to the home/title screen
    const homeBtn = this.add.text(420, height - 24, 'EXIT', {
      fontSize: '14px', fontFamily: 'monospace', fontStyle: 'bold',
      color: '#88aacc', backgroundColor: '#0e1a22', padding: { x: 14, y: 6 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    homeBtn.on('pointerover', () => homeBtn.setStyle({ color: '#ffffff' }));
    homeBtn.on('pointerout',  () => homeBtn.setStyle({ color: '#88aacc' }));
    homeBtn.on('pointerdown', () => {
      saveGame();
      this.cameras.main.fadeOut(400, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () =>
        this.scene.start('GameScene', { skipCrawl: true }));
    });

    // Tytrate
    this.add.text(width - 16, height - 24, `T: ${state.tytrate}`, {
      fontSize: '14px', fontFamily: 'monospace', color: '#ddcc44',
    }).setOrigin(1, 0.5);

    // Mission count
    const done = state.completedMissions.length;
    this.add.text(width - 100, height - 24, `${done} / 15`, {
      fontSize: '12px', fontFamily: 'monospace', color: '#555566',
    }).setOrigin(1, 0.5);
  }

  drawHeroMarker() {
    if (!this.textures.exists('hero-Striker')) return;
    const m1 = NODES.find(n => n.id === 'M1');
    if (!m1) return;
    // Small circular portrait clipped above the node
    const size = 28;
    this.add.image(m1.x, m1.y - 28, 'hero-Striker', 0)
      .setDisplaySize(38, 38)
      .setDepth(50);
  }

  showTooltip(node, nx, ny) {
    if (this.tooltipText) this.tooltipText.destroy();
    const isCompleted = state.completedMissions.includes(node.id);
    const status = isCompleted ? 'Completed' : 'Active';
    const label = `${node.id}: ${node.name}\n${node.arc}  ·  ${status}`;
    const tx = Math.min(Math.max(nx, 100), 700);
    const ty = ny > 300 ? ny - 58 : ny + 30;
    this.tooltipText = this.add.text(tx, ty, label, {
      fontSize: '11px', fontFamily: 'monospace', color: '#ffffff',
      backgroundColor: '#111122', padding: { x: 10, y: 6 },
      align: 'center',
    }).setOrigin(0.5).setDepth(100);
  }

  hideTooltip() {
    if (this.tooltipText) { this.tooltipText.destroy(); this.tooltipText = null; }
  }

  onMissionClick(node) {
    this.hideTooltip();
    const isCompleted = state.completedMissions.includes(node.id);

    if (node.id === 'M1') {
      const storyDone = state.unlockedMissions.includes('M1F');
      if (!storyDone) {
        state.unlockedMissions.push('M1F');
        this.scene.start('StoryScene', {
          lines: [
            { speaker: 'Father', color: '#cc9955', text: 'Reno. The village healer is running low on supplies. We need Heal Herbs from the Hilbert Forest.' },
            { speaker: 'Father', color: '#cc9955', text: 'The wolves have been restless lately. Don\'t let your guard down.' },
            { speaker: 'Mother', color: '#88aacc', text: 'There\'s a good patch near the north clearing. You\'ll know them by the silver leaves.' },
            { speaker: 'Mother', color: '#88aacc', text: 'If you bring back some wolf pelts we can trade them in town. Stay safe.' },
            { speaker: 'Reno',   color: '#4488ff', text: '...' },
            { speaker: 'Reno',   color: '#4488ff', text: 'I\'ll be back before sundown.' },
          ],
          nextScene: 'WorldMapScene', nextSceneData: {},
        });
      } else {
        this.scene.start('HubScene', { type: 'town', name: 'Sirblanc', shopId: 'town_sirblanc' });
      }
      return;
    }

    if (node.id === 'M1F') {
      if (isCompleted) {
        this.showDifficultyPicker(node);
      } else {
        state.currentMission = 'M1F';
        this.scene.start('BattleScene');
      }
      return;
    }

    if (node.id === 'M2') {
      if (isCompleted) {
        this.showDifficultyPicker(node);
      } else {
        state.currentMission = 'M2';
        this.scene.start('BattleScene');
      }
      return;
    }

    if (node.id === 'M3') {
      if (isCompleted) {
        this.showDifficultyPicker(node);
      } else {
        state.currentMission = 'M3';
        this.scene.start('BattleScene');
      }
      return;
    }

    if (node.id === 'M4') {
      if (isCompleted) {
        this.showDifficultyPicker(node);
      } else {
        state.currentMission = 'M4';
        this.scene.start('BattleScene');
      }
      return;
    }

    if (node.arc === 'Academy') {
      this.scene.start('HubScene', { type: 'academy', name: node.name, shopId: 'academy_hilbert' });
      return;
    }

    if (isCompleted) {
      this.showDifficultyPicker(node);
      return;
    }

    this.showToast(`${node.id} — ${node.name}\nComing soon`);
  }

  showDifficultyPicker(node) {
    if (this.diffPicker) { this.diffPicker.destroy(true); this.diffPicker = null; }
    const { width, height } = this.scale;
    const PW = 340, PH = 220;
    const px = (width - PW) / 2, py = (height - PH) / 2;

    const con = this.add.container(0, 0).setDepth(300);
    this.diffPicker = con;

    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.55);
    bg.fillRect(0, 0, width, height);
    con.add(bg);

    const panG = this.add.graphics();
    panG.fillStyle(0x0c0c1e, 1);
    panG.fillRect(px, py, PW, PH);
    panG.lineStyle(1, 0x334466, 1);
    panG.strokeRect(px, py, PW, PH);
    con.add(panG);

    con.add(this.add.text(px + PW / 2, py + 16, `${node.name}  ·  REPLAY`, {
      fontSize: '13px', fontFamily: 'monospace', fontStyle: 'bold', color: '#aaaacc',
    }).setOrigin(0.5));
    con.add(this.add.text(px + PW / 2, py + 34, 'Choose difficulty', {
      fontSize: '10px', fontFamily: 'monospace', color: '#445566',
    }).setOrigin(0.5));

    const DIFFS = [
      { label: 'Normal',  mult: 1.0, color: '#44cc77', bdr: 0x1e6630, bg0: 0x090e0a },
      { label: 'Hard',    mult: 1.2, color: '#ffaa33', bdr: 0x7a4410, bg0: 0x110a04 },
      { label: 'Elite',   mult: 1.5, color: '#ff4444', bdr: 0x7a1a1a, bg0: 0x110404 },
    ];
    const bw = 88, bh = 70, gap = 10;
    let bx = px + (PW - DIFFS.length * (bw + gap) + gap) / 2;

    for (const d of DIFFS) {
      const by2 = py + 54;
      const g = this.add.graphics();
      const draw = (h) => {
        g.clear();
        g.fillStyle(h ? d.bg0 + 0x080808 : d.bg0, 1);
        g.fillRect(bx, by2, bw, bh);
        g.lineStyle(1, d.bdr, 1);
        g.strokeRect(bx, by2, bw, bh);
      };
      draw(false);
      con.add(g);
      con.add(this.add.text(bx + bw / 2, by2 + 16, d.label, {
        fontSize: '13px', fontFamily: 'monospace', fontStyle: 'bold', color: d.color,
      }).setOrigin(0.5));
      con.add(this.add.text(bx + bw / 2, by2 + 34, `×${d.mult.toFixed(1)}`, {
        fontSize: '11px', fontFamily: 'monospace', color: '#445566',
      }).setOrigin(0.5));
      con.add(this.add.text(bx + bw / 2, by2 + 50, 'enemy stats', {
        fontSize: '9px', fontFamily: 'monospace', color: '#333344',
      }).setOrigin(0.5));

      const z = this.add.zone(bx + bw / 2, by2 + bh / 2, bw, bh).setInteractive({ useHandCursor: true });
      z.on('pointerover',  () => draw(true));
      z.on('pointerout',   () => draw(false));
      z.on('pointerdown',  () => {
        state.currentMission = node.id;
        this.diffPicker.destroy(true); this.diffPicker = null;
        this.scene.start('BattleScene', { difficulty: d.mult });
      });
      con.add(z);
      bx += bw + gap;
    }

    // Close
    const closeY = py + PH - 34;
    const cg = this.add.graphics();
    const drawC = (h) => {
      cg.clear();
      cg.fillStyle(h ? 0x111122 : 0x0c0c1a, 1);
      cg.fillRect(px + PW / 2 - 50, closeY, 100, 26);
      cg.lineStyle(1, 0x222244, 1);
      cg.strokeRect(px + PW / 2 - 50, closeY, 100, 26);
    };
    drawC(false);
    con.add(cg);
    con.add(this.add.text(px + PW / 2, closeY + 13, 'CANCEL', { fontSize:'11px', fontFamily:'monospace', color:'#444466' }).setOrigin(0.5));
    const cz = this.add.zone(px + PW / 2, closeY + 13, 100, 26).setInteractive({ useHandCursor: true });
    cz.on('pointerover',  () => drawC(true));
    cz.on('pointerout',   () => drawC(false));
    cz.on('pointerdown',  () => { this.diffPicker.destroy(true); this.diffPicker = null; });
    con.add(cz);
  }

  showToast(msg) {
    const { width, height } = this.scale;
    const toast = this.add.text(width / 2, height / 2 - 40, msg, {
      fontSize: '14px', fontFamily: 'monospace', color: '#ffffff',
      backgroundColor: '#222233', padding: { x: 16, y: 10 },
      align: 'center',
    }).setOrigin(0.5).setDepth(200).setAlpha(0);

    this.tweens.add({ targets: toast, alpha: 1, duration: 200 });
    this.time.delayedCall(1800, () =>
      this.tweens.add({ targets: toast, alpha: 0, duration: 300,
        onComplete: () => toast.destroy() })
    );
  }
}
