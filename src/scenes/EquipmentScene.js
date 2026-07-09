import Phaser from 'phaser';
import { state, equipItem, unequipSlot, effectiveStats, roleDisplayLabel, gearLayoutForUnit } from '../data/gameState.js';
import { rarityColor, gearFrameName, materialFrameName, GEAR_SHEET, registerGearFrames, MATERIAL_ICON_FRAME } from '../data/items.js';
import { stripBackgroundByKey } from '../data/heroSprites.js';
import { drawButton } from '../ui/canvasButton.js';

// 'weapon' is stored-data's name for what the Gear & Forge redesign calls
// the Class Item (see gearLayoutForUnit/CLASS_GEAR_LAYOUT in gameState.js —
// the stored slot key wasn't renamed to avoid touching ~80 items' sprite-
// frame data; this is the display-label rename).
const SLOT_ICONS = { weapon:'🏆', footwear:'👟', handwear:'🧤', chest:'🛡', headwear:'⛑' };
const SLOT_LABEL = { weapon:'CLASS ITEM', footwear:'SHOES', handwear:'GLOVES', chest:'CHEST', headwear:'HEADGEAR' };

const ICON_W = 56, ICON_H = 44; // display size for gear set thumbnail
const TEXT_X_OFF = 62;           // text left offset when icon is present

export class EquipmentScene extends Phaser.Scene {
  constructor() { super({ key: 'EquipmentScene' }); }

  preload() {
    if (!this.textures.exists('gears'))     this.load.image('gears',     'gears/gearitems.png');
    if (!this.textures.exists('materials')) this.load.image('materials', 'items/rawmaterials.png');
  }

