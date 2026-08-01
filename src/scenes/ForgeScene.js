import Phaser from 'phaser';
import { state, roleDisplayLabel, gearLayoutForUnit } from '../data/gameState.js';
import { FORGE_RECIPES, ORE_TIER_TO_RARITY, RARITY_GEAR_VALUE, rollGearItem, getItem } from '../data/items.js';
import { playSfx, SFX } from '../audio/sound.js';
import { playMusic } from '../audio/music.js';

// Cost to reinforce: 75 per level (level 0→1 costs 75, 1→2 costs 150, 2→3 costs 225)
const REINFORCE_BASE = 75;
const MAX_REINFORCE  = 3;

const SLOT_NAMES = ['weapon', 'footwear', 'handwear', 'chest', 'headwear'];
const SLOT_LABEL = { weapon:'Class Item', footwear:'Footwear', handwear:'Handwear', chest:'Chest', headwear:'Headwear' };

// Panels sit below a mode tab row (REINFORCE/CRAFT), shared by both modes.
const PANEL_START_Y = 80;

export class ForgeScene extends Phaser.Scene {
  constructor() { super({ key: 'ForgeScene' }); }

  init(data) {
    this.hubData      = data.hubData ?? {};
    this.unitIndex    = 0;
    this.selectedSlot = null;
    this.mode           = 'reinforce'; // 'reinforce' | 'craft'
    this.selectedRecipe = null;
    this.selectedResultSlot = null;
    this.selectedOreId  = null;
  }

  create() {
    const { width, height } = this.scale;
    this.W = width; this.H = height;

    playMusic(this, 'hub');

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

    // Moved into the header (2026-07-11, "have the back button at top of
    // menues") — was bottom-left, now top-left, same row as the title.
    const back = this.add.text(14, 14, '◀  BACK', {
      fontSize: '13px', fontFamily: 'monospace', color: '#7777aa',
      backgroundColor: '#0e0e20', padding: { x: 10, y: 5 },
    }).setOrigin(0, 0.5).setInteractive({ useHandCursor: true }).setDepth(10);
    back.on('pointerover', () => back.setStyle({ color: '#ffffff' }));
    back.on('pointerout',  () => back.setStyle({ color: '#7777aa' }));
    back.on('pointerdown', () => {
      playSfx(this, SFX.click);
      this.cameras.main.fadeOut(300, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        // The old "leaving the Forge after M3 reveals M4" one-off cutscene
        // is gone — the Capital questline's craft-quest gate now handles
        // that beat properly (see state.capitalCraftCount and
        // WorldMapScene's M3 click handler, M0-M4 redesign Phase 3).
        this.scene.start('HubScene', this.hubData);
      });
    });

    this.tabCon  = this.add.container(0, 0);
    this.unitCon = this.add.container(0, 0);
    this.equipCon = this.add.container(0, 0);
    this.detCon  = this.add.container(0, 0);

