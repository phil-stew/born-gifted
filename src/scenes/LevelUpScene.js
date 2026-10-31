import Phaser from 'phaser';
import { pendingPromotion, t3SportOptions, sportById, chainById, promoteUnit, roleDisplayLabel } from '../data/gameState.js';
import { drawButton } from '../ui/canvasButton.js';
import { playSfx, playStinger, SFX } from '../audio/sound.js';

// Player-allocated stat points (2026-08-13, "on level up let's have players
// select where they want they stats to go") — layered ON TOP of the
// existing automatic talent-scaled growth (BASE_GROWTH/levelUpGains in
// gameState.js), which stays completely untouched: this doesn't replace
// that system, it adds a second, player-driven growth pool alongside it.
// 3 points per level actually gained (a `lu` entry can span multiple
// levels in one XP grant — see addXP's per-level loop — so the pool scales
// with lu.gains.newLevel - lu.gains.oldLevel, not a flat per-screen amount).
const BONUS_POINTS_PER_LEVEL = 3;
const STAT_ROWS = [
  { key: 'speed',     label: 'Speed',     color: '#4488ff' },
  { key: 'strength',  label: 'Strength',  color: '#ff6644' },
  { key: 'stamina',   label: 'Stamina',   color: '#44cc44' },
  { key: 'endurance', label: 'Endurance', color: '#44cccc' },
];

export class LevelUpScene extends Phaser.Scene {
  constructor() { super({ key: 'LevelUpScene' }); }

  init(data) {
    this.levelUps      = data.levelUps      ?? [];
    this.nextScene     = data.nextScene     ?? 'WorldMapScene';
    this.nextSceneData = data.nextSceneData ?? {};
    this.index = 0;
    this.subPhase = 'stats'; // 'stats' | 'statAllocate' | 'promoPrompt' | 'promoSport' | 'promoRole'
    this.promoTier = null;
    this.promoSport = null;
    this.declinedPromo = false;
    this.bonusAllocated = false;
    this.allocated = null; // { speed, strength, stamina, endurance } while on the statAllocate screen
  }

  create() {
    this.showCurrent();
  }

