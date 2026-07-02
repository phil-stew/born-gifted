import Phaser from 'phaser';
import { state, roleDisplayLabel } from '../data/gameState.js';
import { rarityColor } from '../data/items.js';

const TABS = ['ALL', 'EQUIPMENT', 'MATERIALS'];

export class InventoryScene extends Phaser.Scene {
  constructor() { super({ key: 'InventoryScene' }); }

  init() {
    this.tab      = 'ALL';
    this.selected = null;   // { item, index } — individual inventory entry
    this.equipStep = null;  // null | 'pick_unit' | 'pick_slot'
    this.equipUnit = null;
  }

  create() {
    const { width, height } = this.scale;
    this.W = width; this.H = height;

    const bg = this.add.graphics();
    bg.fillStyle(0x07080f, 1);
    bg.fillRect(0, 0, width, height);
    bg.fillStyle(0x0c0c1a, 1);
    bg.fillRect(0, 0, width, 40);
    bg.lineStyle(1, 0x222244, 1);
    bg.lineBetween(0, 40, width, 40);

    this.add.text(width / 2, 12, 'INVENTORY', {
      fontSize: '15px', fontFamily: 'monospace', fontStyle: 'bold', color: '#aaaacc',
    }).setOrigin(0.5);

    this.tytText = this.add.text(width - 14, 12, `⊕ ${state.tytrate}`, {
      fontSize: '13px', fontFamily: 'monospace', fontStyle: 'bold', color: '#ffdd66',
    }).setOrigin(1, 0.5).setDepth(10);

    const back = this.add.text(14, height - 22, '◀  WORLD MAP', {
      fontSize: '12px', fontFamily: 'monospace', color: '#7777aa',
      backgroundColor: '#0e0e20', padding: { x: 10, y: 5 },
    }).setOrigin(0, 0.5).setInteractive({ useHandCursor: true });
    back.on('pointerover', () => back.setStyle({ color: '#ffffff' }));
    back.on('pointerout',  () => back.setStyle({ color: '#7777aa' }));
    back.on('pointerdown', () => this.scene.start('WorldMapScene'));

    const partyBtn = this.add.text(width - 14, height - 22, 'PARTY  ▶', {
      fontSize: '12px', fontFamily: 'monospace', color: '#7799cc',
      backgroundColor: '#0e1020', padding: { x: 10, y: 5 },
    }).setOrigin(1, 0.5).setInteractive({ useHandCursor: true });
    partyBtn.on('pointerover', () => partyBtn.setStyle({ color: '#aaccff' }));
    partyBtn.on('pointerout',  () => partyBtn.setStyle({ color: '#7799cc' }));
    partyBtn.on('pointerdown', () => this.scene.start('PartyScene'));

    this.tabCon  = this.add.container(0, 0);
    this.listCon = this.add.container(0, 0);
    this.detCon  = this.add.container(0, 0);
    this.overlyCon = this.add.container(0, 0).setDepth(500);

    this.rebuild();
    this.cameras.main.fadeIn(300, 0, 0, 0);
  }

  rebuild() {
    this.tabCon.removeAll(true);
    this.listCon.removeAll(true);
    this.detCon.removeAll(true);
    this.overlyCon.removeAll(true);
    this.tytText.setText(`⊕ ${state.tytrate}`);
    this.buildTabs();
    this.buildList();
    this.buildDetail();
    if (this.equipStep) this.buildEquipOverlay();
  }

  buildTabs() {
    TABS.forEach((t, i) => {
      const tx = 8 + i * 90, ty = 44, tw = 82, th = 24;
      const active = this.tab === t;
      const g = this.add.graphics();
      const draw = (h) => {
        g.clear();
        g.fillStyle(active ? 0x16162a : (h ? 0x111128 : 0x0c0c1a), 1);
        g.fillRect(tx, ty, tw, th);
        g.lineStyle(1, active ? 0x4455aa : 0x1e1e33, 1);
        g.strokeRect(tx, ty, tw, th);
      };
      draw(false);
      this.tabCon.add(g);

      const counts = { ALL: state.inventory.length, EQUIPMENT: state.inventory.filter(i => i.slot).length, MATERIALS: state.inventory.filter(i => i.type === 'material').length };
      this.tabCon.add(this.add.text(tx + tw / 2, ty + th / 2, `${t}  ${counts[t]}`, {
        fontSize: '10px', fontFamily: 'monospace', fontStyle: active ? 'bold' : 'normal',
        color: active ? '#aaaaff' : '#445566',
      }).setOrigin(0.5));

      if (!active) {
        const z = this.add.zone(tx + tw / 2, ty + th / 2, tw, th).setInteractive({ useHandCursor: true });
        z.on('pointerover',  () => draw(true));
        z.on('pointerout',   () => draw(false));
        z.on('pointerdown',  () => { this.tab = t; this.selected = null; this.equipStep = null; this.rebuild(); });
        this.tabCon.add(z);
      }
    });
  }

