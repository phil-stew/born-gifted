import Phaser from 'phaser';
import { state, equipItem, unequipSlot, effectiveStats, roleDisplayLabel } from '../data/gameState.js';
import { rarityColor, gearFrameName, basicFrameName, GEAR_GRID, ITEM_FRAMES, BASIC_FRAMES } from '../data/items.js';

const SLOTS      = ['weapon', 'footwear', 'handwear', 'chest', 'headwear'];
const SLOT_ICONS = { weapon:'⚔', footwear:'👟', handwear:'🧤', chest:'🛡', headwear:'⛑' };
const SLOT_LABEL = { weapon:'WEAPON', footwear:'SHOES', handwear:'GLOVES', chest:'CHEST', headwear:'HEADGEAR' };

const ICON_W = 56, ICON_H = 44; // display size for gear set thumbnail
const TEXT_X_OFF = 62;           // text left offset when icon is present

export class EquipmentScene extends Phaser.Scene {
  constructor() { super({ key: 'EquipmentScene' }); }

  preload() {
    if (!this.textures.exists('gears'))     this.load.image('gears',     'gears/gearset10.png');
    if (!this.textures.exists('basicgear')) this.load.image('basicgear', 'gears/basicgear.png');
  }

  create() {
    const { width, height } = this.scale;

    this.selectedUnitIdx = 0;
    this.selectedSlot    = null;
    this.hitZones        = [];

    this._registerGearFrames();
    this._registerBasicFrames();

    // Background
    const bg = this.add.graphics();
    bg.fillStyle(0x0a0a18, 1);
    bg.fillRect(0, 0, width, height);

    // Panel dividers
    bg.lineStyle(1, 0x222244, 1);
    bg.lineBetween(160, 38, 160, height - 48);
    bg.lineBetween(460, 38, 460, height - 48);
    bg.lineBetween(0, 38, width, 38);
    bg.lineBetween(0, height - 48, width, height - 48);

    // Title
    this.add.text(width / 2, 14, 'EQUIPMENT', {
      fontSize: '15px', fontFamily: 'monospace', fontStyle: 'bold', color: '#ffaa44',
    }).setOrigin(0.5, 0);

    this.partyContainer     = this.add.container(0, 0);
    this.slotsContainer     = this.add.container(0, 0);
    this.inventoryContainer = this.add.container(0, 0);

    this.renderAll();
    this.drawBackBtn(height);
  }

  _registerGearFrames() {
    if (!this.textures.exists('gears')) return;
    const tex = this.textures.get('gears');
    const { labelW, headerH, cellW, cellH, sportRow, rarityCol } = GEAR_GRID;
    for (const [sport, slots] of Object.entries(ITEM_FRAMES)) {
      const row = sportRow[sport];
      if (row === undefined) continue;
      for (const [slot, [rx, ry, rw, rh]] of Object.entries(slots)) {
        for (const [rarity, col] of Object.entries(rarityCol)) {
          const name = `gear_${sport}_${slot}_${rarity}`;
          if (!tex.has(name)) {
            tex.add(name, 0, labelW + col * cellW + rx, headerH + row * cellH + ry, rw, rh);
          }
        }
      }
    }
  }

  _registerBasicFrames() {
    if (!this.textures.exists('basicgear')) return;
    const tex = this.textures.get('basicgear');
    for (const [slot, entries] of Object.entries(BASIC_FRAMES)) {
      for (const { rarity, x, y, w, h } of entries) {
        const name = `basic_${slot}_${rarity}`;
        if (!tex.has(name)) tex.add(name, 0, x, y, w, h);
      }
    }
  }

  _gearIcon(x, y, item, w = ICON_W, h = ICON_H) {
    let texKey, frame;
    if (item?.sport) {
      texKey = 'gears';
      frame  = gearFrameName(item.sport, item.slot, item.rarity);
    } else {
      texKey = 'basicgear';
      frame  = basicFrameName(item?.slot, item?.rarity);
    }
    if (!frame || !this.textures.exists(texKey) || !this.textures.get(texKey).has(frame)) return null;
    return this.add.image(x, y, texKey, frame).setDisplaySize(w, h).setOrigin(0, 0.5);
  }

  renderAll() {
    this.partyContainer.removeAll(true);
    this.slotsContainer.removeAll(true);
    this.inventoryContainer.removeAll(true);
    this.clearHitZones();
    this.renderPartyList();
    this.renderSlots();
    this.renderInventory();
  }

  clearHitZones() {
    this.hitZones.forEach(h => h.destroy());
    this.hitZones = [];
  }

