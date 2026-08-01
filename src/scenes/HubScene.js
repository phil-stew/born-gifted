import Phaser from 'phaser';
import { state, MAX_ROSTER_SIZE } from '../data/gameState.js';
import { BACKDROPS } from '../data/storyBackdrops.js';
import { HUB_CONFIGS } from '../data/hubConfigs.js';
import { drawButton } from '../ui/canvasButton.js';
import { playMusic } from '../audio/music.js';

// Sirblanc/Hidden Village is Reno's home town — once the player has left it
// (M1 cleared), revisiting the hub uses a photo backdrop instead of the
// vector illustration. Every academy hub uses the school backdrop.
// Gale/Zester (2026-07-18 audit, "these for Gale region") — castle.png/
// snowbuilds.png existed on disk with no caller; Gale's hub was falling
// back to the generic vector illustration exactly the way Lametus
// Capital did before it got fixed the same way.
const TOWN_BACKDROP = {
  'Hidden Village':   BACKDROPS.villageRevisit,
  'Lametus Capital':  BACKDROPS.lametusTown,
  'Gale':             BACKDROPS.galeCastle,
  'Zester':           BACKDROPS.galeTown,
};

export class HubScene extends Phaser.Scene {
  constructor() { super({ key: 'HubScene' }); }

  init(data) {
    this.nodeId  = data.nodeId  ?? null;
    const config = HUB_CONFIGS[this.nodeId] ?? {};
    this.hubType = data.type    ?? config.type    ?? 'town';
    this.hubName = data.name    ?? config.name    ?? 'Town';
    this.shopId  = data.shopId  ?? config.shopId  ?? 'generic';
    this.services = config.services ?? ['shop'];
    this.backdrop = this.hubType === 'academy' ? BACKDROPS.school
      : this.hubType === 'capital' ? BACKDROPS.capital
      : TOWN_BACKDROP[this.hubName];
  }

  preload() {
    if (this.backdrop && !this.textures.exists(this.backdrop.key)) {
      this.load.image(this.backdrop.key, this.backdrop.path);
    }
  }

  get hubData() {
    return { nodeId: this.nodeId, type: this.hubType, name: this.hubName, shopId: this.shopId };
  }

