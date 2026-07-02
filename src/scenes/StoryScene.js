import Phaser from 'phaser';
import { stripHeroBackground } from '../data/heroSprites.js';

// Generic dialogue scene. Receives { lines, nextScene, nextSceneData } via init().
// Each line: { speaker, text, color? }

export class StoryScene extends Phaser.Scene {
  constructor() { super({ key: 'StoryScene' }); }

  preload() {
    // sprites loaded in BattleScene — StoryScene needs no hero assets
  }

  init(data) {
    this.lines         = data.lines         ?? [];
    this.nextScene     = data.nextScene     ?? 'WorldMapScene';
    this.nextSceneData = data.nextSceneData ?? {};
    this.location      = data.location      ?? 'SIRBLANC  ·  Reno\'s Home';
    this.lineIndex     = 0;
  }

  create() {
    const { width, height } = this.scale;

    // Background
    const bg = this.add.graphics();
    bg.fillStyle(0x07070f, 1);
    bg.fillRect(0, 0, width, height);

    // Faint scene illustration area (top 60%)
    bg.fillStyle(0x0d1020, 1);
    bg.fillRect(0, 0, width, height * 0.6);

    // Location label
    this.add.text(width / 2, 18, this.location, {
      fontSize: '11px', fontFamily: 'monospace', color: '#ffcc66',
    }).setOrigin(0.5);

    // Simple house silhouette
    this.drawScene(bg, width, height);

    // Dialogue box
    const boxY = height * 0.62;
    const boxH = height - boxY - 8;
    const boxGfx = this.add.graphics();
    boxGfx.fillStyle(0x0a0a1a, 0.96);
    boxGfx.fillRect(10, boxY, width - 20, boxH);
    boxGfx.lineStyle(1, 0x333355, 1);
    boxGfx.strokeRect(10, boxY, width - 20, boxH);

    // Speaker name
    this.speakerText = this.add.text(28, boxY + 12, '', {
      fontSize: '13px', fontFamily: 'monospace', fontStyle: 'bold', color: '#ffffff',
    });

    // Dialogue text
    this.dialogueText = this.add.text(28, boxY + 34, '', {
      fontSize: '13px', fontFamily: 'Georgia, serif', color: '#ccccdd',
      wordWrap: { width: width - 60 },
    });

    // Advance hint
    this.hintText = this.add.text(width - 24, height - 18, '▶', {
      fontSize: '14px', fontFamily: 'monospace', color: '#555577',
    }).setOrigin(1, 1);

    this.tweens.add({
      targets: this.hintText, alpha: 0.2, duration: 600,
      yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });

    // Character portrait (shown when Reno speaks)
    if (this.textures.exists('hero-Striker')) {
      stripHeroBackground(this, 'Striker');
      this.renoPortrait = this.add.image(width - 80, height * 0.45, 'hero-Striker', 1)
        .setDisplaySize(110, 110)
        .setAlpha(0);
    }

    this.showLine();

    // Tap anywhere or press key to advance
    this.input.on('pointerdown', () => this.advance());
    this.input.keyboard?.on('keydown-SPACE', () => this.advance());
    this.input.keyboard?.on('keydown-ENTER', () => this.advance());
  }

  drawScene(gfx, width, height) {
    const h = height * 0.6;
    // Ground
    gfx.fillStyle(0x1a1a0a, 1);
    gfx.fillRect(0, h - 40, width, 40);
    // House body
    gfx.fillStyle(0x2a1f14, 1);
    gfx.fillRect(width * 0.3, h - 180, 240, 140);
    // Roof
    gfx.fillStyle(0x1a120c, 1);
    gfx.fillTriangle(width * 0.3 - 20, h - 180, width * 0.3 + 120, h - 260, width * 0.3 + 260, h - 180);
    // Door
    gfx.fillStyle(0x140e08, 1);
    gfx.fillRect(width * 0.3 + 100, h - 80, 40, 80);
    // Windows
    gfx.fillStyle(0x443322, 1);
    gfx.fillRect(width * 0.3 + 20,  h - 140, 40, 36);
    gfx.fillRect(width * 0.3 + 180, h - 140, 40, 36);
    // Warm window glow
    gfx.fillStyle(0xffaa44, 0.18);
    gfx.fillRect(width * 0.3 + 20,  h - 140, 40, 36);
    gfx.fillRect(width * 0.3 + 180, h - 140, 40, 36);
  }

  showLine() {
    if (this.lineIndex >= this.lines.length) {
      this.finish();
      return;
    }
    const { speaker, text, color } = this.lines[this.lineIndex];
    this.speakerText.setText(speaker).setColor(color ?? '#ffffff');
    this.dialogueText.setText(text).setAlpha(0);
    this.tweens.add({ targets: this.dialogueText, alpha: 1, duration: 180 });

    if (this.renoPortrait) {
      const targetAlpha = speaker === 'Reno' ? 1 : 0.25;
      this.tweens.add({ targets: this.renoPortrait, alpha: targetAlpha, duration: 250 });
    }
  }

  advance() {
    this.lineIndex++;
    if (this.lineIndex >= this.lines.length) {
      this.finish();
    } else {
      this.showLine();
    }
  }

  finish() {
    this.cameras.main.fadeOut(500, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start(this.nextScene, this.nextSceneData);
    });
  }
}
