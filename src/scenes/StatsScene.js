import Phaser from 'phaser';
import { state, effectiveStats, maxHp, xpToNext, currentRoleId, roleDisplayLabel, roleById, elementIcon } from '../data/gameState.js';
import { loadHeroSprites, stripHeroBackground, heroKey, firstFrame, spriteKeyForRole } from '../data/heroSprites.js';
import { drawButton } from '../ui/canvasButton.js';
import { playSfx, SFX } from '../audio/sound.js';

const SLOT_NAMES = ['weapon', 'footwear', 'handwear', 'chest', 'headwear'];

export class StatsScene extends Phaser.Scene {
  constructor() { super({ key: 'StatsScene' }); }

  preload() {
    const classNames = state.party.map(u => spriteKeyForRole(currentRoleId(u))).filter(Boolean);
    loadHeroSprites(this, classNames);
  }

  create() {
    const { width, height } = this.scale;

    this.bg = this.add.graphics();
    this.bg.fillStyle(0x0a0a18, 1);
    this.bg.fillRect(0, 0, width, height);

    this.selectedIndex = 0;
    this.detailContainer = null;

    // Strip backgrounds before any portraits are rendered
    state.party.forEach(u => {
      const cn = spriteKeyForRole(currentRoleId(u));
      if (cn) stripHeroBackground(this, cn);
    });

    this.drawHeader(width);
    this.drawPartyList(height);
    this.drawDetail(width, height);
    this.drawBackBtn();
  }

  drawHeader(width) {
    this.add.text(width / 2, 14, 'PARTY STATS', {
      fontSize: '16px', fontFamily: 'monospace', fontStyle: 'bold', color: '#aaaacc',
    }).setOrigin(0.5, 0);

    const gfx = this.add.graphics();
    gfx.lineStyle(1, 0x333355, 1);
    gfx.lineBetween(0, 38, width, 38);
  }

  drawPartyList(height) {
    const listX = 10, listW = 150, listH = height - 90;
    const shadow = this.add.graphics();
    shadow.fillStyle(0x000000, 0.3);
    shadow.fillRoundedRect(listX + 2, 47, listW, listH, 8);
    const gfx = this.add.graphics();
    gfx.fillStyle(0x0d0d20, 1);
    gfx.fillRoundedRect(listX, 44, listW, listH, 8);
    gfx.lineStyle(1.5, 0x222244, 1);
    gfx.strokeRoundedRect(listX, 44, listW, listH, 8);

    this.partyBtns = [];
    state.party.forEach((unit, i) => {
      const by = 60 + i * 86;

      const btn = this.add.graphics();
      this.partyBtns.push(btn);

      // Hit area
      const hit = this.add.rectangle(listX + listW / 2, by + 34, listW - 4, 80)
        .setInteractive({ useHandCursor: true });
      hit.on('pointerdown', () => { playSfx(this, SFX.click); this.selectedIndex = i; this.refreshAll(); });
      hit.on('pointerover', () => {
        if (i !== this.selectedIndex) { btn.clear(); this.drawUnitCard(btn, unit, by, false, true); }
      });
      hit.on('pointerout', () => {
        if (i !== this.selectedIndex) { btn.clear(); this.drawUnitCard(btn, unit, by, false, false); }
      });

      this.drawUnitCard(btn, unit, by, i === this.selectedIndex, false);
    });
  }

  drawUnitCard(gfx, unit, y, selected, hovered) {
    const lx = 14, w = 142;
    const bg = selected ? 0x1a1a3a : hovered ? 0x141428 : 0x0d0d20;
    gfx.fillStyle(bg, 1);
    gfx.fillRoundedRect(lx, y, w, 78, 6);
    if (selected) {
      gfx.lineStyle(2, unit.color, 0.8);
      gfx.strokeRoundedRect(lx, y, w, 78, 6);
      gfx.fillStyle(unit.color, 0.9);
      gfx.fillRoundedRect(lx, y, 3, 78, 2);
    }

    // Color dot
    gfx.fillStyle(unit.color, 1);
    gfx.fillCircle(lx + 14, y + 20, 8);

    // Name
    this.add.text(lx + 28, y + 12, unit.name.split(' ')[0], {
      fontSize: '12px', fontFamily: 'monospace', fontStyle: 'bold', color: '#dddddd',
    });
    this.add.text(lx + 10, y + 30, `Lv.${unit.level}  ${roleDisplayLabel(unit)}`, {
      fontSize: '10px', fontFamily: 'monospace', color: '#777799',
    });

    // Mini HP bar
    const hp = maxHp(unit);
    const bw = w - 20, bh = 4;
    gfx.fillStyle(0x222233, 1);
    gfx.fillRect(lx + 10, y + 50, bw, bh);
    gfx.fillStyle(0x44ff88, 1);
    gfx.fillRect(lx + 10, y + 50, bw, bh); // full HP (no battle damage in this view)

    this.add.text(lx + 10, y + 58, `HP ${hp}`, {
      fontSize: '9px', fontFamily: 'monospace', color: '#446644',
    });
  }

