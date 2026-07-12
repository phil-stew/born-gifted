import Phaser from 'phaser';
import {
  ELEMENT_CYCLE, ELEMENT_BEATS, elementIcon,
  DESIGNATION_CYCLE, DESIGNATION_NAMES, DESIGNATION_BEATS, DESIGNATION_ICONS,
} from '../data/gameState.js';
import { drawButton } from '../ui/canvasButton.js';

const GLOSSARY = [
  { term: 'Tier',        def: 'A monster or unit\'s power band (T1/T2/T3). Higher-tier monsters hit harder and have more HP.' },
  { term: 'Boss',        def: 'A mission-ending monster with sharply boosted stats (see Bosses below) and a name of its own.' },
  { term: 'Unique',      def: 'A rarer, mid-boosted monster with a randomly rolled name — encountered outside of a mission\'s final fight.' },
  { term: 'Designation', def: 'A unit or monster\'s combat role (Combat/Ranged/Defender/Support) — see the triangle below.' },
  { term: 'Talent',      def: 'One of 2 stat-growth picks made at character creation. Picking the same talent twice quadruples that stat\'s growth per level.' },
  { term: 'Class Skill',  def: 'A permanent passive buff, equipped into one of up to 3 slots unlocked at levels 5/10/20.' },
];

// Element weakness cycle + designation triangle + a short glossary — opened
// from the Capital hub once capitalQuest reaches 'exam_ready' (Phase 3/7,
// M0-M4 redesign). Almost entirely a presentation screen over data that
// already existed in gameState.js — no new game logic beyond the content.
export class HandbookScene extends Phaser.Scene {
  constructor() { super({ key: 'HandbookScene' }); }

  init(data) {
    this.hubData = data?.hubData ?? { nodeId: 'M3' };
  }

  create() {
    const { width, height } = this.scale;

    const bg = this.add.graphics();
    bg.fillStyle(0x07080f, 1);
    bg.fillRect(0, 0, width, height);
    bg.fillStyle(0x0c0c1a, 1);
    bg.fillRect(0, 0, width, 40);
    bg.lineStyle(1, 0x222244, 1);
    bg.lineBetween(0, 40, width, 40);

    this.add.text(width / 2, 20, 'HANDBOOK', {
      fontSize: '16px', fontFamily: 'monospace', fontStyle: 'bold', color: '#ffdd66',
    }).setOrigin(0.5);

    // Back button moved into the header (2026-07-11, "have the back button
    // at top of menues") — was bottom-left, now top-left alongside the title.
    drawButton(this, {
      x: 55, y: 20, w: 90, h: 28, label: '◀ BACK',
      fontSize: '12px', radius: 6,
      bg: 0x0c0c1a, bgHover: 0x111130, border: 0x223366, accent: 0x5577bb,
      textColor: '#5577bb', textHoverColor: '#ffffff',
      onClick: () => this.scene.start('HubScene', this.hubData),
    });

    this.buildElementWheel(70, 66);
    this.buildDesignationTriangle(width - 260, 66);
    this.buildGlossary(70, 350, width - 140);

    this.cameras.main.fadeIn(300, 0, 0, 0);
  }

  buildElementWheel(x, y) {
    const w = 220, h = 220;
    this.add.text(x + w / 2, y, 'ELEMENT WEAKNESSES', {
      fontSize: '12px', fontFamily: 'monospace', fontStyle: 'bold', color: '#aaaacc',
    }).setOrigin(0.5, 0);

    const cx = x + w / 2, cy = y + h / 2 + 6, r = 78;
    const n = ELEMENT_CYCLE.length;
    const gfx = this.add.graphics();
    gfx.lineStyle(2, 0x334466, 0.7);

    const pos = ELEMENT_CYCLE.map((_, i) => {
      const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
      return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
    });

    ELEMENT_CYCLE.forEach((el, i) => {
      const from = pos[i], to = pos[(i + 1) % n];
      gfx.beginPath();
      gfx.moveTo(from.x, from.y);
      gfx.lineTo(to.x, to.y);
      gfx.strokePath();
      // Arrowhead midway along the segment, pointing toward `to`.
      const mx = (from.x + to.x) / 2, my = (from.y + to.y) / 2;
      const ang = Math.atan2(to.y - from.y, to.x - from.x);
      gfx.fillStyle(0x4488cc, 0.9);
      gfx.fillTriangle(
        mx + 6 * Math.cos(ang), my + 6 * Math.sin(ang),
        mx + 6 * Math.cos(ang + 2.5), my + 6 * Math.sin(ang + 2.5),
        mx + 6 * Math.cos(ang - 2.5), my + 6 * Math.sin(ang - 2.5),
      );
    });

    ELEMENT_CYCLE.forEach((el, i) => {
      const p = pos[i];
      const dot = this.add.graphics();
      dot.fillStyle(0x14142a, 1);
      dot.fillCircle(p.x, p.y, 26);
      dot.lineStyle(1.5, 0x445577, 1);
      dot.strokeCircle(p.x, p.y, 26);
      this.add.text(p.x, p.y - 6, elementIcon(el), { fontSize: '16px' }).setOrigin(0.5);
      this.add.text(p.x, p.y + 14, el, { fontSize: '9px', fontFamily: 'monospace', color: '#aaaacc' }).setOrigin(0.5);
    });

    this.add.text(cx, y + h + 8, 'Beats the next element clockwise (1.5× dmg dealt, 0.8× dmg taken when beaten).', {
      fontSize: '9px', fontFamily: 'monospace', color: '#556677', wordWrap: { width: w + 20 }, align: 'center',
    }).setOrigin(0.5, 0);
  }