  getEntries() {
    const inv = state.inventory;
    let filtered;
    if (this.tab === 'EQUIPMENT') filtered = inv.filter(it => it.slot && it.type !== 'material');
    else if (this.tab === 'MATERIALS') filtered = inv.filter(it => it.type === 'material');
    else filtered = [...inv];

    // Group materials by id; keep equipment as individual entries (different reinforce levels)
    const result = [];
    const matCounts = {};
    for (let i = 0; i < filtered.length; i++) {
      const it = filtered[i];
      if (it.type === 'material') {
        if (!matCounts[it.id]) { matCounts[it.id] = { item: it, indices: [], count: 0 }; result.push(matCounts[it.id]); }
        matCounts[it.id].count++;
        matCounts[it.id].indices.push(inv.indexOf(it));
      } else {
        result.push({ item: it, indices: [inv.indexOf(it)], count: 1 });
      }
    }
    return result;
  }

  buildList() {
    const entries = this.getEntries();
    const lx = 8, lw = 230, startY = 72;

    const bg = this.add.graphics();
    bg.fillStyle(0x0b0b18, 1);
    bg.fillRect(lx, startY, lw, this.H - startY - 38);
    bg.lineStyle(1, 0x1e1e33, 1);
    bg.strokeRect(lx, startY, lw, this.H - startY - 38);
    this.listCon.add(bg);

    if (!entries.length) {
      this.listCon.add(this.add.text(lx + lw / 2, startY + 60, 'Nothing here yet.', {
        fontSize: '11px', fontFamily: 'monospace', color: '#2a2a3a',
      }).setOrigin(0.5));
      return;
    }

    entries.forEach((entry, i) => {
      const { item, count } = entry;
      const iy = startY + 4 + i * 44;
      const isSelectedIdx = this.selected?.indices?.[0] === entry.indices[0];

      const g = this.add.graphics();
      const draw = (h) => {
        g.clear();
        g.fillStyle(isSelectedIdx ? 0x16162e : (h ? 0x101028 : 0x0b0b18), 1);
        g.fillRect(lx + 2, iy, lw - 4, 38);
        if (isSelectedIdx) { g.lineStyle(1, 0x4455bb, 0.7); g.strokeRect(lx + 2, iy, lw - 4, 38); }
      };
      draw(false);
      this.listCon.add(g);

      const dot = this.add.graphics();
      dot.fillStyle(rarityColor(item.rarity), 1);
      dot.fillCircle(lx + 14, iy + 14, 5);
      this.listCon.add(dot);

      const rlvl = item.reinforceLevel ?? 0;
      const nameStr = item.name + (rlvl ? ` ✦${rlvl}` : '') + (count > 1 ? ` ×${count}` : '');
      this.listCon.add(this.add.text(lx + 26, iy + 5, nameStr, {
        fontSize: '11px', fontFamily: 'monospace', color: rlvl ? '#ffaa44' : '#ccccdd',
      }));
      const subStr = item.type === 'material' ? 'MATERIAL' : (item.slot?.toUpperCase() ?? '');
      this.listCon.add(this.add.text(lx + 26, iy + 22, subStr, {
        fontSize: '9px', fontFamily: 'monospace', color: item.type === 'material' ? '#557733' : '#445577',
      }));

      // Stat mini-summary
      const stats = Object.entries(item.stats ?? {});
      if (stats.length) {
        const statStr = stats.map(([k, v]) => `+${v}${k[0].toUpperCase()}`).join(' ');
        this.listCon.add(this.add.text(lx + lw - 8, iy + 5, statStr, {
          fontSize: '10px', fontFamily: 'monospace', color: '#4488aa',
        }).setOrigin(1, 0));
      }

      const z = this.add.zone(lx + lw / 2, iy + 19, lw, 38).setInteractive({ useHandCursor: true });
      z.on('pointerover',  () => { if (!isSelectedIdx) draw(true); });
      z.on('pointerout',   () => { if (!isSelectedIdx) draw(false); });
      z.on('pointerdown',  () => { this.selected = entry; this.equipStep = null; this.equipUnit = null; this.rebuild(); });
      this.listCon.add(z);
    });
  }

