import Phaser from 'phaser';
import {
  state, classSkillSlotCount, equipPassive, equipSpecialSlot, equipSkillSlot,
  CLASS_SKILL_SLOT_LEVELS, currentRoleId,
} from '../data/gameState.js';
import {
  ATTACK, THROW, getUnitSpecials, getUnitSkills, getUnitPassivePool,
  getEquippedSpecialAbilities, getEquippedSkillAbilities,
} from '../data/abilities.js';
import { loadHeroSprites, stripHeroBackground, heroKey, firstFrame, spriteKeyForRole } from '../data/heroSprites.js';
import { mount, unmount, onClick, spriteFrameDataURL, esc } from '../ui/domUI.js';

// Split out of PartyScene per the 2026-07-04 style-guide follow-up — "Loadout"
// gets its own page (Playbook/Specials/Skills/Class Skills) instead of being
// buried in the party detail scroll. Mirrors the planned "3 Class Skills /
// 6 Special Attacks / 3 Skills" screen from the style guide doc.
export class LoadoutScene extends Phaser.Scene {
  constructor() { super({ key: 'LoadoutScene' }); }

  preload() {
    const classNames = state.party.map(u => spriteKeyForRole(currentRoleId(u))).filter(Boolean);
    loadHeroSprites(this, classNames);
  }

  init(data) {
    this.unitId = data?.unitId ?? state.party[0]?.id ?? null;
    this.expandedAbility = null; // ability id whose details row is expanded, or null
    this.picker = null; // { category: 'special'|'skill'|'classSkill', slotIndex } while a picker modal is open
  }

  create() {
    state.party.forEach(u => {
      const cn = spriteKeyForRole(currentRoleId(u));
      if (cn) stripHeroBackground(this, cn);
    });

    this.render();
    this.events.once('shutdown', unmount);
  }

  render() {
    const unit = state.party.find(u => u.id === this.unitId);
    if (!unit) { this.scene.start('PartyScene'); return; }

    const spriteKey = spriteKeyForRole(currentRoleId(unit));
    const url = spriteKey ? spriteFrameDataURL(this, heroKey(spriteKey), firstFrame(spriteKey)) : null;

    const abilityRow = (ab, subLabel) => {
      const expanded = this.expandedAbility === ab.id;
      return `
        <div class="ui-ability-row" data-ability-toggle="${ab.id}">
          <div class="ui-ability-row-head">
            <span class="ui-ability-name">${ab.icon} ${esc(ab.name)}</span>
            <span class="ui-ability-cost">${subLabel}</span>
          </div>
          ${expanded ? `<div class="ui-ability-desc">${esc(ab.desc)}</div>` : ''}
        </div>`;
    };

    const specials = getUnitSpecials(unit);
    const skills = getUnitSkills(unit);
    const pool = getUnitPassivePool(unit);
    if (!unit.classSkills) unit.classSkills = [];
    const slotCount = classSkillSlotCount(unit.level);

    const classSkillsHTML = CLASS_SKILL_SLOT_LEVELS.map((lvl, i) => {
      if (i >= slotCount) {
        return `<div class="ui-skill-slot locked">🔒 Slot unlocks at Lv.${lvl}</div>`;
      }
      const equippedId = unit.classSkills[i] ?? null;
      const ab = pool.find(a => a.id === equippedId) ?? null;
      return `
        <div class="ui-skill-slot ${ab ? '' : 'empty'}" ${pool.length ? `data-skill-slot="${i}"` : ''}>
          <span class="ui-ability-name">${ab ? `${ab.icon} ${esc(ab.name)}` : '— empty —'}</span>
          ${ab ? `<span class="ui-ability-desc">${esc(ab.desc)}</span>` : ''}
        </div>`;
    }).join('');

    // Battle loadout (2026-07-07, picker follow-up same day) — a unit can
    // know more Specials/Skills than fit in these slots; tap a slot to open
    // a picker modal listing every learned ability in that category (not a
    // one-at-a-time cycle — the first version of this feature cycled
    // through options on repeated taps, which was tedious once a unit knew
    // more than a couple; see pickerModalHTML below), same interaction now
    // shared by the Class Skills slots above/below too.
    const equippedSpecials = getEquippedSpecialAbilities(unit);
    const equippedSkills = getEquippedSkillAbilities(unit);

    const specialSlotsHTML = equippedSpecials.map((ab, i) => `
      <div class="ui-skill-slot ${ab ? '' : 'empty'}" ${specials.length ? `data-special-slot="${i}"` : ''}>
        <span class="ui-ability-name">${ab ? `${ab.icon} ${esc(ab.name)}` : '— empty (tap to add) —'}</span>
        ${ab ? `<span class="ui-ability-cost">${ab.cost} SP</span>` : ''}
        ${ab ? `<span class="ui-ability-desc">${esc(ab.desc)}</span>` : ''}
      </div>`).join('');

    const skillSlotsHTML = equippedSkills.map((ab, i) => `
      <div class="ui-skill-slot ${ab ? '' : 'empty'}" ${skills.length ? `data-skillcd-slot="${i}"` : ''}>
        <span class="ui-ability-name">${ab ? `${ab.icon} ${esc(ab.name)}` : '— empty (tap to add) —'}</span>
        ${ab ? `<span class="ui-ability-cost">CD ${ab.cooldown}</span>` : ''}
        ${ab ? `<span class="ui-ability-desc">${esc(ab.desc)}</span>` : ''}
      </div>`).join('');

    mount(`
      <div class="ui-screen">
        <div class="ui-topbar">
          <button class="ui-navbtn" data-nav="back">◀ ${esc(unit.name.split(' ')[0])}</button>
          <div class="ui-title">LOADOUT</div>
          <div style="width:120px;"></div>
        </div>
        <div class="ui-body" style="grid-template-columns: 1fr;">
          <div class="ui-panel ui-detail-panel" data-scroll-id="loadout-${unit.id}">
            <div class="ui-detail-header">
              ${url ? `<img class="ui-portrait-lg" src="${url}" alt="">` : `<div class="ui-portrait-lg"></div>`}
              <div>
                <div class="ui-name">${esc(unit.name)}</div>
                <div class="ui-role-path">Tap a row to see its full breakdown</div>
              </div>
            </div>

            <div class="ui-section">
              <div class="ui-section-label">Playbook</div>
              ${[ATTACK, THROW].map(a => abilityRow(a, '')).join('')}
            </div>

            <div class="ui-section">
              <div class="ui-section-label">Specials (SP) — tap a slot to change &middot; ${specials.length} known</div>
              ${specials.length ? specialSlotsHTML : '<div class="ui-empty-note">— none yet —</div>'}
            </div>

            <div class="ui-section">
              <div class="ui-section-label">Skills (cooldown) — tap a slot to change &middot; ${skills.length} known</div>
              ${skills.length ? skillSlotsHTML : '<div class="ui-empty-note">— none yet —</div>'}
            </div>

            <div class="ui-section">
              <div class="ui-section-label">Class Skills — tap a slot to change</div>
              ${pool.length ? classSkillsHTML : '<div class="ui-empty-note">— no passives known yet —</div>'}
            </div>
          </div>
        </div>
      </div>
      ${this.picker ? this.pickerModalHTML(unit) : ''}
    `);

    this.wireEvents(unit);
  }