  renderPartyList() {
    state.party.forEach((unit, i) => {
      const y = 50 + i * 92;
      const selected = i === this.selectedUnitIdx;

      const gfx = this.add.graphics();
      gfx.fillStyle(selected ? 0x1a1a3a : 0x0d0d1a, 1);
      gfx.fillRect(4, y, 152, 86);
      if (selected) {
        gfx.lineStyle(2, unit.color, 0.8);
        gfx.strokeRect(4, y, 152, 86);
      }
      this.partyContainer.add(gfx);

      const dot = this.add.graphics();
      dot.fillStyle(unit.color, 1);
      dot.fillCircle(22, y + 18, 8);
      this.partyContainer.add(dot);

      const nameText  = this.add.text(36, y + 10, unit.name.split(' ')[0], { fontSize:'12px', fontFamily:'monospace', color: selected ? '#ffffff' : '#aaaaaa' });
      const lvlText   = this.add.text(12, y + 30, `Lv.${unit.level}  ${roleDisplayLabel(unit)}`, { fontSize:'9px', fontFamily:'monospace', color:'#555577' });

      const equipped  = SLOTS.filter(s => unit.equip[s]).length;
      const eqText    = this.add.text(12, y + 44, `${equipped}/5 equipped`, { fontSize:'9px', fontFamily:'monospace', color: equipped > 0 ? '#446644' : '#333344' });

      const eff       = effectiveStats(unit);
      const statText  = this.add.text(12, y + 58, `Spd:${eff.speed} Str:${eff.strength}`, { fontSize:'9px', fontFamily:'monospace', color:'#334455' });
      const statText2 = this.add.text(12, y + 70, `Sta:${eff.stamina} End:${eff.endurance}`, { fontSize:'9px', fontFamily:'monospace', color:'#334455' });

      this.partyContainer.add([nameText, lvlText, eqText, statText, statText2]);

      const hit = this.add.rectangle(80, y + 43, 152, 86).setInteractive({ useHandCursor: true });
      hit.on('pointerdown', () => { this.selectedUnitIdx = i; this.selectedSlot = null; this.renderAll(); });
      this.hitZones.push(hit);
    });
  }

  renderSlots() {
    const unit = state.party[this.selectedUnitIdx];
    const sx = 168, sw = 288;
    let y = 50;

    const header = this.add.text(sx + sw / 2, y, unit.name, {
      fontSize: '14px', fontFamily: 'monospace', fontStyle: 'bold', color: '#dddddd',
    }).setOrigin(0.5);
    this.slotsContainer.add(header);
    y += 24;

    SLOTS.forEach((slot) => {
      const item     = unit.equip[slot];
      const selected = slot === this.selectedSlot;
      const rColor   = item ? rarityColor(item.rarity) : 0x333344;

      const gfx = this.add.graphics();
      gfx.fillStyle(selected ? 0x1a1a2a : 0x0e0e1e, 1);
      gfx.fillRect(sx, y, sw, 64);
      gfx.lineStyle(selected ? 2 : 1, selected ? 0xffaa44 : (item ? rColor : 0x222244), 1);
      gfx.strokeRect(sx, y, sw, 64);
      this.slotsContainer.add(gfx);

      const slotIcon = this.add.text(sx + 10, y + 8, SLOT_ICONS[slot] ?? '?', { fontSize:'16px' });
      const slotLbl  = this.add.text(sx + 32, y + 8, SLOT_LABEL[slot] ?? slot.toUpperCase(), { fontSize:'9px', fontFamily:'monospace', color:'#555577' });
      this.slotsContainer.add([slotIcon, slotLbl]);

      if (item) {
        const rc = '#' + rColor.toString(16).padStart(6, '0');
        // Per-item icon (small square, bottom-left of slot)
        const icon = this._gearIcon(sx + 10, y + 44, item, 44, 44);
        if (icon) this.slotsContainer.add(icon);
        const tx = icon ? sx + 62 : sx + 10;
        const itemName = this.add.text(tx, y + 26, item.name, { fontSize:'12px', fontFamily:'monospace', fontStyle:'bold', color:rc });
        const bonus    = Object.entries(item.stats ?? {}).map(([k,v]) => `+${v} ${k[0].toUpperCase()+k.slice(1)}`).join('  ');
        const bonusT   = this.add.text(tx, y + 46, bonus, { fontSize:'9px', fontFamily:'monospace', color:'#446644' });
        this.slotsContainer.add([itemName, bonusT]);
      } else {
        const emptyText = this.add.text(sx + 10, y + 34, '— empty —', { fontSize:'11px', fontFamily:'monospace', color:'#333344' });
        this.slotsContainer.add(emptyText);
      }

      const hit = this.add.rectangle(sx + sw / 2, y + 32, sw, 64).setInteractive({ useHandCursor: true });
      hit.on('pointerdown', () => { this.selectedSlot = (this.selectedSlot === slot) ? null : slot; this.renderAll(); });
      this.hitZones.push(hit);
      y += 70;
    });
  }

