import Phaser from 'phaser';
import { loadGame, getSaveSummary, deleteSave, collectAllGear, SAVE_SLOTS } from '../data/gameState.js';
import { drawButton } from '../ui/canvasButton.js';
import { preloadSfx, playSfx, SFX } from '../audio/sound.js';
import { preloadMusic, playMusic } from '../audio/music.js';

export class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  preload() {
    // Loading bar (2026-08-04, "need a loading screen when the game loads")
    // — GameScene is the very first scene, and its preload queue here is
    // the heaviest single load in the whole game (title backdrop + every
    // SFX + all 4 music tracks, several MB each — see [[project_...]]
    // asset-weight audit). Without this the player just stares at a blank
    // dark canvas for however long that download takes. Driven by Phaser's
    // own load 'progress' event (real bytes-loaded progress, not a fake
    // timer), and torn down the instant 'complete' fires — on a later
    // return to this scene (skipCrawl) everything's already cached, so the
    // queue is empty and this resolves instantly with nothing visible.
    const { width, height } = this.scale;
    const cx = width / 2, cy = height / 2;
    const barW = 280, barH = 16;

    const boxBg = this.add.graphics();
    boxBg.fillStyle(0x14142a, 1);
    boxBg.fillRoundedRect(cx - barW / 2 - 3, cy - barH / 2 - 3, barW + 6, barH + 6, 6);
    boxBg.lineStyle(1.5, 0x334477, 1);
    boxBg.strokeRoundedRect(cx - barW / 2 - 3, cy - barH / 2 - 3, barW + 6, barH + 6, 6);

    const bar = this.add.graphics();
    const label = this.add.text(cx, cy - 38, 'LOADING…', {
      fontSize: '13px', fontFamily: 'monospace', fontStyle: 'bold', color: '#8899cc',
    }).setOrigin(0.5);
    const pctText = this.add.text(cx, cy + 32, '0%', {
      fontSize: '11px', fontFamily: 'monospace', color: '#556688',
    }).setOrigin(0.5);

    this.load.on('progress', (value) => {
      bar.clear();
      bar.fillStyle(0x4488ff, 1);
      bar.fillRoundedRect(cx - barW / 2, cy - barH / 2, barW * value, barH, 4);
      pctText.setText(`${Math.round(value * 100)}%`);
    });
    this.load.on('complete', () => {
      boxBg.destroy(); bar.destroy(); label.destroy(); pctText.destroy();
    });

    if (!this.textures.exists('titlebg')) this.load.image('titlebg', 'world/title/titlebg.webp');
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

    const settingsBtn = drawButton(this, {
      x: width - 60, y: 24, w: 100, h: 32, label: '⚙ SETTINGS',
      fontSize: '10px', radius: 6,
      bg: 0x14142a, bgHover: 0x1e1e3a, border: 0x334477, accent: 0xaaaaff,
      textColor: '#8899cc', depth: 50,
      onClick: () => this.scene.start('SettingsScene', { returnScene: 'GameScene', returnData: { skipCrawl: true } }),
    });
    this.titleElements.push(settingsBtn.container);

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
  startCrawl(slot, ngPlusGear = []) {
    this.pendingSlot = slot;
    this.pendingNgPlusGear = ngPlusGear;
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
          this.goToCreation(this.pendingSlot, this.pendingNgPlusGear);
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
  // small "DELETE" control (tap-twice-to-confirm, same arm/confirm pattern
  // the old single NEW GAME button used) that just clears the slot and
  // returns to the title screen showing it empty — 2026-08-04, "we don't
  // have a way to delete a saved game": this control already existed but
  // was labeled "NEW" and force-chained straight into character creation
  // for that slot after deleting, which reads as "start a new game"
  // rather than "delete" — not the same thing, and not what was asked
  // for. Deleting now just deletes; starting fresh is the normal
  // tap-the-empty-slot flow every empty slot already has.
  showSlotPicker(cx, cy) {
    this.armedResetSlot = null;
    this.resetLabels = {};
    this.armedNgPlusSlot = null;
    this.ngPlusLabels = {};

    const rowW = 340, rowH = 64, ngPlusExtraH = 30, gap = 12;
    // Row heights vary per-slot now (a beaten slot grows to fit the New
    // Game+ button strip), so slots are stacked with a running total
    // rather than a fixed rowH + gap step.
    const heights = SAVE_SLOTS.map(slot => getSaveSummary(slot)?.beaten ? rowH + ngPlusExtraH : rowH);
    let y = cy + 20;

    SAVE_SLOTS.forEach((slot, i) => {
      this.drawSlotRow(cx, y, rowW, heights[i], slot);
      y += heights[i] + gap;
    });
  }

  drawSlotRow(cx, y, w, h, slot) {
    const summary = getSaveSummary(slot);
    const occupied = !!summary;
    // Main row content (name/level/Delete/continue) always lives in this
    // fixed-height top band; a beaten slot's extra height (see
    // showSlotPicker) is used below it for the New Game+ strip, so none
    // of that existing layout needs to shift.
    const topH = 64;

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
        g.fillRoundedRect(cx - w / 2, y, 4, topH, 2);
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
      this.titleElements.push(this.add.text(cx - w / 2 + 14, y + topH / 2 - 7, '— empty —', {
        fontSize: '13px', fontFamily: 'monospace', color: '#556688',
      }));
      this.titleElements.push(this.add.text(cx - w / 2 + 14, y + topH / 2 + 9, 'tap to start a new game', {
        fontSize: '9px', fontFamily: 'monospace', color: '#445566',
      }));
    }

    // Reset control (occupied slots only) — sits in its own small zone on
    // the right so it doesn't fight the row's main continue/start action.
    const resetW = 64;
    const mainW  = occupied ? w - resetW : w;
    const mainCx = occupied ? cx - resetW / 2 : cx;
    const zone = this.add.zone(mainCx, y + topH / 2, mainW, topH).setInteractive({ useHandCursor: true });
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
      const resetLabel = this.add.text(rx, y + topH / 2, 'DELETE', {
        fontSize: '10px', fontFamily: 'monospace', fontStyle: 'bold', color: '#885555',
      }).setOrigin(0.5);
      this.resetLabels[slot] = resetLabel;
      this.titleElements.push(resetLabel);

      const rz = this.add.zone(rx, y + topH / 2, resetW - 8, topH).setInteractive({ useHandCursor: true });
      rz.on('pointerover', () => resetLabel.setColor('#ff6666'));
      rz.on('pointerout',  () => resetLabel.setColor(this.armedResetSlot === slot ? '#ff6666' : '#885555'));
      rz.on('pointerdown', (pointer, lx, ly, event) => {
        event?.stopPropagation();
        playSfx(this, SFX.click);
        if (this.armedResetSlot === slot) {
          deleteSave(slot);
          this.scene.start('GameScene', { skipCrawl: true });
        } else {
          if (this.armedResetSlot != null) this.resetLabels[this.armedResetSlot]?.setText('DELETE').setColor('#885555');
          this.armedResetSlot = slot;
          resetLabel.setText('CONFIRM?').setColor('#ff6666');
        }
      });
      this.titleElements.push(rz);
    }

