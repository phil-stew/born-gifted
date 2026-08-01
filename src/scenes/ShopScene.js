import Phaser from 'phaser';
import { state, gearLayoutForUnit, roleDisplayLabel } from '../data/gameState.js';
import { getItem, rarityColor, gearFrameName, materialFrameName, rollGearItem, GEAR_SHEET, GEAR_CLASS_COL, GEAR_SLOT_ROW, MATERIAL_ICON_FRAME } from '../data/items.js';
import { stripBackgroundByKey } from '../data/heroSprites.js';
import { playSfx, SFX } from '../audio/sound.js';
import { playMusic } from '../audio/music.js';

const SLOT_LABEL = { weapon:'Weapon', footwear:'Shoes', handwear:'Gloves', chest:'Chest', headwear:'Headgear' };

// Opaque parchment-style panel palette — sits on top of the castle backdrop,
// dark text for legibility against the light fill (see color-scheme change,
// 2026-07-04: shop used to be light-text-on-near-black).
const PANEL_BG        = 0xe9dfc4;
const PANEL_BG_ACTIVE = 0xdbc99a;
const PANEL_BG_HOVER  = 0xf0e8d2;
const PANEL_BORDER    = 0x8a6d3b;
const TEXT_DARK  = '#2a1f14';
const TEXT_MED   = '#5a4a30';
const TEXT_FAINT = '#8a7a5c';
const GOLD_DARK  = '#8a6410';
const GREEN_DARK = '#2f7a3f';
const BLUE_DARK  = '#2a5a8a';

// Panel/row shape language copied from BattleScene's modernized action menu
// (July 2026): rounded corners, a soft drop shadow, and a colored accent
// bar/stripe on hover or selection — reusing PANEL_BORDER as the shop's
// "accent color" the same way the battle menu uses the acting unit's color.
// Kept the shop's own opaque parchment palette rather than adopting the
// battle menu's 50%-translucent fill — that opacity was a deliberate
// legibility fix over the castle backdrop (see project_shop_reskin memory).
const RADIUS = 8;

