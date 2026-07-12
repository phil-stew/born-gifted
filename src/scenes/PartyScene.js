import Phaser from 'phaser';
import {
  state, FULL_ROSTER, effectiveStats, maxHp, xpToNext, classSkillSlotCount, elementIcon,
  roleDisplayLabel, currentRoleId, roleById, pendingPromotion, chainById,
  sportById, t3SportOptions, promoteUnit, gearLayoutForUnit, equipItem, dismissUnit,
  MAX_EQUIPPED_SPECIALS, MAX_EQUIPPED_SKILLS,
} from '../data/gameState.js';
import { getEquippedSpecialAbilities, getEquippedSkillAbilities } from '../data/abilities.js';
import { rarityColor, gearFrameName, registerGearFrames, GEAR_SHEET } from '../data/items.js';
import { loadHeroSprites, stripHeroBackground, heroKey, firstFrame, spriteKeyForRole, stripBackgroundByKey } from '../data/heroSprites.js';
import { mount, unmount, onClick, spriteFrameDataURL, iconDataURL, esc } from '../ui/domUI.js';

const SLOT_LABEL = { weapon: 'Class Item', footwear: 'Shoes', handwear: 'Gloves', chest: 'Chest', headwear: 'Headgear' };
// Fallback glyph for gear with no per-item art (universal items, or a sport
// with no matching class column) — same emoji EquipmentScene uses for its
// always-shown slot-type icon, reused here as the icon itself when there's
// nothing to snapshot from the sheet, so every slot/row still gets an icon.
const SLOT_ICON = { weapon: '🏆', footwear: '👟', handwear: '🧤', chest: '🛡', headwear: '⛑' };
const GEAR_ICON_SIZE = 22;
const STAT_DEFS = [
  { key: 'speed', label: 'Speed' }, { key: 'strength', label: 'Strength' },
  { key: 'stamina', label: 'Stamina' }, { key: 'endurance', label: 'Endurance' },
];
// Derived (not independently leveled/gear-rolled) — same formula StatsScene
// already used, just missing here (2026-07-08 feedback).
const DERIVED_STAT_DEFS = [
  { label: 'Power',     calc: eff => eff.speed + eff.strength },
  { label: 'Technique', calc: eff => eff.endurance + eff.stamina },
];

export class PartyScene extends Phaser.Scene {
  constructor() { super({ key: 'PartyScene' }); }

  preload() {
    const classNames = state.party.map(u => spriteKeyForRole(currentRoleId(u))).filter(Boolean);
    loadHeroSprites(this, classNames);
    if (!this.textures.exists('gears')) this.load.image('gears', 'gears/gearitems.png');
  }

  init(data) {
    this.selId = data?.selId ?? state.party[0]?.id ?? null;
    this.promoStep = null;   // null | 'prompt' | 'sport' | 'role'
    this.promoTier = null;
    this.promoSport = null;
    this.equipSlot = null;   // slot key currently showing the equip picker, or null
    this.confirmDismiss = false; // showing the "dismiss this unit?" modal
  }

  create() {
    // Strip backgrounds once so portrait snapshots come out transparent.
    state.party.forEach(u => {
      const cn = spriteKeyForRole(currentRoleId(u));
      if (cn) stripHeroBackground(this, cn);
    });

    // Icon sheet is baked with a solid black background (no alpha channel),
    // same as EquipmentScene's copy of this sheet.
    stripBackgroundByKey(this, 'gears', { cols: GEAR_SHEET.cols, rows: GEAR_SHEET.rows });
    registerGearFrames(this);

    this.render();
    this.events.once('shutdown', unmount);
  }

  portraitURL(unit) {
    const spriteKey = spriteKeyForRole(currentRoleId(unit));
    if (!spriteKey) return null;
    return spriteFrameDataURL(this, heroKey(spriteKey), firstFrame(spriteKey));
  }

  // Per-item art only exists for sport-mapped gear (see ITEM_SPORT_TO_CLASS);
  // universal/procedural gear has no matching sheet cell. Returns an HTML
  // snippet either way — a real icon image when art exists, otherwise the
  // slot's fallback glyph — so every gear row always shows *something*.
  gearIconHTML(item, slot) {
    const frame = item?.sport ? gearFrameName(item.sport, slot) : null;
    const url = frame ? iconDataURL(this, 'gears', frame, GEAR_ICON_SIZE) : null;
    if (url) return `<img class="ui-gear-icon" src="${url}" alt="">`;
    return `<span class="ui-gear-icon ui-gear-icon-fallback">${SLOT_ICON[slot] ?? '❔'}</span>`;
  }

