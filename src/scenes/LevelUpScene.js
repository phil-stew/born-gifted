import Phaser from 'phaser';
import { pendingPromotion, t3SportOptions, sportById, chainById, promoteUnit, roleDisplayLabel } from '../data/gameState.js';
import { drawButton } from '../ui/canvasButton.js';
import { playStinger, SFX } from '../audio/sound.js';

export class LevelUpScene extends Phaser.Scene {
  constructor() { super({ key: 'LevelUpScene' }); }

  init(data) {
    this.levelUps      = data.levelUps      ?? [];
    this.nextScene     = data.nextScene     ?? 'WorldMapScene';
    this.nextSceneData = data.nextSceneData ?? {};
    this.index = 0;
    this.subPhase = 'stats'; // 'stats' | 'promoPrompt' | 'promoSport' | 'promoRole'
    this.promoTier = null;
    this.promoSport = null;
    this.declinedPromo = false;
  }

  create() {
    this.showCurrent();
  }

  advance() {
    this.subPhase = 'stats';
    this.promoTier = null;
    this.promoSport = null;
    this.declinedPromo = false;
    const isLast = this.index >= this.levelUps.length - 1;
    if (isLast) {
      this.scene.start(this.nextScene, this.nextSceneData);
    } else {
      this.index++;
      this.showCurrent();
    }
  }

