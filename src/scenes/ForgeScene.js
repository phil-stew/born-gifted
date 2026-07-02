import Phaser from 'phaser';
import { state, roleDisplayLabel } from '../data/gameState.js';

// Cost to reinforce: 75 per level (level 0→1 costs 75, 1→2 costs 150, 2→3 costs 225)
const REINFORCE_BASE = 75;
const MAX_REINFORCE  = 3;

const SLOT_NAMES = ['weapon', 'footwear', 'handwear', 'chest', 'headwear'];

export class ForgeScene extends Phaser.Scene {
  constructor() { super({ key: 'ForgeScene' }); }

  init(data) {
    this.hubData      = data.hubData ?? {};
    this.unitIndex    = 0;
    this.selectedSlot = null;
  }

  create() {
    const { width, height } = this.scale;
    this.W = width; this.H = height;

    const bg = this.add.graphics();
    bg.fillStyle(0x070508, 1);
    bg.fillRect(0, 0, width, height);
    bg.fillStyle(0x0d0a08, 1);
    bg.fillRect(0, 0, width, 44);
    bg.lineStyle(1, 0x2a1a08, 1);
    bg.lineBetween(0, 44, width, 44);

    // Forge glow ambience
    bg.fillStyle(0xff6600, 0.04);
    bg.fillRect(0, 0, width, height);

    this.add.text(width / 2, 14, '⚒  FORGE', {
      fontSize: '16px', fontFamily: 'monospace', fontStyle: 'bold', color: '#cc8833',
    }).setOrigin(0.5);

    this.tytText = this.add.text(width - 14, 14, `⊕ ${state.tytrate}`, {
      fontSize: '14px', fontFamily: 'monospace', fontStyle: 'bold', color: '#ffdd66',
    }).setOrigin(1, 0.5).setDepth(10);

    const back = this.add.text(14, height - 24, '◀  BACK', {
      fontSize: '13px', fontFamily: 'monospace', color: '#7777aa',
      backgroundColor: '#0e0e20', padding: { x: 10, y: 5 },
    }).setOrigin(0, 0.5).setInteractive({ useHandCursor: true });
    back.on('pointerover', () => back.setStyle({ color: '#ffffff' }));
    back.on('pointerout',  () => back.setStyle({ color: '#7777aa' }));
    back.on('pointerdown', () => {
      this.cameras.main.fadeOut(300, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        const showM4Cutscene = state.completedMissions.includes('M3')
          && !state.completedMissions.includes('M4')
          && !state.forgeVisited;
        if (showM4Cutscene) {
          state.forgeVisited = true;
          this.scene.start('StoryScene', {
            location: 'HILBERT ACADEMY  ·  Forge',
            lines: [
              { speaker:'Reno',           color:'#4488ff', text:'That should do it. Let\'s see what the next step is.' },
              { speaker:'Master Hilbert', color:'#ddcc88', text:'Reno. Good timing. We\'ve received word of unusual activity in the Hollow Caves to the west.' },
              { speaker:'Master Hilbert', color:'#ddcc88', text:'Strange creatures have been spotted — different from anything in the borderlands. Our scouts say they carry rare materials.' },
              { speaker:'Master Hilbert', color:'#ddcc88', text:'I need you and your team to clear the caves and bring back whatever you find. Those materials will be critical for the tournament.' },
              { speaker:'Reno',           color:'#4488ff', text:'...The Hollow Caves. Understood.' },
            ],
            nextScene: 'WorldMapScene',
            nextSceneData: {},
          });
        } else {
          this.scene.start('HubScene', this.hubData);
        }
      });
    });

    this.unitCon = this.add.container(0, 0);
    this.equipCon = this.add.container(0, 0);
    this.detCon  = this.add.container(0, 0);

