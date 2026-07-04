import Phaser from 'phaser';
import {
  state, classSkillSlotCount, equipPassive, CLASS_SKILL_SLOT_LEVELS, currentRoleId,
} from '../data/gameState.js';
import { ATTACK, THROW, getUnitSpecials, getUnitSkills, getUnitPassivePool } from '../data/abilities.js';
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
              <div class="ui-section-label">Specials (SP)</div>
              ${specials.length ? specials.map(a => abilityRow(a, `${a.cost} SP`)).join('') : '<div class="ui-empty-note">— none yet —</div>'}
            </div>

            <div class="ui-section">
              <div class="ui-section-label">Skills (cooldown)</div>
              ${skills.length ? skills.map(a => abilityRow(a, `CD ${a.cooldown}`)).join('') : '<div class="ui-empty-note">— none yet —</div>'}
            </div>

            <div class="ui-section">
              <div class="ui-section-label">Class Skills — tap a slot to change</div>
              ${pool.length ? classSkillsHTML : '<div class="ui-empty-note">— no passives known yet —</div>'}
            </div>
          </div>
        </div>
      </div>
    `);

    this.wireEvents(unit);
  }

  wireEvents(unit) {
    onClick('[data-nav="back"]', () => this.scene.start('PartyScene', { selId: unit.id }));

    onClick('[data-ability-toggle]', (e, node) => {
      const id = node.dataset.abilityToggle;
      this.expandedAbility = this.expandedAbility === id ? null : id;
      this.render();
    });

    onClick('[data-skill-slot]', (e, node) => {
      const slotIndex = Number(node.dataset.skillSlot);
      const pool = getUnitPassivePool(unit);
      const usedElsewhere = new Set(unit.classSkills.filter((id, idx) => idx !== slotIndex && id));
      const options = [null, ...pool.map(a => a.id).filter(id => !usedElsewhere.has(id))];
      const curIdx = options.indexOf(unit.classSkills[slotIndex] ?? null);
      const nextId = options[(curIdx + 1) % options.length];
      equipPassive(unit, slotIndex, nextId);
      this.render();
    });
  }
}
