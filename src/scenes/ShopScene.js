import Phaser from 'phaser';
import { state } from '../data/gameState.js';
import { getItem, rarityColor, gearFrameName, materialFrameName, GEAR_SHEET, GEAR_CLASS_COL, GEAR_SLOT_ROW, MATERIAL_SHEET, MATERIAL_ICON_CELL } from '../data/items.js';
import { stripBackgroundByKey } from '../data/heroSprites.js';

const SLOT_LABEL = { weapon:'Weapon', footwear:'Shoes', handwear:'Gloves', chest:'Chest', headwear:'Headgear' };

// Items stocked per shop location
const SHOP_INVENTORY = {
  town_sirblanc: [
    // Materials
    'heal_herb',
    // Universal basics
    'basic_headband', 'basic_gloves', 'iron_boots', 'leather_vest',
    // Soccer (Reno's hometown gear)
    'soccer_ball', 'soccer_cleats', 'soccer_jersey',
    // Football (Drace)
    'football', 'football_jersey',
    // Basketball (Trice)
    'basketball', 'bball_shoes',
    // Volleyball (Kael)
    'volleyball', 'volleyball_shoes',
    // Boxing — universal combat gear
    'boxing_headgear', 'boxing_gloves',
    // Track
    'stopwatch', 'track_shoes',
    // Baseball
    'baseball_cap', 'baseball_bat',
    // Golf
    'golf_club',
  ],

  academy_hilbert: [
    // Materials
    'heal_herb', 'iron_scrap',
    // Universal uncommon
    'swift_helm', 'power_wraps', 'chain_vest',
    // Soccer pro
    'soccer_ball_pro', 'soccer_cleats_pro', 'soccer_jersey_pro',
    // Football pro
    'football_pro', 'football_helmet', 'football_jersey_pro',
    // Basketball pro
    'basketball_pro', 'bball_jersey', 'bball_shoes_pro',
    // Volleyball pro
    'volleyball_pro', 'volleyball_jersey', 'volleyball_shoes_pro',
    // Hockey (full set)
    'hockey_stick', 'hockey_gloves', 'hockey_helmet', 'hockey_jersey',
    // Boxing pro
    'boxing_tank', 'boxing_gloves_pro', 'boxing_headgear_pro',
    // Tennis
    'tennis_racket', 'tennis_shoes', 'tennis_shirt',
    // Track pro
    'stopwatch_pro', 'track_shoes_pro', 'track_jersey',
    // Baseball pro
    'baseball_bat_pro', 'baseball_jersey', 'baseball_cleats',
    // Golf pro
    'golf_club_pro', 'golf_shirt',
  ],

  generic: [
    'heal_herb', 'basic_gloves', 'iron_boots', 'basic_headband',
    'soccer_ball', 'basketball', 'boxing_gloves',
  ],
};

export class ShopScene extends Phaser.Scene {
  constructor() { super({ key: 'ShopScene' }); }

  preload() {
    if (!this.textures.exists('gears'))     this.load.image('gears',     'gears/gearitems.png');
    if (!this.textures.exists('materials')) this.load.image('materials', 'items/rawmaterials.png');
  }

  init(data) {
    this.shopId   = data.shopId  ?? 'generic';
    this.hubData  = data.hubData ?? {};
    this.tab      = 'buy';
    this.selected = null;
  }

  create() {
    const { width, height } = this.scale;
    this.W = width; this.H = height;

    stripBackgroundByKey(this, 'gears',     { cols: GEAR_SHEET.cols,     rows: GEAR_SHEET.rows });
    stripBackgroundByKey(this, 'materials', { cols: MATERIAL_SHEET.cols, rows: MATERIAL_SHEET.rows });
    this._registerFrames();

    // ── Fantasy market background ─────────────────────────────────────────
    this._drawFantasyBg(width, height);

    const shopNames = { town_sirblanc:'Sirblanc Market', academy_hilbert:'Hilbert Academy Store', generic:'Shop' };
    this.add.text(width / 2, 14, (shopNames[this.shopId] ?? 'SHOP').toUpperCase(), {
      fontSize: '15px', fontFamily: 'Georgia, serif', fontStyle: 'bold', color: '#ffdd88',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(10);

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
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('HubScene', this.hubData));
    });

    this.tabCon  = this.add.container(0, 0);
    this.listCon = this.add.container(0, 0);
    this.detCon  = this.add.container(0, 0);

