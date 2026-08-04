import Phaser from 'phaser';
import { state, maxBattlePartySize, maxHp, roleDisplayLabel, currentRoleId } from '../data/gameState.js';
import { loadHeroSprites, stripHeroBackground, heroKey, firstFrame, spriteKeyForRole } from '../data/heroSprites.js';
import { mount, unmount, onClick, spriteFrameDataURL, esc } from '../ui/domUI.js';
import { BACKDROPS } from '../data/storyBackdrops.js';

// This screen can come up before ANY mission in any of the 3 kingdoms (it's
// a roster-cap gate, not a story beat — see the class comment below), so
// there's no single "correct" region photo the way a mission-specific
// StoryScene/HubScene backdrop has. castle2.png is reused here as the same
// kind of region-agnostic "just needs SOME backdrop" fallback ShopScene's
// own _drawFantasyBg already leans on for its generic shops (2026-07-04
// Shop reskin) — same image, so no extra asset load either.
const BG_URL = '/' + BACKDROPS.capital.path;

// Roster-bigger-than-battle-cap picker (2026-07-08 feedback) — BattleScene
// redirects here itself (see the gate at the top of its create()) whenever
// state.party.length exceeds maxBattlePartySize(state) and no pick has been
// made yet for this fight. Confirming writes the chosen ids to
// state.battlePartyIds and hands back into BattleScene with the same data
// it was originally started with.
export class BattlePartySelectScene extends Phaser.Scene {
  constructor() { super({ key: 'BattlePartySelectScene' }); }

  init(data) {
    this.battleData = data?.battleData ?? {};
    this.cap = maxBattlePartySize(state);
    // Default to whoever's first in roster order, same as the old
    // no-picker behavior, so confirming immediately reproduces it.
    this.selectedIds = state.party.slice(0, this.cap).map(u => u.id);
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

  cardHTML(unit) {
    const selected = this.selectedIds.includes(unit.id);
    const url = this.portraitURL(unit);
    return `
      <div class="ui-card ${selected ? 'active' : ''}" data-toggle="${unit.id}">
        ${url ? `<img class="ui-portrait-thumb" src="${url}" alt="">` : `<div class="ui-portrait-thumb" style="background:${'#' + unit.color.toString(16).padStart(6, '0')}"></div>`}
        <div class="ui-card-body">
          <div class="ui-card-name">${esc(unit.name.split(' ')[0])}</div>
          <div class="ui-card-sub">Lv.${unit.level} &nbsp;${esc(roleDisplayLabel(unit))} &nbsp;&middot;&nbsp; HP ${maxHp(unit)}</div>
        </div>
        <div class="ui-badge">${selected ? '✅' : '⬜'}</div>
      </div>
    `;
  }

  render() {
    const listHTML = state.party.map(u => this.cardHTML(u)).join('');
    const full = this.selectedIds.length >= this.cap;

    mount(`
      <div class="ui-screen" style="background:
          radial-gradient(ellipse at top, rgba(60,50,90,0.35), transparent 60%),
          linear-gradient(rgba(8,8,15,0.55), rgba(8,8,15,0.8)),
          url('${BG_URL}') center/cover;">
        <div class="ui-topbar">
          <button class="ui-navbtn" data-nav="back">◀ Cancel</button>
          <div class="ui-title">CHOOSE YOUR BATTLE PARTY</div>
          <div style="width:110px"></div>
        </div>
        <div class="ui-body" style="justify-content:center;">
          <div class="ui-panel ui-list-panel" style="max-width:480px;">
            <div class="ui-card-sub" style="padding:4px 8px 10px;">
              ${this.selectedIds.length} / ${this.cap} selected${full ? ' — max reached' : ''}
            </div>
            ${listHTML}
          </div>
        </div>
        <div style="display:flex; justify-content:center; padding:16px;">
          <button class="ui-btn ui-btn-primary" style="width:min(320px, 90vw);" ${this.selectedIds.length ? '' : 'disabled'} data-confirm="1">
            Start Battle (${this.selectedIds.length})
          </button>
        </div>
      </div>
    `);

    onClick('[data-nav="back"]', () => this.scene.start('WorldMapScene'));

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
