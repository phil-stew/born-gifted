import Phaser from 'phaser';
import {
  state, FULL_ROSTER, effectiveStats, maxHp, xpToNext, classSkillSlotCount, equipPassive, elementIcon,
  CLASS_SKILL_SLOT_LEVELS, roleDisplayLabel, currentRoleId, roleById, pendingPromotion, chainById,
  sportById, t3SportOptions, promoteUnit,
} from '../data/gameState.js';
import { ATTACK, THROW, getUnitSpecials, getUnitSkills, getUnitPassivePool, getEquippedPassives } from '../data/abilities.js';
import { rarityColor } from '../data/items.js';
import { loadHeroSprites, stripHeroBackground, heroKey, firstFrame, spriteKeyForRole } from '../data/heroSprites.js';

const SLOTS = ['weapon', 'footwear', 'handwear', 'chest', 'headwear'];

export class PartyScene extends Phaser.Scene {
  constructor() { super({ key: 'PartyScene' }); }

  preload() {
    const classNames = state.party.map(u => spriteKeyForRole(currentRoleId(u))).filter(Boolean);
    loadHeroSprites(this, classNames);
  }

  init() {
    this.selId = state.party[0]?.id ?? null;
    this.promoStep = null;   // null | 'prompt' | 'sport' | 'role' — for this.selId only
    this.promoTier = null;
    this.promoSport = null;
  }

  create() {
    const { width, height } = this.scale;
    this.W = width; this.H = height;

    const bg = this.add.graphics();
    bg.fillStyle(0x07080f, 1);
    bg.fillRect(0, 0, width, height);
    bg.fillStyle(0x0c0c1a, 1);
    bg.fillRect(0, 0, width, 40);
    bg.lineStyle(1, 0x222244, 1);
    bg.lineBetween(0, 40, width, 40);

    this.add.text(width / 2, 12, 'PARTY', {
      fontSize: '15px', fontFamily: 'monospace', fontStyle: 'bold', color: '#aaaacc',
    }).setOrigin(0.5);

    const back = this.add.text(14, height - 22, '◀  WORLD MAP', {
      fontSize: '12px', fontFamily: 'monospace', color: '#7777aa',
      backgroundColor: '#0e0e20', padding: { x: 10, y: 5 },
    }).setOrigin(0, 0.5).setInteractive({ useHandCursor: true });
    back.on('pointerover', () => back.setStyle({ color: '#ffffff' }));
    back.on('pointerout',  () => back.setStyle({ color: '#7777aa' }));
    back.on('pointerdown', () => this.scene.start('WorldMapScene'));

    const invBtn = this.add.text(width - 14, height - 22, 'INVENTORY  ▶', {
      fontSize: '12px', fontFamily: 'monospace', color: '#aa8833',
      backgroundColor: '#1a1408', padding: { x: 10, y: 5 },
    }).setOrigin(1, 0.5).setInteractive({ useHandCursor: true });
    invBtn.on('pointerover', () => invBtn.setStyle({ color: '#ffdd66' }));
    invBtn.on('pointerout',  () => invBtn.setStyle({ color: '#aa8833' }));
    invBtn.on('pointerdown', () => this.scene.start('InventoryScene'));

    // Strip backgrounds before any sprites are built
    state.party.forEach(u => {
      const cn = spriteKeyForRole(currentRoleId(u));
      if (cn) stripHeroBackground(this, cn);
    });

    this.listCon = this.add.container(0, 0);
    this.detCon  = this.add.container(0, 0);
    this.rebuild();
    this.cameras.main.fadeIn(300, 0, 0, 0);
  }

  rebuild() {
    this.listCon.removeAll(true);
    this.detCon.removeAll(true);
    this.buildList();
    this.buildDetail();
  }