  // Category config for the picker modal — the one thing that differs
  // between Specials/Skills/Class Skills is which pool to list from, which
  // array on `unit` holds the current selection, and how to label each
  // option's cost. Centralized here so pickerModalHTML/wireEvents' picker
  // handlers don't each repeat their own if/else category branching.
  pickerConfig(unit, category) {
    if (category === 'special') {
      return { pool: getUnitSpecials(unit), arr: unit.equippedSpecials ?? [], title: 'Choose a Special', sub: a => `${a.cost} SP` };
    }
    if (category === 'skill') {
      return { pool: getUnitSkills(unit), arr: unit.equippedSkills ?? [], title: 'Choose a Skill', sub: a => `CD ${a.cooldown}` };
    }
    return { pool: getUnitPassivePool(unit), arr: unit.classSkills ?? [], title: 'Choose a Class Skill', sub: () => '' };
  }

  pickerModalHTML(unit) {
    const { category, slotIndex } = this.picker;
    const { pool, arr, title, sub } = this.pickerConfig(unit, category);
    const usedElsewhere = new Set(arr.filter((id, idx) => idx !== slotIndex && id));
    const currentId = arr[slotIndex] ?? null;
    const options = pool.filter(a => !usedElsewhere.has(a.id));

    const optionButtons = options.map(a => {
      const subLabel = sub(a);
      return `
        <button class="ui-btn ${a.id === currentId ? 'ui-btn-primary' : ''}" data-picker-choose="${a.id}">
          ${a.icon} ${esc(a.name)}
          <span class="ui-btn-sub">${subLabel ? esc(subLabel) + ' &middot; ' : ''}${esc(a.desc)}</span>
        </button>`;
    }).join('');

    return `
      <div class="ui-modal-backdrop" data-modal-cancel="1">
        <div class="ui-modal" data-modal-stop="1">
          <div class="ui-modal-title">${esc(title)}</div>
          <div class="ui-modal-actions">
            <button class="ui-btn ui-btn-muted ${currentId === null ? 'ui-btn-primary' : ''}" data-picker-choose="__empty__">— empty —</button>
            ${optionButtons}
          </div>
          <button class="ui-btn ui-btn-muted" style="margin-top:10px;width:100%;" data-picker-cancel="1">Cancel</button>
        </div>
      </div>`;
  }

  wireEvents(unit) {
    onClick('[data-nav="back"]', () => this.scene.start('PartyScene', { selId: unit.id }));

    onClick('[data-ability-toggle]', (e, node) => {
      const id = node.dataset.abilityToggle;
      this.expandedAbility = this.expandedAbility === id ? null : id;
      this.render();
    });

    onClick('[data-skill-slot]', (e, node) => {
      this.picker = { category: 'classSkill', slotIndex: Number(node.dataset.skillSlot) };
      this.render();
    });

    onClick('[data-special-slot]', (e, node) => {
      this.picker = { category: 'special', slotIndex: Number(node.dataset.specialSlot) };
      this.render();
    });

    onClick('[data-skillcd-slot]', (e, node) => {
      this.picker = { category: 'skill', slotIndex: Number(node.dataset.skillcdSlot) };
      this.render();
    });

    onClick('[data-picker-choose]', (e, node) => {
      const id = node.dataset.pickerChoose === '__empty__' ? null : node.dataset.pickerChoose;
      const { category, slotIndex } = this.picker;
      if (category === 'special') equipSpecialSlot(unit, slotIndex, id);
      else if (category === 'skill') equipSkillSlot(unit, slotIndex, id);
      else equipPassive(unit, slotIndex, id);
      this.picker = null;
      this.render();
    });

    onClick('[data-picker-cancel]', () => { this.picker = null; this.render(); });
    onClick('[data-modal-cancel]', () => { this.picker = null; this.render(); });
    onClick('[data-modal-stop]', (e) => e.stopPropagation());
  }
}
