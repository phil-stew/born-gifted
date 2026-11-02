import Phaser from 'phaser';
import { rarityColor } from '../data/items.js';
import { STACK_CAP } from '../data/gameState.js';
import { mount, unmount, onClick, esc } from '../ui/domUI.js';

// Split out of VictoryScene (2026-07-08 feedback: a big haul routinely ran
// past the level-up notice/Continue button, which sit at fixed
// height-anchored positions there, so the loot grid ended up covered and
// unreadable). This scene owns a full screen for the loot list instead of
// sharing space with the XP bars/level-up notice — VictoryScene now hands
// off here (if there was any loot) before continuing on to LevelUpScene/the
// next scene, same chain-of-scenes shape RecruitClassScene's queue and the
// cutscene handoff already use.
export class LootScene extends Phaser.Scene {
  constructor() { super({ key: 'LootScene' }); }

  init(data) {
    this.allDrops      = data.allDrops      ?? [];
    this.soldT          = data.soldT          ?? 0;
    this.nextScene      = data.nextScene      ?? 'WorldMapScene';
    this.nextSceneData  = data.nextSceneData  ?? {};
  }

  create() {
    const cardsHTML = this.allDrops.map(({ item, count }) => {
      const isMat = item.type === 'material';
      const color = '#' + (isMat ? 0xaacc88 : rarityColor(item.rarity)).toString(16).padStart(6, '0');
      const tag = isMat ? 'Material' : item.rarity.charAt(0).toUpperCase() + item.rarity.slice(1);
      return `
        <div class="ui-quest-card" style="border-color:${color}">
          <div class="ui-quest-name" style="color:${color}">${esc(item.name)}${count > 1 ? ` ×${count}` : ''}</div>
          <div class="ui-quest-text">${tag}</div>
        </div>`;
    }).join('');

    mount(`
      <div class="ui-screen ui-loot">
        <div class="ui-topbar ui-topbar-center"><div class="ui-title ui-title-gold">Loot</div></div>
        <div class="ui-quest-list" data-scroll-id="loot">
          ${cardsHTML || '<div class="ui-empty-note">No loot this time.</div>'}
        </div>
        ${this.soldT ? `<div class="ui-empty-note">Full stacks (${STACK_CAP}): extras sold for ${this.soldT} T</div>` : ''}
        <div class="ui-footer"><button class="ui-action-btn" data-continue="1">Continue ▶</button></div>
      </div>
    `);
    onClick('[data-continue]', () => this.scene.start(this.nextScene, this.nextSceneData));
    this.events.once('shutdown', unmount);
  }
}
