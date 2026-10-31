import Phaser from 'phaser';
import { state, roleDisplayLabel, gearLayoutForUnit } from '../data/gameState.js';
import { FORGE_RECIPES, ORE_TIER_TO_RARITY, RARITY_GEAR_VALUE, rollGearItem, getItem } from '../data/items.js';
import { playSfx, SFX } from '../audio/sound.js';
import { playMusic } from '../audio/music.js';
import { currencyLabel } from '../ui/canvasButton.js';
import { mount, unmount, onClick, esc, rarityBadgeHTML } from '../ui/domUI.js';

// Cost to reinforce: 75 per level (level 0→1 costs 75, 1→2 costs 150, 2→3 costs 225)
const REINFORCE_BASE = 75;
const MAX_REINFORCE  = 3;

const SLOT_NAMES = ['weapon', 'footwear', 'handwear', 'chest', 'headwear'];
const SLOT_LABEL = { weapon:'Class Item', footwear:'Footwear', handwear:'Handwear', chest:'Chest', headwear:'Headwear' };

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
    playMusic(this, 'hub');
    this.rebuild();
    this.events.once('shutdown', unmount);
  }

  teamHTML() {
    return state.party.map((unit, i) => `
      <button class="ui-row ${i === this.unitIndex ? 'active' : ''}" data-unit="${i}">
        <span class="ui-row-name">
          ${esc(unit.name.split(' ')[0])}
          <span class="ui-row-sub">Lv.${unit.level} ${esc(roleDisplayLabel(unit))}</span>
        </span>
      </button>`).join('');
  }

  slotsHTML(unit) {
    return SLOT_NAMES.map(slot => {
      const item = unit.equip[slot];
      if (!item) {
        return `<div class="ui-row disabled"><span class="ui-row-name">${SLOT_LABEL[slot]}
          <span class="ui-row-sub">Empty</span></span></div>`;
      }
      const lvl = item.reinforceLevel ?? 0;
      return `
        <button class="ui-row ${this.selectedSlot === slot ? 'active' : ''}" data-slot="${slot}">
          <span class="ui-row-name">${SLOT_LABEL[slot]}
            <span class="ui-row-sub">${esc(item.name)}${lvl ? ` ✦${lvl}` : ''}</span></span>
          <span class="ui-row-price">${lvl < MAX_REINFORCE ? `${REINFORCE_BASE * (lvl + 1)} T` : 'MAX'}</span>
        </button>`;
    }).join('');
  }

  reinforceDetailHTML(unit) {
    const item = this.selectedSlot ? unit.equip[this.selectedSlot] : null;
    if (!item) return '<div class="ui-empty-note">Select an equipped item to reinforce.</div>';

    const lvl  = item.reinforceLevel ?? 0;
    const cost = REINFORCE_BASE * (lvl + 1);
    const canUp = lvl < MAX_REINFORCE && state.tytrate >= cost;
    const stats = Object.entries(item.stats ?? {}).map(([stat, val]) =>
      `<div class="ui-item-stat">+${val} ${esc(stat[0].toUpperCase() + stat.slice(1))}</div>`).join('');
    const targetStat = Object.keys(item.stats ?? {})[0] ?? null;

    return `
      <div class="ui-item-name">${esc(item.name)}</div>
      <div class="ui-forge-stars">${'✦'.repeat(lvl)}${'✧'.repeat(MAX_REINFORCE - lvl)}</div>
      ${stats}
      ${lvl < MAX_REINFORCE ? `
        ${targetStat ? `<div class="ui-item-desc">Reinforce adds +1 ${esc(targetStat[0].toUpperCase() + targetStat.slice(1))}</div>` : ''}
        <button class="ui-action-btn" data-reinforce="${targetStat ?? ''}" ${canUp ? '' : 'disabled'}>
          Reinforce for ${cost} Tytrate
        </button>` : '<div class="ui-item-desc">Fully reinforced</div>'}`;
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

  // Slots this unit's class can wear, so the Forge never offers gear they
  // couldn't equip (a Dancer only has Class Item and Chest).
  craftableSlots(recipe, unit) {
    const { slots } = gearLayoutForUnit(unit);
    return recipe.resultSlots.filter(s => slots.includes(s));
  }

  // Names only the result this unit can make, e.g. "Skin + Ore → Headwear".
  recipeDesc(recipe, unit) {
    const slots = this.craftableSlots(recipe, unit);
    return slots.length === recipe.resultSlots.length ? recipe.desc
      : recipe.desc.replace(/→.*/, `→ ${slots.map(s => SLOT_LABEL[s] ?? s).join(' / ')}`);
  }

  recipesHTML(unit) {
    return FORGE_RECIPES.map((recipe, i) => {
      const resultSlots = this.craftableSlots(recipe, unit);
      if (!resultSlots.length) return '';
      return `
      <button class="ui-row ${this.selectedRecipe?.id === recipe.id ? 'active' : ''} ${this.recipeAvailable(recipe) ? '' : 'dim'}" data-recipe="${i}">
        <span class="ui-row-name">${resultSlots.map(s => SLOT_LABEL[s] ?? s).join(' / ')}
          <span class="ui-row-sub">${esc(this.recipeDesc(recipe, unit))}</span></span>
      </button>`;
    }).join('');
  }

  craftDetailHTML(unit) {
    const recipe = this.selectedRecipe;
    if (!recipe) return '<div class="ui-empty-note">Select a recipe to craft.</div>';

    const picker = (label, attr, options) => `
      <div class="ui-section-label">${label}</div>
      <div class="ui-detail-tabs ui-tabs-flush">
        ${options.map(o => `<button class="ui-detail-tab ${o.active ? 'active' : ''}" data-${attr}="${o.value}">${esc(o.label)}</button>`).join('')}
      </div>`;

    const resultSlots = this.craftableSlots(recipe, unit);
    const ores = this.oreOptions();
    const materials = recipe.materials.map(kind => {
      const isOre = kind === 'ore';
      const matId = isOre ? this.selectedOreId : kind;
      const have = matId ? state.inventory.some(i => i.id === matId) : false;
      const label = isOre ? (matId ? getItem(matId)?.name ?? 'Ore' : 'Ore (none owned)') : (getItem(kind)?.name ?? kind);
      return `<div class="ui-item-stat ${have ? 'have' : 'missing'}">${have ? '✓' : '✕'} ${esc(label)}</div>`;
    }).join('');

    const oreTier = recipe.materials.includes('ore') ? getItem(this.selectedOreId)?.oreTier : null;
    const previewRarity = oreTier ? (ORE_TIER_TO_RARITY[oreTier] ?? 'uncommon') : 'uncommon';

    return `
      <div class="ui-item-name">${esc(this.recipeDesc(recipe, unit))}</div>
      ${resultSlots.length > 1 ? picker('Result slot', 'result-slot', resultSlots.map(slot => (
        { value: slot, label: SLOT_LABEL[slot] ?? slot, active: this.selectedResultSlot === slot }))) : ''}
      ${recipe.materials.includes('ore') && ores.length > 1 ? picker('Ore type (sets rarity)', 'ore', ores.map(ore => (
        { value: ore.id, label: ore.name.replace(' Ore', ''), active: this.selectedOreId === ore.id }))) : ''}
      <div class="ui-section-label">Materials needed</div>
      ${materials}
      <div class="ui-item-tags">Result: ${rarityBadgeHTML(previewRarity)} rolled for ${esc(unit.name.split(' ')[0])}'s talents</div>
      <button class="ui-action-btn" data-craft="1" ${this.recipeAvailable(recipe) ? '' : 'disabled'}>Craft</button>`;
  }

  rebuild() {
    const unit = state.party[this.unitIndex];
    const craft = this.mode === 'craft';

    mount(`
      <div class="ui-screen ui-forge ui-forge-paper">
        <div class="ui-topbar">
          <button class="ui-navbtn" data-nav="back">◀ Back</button>
          <div class="ui-title">Forge</div>
          <div class="ui-currency">${currencyLabel(state.tytrate)}</div>
        </div>
        <div class="ui-body ui-body-3">
          <div class="ui-panel ui-list-panel" data-scroll-id="forge-team">${this.teamHTML()}</div>
          <div class="ui-panel ui-list-panel" data-scroll-id="forge-list-${this.mode}">
            <div class="ui-detail-tabs ui-tabs-flush">
              <button class="ui-detail-tab ${craft ? '' : 'active'}" data-mode="reinforce">Reinforce</button>
              <button class="ui-detail-tab ${craft ? 'active' : ''}" data-mode="craft">Craft</button>
            </div>
            ${craft ? this.recipesHTML(unit) : this.slotsHTML(unit)}
          </div>
          <div class="ui-panel ui-detail-panel" data-scroll-id="forge-detail">
            ${craft ? this.craftDetailHTML(unit) : this.reinforceDetailHTML(unit)}
          </div>
        </div>
      </div>
    `);

    onClick('[data-nav="back"]', () => this.scene.start('HubScene', this.hubData));
    onClick('[data-mode]', (e, node) => {
      this.mode = node.dataset.mode;
      this.selectedSlot = null;
      this.selectedRecipe = null;
      this.selectedResultSlot = null;
      this.selectedOreId = null;
      this.rebuild();
    });
    onClick('[data-unit]', (e, node) => {
      this.unitIndex = Number(node.dataset.unit);
      this.selectedSlot = null;
      this.selectedRecipe = null;
      this.selectedResultSlot = null;
      this.rebuild();
    });
    onClick('[data-slot]', (e, node) => { this.selectedSlot = node.dataset.slot; this.rebuild(); });
    onClick('[data-reinforce]', (e, node) => {
      const lvl = unit.equip[this.selectedSlot].reinforceLevel ?? 0;
      this.reinforce(unit, this.selectedSlot, REINFORCE_BASE * (lvl + 1), node.dataset.reinforce || null);
    });
    onClick('[data-recipe]', (e, node) => {
      const recipe = FORGE_RECIPES[Number(node.dataset.recipe)];
      this.selectedRecipe = recipe;
      this.selectedResultSlot = this.craftableSlots(recipe, unit)[0];
      this.selectedOreId = this.oreOptions()[0]?.id ?? null;
      this.rebuild();
    });
    onClick('[data-result-slot]', (e, node) => { this.selectedResultSlot = node.dataset.resultSlot; this.rebuild(); });
    onClick('[data-ore]', (e, node) => { this.selectedOreId = node.dataset.ore; this.rebuild(); });
    onClick('[data-craft]', () => this.craftItem(unit, this.selectedRecipe, this.selectedResultSlot, this.selectedOreId));
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
