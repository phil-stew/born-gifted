import Phaser from 'phaser';
import { hasSave, loadGame } from '../data/gameState.js';

export class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  init(data) {
    this.skipCrawl = data?.skipCrawl ?? false;
  }

  create() {
    const { width, height } = this.scale;
    const cx = width / 2;
    const cy = height / 2;

    this.lineIndex = 0;
    this.phase = this.skipCrawl ? 'title' : 'crawl'; // 'crawl' | 'title' | 'done'
    this.canAdvance = false;
    this.autoTimer = null;

    this.lines = [
      'In this world...',
      'Every child is born with a Gift.',
      'A supernatural ability tied to sport.',
      'It determines who you are.',
      'Who you will become.',
      'Three kingdoms fight for world dominance.',
      'Every five years — the Grand Tournament.',
      'The winner rules the world.',
      'You are Gifted.',
      'You are from Altroes.',
      'Your destiny awaits.',
    ];

    this.add.rectangle(cx, cy, width, height, 0x000000);

    // Crawl line
    this.crawlText = this.add.text(cx, cy - 16, '', {
      fontSize: '22px',
      fontFamily: 'Georgia, serif',
      fontStyle: 'italic',
      color: '#ffffff',
      align: 'center',
      wordWrap: { width: width - 120 },
    }).setOrigin(0.5).setAlpha(0);

    // Tap hint
    this.tapHint = this.add.text(cx, height - 52, 'tap to continue', {
      fontSize: '11px',
      fontFamily: 'monospace',
      color: '#444444',
    }).setOrigin(0.5).setAlpha(0);

    // Title — hidden until crawl finishes
    this.titleText = this.add.text(cx, cy - 70, 'BORN GIFTED', {
      fontSize: '58px',
      fontFamily: 'Georgia, serif',
      fontStyle: 'bold',
      color: '#ffffff',
      shadow: { offsetX: 0, offsetY: 0, color: '#4488ff', blur: 24, fill: true },
    }).setOrigin(0.5).setAlpha(0);

    this.subtitleText = this.add.text(cx, cy - 10, 'A  T A C T I C A L  R P G', {
      fontSize: '12px',
      fontFamily: 'monospace',
      color: '#6688bb',
    }).setOrigin(0.5).setAlpha(0);

    this.promptText = this.add.text(cx, cy + 70, 'TAP  TO  BEGIN', {
      fontSize: '13px',
      fontFamily: 'monospace',
      color: '#ffffff',
    }).setOrigin(0.5).setAlpha(0);

    this.input.on('pointerdown', () => this.handleTap());
    this.input.keyboard?.on('keydown', () => this.handleTap());

    if (this.skipCrawl) {
      this.crawlText.setAlpha(0);
      this.tapHint.setAlpha(0);
      this.showTitle();
    } else {
      this.showLine();
    }
  }

  showLine() {
    this.canAdvance = false;
    this.crawlText.setText(this.lines[this.lineIndex]).setAlpha(0);

    this.tweens.add({
      targets: this.crawlText,
      alpha: 1,
      duration: 700,
      ease: 'Power1',
      onComplete: () => {
        this.tweens.add({ targets: this.tapHint, alpha: 1, duration: 400 });
        this.canAdvance = true;
        // Auto-advance after 3.5s
        this.autoTimer = this.time.delayedCall(3500, () => this.advance());
      },
    });
  }

  advance() {
    if (!this.canAdvance) return;
    this.canAdvance = false;
    this.autoTimer?.destroy();

    this.tweens.add({
      targets: [this.crawlText, this.tapHint],
      alpha: 0,
      duration: 350,
      ease: 'Power1',
      onComplete: () => {
        this.lineIndex++;
        if (this.lineIndex < this.lines.length) {
          this.showLine();
        } else {
          this.showTitle();
        }
      },
    });
  }

  showTitle() {
    this.phase = 'title';
    const { width, height } = this.scale;
    const cx = width / 2, cy = height / 2;

    if (this.skipCrawl) {
      // Returning to the home screen should feel instant, not replay the fade-in
      this.titleText.setAlpha(1);
      this.subtitleText.setAlpha(1);
      if (hasSave()) {
        this.showSaveButtons(cx, cy);
      } else {
        this.promptText.setAlpha(1);
        this.tweens.add({ targets: this.promptText, alpha: 0.15, duration: 850, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        this.canAdvance = true;
      }
      return;
    }

    this.tweens.add({ targets: this.titleText,    alpha: 1, duration: 1200, delay: 300,  ease: 'Power2' });
    this.tweens.add({ targets: this.subtitleText, alpha: 1, duration: 800,  delay: 900,  ease: 'Power1' });

    this.time.delayedCall(1600, () => {
      if (hasSave()) {
        this.showSaveButtons(cx, cy);
      } else {
        this.tweens.add({
          targets: this.promptText, alpha: 1, duration: 500, ease: 'Power1',
          onComplete: () => {
            this.tweens.add({ targets: this.promptText, alpha: 0.15, duration: 850, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
            this.canAdvance = true;
          },
        });
      }
    });
  }

  showSaveButtons(cx, cy) {
    const btnW = 200, btnH = 46, gap = 16;
    const by   = cy + 60;

    // CONTINUE
    const cg = this.add.graphics();
    const drawC = (h) => {
      cg.clear();
      cg.fillStyle(h ? 0x0e1e10 : 0x09150b, 1);
      cg.fillRect(cx - btnW / 2, by, btnW, btnH);
      cg.lineStyle(2, h ? 0x44cc66 : 0x226633, 1);
      cg.strokeRect(cx - btnW / 2, by, btnW, btnH);
    };
    drawC(false);
    this.add.text(cx, by + btnH / 2, 'CONTINUE', {
      fontSize: '15px', fontFamily: 'monospace', fontStyle: 'bold', color: '#44cc66',
    }).setOrigin(0.5);
    const cz = this.add.zone(cx, by + btnH / 2, btnW, btnH).setInteractive({ useHandCursor: true });
    cz.on('pointerover',  () => drawC(true));
    cz.on('pointerout',   () => drawC(false));
    cz.on('pointerdown',  () => { loadGame(); this.goToMap(); });

    // NEW GAME
    const by2 = by + btnH + gap;
    const ng   = this.add.graphics();
    const drawN = (h) => {
      ng.clear();
      ng.fillStyle(h ? 0x1a0e0e : 0x110808, 1);
      ng.fillRect(cx - btnW / 2, by2, btnW, btnH);
      ng.lineStyle(1, h ? 0xaa4444 : 0x552222, 1);
      ng.strokeRect(cx - btnW / 2, by2, btnW, btnH);
    };
    drawN(false);
    this.newGameLabel = this.add.text(cx, by2 + btnH / 2, 'NEW GAME', {
      fontSize: '13px', fontFamily: 'monospace', color: '#885555',
    }).setOrigin(0.5);
    const nz = this.add.zone(cx, by2 + btnH / 2, btnW, btnH).setInteractive({ useHandCursor: true });
    nz.on('pointerover',  () => drawN(true));
    nz.on('pointerout',   () => drawN(false));
    nz.on('pointerdown',  () => {
      if (this.confirmingNew) {
        this.goToCreation();
      } else {
        this.confirmingNew = true;
        this.newGameLabel.setText('CONFIRM? (tap again)').setColor('#ff6666');
      }
    });
  }

  goToMap() {
    this.phase = 'done';
    this.cameras.main.fadeOut(600, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('WorldMapScene'));
  }

  goToCreation() {
    this.phase = 'done';
    this.cameras.main.fadeOut(600, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('CharacterCreationScene'));
  }

  handleTap() {
    if (this.phase === 'crawl') {
      this.advance();
    } else if (this.phase === 'title' && this.canAdvance) {
      // Only auto-advance via tap when there is no save — otherwise let the buttons handle it
      if (!hasSave()) {
        this.goToCreation();
      }
    }
  }
}