    // New Game+ (2026-08-13) — only once this slot has actually beaten the
    // game (see getSaveSummary's `beaten` flag, keyed off FT completion).
    // Same tap-twice arm/confirm pattern as DELETE, since it overwrites
    // this slot's completed save. Carries every piece of gear this save
    // ever owned into the fresh run's inventory (collectAllGear) and
    // resets progress/levels the same as any other new game — see
    // newGame()'s carryOverGear param and CharacterCreationScene's
    // ngPlusGear threading.
    if (summary?.beaten) {
      const stripCy = y + topH + (h - topH) / 2;
      const ngLabel = this.add.text(cx, stripCy - 7, '✦ NEW GAME+', {
        fontSize: '11px', fontFamily: 'monospace', fontStyle: 'bold', color: '#ffc72c',
      }).setOrigin(0.5);
      const ngSub = this.add.text(cx, stripCy + 8, 'carry over all gear · levels reset to 1', {
        fontSize: '8px', fontFamily: 'monospace', color: '#a68a3a',
      }).setOrigin(0.5);
      this.ngPlusLabels[slot] = { main: ngLabel, sub: ngSub };
      this.titleElements.push(ngLabel, ngSub);

      const nz = this.add.zone(cx, stripCy, w - 12, h - topH - 4).setInteractive({ useHandCursor: true });
      const setArmed = (armed) => {
        ngLabel.setText(armed ? 'TAP AGAIN TO CONFIRM' : '✦ NEW GAME+').setColor(armed ? '#ffe08a' : '#ffc72c');
        ngSub.setText(armed ? 'this overwrites the save above' : 'carry over all gear · levels reset to 1');
      };
      nz.on('pointerover', () => ngLabel.setColor('#ffe08a'));
      nz.on('pointerout',  () => ngLabel.setColor(this.armedNgPlusSlot === slot ? '#ffe08a' : '#ffc72c'));
      nz.on('pointerdown', (pointer, lx, ly, event) => {
        event?.stopPropagation();
        playSfx(this, SFX.click);
        if (this.armedNgPlusSlot === slot) {
          this.startCrawl(slot, collectAllGear(slot));
        } else {
          if (this.armedNgPlusSlot != null) {
            const prev = this.ngPlusLabels[this.armedNgPlusSlot];
            prev?.main.setText('✦ NEW GAME+').setColor('#ffc72c');
            prev?.sub.setText('carry over all gear · levels reset to 1').setColor('#a68a3a');
          }
          this.armedNgPlusSlot = slot;
          setArmed(true);
        }
      });
      this.titleElements.push(nz);
    }
  }

  goToMap() {
    this.phase = 'done';
    this.cameras.main.fadeOut(600, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('WorldMapScene'));
  }

  goToCreation(slot, ngPlusGear = []) {
    this.phase = 'done';
    this.cameras.main.fadeOut(600, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('CharacterCreationScene', { slot, ngPlusGear }));
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