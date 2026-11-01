import Phaser from 'phaser';
import { state } from '../data/gameState.js';
import {
  ATTACK, THROW, ABILITIES, skillUnlockRoutes, getUnitSpecials, getUnitSkills, getUnitPassivePool,
} from '../data/abilities.js';
import { mount, unmount, onClick, esc } from '../ui/domUI.js';

const TABS = [
  { id: 'special', label: 'Specials' },
  { id: 'skill',   label: 'Skills' },
  { id: 'passive', label: 'Passives' },
];
const TAB_NOTE = {
  special: 'Uses SP',
  skill:   'Uses a cooldown',
  passive: 'On when equipped',
};

// Every skill in the game and how to get it. Opened from the World Map bar
// once the player has entered an academy (state.academyVisited).
export class SkillBookScene extends Phaser.Scene {
  constructor() { super({ key: 'SkillBookScene' }); }

  init() {
    this.activeTab = 'special';
    this.selectedId = null;
  }

  create() {
    this.routes = skillUnlockRoutes();
    this.known = {};
    for (const unit of state.party) {
      const first = unit.name.split(' ')[0];
      for (const ab of [...getUnitSpecials(unit), ...getUnitSkills(unit), ...getUnitPassivePool(unit)]) {
        (this.known[ab.id] ??= new Set()).add(first);
      }
    }
    this.render();
    this.events.once('shutdown', unmount);
  }

  // The two moves every hero starts with have no entry in ABILITIES.
  listFor(tab) {
    const learnable = Object.values(ABILITIES)
      .filter(ab => (ab.category ?? 'special') === tab && this.routes[ab.id])
      .sort((a, b) => a.name.localeCompare(b.name));
    return tab === 'special' ? [ATTACK, THROW, ...learnable] : learnable;
  }

  routesFor(ab) {
    return this.routes[ab.id] ?? ['Every hero starts with this'];
  }

  knownBy(ab) {
    if (ab === ATTACK || ab === THROW) return state.party.map(u => u.name.split(' ')[0]);
    return [...(this.known[ab.id] ?? [])];
  }

  detailHTML(ab) {
    const known = this.knownBy(ab);
    return `
      <div class="ui-item-name">${ab.icon ?? ''} ${esc(ab.name)}</div>
      <div class="ui-item-desc">${esc(ab.desc ?? '')}</div>
      <div class="ui-section-label">How to unlock</div>
      ${this.routesFor(ab).map(r => `<div class="ui-skillbook-route">${esc(r)}</div>`).join('')}
      <div class="ui-section-label ui-skillbook-gap">Known by</div>
      <div class="ui-item-desc">${known.length ? esc(known.join(', ')) : 'No one in your party yet'}</div>`;
  }

  render() {
    const list = this.listFor(this.activeTab);
    const selected = list.find(a => a.id === this.selectedId) ?? list[0];
    mount(`
      <div class="ui-screen ui-index">
        <div class="ui-topbar">
          <button class="ui-navbtn" data-nav="back">◀ World Map</button>
          <div class="ui-title">SKILL BOOK</div>
          <div style="width:110px"></div>
        </div>
        <div class="ui-body">
          <div class="ui-panel ui-list-panel" data-scroll-id="skillbook-${this.activeTab}">
            <div class="ui-detail-tabs ui-tabs-flush">
              ${TABS.map(t => `<button class="ui-detail-tab ${t.id === this.activeTab ? 'active' : ''}" data-tab="${t.id}">${t.label}</button>`).join('')}
            </div>
            <div class="ui-section-label">${TAB_NOTE[this.activeTab]} · ${list.length}</div>
            ${list.map(ab => `
              <div class="ui-row ui-skillbook-row ${ab === selected ? 'active' : ''}" data-skill="${ab.id}">
                <span>${ab.icon ?? '◈'}</span>
                <span class="ui-row-name">${esc(ab.name)}</span>
                ${this.knownBy(ab).length ? '<span class="ui-skillbook-known">✓</span>' : ''}
              </div>`).join('')}
          </div>
          <div class="ui-panel ui-detail-panel" data-scroll-id="skillbook-detail">${selected ? this.detailHTML(selected) : ''}</div>
        </div>
      </div>
    `);

    onClick('[data-nav="back"]', () => this.scene.start('WorldMapScene'));
    onClick('[data-tab]', (e, node) => { this.activeTab = node.dataset.tab; this.selectedId = null; this.render(); });
    onClick('[data-skill]', (e, node) => { this.selectedId = node.dataset.skill; this.render(); });
  }
}