  buildDetail() {
    const dx = 246, dw = this.W - dx - 8, startY = 72;
    const panH = this.H - startY - 38;
    const cx = dx + dw / 2;

    const bg = this.add.graphics();
    bg.fillStyle(0x0b0b18, 1);
    bg.fillRect(dx, startY, dw, panH);
    bg.lineStyle(1, 0x1e1e33, 1);
    bg.strokeRect(dx, startY, dw, panH);
    this.detCon.add(bg);

    const entry = this.selected;
    if (!entry) {
      this.detCon.add(this.add.text(cx, startY + panH / 2, 'Select an item', {
        fontSize: '12px', fontFamily: 'monospace', color: '#2a2a3a',
      }).setOrigin(0.5));
      return;
    }

    const { item, count } = entry;
    let y = startY + 18;

    const rlvl = item.reinforceLevel ?? 0;
    this.detCon.add(this.add.text(cx, y, item.name, {
      fontSize: '15px', fontFamily: 'Georgia, serif', fontStyle: 'bold', color: rlvl ? '#ffcc88' : '#ffffff',
    }).setOrigin(0.5));
    y += 22;

    const rarHex = '#' + rarityColor(item.rarity).toString(16).padStart(6, '0');
    const typeStr = item.type === 'material' ? 'MATERIAL' : (item.slot?.toUpperCase() ?? '');
    this.detCon.add(this.add.text(cx, y, `${item.rarity.toUpperCase()}  ·  ${typeStr}`, {
      fontSize: '10px', fontFamily: 'monospace', color: rarHex,
    }).setOrigin(0.5));
    y += 20;

    if (rlvl > 0) {
      this.detCon.add(this.add.text(cx, y, `${'✦'.repeat(rlvl)}${'✧'.repeat(3 - rlvl)}`, {
        fontSize: '16px', fontFamily: 'monospace', color: '#cc7722',
      }).setOrigin(0.5));
      y += 24;
    }

    this.detCon.add(this.add.text(cx, y, item.desc ?? '', {
      fontSize: '11px', fontFamily: 'Georgia, serif', color: '#8888aa',
      wordWrap: { width: dw - 24 }, align: 'center',
    }).setOrigin(0.5, 0));
    y += 52;

    const stats = Object.entries(item.stats ?? {});
    if (stats.length) {
      for (const [stat, val] of stats) {
        this.detCon.add(this.add.text(cx, y, `+${val}  ${stat[0].toUpperCase() + stat.slice(1)}`, {
          fontSize: '13px', fontFamily: 'monospace', color: '#44ccff',
        }).setOrigin(0.5));
        y += 20;
      }
      y += 8;
    }

    if (count > 1) {
      this.detCon.add(this.add.text(cx, y, `×${count} in inventory`, {
        fontSize: '10px', fontFamily: 'monospace', color: '#445566',
      }).setOrigin(0.5));
      y += 18;
    }

    // Actions
    if (item.slot && item.type !== 'material') {
      y += 8;
      const g = this.add.graphics();
      const draw = (h) => {
        g.clear();
        g.fillStyle(h ? 0x0e1a10 : 0x090e0a, 1);
        g.fillRect(cx - 80, y, 160, 36);
        g.lineStyle(1, h ? 0x33aa55 : 0x1e6630, 1);
        g.strokeRect(cx - 80, y, 160, 36);
      };
      draw(false);
      this.detCon.add(g);
      this.detCon.add(this.add.text(cx, y + 18, 'EQUIP TO…', {
        fontSize: '13px', fontFamily: 'monospace', fontStyle: 'bold', color: '#44bb66',
      }).setOrigin(0.5));

      const z = this.add.zone(cx, y + 18, 160, 36).setInteractive({ useHandCursor: true });
      z.on('pointerover',  () => draw(true));
      z.on('pointerout',   () => draw(false));
      z.on('pointerdown',  () => { this.equipStep = 'pick_unit'; this.rebuild(); });
      this.detCon.add(z);
      y += 48;
    }

    if (item.type === 'material') {
      y += 8;
      const sellVal = Math.floor(item.cost / 2);
      const g = this.add.graphics();
      const draw = (h) => {
        g.clear();
        g.fillStyle(h ? 0x0a160a : 0x070d07, 1);
        g.fillRect(cx - 80, y, 160, 36);
        g.lineStyle(1, h ? 0x226622 : 0x1a4a1a, 1);
        g.strokeRect(cx - 80, y, 160, 36);
      };
      draw(false);
      this.detCon.add(g);
      this.detCon.add(this.add.text(cx, y + 18, `SELL  ⊕${sellVal}`, {
        fontSize: '12px', fontFamily: 'monospace', color: '#66cc66',
      }).setOrigin(0.5));
      const z = this.add.zone(cx, y + 18, 160, 36).setInteractive({ useHandCursor: true });
      z.on('pointerover',  () => draw(true));
      z.on('pointerout',   () => draw(false));
      z.on('pointerdown',  () => {
        const idx = entry.indices[0];
        state.inventory.splice(idx, 1);
        state.tytrate += sellVal;
        this.selected = null;
        this.rebuild();
      });
      this.detCon.add(z);
    }
  }