// Items stocked per shop location
const SHOP_INVENTORY = {
  town_sirblanc: [
    // Materials
    'heal_herb', 'health_potion', 'focus_potion', 'vitality_potion',
    'mint_sprig', 'lavender_bloom', 'wild_berries',
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
    'heal_herb', 'iron_scrap', 'health_potion', 'focus_potion', 'vitality_potion',
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

// Shop rarity progression (2026-07-07 feedback: "shop item rarity should
// upgrade as the player progresses in levels") — SHOP_INVENTORY above only
// ever lists common/uncommon named items (rare+ equipment was never given
// static item entries at all, see project_items_cleanup memory — rare/epic/
// legendary gear only exists via procedural rolling, e.g. rollGearItem
// already used by M0a's bracketed drop table). Rather than inventing static
// rare/epic/legendary items, the shop now ADDS a few freshly-rolled gear
// pieces on top of the existing static list once the party's level clears
// each threshold — more tiers unlock as you level, earlier tiers stay
// buyable (not replaced), same "more options, not swapped options" feel as
// the rest of the shop's static list.
const SHOP_RARITY_UNLOCKS = [
  { minLevel: 10, rarity: 'rare',      cost: 400  },
  { minLevel: 20, rarity: 'epic',      cost: 900  },
  { minLevel: 30, rarity: 'legendary', cost: 2000 },
];
const SHOP_GEAR_SLOTS = ['weapon', 'footwear', 'handwear', 'chest', 'headwear'];
// 2 pieces per unlocked rarity tier (random slots, may repeat) — enough to
// feel like a real upgrade option without flooding the gear list once every
// tier is unlocked (up to 6 rolled items at level 30+, on top of the
// existing ~6-10 static ones per shop).
const ROLLS_PER_TIER = 2;

export class ShopScene extends Phaser.Scene {
  constructor() { super({ key: 'ShopScene' }); }

  preload() {
    if (!this.textures.exists('gears'))      this.load.image('gears',      'gears/gearitems.png');
    if (!this.textures.exists('materials'))  this.load.image('materials',  'items/rawmaterials.png');
    if (!this.textures.exists('bd-castle2')) this.load.image('bd-castle2', 'world/Altroesartscene/castle2.png');
  }

  init(data) {
    this.shopId   = data.shopId  ?? 'generic';
    this.hubData  = data.hubData ?? {};
    this.tab      = 'buy';
    this.category = 'items'; // 'items' (materials/potions) or 'gear' (equipment) — separate filter row from buy/sell
    this.selected = null;
    // Fresh roll every shop visit (not persisted) — simplest option, and
    // matches how a "browse today's stock" shop screen usually behaves;
    // no need for the Academy task board's expiry-timer machinery since
    // there's no turn-in/consumption cadence to protect against re-rolling.
    const leader  = state.party[0];
    const level   = leader?.level ?? 1;
    const talents = leader?.talents ?? [];
    const classItemMultiplier = leader ? gearLayoutForUnit(leader).classItemMultiplier : 1;
    const forClass = leader ? roleDisplayLabel(leader) : undefined;
    this.rolledGear = SHOP_RARITY_UNLOCKS
      .filter(t => level >= t.minLevel)
      .flatMap(t => Array.from({ length: ROLLS_PER_TIER }, () => {
        const slot = SHOP_GEAR_SLOTS[Math.floor(Math.random() * SHOP_GEAR_SLOTS.length)];
        return rollGearItem({ slot, rarity: t.rarity, talents, classItemMultiplier, forClass, cost: t.cost });
      }));
  }

  create() {
    const { width, height } = this.scale;
    this.W = width; this.H = height;

    playMusic(this, 'hub');

    stripBackgroundByKey(this, 'gears',     { cols: GEAR_SHEET.cols,     rows: GEAR_SHEET.rows });
    stripBackgroundByKey(this, 'materials', { cols: 5, rows: 3 }); // irregular sheet; approximate for seeding
    this._registerFrames();

    // ── Castle backdrop + opaque header bar ───────────────────────────────
    this._drawFantasyBg(width, height);

    const shopNames = { town_sirblanc:'Village Market', academy_hilbert:'Hilbert Academy Store', generic:'Shop' };
    this.add.text(width / 2, 14, (shopNames[this.shopId] ?? 'SHOP').toUpperCase(), {
      fontSize: '16px', fontFamily: 'Georgia, serif', fontStyle: 'bold', color: TEXT_DARK,
    }).setOrigin(0.5).setDepth(10);

    this.tytText = this.add.text(width - 14, 14, `⊕ ${state.tytrate}`, {
      fontSize: '15px', fontFamily: 'monospace', fontStyle: 'bold', color: GOLD_DARK,
    }).setOrigin(1, 0.5).setDepth(10);

    // Moved into the header (2026-07-11, "have the back button at top of
    // menues") — was bottom-left, now top-left, same row as the title.
    const back = this.add.text(14, 14, '◀  BACK', {
      fontSize: '14px', fontFamily: 'monospace', color: TEXT_MED,
      backgroundColor: '#00000055', padding: { x: 10, y: 5 },
    }).setOrigin(0, 0.5).setInteractive({ useHandCursor: true }).setDepth(10);
    back.on('pointerover', () => back.setStyle({ color: TEXT_DARK }));
    back.on('pointerout',  () => back.setStyle({ color: TEXT_MED }));
    back.on('pointerdown', () => {
      playSfx(this, SFX.click);
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
    if (this.textures.exists('bd-castle2')) {
      const img = this.add.image(width / 2, height / 2, 'bd-castle2');
      const scale = Math.max(width / img.width, height / img.height);
      img.setScale(scale);
      this.add.rectangle(width / 2, height / 2, width, height, 0x05050a, 0.35);
    } else {
      const g = this.add.graphics();
      g.fillStyle(0x0c0a10, 1);
      g.fillRect(0, 0, width, height);
    }

    // Opaque header bar — title/currency sit on this, not directly on the photo
    const g = this.add.graphics();
    g.fillStyle(PANEL_BG, 0.97);
    g.fillRect(0, 0, width, 36);
    g.fillStyle(PANEL_BORDER, 1);
    g.fillRect(0, 36, width, 2);
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
      for (const [id, [x, y, w, h]] of Object.entries(MATERIAL_ICON_FRAME)) {
        const name = `material_${id}`;
        if (!tex.has(name)) tex.add(name, 0, x, y, w, h);
      }
    }
  }

  // Colored rarity badge/pill — common=white, uncommon=green, rare=blue,
  // epic=purple, legendary=orange (rarityColor()'s actual palette), as a
  // filled pill with dark text on top rather than colored TEXT (which is
  // how 'common' ended up invisible on this light parchment background —
  // a filled white pill still reads clearly where white text wouldn't).
  // originX: 0 = x is the pill's left edge, 0.5 = x is its center.
  _drawRarityBadge(container, x, y, rarity, { originX = 0, fontSize = '9px' } = {}) {
    const label = rarity.toUpperCase();
    const fill  = rarityColor(rarity);
    const measure = this.add.text(0, 0, label, { fontSize, fontFamily:'monospace', fontStyle:'bold' });
    const tw = measure.width;
    measure.destroy();
    const padX = 7, h = fontSize === '9px' ? 14 : 17;
    const w = tw + padX * 2;
    const bx = x - w * originX;
    const g = this.add.graphics();
    g.fillStyle(fill, 1);
    g.fillRoundedRect(bx, y, w, h, h / 2);
    g.lineStyle(1, 0x00000033, 1);
    g.strokeRoundedRect(bx, y, w, h, h / 2);
    const t = this.add.text(bx + w / 2, y + h / 2, label, {
      fontSize, fontFamily:'monospace', fontStyle:'bold', color: TEXT_DARK,
    }).setOrigin(0.5);
    container.add([g, t]);
    return w;
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
    this.buildCategoryTabs();
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
        g.fillStyle(active ? PANEL_BG_ACTIVE : (h ? PANEL_BG_HOVER : PANEL_BG), 1);
        g.fillRoundedRect(tx, ty, tw, th, 6);
        g.lineStyle(1.5, active ? PANEL_BORDER : 0xbba876, 1);
        g.strokeRoundedRect(tx, ty, tw, th, 6);
        if (active) { g.fillStyle(PANEL_BORDER, 0.6); g.fillRoundedRect(tx, ty, tw, 2, { tl: 6, tr: 6, bl: 0, br: 0 }); }
      };
      draw(false);
      this.tabCon.add(g);
      this.tabCon.add(this.add.text(tx + tw / 2, ty + th / 2, label, {
        fontSize:'12px', fontFamily:'monospace', fontStyle: active ? 'bold' : 'normal',
        color: active ? TEXT_DARK : TEXT_MED,
      }).setOrigin(0.5));
      if (!active) {
        const z = this.add.zone(tx + tw / 2, ty + th / 2, tw, th).setInteractive({ useHandCursor: true });
        z.on('pointerover',  () => draw(true));
        z.on('pointerout',   () => draw(false));
        z.on('pointerdown',  () => { playSfx(this, SFX.click); this.tab = key; this.selected = null; this.rebuild(); });
        this.tabCon.add(z);
      }
    });
  }

  // Second tab row — filters the list by category, independent of buy/sell.
  buildCategoryTabs() {
    [{ key:'items', label:'ITEMS' }, { key:'gear', label:'GEAR' }].forEach(({ key, label }, i) => {
      const tx = 14 + i * 82, ty = 82, tw = 74, th = 24;
      const active = this.category === key;
      const g = this.add.graphics();
      const draw = (h) => {
        g.clear();
        g.fillStyle(active ? PANEL_BG_ACTIVE : (h ? PANEL_BG_HOVER : PANEL_BG), 1);
        g.fillRoundedRect(tx, ty, tw, th, 6);
        g.lineStyle(1.5, active ? PANEL_BORDER : 0xbba876, 1);
        g.strokeRoundedRect(tx, ty, tw, th, 6);
        if (active) { g.fillStyle(PANEL_BORDER, 0.6); g.fillRoundedRect(tx, ty, tw, 2, { tl: 6, tr: 6, bl: 0, br: 0 }); }
      };
      draw(false);
      this.tabCon.add(g);
      this.tabCon.add(this.add.text(tx + tw / 2, ty + th / 2, label, {
        fontSize:'11px', fontFamily:'monospace', fontStyle: active ? 'bold' : 'normal',
        color: active ? TEXT_DARK : TEXT_MED,
      }).setOrigin(0.5));
      if (!active) {
        const z = this.add.zone(tx + tw / 2, ty + th / 2, tw, th).setInteractive({ useHandCursor: true });
        z.on('pointerover',  () => draw(true));
        z.on('pointerout',   () => draw(false));
        z.on('pointerdown',  () => { playSfx(this, SFX.click); this.category = key; this.selected = null; this.rebuild(); });
        this.tabCon.add(z);
      }
    });
  }

  getItems() {
    const inCategory = (item) => this.category === 'items' ? item.type === 'material' : item.type !== 'material';
    if (this.tab === 'buy') {
      const pool = SHOP_INVENTORY[this.shopId] ?? SHOP_INVENTORY.generic;
      const staticItems = pool.map(id => getItem(id)).filter(Boolean);
      // Rolled gear goes FIRST, not appended — buildList's item panel has
      // no scrolling and silently truncates once the list overflows its
      // fixed height (~14 rows; some shops' static gear lists already run
      // to 20+), so anything appended after a long static list could be
      // permanently unreachable. Leading with rolled gear guarantees the
      // whole point of this feature (higher rarity as you level) is
      // actually visible, at the cost of some static items possibly
      // trailing off past the same fold — pre-existing limitation of this
      // screen, not something this feature should silently inherit.
      return [...this.rolledGear, ...staticItems].filter(inCategory);
    }
    const seen = new Set();
    return state.inventory.filter(it => {
      if (seen.has(it.id)) return false;
      seen.add(it.id);
      return true;
    }).filter(inCategory);
  }

  buildList() {
    const items  = this.getItems();
    const lx     = 10, lw = 230, startY = 114;
    const panH   = this.H - startY - 44;
    const itemH  = 30;

    const shadow = this.add.graphics();
    shadow.fillStyle(0x000000, 0.22);
    shadow.fillRoundedRect(lx + 3, startY + 4, lw, panH, RADIUS);
    this.listCon.add(shadow);

    const bg = this.add.graphics();
    bg.fillStyle(PANEL_BG, 1);
    bg.fillRoundedRect(lx, startY, lw, panH, RADIUS);
    bg.lineStyle(1.5, PANEL_BORDER, 0.9);
    bg.strokeRoundedRect(lx, startY, lw, panH, RADIUS);
    bg.fillStyle(PANEL_BORDER, 0.5);
    bg.fillRoundedRect(lx, startY, lw, 3, { tl: RADIUS, tr: RADIUS, bl: 0, br: 0 });
    this.listCon.add(bg);

    let y = startY + 4;
    for (const item of items) {
      if (y + itemH > startY + panH - 4) break;

      const active = this.selected?.id === item.id;

      const g = this.add.graphics();
      const draw = (hov) => {
        g.clear();
        if (active || hov) {
          g.fillStyle(active ? PANEL_BG_ACTIVE : PANEL_BG_HOVER, 1);
          g.fillRoundedRect(lx + 2, y, lw - 4, itemH - 2, 6);
          g.fillStyle(PANEL_BORDER, active ? 1 : 0.5);
          g.fillRoundedRect(lx + 2, y, 3, itemH - 2, 2);
        }
      };
      draw(false);
      this.listCon.add(g);

      // Name + price — slot/rarity live in the detail panel once selected.
      const price    = this.tab === 'buy' ? item.cost : Math.floor(item.cost / 2);
      const invCount = state.inventory.filter(x => x.id === item.id).length;
      const countStr = this.tab === 'sell' && invCount > 1 ? ` ×${invCount}` : '';
      const nameT = this.add.text(lx + 12, y + itemH / 2, item.name + countStr, {
        fontSize:'12px', fontFamily:'monospace', color:TEXT_DARK,
      }).setOrigin(0, 0.5);
      const prT = this.add.text(lx + lw - 10, y + itemH / 2, `⊕${price}`, {
        fontSize:'12px', fontFamily:'monospace', color: this.tab === 'buy' ? GOLD_DARK : GREEN_DARK,
      }).setOrigin(1, 0.5);
      this.listCon.add([nameT, prT]);

      const z = this.add.zone(lx + lw / 2, y + itemH / 2, lw, itemH).setInteractive({ useHandCursor: true });
      z.on('pointerover',  () => { if (!active) draw(true); });
      z.on('pointerout',   () => { if (!active) draw(false); });
      z.on('pointerdown',  () => { playSfx(this, SFX.click); this.selected = item; this.rebuild(); });
      this.listCon.add(z);

      y += itemH;
    }

    // Item count footer
    this.listCon.add(this.add.text(lx + lw / 2, startY + panH - 16, `${items.length} items`, {
      fontSize:'10px', fontFamily:'monospace', color:TEXT_FAINT,
    }).setOrigin(0.5, 1));
  }

  buildDetail() {
    const dx = 252, dw = this.W - dx - 12, startY = 114;
    const panH = this.H - startY - 44;
    const cx = dx + dw / 2;

    const shadow = this.add.graphics();
    shadow.fillStyle(0x000000, 0.22);
    shadow.fillRoundedRect(dx + 3, startY + 4, dw, panH, RADIUS);
    this.detCon.add(shadow);

    const bg = this.add.graphics();
    bg.fillStyle(PANEL_BG, 1);
    bg.fillRoundedRect(dx, startY, dw, panH, RADIUS);
    bg.lineStyle(1.5, PANEL_BORDER, 0.9);
    bg.strokeRoundedRect(dx, startY, dw, panH, RADIUS);
    bg.fillStyle(PANEL_BORDER, 0.5);
    bg.fillRoundedRect(dx, startY, dw, 3, { tl: RADIUS, tr: RADIUS, bl: 0, br: 0 });
    this.detCon.add(bg);

    const item = this.selected;
    if (!item) {
      this.detCon.add(this.add.text(cx, startY + panH / 2, 'Select an item', {
        fontSize:'13px', fontFamily:'monospace', color:TEXT_FAINT,
      }).setOrigin(0.5));
      return;
    }

    let y = startY + 16;

    // Item icon (large, centered)
    const icon = this._getIcon(item, cx, y + 48, 90, 72);
    if (icon) {
      this.detCon.add(icon);
      y += 100;
    }

    // Name
    this.detCon.add(this.add.text(cx, y, item.name, {
      fontSize:'17px', fontFamily:'Georgia, serif', fontStyle:'bold', color:TEXT_DARK,
    }).setOrigin(0.5));
    y += 26;

    // Rarity badge (centered), then slot/type label underneath
    this._drawRarityBadge(this.detCon, cx, y, item.rarity, { originX: 0.5, fontSize: '11px' });
    y += 28;
    this.detCon.add(this.add.text(cx, y, item.slot ? (SLOT_LABEL[item.slot] ?? item.slot).toUpperCase() : 'MATERIAL', {
      fontSize:'10px', fontFamily:'monospace', color: TEXT_MED,
    }).setOrigin(0.5));
    y += 20;

    // Sport tag
    if (item.sport) {
      this.detCon.add(this.add.text(cx, y, item.sport.toUpperCase(), {
        fontSize:'10px', fontFamily:'monospace', color:TEXT_MED,
      }).setOrigin(0.5));
      y += 16;
    }

    // Class tag — procedurally-rolled Class Items (weapon slot) show which
    // unit's class they were tuned for (2026-07-09 feedback).
    if (item.forClass) {
      this.detCon.add(this.add.text(cx, y, `FOR ${item.forClass.toUpperCase()}`, {
        fontSize:'10px', fontFamily:'monospace', color:TEXT_MED,
      }).setOrigin(0.5));
      y += 16;
    }

    y += 4;

    // Description
    this.detCon.add(this.add.text(cx, y, item.desc ?? '', {
      fontSize:'12px', fontFamily:'Georgia, serif', color:TEXT_MED, wordWrap:{ width: dw - 28 }, align:'center',
    }).setOrigin(0.5, 0));
    y += 50;

    // Stats
    for (const [stat, val] of Object.entries(item.stats ?? {})) {
      this.detCon.add(this.add.text(cx, y, `+${val}  ${stat[0].toUpperCase() + stat.slice(1)}`, {
        fontSize:'14px', fontFamily:'monospace', color:BLUE_DARK,
      }).setOrigin(0.5));
      y += 20;
    }
    y += 12;

    // Price
    const price      = this.tab === 'buy' ? item.cost : Math.floor(item.cost / 2);
    const priceColor = this.tab === 'buy' ? GOLD_DARK : GREEN_DARK;
    const priceLabel = this.tab === 'buy' ? `⊕ ${price}` : `Sell  ⊕ ${price}`;
    this.detCon.add(this.add.text(cx, y, priceLabel, {
      fontSize:'16px', fontFamily:'monospace', fontStyle:'bold', color: priceColor,
    }).setOrigin(0.5));
    y += 36;

    const canAct = this.tab === 'buy'
      ? state.tytrate >= price
      : state.inventory.some(it => it.id === item.id);

    const btnLabel    = this.tab === 'buy' ? 'BUY' : 'SELL';
    const activeCol   = { idle:0xcfe8d4, hover:0xb9dcc0, bdr:0x2f7a3f, txt:GREEN_DARK };
    const disabledCol = { idle:0xd8d0c0, hover:0xd8d0c0, bdr:0xb0a888, txt:'#a89a80' };
    const col = canAct ? activeCol : disabledCol;

    const btnGfx = this.add.graphics();
    const drawBtn = (hov) => {
      btnGfx.clear();
      btnGfx.fillStyle(hov && canAct ? col.hover : col.idle, 1);
      btnGfx.fillRoundedRect(cx - 80, y, 160, 40, RADIUS);
      btnGfx.lineStyle(1.5, col.bdr, 1);
      btnGfx.strokeRoundedRect(cx - 80, y, 160, 40, RADIUS);
    };
    drawBtn(false);
    const btnTxt = this.add.text(cx, y + 20, btnLabel, {
      fontSize:'15px', fontFamily:'monospace', fontStyle:'bold', color: col.txt,
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
    playSfx(this, SFX.coin);
    this.rebuild();
  }
}