  buildList() {
    const lx = 8, lw = 168, startY = 46;
    const panH = this.H - startY - 38;

    const bg = this.add.graphics();
    bg.fillStyle(0x0b0b18, 1);
    bg.fillRect(lx, startY, lw, panH);
    bg.lineStyle(1, 0x1e1e33, 1);
    bg.strokeRect(lx, startY, lw, panH);
    this.listCon.add(bg);

    // Build full display roster: recruited members + locked slots
    const recruited = state.party;
    const lockedIds = FULL_ROSTER.filter(r => !recruited.find(u => u.id === r.id)).map(r => r.id);
    const allEntries = [
      ...recruited.map(u => ({ unit: u, locked: false })),
      ...lockedIds.map(id => ({ unit: FULL_ROSTER.find(r => r.id === id), locked: true })),
    ];

    allEntries.forEach(({ unit, locked }, i) => {
      const uy = startY + 6 + i * 76;
      const active = !locked && unit.id === this.selId;

      const g = this.add.graphics();
      const draw = (h) => {
        g.clear();
        g.fillStyle(active ? 0x16162e : (h && !locked ? 0x101028 : 0x0b0b18), 1);
        g.fillRect(lx + 2, uy, lw - 4, 70);
        if (active) { g.lineStyle(2, unit.color, 0.7); g.strokeRect(lx + 2, uy, lw - 4, 70); }
      };
      draw(false);
      this.listCon.add(g);

      if (locked) {
        g.fillStyle(0x111128, 0.5);
        g.fillRect(lx + 2, uy, lw - 4, 70);
        this.listCon.add(this.add.text(lx + lw / 2, uy + 20, '???', { fontSize:'16px', fontFamily:'monospace', color:'#333355' }).setOrigin(0.5));
        this.listCon.add(this.add.text(lx + lw / 2, uy + 42, 'Recruit later', { fontSize:'9px', fontFamily:'monospace', color:'#222244' }).setOrigin(0.5));
        return;
      }

      // Portrait
      const spriteKey = spriteKeyForRole(currentRoleId(unit));
      const key = heroKey(spriteKey);
      if (this.textures.exists(key)) {
        this.listCon.add(this.add.sprite(lx + 30, uy + 35, key, firstFrame(spriteKey)).setScale(0.22).setOrigin(0.5, 0.8));
      } else {
        const dot = this.add.graphics();
        dot.fillStyle(unit.color, 1);
        dot.fillCircle(lx + 30, uy + 35, 18);
        this.listCon.add(dot);
      }

      this.listCon.add(this.add.text(lx + 60, uy + 10, unit.name.split(' ')[0], {
        fontSize: '13px', fontFamily: 'monospace', fontStyle: 'bold', color: '#ddddee',
      }));
      this.listCon.add(this.add.text(lx + 60, uy + 28, `Lv.${unit.level}  ${roleDisplayLabel(unit)}`, {
        fontSize: '10px', fontFamily: 'monospace', color: '#666688',
      }));
      if (pendingPromotion(unit)) {
        this.listCon.add(this.add.text(lx + lw - 8, uy + 6, '🏆', { fontSize: '11px' }).setOrigin(1, 0));
      }

      const hp = maxHp(unit);
      const bw = lw - 66;
      const hpG = this.add.graphics();
      hpG.fillStyle(0x1a1a2a, 1); hpG.fillRect(lx + 60, uy + 48, bw, 5);
      hpG.fillStyle(0x44cc66, 1); hpG.fillRect(lx + 60, uy + 48, bw, 5);
      this.listCon.add(hpG);
      this.listCon.add(this.add.text(lx + 60, uy + 56, `HP ${hp}`, { fontSize:'9px', fontFamily:'monospace', color:'#336644' }));

      const z = this.add.zone(lx + lw / 2, uy + 35, lw, 70).setInteractive({ useHandCursor: true });
      z.on('pointerover',  () => { if (!active) draw(true); });
      z.on('pointerout',   () => { if (!active) draw(false); });
      z.on('pointerdown',  () => { this.selId = unit.id; this.rebuild(); });
      this.listCon.add(z);
    });
  }

