import Phaser from 'phaser';
import { state, currentRoleId, roleDisplayLabel, sportById } from '../data/gameState.js';
import { loadHeroSprites, stripHeroBackground, createHeroAnims, heroKey, firstFrame, spriteKeyForRole, getSpriteInfo } from '../data/heroSprites.js';
import { playSfx, SFX } from '../audio/sound.js';

// Full-screen showcase right after a promotion (2026-11-11, "have the
// promoted hero take over the screen with a few actions: walk, the 2 attack
// motions"). Walks in, plays the two attack rows, then idles until tapped.
export class PromotionScene extends Phaser.Scene {
  constructor() { super({ key: 'PromotionScene' }); }

  init(data) {
    this.unit = state.party.find(u => u.id === data?.unitId) ?? state.party[0];
    this.returnData = data?.returnData ?? {};
    this.className = spriteKeyForRole(currentRoleId(this.unit));
  }

  preload() {
    if (this.className) loadHeroSprites(this, [this.className]);
  }

  create() {
    const { width, height } = this.scale;
    const unit = this.unit;
    const sport = sportById(unit.t3Sport ?? unit.t2Sport ?? unit.t1Sport);

    this.add.rectangle(0, 0, width, height, 0x07080f).setOrigin(0);
    const glow = this.add.circle(width / 2, height * 0.56, Math.min(width, height) * 0.34, 0xe8b04a, 0.16);
    this.tweens.add({ targets: glow, scale: 1.12, alpha: 0.26, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    this.add.text(width / 2, height * 0.1, 'PROMOTED!', {
      fontFamily: 'Georgia, serif', fontSize: '34px', color: '#ffd57a', stroke: '#000', strokeThickness: 5,
    }).setOrigin(0.5);
    this.add.text(width / 2, height * 0.1 + 38, `${unit.name.split(' ')[0]} is now ${sport?.name ?? ''} ${roleDisplayLabel(unit)}`.replace(/\s+/g, ' '), {
      fontFamily: 'Georgia, serif', fontSize: '18px', color: '#f6ecd8', stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5);
    const hint = this.add.text(width / 2, height - 22, 'Tap to continue', {
      fontFamily: 'Georgia, serif', fontSize: '14px', color: '#c8b994',
    }).setOrigin(0.5).setAlpha(0);

    playSfx(this, SFX.craft);
    this.input.once('pointerdown', () => this.done());

    if (!this.className) { hint.setAlpha(1); return; }
    stripHeroBackground(this, this.className);
    createHeroAnims(this, this.className);
    const key = heroKey(this.className);
    const info = getSpriteInfo(this.className);
    const scale = Math.min(width, height) * 0.62 / info.fh;
    const floorY = height * 0.62;
    const hero = this.add.sprite(-info.fw * scale / 2, floorY, key, firstFrame(this.className)).setScale(scale);

    const has = (name) => (this.anims.get(`${key}-${name}`)?.frames.length ?? 0) > 0;
    const play = (name) => new Promise(resolve => {
      if (!has(name)) { resolve(); return; }
      hero.play(`${key}-${name}`);
      hero.once('animationcomplete', resolve);
    });
    const walkIn = () => new Promise(resolve => {
      if (!info.noMoveAnim && has('run')) hero.play(`${key}-run`);
      this.tweens.add({ targets: hero, x: width / 2, duration: 1600, ease: 'Sine.easeOut', onComplete: resolve });
    });
    const pause = (ms) => new Promise(resolve => this.time.delayedCall(ms, resolve));

    (async () => {
      await walkIn();
      hero.play(`${key}-idle`);
      await pause(400);
      await play('attack2');
      await pause(300);
      await play('attack');
      if (!this.sys.isActive()) return;
      hero.play(`${key}-idle`);
      this.tweens.add({ targets: hint, alpha: 1, duration: 400 });
    })();
  }

  done() {
    this.scene.start('PartyScene', this.returnData);
  }
}