  renderInventory() {
    const { height } = this.scale;
    const unit = state.party[this.selectedUnitIdx];
    const ix = 468, iw = 320;
    let y = 50;

    const filteredItems = this.selectedSlot
      ? state.inventory.filter(item => item.slot === this.selectedSlot)
      : state.inventory;

    const headerStr = this.selectedSlot
      ? `INVENTORY — ${SLOT_LABEL[this.selectedSlot] ?? this.selectedSlot.toUpperCase()}`
      : 'INVENTORY';
    const hdr = this.add.text(ix + iw / 2, y, headerStr, {
      fontSize: '10px', fontFamily: 'monospace', color: '#ffaa44',
    }).setOrigin(0.5);
    this.inventoryContainer.add(hdr);
    y += 20;

    if (this.selectedSlot && unit.equip[this.selectedSlot]) {
      const unequipBtn = this.add.text(ix + iw / 2, y, '✕  REMOVE ITEM', {
        fontSize: '11px', fontFamily: 'monospace', color: '#cc4444',
        backgroundColor: '#1a0a0a', padding: { x: 10, y: 4 },
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      unequipBtn.on('pointerover', () => unequipBtn.setStyle({ color: '#ff6666' }));
      unequipBtn.on('pointerout',  () => unequipBtn.setStyle({ color: '#cc4444' }));
      unequipBtn.on('pointerdown', () => { unequipSlot(unit, this.selectedSlot); this.selectedSlot = null; this.renderAll(); });
      this.inventoryContainer.add(unequipBtn);
      y += 32;
    }

    if (filteredItems.length === 0) {
      const emptyMsg = this.selectedSlot ? `No ${SLOT_LABEL[this.selectedSlot]} items\nin inventory.` : 'Inventory is empty.\nFind items in battle!';
      this.inventoryContainer.add(
        this.add.text(ix + iw / 2, y + 20, emptyMsg, { fontSize:'12px', fontFamily:'monospace', color:'#444455', align:'center' }).setOrigin(0.5, 0)
      );
      return;
    }

    for (const item of filteredItems) {
      if (y + 60 > height - 52) break;

      const rColor = rarityColor(item.rarity);
      const rc     = '#' + rColor.toString(16).padStart(6, '0');
      const hasIcon = !!(item.sport && gearFrameName(item.sport, item.rarity));
      const textX  = ix + (hasIcon ? TEXT_X_OFF : 10);

      const gfx = this.add.graphics();
      gfx.fillStyle(0x0e0e1e, 1);
      gfx.fillRect(ix, y, iw, 58);
      gfx.lineStyle(1, rColor, 0.5);
      gfx.strokeRect(ix, y, iw, 58);
      this.inventoryContainer.add(gfx);

      // Gear icon
      if (hasIcon) {
        const icon = this._gearIcon(ix + 4, y + 29, item, ICON_W, ICON_H);
        if (icon) this.inventoryContainer.add(icon);
      }

      const nameT  = this.add.text(textX, y + 6, item.name, { fontSize:'12px', fontFamily:'monospace', fontStyle:'bold', color:rc });
      const slotT  = this.add.text(textX, y + 23, item.slot ? (SLOT_LABEL[item.slot] ?? item.slot.toUpperCase()) : 'MATERIAL', {
        fontSize: '9px', fontFamily: 'monospace', color: item.type === 'material' ? '#668844' : '#555577',
      });
      const bonus  = Object.entries(item.stats ?? {}).map(([k,v]) => `+${v} ${k[0].toUpperCase()+k.slice(1)}`).join('  ');
      const bonusT = this.add.text(textX, y + 38, bonus, { fontSize:'9px', fontFamily:'monospace', color:'#446644' });
      const costT  = this.add.text(ix + iw - 10, y + 8, `${item.cost}T`, { fontSize:'10px', fontFamily:'monospace', color:'#665500' }).setOrigin(1, 0);

      this.inventoryContainer.add([nameT, slotT, bonusT, costT]);

      const hit = this.add.rectangle(ix + iw / 2, y + 29, iw, 58).setInteractive({ useHandCursor: true });
      hit.on('pointerover', () => { gfx.clear(); gfx.fillStyle(0x151528,1); gfx.fillRect(ix,y,iw,58); gfx.lineStyle(2,rColor,0.9); gfx.strokeRect(ix,y,iw,58); });
      hit.on('pointerout',  () => { gfx.clear(); gfx.fillStyle(0x0e0e1e,1); gfx.fillRect(ix,y,iw,58); gfx.lineStyle(1,rColor,0.5); gfx.strokeRect(ix,y,iw,58); });
      hit.on('pointerdown', () => {
        if (item.type === 'material') return;
        equipItem(unit, item);
        this.selectedSlot = null;
        this.renderAll();
      });
      this.hitZones.push(hit);

      y += 64;
    }
  }

  drawBackBtn(height) {
    const btn = this.add.text(16, height - 24, '◀  WORLD MAP', {
      fontSize: '13px', fontFamily: 'monospace', color: '#7777aa',
      backgroundColor: '#0e0e20', padding: { x: 10, y: 5 },
    }).setOrigin(0, 0.5).setInteractive({ useHandCursor: true });
    btn.on('pointerover', () => btn.setStyle({ color: '#ffffff' }));
    btn.on('pointerout',  () => btn.setStyle({ color: '#7777aa' }));
    btn.on('pointerdown', () => this.scene.start('WorldMapScene'));
  }
}
