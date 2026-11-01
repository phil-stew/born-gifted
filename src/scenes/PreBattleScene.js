import Phaser from 'phaser';
import { state, maxBattlePartySize, maxHp, roleDisplayLabel, currentRoleId, currentDesignations, ELEMENT_BEATS, elementIcon, DESIGNATION_BEATS, DESIGNATION_NAMES, designationIcon } from '../data/gameState.js';
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

  // How this hero's element lines up against this fight's enemies. Matches
  // elementMultiplier in BattleScene: +50% vs an enemy it beats, and that
  // works both ways, so an enemy that beats the hero hits it +50% too.
  matchupHTML(unit) {
    const enemies = (this.battleData.enemyUnits ?? []).filter(e => e.element);
    const strong = enemies.filter(e => e.alwaysWeak || ELEMENT_BEATS[unit.element] === e.element).length;
    const weak = enemies.filter(e => ELEMENT_BEATS[e.element] === unit.element).length;
    return `
      <div class="ui-pb-matchup">
        <span>${elementIcon(unit.element)} ${esc(unit.element ?? '')}</span>
        ${strong && this.showHints ? `<span class="good">▲${strong}</span>` : ''}
        ${weak && this.showHints ? `<span class="bad">▼${weak}</span>` : ''}
        ${this.showHints ? this.designationHTML(unit) : ''}
      </div>
      ${this.showHints ? this.warningHTML(unit) : ''}`;
  }

  // Same triangle as designationMultiplier in BattleScene. A unit that both
  // beats and loses to an enemy cancels out to neutral there, so neither counts.
  designationHTML(unit) {
    const mine = currentDesignations(unit);
    const beats = (a, b) => a.some(d => b.includes(DESIGNATION_BEATS[d]));
    const enemies = (this.battleData.enemyUnits ?? []).map(e => e.designations ?? []);
    const strong = enemies.filter(e => beats(mine, e) && !beats(e, mine)).length;
    const weak = enemies.filter(e => beats(e, mine) && !beats(mine, e)).length;
    return `
      <span>${mine.map(d => `${designationIcon(d)} ${esc(DESIGNATION_NAMES[d] ?? d)}`).join(' ')}</span>
      ${strong ? `<span class="good">▲${strong}</span>` : ''}
      ${weak ? `<span class="bad">▼${weak}</span>` : ''}`;
  }

  warningHTML(unit) {
    const top = Math.max(0, ...(this.battleData.enemyUnits ?? []).filter(e => !e.oneShotKill).map(e => e.level));
    const text = top - unit.level >= LOW_LEVEL_GAP
      ? `${top - unit.level} levels below the enemies`
      : remindersFor(unit)[0]?.text;
    return text ? `<div class="ui-pb-warn">⚠ ${esc(text)}</div>` : '';
  }

  cardHTML(unit) {
    const selected = this.selectedIds.includes(unit.id);
    const url = this.portraitURL(unit);
    return `
      <div class="ui-card ${selected ? 'active' : ''}" data-toggle="${unit.id}">
        ${url ? `<img class="ui-portrait-thumb" src="${url}" alt="">` : `<div class="ui-portrait-thumb" style="background:${'#' + unit.color.toString(16).padStart(6, '0')}"></div>`}
        <div class="ui-card-body">
          <div class="ui-card-name">${esc(unit.name.split(' ')[0])}</div>
          <div class="ui-card-sub">Lv.${unit.level} &nbsp;${esc(roleDisplayLabel(unit))} &nbsp;&middot;&nbsp; HP ${maxHp(unit)}</div>
          ${this.matchupHTML(unit)}
        </div>
        <div class="ui-badge">${selected ? '✅' : '⬜'}</div>
      </div>
    `;
  }

  // M7's scripted loss hides its absurd numbers rather than showing 999999.
  enemyHTML(enemy) {
    const unknown = enemy.oneShotKill;
    const stat = (label, value) => `<span class="ui-pb-stat">${label} <b>${unknown ? '???' : value}</b></span>`;
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
          <div class="ui-pb-stats">
            ${stat('HP', enemy.maxHp)}${stat('STR', enemy.strength)}${stat('SPD', enemy.speed)}${stat('END', enemy.endurance)}${gear ? `<span class="ui-pb-stat">${RARITY_LABEL[gear] ?? esc(gear)} gear</span>` : ''}
          </div>
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