  render() {
    const recruited = state.party;
    const lockedIds = FULL_ROSTER.filter(r => !recruited.find(u => u.id === r.id)).map(r => r.id);

    const listHTML = [
      ...recruited.map(u => this.cardHTML(u)),
      ...lockedIds.map(id => this.lockedCardHTML(FULL_ROSTER.find(r => r.id === id))),
    ].join('');

    const unit = state.party.find(u => u.id === this.selId);
    const detailHTML = unit ? this.detailHTML(unit) : `
      <div class="ui-detail-panel">
        <div class="ui-empty-note">Select a party member</div>
      </div>`;

    mount(`
      <div class="ui-screen">
        <div class="ui-topbar">
          <button class="ui-navbtn" data-nav="back">◀ World Map</button>
          <div class="ui-title">PARTY</div>
          <button class="ui-navbtn accent" data-nav="inventory">Inventory ▶</button>
        </div>
        <div class="ui-body">
          <div class="ui-panel ui-list-panel" data-scroll-id="party-list">${listHTML}</div>
          <div class="ui-panel" data-scroll-id="party-detail-${unit?.id ?? 'none'}">${detailHTML}</div>
        </div>
      </div>
      ${unit && this.promoStep ? this.promoModalHTML(unit)
        : unit && this.equipSlot ? this.equipPickerHTML(unit, this.equipSlot)
        : unit && this.confirmDismiss ? this.dismissModalHTML(unit) : ''}
    `);

    this.wireEvents();
  }

  cardHTML(unit) {
    const active = unit.id === this.selId;
    const url = this.portraitURL(unit);
    const hp = maxHp(unit);
    const pending = pendingPromotion(unit);
    return `
      <div class="ui-card ${active ? 'active' : ''}" data-select="${unit.id}">
        ${url ? `<img class="ui-portrait-thumb" src="${url}" alt="">` : `<div class="ui-portrait-thumb" style="background:${'#' + unit.color.toString(16).padStart(6, '0')}"></div>`}
        <div class="ui-card-body">
          <div class="ui-card-name">${esc(unit.name.split(' ')[0])}</div>
          <div class="ui-card-sub">Lv.${unit.level} &nbsp;${esc(roleDisplayLabel(unit))}</div>
          <div class="ui-bar"><div class="ui-bar-fill" style="width:100%;background:#4ecc6e"></div></div>
          <div class="ui-card-sub" style="margin-top:4px;">HP ${hp}</div>
        </div>
        ${pending ? '<div class="ui-badge">🏆</div>' : ''}
      </div>
    `;
  }

  lockedCardHTML(unit) {
    return `
      <div class="ui-card locked">
        <div class="ui-portrait-thumb"></div>
        <div class="ui-card-body">
          <div class="ui-card-name">???</div>
          <div class="ui-card-sub">Recruit later</div>
        </div>
      </div>
    `;
  }