  create() {
    const { width, height } = this.scale;

    this.selectedUnitIdx = 0;
    this.selectedSlot    = null;
    this.hitZones        = [];

    // Icon sheets are baked with a solid black background (no alpha channel).
    stripBackgroundByKey(this, 'gears',     { cols: GEAR_SHEET.cols,     rows: GEAR_SHEET.rows });
    stripBackgroundByKey(this, 'materials', { cols: 5, rows: 3 }); // irregular sheet; approximate for seeding
    registerGearFrames(this);
    this._registerMaterialFrames();

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

  _registerMaterialFrames() {
    if (!this.textures.exists('materials')) return;
    const tex = this.textures.get('materials');
    for (const [id, [x, y, w, h]] of Object.entries(MATERIAL_ICON_FRAME)) {
      const name = `material_${id}`;
      if (!tex.has(name)) tex.add(name, 0, x, y, w, h);
    }
  }

  _gearIcon(x, y, item, w = ICON_W, h = ICON_H) {
    let texKey, frame;
    if (item?.type === 'material') {
      texKey = 'materials';
      frame  = materialFrameName(item.id);
    } else if (item?.sport) {
      texKey = 'gears';
      frame  = gearFrameName(item.sport, item.slot);
    } else {
      return null;
    }
    if (!frame || !this.textures.exists(texKey) || !this.textures.get(texKey).has(frame)) return null;
    return this.add.image(x, y, texKey, frame).setDisplaySize(w, h).setOrigin(0, 0.5);
  }

  // Formats an item's flat stat lines AND (new, rolled gear only) its
  // damage/affinity/designation multiplier lines into one bonus string.
  _bonusLineText(item) {
    const flat = Object.entries(item.stats ?? {}).map(([k, v]) => `+${v} ${k[0].toUpperCase() + k.slice(1)}`);
    const mult = Object.entries(item.multipliers ?? {}).map(([k, v]) => `+${Math.round(v * 100)}% ${k[0].toUpperCase() + k.slice(1)}`);
    return [...flat, ...mult].join('  ');
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
      gfx.fillRoundedRect(4, y, 152, 86, 6);
      if (selected) {
        gfx.lineStyle(2, unit.color, 0.8);
        gfx.strokeRoundedRect(4, y, 152, 86, 6);
        gfx.fillStyle(unit.color, 0.9);
        gfx.fillRoundedRect(4, y, 3, 86, 2);
      }
      this.partyContainer.add(gfx);

      const dot = this.add.graphics();
      dot.fillStyle(unit.color, 1);
      dot.fillCircle(22, y + 18, 8);
      this.partyContainer.add(dot);

      const nameText  = this.add.text(36, y + 10, unit.name.split(' ')[0], { fontSize:'12px', fontFamily:'monospace', color: selected ? '#ffffff' : '#aaaaaa' });
      const lvlText   = this.add.text(12, y + 30, `Lv.${unit.level}  ${roleDisplayLabel(unit)}`, { fontSize:'9px', fontFamily:'monospace', color:'#555577' });

      const layout    = gearLayoutForUnit(unit);
      const equipped  = layout.slots.filter(s => unit.equip[s]).length;
      const eqText    = this.add.text(12, y + 44, `${equipped}/${layout.slots.length} equipped`, { fontSize:'9px', fontFamily:'monospace', color: equipped > 0 ? '#446644' : '#333344' });

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
    const layout = gearLayoutForUnit(unit);
    // Show every slot this unit's class actually has, PLUS any slot that
    // happens to already hold gear from before this redesign (equipment was
    // never class-restricted, so an existing save could have e.g. a
    // Performance-class unit with legacy footwear equipped) — so nothing
    // equipped becomes invisible or unreachable to unequip.
    const visibleSlots = [
      ...layout.slots,
      ...Object.keys(unit.equip).filter(s => unit.equip[s] && !layout.slots.includes(s)),
    ];
    const sx = 168, sw = 288;
    let y = 50;

    const header = this.add.text(sx + sw / 2, y, unit.name, {
      fontSize: '14px', fontFamily: 'monospace', fontStyle: 'bold', color: '#dddddd',
    }).setOrigin(0.5);
    this.slotsContainer.add(header);
    y += 24;

    visibleSlots.forEach((slot) => {
      const item     = unit.equip[slot];
      const selected = slot === this.selectedSlot;
      const rColor   = item ? rarityColor(item.rarity) : 0x333344;

      const gfx = this.add.graphics();
      gfx.fillStyle(selected ? 0x1a1a2a : 0x0e0e1e, 1);
      gfx.fillRoundedRect(sx, y, sw, 64, 8);
      gfx.lineStyle(selected ? 2 : 1, selected ? 0xffaa44 : (item ? rColor : 0x222244), 1);
      gfx.strokeRoundedRect(sx, y, sw, 64, 8);
      if (selected) { gfx.fillStyle(0xffaa44, 0.9); gfx.fillRoundedRect(sx, y, 4, 64, 2); }
      this.slotsContainer.add(gfx);

      // Class Item's stat multiplier (×2 Martial Arts, ×3 Performance) is
      // called out right on the slot label so it's clear why that slot
      // matters more for those classes.
      const label = (slot === 'weapon' && layout.classItemMultiplier > 1)
        ? `${SLOT_LABEL[slot]} ×${layout.classItemMultiplier}`
        : (SLOT_LABEL[slot] ?? slot.toUpperCase());
      const slotIcon = this.add.text(sx + 10, y + 8, SLOT_ICONS[slot] ?? '?', { fontSize:'16px' });
      const slotLbl  = this.add.text(sx + 32, y + 8, label, { fontSize:'9px', fontFamily:'monospace', color:'#555577' });
      this.slotsContainer.add([slotIcon, slotLbl]);

      if (item) {
        const rc = '#' + rColor.toString(16).padStart(6, '0');
        // Per-item icon (small square, bottom-left of slot)
        const icon = this._gearIcon(sx + 10, y + 44, item, 44, 44);
        if (icon) this.slotsContainer.add(icon);
        const tx = icon ? sx + 62 : sx + 10;
        const itemName = this.add.text(tx, y + 26, item.name + (item.forClass ? ` (${item.forClass})` : ''), { fontSize:'12px', fontFamily:'monospace', fontStyle:'bold', color:rc });
        const bonus    = this._bonusLineText(item);
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
    const layout = gearLayoutForUnit(unit);
    const ix = 468, iw = 320;
    let y = 50;

    // Browsing a specific slot always shows everything of that slot type
    // (including a legacy slot outside this unit's current layout, if one's
    // already equipped there — see renderSlots). Browsing "all" hides gear
    // for slots this unit's class doesn't have at all, so it can't be
    // equipped into a slot that doesn't exist for them.
    const filteredItems = this.selectedSlot
      ? state.inventory.filter(item => item.slot === this.selectedSlot)
      : state.inventory.filter(item => item.slot == null || layout.slots.includes(item.slot));

    const headerStr = this.selectedSlot
      ? `INVENTORY — ${SLOT_LABEL[this.selectedSlot] ?? this.selectedSlot.toUpperCase()}`
      : 'INVENTORY';
    const hdr = this.add.text(ix + iw / 2, y, headerStr, {
      fontSize: '10px', fontFamily: 'monospace', color: '#ffaa44',
    }).setOrigin(0.5);
    this.inventoryContainer.add(hdr);
    y += 20;

    if (this.selectedSlot && unit.equip[this.selectedSlot]) {
      const unequipBtn = drawButton(this, {
        x: ix + iw / 2, y: y + 12, w: 160, h: 26, label: '✕  REMOVE ITEM',
        fontSize: '11px', radius: 6,
        bg: 0x1a0a0a, bgHover: 0x260e0e, border: 0x662222, accent: 0xff6666,
        textColor: '#cc4444', textHoverColor: '#ff6666',
        onClick: () => { unequipSlot(unit, this.selectedSlot); this.selectedSlot = null; this.renderAll(); },
      });
      this.inventoryContainer.add(unequipBtn.container);
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
      const hasIcon = item.type === 'material' ? !!materialFrameName(item.id) : !!(item.sport && gearFrameName(item.sport, item.slot));
      const textX  = ix + (hasIcon ? TEXT_X_OFF : 10);

      const gfx = this.add.graphics();
      gfx.fillStyle(0x0e0e1e, 1);
      gfx.fillRoundedRect(ix, y, iw, 58, 6);
      gfx.lineStyle(1, rColor, 0.5);
      gfx.strokeRoundedRect(ix, y, iw, 58, 6);
      this.inventoryContainer.add(gfx);

      // Gear icon
      if (hasIcon) {
        const icon = this._gearIcon(ix + 4, y + 29, item, ICON_W, ICON_H);
        if (icon) this.inventoryContainer.add(icon);
      }

      const nameT  = this.add.text(textX, y + 6, item.name, { fontSize:'12px', fontFamily:'monospace', fontStyle:'bold', color:rc });
      const slotLabelStr = item.slot ? (SLOT_LABEL[item.slot] ?? item.slot.toUpperCase()) : 'MATERIAL';
      const slotT  = this.add.text(textX, y + 23, slotLabelStr + (item.forClass ? ` · ${item.forClass}` : ''), {
        fontSize: '9px', fontFamily: 'monospace', color: item.type === 'material' ? '#668844' : '#555577',
      });
      const bonus  = this._bonusLineText(item);
      const bonusT = this.add.text(textX, y + 38, bonus, { fontSize:'9px', fontFamily:'monospace', color:'#446644' });
      const costT  = this.add.text(ix + iw - 10, y + 8, `${item.cost}T`, { fontSize:'10px', fontFamily:'monospace', color:'#665500' }).setOrigin(1, 0);

      this.inventoryContainer.add([nameT, slotT, bonusT, costT]);

      const hit = this.add.rectangle(ix + iw / 2, y + 29, iw, 58).setInteractive({ useHandCursor: true });
      hit.on('pointerover', () => { gfx.clear(); gfx.fillStyle(0x151528,1); gfx.fillRoundedRect(ix,y,iw,58,6); gfx.lineStyle(2,rColor,0.9); gfx.strokeRoundedRect(ix,y,iw,58,6); gfx.fillStyle(rColor,0.9); gfx.fillRoundedRect(ix,y,3,58,2); });
      hit.on('pointerout',  () => { gfx.clear(); gfx.fillStyle(0x0e0e1e,1); gfx.fillRoundedRect(ix,y,iw,58,6); gfx.lineStyle(1,rColor,0.5); gfx.strokeRoundedRect(ix,y,iw,58,6); });
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
    drawButton(this, {
      x: 76, y: height - 24, w: 128, h: 30, label: '◀  WORLD MAP',
      fontSize: '13px', radius: 6,
      bg: 0x0e0e20, bgHover: 0x181834, border: 0x334477, accent: 0xffffff,
      textColor: '#7777aa',
      onClick: () => this.scene.start('WorldMapScene'),
    });
  }
}
