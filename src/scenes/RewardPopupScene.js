import Phaser from 'phaser';
import { rarityColor } from '../data/items.js';
import { drawButton } from '../ui/canvasButton.js';

// Generic "you got rewards" overlay — launched with scene.launch() ON TOP of
// whatever hub/map scene is currently active (WorldMapScene, HubScene, ...)
// rather than replacing it, so closing the popup just reveals that scene
// again with no restart needed. This is the one reusable component behind
// every "pop up screen with Rewards + Button" moment in the M0-M4 redesign
// (M0/M1 turn-in, M3a/M3b turn-ins, handbook grant, etc.) — see Phase 2 of
// the redesign plan.
//
// This scene does not grant anything itself — callers push currency/items
// into state BEFORE launching this, then pass what they granted as `lines`
// purely for display (same responsibility split VictoryScene already uses
// for its own loot list).
export class RewardPopupScene extends Phaser.Scene {
  constructor() { super({ key: 'RewardPopupScene' }); }

  init(data) {
    this.title    = data.title ?? 'REWARDS';
    this.lines    = data.lines ?? []; // [{ label, amount?, rarity?, tytrate? }]
    this.onClose  = data.onClose ?? null;
  }

  create() {
    const { width, height } = this.scale;

    const dim = this.add.graphics().setDepth(0);
    dim.fillStyle(0x000000, 0.6);
    dim.fillRect(0, 0, width, height);

    const PW = 300, PH = Math.min(360, 130 + this.lines.length * 34);
    const px = (width - PW) / 2, py = (height - PH) / 2;

    const shadow = this.add.graphics().setDepth(1);
    shadow.fillStyle(0x000000, 0.35);
    shadow.fillRoundedRect(px + 3, py + 5, PW, PH, 10);

    const panel = this.add.graphics().setDepth(1);
    panel.fillStyle(0x0c0c1e, 1);
    panel.fillRoundedRect(px, py, PW, PH, 10);
    panel.lineStyle(1.5, 0x886644, 1);
    panel.strokeRoundedRect(px, py, PW, PH, 10);
    panel.fillStyle(0xffdd88, 0.6);
    panel.fillRoundedRect(px, py, PW, 3, { tl: 10, tr: 10, bl: 0, br: 0 });

    this.add.text(px + PW / 2, py + 26, this.title.toUpperCase(), {
      fontSize: '18px', fontFamily: 'Georgia, serif', fontStyle: 'bold',
      color: '#ffdd44', stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(2);

    let ly = py + 62;
    for (const line of this.lines) {
      const col = line.rarity ? '#' + rarityColor(line.rarity).toString(16).padStart(6, '0')
        : line.currency ? '#ddcc44' : '#ccddaa';
      const label = line.currency ? `+${line.amount}  ${line.label}`
        : line.amount > 1 ? `${line.label}  ×${line.amount}` : line.label;
      this.add.text(px + PW / 2, ly, label, {
        fontSize: '14px', fontFamily: 'monospace', fontStyle: 'bold', color: col,
      }).setOrigin(0.5).setDepth(2);
      ly += 34;
    }

    drawButton(this, {
      x: px + PW / 2, y: py + PH - 30, w: 160, h: 38, label: 'CONTINUE',
      fontSize: '14px', depth: 2,
      bg: 0x223344, bgHover: 0x2e4458, border: 0x4477aa, accent: 0xffff88,
      textColor: '#ffffff', textHoverColor: '#ffff88',
      onClick: () => {
        this.scene.stop();
        this.onClose?.();
      },
    });
  }
}
