import Phaser from 'phaser';
import { state } from '../data/gameState.js';
import {
  ATTACK, THROW, ABILITIES, SKILL_CLASS_GROUPS, SKILL_STAT_GROUPS, skillUnlockEntries,
  getUnitSpecials, getUnitSkills, getUnitPassivePool,
} from '../data/abilities.js';
import { mount, unmount, onClick, esc } from '../ui/domUI.js';

const TYPE_GROUPS = { Specials: 'special', Skills: 'skill', Passives: 'passive' };
const MODES = [
  { id: 'class', label: 'By Class', groups: SKILL_CLASS_GROUPS },
  { id: 'stat',  label: 'By Stat',  groups: SKILL_STAT_GROUPS },
  { id: 'type',  label: 'By Type',  groups: Object.keys(TYPE_GROUPS) },
];

// Every skill in the game and how to get it: pick how to browse, then a group,
// then a skill. Opened from the World Map bar once the player has entered an
// academy (state.academyVisited).
export class SkillBookScene extends Phaser.Scene {
  constructor() { super({ key: 'SkillBookScene' }); }

  init() {
    this.mode = 'class';
    this.group = SKILL_CLASS_GROUPS[0];
    this.selectedId = null;
  }

  create() {
    this.entries = skillUnlockEntries();
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

  // The rows for the open group, in unlock order. Attack and Throw have no
  // entry in ABILITIES, so they're added by hand.
  listFor() {
    if (this.mode === 'type') {
      const category = TYPE_GROUPS[this.group];
      const learnable = Object.values(ABILITIES)
        .filter(ab => (ab.category ?? 'special') === category && this.entries.some(e => e.id === ab.id))
        .sort((a, b) => a.name.localeCompare(b.name));
      return (category === 'special' ? [ATTACK, THROW, ...learnable] : learnable).map(ab => ({ ab, tag: '' }));
    }
    const best = new Map();
    for (const e of this.entries.filter(x => x.group === this.group)) {
      if (!best.has(e.id) || e.order < best.get(e.id).order) best.set(e.id, e);
    }
    return [...best.values()].sort((a, b) => a.order - b.order)
      .map(e => ({
        ab: ABILITIES[e.id], tag: e.tag,
        roles: [...new Set(this.entries.filter(x => x.group === this.group && x.id === e.id).map(x => x.role))].filter(Boolean).join(', '),
      }));
  }

  routesFor(ab) {
    const routes = this.entries.filter(e => e.id === ab.id).map(e => e.text);
    return routes.length ? [...new Set(routes)] : ['Every hero starts with this'];
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
    const list = this.listFor();
    const selected = list.find(r => r.ab.id === this.selectedId)?.ab ?? list[0]?.ab;
    const groups = MODES.find(m => m.id === this.mode).groups;
    mount(`
      <div class="ui-screen ui-index">
        <div class="ui-topbar">
          <button class="ui-navbtn" data-nav="back">◀ World Map</button>
          <div class="ui-title">SKILL BOOK</div>
          <div class="ui-skillbook-modes">
            ${MODES.map(m => `<button class="ui-navbtn ${m.id === this.mode ? 'accent' : ''}" data-mode="${m.id}">${m.label}</button>`).join('')}
          </div>
        </div>
        <div class="ui-body ui-body-3">
          <div class="ui-panel ui-list-panel" data-scroll-id="skillbook-groups-${this.mode}">
            ${groups.map(g => `<div class="ui-row ui-skillbook-row ${g === this.group ? 'active' : ''}" data-group="${esc(g)}"><span class="ui-row-name">${esc(g)}</span></div>`).join('')}
          </div>
          <div class="ui-panel ui-list-panel" data-scroll-id="skillbook-${this.mode}-${this.group}">
            ${list.map(({ ab, tag, roles }) => `
              <div class="ui-row ui-skillbook-row ${ab === selected ? 'active' : ''}" data-skill="${ab.id}">
                <span>${ab.icon ?? '◈'}</span>
                <span class="ui-row-name">${esc(ab.name)}${roles ? `<span class="ui-row-sub">${esc(roles)}</span>` : ''}</span>
                ${this.knownBy(ab).length ? '<span class="ui-skillbook-known">✓</span>' : ''}
                ${tag ? `<span class="ui-skillbook-tag">${esc(tag)}</span>` : ''}
              </div>`).join('')}
          </div>
          <div class="ui-panel ui-detail-panel" data-scroll-id="skillbook-detail">${selected ? this.detailHTML(selected) : ''}</div>
        </div>
      </div>
    `);

    onClick('[data-nav="back"]', () => this.scene.start('WorldMapScene'));
    onClick('[data-mode]', (e, node) => {
      this.mode = node.dataset.mode;
      this.group = MODES.find(m => m.id === this.mode).groups[0];
      this.selectedId = null;
      this.render();
    });
    onClick('[data-group]', (e, node) => { this.group = node.dataset.group; this.selectedId = null; this.render(); });
    onClick('[data-skill]', (e, node) => { this.selectedId = node.dataset.skill; this.render(); });
  }
}