  advance() {
    this.subPhase = 'stats';
    this.promoTier = null;
    this.promoSport = null;
    this.declinedPromo = false;
    this.bonusAllocated = false;
    this.allocated = null;
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
    ring.strokeCircle(width / 2, 44, 32);
    ring.fillStyle(lu.unit.color, 0.8);
    ring.fillCircle(width / 2, 44, 28);

    // Initials
    this.add.text(width / 2, 44, lu.unit.initials, {
      fontSize: '18px', fontFamily: 'monospace', fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(0.5);

    // Name
    this.add.text(width / 2, 94, lu.unit.name, {
      fontSize: '21px', fontFamily: 'monospace', color: '#aaaacc',
    }).setOrigin(0.5);

    if (this.subPhase === 'statAllocate')     { this.renderStatAllocate(lu); return; }
    if (this.subPhase === 'promoPrompt')      { this.renderPromoPrompt(lu); return; }
    if (this.subPhase === 'promoSport')       { this.renderPromoSportChoice(lu); return; }
    if (this.subPhase === 'promoRole')        { this.renderPromoRoleChoice(lu); return; }
    this.renderStats(lu);
  }

  renderStats(lu) {
    const { width, height } = this.scale;
    playStinger(this, SFX.levelup);

    // Level up text
    this.add.text(width / 2, 140, 'LEVEL UP!', {
      fontSize: '44px', fontFamily: 'Georgia, serif', fontStyle: 'bold',
      color: '#ffdd44', stroke: '#000000', strokeThickness: 5,
    }).setOrigin(0.5);

    this.add.text(width / 2, 188, `Lv.${lu.gains.oldLevel}  →  Lv.${lu.gains.newLevel}`, {
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

    let sy = 216;
    const gfx = this.add.graphics();
    for (const stat of statLines) {
      gfx.fillStyle(Phaser.Display.Color.HexStringToColor(stat.color.replace('#','0x')).color, 0.15);
      gfx.fillRoundedRect(width / 2 - 240, sy - 2, 480, 30, 6);

      this.add.text(width / 2 - 220, sy + 2, stat.label, {
        fontSize: '21px', fontFamily: 'monospace', color: '#cccccc',
      });
      this.add.text(width / 2 + 220, sy + 2, `+${stat.val}`, {
        fontSize: '21px', fontFamily: 'monospace', fontStyle: 'bold', color: stat.color,
      }).setOrigin(1, 0);

      sy += 33;
    }
    sy += 6;

    this.add.text(width / 2, sy, roleDisplayLabel(lu.unit), {
      fontSize: '17px', fontFamily: 'monospace', color: '#9999bb',
    }).setOrigin(0.5);
    sy += 25;

    const pending = !this.declinedPromo && pendingPromotion(lu.unit);
    if (pending) {
      this.add.text(width / 2, sy, `A new sport is available — Tier ${pending === 't3' ? '3' : '2'}`, {
        fontSize: '18px', fontFamily: 'monospace', fontStyle: 'bold', color: '#ffaa44',
      }).setOrigin(0.5);
      sy += 25;
    }
    if (lu.gains.unlockedSlot) {
      this.add.text(width / 2, sy, 'Class Skill slot unlocked!', {
        fontSize: '17px', fontFamily: 'monospace', color: '#44ccff',
      }).setOrigin(0.5);
      sy += 25;
    }

    const bonusPool = (lu.gains.newLevel - lu.gains.oldLevel) * BONUS_POINTS_PER_LEVEL;
    if (bonusPool > 0 && !this.bonusAllocated) {
      this.add.text(width / 2, sy, `+ ${bonusPool} bonus points to allocate yourself`, {
        fontSize: '17px', fontFamily: 'monospace', fontStyle: 'bold', color: '#ffee88',
      }).setOrigin(0.5);
      sy += 25;
    }

    // Progress indicator
    if (this.levelUps.length > 1) {
      this.add.text(width / 2 + 340, height - 34, `${this.index + 1} / ${this.levelUps.length}`, {
        fontSize: '17px', fontFamily: 'monospace', color: '#9999bb',
      }).setOrigin(0.5);
    }

    if (bonusPool > 0 && !this.bonusAllocated) {
      drawButton(this, {
        x: width / 2, y: height - 34, w: 560, h: 56, label: `ALLOCATE ${bonusPool} BONUS POINTS  ▶`,
        fontSize: '24px', bg: 0x3a3312, bgHover: 0x4e4420, border: 0x887722, accent: 0xffee88,
        textColor: '#ffffff', textHoverColor: '#ffee88',
        onClick: () => {
          this.subPhase = 'statAllocate';
          this.showCurrent();
        },
      });
      return;
    }

    if (pending) {
      drawButton(this, {
        x: width / 2, y: height - 34, w: 560, h: 56, label: 'PROMOTION AVAILABLE  ▶',
        fontSize: '24px', bg: 0x443322, bgHover: 0x5a4530, border: 0x886644, accent: 0xffdd88,
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
      x: width / 2, y: height - 34, w: 360, h: 56, label: btnText,
      fontSize: '24px', bg: 0x223344, bgHover: 0x2e4458, border: 0x4477aa, accent: 0xffff88,
      textColor: '#ffffff', textHoverColor: '#ffff88',
      onClick: () => this.advance(),
    });
  }

  // ── Bonus stat points (2026-08-13) — see the BONUS_POINTS_PER_LEVEL
  // comment up top. this.allocated tracks picks across re-renders of this
  // same screen (every +/- tap redraws); advance()/init() reset it to null
  // when moving to a different unit. Any points left unspent when CONFIRM
  // is pressed round-robin into the 4 stats starting from Speed, so a
  // player who just wants to blow through several level-ups in a row never
  // loses points by not fussing over the split. ─────────────────────────

  renderStatAllocate(lu) {
    const { width, height } = this.scale;
    const totalPool = (lu.gains.newLevel - lu.gains.oldLevel) * BONUS_POINTS_PER_LEVEL;
    this.allocated ??= { speed: 0, strength: 0, stamina: 0, endurance: 0 };
    const spent = Object.values(this.allocated).reduce((a, b) => a + b, 0);
    const remaining = totalPool - spent;

    this.add.text(width / 2, 136, 'BONUS POINTS', {
      fontSize: '30px', fontFamily: 'Georgia, serif', fontStyle: 'bold',
      color: '#ffee88', stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5);
    this.add.text(width / 2, 176, `${remaining} remaining — tap + to choose where they go`, {
      fontSize: '17px', fontFamily: 'monospace', color: '#ccccdd',
    }).setOrigin(0.5);

    let sy = 200;
    for (const stat of STAT_ROWS) {
      const count = this.allocated[stat.key];

      const rowBg = this.add.graphics();
      rowBg.fillStyle(Phaser.Display.Color.HexStringToColor(stat.color.replace('#', '0x')).color, 0.1);
      rowBg.fillRoundedRect(width / 2 - 280, sy, 560, 62, 8);

      this.add.text(width / 2 - 260, sy + 31, stat.label, {
        fontSize: '24px', fontFamily: 'monospace', fontStyle: 'bold', color: stat.color,
      }).setOrigin(0, 0.5);

      this.add.text(width / 2 + 150, sy + 31, `+${count}`, {
        fontSize: '24px', fontFamily: 'monospace', fontStyle: 'bold', color: '#ffffff',
      }).setOrigin(0.5);

      this.makeStepper(width / 2 + 70, sy + 31, '−', count > 0, () => {
        this.allocated[stat.key]--;
        this.showCurrent();
      });
      this.makeStepper(width / 2 + 230, sy + 31, '+', remaining > 0, () => {
        this.allocated[stat.key]++;
        this.showCurrent();
      });

      sy += 68;
    }

    this.makeButton(width / 2, height - 34, 360, 56, 'CONFIRM', null, () => {
      let leftover = totalPool - Object.values(this.allocated).reduce((a, b) => a + b, 0);
      let i = 0;
      const order = ['speed', 'strength', 'stamina', 'endurance'];
      while (leftover > 0) { this.allocated[order[i % 4]]++; leftover--; i++; }
      for (const key of order) {
        lu.unit[key] += this.allocated[key];
        lu.gains[key] = (lu.gains[key] ?? 0) + this.allocated[key];
      }
      this.bonusAllocated = true;
      this.subPhase = 'stats';
      this.showCurrent();
    });
  }

  // Small square +/- control for the stat allocator above — makeButton is
  // sized for full label+sub rows, not a compact stepper.
  makeStepper(x, y, symbol, enabled, onClick) {
    const size = 54;
    const g = this.add.graphics();
    const draw = (hover) => {
      g.clear();
      if (!enabled) {
        g.fillStyle(0x151520, 1);
        g.fillRoundedRect(x - size / 2, y - size / 2, size, size, 6);
        g.lineStyle(1, 0x2a2a3a, 1);
        g.strokeRoundedRect(x - size / 2, y - size / 2, size, size, 6);
        return;
      }
      g.fillStyle(hover ? 0x2a4a90 : 0x1a2440, 1);
      g.fillRoundedRect(x - size / 2, y - size / 2, size, size, 6);
      g.lineStyle(1.5, hover ? 0x88aaff : 0x445588, 1);
      g.strokeRoundedRect(x - size / 2, y - size / 2, size, size, 6);
    };
    draw(false);
    this.add.text(x, y, symbol, {
      fontSize: '32px', fontFamily: 'monospace', fontStyle: 'bold',
      color: enabled ? '#ddddee' : '#3a3a4a',
    }).setOrigin(0.5);

    if (!enabled) return;
    const z = this.add.zone(x, y, size, size).setInteractive({ useHandCursor: true });
    z.on('pointerover', () => draw(true));
    z.on('pointerout',  () => draw(false));
    z.on('pointerdown', () => { playSfx(this, SFX.click); onClick(); });
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

    this.add.text(width / 2, 136, `TIER ${tier === 't3' ? '3' : '2'} PROMOTION`, {
      fontSize: '30px', fontFamily: 'Georgia, serif', fontStyle: 'bold',
      color: '#ffaa44', stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5);

    this.add.text(width / 2, 188,
      destSport ? `Promote to ${destSport.name}?` : 'Choose your next sport.', {
      fontSize: '19px', fontFamily: 'monospace', color: '#ccccdd',
    }).setOrigin(0.5);

    this.add.text(width / 2, 244,
      'Promoting swaps in the new sport\'s abilities. Declining keeps everything you know now — you can promote later from the Party screen.', {
      fontSize: '15px', fontFamily: 'monospace', color: '#9999bb', align: 'center', wordWrap: { width: 700 },
    }).setOrigin(0.5);

    this.makeButton(width / 2, 350, 360, 66, 'PROMOTE', null, () => {
      this.subPhase = branching ? 'promoSport' : 'promoRole';
      this.showCurrent();
    });
    this.makeButton(width / 2, 436, 360, 66, 'NOT YET', null, () => {
      this.declinedPromo = true;
      this.subPhase = 'stats';
      this.showCurrent();
    });
  }

  renderPromoSportChoice(lu) {
    const { width, height } = this.scale;
    const options = t3SportOptions(lu.unit).map(sportById);

    this.add.text(width / 2, 136, 'CHOOSE YOUR SPORT', {
      fontSize: '24px', fontFamily: 'Georgia, serif', fontStyle: 'bold', color: '#ffaa44',
    }).setOrigin(0.5);

    const bw = 460, bh = 84, gap = 16;
    const startY = 340 - ((options.length * (bh + gap) - gap) / 2 - bh / 2);
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

    this.add.text(width / 2, 136, `CHOOSE YOUR ROLE`, {
      fontSize: '24px', fontFamily: 'Georgia, serif', fontStyle: 'bold', color: '#ffaa44',
    }).setOrigin(0.5);
    this.add.text(width / 2, 170, sport.name, {
      fontSize: '18px', fontFamily: 'monospace', color: '#8899bb',
    }).setOrigin(0.5);

    const bw = 460, bh = 84, gap = 16;
    const startY = 360 - ((sport.roles.length * (bh + gap) - gap) / 2 - bh / 2);
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

    this.add.text(x, y - (sub ? 14 : 0), label, {
      fontSize: '24px', fontFamily: 'monospace', fontStyle: 'bold', color: '#ffddaa',
    }).setOrigin(0.5);
    if (sub) {
      this.add.text(x, y + 16, sub, {
        fontSize: '17px', fontFamily: 'monospace', color: '#997755',
      }).setOrigin(0.5);
    }

    const z = this.add.zone(x, y, w, h).setInteractive({ useHandCursor: true });
    z.on('pointerover', () => draw(true));
    z.on('pointerout',  () => draw(false));
    z.on('pointerdown', () => { playSfx(this, SFX.click); onClick(); });
  }
}