  buildDesignationTriangle(x, y) {
    const w = 240, h = 220;
    this.add.text(x + w / 2, y, 'DESIGNATION TRIANGLE', {
      fontSize: '12px', fontFamily: 'monospace', fontStyle: 'bold', color: '#aaaacc',
    }).setOrigin(0.5, 0);

    const cx = x + w / 2, cy = y + h / 2 + 10, r = 70;
    const n = DESIGNATION_CYCLE.length;
    const gfx = this.add.graphics();
    gfx.lineStyle(2, 0xaa5544, 0.7);

    const pos = DESIGNATION_CYCLE.map((_, i) => {
      const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
      return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
    });

    DESIGNATION_CYCLE.forEach((d, i) => {
      const from = pos[i], to = pos[(i + 1) % n];
      gfx.beginPath();
      gfx.moveTo(from.x, from.y);
      gfx.lineTo(to.x, to.y);
      gfx.strokePath();
      const mx = (from.x + to.x) / 2, my = (from.y + to.y) / 2;
      const ang = Math.atan2(to.y - from.y, to.x - from.x);
      gfx.fillStyle(0xcc6644, 0.9);
      gfx.fillTriangle(
        mx + 6 * Math.cos(ang), my + 6 * Math.sin(ang),
        mx + 6 * Math.cos(ang + 2.5), my + 6 * Math.sin(ang + 2.5),
        mx + 6 * Math.cos(ang - 2.5), my + 6 * Math.sin(ang - 2.5),
      );
    });

    DESIGNATION_CYCLE.forEach((d, i) => {
      const p = pos[i];
      const dot = this.add.graphics();
      dot.fillStyle(0x2a1414, 1);
      dot.fillCircle(p.x, p.y, 28);
      dot.lineStyle(1.5, 0x774433, 1);
      dot.strokeCircle(p.x, p.y, 28);
      this.add.text(p.x, p.y - 8, DESIGNATION_ICONS[d], { fontSize: '18px' }).setOrigin(0.5);
      this.add.text(p.x, p.y + 14, DESIGNATION_NAMES[d], { fontSize: '9px', fontFamily: 'monospace', color: '#ccaa99' }).setOrigin(0.5);
    });

    // Support sits outside the triangle, called out separately.
    this.add.text(cx, cy + r + 34, `${DESIGNATION_ICONS.S}  Support — outside the triangle, boosts/heals allies instead of fighting the cycle.`, {
      fontSize: '9px', fontFamily: 'monospace', color: '#556677', wordWrap: { width: w + 20 }, align: 'center',
    }).setOrigin(0.5, 0);
  }

  buildGlossary(x, y, w) {
    this.add.text(x, y, 'GLOSSARY', {
      fontSize: '12px', fontFamily: 'monospace', fontStyle: 'bold', color: '#aaaacc',
    });

    let gy = y + 22;
    const colW = w / 2 - 12;
    GLOSSARY.forEach((g, i) => {
      const col = i % 2, row = Math.floor(i / 2);
      const gx = x + col * (colW + 24);
      const rowY = gy + row * 46;
      this.add.text(gx, rowY, g.term, {
        fontSize: '11px', fontFamily: 'monospace', fontStyle: 'bold', color: '#ffcc88',
      });
      this.add.text(gx, rowY + 16, g.def, {
        fontSize: '9px', fontFamily: 'monospace', color: '#7788aa',
        wordWrap: { width: colW }, lineSpacing: 2,
      });
    });
  }
}
