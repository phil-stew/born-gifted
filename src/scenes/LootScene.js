import Phaser from 'phaser';
import { rarityColor } from '../data/items.js';
import { drawButton } from '../ui/canvasButton.js';

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
    this.nextScene      = data.nextScene      ?? 'WorldMapScene';
    this.nextSceneData  = data.nextSceneData  ?? {};
  }

  create() {
    const { width, height } = this.scale;

    const bg = this.add.graphics();
    bg.fillStyle(0x0a0a18, 1);
    bg.fillRect(0, 0, width, height);
    bg.fillStyle(0xddaa00, 1);
    bg.fillRect(width * 0.15, 70, width * 0.7, 2);
    bg.fillRect(width * 0.15, height - 70, width * 0.7, 2);

    this.add.text(width / 2, 34, 'LOOT', {
      fontSize: '32px', fontFamily: 'Georgia, serif', fontStyle: 'bold',
      color: '#ffdd44', stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5);

    const gridTop = 110, gridBottom = height - 90;
    const cols = this.allDrops.length <= 2 ? Math.max(1, this.allDrops.length) : 3;
    const rowH = 56;
    const rows = Math.ceil(this.allDrops.length / cols);
    const gridH = rows * rowH;
    // Start lower (rather than always at gridTop) so a short haul doesn't
    // look stranded at the top of a mostly-empty screen — centered within
    // the available band when it fits, top-anchored (scrolling isn't worth
    // building here) once it doesn't.
    const startY = Math.max(gridTop, gridTop + (gridBottom - gridTop - gridH) / 2);

    const colW = (width * 0.8) / cols;
    const gridLeft = width / 2 - (colW * cols) / 2 + colW / 2;

    if (this.allDrops.length === 0) {
      this.add.text(width / 2, height / 2, 'No loot this time.', {
        fontSize: '15px', fontFamily: 'monospace', color: '#556677',
      }).setOrigin(0.5);
    }

    this.allDrops.forEach(({ item, count }, i) => {
      const isMat = item.type === 'material';
      const rarityHex = isMat ? 0xaacc88 : rarityColor(item.rarity);
      const col = '#' + rarityHex.toString(16).padStart(6, '0');
      const tag  = isMat ? 'Material' : item.rarity.charAt(0).toUpperCase() + item.rarity.slice(1);
      const label = count > 1 ? `${item.name}  ×${count}` : item.name;
      const gx = gridLeft + (i % cols) * colW;
      const gy = startY + Math.floor(i / cols) * rowH;

      // Rarity-bordered card behind each drop, same rounded-card language
      // (dark translucent fill + colored stroke) used for menu cards
      // elsewhere — previously this was bare text with no boundary between
      // adjacent drops.
      const cardW = colW - 14, cardH = rowH - 10;
      const cardX = gx - cardW / 2, cardY = gy - cardH / 2 + 6;
      const card = this.add.graphics();
      card.fillStyle(0x14142a, 0.55);
      card.fillRoundedRect(cardX, cardY, cardW, cardH, 8);
      card.lineStyle(1.5, rarityHex, 0.85);
      card.strokeRoundedRect(cardX, cardY, cardW, cardH, 8);

      this.add.text(gx, gy, label, {
        fontSize: '18px', fontFamily: 'monospace', fontStyle: 'bold', color: col,
        wordWrap: { width: colW - 24 }, align: 'center',
      }).setOrigin(0.5);
      this.add.text(gx, gy + 22, tag, {
        fontSize: '10px', fontFamily: 'monospace', color: '#556677',
      }).setOrigin(0.5);
    });

    drawButton(this, {
      x: width / 2, y: height - 30, w: 200, h: 40, label: 'CONTINUE  ▶',
      fontSize: '16px', bg: 0x224422, bgHover: 0x2e582e, border: 0x44aa44, accent: 0xffff88,
      textColor: '#ffffff', textHoverColor: '#ffff88',
      onClick: () => this.scene.start(this.nextScene, this.nextSceneData),
    });
  }
}
