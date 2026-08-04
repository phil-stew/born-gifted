import Phaser from 'phaser';
import { stripHeroBackground } from '../data/heroSprites.js';
import { state } from '../data/gameState.js';

// Generic dialogue scene. Receives { lines, nextScene, nextSceneData, backdrop } via init().
// Each line: { speaker, text, color? }
// backdrop: optional texture key + path, e.g. { key: 'bd-village', path: 'world/Altroesartscene/village.webp' }

export class StoryScene extends Phaser.Scene {
  constructor() { super({ key: 'StoryScene' }); }

  preload() {
    if (this.backdrop && !this.textures.exists(this.backdrop.key)) {
      this.load.image(this.backdrop.key, this.backdrop.path);
    }
  }

  init(data) {
    // Protagonist name substitution (2026-08-04, "let the player pick the
    // name of the protagonist") — all story content was written hardcoded
    // to 'Reno', both as a speaker label AND inline within other
    // characters' dialogue text ("Reno, what's the date?"). Rather than
    // editing every one of those lines across every scene, every line
    // passes through here (StoryScene is the single rendering choke point
    // for all dialogue), so substituting once here covers all of them —
    // including nested nextScene:'StoryScene' cutscene chains, since each
    // hop re-runs init(). Falls back to 'Reno' if the protagonist unit
    // (id:'reno') isn't in the active party for some reason (e.g.
    // dismissed via PartyScene) so old saves/edge cases never show 'undefined'.
    const protagonist = state.party?.find(u => u.id === 'reno');
    this.renoName = protagonist ? protagonist.name.split(' ')[0] : 'Reno';
    const sub = (s) => typeof s === 'string' ? s.replace(/\bReno\b/g, this.renoName) : s;

    this.lines         = (data.lines ?? []).map(line => ({ ...line, speaker: sub(line.speaker), text: sub(line.text) }));
    this.nextScene     = data.nextScene     ?? 'WorldMapScene';
    this.nextSceneData = data.nextSceneData ?? {};
    this.location      = sub(data.location ?? 'SIRBLANC  ·  Reno\'s Home');
    this.backdrop      = data.backdrop      ?? null;
    this.lineIndex     = 0;
  }

  create() {
    const { width, height } = this.scale;
    const artH = height * 0.6;

    // Background
    const bg = this.add.graphics();
    bg.fillStyle(0x07070f, 1);
    bg.fillRect(0, 0, width, height);

    // Faint scene illustration area (top 60%)
    bg.fillStyle(0x0d1020, 1);
    bg.fillRect(0, 0, width, artH);

    if (this.backdrop && this.textures.exists(this.backdrop.key)) {
      const img = this.add.image(width / 2, artH / 2, this.backdrop.key);
      const scale = Math.max(width / img.width, artH / img.height);
      img.setScale(scale);
      const mask = this.add.graphics();
      mask.fillRect(0, 0, width, artH);
      img.setMask(mask.createGeometryMask());
      this.add.rectangle(width / 2, artH / 2, width, artH, 0x05050a, 0.28);
    } else {
      // Simple house silhouette (fallback when no backdrop supplied)
      this.drawScene(bg, width, height);
    }

    // Location label
    this.add.text(width / 2, 18, this.location, {
      fontSize: '11px', fontFamily: 'monospace', color: '#ffcc66',
    }).setOrigin(0.5).setDepth(10);

    // Dialogue box
    const boxY = height * 0.62;
    const boxH = height - boxY - 8;
    const boxGfx = this.add.graphics();
    boxGfx.fillStyle(0x0a0a1a, 0.96);
    boxGfx.fillRect(10, boxY, width - 20, boxH);
    boxGfx.lineStyle(1, 0x333355, 1);
    boxGfx.strokeRect(10, boxY, width - 20, boxH);

    // Dialogue log — each line stays on screen with the next added below it
    // (rather than replacing the previous line). Once the box fills, the
    // oldest entry is dropped and the rest reflow upward — a Container mask
    // was tried first but Phaser 4 doesn't clip a GeometryMask correctly on a
    // container that's also being tweened, so this avoids masking entirely.
    this.logBottomPad = 22; // leaves room for the ▶ hint at the box's bottom-right
    this.logWidth   = width - 56;
    this.logVisibleH = boxH - 12 - this.logBottomPad;
    this.logCon = this.add.container(28, boxY + 12);
    this.logEntries = []; // { speakerT, bodyT, h }

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

    const speakerT = this.add.text(0, 0, speaker, {
      fontSize: '13px', fontFamily: 'monospace', fontStyle: 'bold', color: color ?? '#ffffff',
    }).setAlpha(0);
    const bodyT = this.add.text(0, 16, text, {
      fontSize: '13px', fontFamily: 'Georgia, serif', color: '#ccccdd',
      wordWrap: { width: this.logWidth },
    }).setAlpha(0);
    this.logCon.add([speakerT, bodyT]);
    this.tweens.add({ targets: [speakerT, bodyT], alpha: 1, duration: 180 });

    const h = 16 + bodyT.height + 14;
    this.logEntries.push({ speakerT, bodyT, h });

    // Drop the oldest entries once they no longer fit, then reflow the rest
    let total = this.logEntries.reduce((sum, e) => sum + e.h, 0);
    while (total > this.logVisibleH && this.logEntries.length > 1) {
      const old = this.logEntries.shift();
      old.speakerT.destroy();
      old.bodyT.destroy();
      total -= old.h;
    }
    let y = 0;
    for (const e of this.logEntries) {
      this.tweens.add({ targets: e.speakerT, y, duration: 220, ease: 'Power1' });
      this.tweens.add({ targets: e.bodyT, y: y + 16, duration: 220, ease: 'Power1' });
      y += e.h;
    }

    if (this.renoPortrait) {
      const targetAlpha = speaker === this.renoName ? 1 : 0.25;
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
