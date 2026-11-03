import {
  classSkillSlotCount, equipPassive, equipSpecialSlot, equipSkillSlot, CLASS_SKILL_SLOT_LEVELS,
  FAST_PLAY_DEFAULTS, setFastPlaySlot,
} from '../data/gameState.js';
import {
  ATTACK, THROW, getUnitSpecials, getUnitSkills, getUnitPassivePool,
  getEquippedSpecialAbilities, getEquippedSkillAbilities, fastPlayPool, fastPlayAbility,
} from '../data/abilities.js';
import { onClick, esc } from './domUI.js';

// Playbook/Specials/Skills/Class Skills editor shown in PartyScene's A. Skills
// tab, and Class tab when `section` is 'class'. `host` is the owning scene: it keeps `expandedAbility` (ability id
// whose details row is open) and `picker` ({ category, slotIndex } while the
// picker modal is open), and re-renders via host.render().
export function loadoutSectionsHTML(host, unit, section) {
  const abilityRow = (ab, subLabel) => {
    const expanded = host.expandedAbility === ab.id;
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

  // Battle loadout (2026-07-07) — a unit can know more Specials/Skills than
  // fit in these slots; tapping a slot opens a picker listing every learned
  // ability in that category.
  const specialSlotsHTML = getEquippedSpecialAbilities(unit).map((ab, i) => `
    <div class="ui-skill-slot ${ab ? '' : 'empty'}" ${specials.length ? `data-special-slot="${i}"` : ''}>
      <span class="ui-ability-name">${ab ? `${ab.icon} ${esc(ab.name)}` : '— empty (tap to add) —'}</span>
      ${ab ? `<span class="ui-ability-cost">${ab.cost} SP</span>` : ''}
      ${ab ? `<span class="ui-ability-desc">${esc(ab.desc)}</span>` : ''}
    </div>`).join('');

  const skillSlotsHTML = getEquippedSkillAbilities(unit).map((ab, i) => `
    <div class="ui-skill-slot ${ab ? '' : 'empty'}" ${skills.length ? `data-skillcd-slot="${i}"` : ''}>
      <span class="ui-ability-name">${ab ? `${ab.icon} ${esc(ab.name)}` : '— empty (tap to add) —'}</span>
      ${ab ? `<span class="ui-ability-cost">CD ${ab.cooldown}</span>` : ''}
      ${ab ? `<span class="ui-ability-desc">${esc(ab.desc)}</span>` : ''}
    </div>`).join('');

  if (section === 'class') {
    return `
      <div class="ui-section">
        <div class="ui-section-label">Class Skills &middot; tap a slot to change</div>
        ${pool.length ? `<div class="ui-skill-grid">${classSkillsHTML}</div>` : '<div class="ui-empty-note">— no passives known yet —</div>'}
      </div>`;
  }

  return `
    <div class="ui-section">
      <div class="ui-section-label">Playbook &middot; Specials (SP) &middot; ${specials.length} known</div>
      ${specials.length ? `<div class="ui-skill-grid">${specialSlotsHTML}</div>` : '<div class="ui-empty-note">— none yet —</div>'}
    </div>

    <div class="ui-section">
      <div class="ui-section-label">Skillbook &middot; Skills (cooldown) &middot; ${skills.length} known</div>
      ${skills.length ? `<div class="ui-skill-grid">${skillSlotsHTML}</div>` : '<div class="ui-empty-note">— none yet —</div>'}
    </div>

    <div class="ui-section">
      <div class="ui-section-label">Basicbook &middot; tap for details</div>
      <div class="ui-skill-grid">${[ATTACK, THROW].map(a => abilityRow(a, '')).join('')}</div>
    </div>

    <div class="ui-section">
      <div class="ui-section-label">Fast Play &middot; turn on in Settings</div>
      <div class="ui-skill-grid">${['Drag onto enemy', 'Double-tap enemy'].map((label, i) => {
        const ab = fastPlayAbility(unit, i);
        return `
        <div class="ui-skill-slot" data-fast-slot="${i}">
          <span class="ui-ability-name">${ab.icon} ${esc(ab.name)}</span>
          <span class="ui-ability-cost">${label}</span>
        </div>`;
      }).join('')}</div>
    </div>`;
}

// The one thing that differs between Specials/Skills/Class Skills is which
// pool to list from, which array holds the selection, and the cost label.
function pickerConfig(unit, category) {
  if (category === 'special') {
    return { pool: getUnitSpecials(unit), arr: unit.equippedSpecials ?? [], title: 'Choose a Special', sub: a => `${a.cost} SP` };
  }
  if (category === 'skill') {
    return { pool: getUnitSkills(unit), arr: unit.equippedSkills ?? [], title: 'Choose a Skill', sub: a => `CD ${a.cooldown}` };
  }
  if (category === 'fast') {
    return {
      pool: fastPlayPool(unit), arr: unit.fastPlay ?? FAST_PLAY_DEFAULTS, noEmpty: true, allowRepeat: true,
      title: 'Fast Play attack', sub: () => '', // each desc already ends with its SP or cooldown
    };
  }
  return { pool: getUnitPassivePool(unit), arr: unit.classSkills ?? [], title: 'Choose a Class Skill', sub: () => '' };
}

export function loadoutPickerHTML(host, unit) {
  const { category, slotIndex } = host.picker;
  const { pool, arr, title, sub, noEmpty, allowRepeat } = pickerConfig(unit, category);
  const usedElsewhere = new Set(allowRepeat ? [] : arr.filter((id, idx) => idx !== slotIndex && id));
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
    <div class="ui-modal-backdrop" data-picker-cancel="1">
      <div class="ui-modal" data-picker-stop="1">
        <div class="ui-modal-title">${esc(title)}</div>
        <div class="ui-modal-actions">
          ${noEmpty ? '' : `<button class="ui-btn ui-btn-muted ${currentId === null ? 'ui-btn-primary' : ''}" data-picker-choose="__empty__">— empty —</button>`}
          ${optionButtons}
        </div>
        <button class="ui-btn ui-btn-muted" style="margin-top:10px;width:100%;" data-picker-cancel="1">Cancel</button>
      </div>
    </div>`;
}

export function wireLoadoutEvents(host, unit) {
  onClick('[data-ability-toggle]', (e, node) => {
    const id = node.dataset.abilityToggle;
    host.expandedAbility = host.expandedAbility === id ? null : id;
    host.render();
  });

  const openPicker = (category, slotIndex) => { host.picker = { category, slotIndex }; host.render(); };
  onClick('[data-skill-slot]', (e, node) => openPicker('classSkill', Number(node.dataset.skillSlot)));
  onClick('[data-special-slot]', (e, node) => openPicker('special', Number(node.dataset.specialSlot)));
  onClick('[data-skillcd-slot]', (e, node) => openPicker('skill', Number(node.dataset.skillcdSlot)));
  onClick('[data-fast-slot]', (e, node) => openPicker('fast', Number(node.dataset.fastSlot)));

  onClick('[data-picker-choose]', (e, node) => {
    const id = node.dataset.pickerChoose === '__empty__' ? null : node.dataset.pickerChoose;
    const { category, slotIndex } = host.picker;
    if (category === 'special') equipSpecialSlot(unit, slotIndex, id);
    else if (category === 'skill') equipSkillSlot(unit, slotIndex, id);
    else if (category === 'fast') setFastPlaySlot(unit, slotIndex, id);
    else equipPassive(unit, slotIndex, id);
    host.picker = null;
    host.render();
  });

  onClick('[data-picker-cancel]', () => { host.picker = null; host.render(); });
  onClick('[data-picker-stop]', (e) => e.stopPropagation());
}
