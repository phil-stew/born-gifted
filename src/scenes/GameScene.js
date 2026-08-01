import Phaser from 'phaser';
import { loadGame, getSaveSummary, deleteSave, SAVE_SLOTS } from '../data/gameState.js';
import { drawButton } from '../ui/canvasButton.js';
import { preloadSfx, playSfx, SFX } from '../audio/sound.js';
import { preloadMusic, playMusic } from '../audio/music.js';

export class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  preload() {
    if (!this.textures.exists('titlebg')) this.load.image('titlebg', 'world/title/titlebg.png');
    preloadSfx(this);
    preloadMusic(this);
  }

  init(data) {
    this.skipCrawl = data?.skipCrawl ?? false;
  }

  create() {
    const { width, height } = this.scale;
    const cx = width / 2;
    const cy = height / 2;

    this.lineIndex = 0;
    // 'splash' (dev credit) -> 'title' -> 'crawl' (only entered via New Game) -> 'done'.
    // splash only plays on a true cold boot, never when returning here from the world map.
    this.phase = this.skipCrawl ? 'title' : 'splash';
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

    playMusic(this, 'title');

    // Title-phase visuals — collected so startCrawl() can clear them all at
    // once when the player picks New Game (crawl now plays after the title,
    // not before it).
    this.titleElements = [];

    // Title background photo + dark scrim — hidden until showTitle() fades
    // them in (stays plain black during the splash, on purpose).
    this.titleBg = this.add.image(cx, cy, 'titlebg').setAlpha(0);
    const bgScale = Math.max(width / this.titleBg.width, height / this.titleBg.height);
    this.titleBg.setScale(bgScale);
    this.titleScrim = this.add.rectangle(cx, cy, width, height, 0x05050a, 0.6).setAlpha(0);
    this.titleElements.push(this.titleBg, this.titleScrim);

    // Dev splash — plays once on a true cold boot, never on skipCrawl (that's
    // the "return to title from world map" path, not a fresh launch).
    this.splashText = this.add.text(cx, cy, 'New Dev By Philly Stew Presents', {
      fontSize: '15px',
      fontFamily: 'monospace',
      color: '#888899',
      align: 'center',
    }).setOrigin(0.5).setAlpha(0);

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
    this.titleText = this.add.text(cx, cy - 90, 'FANTASY SPORTS TACTICS', {
      fontSize: '40px',
      fontFamily: 'Georgia, serif',
      fontStyle: 'bold',
      color: '#ffffff',
      align: 'center',
      shadow: { offsetX: 0, offsetY: 2, color: '#000000', blur: 18, fill: true },
    }).setOrigin(0.5).setAlpha(0);

    this.subtitleText = this.add.text(cx, cy - 46, 'A  T A C T I C A L  R P G', {
      fontSize: '12px',
      fontFamily: 'monospace',
      color: '#aabbdd',
    }).setOrigin(0.5).setAlpha(0);

    this.titleElements.push(this.titleText, this.subtitleText);

    this.input.on('pointerdown', () => this.handleTap());
    this.input.keyboard?.on('keydown', () => this.handleTap());

    // Fullscreen API request, on a real user gesture — progressive
    // enhancement only. iOS Safari doesn't support requestFullscreen() on
    // arbitrary DOM elements at all (that's what Add to Home Screen +
    // manifest.json/apple-mobile-web-app-capable in index.html are for
    // instead), so this button just doesn't render there. Mainly helps
    // Android Chrome / desktop players who'd rather not install the PWA.
    if (document.fullscreenEnabled) {
      const fsBtn = drawButton(this, {
        x: width - 60, y: 24, w: 100, h: 32, label: '⛶ FULLSCREEN',
        fontSize: '10px', radius: 6,
        bg: 0x14142a, bgHover: 0x1e1e3a, border: 0x334477, accent: 0xaaaaff,
        textColor: '#8899cc', depth: 50,
        onClick: () => {
          if (document.fullscreenElement) document.exitFullscreen();
          else document.documentElement.requestFullscreen().catch(() => {});
        },
      });
      this.titleElements.push(fsBtn.container);
    }

    if (this.skipCrawl) {
      this.crawlText.setAlpha(0);
      this.tapHint.setAlpha(0);
      this.showTitle();
    } else {
      this.showSplash();
    }
  }

  showSplash() {
    this.canAdvance = false;
    this.tweens.add({
      targets: this.splashText,
      alpha: 1,
      duration: 700,
      ease: 'Power1',
      onComplete: () => {
        this.canAdvance = true;
        this.autoTimer = this.time.delayedCall(1800, () => this.advanceSplash());
      },
    });
  }

  advanceSplash() {
    if (!this.canAdvance) return;
    this.canAdvance = false;
    this.autoTimer?.destroy();
    this.tweens.add({
      targets: this.splashText,
      alpha: 0,
      duration: 500,
      ease: 'Power1',
      onComplete: () => this.showTitle(),
    });
  }

  // Crawl now plays after New Game is chosen (not before the title screen).
  // Clears the title-screen visuals, then runs the same line-by-line crawl
  // before handing off to CharacterCreationScene.
  startCrawl(slot) {
    this.pendingSlot = slot;
    this.cameras.main.fadeOut(400, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.titleElements.forEach(o => o.destroy());
      this.titleElements = [];
      this.phase = 'crawl';
      this.lineIndex = 0;
      this.cameras.main.fadeIn(300, 0, 0, 0);
      this.showLine();
    });
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
          this.goToCreation(this.pendingSlot);
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
      this.titleBg.setAlpha(1);
      this.titleScrim.setAlpha(1);
      this.titleText.setAlpha(1);
      this.subtitleText.setAlpha(1);
      this.showSlotPicker(cx, cy);
      return;
    }

    this.tweens.add({ targets: this.titleBg,      alpha: 1, duration: 1500, ease: 'Power1' });
    this.tweens.add({ targets: this.titleScrim,   alpha: 1, duration: 1500, ease: 'Power1' });
    this.tweens.add({ targets: this.titleText,    alpha: 1, duration: 1200, delay: 300,  ease: 'Power2' });
    this.tweens.add({ targets: this.subtitleText, alpha: 1, duration: 800,  delay: 900,  ease: 'Power1' });

    this.time.delayedCall(1600, () => this.showSlotPicker(cx, cy));
  }

  // Three independent save slots — each row loads/continues if occupied, or
  // starts a new game in that slot if empty. An occupied slot also gets a
  // small "NEW" reset control (tap-twice-to-confirm, same pattern the old
  // single NEW GAME button used) to wipe just that slot and start over.
  showSlotPicker(cx, cy) {
    this.armedResetSlot = null;
    this.resetLabels = {};

    const rowW = 340, rowH = 64, gap = 12;
    let y = cy + 20;

    for (const slot of SAVE_SLOTS) {
      this.drawSlotRow(cx, y, rowW, rowH, slot);
      y += rowH + gap;
    }
  }

  drawSlotRow(cx, y, w, h, slot) {
    const summary = getSaveSummary(slot);
    const occupied = !!summary;

    const shadow = this.add.graphics();
    shadow.fillStyle(0x000000, 0.3);
    shadow.fillRoundedRect(cx - w / 2 + 2, y + 3, w, h, 8);
    this.titleElements.push(shadow);

    const g = this.add.graphics();
    const drawBg = (hover) => {
      g.clear();
      g.fillStyle(hover ? (occupied ? 0x0e1e10 : 0x14142a) : (occupied ? 0x09150b : 0x0e0e20), 1);
      g.fillRoundedRect(cx - w / 2, y, w, h, 8);
      g.lineStyle(2, hover ? (occupied ? 0x44cc66 : 0x4488ff) : (occupied ? 0x226633 : 0x334477), 1);
      g.strokeRoundedRect(cx - w / 2, y, w, h, 8);
      if (hover) {
        g.fillStyle(occupied ? 0x44cc66 : 0x4488ff, 0.9);
        g.fillRoundedRect(cx - w / 2, y, 4, h, 2);
      }
    };
    drawBg(false);
    this.titleElements.push(g);

    const slotLabel = this.add.text(cx - w / 2 + 14, y + 8, `SLOT ${slot}`, {
      fontSize: '9px', fontFamily: 'monospace', color: '#556688',
    });
    this.titleElements.push(slotLabel);

    if (occupied) {
      const savedStr = summary.savedAt ? new Date(summary.savedAt).toLocaleDateString() : '';
      this.titleElements.push(this.add.text(cx - w / 2 + 14, y + 22, summary.leadName, {
        fontSize: '14px', fontFamily: 'monospace', fontStyle: 'bold', color: '#dddddd',
      }));
      this.titleElements.push(this.add.text(cx - w / 2 + 14, y + 42, `Lv.${summary.level}  ·  ${summary.missionsCompleted}/15 missions  ·  ${savedStr}`, {
        fontSize: '10px', fontFamily: 'monospace', color: '#667788',
      }));
    } else {
      this.titleElements.push(this.add.text(cx - w / 2 + 14, y + h / 2 - 7, '— empty —', {
        fontSize: '13px', fontFamily: 'monospace', color: '#556688',
      }));
      this.titleElements.push(this.add.text(cx - w / 2 + 14, y + h / 2 + 9, 'tap to start a new game', {
        fontSize: '9px', fontFamily: 'monospace', color: '#445566',
      }));
    }

    // Reset control (occupied slots only) — sits in its own small zone on
    // the right so it doesn't fight the row's main continue/start action.
    const resetW = 64;
    const mainW  = occupied ? w - resetW : w;
    const mainCx = occupied ? cx - resetW / 2 : cx;
    const zone = this.add.zone(mainCx, y + h / 2, mainW, h).setInteractive({ useHandCursor: true });
    zone.on('pointerover', () => drawBg(true));
    zone.on('pointerout',  () => drawBg(false));
    zone.on('pointerdown', () => {
      playSfx(this, SFX.click);
      if (occupied) { loadGame(slot); this.goToMap(); }
      else { this.startCrawl(slot); }
    });
    this.titleElements.push(zone);

    if (occupied) {
      const rx = cx + w / 2 - resetW / 2 - 6;
      const resetLabel = this.add.text(rx, y + h / 2, 'NEW', {
        fontSize: '10px', fontFamily: 'monospace', fontStyle: 'bold', color: '#885555',
      }).setOrigin(0.5);
      this.resetLabels[slot] = resetLabel;
      this.titleElements.push(resetLabel);

      const rz = this.add.zone(rx, y + h / 2, resetW - 8, h).setInteractive({ useHandCursor: true });
      rz.on('pointerover', () => resetLabel.setColor('#ff6666'));
      rz.on('pointerout',  () => resetLabel.setColor(this.armedResetSlot === slot ? '#ff6666' : '#885555'));
      rz.on('pointerdown', (pointer, lx, ly, event) => {
        event?.stopPropagation();
        playSfx(this, SFX.click);
        if (this.armedResetSlot === slot) {
          deleteSave(slot);
          this.startCrawl(slot);
        } else {
          if (this.armedResetSlot != null) this.resetLabels[this.armedResetSlot]?.setText('NEW').setColor('#885555');
          this.armedResetSlot = slot;
          resetLabel.setText('CONFIRM?').setColor('#ff6666');
        }
      });
      this.titleElements.push(rz);
    }
  }

  goToMap() {
    this.phase = 'done';
    this.cameras.main.fadeOut(600, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('WorldMapScene'));
  }

  goToCreation(slot) {
    this.phase = 'done';
    this.cameras.main.fadeOut(600, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('CharacterCreationScene', { slot }));
  }

  handleTap() {
    if (this.phase === 'splash') {
      this.advanceSplash();
    } else if (this.phase === 'crawl') {
      this.advance();
    }
    // 'title' phase has no generic tap action — each slot row handles its own tap.
  }
}