  drawDetail(width, height) {
    if (this.detailContainer) this.detailContainer.destroy();
    this.detailContainer = this.add.container(0, 0);

    const unit = state.party[this.selectedIndex];
    const eff  = effectiveStats(unit);
    const dx = 175, dw = width - dx - 12;

    // Panel bg
    const panH = height - 90;
    const panelShadow = this.add.graphics();
    panelShadow.fillStyle(0x000000, 0.3);
    panelShadow.fillRoundedRect(dx + 2, 47, dw, panH, 8);
    this.detailContainer.add(panelShadow);
    const panelGfx = this.add.graphics();
    panelGfx.fillStyle(0x0d0d20, 1);
    panelGfx.fillRoundedRect(dx, 44, dw, panH, 8);
    panelGfx.lineStyle(1.5, 0x222244, 1);
    panelGfx.strokeRoundedRect(dx, 44, dw, panH, 8);
    this.detailContainer.add(panelGfx);

    let y = 58;
    const cx = dx + dw / 2;

    // Portrait
    const spriteKey = spriteKeyForRole(currentRoleId(unit));
    const hKey = heroKey(spriteKey);
    if (this.textures.exists(hKey)) {
      const portrait = this.add.image(dx + dw - 60, y + 28, hKey, firstFrame(spriteKey))
        .setScale(0.52)
        .setOrigin(0.5, 0);
      this.detailContainer.add(portrait);
    }

    // Name + class
    const nameLabel = this.add.text(cx, y, unit.name, {
      fontSize: '18px', fontFamily: 'Georgia, serif', fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(0.5);
    this.detailContainer.add(nameLabel);
    y += 24;

    const activeRoleId = currentRoleId(unit);
    const tierLabel = (roleId) => {
      const name = roleById(roleId)?.name ?? '?';
      return roleId === activeRoleId ? `[${name}]` : name;
    };
    const path = [unit.t1Role, unit.t2Role, unit.t3Role].filter(Boolean).map(tierLabel).join('  →  ');
    const classLabel = this.add.text(cx, y, `${path}  ·  ${elementIcon(unit.element)} ${unit.element}`, {
      fontSize: '11px', fontFamily: 'monospace', color: '#666688',
    }).setOrigin(0.5);
    this.detailContainer.add(classLabel);
    y += 22;

    // Level + XP
    const needed = xpToNext(unit.level);
    const xpPct  = unit.xp / needed;
    const lvlLabel = this.add.text(cx, y, `Level ${unit.level}`, {
      fontSize: '13px', fontFamily: 'monospace', color: '#aaaaff',
    }).setOrigin(0.5);
    this.detailContainer.add(lvlLabel);
    y += 18;

    const xpGfx = this.add.graphics();
    const xpBW = dw - 60;
    xpGfx.fillStyle(0x222233, 1);
    xpGfx.fillRect(dx + 30, y, xpBW, 6);
    xpGfx.fillStyle(0x44aaff, 1);
    xpGfx.fillRect(dx + 30, y, xpBW * xpPct, 6);
    this.detailContainer.add(xpGfx);
    const xpLabel = this.add.text(cx, y + 10, `${unit.xp} / ${needed} XP`, {
      fontSize: '9px', fontFamily: 'monospace', color: '#445566',
    }).setOrigin(0.5);
    this.detailContainer.add(xpLabel);
    y += 26;

    // Divider
    const divGfx = this.add.graphics();
    divGfx.lineStyle(1, 0x222244, 1);
    divGfx.lineBetween(dx + 16, y, dx + dw - 16, y);
    this.detailContainer.add(divGfx);
    y += 10;

    // Core stats (base + equipment bonus)
    const stats = [
      { label:'Speed',     base: unit.speed,     eff: eff.speed,     color:'#4488ff' },
      { label:'Strength',  base: unit.strength,  eff: eff.strength,  color:'#ff6644' },
      { label:'Stamina',   base: unit.stamina,   eff: eff.stamina,   color:'#44cc44' },
      { label:'Endurance', base: unit.endurance, eff: eff.endurance, color:'#44cccc' },
    ];

    for (const s of stats) {
      const bonus = s.eff - s.base;
      const label = this.add.text(dx + 24, y, s.label, {
        fontSize: '12px', fontFamily: 'monospace', color: '#aaaaaa',
      });
      const valStr = bonus > 0 ? `${s.eff}  (+${bonus})` : `${s.eff}`;
      const val = this.add.text(dx + dw - 24, y, valStr, {
        fontSize: '13px', fontFamily: 'monospace', fontStyle: 'bold', color: s.color,
      }).setOrigin(1, 0);

      // Stat bar
      const barGfx = this.add.graphics();
      const maxStat = 30, barW = 80;
      barGfx.fillStyle(0x222233, 1);
      barGfx.fillRect(dx + 110, y + 2, barW, 8);
      barGfx.fillStyle(parseInt(s.color.slice(1), 16), 0.7);
      barGfx.fillRect(dx + 110, y + 2, barW * Math.min(s.eff / maxStat, 1), 8);

      this.detailContainer.add([label, val, barGfx]);
      y += 22;
    }

    // Derived stats
    const power     = eff.speed + eff.strength;
    const technique = eff.endurance + eff.stamina;
    const hp        = maxHp(unit);
    y += 6;
    const derivedGfx = this.add.graphics();
    derivedGfx.lineStyle(1, 0x222244, 1);
    derivedGfx.lineBetween(dx + 16, y, dx + dw - 16, y);
    this.detailContainer.add(derivedGfx);
    y += 10;

    const derivedStats = [
      { label:'Power',     val:`${power}`,     sub:'Speed + Strength',     color:'#ffaa44' },
      { label:'Technique', val:`${technique}`, sub:'Endurance + Stamina',  color:'#aa88ff' },
      { label:'HP',        val:`${hp}`,        sub:`(End+Sta)×(2+Lv)`,     color:'#44ff88' },
    ];
    for (const d of derivedStats) {
      const lbl = this.add.text(dx + 24, y, d.label, { fontSize:'11px', fontFamily:'monospace', color:'#888888' });
      const sub = this.add.text(dx + 110, y, d.sub, { fontSize:'9px', fontFamily:'monospace', color:'#444455' });
      const val = this.add.text(dx + dw - 24, y, d.val, {
        fontSize:'13px', fontFamily:'monospace', fontStyle:'bold', color: d.color,
      }).setOrigin(1, 0);
      this.detailContainer.add([lbl, sub, val]);
      y += 20;
    }

    // Equipment slots
    y += 10;
    const eqGfx = this.add.graphics();
    eqGfx.lineStyle(1, 0x222244, 1);
    eqGfx.lineBetween(dx + 16, y, dx + dw - 16, y);
    this.detailContainer.add(eqGfx);
    y += 8;

    const eqHeader = this.add.text(cx, y, 'EQUIPMENT', {
      fontSize: '9px', fontFamily: 'monospace', color: '#444466',
    }).setOrigin(0.5);
    this.detailContainer.add(eqHeader);
    y += 14;

    for (const slot of SLOT_NAMES) {
      const item = unit.equip[slot];
      const slotLabel = this.add.text(dx + 24, y, slot.toUpperCase(), {
        fontSize: '9px', fontFamily: 'monospace', color: '#445577',
      });
      const itemLabel = this.add.text(dx + dw - 24, y, item ? item.name : '—', {
        fontSize: '10px', fontFamily: 'monospace', color: item ? '#aaccff' : '#333355',
      }).setOrigin(1, 0);
      this.detailContainer.add([slotLabel, itemLabel]);
      y += 16;
    }
  }

  // Moved into the header (2026-07-11, "have the back button at top of
  // menues") — was bottom-left, now top-left alongside the title.
  drawBackBtn() {
    drawButton(this, {
      x: 76, y: 19, w: 128, h: 26, label: '◀  WORLD MAP',
      fontSize: '13px', radius: 6,
      bg: 0x0e0e20, bgHover: 0x181834, border: 0x334477, accent: 0xffffff,
      textColor: '#7777aa',
      onClick: () => this.scene.start('WorldMapScene'),
    });
  }

  refreshAll() {
    // Redraw party buttons
    this.partyBtns.forEach((btn, i) => {
      btn.clear();
      this.drawUnitCard(btn, state.party[i], 60 + i * 86, i === this.selectedIndex, false);
    });
    // Redraw detail panel
    const { width, height } = this.scale;
    this.drawDetail(width, height);
  }
}