  detailHTML(unit) {
    const eff = effectiveStats(unit);
    const url = this.portraitURL(unit);
    const activeRoleId = currentRoleId(unit);
    const tierLabel = (roleId) => {
      const name = roleById(roleId)?.name ?? '?';
      return roleId === activeRoleId ? `[${name}]` : name;
    };
    const rolePath = [unit.t1Role, unit.t2Role, unit.t3Role].filter(Boolean).map(tierLabel).join(' &rarr; ');
    // Current sport name (e.g. "Archery") beside the affinity/element display
    // (2026-07-08 feedback) — derived from the active role's sportId rather
    // than a stored field, same "active tier" rule rolePath already uses.
    const sportName = sportById(roleById(activeRoleId)?.sportId)?.name ?? '';
    const needed = xpToNext(unit.level);
    const pending = pendingPromotion(unit);

    const statsHTML = STAT_DEFS.map(s => {
      const base = unit[s.key], val = eff[s.key], bonus = val - base;
      return `
        <div class="ui-stat-row">
          <span>${s.label}</span>
          <span class="ui-stat-val">${val}${bonus > 0 ? ` <span style="color:#4ecc6e">(+${bonus})</span>` : ''}</span>
        </div>`;
    }).join('')
      // Derived stats (StatsScene has always had these — Power/Technique
      // were missing here, 2026-07-08 feedback). Same formula as StatsScene:
      // Power = Speed+Strength, Technique = Endurance+Stamina.
      + DERIVED_STAT_DEFS.map(d => `
        <div class="ui-stat-row">
          <span>${d.label}</span>
          <span class="ui-stat-val">${d.calc(eff)}</span>
        </div>`).join('');

    // Only show slots this unit's current class actually has (Performance
    // classes get 2, Martial Arts 4, etc. — see CLASS_GEAR_LAYOUT), plus any
    // slot that already holds gear from outside that layout (legacy saves),
    // same rule EquipmentScene uses so the two screens stay consistent.
    const layout = gearLayoutForUnit(unit);
    const visibleSlots = [
      ...layout.slots,
      ...Object.keys(unit.equip).filter(s => unit.equip[s] && !layout.slots.includes(s)),
    ];
    const slotsHTML = visibleSlots.map(slot => {
      const item = unit.equip[slot];
      const rlvl = item?.reinforceLevel ?? 0;
      const rc = item ? '#' + rarityColor(item.rarity).toString(16).padStart(6, '0') : null;
      return `
        <div class="ui-slot" data-open-slot="${slot}" style="cursor:pointer">
          <div class="ui-slot-main">
            ${item ? this.gearIconHTML(item, slot) : ''}
            <div>
              <div class="ui-slot-label">${SLOT_LABEL[slot] ?? slot}</div>
              <div style="color:${item ? rc : 'var(--ui-text-faint)'}">${item ? esc(item.name) + (rlvl ? ` <span style="color:#ffaa44">✦${rlvl}</span>` : '') : '— tap to equip —'}</div>
            </div>
          </div>
          ${item ? `<button class="ui-slot-remove" data-unequip="${slot}">✕</button>` : ''}
        </div>`;
    }).join('');

    // Equipped (battle-loadout) counts, not total known — matches the
    // Class Skills subtitle's existing "X/Y equipped" shape (2026-07-07:
    // Specials/Skills are now capped/selected the same way, see LoadoutScene).
    const equippedSpecialsCount = getEquippedSpecialAbilities(unit).filter(Boolean).length;
    const equippedSkillsCount = getEquippedSkillAbilities(unit).filter(Boolean).length;
    if (!unit.classSkills) unit.classSkills = [];
    const slotCount = classSkillSlotCount(unit.level);
    const equippedCount = unit.classSkills.slice(0, slotCount).filter(Boolean).length;

    return `
      <div class="ui-detail-panel">
        <div class="ui-detail-header">
          ${url ? `<img class="ui-portrait-lg" src="${url}" alt="">` : `<div class="ui-portrait-lg"></div>`}
          <div>
            <div class="ui-name">${esc(unit.name)}</div>
            <div class="ui-role-path">${rolePath}</div>
            <div class="ui-element">${elementIcon(unit.element)} ${esc(unit.element)}  ·  ${esc(sportName)}</div>
          </div>
        </div>

        <div class="ui-level-row">
          <span>Level ${unit.level}</span>
          <span class="ui-xp-label">${unit.xp} / ${needed} XP</span>
        </div>
        <div class="ui-bar"><div class="ui-bar-fill" style="width:${Math.min(100, (unit.xp / needed) * 100)}%;background:#4d9dff"></div></div>

        ${pending ? `<button class="ui-promo-btn" data-promo-start="${pending}">🏆 TIER ${pending === 't3' ? '3' : '2'} PROMOTION AVAILABLE</button>` : ''}

        <div class="ui-section">
          <div class="ui-section-label">Stats</div>
          <div class="ui-stat-grid">${statsHTML}</div>
          <div class="ui-hpsp-row" style="margin-top:14px;">
            <span style="color:#4ecc6e">HP ${maxHp(unit)}</span>
            <span style="color:#4d9dff">SP ${unit.sp ?? 4} / ${unit.maxSp ?? 4}</span>
          </div>
        </div>

        <div class="ui-section">
          <div class="ui-section-label">Equipment</div>
          <div class="ui-slot-grid">${slotsHTML}</div>
        </div>

        <button class="ui-loadout-btn" data-nav-loadout="${unit.id}">
          <span>🎯 Loadout</span>
          <span class="ui-loadout-btn-sub">${equippedSpecialsCount}/${MAX_EQUIPPED_SPECIALS} Specials &middot; ${equippedSkillsCount}/${MAX_EQUIPPED_SKILLS} Skills &middot; ${equippedCount}/${slotCount} Class Skills &nbsp;&rarr;</span>
        </button>

        ${state.party.length > 1 ? `
          <button class="ui-btn ui-btn-danger" style="margin-top:10px;width:100%;" data-dismiss-start="${unit.id}">Dismiss from Roster</button>
        ` : ''}
      </div>
    `;
  }

