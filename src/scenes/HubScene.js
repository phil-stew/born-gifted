import Phaser from 'phaser';
import { state } from '../data/gameState.js';

export class HubScene extends Phaser.Scene {
  constructor() { super({ key: 'HubScene' }); }

  init(data) {
    this.hubType = data.type    ?? 'town';
    this.hubName = data.name    ?? 'Town';
    this.shopId  = data.shopId  ?? 'generic';
  }

  get hubData() {
    return { type: this.hubType, name: this.hubName, shopId: this.shopId };
  }

  create() {
    const { width, height } = this.scale;

    const bg = this.add.graphics();
    bg.fillStyle(0x07080f, 1);
    bg.fillRect(0, 0, width, height);
    bg.fillStyle(this.hubType === 'academy' ? 0x0a0c18 : 0x080e08, 1);
    bg.fillRect(0, 0, width, height * 0.58);

    this.drawIllustration(bg, width, height);

    this.add.text(width / 2, 20, this.hubName.toUpperCase(), {
      fontSize: '20px', fontFamily: 'monospace', fontStyle: 'bold',
      color: this.hubType === 'academy' ? '#aaaaff' : '#ffcc66',
    }).setOrigin(0.5);

    this.add.text(width / 2, 46, this.hubType === 'academy' ? '— Academy City —' : '— Town —', {
      fontSize: '11px', fontFamily: 'monospace', color: '#555566',
    }).setOrigin(0.5);

    this.drawButtons(width, height);
    this.cameras.main.fadeIn(350, 0, 0, 0);
  }

  drawIllustration(gfx, width, height) {
    const h = height * 0.58;
    const ground = h - 30;

    gfx.fillStyle(0x151508, 1);
    gfx.fillRect(0, ground, width, 30);

    if (this.hubType === 'academy') {
      // Central tower
      gfx.fillStyle(0x10141e, 1);
      gfx.fillRect(width * 0.38, ground - 210, 180, 210);
      gfx.fillStyle(0x0a0e18, 1);
      gfx.fillTriangle(width * 0.38 - 14, ground - 210, width * 0.38 + 90, ground - 275, width * 0.38 + 194, ground - 210);
      // Side buildings
      gfx.fillStyle(0x0e1218, 1);
      gfx.fillRect(width * 0.18, ground - 140, 120, 140);
      gfx.fillRect(width * 0.62, ground - 130, 130, 130);
      // Windows — tower
      for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 3; c++) {
          gfx.fillStyle(0x2244aa, 0.4);
          gfx.fillRect(width * 0.38 + 18 + c * 52, ground - 195 + r * 48, 32, 26);
        }
      }
      // Forge glow (right building)
      gfx.fillStyle(0xff7722, 0.08);
      gfx.fillRect(width * 0.62, ground - 130, 130, 130);
      gfx.fillStyle(0xff9900, 0.18);
      gfx.fillRect(width * 0.66, ground - 90, 50, 60);
    } else {
      // Main house
      gfx.fillStyle(0x2a1f14, 1);
      gfx.fillRect(width * 0.32, ground - 165, 220, 135);
      gfx.fillStyle(0x1a120c, 1);
      gfx.fillTriangle(width * 0.32 - 18, ground - 165, width * 0.32 + 110, ground - 244, width * 0.32 + 238, ground - 165);
      gfx.fillStyle(0x140e08, 1);
      gfx.fillRect(width * 0.32 + 90, ground - 72, 38, 72);
      gfx.fillStyle(0xffaa44, 0.2);
      gfx.fillRect(width * 0.32 + 16, ground - 124, 40, 34);
      gfx.fillRect(width * 0.32 + 164, ground - 124, 40, 34);
      // Shop building left
      gfx.fillStyle(0x1c120c, 1);
      gfx.fillRect(width * 0.08, ground - 108, 128, 108);
      gfx.fillStyle(0x130b07, 1);
      gfx.fillRect(width * 0.06, ground - 116, 140, 14);
      gfx.fillStyle(0x22cc55, 0.25);
      gfx.fillRect(width * 0.1, ground - 88, 40, 34);
      // Sign
      gfx.fillStyle(0x664422, 1);
      gfx.fillRect(width * 0.1 + 14, ground - 120, 12, 12);
      gfx.fillStyle(0xddaa44, 0.8);
      gfx.fillRect(width * 0.06, ground - 134, 60, 18);
    }
  }

  drawButtons(width, height) {
    const forgeUnlocked = state.completedMissions.includes('M3');
    const services = this.hubType === 'academy'
      ? [
          { key: 'Shop',  icon: '🛒', desc: 'Buy & sell items',      locked: false },
          { key: 'Forge', icon: '⚒',  desc: forgeUnlocked ? 'Reinforce equipment' : 'Complete M3 to unlock', locked: !forgeUnlocked },
          { key: 'Leave', icon: '◀',  desc: 'Return to world map',   locked: false },
        ]
      : [
          { key: 'Shop',  icon: '🛒', desc: 'Buy & sell items',      locked: false },
          { key: 'Leave', icon: '◀',  desc: 'Return to world map',   locked: false },
        ];

    const btnW = 210, btnH = 60, gap = 20;
    const totalW = services.length * (btnW + gap) - gap;
    let bx = (width - totalW) / 2;
    const by = height * 0.64;

    const COLORS = {
      Shop:  { idle: 0x0b180d, hover: 0x112215, border: 0x1e6630, text: '#44bb66' },
      Forge: { idle: 0x190d06, hover: 0x251408, border: 0x7a3c15, text: '#cc7733' },
      Leave: { idle: 0x0c0c1a, hover: 0x111130, border: 0x223366, text: '#5577bb' },
    };

    for (const svc of services) {
      const c = COLORS[svc.key];
      const locked = svc.locked ?? false;
      const gfx = this.add.graphics();
      const draw = (hover) => {
        gfx.clear();
        gfx.fillStyle(locked ? 0x0a0a0a : (hover ? c.hover : c.idle), 1);
        gfx.fillRect(bx, by, btnW, btnH);
        gfx.lineStyle(1, locked ? 0x222222 : c.border, 1);
        gfx.strokeRect(bx, by, btnW, btnH);
      };
      draw(false);

      this.add.text(bx + btnW / 2, by + 14, locked ? `🔒  ${svc.key.toUpperCase()}` : `${svc.icon}  ${svc.key.toUpperCase()}`, {
        fontSize: '15px', fontFamily: 'monospace', fontStyle: 'bold', color: locked ? '#333344' : c.text,
      }).setOrigin(0.5, 0);
      this.add.text(bx + btnW / 2, by + 36, svc.desc, {
        fontSize: '10px', fontFamily: 'monospace', color: locked ? '#2a2a33' : '#445566',
      }).setOrigin(0.5, 0);

      if (!locked) {
        const zone = this.add.zone(bx + btnW / 2, by + btnH / 2, btnW, btnH)
          .setInteractive({ useHandCursor: true });
        zone.on('pointerover',  () => draw(true));
        zone.on('pointerout',   () => draw(false));
        zone.on('pointerdown',  () => {
          this.cameras.main.fadeOut(300, 0, 0, 0);
          this.cameras.main.once('camerafadeoutcomplete', () => {
            if (svc.key === 'Shop')  this.scene.start('ShopScene',  { shopId: this.shopId, hubData: this.hubData });
            else if (svc.key === 'Forge') this.scene.start('ForgeScene', { hubData: this.hubData });
            else this.scene.start('WorldMapScene');
          });
        });
      }

      bx += btnW + gap;
    }
  }
}