    this.rebuild();
    this.cameras.main.fadeIn(300, 0, 0, 0);
  }

  rebuild() {
    this.unitCon.removeAll(true);
    this.equipCon.removeAll(true);
    this.detCon.removeAll(true);
    this.tytText.setText(`⊕ ${state.tytrate}`);
    this.buildUnitList();
    this.buildEquipList();
    this.buildDetail();
  }

  buildUnitList() {
    const lx = 10, lw = 140, startY = 54;

    const bg = this.add.graphics();
    bg.fillStyle(0x0c0907, 1);
    bg.fillRect(lx, startY, lw, this.H - startY - 44);
    bg.lineStyle(1, 0x2a1a08, 1);
    bg.strokeRect(lx, startY, lw, this.H - startY - 44);
    this.unitCon.add(bg);

    state.party.forEach((unit, i) => {
      const uy = startY + 8 + i * 64;
      const active = i === this.unitIndex;
      const g = this.add.graphics();
      const draw = (h) => {
        g.clear();
        g.fillStyle(active ? 0x1a1008 : (h ? 0x120e06 : 0x0c0907), 1);
        g.fillRect(lx + 2, uy, lw - 4, 58);
        if (active) { g.lineStyle(1, 0x774422, 0.8); g.strokeRect(lx + 2, uy, lw - 4, 58); }
      };
      draw(false);
      this.unitCon.add(g);

      g.fillStyle(unit.color, 0.9);
      g.fillCircle(lx + 16, uy + 20, 8);

      this.unitCon.add(this.add.text(lx + 30, uy + 10, unit.name.split(' ')[0], { fontSize:'12px', fontFamily:'monospace', fontStyle:'bold', color:'#ddccaa' }));
      this.unitCon.add(this.add.text(lx + 12, uy + 30, `Lv.${unit.level}  ${roleDisplayLabel(unit)}`, { fontSize:'9px', fontFamily:'monospace', color:'#665544' }));

      const eqCount = SLOT_NAMES.filter(s => unit.equip[s]).length;
      this.unitCon.add(this.add.text(lx + 12, uy + 44, `${eqCount} / 5 equipped`, { fontSize:'9px', fontFamily:'monospace', color:'#554433' }));

      const z = this.add.zone(lx + lw / 2, uy + 29, lw, 58).setInteractive({ useHandCursor: true });
      z.on('pointerover',  () => { if (!active) draw(true); });
      z.on('pointerout',   () => { if (!active) draw(false); });
      z.on('pointerdown',  () => { this.unitIndex = i; this.selectedSlot = null; this.rebuild(); });
      this.unitCon.add(z);
    });
  }

  buildEquipList() {
    const ex = 160, ew = 200, startY = 54;
    const unit = state.party[this.unitIndex];

    const bg = this.add.graphics();
    bg.fillStyle(0x0c0907, 1);
    bg.fillRect(ex, startY, ew, this.H - startY - 44);
    bg.lineStyle(1, 0x2a1a08, 1);
    bg.strokeRect(ex, startY, ew, this.H - startY - 44);
    this.equipCon.add(bg);

    this.equipCon.add(this.add.text(ex + ew / 2, startY + 10, 'EQUIPMENT', {
      fontSize: '10px', fontFamily: 'monospace', color: '#664422',
    }).setOrigin(0.5, 0));

    SLOT_NAMES.forEach((slot, i) => {
      const item = unit.equip[slot];
      const iy   = startY + 30 + i * 52;
      const active = this.selectedSlot === slot;

      const g = this.add.graphics();
      const draw = (h) => {
        g.clear();
        g.fillStyle(active ? 0x1a1008 : (h && item ? 0x120e06 : 0x0c0907), 1);
        g.fillRect(ex + 4, iy, ew - 8, 46);
        if (active) { g.lineStyle(1, 0xaa5522, 0.8); g.strokeRect(ex + 4, iy, ew - 8, 46); }
      };
      draw(false);
      this.equipCon.add(g);

      this.equipCon.add(this.add.text(ex + 14, iy + 6, slot.toUpperCase(), { fontSize:'9px', fontFamily:'monospace', color:'#554433' }));

      if (item) {
        const lvl = item.reinforceLevel ?? 0;
        const reinforced = lvl > 0 ? `  ✦${lvl}` : '';
        this.equipCon.add(this.add.text(ex + 14, iy + 22, item.name + reinforced, { fontSize:'11px', fontFamily:'monospace', color: lvl > 0 ? '#ffaa44' : '#bbaa88' }));

        const cost = REINFORCE_BASE * (lvl + 1);
        const canUp = lvl < MAX_REINFORCE;
        this.equipCon.add(this.add.text(ex + ew - 12, iy + 22, canUp ? `⊕${cost}` : 'MAX', {
          fontSize: '10px', fontFamily: 'monospace', color: canUp ? '#aa7733' : '#553322',
        }).setOrigin(1, 0));

        if (item) {
          const z = this.add.zone(ex + ew / 2, iy + 23, ew - 8, 46).setInteractive({ useHandCursor: true });
          z.on('pointerover',  () => { if (!active) draw(true); });
          z.on('pointerout',   () => { if (!active) draw(false); });
          z.on('pointerdown',  () => { this.selectedSlot = slot; this.rebuild(); });
          this.equipCon.add(z);
        }
      } else {
        this.equipCon.add(this.add.text(ex + 14, iy + 22, '—  empty', { fontSize:'10px', fontFamily:'monospace', color:'#332211' }));
      }
    });
  }

  buildDetail() {
    const dx = 370, dw = this.W - dx - 12, startY = 54;
    const panH = this.H - startY - 44;
    const cx = dx + dw / 2;

    const bg = this.add.graphics();
    bg.fillStyle(0x0c0907, 1);
    bg.fillRect(dx, startY, dw, panH);
    bg.lineStyle(1, 0x2a1a08, 1);
    bg.strokeRect(dx, startY, dw, panH);
    this.detCon.add(bg);

    const unit = state.party[this.unitIndex];
    const item = this.selectedSlot ? unit.equip[this.selectedSlot] : null;

    if (!item) {
      const msg = this.selectedSlot ? 'Nothing equipped\nin this slot.' : 'Select an equipped\nitem to reinforce.';
      this.detCon.add(this.add.text(cx, startY + panH / 2, msg, {
        fontSize: '12px', fontFamily: 'monospace', color: '#443322',
        align: 'center', wordWrap: { width: dw - 24 },
      }).setOrigin(0.5));
      return;
    }

    let y = startY + 22;
    const lvl  = item.reinforceLevel ?? 0;
    const cost = REINFORCE_BASE * (lvl + 1);
    const canUp = lvl < MAX_REINFORCE && state.tytrate >= cost;

    this.detCon.add(this.add.text(cx, y, item.name, {
      fontSize: '15px', fontFamily: 'Georgia, serif', fontStyle: 'bold', color: '#ddccaa',
    }).setOrigin(0.5));
    y += 22;

    const reinforceLabel = lvl > 0 ? `Reinforced  ✦${lvl} / ${MAX_REINFORCE}` : `Reinforcement  0 / ${MAX_REINFORCE}`;
    this.detCon.add(this.add.text(cx, y, reinforceLabel, {
      fontSize: '10px', fontFamily: 'monospace', color: lvl > 0 ? '#cc8833' : '#554433',
    }).setOrigin(0.5));
    y += 24;

    // Star row
    const starStr = '✦'.repeat(lvl) + '✧'.repeat(MAX_REINFORCE - lvl);
    this.detCon.add(this.add.text(cx, y, starStr, {
      fontSize: '18px', fontFamily: 'monospace', color: '#cc7722',
    }).setOrigin(0.5));
    y += 32;

    // Current stats
    this.detCon.add(this.add.text(cx, y, 'CURRENT STATS', { fontSize:'9px', fontFamily:'monospace', color:'#554433' }).setOrigin(0.5));
    y += 16;
    for (const [stat, val] of Object.entries(item.stats ?? {})) {
      this.detCon.add(this.add.text(cx, y, `+${val}  ${stat[0].toUpperCase() + stat.slice(1)}`, {
        fontSize: '12px', fontFamily: 'monospace', color: '#cc9944',
      }).setOrigin(0.5));
      y += 18;
    }
    y += 18;

    // What reinforce does
    if (lvl < MAX_REINFORCE) {
      const statKeys = Object.keys(item.stats ?? {});
      const targetStat = statKeys[0] ?? null;
      if (targetStat) {
        this.detCon.add(this.add.text(cx, y, `Reinforce → +1 ${targetStat[0].toUpperCase() + targetStat.slice(1)}`, {
          fontSize: '11px', fontFamily: 'monospace', color: '#886633',
        }).setOrigin(0.5));
        y += 18;
      }

      this.detCon.add(this.add.text(cx, y, `Cost:  ⊕ ${cost}`, {
        fontSize: '13px', fontFamily: 'monospace', color: canUp ? '#ffdd66' : '#554433',
      }).setOrigin(0.5));
      y += 32;

      const col = canUp
        ? { idle:0x1a0c04, hover:0x261208, bdr:0x884422, txt:'#dd8844' }
        : { idle:0x0e0e0e, hover:0x0e0e0e, bdr:0x1e1e1e, txt:'#333333' };

      const btnGfx = this.add.graphics();
      const drawBtn = (h) => {
        btnGfx.clear();
        btnGfx.fillStyle(h && canUp ? col.hover : col.idle, 1);
        btnGfx.fillRect(cx - 80, y, 160, 40);
        btnGfx.lineStyle(1, col.bdr, 1);
        btnGfx.strokeRect(cx - 80, y, 160, 40);
      };
      drawBtn(false);
      const btnTxt = this.add.text(cx, y + 20, '⚒  REINFORCE', {
        fontSize: '14px', fontFamily: 'monospace', fontStyle: 'bold', color: col.txt,
      }).setOrigin(0.5);
      this.detCon.add([btnGfx, btnTxt]);

      if (canUp) {
        const z = this.add.zone(cx, y + 20, 160, 40).setInteractive({ useHandCursor: true });
        z.on('pointerover',  () => drawBtn(true));
        z.on('pointerout',   () => drawBtn(false));
        z.on('pointerdown',  () => this.reinforce(unit, this.selectedSlot, cost, targetStat));
        this.detCon.add(z);
      }
    } else {
      this.detCon.add(this.add.text(cx, y + 10, '✦  FULLY REINFORCED  ✦', {
        fontSize: '12px', fontFamily: 'monospace', color: '#aa6622',
      }).setOrigin(0.5));
    }
  }

  reinforce(unit, slot, cost, statKey) {
    if (state.tytrate < cost) return;
    state.tytrate -= cost;
    const item = unit.equip[slot];
    item.reinforceLevel = (item.reinforceLevel ?? 0) + 1;
    if (statKey && item.stats[statKey] !== undefined) {
      item.stats[statKey] += 1;
    }
    this.rebuild();
  }
}
