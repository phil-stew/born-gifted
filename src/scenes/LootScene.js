import Phaser from 'phaser';
import { rarityColor, gearItemFrame, materialFrameName, ICON_SHEET_STRIP, registerGearFrames, MATERIAL_ICON_FRAME } from '../data/items.js';
import { stripBackgroundByKey } from '../data/heroSprites.js';
import { STACK_CAP } from '../data/gameState.js';
import { mount, unmount, onClick, iconDataURL, esc } from '../ui/domUI.js';

const LOOT_ICON_SIZE = 40;

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

  preload() {
    if (!this.textures.exists('gears'))     this.load.image('gears',     'gears/gearitems.png');
    if (!this.textures.exists('materials')) this.load.image('materials', 'items/rawmaterials.png');
  }

  // Same icon sheets as the Inventory screen.
  registerIcons() {
    stripBackgroundByKey(this, 'gears',     ICON_SHEET_STRIP);
    stripBackgroundByKey(this, 'materials', ICON_SHEET_STRIP);
    registerGearFrames(this);
    if (this.textures.exists('materials')) {
      const tex = this.textures.get('materials');
      for (const [id, [x, y, w, h]] of Object.entries(MATERIAL_ICON_FRAME)) {
        const name = `material_${id}`;
        if (!tex.has(name)) tex.add(name, 0, x, y, w, h);
      }
    }
  }

  iconHTML(item) {
    const [key, frame] = item.type === 'material' ? ['materials', materialFrameName(item.id)]
      : item.slot ? ['gears', gearItemFrame(item)] : [null, null];
    const ok = frame && this.textures.exists(key) && this.textures.get(key).has(frame);
    const url = ok ? iconDataURL(this, key, frame, LOOT_ICON_SIZE) : null;
    return url ? `<img class="ui-loot-icon" src="${url}" alt="">` : '<span class="ui-loot-icon">✦</span>';
  }

  create() {
    this.registerIcons();
    const cardsHTML = this.allDrops.map(({ item, count }) => {
      const isMat = item.type === 'material';
      const color = '#' + (isMat ? 0xaacc88 : rarityColor(item.rarity)).toString(16).padStart(6, '0');
      const tag = isMat ? 'Material' : item.rarity.charAt(0).toUpperCase() + item.rarity.slice(1);
      return `
        <div class="ui-quest-card ui-loot-card" style="border-color:${color}">
          ${this.iconHTML(item)}
          <div>
            <div class="ui-quest-name" style="color:${color}">${esc(item.name)}${count > 1 ? ` ×${count}` : ''}</div>
            <div class="ui-quest-text">${tag}</div>
          </div>
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