    this.rebuild();
    this.cameras.main.fadeIn(300, 0, 0, 0);
  }

  rebuild() {
    this.tabCon.removeAll(true);
    this.unitCon.removeAll(true);
    this.equipCon.removeAll(true);
    this.detCon.removeAll(true);
    this.tytText.setText(`⊕ ${state.tytrate}`);
    this.buildModeTabs();
    this.buildUnitList();
    if (this.mode === 'craft') {
      this.buildRecipeList();
      this.buildCraftDetail();
    } else {
      this.buildEquipList();
      this.buildDetail();
    }
  }

  buildModeTabs() {
    [{ key:'reinforce', label:'⚒ REINFORCE' }, { key:'craft', label:'✦ CRAFT' }].forEach(({ key, label }, i) => {
      const tx = 10 + i * 132, ty = 50, tw = 124, th = 24;
      const active = this.mode === key;
      const g = this.add.graphics();
      const draw = (h) => {
        g.clear();
        g.fillStyle(active ? 0x1a1008 : (h ? 0x120e06 : 0x0c0907), 1);
        g.fillRoundedRect(tx, ty, tw, th, 6);
        g.lineStyle(1.5, active ? 0xcc7733 : 0x2a1a08, 1);
        g.strokeRoundedRect(tx, ty, tw, th, 6);
        if (active) { g.fillStyle(0xcc7733, 0.6); g.fillRoundedRect(tx, ty, tw, 2, { tl: 6, tr: 6, bl: 0, br: 0 }); }
      };
      draw(false);
      this.tabCon.add(g);
      this.tabCon.add(this.add.text(tx + tw / 2, ty + th / 2, label, {
        fontSize: '11px', fontFamily: 'monospace', fontStyle: active ? 'bold' : 'normal',
        color: active ? '#ffaa44' : '#775533',
      }).setOrigin(0.5));
      if (!active) {
        const z = this.add.zone(tx + tw / 2, ty + th / 2, tw, th).setInteractive({ useHandCursor: true });
        z.on('pointerover', () => draw(true));
        z.on('pointerout',  () => draw(false));
        z.on('pointerdown', () => {
          playSfx(this, SFX.click);
          this.mode = key;
          this.selectedSlot = null;
          this.selectedRecipe = null;
          this.selectedResultSlot = null;
          this.selectedOreId = null;
          this.rebuild();
        });
        this.tabCon.add(z);
      }
    });
  }

  buildUnitList() {
    const lx = 10, lw = 140, startY = PANEL_START_Y;
    const panH = this.H - startY - 44;

    const shadow = this.add.graphics();
    shadow.fillStyle(0x000000, 0.3);
    shadow.fillRoundedRect(lx + 2, startY + 3, lw, panH, 8);
    this.unitCon.add(shadow);

    const bg = this.add.graphics();
    bg.fillStyle(0x0c0907, 1);
    bg.fillRoundedRect(lx, startY, lw, panH, 8);
    bg.lineStyle(1.5, 0x2a1a08, 1);
    bg.strokeRoundedRect(lx, startY, lw, panH, 8);
    bg.fillStyle(0xcc7733, 0.4);
    bg.fillRoundedRect(lx, startY, lw, 3, { tl: 8, tr: 8, bl: 0, br: 0 });
    this.unitCon.add(bg);

    state.party.forEach((unit, i) => {
      const uy = startY + 8 + i * 64;
      const active = i === this.unitIndex;
      const g = this.add.graphics();
      const draw = (h) => {
        g.clear();
        g.fillStyle(active ? 0x1a1008 : (h ? 0x120e06 : 0x0c0907), 1);
        g.fillRoundedRect(lx + 2, uy, lw - 4, 58, 6);
        if (active) {
          g.lineStyle(1.5, 0x774422, 0.8);
          g.strokeRoundedRect(lx + 2, uy, lw - 4, 58, 6);
          g.fillStyle(0xcc7733, 0.9);
          g.fillRoundedRect(lx + 2, uy, 3, 58, 2);
        }
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
      z.on('pointerdown',  () => { playSfx(this, SFX.click); this.unitIndex = i; this.selectedSlot = null; this.rebuild(); });
      this.unitCon.add(z);
    });
  }

  buildEquipList() {
    const ex = 160, ew = 200, startY = PANEL_START_Y;
    const panH = this.H - startY - 44;
    const unit = state.party[this.unitIndex];

    const shadow = this.add.graphics();
    shadow.fillStyle(0x000000, 0.3);
    shadow.fillRoundedRect(ex + 2, startY + 3, ew, panH, 8);
    this.equipCon.add(shadow);

    const bg = this.add.graphics();
    bg.fillStyle(0x0c0907, 1);
    bg.fillRoundedRect(ex, startY, ew, panH, 8);
    bg.lineStyle(1.5, 0x2a1a08, 1);
    bg.strokeRoundedRect(ex, startY, ew, panH, 8);
    bg.fillStyle(0xcc7733, 0.4);
    bg.fillRoundedRect(ex, startY, ew, 3, { tl: 8, tr: 8, bl: 0, br: 0 });
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
        g.fillRoundedRect(ex + 4, iy, ew - 8, 46, 6);
        if (active) {
          g.lineStyle(1.5, 0xaa5522, 0.8);
          g.strokeRoundedRect(ex + 4, iy, ew - 8, 46, 6);
          g.fillStyle(0xaa5522, 0.9);
          g.fillRoundedRect(ex + 4, iy, 3, 46, 2);
        }
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
          z.on('pointerdown',  () => { playSfx(this, SFX.click); this.selectedSlot = slot; this.rebuild(); });
          this.equipCon.add(z);
        }
      } else {
        this.equipCon.add(this.add.text(ex + 14, iy + 22, '—  empty', { fontSize:'10px', fontFamily:'monospace', color:'#332211' }));
      }
    });
  }

  buildDetail() {
    const dx = 370, dw = this.W - dx - 12, startY = PANEL_START_Y;
    const panH = this.H - startY - 44;
    const cx = dx + dw / 2;

    const shadow = this.add.graphics();
    shadow.fillStyle(0x000000, 0.3);
    shadow.fillRoundedRect(dx + 2, startY + 3, dw, panH, 8);
    this.detCon.add(shadow);

    const bg = this.add.graphics();
    bg.fillStyle(0x0c0907, 1);
    bg.fillRoundedRect(dx, startY, dw, panH, 8);
    bg.lineStyle(1.5, 0x2a1a08, 1);
    bg.strokeRoundedRect(dx, startY, dw, panH, 8);
    bg.fillStyle(0xcc7733, 0.4);
    bg.fillRoundedRect(dx, startY, dw, 3, { tl: 8, tr: 8, bl: 0, br: 0 });
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
        btnGfx.fillRoundedRect(cx - 80, y, 160, 40, 8);
        btnGfx.lineStyle(1.5, col.bdr, 1);
        btnGfx.strokeRoundedRect(cx - 80, y, 160, 40, 8);
        if (h && canUp) { btnGfx.fillStyle(col.bdr, 0.9); btnGfx.fillRoundedRect(cx - 80, y, 4, 40, 2); }
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
    playSfx(this, SFX.craft);
    this.rebuild();
  }

  // ── Crafting (Gear & Forge, FORGE_RECIPES) ──────────────────────────────
  // 'ore' in a recipe's materials is abstract — resolves to whichever
  // specific ore item (iron/silver/gold/mystic) the player owns; its
  // oreTier drives the crafted item's rarity via ORE_TIER_TO_RARITY.

  oreOptions() {
    const seen = new Map();
    for (const it of state.inventory) {
      if (it.oreTier != null && !seen.has(it.id)) seen.set(it.id, it);
    }
    return [...seen.values()];
  }

  // Whether `recipe` is currently craftable at all (every non-ore material
  // present at least once, and at least one ore type owned).
  recipeAvailable(recipe) {
    const nonOre = recipe.materials.filter(m => m !== 'ore');
    if (!nonOre.every(id => state.inventory.some(i => i.id === id))) return false;
    if (recipe.materials.includes('ore') && this.oreOptions().length === 0) return false;
    return true;
  }

  buildRecipeList() {
    const ex = 160, ew = 200, startY = PANEL_START_Y;
    const panH = this.H - startY - 44;

    const shadow = this.add.graphics();
    shadow.fillStyle(0x000000, 0.3);
    shadow.fillRoundedRect(ex + 2, startY + 3, ew, panH, 8);
    this.equipCon.add(shadow);

    const bg = this.add.graphics();
    bg.fillStyle(0x0c0907, 1);
    bg.fillRoundedRect(ex, startY, ew, panH, 8);
    bg.lineStyle(1.5, 0x2a1a08, 1);
    bg.strokeRoundedRect(ex, startY, ew, panH, 8);
    bg.fillStyle(0xcc7733, 0.4);
    bg.fillRoundedRect(ex, startY, ew, 3, { tl: 8, tr: 8, bl: 0, br: 0 });
    this.equipCon.add(bg);

    this.equipCon.add(this.add.text(ex + ew / 2, startY + 10, 'RECIPES', {
      fontSize: '10px', fontFamily: 'monospace', color: '#664422',
    }).setOrigin(0.5, 0));

    FORGE_RECIPES.forEach((recipe, i) => {
      const iy = startY + 30 + i * 60;
      const active = this.selectedRecipe?.id === recipe.id;
      const available = this.recipeAvailable(recipe);

      const g = this.add.graphics();
      const draw = (h) => {
        g.clear();
        g.fillStyle(active ? 0x1a1008 : (h && available ? 0x120e06 : 0x0c0907), 1);
        g.fillRoundedRect(ex + 4, iy, ew - 8, 52, 6);
        if (active) {
          g.lineStyle(1.5, 0xaa5522, 0.8);
          g.strokeRoundedRect(ex + 4, iy, ew - 8, 52, 6);
          g.fillStyle(0xaa5522, 0.9);
          g.fillRoundedRect(ex + 4, iy, 3, 52, 2);
        }
      };
      draw(false);
      this.equipCon.add(g);

      const slotStr = recipe.resultSlots.map(s => SLOT_LABEL[s] ?? s).join(' / ');
      this.equipCon.add(this.add.text(ex + 14, iy + 6, slotStr, {
        fontSize: '11px', fontFamily: 'monospace', fontStyle: 'bold',
        color: available ? '#ddccaa' : '#554433',
      }));
      this.equipCon.add(this.add.text(ex + 14, iy + 24, recipe.desc, {
        fontSize: '9px', fontFamily: 'monospace', color: available ? '#997755' : '#443322',
        wordWrap: { width: ew - 24 },
      }));

      const z = this.add.zone(ex + ew / 2, iy + 26, ew - 8, 52).setInteractive({ useHandCursor: true });
      z.on('pointerover', () => { if (!active) draw(true); });
      z.on('pointerout',  () => { if (!active) draw(false); });
      z.on('pointerdown', () => {
        playSfx(this, SFX.click);
        this.selectedRecipe = recipe;
        this.selectedResultSlot = recipe.resultSlots[0];
        const ores = this.oreOptions();
        this.selectedOreId = ores[0]?.id ?? null;
        this.rebuild();
      });
      this.equipCon.add(z);
    });
  }

  buildCraftDetail() {
    const dx = 370, dw = this.W - dx - 12, startY = PANEL_START_Y;
    const panH = this.H - startY - 44;
    const cx = dx + dw / 2;

    const shadow = this.add.graphics();
    shadow.fillStyle(0x000000, 0.3);
    shadow.fillRoundedRect(dx + 2, startY + 3, dw, panH, 8);
    this.detCon.add(shadow);

    const bg = this.add.graphics();
    bg.fillStyle(0x0c0907, 1);
    bg.fillRoundedRect(dx, startY, dw, panH, 8);
    bg.lineStyle(1.5, 0x2a1a08, 1);
    bg.strokeRoundedRect(dx, startY, dw, panH, 8);
    bg.fillStyle(0xcc7733, 0.4);
    bg.fillRoundedRect(dx, startY, dw, 3, { tl: 8, tr: 8, bl: 0, br: 0 });
    this.detCon.add(bg);

    const recipe = this.selectedRecipe;
    const unit = state.party[this.unitIndex];

    if (!recipe) {
      this.detCon.add(this.add.text(cx, startY + panH / 2, 'Select a recipe\nto craft.', {
        fontSize: '12px', fontFamily: 'monospace', color: '#443322',
        align: 'center', wordWrap: { width: dw - 24 },
      }).setOrigin(0.5));
      return;
    }

    let y = startY + 20;
    this.detCon.add(this.add.text(cx, y, recipe.desc, {
      fontSize: '14px', fontFamily: 'Georgia, serif', fontStyle: 'bold', color: '#ddccaa',
      align: 'center', wordWrap: { width: dw - 32 },
    }).setOrigin(0.5));
    y += 34;

    // Result slot picker, if this recipe produces more than one possible slot
    if (recipe.resultSlots.length > 1) {
      this.detCon.add(this.add.text(cx, y, 'RESULT SLOT', { fontSize:'9px', fontFamily:'monospace', color:'#554433' }).setOrigin(0.5));
      y += 16;
      const bw = 90, gap = 8;
      const totalW = recipe.resultSlots.length * bw + (recipe.resultSlots.length - 1) * gap;
      let bx = cx - totalW / 2 + bw / 2;
      for (const slot of recipe.resultSlots) {
        const active = this.selectedResultSlot === slot;
        const myBx = bx;
        const g = this.add.graphics();
        g.fillStyle(active ? 0x2a1608 : 0x0e0a06, 1);
        g.fillRoundedRect(myBx - bw / 2, y, bw, 26, 6);
        g.lineStyle(1.5, active ? 0xcc7733 : 0x3a2818, 1);
        g.strokeRoundedRect(myBx - bw / 2, y, bw, 26, 6);
        this.detCon.add(g);
        this.detCon.add(this.add.text(myBx, y + 13, SLOT_LABEL[slot] ?? slot, {
          fontSize: '10px', fontFamily: 'monospace', color: active ? '#ffaa44' : '#997755',
        }).setOrigin(0.5));
        const z = this.add.zone(myBx, y + 13, bw, 26).setInteractive({ useHandCursor: true });
        z.on('pointerdown', () => { playSfx(this, SFX.click); this.selectedResultSlot = slot; this.rebuild(); });
        this.detCon.add(z);
        bx += bw + gap;
      }
      y += 36;
    }

    // Ore picker, if this recipe needs ore and the player owns more than one type
    const ores = this.oreOptions();
    if (recipe.materials.includes('ore') && ores.length > 1) {
      this.detCon.add(this.add.text(cx, y, 'ORE TYPE (sets rarity)', { fontSize:'9px', fontFamily:'monospace', color:'#554433' }).setOrigin(0.5));
      y += 16;
      const bw = 80, gap = 6;
      const totalW = ores.length * bw + (ores.length - 1) * gap;
      let bx = cx - totalW / 2 + bw / 2;
      for (const ore of ores) {
        const active = this.selectedOreId === ore.id;
        const myBx = bx;
        const g = this.add.graphics();
        g.fillStyle(active ? 0x2a1608 : 0x0e0a06, 1);
        g.fillRoundedRect(myBx - bw / 2, y, bw, 24, 6);
        g.lineStyle(1.5, active ? 0xcc7733 : 0x3a2818, 1);
        g.strokeRoundedRect(myBx - bw / 2, y, bw, 24, 6);
        this.detCon.add(g);
        this.detCon.add(this.add.text(myBx, y + 12, ore.name.replace(' Ore', ''), {
          fontSize: '9px', fontFamily: 'monospace', color: active ? '#ffaa44' : '#997755',
        }).setOrigin(0.5));
        const z = this.add.zone(myBx, y + 12, bw, 24).setInteractive({ useHandCursor: true });
        z.on('pointerdown', () => { playSfx(this, SFX.click); this.selectedOreId = ore.id; this.rebuild(); });
        this.detCon.add(z);
        bx += bw + gap;
      }
      y += 34;
    }

    // Material checklist
    this.detCon.add(this.add.text(cx, y, 'MATERIALS NEEDED', { fontSize:'9px', fontFamily:'monospace', color:'#554433' }).setOrigin(0.5));
    y += 16;
    for (const kind of recipe.materials) {
      const isOre = kind === 'ore';
      const matId = isOre ? this.selectedOreId : kind;
      const have = matId ? state.inventory.some(i => i.id === matId) : false;
      const label = isOre ? (matId ? getItem(matId)?.name ?? 'Ore' : 'Ore (none owned)') : (getItem(kind)?.name ?? kind);
      this.detCon.add(this.add.text(cx, y, `${have ? '✓' : '✕'}  ${label}`, {
        fontSize: '12px', fontFamily: 'monospace', color: have ? '#88cc66' : '#aa4444',
      }).setOrigin(0.5));
      y += 20;
    }
    y += 12;

    const oreTier = recipe.materials.includes('ore') ? getItem(this.selectedOreId)?.oreTier : null;
    const previewRarity = oreTier ? (ORE_TIER_TO_RARITY[oreTier] ?? 'uncommon') : 'uncommon';
    this.detCon.add(this.add.text(cx, y, `Result rarity: ${previewRarity.toUpperCase()}`, {
      fontSize: '11px', fontFamily: 'monospace', color: '#cc9944',
    }).setOrigin(0.5));
    y += 18;
    this.detCon.add(this.add.text(cx, y, `Rolled for ${unit.name.split(' ')[0]}'s talents`, {
      fontSize: '9px', fontFamily: 'monospace', color: '#665544',
    }).setOrigin(0.5));
    y += 30;

    const canCraft = this.recipeAvailable(recipe);
    const col = canCraft
      ? { idle:0x1a0c04, hover:0x261208, bdr:0x884422, txt:'#dd8844' }
      : { idle:0x0e0e0e, hover:0x0e0e0e, bdr:0x1e1e1e, txt:'#333333' };

    const btnGfx = this.add.graphics();
    const drawBtn = (h) => {
      btnGfx.clear();
      btnGfx.fillStyle(h && canCraft ? col.hover : col.idle, 1);
      btnGfx.fillRoundedRect(cx - 80, y, 160, 40, 8);
      btnGfx.lineStyle(1.5, col.bdr, 1);
      btnGfx.strokeRoundedRect(cx - 80, y, 160, 40, 8);
      if (h && canCraft) { btnGfx.fillStyle(col.bdr, 0.9); btnGfx.fillRoundedRect(cx - 80, y, 4, 40, 2); }
    };
    drawBtn(false);
    const btnTxt = this.add.text(cx, y + 20, '✦  CRAFT', {
      fontSize: '14px', fontFamily: 'monospace', fontStyle: 'bold', color: col.txt,
    }).setOrigin(0.5);
    this.detCon.add([btnGfx, btnTxt]);

    if (canCraft) {
      const z = this.add.zone(cx, y + 20, 160, 40).setInteractive({ useHandCursor: true });
      z.on('pointerover', () => drawBtn(true));
      z.on('pointerout',  () => drawBtn(false));
      z.on('pointerdown', () => this.craftItem(unit, recipe, this.selectedResultSlot, this.selectedOreId));
      this.detCon.add(z);
    }
  }

  craftItem(unit, recipe, resultSlot, oreId) {
    const materialIds = recipe.materials.map(kind => kind === 'ore' ? oreId : kind);
    if (!materialIds.every(id => id && state.inventory.some(i => i.id === id))) return;

    // Capture the ore's tier before consuming it.
    const oreItem = oreId ? state.inventory.find(i => i.id === oreId) : null;
    const rarity = oreItem ? (ORE_TIER_TO_RARITY[oreItem.oreTier] ?? 'uncommon') : 'uncommon';

    for (const id of materialIds) {
      const idx = state.inventory.findIndex(i => i.id === id);
      if (idx !== -1) state.inventory.splice(idx, 1);
    }

    const layout = gearLayoutForUnit(unit);
    const classItemMultiplier = resultSlot === 'weapon' ? layout.classItemMultiplier : 1;
    const item = rollGearItem({
      slot: resultSlot, rarity, talents: unit.talents ?? [], classItemMultiplier,
      cost: RARITY_GEAR_VALUE[rarity] ?? 0,
      forClass: roleDisplayLabel(unit),
    });
    state.inventory.push(item);

    // Capital questline craft-quest gate (M0-M4 redesign, Phase 3) — counts
    // crafts made while the stage is active; WorldMapScene's M3 handler
    // checks this against a threshold of 2 once the player returns to M3.
    if (state.capitalQuest === 'craft_pending') state.capitalCraftCount += 1;

    this.selectedRecipe = null;
    this.selectedResultSlot = null;
    this.selectedOreId = null;
    playSfx(this, SFX.craft);
    this.rebuild();
  }
}