  create() {
    const { width, height } = this.scale;
    const artH = height * 0.58;

    playMusic(this, 'hub');

    const bg = this.add.graphics();
    bg.fillStyle(0x07080f, 1);
    bg.fillRect(0, 0, width, height);
    bg.fillStyle(this.hubType === 'academy' ? 0x0a0c18 : 0x080e08, 1);
    bg.fillRect(0, 0, width, artH);

    if (this.backdrop && this.textures.exists(this.backdrop.key)) {
      const img = this.add.image(width / 2, artH / 2, this.backdrop.key);
      const scale = Math.max(width / img.width, artH / img.height);
      img.setScale(scale);
      const mask = this.add.graphics();
      mask.fillRect(0, 0, width, artH);
      img.setMask(mask.createGeometryMask());
      this.add.rectangle(width / 2, artH / 2, width, artH, 0x05050a, 0.28);
    } else {
      this.drawIllustration(bg, width, height);
    }

    this.add.text(width / 2, 20, this.hubName.toUpperCase(), {
      fontSize: '20px', fontFamily: 'monospace', fontStyle: 'bold',
      color: this.hubType === 'academy' ? '#aaaaff' : '#ffcc66',
    }).setOrigin(0.5);

    this.add.text(width / 2, 46, this.hubType === 'academy' ? '— Academy City —' : '— Town —', {
      fontSize: '11px', fontFamily: 'monospace', color: '#555566',
    }).setOrigin(0.5);

    // Leave, moved out of the services row into the header (2026-07-11,
    // "have the back button at top of menues") — was the last tile in the
    // bottom services row (drawButtons), same style/position every other
    // menu's back button just moved to.
    drawButton(this, {
      x: 55, y: 20, w: 90, h: 28, label: '◀ LEAVE',
      fontSize: '12px', radius: 6,
      bg: 0x0c0c1a, bgHover: 0x111130, border: 0x223366, accent: 0x5577bb,
      textColor: '#5577bb', textHoverColor: '#ffffff',
      onClick: () => {
        this.cameras.main.fadeOut(300, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('WorldMapScene'));
      },
    });

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
    // Forge unlock: interim gate on "reached the Capital" (M3 is a hub node
    // now, not a battle, so it never lands in completedMissions) — the
    // Capital quest-stage machine will refine this further.
    const forgeUnlocked = state.unlockedMissions.includes('M3');
    // Handbook is only granted once the Capital questline hands it over
    // (Phase 3's 'exam_ready' transition) — gated here rather than removed
    // from HUB_CONFIGS.M3.services so the button's "locked" state can show
    // players it exists before they've earned it.
    const handbookUnlocked = ['exam_ready', 'done'].includes(state.capitalQuest);
    // Repeatable academy recruiting (2026-07-08 feedback) only opens up once
    // the exam is actually won, and closes again once the roster hits its cap.
    const recruitUnlocked = state.capitalQuest === 'done';
    const rosterFull = state.party.length >= MAX_ROSTER_SIZE;
    const SERVICE_DEFS = {
      shop:  { key: 'Shop',  icon: '🛒', desc: 'Buy & sell items',      locked: false },
      forge: { key: 'Forge', icon: '⚒',  desc: forgeUnlocked ? 'Reinforce equipment' : 'Visit the Capital to unlock', locked: !forgeUnlocked },
      handbook: { key: 'Handbook', icon: '📖', desc: handbookUnlocked ? 'Elements, designations, glossary' : 'Finish the exam questline to unlock', locked: !handbookUnlocked },
      taskList:  { key: 'Tasks',  icon: '📋', desc: 'Fetch quests for Tytrate', locked: false },
      questList: { key: 'Quests', icon: '⚑',  desc: 'Story quest progress',     locked: false },
      recruit: { key: 'Recruit', icon: '🎓', desc: !recruitUnlocked ? 'Finish the exam questline to unlock' : rosterFull ? `Roster full (${MAX_ROSTER_SIZE}/${MAX_ROSTER_SIZE})` : `Recruit a new teammate (${state.party.length}/${MAX_ROSTER_SIZE})`, locked: !recruitUnlocked || rosterFull },
      // Distinct key from the Academy's 'Quests' (routes to a different
      // scene) but displays the same "QUESTS" label — see `label` override
      // below and the routing dispatch in drawButtons' pointerdown handler.
      villageQuests: { key: 'VillageQuests', label: 'Quests', icon: '⚑', desc: 'Accept side quests', locked: false },
    };
    // 'Leave' no longer appended here (2026-07-11) — moved to its own
    // header button in create(), see the "have the back button at top of
    // menues" comment there.
    const services = this.services.map(key => SERVICE_DEFS[key]).filter(Boolean);

    // Button width shrinks to fit as more services get added to a hub (M3
    // has up to 4, A1/A2 up to 5 with Recruit) — fixed 210px only ever fit 3.
    const gap = 16, maxRowW = width - 40;
    const btnW = Math.min(210, Math.floor((maxRowW - gap * (services.length - 1)) / services.length));
    const btnH = 60;
    const totalW = services.length * (btnW + gap) - gap;
    let bx = (width - totalW) / 2;
    const by = height * 0.64;

    const COLORS = {
      Shop:     { idle: 0x0b180d, hover: 0x112215, border: 0x1e6630, text: '#44bb66' },
      Forge:    { idle: 0x190d06, hover: 0x251408, border: 0x7a3c15, text: '#cc7733' },
      Handbook: { idle: 0x0d0d1e, hover: 0x14142c, border: 0x554488, text: '#bb99ee' },
      Tasks:    { idle: 0x0d1418, hover: 0x142028, border: 0x336677, text: '#66aacc' },
      Quests:   { idle: 0x18140d, hover: 0x282013, border: 0x776633, text: '#ddbb66' },
      VillageQuests: { idle: 0x18140d, hover: 0x282013, border: 0x776633, text: '#ddbb66' },
      Recruit:  { idle: 0x0d1a12, hover: 0x14281c, border: 0x22884a, text: '#55dd88' },
    };

    for (const svc of services) {
      const c = COLORS[svc.key];
      const locked = svc.locked ?? false;
      const myBx = bx; // capture this button's own x — `bx` mutates as the loop continues
      const shadow = this.add.graphics();
      shadow.fillStyle(0x000000, 0.3);
      shadow.fillRoundedRect(myBx + 2, by + 3, btnW, btnH, 8);
      const gfx = this.add.graphics();
      const draw = (hover) => {
        gfx.clear();
        gfx.fillStyle(locked ? 0x0a0a0a : (hover ? c.hover : c.idle), 1);
        gfx.fillRoundedRect(myBx, by, btnW, btnH, 8);
        gfx.lineStyle(1.5, locked ? 0x222222 : c.border, 1);
        gfx.strokeRoundedRect(myBx, by, btnW, btnH, 8);
        if (!locked && hover) { gfx.fillStyle(c.border, 0.9); gfx.fillRoundedRect(myBx, by, 4, btnH, 2); }
      };
      draw(false);

      const displayLabel = (svc.label ?? svc.key).toUpperCase();
      this.add.text(myBx + btnW / 2, by + 14, locked ? `🔒  ${displayLabel}` : `${svc.icon}  ${displayLabel}`, {
        fontSize: '15px', fontFamily: 'monospace', fontStyle: 'bold', color: locked ? '#333344' : c.text,
      }).setOrigin(0.5, 0);
      this.add.text(myBx + btnW / 2, by + 36, svc.desc, {
        fontSize: '10px', fontFamily: 'monospace', color: locked ? '#2a2a33' : '#445566',
      }).setOrigin(0.5, 0);

      if (!locked) {
        const zone = this.add.zone(myBx + btnW / 2, by + btnH / 2, btnW, btnH)
          .setInteractive({ useHandCursor: true });
        zone.on('pointerover',  () => draw(true));
        zone.on('pointerout',   () => draw(false));
        zone.on('pointerdown',  () => {
          this.cameras.main.fadeOut(300, 0, 0, 0);
          this.cameras.main.once('camerafadeoutcomplete', () => {
            if (svc.key === 'Shop')  this.scene.start('ShopScene',  { shopId: this.shopId, hubData: this.hubData });
            else if (svc.key === 'Forge') this.scene.start('ForgeScene', { hubData: this.hubData });
            else if (svc.key === 'Handbook') this.scene.start('HandbookScene', { hubData: this.hubData });
            else if (svc.key === 'Tasks')  this.scene.start('AcademyTaskListScene',  { nodeId: this.nodeId, hubData: this.hubData });
            else if (svc.key === 'Quests') this.scene.start('AcademyQuestListScene', { nodeId: this.nodeId, hubData: this.hubData });
            else if (svc.key === 'VillageQuests') this.scene.start('VillageQuestListScene', { hubData: this.hubData });
            else if (svc.key === 'Recruit') this.scene.start('RecruitClassScene', {
              newRecruit: true, sportClass: HUB_CONFIGS[this.nodeId]?.recruitPool,
              nextScene: 'HubScene', nextSceneData: { nodeId: this.nodeId },
            });
            // No trailing else — every SERVICE_DEFS key above (7 total) has
            // its own branch; 'Leave' (the old implicit fallback target)
            // moved to its own header button in create() and is no longer
            // part of this loop at all.
          });
        });
      }

      bx += btnW + gap;
    }
  }
}
