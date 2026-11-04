import Phaser from 'phaser';
import { state, maxBattlePartySize, roleDisplayLabel, currentRoleId, currentDesignations, ELEMENT_BEATS, elementIcon, DESIGNATION_BEATS, DESIGNATION_NAMES, designationIcon } from '../data/gameState.js';
import { loadHeroSprites, stripHeroBackground, heroKey, firstFrame, spriteKeyForRole } from '../data/heroSprites.js';
import { mount, unmount, onClick, spriteFrameDataURL, esc } from '../ui/domUI.js';
import { BACKDROPS } from '../data/storyBackdrops.js';
import { NODES } from './WorldMapScene.js';
import { battleHintsOn } from '../data/battleHints.js';
import { remindersFor } from '../ui/loadoutReminder.js';

// A hero this far below the toughest enemy gets a warning on the Pre-Battle screen.
const LOW_LEVEL_GAP = 5;

// This screen can come up before ANY mission in any of the 3 kingdoms (it's
// a roster-cap gate, not a story beat — see the class comment below), so
// there's no single "correct" region photo the way a mission-specific
// StoryScene/HubScene backdrop has. castle2.png is reused here as the same
// kind of region-agnostic "just needs SOME backdrop" fallback ShopScene's
// own _drawFantasyBg already leans on for its generic shops (2026-07-04
// Shop reskin) — same image, so no extra asset load either.
const BG_URL = '/' + BACKDROPS.capital.path;

const RARITY_LABEL = { common: 'Common', uncommon: 'Uncommon', rare: 'Rare', epic: 'Epic', legendary: 'Legendary' };

// Shown before every battle. BattleScene redirects here at the top of its
// create() with the enemies it already rolled, so the player sees the exact
// units they'll fight. Confirming writes the chosen ids to
// state.battlePartyIds and hands those units back to BattleScene.
export class PreBattleScene extends Phaser.Scene {
  constructor() { super({ key: 'PreBattleScene' }); }

  init(data) {
    this.battleData = data?.battleData ?? {};
    this.rules = data?.rules ?? [];
    this.cap = maxBattlePartySize(state);
    this.showHints = battleHintsOn(this.battleData.difficulty);
    // Default to whoever's first in roster order, so confirming immediately
    // reproduces the old no-picker behavior.
    this.selectedIds = (data?.selectedIds ?? state.party.slice(0, this.cap).map(u => u.id))
      .filter(id => state.party.some(u => u.id === id));
  }

  preload() {
    const classNames = state.party.map(u => spriteKeyForRole(currentRoleId(u))).filter(Boolean);
    loadHeroSprites(this, classNames);
  }

  create() {
    state.party.forEach(u => {
      const cn = spriteKeyForRole(currentRoleId(u));
      if (cn) stripHeroBackground(this, cn);
    });
    this.render();
    this.events.once('shutdown', unmount);
  }

  portraitURL(unit) {
    const spriteKey = spriteKeyForRole(currentRoleId(unit));
    if (!spriteKey) return null;
    return spriteFrameDataURL(this, heroKey(spriteKey), firstFrame(spriteKey));
  }

  // Party-list style card (2026-11-03): the matchup squeezed into a few marks
  // beside the checkbox — element icon, ▲/▼ enemy counts (element and type
  // together), and ⚠ when the hero is under-levelled or has something to equip.
  tagsHTML(unit) {
    const enemies = this.battleData.enemyUnits ?? [];
    const mine = currentDesignations(unit);
    const beats = (a, b) => a.some(d => b.includes(DESIGNATION_BEATS[d]));
    let strong = 0, weak = 0;
    for (const e of enemies) {
      if (e.element && (e.alwaysWeak || ELEMENT_BEATS[unit.element] === e.element)) strong++;
      if (e.element && ELEMENT_BEATS[e.element] === unit.element) weak++;
      const ed = e.designations ?? [];
      if (beats(mine, ed) && !beats(ed, mine)) strong++;
      if (beats(ed, mine) && !beats(mine, ed)) weak++;
    }
    const top = Math.max(0, ...enemies.filter(e => !e.oneShotKill).map(e => e.level));
    const gap = top - unit.level;
    const warn = gap >= LOW_LEVEL_GAP ? `⚠ -${gap} Lv` : remindersFor(unit).length ? '⚠' : '';
    return `
      <div class="ui-pb-tags">
        <span>${elementIcon(unit.element)}${mine.map(d => designationIcon(d)).join('')}</span>
        ${this.showHints && strong ? `<span class="good">▲${strong}</span>` : ''}
        ${this.showHints && weak ? `<span class="bad">▼${weak}</span>` : ''}
        ${this.showHints && warn ? `<span class="warn">${warn}</span>` : ''}
      </div>`;
  }

  cardHTML(unit) {
    const selected = this.selectedIds.includes(unit.id);
    const url = this.portraitURL(unit);
    return `
      <div class="ui-card ${selected ? 'active' : ''}" data-toggle="${unit.id}">
        ${url ? `<img class="ui-portrait-thumb" src="${url}" alt="">` : `<div class="ui-portrait-thumb" style="background:${'#' + unit.color.toString(16).padStart(6, '0')}"></div>`}
        <div class="ui-card-body">
          <div class="ui-card-name">${esc(unit.name.split(' ')[0])}</div>
          <div class="ui-card-sub">Lv.${unit.level} &nbsp;${esc(roleDisplayLabel(unit))}</div>
        </div>
        ${this.tagsHTML(unit)}
        <div class="ui-badge">${selected ? '✅' : '⬜'}</div>
      </div>
    `;
  }

