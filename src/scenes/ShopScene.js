import Phaser from 'phaser';
import { state, roleDisplayLabel, isStackFull, STACK_CAP } from '../data/gameState.js';
import { getItem, gearItemFrame, materialFrameName, rollGearItem, ICON_SHEET_STRIP, registerGearFrames, MATERIAL_ICON_FRAME } from '../data/items.js';
import { stripBackgroundByKey } from '../data/heroSprites.js';
import { playSfx, SFX } from '../audio/sound.js';
import { playMusic } from '../audio/music.js';
import { currencyLabel } from '../ui/canvasButton.js';
import { mount, unmount, onClick, iconDataURL, esc, rarityBadgeHTML } from '../ui/domUI.js';

const SLOT_LABEL = { weapon:'Weapon', footwear:'Shoes', handwear:'Gloves', chest:'Chest', headwear:'Headgear' };

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
    // Basketball
    'basketball', 'bball_shoes',
    // Volleyball
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
    'heal_herb', 'health_potion', 'focus_potion', 'vitality_potion',
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
const EPIC = SHOP_RARITY_UNLOCKS.find(t => t.rarity === 'epic');
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
    if (!this.textures.exists('bd-castle2')) this.load.image('bd-castle2', 'world/Altroesartscene/castle2.webp');
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
    const forClass = leader ? roleDisplayLabel(leader) : undefined;
    this.rolledGear = SHOP_RARITY_UNLOCKS
      .filter(t => level >= t.minLevel)
      .flatMap(t => Array.from({ length: ROLLS_PER_TIER }, () => {
        const slot = SHOP_GEAR_SLOTS[Math.floor(Math.random() * SHOP_GEAR_SLOTS.length)];
        return rollGearItem({ slot, rarity: t.rarity, talents, forClass, cost: t.cost });
      }));
    // Gale's quest asks for a full Epic set, so Gale always stocks one
    // Epic piece per slot, whatever the party's level.
    if (this.hubData.nodeId === 'M5' && level < EPIC.minLevel) {
      this.rolledGear.push(...SHOP_GEAR_SLOTS.map(slot =>
        rollGearItem({ slot, rarity: 'epic', talents, forClass, cost: EPIC.cost })));
    }
  }

  create() {
    playMusic(this, 'hub');

    stripBackgroundByKey(this, 'gears',     ICON_SHEET_STRIP);
    stripBackgroundByKey(this, 'materials', ICON_SHEET_STRIP);
    this._registerFrames();
    this._drawBackdrop();

    this.render();
    this.events.once('shutdown', unmount);
  }

  // Castle photo on the canvas; the DOM panels sit on top of it.
  _drawBackdrop() {
    const { width, height } = this.scale;
    if (!this.textures.exists('bd-castle2')) return;
    const img = this.add.image(width / 2, height / 2, 'bd-castle2');
    img.setScale(Math.max(width / img.width, height / img.height));
    this.add.rectangle(width / 2, height / 2, width, height, 0x05050a, 0.35);
  }

  _registerFrames() {
    registerGearFrames(this);
    if (this.textures.exists('materials')) {
      const tex = this.textures.get('materials');
      for (const [id, [x, y, w, h]] of Object.entries(MATERIAL_ICON_FRAME)) {
        const name = `material_${id}`;
        if (!tex.has(name)) tex.add(name, 0, x, y, w, h);
      }
    }
  }

  iconHTML(item, size) {
    let texKey = null, frame = null;
    if (item?.type === 'material') { texKey = 'materials'; frame = materialFrameName(item.id); }
    else if (item?.slot) { texKey = 'gears'; frame = gearItemFrame(item); }
    const url = frame ? iconDataURL(this, texKey, frame, size * 2) : null;
    return url ? `<img class="ui-row-icon" style="width:${size}px;height:${size}px" src="${url}" alt="">` : '';
  }

  priceOf(item) {
    return this.tab === 'buy' ? item.cost : Math.floor(item.cost / 2);
  }

  getItems() {
    const inCategory = (item) => this.category === 'items' ? item.type === 'material' : item.type !== 'material';
    if (this.tab === 'buy') {
      const pool = SHOP_INVENTORY[this.shopId] ?? SHOP_INVENTORY.generic;
      const staticItems = pool.map(id => getItem(id)).filter(Boolean);
      // Rolled gear first so the higher-rarity stock leads the list.
      return [...this.rolledGear, ...staticItems].filter(inCategory);
    }
    const seen = new Set();
    return state.inventory.filter(it => {
      if (seen.has(it.id)) return false;
      seen.add(it.id);
      return true;
    }).filter(inCategory);
  }

  listHTML(items) {
    if (!items.length) return '<div class="ui-empty-note">Nothing here yet.</div>';
    return items.map((item, i) => {
      const count = state.inventory.filter(x => x.id === item.id).length;
      const countStr = this.tab === 'sell' && count > 1 ? ` ×${count}` : '';
      return `
        <button class="ui-row ${this.selected?.id === item.id ? 'active' : ''}" data-item="${i}">
          ${this.iconHTML(item, 34)}
          <span class="ui-row-name">${esc(item.name)}${countStr}</span>
          <span class="ui-row-price">${this.priceOf(item)} T</span>
        </button>`;
    }).join('');
  }

  detailHTML(item) {
    if (!item) return '<div class="ui-empty-note">Select an item</div>';
    const price = this.priceOf(item);
    const full = this.tab === 'buy' && isStackFull(item);
    const canAct = this.tab === 'buy'
      ? state.tytrate >= price && !full
      : state.inventory.some(it => it.id === item.id);
    const tags = [
      item.slot ? (SLOT_LABEL[item.slot] ?? item.slot) : 'Material',
      item.sport,
      item.forClass ? `For ${item.forClass}` : null,
    ].filter(Boolean).map(esc).join(' &middot; ');
    const stats = Object.entries(item.stats ?? {}).map(([stat, val]) =>
      `<div class="ui-item-stat">+${val} ${esc(stat[0].toUpperCase() + stat.slice(1))}</div>`).join('')
      + (item.baseValues ? '<div class="ui-item-desc">Base stats. The hero\'s class multiplies them: ×1 to ×4.</div>' : '');
    return `
      <div class="ui-item-head">
        ${this.iconHTML(item, 64)}
        <div>
          <div class="ui-item-name">${esc(item.name)}</div>
          ${rarityBadgeHTML(item.rarity)}
          <div class="ui-item-tags">${tags}</div>
        </div>
      </div>
      <div class="ui-item-desc">${esc(item.desc ?? '')}</div>
      ${stats}
      <button class="ui-action-btn" data-transact="1" ${canAct ? '' : 'disabled'}>
        ${full ? `Stack full (${STACK_CAP})` : `${this.tab === 'buy' ? 'Buy' : 'Sell'} for ${price} Tytrate`}
      </button>`;
  }

  render() {
    const shopNames = { town_sirblanc:'Village Market', academy_hilbert:'Hilbert Academy Store', generic:'Shop' };
    const items = this.getItems();
    const tab = (attr, key, label, on) =>
      `<button class="ui-detail-tab ${on ? 'active' : ''}" data-${attr}="${key}">${label}</button>`;

    mount(`
      <div class="ui-screen ui-shop">
        <div class="ui-topbar">
          <button class="ui-navbtn" data-nav="back">◀ Back</button>
          <div class="ui-title">${esc(shopNames[this.shopId] ?? 'Shop')}</div>
          <div class="ui-currency">${currencyLabel(state.tytrate)}</div>
        </div>
        <div class="ui-body">
          <div class="ui-panel ui-list-panel" data-scroll-id="shop-${this.tab}-${this.category}">
            <div class="ui-detail-tabs ui-tabs-flush">
              ${tab('tab', 'buy', 'Buy', this.tab === 'buy')}
              ${tab('tab', 'sell', 'Sell', this.tab === 'sell')}
              ${tab('category', 'items', 'Items', this.category === 'items')}
              ${tab('category', 'gear', 'Gear', this.category === 'gear')}
            </div>
            ${this.listHTML(items)}
          </div>
          <div class="ui-panel ui-detail-panel" data-scroll-id="shop-detail">${this.detailHTML(this.selected)}</div>
        </div>
      </div>
    `);

    onClick('[data-nav="back"]', () => this.scene.start('HubScene', this.hubData));
    onClick('[data-tab]', (e, node) => { this.tab = node.dataset.tab; this.selected = null; this.render(); });
    onClick('[data-category]', (e, node) => { this.category = node.dataset.category; this.selected = null; this.render(); });
    onClick('[data-item]', (e, node) => { this.selected = items[Number(node.dataset.item)]; this.render(); });
    onClick('[data-transact]', () => this.transact(this.selected, this.priceOf(this.selected)));
  }

  transact(item, price) {
    if (this.tab === 'buy') {
      if (state.tytrate < price || isStackFull(item)) return;
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
    this.render();
  }
}