    this.rebuild();
    this.cameras.main.fadeIn(300, 0, 0, 0);
  }

  _drawFantasyBg(width, height) {
    const g = this.add.graphics();

    // Deep stone base
    g.fillStyle(0x0c0a10, 1);
    g.fillRect(0, 0, width, height);

    // Stone wall — large blocks with mortar lines
    const blockH = 36, blockW = 90;
    for (let row = 0; row * blockH < height; row++) {
      const offset = (row % 2) * (blockW / 2);
      for (let col = -1; col * blockW < width + blockW; col++) {
        const bx = col * blockW + offset;
        const by = row * blockH;
        const shade = ((col + row) % 3 === 0) ? 0x1a1520 : ((col + row) % 3 === 1) ? 0x171318 : 0x131016;
        g.fillStyle(shade, 1);
        g.fillRect(bx + 1, by + 1, blockW - 2, blockH - 2);
        g.lineStyle(1, 0x0a0809, 0.8);
        g.strokeRect(bx, by, blockW, blockH);
      }
    }

    // Floor — wooden planks at bottom third
    const floorY = height * 0.68;
    g.fillStyle(0x1a1008, 1);
    g.fillRect(0, floorY, width, height - floorY);
    const plankW = 80;
    for (let px = 0; px < width; px += plankW) {
      g.lineStyle(1, 0x0e0a05, 1);
      g.lineBetween(px, floorY, px, height);
      g.fillStyle(0x1e1309, 0.5);
      g.fillRect(px + 1, floorY, plankW * 0.45, height - floorY);
    }
    // Floor/wall divide — wooden beam
    g.fillStyle(0x2a1a0a, 1);
    g.fillRect(0, floorY - 6, width, 10);
    g.lineStyle(1, 0x110a04, 1);
    g.lineBetween(0, floorY - 6, width, floorY - 6);
    g.lineBetween(0, floorY + 4,  width, floorY + 4);

    // Back shelving unit — wide dark wood shelf across mid section
    const shelfY = height * 0.28;
    g.fillStyle(0x1c1006, 1);
    g.fillRect(width * 0.05, shelfY, width * 0.9, 8);
    g.fillStyle(0x160d05, 1);
    g.fillRect(width * 0.05, shelfY + 28, width * 0.9, 8);
    g.fillStyle(0x130b04, 1);
    g.fillRect(width * 0.05, shelfY - 1, 6, 38);
    g.fillRect(width * 0.95 - 6, shelfY - 1, 6, 38);

    // Torch glow — left wall
    this._drawTorch(g, width * 0.08, height * 0.22);
    // Torch glow — right wall
    this._drawTorch(g, width * 0.92, height * 0.22);
    // Subtle center ceiling glow (magic lamp feel)
    g.fillStyle(0xaa6600, 0.04);
    g.fillEllipse(width / 2, 0, width * 0.8, height * 0.5);

    // Hanging banner — left
    this._drawBanner(g, width * 0.18, 44, 54, 80, 0x440022);
    // Hanging banner — right
    this._drawBanner(g, width * 0.82, 44, 54, 80, 0x002244);
    // Center banner — wider, decorative
    this._drawBanner(g, width * 0.5, 44, 72, 90, 0x221100);

    // Top header bar — dark wood with gold edge
    g.fillStyle(0x100a04, 0.96);
    g.fillRect(0, 0, width, 36);
    g.fillStyle(0xaa7722, 1);
    g.fillRect(0, 36, width, 2);
    g.fillStyle(0x332200, 0.6);
    g.fillRect(0, 38, width, 4);

    // Vignette — darken corners so UI pops
    g.fillStyle(0x000000, 0.45);
    g.fillRect(0, 0, width * 0.12, height);
    g.fillStyle(0x000000, 0.45);
    g.fillRect(width * 0.88, 0, width * 0.12, height);
    g.fillStyle(0x000000, 0.3);
    g.fillRect(0, height * 0.8, width, height * 0.2);
  }

  _drawTorch(g, x, y) {
    // Sconce bracket
    g.fillStyle(0x332211, 1);
    g.fillRect(x - 4, y, 8, 14);
    g.fillRect(x - 8, y + 10, 16, 4);
    // Flame glow layers (outermost to innermost)
    g.fillStyle(0xff6600, 0.06); g.fillEllipse(x, y - 10, 90, 90);
    g.fillStyle(0xff8800, 0.09); g.fillEllipse(x, y - 8,  60, 60);
    g.fillStyle(0xffaa00, 0.14); g.fillEllipse(x, y - 4,  36, 36);
    g.fillStyle(0xffcc44, 0.22); g.fillEllipse(x, y,      20, 20);
    g.fillStyle(0xffffff, 0.5);  g.fillEllipse(x, y + 2,  6,  8);
    // Light cast on wall above
    g.fillStyle(0xff8800, 0.05);
    g.fillRect(x - 40, y - 60, 80, 60);
  }

  _drawBanner(g, cx, topY, w, h, color) {
    // Rope/chain
    g.lineStyle(1, 0x443322, 1);
    g.lineBetween(cx, topY, cx, topY + 8);
    // Banner body
    g.fillStyle(color, 0.85);
    g.fillRect(cx - w / 2, topY + 8, w, h);
    g.lineStyle(1, 0x886633, 0.5);
    g.strokeRect(cx - w / 2, topY + 8, w, h);
    // Gold trim lines
    g.lineStyle(1, 0xaa7722, 0.6);
    g.lineBetween(cx - w / 2 + 4, topY + 12, cx + w / 2 - 4, topY + 12);
    g.lineBetween(cx - w / 2 + 4, topY + h + 4, cx + w / 2 - 4, topY + h + 4);
    // Pointed bottom
    g.fillStyle(color, 0.85);
    g.fillTriangle(cx - w / 2, topY + h + 8, cx + w / 2, topY + h + 8, cx, topY + h + 22);
    g.lineStyle(1, 0x886633, 0.4);
    g.lineBetween(cx - w / 2, topY + h + 8, cx, topY + h + 22);
    g.lineBetween(cx + w / 2, topY + h + 8, cx, topY + h + 22);
  }

  _registerFrames() {
    if (this.textures.exists('gears')) {
      const tex = this.textures.get('gears');
      const { cellW, cellH } = GEAR_SHEET;
      for (const [cls, col] of Object.entries(GEAR_CLASS_COL)) {
        for (const [slot, row] of Object.entries(GEAR_SLOT_ROW)) {
          const name = `gear_${cls}_${slot}`;
          if (!tex.has(name)) tex.add(name, 0, col * cellW, row * cellH, cellW, cellH);
        }
      }
    }
    if (this.textures.exists('materials')) {
      const tex = this.textures.get('materials');
      const { cellW, cellH } = MATERIAL_SHEET;
      for (const [id, [row, col]] of Object.entries(MATERIAL_ICON_CELL)) {
        const name = `material_${id}`;
        if (!tex.has(name)) tex.add(name, 0, col * cellW, row * cellH, cellW, cellH);
      }
    }
  }

  _getIcon(item, x, y, w, h) {
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
    return this.add.image(x, y, texKey, frame).setDisplaySize(w, h).setOrigin(0.5);
  }

  rebuild() {
    this.tabCon.removeAll(true);
    this.listCon.removeAll(true);
    this.detCon.removeAll(true);
    this.tytText.setText(`⊕ ${state.tytrate}`);
    this.buildTabs();
    this.buildList();
    this.buildDetail();
  }

  buildTabs() {
    [{ key:'buy', label:'BUY' }, { key:'sell', label:'SELL' }].forEach(({ key, label }, i) => {
      const tx = 14 + i * 82, ty = 52, tw = 74, th = 26;
      const active = this.tab === key;
      const g = this.add.graphics();
      const draw = (h) => {
        g.clear();
        g.fillStyle(active ? 0x16162a : (h ? 0x111128 : 0x0c0c1a), 1);
        g.fillRect(tx, ty, tw, th);
        g.lineStyle(1, active ? 0x4455aa : 0x2a2a44, 1);
        g.strokeRect(tx, ty, tw, th);
      };
      draw(false);
      this.tabCon.add(g);
      this.tabCon.add(this.add.text(tx + tw / 2, ty + th / 2, label, {
        fontSize:'11px', fontFamily:'monospace', fontStyle: active ? 'bold' : 'normal',
        color: active ? '#aaaaff' : '#555577',
      }).setOrigin(0.5));
      if (!active) {
        const z = this.add.zone(tx + tw / 2, ty + th / 2, tw, th).setInteractive({ useHandCursor: true });
        z.on('pointerover',  () => draw(true));
        z.on('pointerout',   () => draw(false));
        z.on('pointerdown',  () => { this.tab = key; this.selected = null; this.rebuild(); });
        this.tabCon.add(z);
      }
    });
  }

  getItems() {
    if (this.tab === 'buy') {
      const pool = SHOP_INVENTORY[this.shopId] ?? SHOP_INVENTORY.generic;
      return pool.map(id => getItem(id)).filter(Boolean);
    }
    const seen = new Set();
    return state.inventory.filter(it => {
      if (seen.has(it.id)) return false;
      seen.add(it.id);
      return true;
    });
  }

  buildList() {
    const items  = this.getItems();
    const lx     = 10, lw = 230, startY = 88;
    const panH   = this.H - startY - 44;
    const itemH  = 52;

    const bg = this.add.graphics();
    bg.fillStyle(0x0b0b18, 1);
    bg.fillRect(lx, startY, lw, panH);
    bg.lineStyle(1, 0x1e1e33, 1);
    bg.strokeRect(lx, startY, lw, panH);
    this.listCon.add(bg);

    let y = startY + 4;
    for (const item of items) {
      if (y + itemH > startY + panH - 4) break;

      const active = this.selected?.id === item.id;
      const rColor = rarityColor(item.rarity);
      const rc     = '#' + rColor.toString(16).padStart(6, '0');

      const g = this.add.graphics();
      const draw = (hov) => {
        g.clear();
        g.fillStyle(active ? 0x181830 : (hov ? 0x101025 : 0x0b0b18), 1);
        g.fillRect(lx + 2, y, lw - 4, itemH - 2);
        if (active) { g.lineStyle(1, 0x4455bb, 0.8); g.strokeRect(lx + 2, y, lw - 4, itemH - 2); }
      };
      draw(false);
      this.listCon.add(g);

      // Rarity dot
      const dot = this.add.graphics();
      dot.fillStyle(rColor, 1);
      dot.fillCircle(lx + 13, y + 14, 5);
      this.listCon.add(dot);

      const price    = this.tab === 'buy' ? item.cost : Math.floor(item.cost / 2);
      const invCount = state.inventory.filter(x => x.id === item.id).length;
      const countStr = this.tab === 'sell' && invCount > 1 ? ` ×${invCount}` : '';

      const nameT = this.add.text(lx + 26, y + 5, item.name + countStr, { fontSize:'11px', fontFamily:'monospace', color:'#ccccdd' });
      const prT   = this.add.text(lx + lw - 8, y + 5, `⊕${price}`, {
        fontSize:'11px', fontFamily:'monospace', color: this.tab==='buy' ? '#ffdd66' : '#66dd88',
      }).setOrigin(1, 0);
      const slotT = this.add.text(lx + 26, y + 23, item.slot ? (SLOT_LABEL[item.slot] ?? item.slot) : 'Material', {
        fontSize:'9px', fontFamily:'monospace', color: item.type==='material' ? '#668844' : '#445577',
      });
      const rarT  = this.add.text(lx + 26, y + 36, item.rarity, {
        fontSize:'9px', fontFamily:'monospace', color: rc,
      });
      this.listCon.add([nameT, prT, slotT, rarT]);

      const z = this.add.zone(lx + lw / 2, y + itemH / 2, lw, itemH).setInteractive({ useHandCursor: true });
      z.on('pointerover',  () => { if (!active) draw(true); });
      z.on('pointerout',   () => { if (!active) draw(false); });
      z.on('pointerdown',  () => { this.selected = item; this.rebuild(); });
      this.listCon.add(z);

      y += itemH;
    }

    // Item count footer
    this.listCon.add(this.add.text(lx + lw / 2, startY + panH - 16, `${items.length} items`, {
      fontSize:'9px', fontFamily:'monospace', color:'#333355',
    }).setOrigin(0.5, 1));
  }

  buildDetail() {
    const dx = 252, dw = this.W - dx - 12, startY = 88;
    const panH = this.H - startY - 44;
    const cx = dx + dw / 2;

    const bg = this.add.graphics();
    bg.fillStyle(0x0b0b18, 1);
    bg.fillRect(dx, startY, dw, panH);
    bg.lineStyle(1, 0x1e1e33, 1);
    bg.strokeRect(dx, startY, dw, panH);
    this.detCon.add(bg);

    const item = this.selected;
    if (!item) {
      this.detCon.add(this.add.text(cx, startY + panH / 2, 'Select an item', {
        fontSize:'12px', fontFamily:'monospace', color:'#333355',
      }).setOrigin(0.5));
      return;
    }

    const rColor = rarityColor(item.rarity);
    const rc     = '#' + rColor.toString(16).padStart(6, '0');
    let y = startY + 16;

    // Item icon (large, centered)
    const icon = this._getIcon(item, cx, y + 48, 90, 72);
    if (icon) {
      this.detCon.add(icon);
      y += 100;
    }

    // Name
    this.detCon.add(this.add.text(cx, y, item.name, {
      fontSize:'16px', fontFamily:'Georgia, serif', fontStyle:'bold', color:'#ffffff',
    }).setOrigin(0.5));
    y += 26;

    // Rarity + slot
    this.detCon.add(this.add.text(cx, y, `${item.rarity.toUpperCase()}  ·  ${item.slot ? (SLOT_LABEL[item.slot] ?? item.slot).toUpperCase() : 'MATERIAL'}`, {
      fontSize:'10px', fontFamily:'monospace', color: rc,
    }).setOrigin(0.5));
    y += 20;

    // Sport tag
    if (item.sport) {
      this.detCon.add(this.add.text(cx, y, item.sport.toUpperCase(), {
        fontSize:'9px', fontFamily:'monospace', color:'#334455',
      }).setOrigin(0.5));
      y += 16;
    }

    y += 4;

    // Description
    this.detCon.add(this.add.text(cx, y, item.desc ?? '', {
      fontSize:'11px', fontFamily:'Georgia, serif', color:'#8888aa', wordWrap:{ width: dw - 28 }, align:'center',
    }).setOrigin(0.5, 0));
    y += 50;

    // Stats
    for (const [stat, val] of Object.entries(item.stats ?? {})) {
      this.detCon.add(this.add.text(cx, y, `+${val}  ${stat[0].toUpperCase() + stat.slice(1)}`, {
        fontSize:'13px', fontFamily:'monospace', color:'#44ccff',
      }).setOrigin(0.5));
      y += 20;
    }
    y += 12;

    // Price
    const price      = this.tab === 'buy' ? item.cost : Math.floor(item.cost / 2);
    const priceColor = this.tab === 'buy' ? '#ffdd66' : '#66dd88';
    const priceLabel = this.tab === 'buy' ? `⊕ ${price}` : `Sell  ⊕ ${price}`;
    this.detCon.add(this.add.text(cx, y, priceLabel, {
      fontSize:'15px', fontFamily:'monospace', fontStyle:'bold', color: priceColor,
    }).setOrigin(0.5));
    y += 36;

    const canAct = this.tab === 'buy'
      ? state.tytrate >= price
      : state.inventory.some(it => it.id === item.id);

    const btnLabel    = this.tab === 'buy' ? 'BUY' : 'SELL';
    const activeCol   = { idle:0x0b1a0e, hover:0x112215, bdr:0x1e6630, txt:'#44bb66' };
    const disabledCol = { idle:0x0d0d0d, hover:0x0d0d0d, bdr:0x1e1e1e, txt:'#333333' };
    const col = canAct ? activeCol : disabledCol;

    const btnGfx = this.add.graphics();
    const drawBtn = (hov) => {
      btnGfx.clear();
      btnGfx.fillStyle(hov && canAct ? col.hover : col.idle, 1);
      btnGfx.fillRect(cx - 80, y, 160, 40);
      btnGfx.lineStyle(1, col.bdr, 1);
      btnGfx.strokeRect(cx - 80, y, 160, 40);
    };
    drawBtn(false);
    const btnTxt = this.add.text(cx, y + 20, btnLabel, {
      fontSize:'14px', fontFamily:'monospace', fontStyle:'bold', color: col.txt,
    }).setOrigin(0.5);
    this.detCon.add([btnGfx, btnTxt]);

    if (canAct) {
      const z = this.add.zone(cx, y + 20, 160, 40).setInteractive({ useHandCursor: true });
      z.on('pointerover',  () => drawBtn(true));
      z.on('pointerout',   () => drawBtn(false));
      z.on('pointerdown',  () => this.transact(item, price));
      this.detCon.add(z);
    }
  }

  transact(item, price) {
    if (this.tab === 'buy') {
      if (state.tytrate < price) return;
      state.tytrate -= price;
      state.inventory.push({ ...item });
    } else {
      const idx = state.inventory.findIndex(it => it.id === item.id);
      if (idx < 0) return;
      state.inventory.splice(idx, 1);
      state.tytrate += price;
      if (!state.inventory.some(it => it.id === item.id)) this.selected = null;
    }
    this.rebuild();
  }
}