  // M7's scripted loss hides its level rather than showing a number.
  enemyHTML(enemy) {
    const unknown = enemy.oneShotKill;
    const gear = Object.values(enemy.equip ?? {}).find(Boolean)?.rarity;
    const weakTo = Object.keys(ELEMENT_BEATS).find(el => ELEMENT_BEATS[el] === enemy.element);
    const weakDesig = Object.keys(DESIGNATION_BEATS).find(d => enemy.designations?.includes(DESIGNATION_BEATS[d]));
    const url = enemy.heroClass
      ? spriteFrameDataURL(this, heroKey(enemy.heroClass), firstFrame(enemy.heroClass))
      : spriteFrameDataURL(this, enemy.spriteKey, 0);
    return `
      <div class="ui-card ui-pb-enemy">
        ${url ? `<img class="ui-portrait-thumb" src="${url}" alt="">` : '<div class="ui-portrait-thumb"></div>'}
        <div class="ui-card-body">
          <div class="ui-card-name">${esc(enemy.name)}</div>
          <div class="ui-card-sub">Lv.${unknown ? '???' : enemy.level}${enemy.element ? ` &middot; ${elementIcon(enemy.element)} ${esc(enemy.element)}` : ''}${!this.showHints ? '' : enemy.alwaysWeak ? ' &middot; <span class="ui-pb-good">Weak to all</span>' : weakTo ? ` &middot; <span class="ui-pb-good">Weak to ${elementIcon(weakTo)} ${esc(weakTo)}${weakDesig ? `, ${designationIcon(weakDesig)} ${esc(DESIGNATION_NAMES[weakDesig])}` : ''}</span>` : ''}</div>
          ${gear ? `<div class="ui-pb-stats"><span class="ui-pb-stat">${RARITY_LABEL[gear] ?? esc(gear)} gear</span></div>` : ''}
        </div>
      </div>
    `;
  }

  render() {
    const listHTML = state.party.map(u => this.cardHTML(u)).join('');
    const enemiesHTML = (this.battleData.enemyUnits ?? []).map(e => this.enemyHTML(e)).join('');
    const full = this.selectedIds.length >= this.cap;
    const missionId = state.currentMission ?? 'M1';
    const title = NODES.find(n => n.id === missionId)?.name ?? 'Battle';

    mount(`
      <div class="ui-screen ui-prebattle" style="background:
          radial-gradient(ellipse at top, rgba(60,50,90,0.35), transparent 60%),
          linear-gradient(rgba(8,8,15,0.55), rgba(8,8,15,0.8)),
          url('${BG_URL}') center/cover;">
        <div class="ui-topbar">
          <button class="ui-navbtn" data-nav="back">◀ Cancel</button>
          <div class="ui-title">${esc(title)}</div>
          <button class="ui-navbtn" data-nav="party">Manage Team</button>
        </div>
        <div class="ui-body ui-pb-body">
          <div class="ui-panel ui-list-panel">
            <div class="ui-pb-head">Your team &middot; ${this.selectedIds.length} / ${this.cap}${full ? ' (max)' : ''}</div>
            ${this.showHints ? '<div class="ui-pb-tip">▲ deals extra damage to that many enemies, ▼ takes extra</div>' : ''}
            ${listHTML}
          </div>
          <div class="ui-panel ui-list-panel">
            <div class="ui-pb-head">Enemies &middot; ${this.battleData.enemyUnits?.length ?? 0}</div>
            ${this.rules.map(r => `<div class="ui-pb-rule">${esc(r)}</div>`).join('')}
            ${enemiesHTML}
          </div>
        </div>
        <div class="ui-pb-foot">
          <button class="ui-btn ui-btn-primary" style="width:min(200px, 90vw);" ${this.selectedIds.length ? '' : 'disabled'} data-confirm="1">
            Start Battle
          </button>
        </div>
      </div>
    `);

    // A replay of these two already counted itself when it was tapped.
    onClick('[data-nav="back"]', () => {
      if ((missionId === 'M0a' || missionId === 'M0b') && state.completedMissions.includes(missionId)) {
        state.repeatCounts[missionId] = Math.max(0, (state.repeatCounts[missionId] ?? 0) - 1);
      }
      this.scene.start('WorldMapScene');
    });

    onClick('[data-nav="party"]', () => this.scene.start('PartyScene', {
      returnTo: {
        scene: 'PreBattleScene', label: 'Pre-Battle',
        data: { battleData: this.battleData, rules: this.rules, selectedIds: this.selectedIds },
      },
    }));

    onClick('[data-toggle]', (e, node) => {
      const id = node.dataset.toggle;
      if (this.selectedIds.includes(id)) {
        this.selectedIds = this.selectedIds.filter(x => x !== id);
      } else if (this.selectedIds.length < this.cap) {
        this.selectedIds = [...this.selectedIds, id];
      }
      this.render();
    });

    onClick('[data-confirm]', () => {
      if (!this.selectedIds.length) return;
      state.battlePartyIds = [...this.selectedIds];
      this.scene.start('BattleScene', this.battleData);
    });
  }
}