  dismissModalHTML(unit) {
    return `
      <div class="ui-modal-backdrop" data-modal-cancel="1">
        <div class="ui-modal" data-modal-stop="1">
          <div class="ui-modal-title">Dismiss ${esc(unit.name)}?</div>
          <div class="ui-modal-sub">They'll leave the roster for good — this can't be undone.</div>
          <div class="ui-modal-actions">
            <button class="ui-btn ui-btn-danger" data-dismiss-confirm="1">Dismiss</button>
            <button class="ui-btn ui-btn-muted" data-dismiss-cancel="1">Cancel</button>
          </div>
        </div>
      </div>`;
  }

  promoModalHTML(unit) {
    if (this.promoStep === 'prompt') {
      const chain = chainById(unit.chainId);
      const branching = this.promoTier === 't3' && t3SportOptions(unit).length > 1;
      const destSportId = branching ? null : (this.promoTier === 't2' ? chain.t2 : chain.t3[0]);
      const destSport = destSportId ? sportById(destSportId) : null;
      return `
        <div class="ui-modal-backdrop" data-modal-cancel="1">
          <div class="ui-modal" data-modal-stop="1">
            <div class="ui-modal-title">Promote to ${destSport ? esc(destSport.name) : 'a new sport'}?</div>
            <div class="ui-modal-sub">Promoting swaps in the new sport's abilities.</div>
            <div class="ui-modal-actions">
              <button class="ui-btn ui-btn-primary" data-promo-next="1">Promote</button>
              <button class="ui-btn ui-btn-muted" data-promo-cancel="1">Cancel</button>
            </div>
          </div>
        </div>`;
    }
    if (this.promoStep === 'sport') {
      const options = t3SportOptions(unit).map(sportId => {
        const sport = sportById(sportId);
        return `<button class="ui-btn" data-promo-sport="${sportId}">${esc(sport.name)}<span class="ui-btn-sub">${sport.roles.map(r => r.name).join(' / ')}</span></button>`;
      }).join('');
      return `
        <div class="ui-modal-backdrop" data-modal-cancel="1">
          <div class="ui-modal" data-modal-stop="1">
            <div class="ui-modal-title">Choose your sport</div>
            <div class="ui-modal-actions">${options}<button class="ui-btn ui-btn-muted" data-promo-cancel="1">Cancel</button></div>
          </div>
        </div>`;
    }
    if (this.promoStep === 'role') {
      const chain = chainById(unit.chainId);
      const sportId = this.promoTier === 't2' ? chain.t2 : (this.promoSport ?? chain.t3[0]);
      const sport = sportById(sportId);
      const options = sport.roles.map(role => `
        <button class="ui-btn" data-promo-role="${role.id}">${esc(role.name)}<span class="ui-btn-sub">${role.designations.join('/')}</span></button>
      `).join('');
      return `
        <div class="ui-modal-backdrop" data-modal-cancel="1">
          <div class="ui-modal" data-modal-stop="1">
            <div class="ui-modal-title">Choose your role — ${esc(sport.name)}</div>
            <div class="ui-modal-actions">${options}<button class="ui-btn ui-btn-muted" data-promo-cancel="1">Cancel</button></div>
          </div>
        </div>`;
    }
    return '';
  }