  buildEquipOverlay() {
    const { W, H } = this;
    // Dim backdrop
    const backdrop = this.add.graphics();
    backdrop.fillStyle(0x000000, 0.6);
    backdrop.fillRect(0, 0, W, H);
    this.overlyCon.add(backdrop);

    const bw = 340, bh = this.equipStep === 'pick_unit' ? 40 + state.party.length * 52 + 50 : 40 + 6 * 50 + 50;
    const bx = (W - bw) / 2, by = (H - bh) / 2;

    const panG = this.add.graphics();
    panG.fillStyle(0x0c0c1e, 1);
    panG.fillRect(bx, by, bw, bh);
    panG.lineStyle(1, 0x334466, 1);
    panG.strokeRect(bx, by, bw, bh);
    this.overlyCon.add(panG);

    if (this.equipStep === 'pick_unit') {
      this.overlyCon.add(this.add.text(bx + bw / 2, by + 14, 'Equip to which character?', {
        fontSize: '12px', fontFamily: 'monospace', color: '#aaaacc',
      }).setOrigin(0.5));

      state.party.forEach((unit, i) => {
        const uy = by + 38 + i * 52;
        const g = this.add.graphics();
        const draw = (h) => {
          g.clear();
          g.fillStyle(h ? 0x14143a : 0x0e0e28, 1);
          g.fillRect(bx + 10, uy, bw - 20, 44);
          g.lineStyle(1, h ? 0x5566cc : 0x2a2a55, 1);
          g.strokeRect(bx + 10, uy, bw - 20, 44);
        };
        draw(false);
        this.overlyCon.add(g);

        g.fillStyle(unit.color, 1);
        g.fillCircle(bx + 26, uy + 22, 8);

        this.overlyCon.add(this.add.text(bx + 42, uy + 8, unit.name, { fontSize:'12px', fontFamily:'monospace', fontStyle:'bold', color:'#ddddff' }));
        this.overlyCon.add(this.add.text(bx + 42, uy + 26, `Lv.${unit.level}  ${roleDisplayLabel(unit)}`, { fontSize:'10px', fontFamily:'monospace', color:'#555577' }));

        const z = this.add.zone(bx + bw / 2, uy + 22, bw - 20, 44).setInteractive({ useHandCursor: true });
        z.on('pointerover',  () => draw(true));
        z.on('pointerout',   () => draw(false));
        z.on('pointerdown',  () => { this.equipUnit = unit; this.equipItem(unit); });
        this.overlyCon.add(z);
      });

    }

    // Cancel button
    const cancelY = by + bh - 38;
    const cg = this.add.graphics();
    const drawC = (h) => {
      cg.clear();
      cg.fillStyle(h ? 0x1a0e0e : 0x110a0a, 1);
      cg.fillRect(bx + bw / 2 - 60, cancelY, 120, 30);
      cg.lineStyle(1, h ? 0x664444 : 0x332222, 1);
      cg.strokeRect(bx + bw / 2 - 60, cancelY, 120, 30);
    };
    drawC(false);
    this.overlyCon.add(cg);
    this.overlyCon.add(this.add.text(bx + bw / 2, cancelY + 15, 'CANCEL', { fontSize:'11px', fontFamily:'monospace', color:'#885555' }).setOrigin(0.5));
    const cz = this.add.zone(bx + bw / 2, cancelY + 15, 120, 30).setInteractive({ useHandCursor: true });
    cz.on('pointerover',  () => drawC(true));
    cz.on('pointerout',   () => drawC(false));
    cz.on('pointerdown',  () => { this.equipStep = null; this.equipUnit = null; this.rebuild(); });
    this.overlyCon.add(cz);
  }

  equipItem(unit) {
    const item = this.selected?.item;
    if (!item?.slot) return;
    const slot = item.slot;

    // Swap: if something is already in that slot, return it to inventory
    const existing = unit.equip[slot];
    if (existing) state.inventory.push(existing);

    // Remove item from inventory (by index)
    const idx = this.selected.indices[0];
    state.inventory.splice(idx, 1);

    unit.equip[slot] = { ...item };
    this.selected  = null;
    this.equipStep = null;
    this.equipUnit = null;
    this.rebuild();
  }
}