  buildDetail() {
    const unit = state.party.find(u => u.id === this.selId);
    const dx = 184, dw = this.W - dx - 8, startY = 46;
    const cx = dx + dw / 2;

    const bg = this.add.graphics();
    bg.fillStyle(0x0b0b18, 1);
    bg.fillRect(dx, startY, dw, this.H - startY - 38);
    bg.lineStyle(1, 0x1e1e33, 1);
    bg.strokeRect(dx, startY, dw, this.H - startY - 38);
    this.detCon.add(bg);

    if (!unit) {
      this.detCon.add(this.add.text(cx, startY + 120, 'Select a party member', {
        fontSize: '12px', fontFamily: 'monospace', color: '#333355',
      }).setOrigin(0.5));
      return;
    }

    const eff = effectiveStats(unit);
    let y = startY + 12;

    // Portrait + name block
    const spriteKey = spriteKeyForRole(currentRoleId(unit));
    const key = heroKey(spriteKey);
    if (this.textures.exists(key)) {
      this.detCon.add(this.add.sprite(dx + 52, y + 50, key, firstFrame(spriteKey)).setScale(0.52).setOrigin(0.5, 0.85));
    }

    this.detCon.add(this.add.text(dx + 102, y + 4, unit.name, {
      fontSize: '16px', fontFamily: 'Georgia, serif', fontStyle: 'bold', color: '#ffffff',
    }));
    const activeRoleId = currentRoleId(unit);
    const tierLabel = (roleId) => {
      const name = roleById(roleId)?.name ?? '?';
      return roleId === activeRoleId ? `[${name}]` : name;
    };
    const rolePath = [unit.t1Role, unit.t2Role, unit.t3Role].filter(Boolean).map(tierLabel).join('  →  ');
    this.detCon.add(this.add.text(dx + 102, y + 26, rolePath, {
      fontSize: '11px', fontFamily: 'monospace', color: '#666688',
    }));
    this.detCon.add(this.add.text(dx + 102, y + 44, `${elementIcon(unit.element)} ${unit.element}`, {
      fontSize: '10px', fontFamily: 'monospace', color: '#8888aa',
    }));

    // Level + XP
    const needed = xpToNext(unit.level);
    this.detCon.add(this.add.text(dx + 102, y + 62, `Level ${unit.level}`, {
      fontSize: '12px', fontFamily: 'monospace', color: '#aaaaff',
    }));
    const xpBw = dw - 110;
    const xpG = this.add.graphics();
    xpG.fillStyle(0x1a1a2a, 1); xpG.fillRect(dx + 102, y + 80, xpBw, 5);
    xpG.fillStyle(0x4499ff, 1); xpG.fillRect(dx + 102, y + 80, xpBw * (unit.xp / needed), 5);
    this.detCon.add(xpG);
    this.detCon.add(this.add.text(dx + 102, y + 88, `${unit.xp} / ${needed} XP`, { fontSize:'9px', fontFamily:'monospace', color:'#334466' }));

    y += 104;

    // ── Promotion (optional/deferrable — see LevelUpScene for the same flow) ──
    if (this.promoStep && this.selId === unit.id) {
      this.buildPromoChooser(unit, dx, dw, cx, y);
      return;
    }
    const pending = pendingPromotion(unit);
    if (pending) {
      const btn = this.add.text(cx, y, `🏆  TIER ${pending === 't3' ? '3' : '2'} PROMOTION AVAILABLE`, {
        fontSize: '11px', fontFamily: 'monospace', fontStyle: 'bold', color: '#ffcc66',
        backgroundColor: '#332208', padding: { x: 10, y: 5 },
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      btn.on('pointerover', () => btn.setStyle({ color: '#ffee99' }));
      btn.on('pointerout',  () => btn.setStyle({ color: '#ffcc66' }));
      btn.on('pointerdown', () => {
        this.promoTier = pending; this.promoSport = null; this.promoStep = 'prompt';
        this.rebuild();
      });
      this.detCon.add(btn);
      y += 24;
    }

    // Stats
    const div1 = this.add.graphics();
    div1.lineStyle(1, 0x1e1e33, 1); div1.lineBetween(dx + 10, y, dx + dw - 10, y);
    this.detCon.add(div1);
    y += 8;

    const STAT_DEFS = [
      { key:'speed',     label:'Speed',     color:'#4488ff' },
      { key:'strength',  label:'Strength',  color:'#ff6644' },
      { key:'stamina',   label:'Stamina',   color:'#44cc44' },
      { key:'endurance', label:'Endurance', color:'#44cccc' },
    ];
    const col2x = dx + dw / 2 + 8;

    STAT_DEFS.forEach((s, i) => {
      const sx = i < 2 ? dx + 14 : col2x;
      const sy = y + Math.floor(i / 2) * 32;
      const base = unit[s.key], eff_val = eff[s.key];
      const bonus = eff_val - base;
      const barW = dw / 2 - 90;

      this.detCon.add(this.add.text(sx, sy, s.label, { fontSize:'10px', fontFamily:'monospace', color:'#888899' }));
      const valStr = bonus > 0 ? `${eff_val} (+${bonus})` : `${eff_val}`;
      this.detCon.add(this.add.text(sx + 80, sy, valStr, {
        fontSize: '12px', fontFamily: 'monospace', fontStyle: 'bold', color: s.color,
      }));
      const bG = this.add.graphics();
      bG.fillStyle(0x1a1a2a, 1); bG.fillRect(sx, sy + 14, barW, 5);
      bG.fillStyle(parseInt(s.color.slice(1), 16), 0.7); bG.fillRect(sx, sy + 14, barW * Math.min(eff_val / 30, 1), 5);
      this.detCon.add(bG);
    });

    y += 72;

    // HP / SP display
    const hp = maxHp(unit);
    this.detCon.add(this.add.text(dx + 14, y, `HP  ${hp}`, { fontSize:'12px', fontFamily:'monospace', fontStyle:'bold', color:'#44cc66' }));
    this.detCon.add(this.add.text(col2x, y, `SP  ${unit.sp ?? 4} / ${unit.maxSp ?? 4}`, { fontSize:'12px', fontFamily:'monospace', fontStyle:'bold', color:'#4499ff' }));
    y += 22;

    // Divider
    const div2 = this.add.graphics();
    div2.lineStyle(1, 0x1e1e33, 1); div2.lineBetween(dx + 10, y, dx + dw - 10, y);
    this.detCon.add(div2);
    y += 6;

    this.detCon.add(this.add.text(cx, y, 'EQUIPMENT', { fontSize:'9px', fontFamily:'monospace', color:'#333355' }).setOrigin(0.5));
    y += 14;

    // Equipment slots (2 columns)
    const halfSlots = Math.ceil(SLOTS.length / 2);
    SLOTS.forEach((slot, i) => {
      const col = i < halfSlots ? 0 : 1;
      const row = i < halfSlots ? i : i - halfSlots;
      const ex = col === 0 ? dx + 10 : col2x - 4;
      const ey = y + row * 26;
      const item = unit.equip[slot];
      const rlvl = item?.reinforceLevel ?? 0;

      this.detCon.add(this.add.text(ex, ey, slot.toUpperCase(), { fontSize:'8px', fontFamily:'monospace', color:'#334455' }));
      this.detCon.add(this.add.text(ex, ey + 11, item ? item.name + (rlvl ? ` ✦${rlvl}` : '') : '—', {
        fontSize: '10px', fontFamily: 'monospace', color: item ? (rlvl ? '#ffaa44' : '#aabbcc') : '#2a2a3a',
      }));

      if (item) {
        const unEqBtn = this.add.text(ex + (col2x - dx - 30), ey + 11, '✕', {
          fontSize: '10px', fontFamily: 'monospace', color: '#553333',
        }).setInteractive({ useHandCursor: true });
        unEqBtn.on('pointerover', () => unEqBtn.setColor('#ff6666'));
        unEqBtn.on('pointerout',  () => unEqBtn.setColor('#553333'));
        unEqBtn.on('pointerdown', () => { state.inventory.push(item); unit.equip[slot] = null; this.rebuild(); });
        this.detCon.add(unEqBtn);
      }
    });

    y += halfSlots * 26 + 6;

    // Divider
    const div3 = this.add.graphics();
    div3.lineStyle(1, 0x1e1e33, 1); div3.lineBetween(dx + 10, y, dx + dw - 10, y);
    this.detCon.add(div3);
    y += 6;

    // ── Playbook baseline (Attack + Throw) ────────────────────────────────
    this.detCon.add(this.add.text(cx, y, 'PLAYBOOK', { fontSize:'9px', fontFamily:'monospace', color:'#333355' }).setOrigin(0.5));
    y += 14;
    for (const base of [ATTACK, THROW]) {
      this.detCon.add(this.add.text(dx + 14, y, `${base.icon}  ${base.name}`, { fontSize:11, fontFamily:'monospace', color:'#8899bb' }));
      this.detCon.add(this.add.text(dx + dw - 14, y, `Free  ·  ${base.desc}`, {
        fontSize: '9px', fontFamily: 'monospace', color: '#445566',
      }).setOrigin(1, 0));
      y += 20;
    }
    y += 6;

    // ── Specials (SP-cost, always available once known) ──────────────────
    this.detCon.add(this.add.text(cx, y, 'SPECIALS  (SP)', { fontSize:'9px', fontFamily:'monospace', color:'#333355' }).setOrigin(0.5));
    y += 14;
    const specials = getUnitSpecials(unit);
    if (!specials.length) {
      this.detCon.add(this.add.text(cx, y, '— none yet —', { fontSize:'9px', fontFamily:'monospace', color:'#2a2a3a' }).setOrigin(0.5));
      y += 18;
    }
    specials.forEach(ab => {
      this.detCon.add(this.add.text(dx + 14, y, `${ab.icon}  ${ab.name}`, { fontSize:11, fontFamily:'monospace', color:'#8899bb' }));
      this.detCon.add(this.add.text(dx + dw - 14, y, `${ab.cost} SP  ·  ${ab.desc}`, {
        fontSize: '9px', fontFamily: 'monospace', color: '#445566',
      }).setOrigin(1, 0));
      y += 20;
    });
    y += 6;

    // ── Skills (cooldown, slot-free — always usable once known) ──────────
    this.detCon.add(this.add.text(cx, y, 'SKILLS  (cooldown)', { fontSize:'9px', fontFamily:'monospace', color:'#333355' }).setOrigin(0.5));
    y += 14;
    const skills = getUnitSkills(unit);
    if (!skills.length) {
      this.detCon.add(this.add.text(cx, y, '— none yet —', { fontSize:'9px', fontFamily:'monospace', color:'#2a2a3a' }).setOrigin(0.5));
      y += 18;
    }
    skills.forEach(ab => {
      this.detCon.add(this.add.text(dx + 14, y, `${ab.icon}  ${ab.name}`, { fontSize:11, fontFamily:'monospace', color:'#8899bb' }));
      this.detCon.add(this.add.text(dx + dw - 14, y, `CD ${ab.cooldown}  ·  ${ab.desc}`, {
        fontSize: '9px', fontFamily: 'monospace', color: '#445566',
      }).setOrigin(1, 0));
      y += 20;
    });
    y += 6;

    // ── Class Skills (passives — equip up to 3 slots) ─────────────────────
    this.detCon.add(this.add.text(cx, y, 'CLASS SKILLS  (passive — tap a slot to change)', { fontSize:'9px', fontFamily:'monospace', color:'#333355' }).setOrigin(0.5));
    y += 14;

    const pool = getUnitPassivePool(unit);
    const slotCount = classSkillSlotCount(unit.level);
    if (!unit.classSkills) unit.classSkills = [];

    if (!pool.length) {
      this.detCon.add(this.add.text(cx, y, '— no passives known yet —', { fontSize:'9px', fontFamily:'monospace', color:'#2a2a3a' }).setOrigin(0.5));
      y += 18;
    }

    for (let i = 0; i < CLASS_SKILL_SLOT_LEVELS.length; i++) {
      const unlocked = i < slotCount;
      const sy = y;

      if (!unlocked) {
        this.detCon.add(this.add.text(dx + 14, sy, `🔒  Slot unlocks at Lv.${CLASS_SKILL_SLOT_LEVELS[i]}`, {
          fontSize: '10px', fontFamily: 'monospace', color: '#333344',
        }));
        y += 20;
        continue;
      }

      const equippedId = unit.classSkills[i] ?? null;
      const ab = pool.find(a => a.id === equippedId) ?? null;

      const rowBg = this.add.graphics();
      const drawRow = (h) => {
        rowBg.clear();
        if (h && pool.length) { rowBg.fillStyle(0x14142a, 1); rowBg.fillRect(dx + 10, sy - 3, dw - 20, 20); }
      };
      drawRow(false);
      this.detCon.add(rowBg);

      const label = ab ? `${ab.icon}  ${ab.name}` : '—  empty —';
      this.detCon.add(this.add.text(dx + 14, sy, label, { fontSize:11, fontFamily:'monospace', color: ab ? '#8899bb' : '#444455' }));
      if (ab) {
        this.detCon.add(this.add.text(dx + dw - 14, sy, ab.desc, {
          fontSize: '9px', fontFamily: 'monospace', color: '#445566',
        }).setOrigin(1, 0));
      }

      if (pool.length) {
        const slotIndex = i;
        const z = this.add.zone(cx, sy + 7, dw - 20, 20).setInteractive({ useHandCursor: true });
        z.on('pointerover', () => drawRow(true));
        z.on('pointerout',  () => drawRow(false));
        z.on('pointerdown', () => {
          const usedElsewhere = new Set(unit.classSkills.filter((id, idx) => idx !== slotIndex && id));
          const options = [null, ...pool.map(a => a.id).filter(id => !usedElsewhere.has(id))];
          const curIdx = options.indexOf(unit.classSkills[slotIndex] ?? null);
          const nextId = options[(curIdx + 1) % options.length];
          equipPassive(unit, slotIndex, nextId);
          this.rebuild();
        });
        this.detCon.add(z);
      }

      y += 20;
    }
  }

  // Promotion is optional/deferrable (see LevelUpScene for the same flow,
  // triggered right after a level-up) — this lets a unit promote later,
  // any time after the tier threshold, from the Party screen instead.
  buildPromoChooser(unit, dx, dw, cx, y) {
    const cancel = () => { this.promoStep = null; this.rebuild(); };

    if (this.promoStep === 'prompt') {
      const chain = chainById(unit.chainId);
      const branching = this.promoTier === 't3' && t3SportOptions(unit).length > 1;
      const destSportId = branching ? null : (this.promoTier === 't2' ? chain.t2 : chain.t3[0]);
      const destSport = destSportId ? sportById(destSportId) : null;

      this.detCon.add(this.add.text(cx, y, `Promote to ${destSport ? destSport.name : 'a new sport'}?`, {
        fontSize: '13px', fontFamily: 'monospace', fontStyle: 'bold', color: '#ffcc66',
      }).setOrigin(0.5));
      y += 24;
      this.detCon.add(this.add.text(cx, y, 'Promoting swaps in the new sport\'s abilities.', {
        fontSize: '9px', fontFamily: 'monospace', color: '#887755',
      }).setOrigin(0.5));
      y += 30;

      this.promoButton(dx, dw, cx, y, 'PROMOTE', () => {
        this.promoStep = branching ? 'sport' : 'role';
        this.rebuild();
      });
      y += 34;
      this.promoButton(dx, dw, cx, y, 'CANCEL', cancel, true);
      return;
    }

    if (this.promoStep === 'sport') {
      this.detCon.add(this.add.text(cx, y, 'CHOOSE YOUR SPORT', {
        fontSize: '12px', fontFamily: 'monospace', fontStyle: 'bold', color: '#ffcc66',
      }).setOrigin(0.5));
      y += 26;
      for (const sportId of t3SportOptions(unit)) {
        const sport = sportById(sportId);
        this.promoButton(dx, dw, cx, y, `${sport.name}  (${sport.roles.map(r => r.name).join(' / ')})`, () => {
          this.promoSport = sportId;
          this.promoStep = 'role';
          this.rebuild();
        });
        y += 34;
      }
      this.promoButton(dx, dw, cx, y, 'CANCEL', cancel, true);
      return;
    }

    if (this.promoStep === 'role') {
      const chain = chainById(unit.chainId);
      const sportId = this.promoTier === 't2' ? chain.t2 : (this.promoSport ?? chain.t3[0]);
      const sport = sportById(sportId);
      this.detCon.add(this.add.text(cx, y, `CHOOSE YOUR ROLE — ${sport.name}`, {
        fontSize: '12px', fontFamily: 'monospace', fontStyle: 'bold', color: '#ffcc66',
      }).setOrigin(0.5));
      y += 26;
      for (const role of sport.roles) {
        this.promoButton(dx, dw, cx, y, `${role.name}  (${role.designations.join('/')})`, () => {
          promoteUnit(unit, this.promoTier, role.id, this.promoSport ?? undefined);
          this.promoStep = null; this.promoTier = null; this.promoSport = null;
          this.rebuild();
        });
        y += 34;
      }
      this.promoButton(dx, dw, cx, y, 'CANCEL', cancel, true);
    }
  }

  promoButton(dx, dw, cx, y, label, onClick, muted = false) {
    const bw = dw - 40, bh = 26;
    const g = this.add.graphics();
    const draw = (h) => {
      g.clear();
      g.fillStyle(h ? 0x2a1f10 : 0x1a1408, 1);
      g.fillRoundedRect(cx - bw / 2, y - bh / 2, bw, bh, 5);
      if (!muted) { g.lineStyle(1, h ? 0xffaa44 : 0x664422, 1); g.strokeRoundedRect(cx - bw / 2, y - bh / 2, bw, bh, 5); }
    };
    draw(false);
    this.detCon.add(g);
    this.detCon.add(this.add.text(cx, y, label, {
      fontSize: '11px', fontFamily: 'monospace', fontStyle: 'bold', color: muted ? '#887766' : '#ffddaa',
    }).setOrigin(0.5));
    const z = this.add.zone(cx, y, bw, bh).setInteractive({ useHandCursor: true });
    z.on('pointerover', () => draw(true));
    z.on('pointerout',  () => draw(false));
    z.on('pointerdown', onClick);
    this.detCon.add(z);
  }
}