  showCurrent() {
    // Destroy previous content
    this.children.list.slice().forEach(c => c.destroy());

    const { width, height } = this.scale;
    const lu = this.levelUps[this.index];

    const bg = this.add.graphics();
    bg.fillStyle(0x0a0a18, 1);
    bg.fillRect(0, 0, width, height);

    // Glow circle background
    bg.fillStyle(lu.unit.color, 0.06);
    bg.fillCircle(width / 2, height / 2 - 30, 220);

    // Unit color ring
    const ring = this.add.graphics();
    ring.lineStyle(3, lu.unit.color, 1);
    ring.strokeCircle(width / 2, 150, 40);
    ring.fillStyle(lu.unit.color, 0.8);
    ring.fillCircle(width / 2, 150, 36);

    // Initials
    this.add.text(width / 2, 150, lu.unit.initials, {
      fontSize: '18px', fontFamily: 'monospace', fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(0.5);

    // Name
    this.add.text(width / 2, 202, lu.unit.name, {
      fontSize: '16px', fontFamily: 'monospace', color: '#aaaacc',
    }).setOrigin(0.5);

    if (this.subPhase === 'promoPrompt')      { this.renderPromoPrompt(lu); return; }
    if (this.subPhase === 'promoSport')       { this.renderPromoSportChoice(lu); return; }
    if (this.subPhase === 'promoRole')        { this.renderPromoRoleChoice(lu); return; }
    this.renderStats(lu);
  }

  renderStats(lu) {
    const { width, height } = this.scale;
    playStinger(this, SFX.levelup);

    // Level up text
    this.add.text(width / 2, 250, 'LEVEL UP!', {
      fontSize: '44px', fontFamily: 'Georgia, serif', fontStyle: 'bold',
      color: '#ffdd44', stroke: '#000000', strokeThickness: 5,
    }).setOrigin(0.5);

    this.add.text(width / 2, 304, `Lv.${lu.gains.newLevel - 1}  →  Lv.${lu.gains.newLevel}`, {
      fontSize: '22px', fontFamily: 'monospace', color: '#ffffff',
    }).setOrigin(0.5);

    // Stat gains
    const gains = lu.gains;
    const statLines = [
      { label:'Speed',     val: gains.speed,     color:'#4488ff' },
      { label:'Strength',  val: gains.strength,  color:'#ff6644' },
      { label:'Stamina',   val: gains.stamina,   color:'#44cc44' },
      { label:'Endurance', val: gains.endurance, color:'#44cccc' },
    ].filter(s => s.val > 0);

    let sy = 350;
    const gfx = this.add.graphics();
    for (const stat of statLines) {
      gfx.fillStyle(Phaser.Display.Color.HexStringToColor(stat.color.replace('#','0x')).color, 0.15);
      gfx.fillRoundedRect(width / 2 - 140, sy - 2, 280, 28, 6);

      this.add.text(width / 2 - 120, sy + 4, stat.label, {
        fontSize: '14px', fontFamily: 'monospace', color: '#aaaaaa',
      });
      this.add.text(width / 2 + 100, sy + 4, `+${stat.val}`, {
        fontSize: '14px', fontFamily: 'monospace', fontStyle: 'bold', color: stat.color,
      }).setOrigin(1, 0);

      sy += 34;
    }
    sy += 6;

    this.add.text(width / 2, sy, roleDisplayLabel(lu.unit), {
      fontSize: '12px', fontFamily: 'monospace', color: '#555577',
    }).setOrigin(0.5);
    sy += 20;

    const pending = !this.declinedPromo && pendingPromotion(lu.unit);
    if (pending) {
      this.add.text(width / 2, sy, `A new sport is available — Tier ${pending === 't3' ? '3' : '2'}`, {
        fontSize: '13px', fontFamily: 'monospace', fontStyle: 'bold', color: '#ffaa44',
      }).setOrigin(0.5);
      sy += 20;
    }
    if (lu.gains.unlockedSlot) {
      this.add.text(width / 2, sy, 'Class Skill slot unlocked!', {
        fontSize: '12px', fontFamily: 'monospace', color: '#44ccff',
      }).setOrigin(0.5);
      sy += 20;
    }

    // Progress indicator
    if (this.levelUps.length > 1) {
      this.add.text(width / 2, height - 60, `${this.index + 1} / ${this.levelUps.length}`, {
        fontSize: '12px', fontFamily: 'monospace', color: '#555577',
      }).setOrigin(0.5);
    }

    if (pending) {
      drawButton(this, {
        x: width / 2, y: height - 28, w: 260, h: 42, label: 'PROMOTION AVAILABLE  ▶',
        fontSize: '15px', bg: 0x443322, bgHover: 0x5a4530, border: 0x886644, accent: 0xffdd88,
        textColor: '#ffffff', textHoverColor: '#ffdd88',
        onClick: () => {
          this.promoTier = pending;
          this.subPhase = 'promoPrompt';
          this.showCurrent();
        },
      });
      return;
    }

    this.showContinueButton();
  }

  showContinueButton() {
    const { width, height } = this.scale;
    const isLast = this.index >= this.levelUps.length - 1;
    const btnText = isLast ? 'WORLD MAP  ▶' : 'NEXT  ▶';
    drawButton(this, {
      x: width / 2, y: height - 28, w: 200, h: 42, label: btnText,
      fontSize: '16px', bg: 0x223344, bgHover: 0x2e4458, border: 0x4477aa, accent: 0xffff88,
      textColor: '#ffffff', textHoverColor: '#ffff88',
      onClick: () => this.advance(),
    });
  }

  // ── Promotion: optional/deferrable — the player can decline and stay at
  // their current tier (keeping their full known kit) until they promote
  // later, from here or from the Party screen. ──────────────────────────────

  renderPromoPrompt(lu) {
    const { width, height } = this.scale;
    const chain = chainById(lu.unit.chainId);
    const tier = this.promoTier;
    const branching = tier === 't3' && t3SportOptions(lu.unit).length > 1;
    const destSportId = branching ? null : (tier === 't2' ? chain.t2 : chain.t3[0]);
    const destSport = destSportId ? sportById(destSportId) : null;

    this.add.text(width / 2, 250, `TIER ${tier === 't3' ? '3' : '2'} PROMOTION`, {
      fontSize: '30px', fontFamily: 'Georgia, serif', fontStyle: 'bold',
      color: '#ffaa44', stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5);

    this.add.text(width / 2, 300,
      destSport ? `Promote to ${destSport.name}?` : 'Choose your next sport.', {
      fontSize: '14px', fontFamily: 'monospace', color: '#ccccdd',
    }).setOrigin(0.5);

    this.add.text(width / 2, 328,
      'Promoting swaps in the new sport\'s abilities. Declining keeps everything you know now — you can promote later from the Party screen.', {
      fontSize: '10px', fontFamily: 'monospace', color: '#666688', align: 'center', wordWrap: { width: 340 },
    }).setOrigin(0.5);

    this.makeButton(width / 2, 400, 220, 46, 'PROMOTE', null, () => {
      this.subPhase = branching ? 'promoSport' : 'promoRole';
      this.showCurrent();
    });
    this.makeButton(width / 2, 460, 220, 40, 'NOT YET', null, () => {
      this.declinedPromo = true;
      this.subPhase = 'stats';
      this.showCurrent();
    });
  }

  renderPromoSportChoice(lu) {
    const { width, height } = this.scale;
    const options = t3SportOptions(lu.unit).map(sportById);

    this.add.text(width / 2, 250, 'CHOOSE YOUR SPORT', {
      fontSize: '24px', fontFamily: 'Georgia, serif', fontStyle: 'bold', color: '#ffaa44',
    }).setOrigin(0.5);

    const bw = 240, bh = 56, gap = 16;
    const startY = 320 - ((options.length * (bh + gap) - gap) / 2 - bh / 2);
    options.forEach((sport, i) => {
      const y = startY + i * (bh + gap);
      this.makeButton(width / 2, y, bw, bh, sport.name, `${sport.roles.map(r => r.name).join(' / ')}`, () => {
        this.promoSport = sport.id;
        this.subPhase = 'promoRole';
        this.showCurrent();
      });
    });
  }

  renderPromoRoleChoice(lu) {
    const { width, height } = this.scale;
    const chain = chainById(lu.unit.chainId);
    const sportId = this.promoTier === 't2' ? chain.t2 : (this.promoSport ?? chain.t3[0]);
    const sport = sportById(sportId);

    this.add.text(width / 2, 250, `CHOOSE YOUR ROLE`, {
      fontSize: '24px', fontFamily: 'Georgia, serif', fontStyle: 'bold', color: '#ffaa44',
    }).setOrigin(0.5);
    this.add.text(width / 2, 280, sport.name, {
      fontSize: '13px', fontFamily: 'monospace', color: '#8899bb',
    }).setOrigin(0.5);

    const bw = 240, bh = 56, gap = 16;
    const startY = 340 - ((sport.roles.length * (bh + gap) - gap) / 2 - bh / 2);
    sport.roles.forEach((role, i) => {
      const y = startY + i * (bh + gap);
      this.makeButton(width / 2, y, bw, bh, role.name, role.designations.join(' / '), () => {
        promoteUnit(lu.unit, this.promoTier, role.id, this.promoSport ?? undefined);
        this.subPhase = 'stats';
        this.showCurrent();
      });
    });
  }

  makeButton(x, y, w, h, label, sub, onClick) {
    const shadow = this.add.graphics();
    shadow.fillStyle(0x000000, 0.3);
    shadow.fillRoundedRect(x - w / 2 + 2, y - h / 2 + 3, w, h, 6);

    const g = this.add.graphics();
    const draw = (hover) => {
      g.clear();
      g.fillStyle(hover ? 0x2a1f10 : 0x1a1408, 1);
      g.fillRoundedRect(x - w / 2, y - h / 2, w, h, 6);
      g.lineStyle(1.5, hover ? 0xffaa44 : 0x664422, 1);
      g.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 6);
      if (hover) { g.fillStyle(0xffaa44, 0.9); g.fillRoundedRect(x - w / 2, y - h / 2, 3, h, 2); }
    };
    draw(false);

    this.add.text(x, y - (sub ? 8 : 0), label, {
      fontSize: '13px', fontFamily: 'monospace', fontStyle: 'bold', color: '#ffddaa',
    }).setOrigin(0.5);
    if (sub) {
      this.add.text(x, y + 10, sub, {
        fontSize: '9px', fontFamily: 'monospace', color: '#997755',
      }).setOrigin(0.5);
    }

    const z = this.add.zone(x, y, w, h).setInteractive({ useHandCursor: true });
    z.on('pointerover', () => draw(true));
    z.on('pointerout',  () => draw(false));
    z.on('pointerdown', onClick);
  }
}