  equipPickerHTML(unit, slot) {
    this.equipCandidates = state.inventory.filter(i => i.slot === slot);
    const options = this.equipCandidates.length
      ? this.equipCandidates.map((item, idx) => {
          const rlvl = item.reinforceLevel ?? 0;
          const hex = '#' + rarityColor(item.rarity).toString(16).padStart(6, '0');
          const statLine = [
            ...Object.entries(item.stats ?? {}).map(([k, v]) => `+${v} ${k[0].toUpperCase() + k.slice(1)}`),
            ...Object.entries(item.multipliers ?? {}).map(([k, v]) => `+${Math.round(v * 100)}% ${k[0].toUpperCase() + k.slice(1)}`),
          ].join('  ');
          return `
            <button class="ui-btn" data-equip-item="${idx}">
              <span class="ui-equip-option-row">
                ${this.gearIconHTML(item, slot)}
                <span style="color:${hex}">
                  ${esc(item.name)}${rlvl ? ` <span style="color:#ffaa44">✦${rlvl}</span>` : ''}
                  <span class="ui-btn-sub">${esc(statLine)}</span>
                </span>
              </span>
            </button>`;
        }).join('')
      : `<div class="ui-empty-note">No ${esc(SLOT_LABEL[slot] ?? slot)} items in inventory.</div>`;

    return `
      <div class="ui-modal-backdrop" data-modal-cancel="1">
        <div class="ui-modal" data-modal-stop="1">
          <div class="ui-modal-title">Equip ${esc(SLOT_LABEL[slot] ?? slot)}</div>
          <div class="ui-modal-actions">
            ${options}
            <button class="ui-btn ui-btn-muted" data-equip-cancel="1">Cancel</button>
          </div>
        </div>
      </div>`;
  }

  wireEvents() {
    onClick('[data-nav="back"]', () => this.scene.start('WorldMapScene'));
    onClick('[data-nav="inventory"]', () => this.scene.start('InventoryScene'));

    onClick('[data-select]', (e, node) => {
      this.selId = node.dataset.select;
      this.equipSlot = null;
      this.render();
    });

    onClick('[data-nav-loadout]', (e, node) => {
      this.scene.start('LoadoutScene', { unitId: node.dataset.navLoadout });
    });

    onClick('[data-unequip]', (e, node) => {
      e.stopPropagation();
      const unit = state.party.find(u => u.id === this.selId);
      const slot = node.dataset.unequip;
      const item = unit.equip[slot];
      if (item) { state.inventory.push(item); unit.equip[slot] = null; }
      this.render();
    });

    onClick('[data-open-slot]', (e, node) => {
      this.equipSlot = node.dataset.openSlot;
      this.render();
    });

    onClick('[data-equip-item]', (e, node) => {
      const unit = state.party.find(u => u.id === this.selId);
      const item = this.equipCandidates[Number(node.dataset.equipItem)];
      if (item) equipItem(unit, item);
      this.equipSlot = null;
      this.render();
    });

    onClick('[data-equip-cancel]', () => {
      this.equipSlot = null;
      this.render();
    });

    onClick('[data-promo-start]', (e, node) => {
      this.promoTier = node.dataset.promoStart;
      this.promoSport = null;
      this.promoStep = 'prompt';
      this.render();
    });

    onClick('[data-promo-next]', () => {
      const unit = state.party.find(u => u.id === this.selId);
      const branching = this.promoTier === 't3' && t3SportOptions(unit).length > 1;
      this.promoStep = branching ? 'sport' : 'role';
      this.render();
    });

    onClick('[data-promo-sport]', (e, node) => {
      this.promoSport = node.dataset.promoSport;
      this.promoStep = 'role';
      this.render();
    });

    onClick('[data-promo-role]', (e, node) => {
      const unit = state.party.find(u => u.id === this.selId);
      promoteUnit(unit, this.promoTier, node.dataset.promoRole, this.promoSport ?? undefined);
      // Promotion swaps in a new role's sprite sheet, which preload() hasn't
      // loaded yet (it only ran for the pre-promotion role at scene start) —
      // restart so preload/create rerun and the new art actually loads,
      // instead of silently falling back to the color-block placeholder.
      this.scene.restart({ selId: this.selId });
    });

    onClick('[data-promo-cancel]', () => {
      this.promoStep = null;
      this.render();
    });

    onClick('[data-dismiss-start]', (e, node) => {
      this.selId = node.dataset.dismissStart;
      this.confirmDismiss = true;
      this.render();
    });

    onClick('[data-dismiss-confirm]', () => {
      dismissUnit(this.selId);
      this.confirmDismiss = false;
      this.selId = state.party[0]?.id ?? null;
      this.render();
    });

    onClick('[data-dismiss-cancel]', () => {
      this.confirmDismiss = false;
      this.render();
    });

    onClick('[data-modal-cancel]', () => {
      this.promoStep = null;
      this.equipSlot = null;
      this.confirmDismiss = false;
      this.render();
    });
    onClick('[data-modal-stop]', (e) => e.stopPropagation());
  }
}
