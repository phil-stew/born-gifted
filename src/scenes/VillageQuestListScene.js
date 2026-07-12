import Phaser from 'phaser';
import { state } from '../data/gameState.js';
import { drawButton } from '../ui/canvasButton.js';

// Hidden Village Quest Menu (2026-07-07 feedback) — M0a (Hidden Cave) and
// M0b (Wolf's Den) both require accepting here before the map node will
// actually start a battle (see WorldMapScene's M0a/M0b click gating on
// state.questAccepted), and BOTH must be re-accepted after every
// completion, not just the first time — VictoryScene resets
// state.questAccepted[missionId] back to false on every win.
const VILLAGE_QUESTS = [
  {
    id: 'M0a', name: 'Hidden Cave',
    body: 'Ore veins run deep in the cave north of the village. Bring back what you can carry.',
  },
  {
    id: 'M0b', name: "Wolf's Den",
    body: 'Villagers have spotted a monstrous wolf prowling the old den to the north — bigger and fiercer than any seen before.',
  },
];

export class VillageQuestListScene extends Phaser.Scene {
  constructor() { super({ key: 'VillageQuestListScene' }); }

  init(data) {
    this.hubData = data?.hubData ?? { nodeId: 'M0' };
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

    this.add.text(width / 2, 20, 'QUEST MENU', {
      fontSize: '16px', fontFamily: 'monospace', fontStyle: 'bold', color: '#ffcc66',
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

    this.listCon = this.add.container(0, 0);
    this.build();

    this.cameras.main.fadeIn(300, 0, 0, 0);
  }

  build() {
    this.listCon.removeAll(true);
    const { width } = this.scale;

    const known = VILLAGE_QUESTS.filter(q => state.unlockedMissions.includes(q.id));
    const cardW = 420, cardH = 130, gap = 20;
    const startY = 64;

    if (!known.length) {
      this.listCon.add(this.add.text(width / 2, startY + 60, 'No quests posted yet.', {
        fontSize: '12px', fontFamily: 'monospace', color: '#2a2a3a',
      }).setOrigin(0.5));
      return;
    }

    known.forEach((q, i) => {
      const cx = (width - cardW) / 2;
      const cy = startY + i * (cardH + gap);

      const mastered = q.id === 'M0a' && (state.party[0]?.level ?? 1) >= 30 && state.completedMissions.includes('M0a');
      const accepted = state.questAccepted[q.id];
      const everCompleted = state.completedMissions.includes(q.id);

      const shadow = this.add.graphics();
      shadow.fillStyle(0x000000, 0.3);
      shadow.fillRoundedRect(cx + 2, cy + 3, cardW, cardH, 8);
      this.listCon.add(shadow);

      const panel = this.add.graphics();
      panel.fillStyle(0x0b0b18, 1);
      panel.fillRoundedRect(cx, cy, cardW, cardH, 8);
      panel.lineStyle(1.5, accepted || mastered ? 0x44aa66 : 0x1e1e33, 1);
      panel.strokeRoundedRect(cx, cy, cardW, cardH, 8);
      panel.fillStyle(0xffcc66, 0.5);
      panel.fillRoundedRect(cx, cy, cardW, 3, { tl: 8, tr: 8, bl: 0, br: 0 });
      this.listCon.add(panel);

      this.listCon.add(this.add.text(cx + 16, cy + 12, q.name, {
        fontSize: '14px', fontFamily: 'monospace', fontStyle: 'bold', color: '#ffddaa',
      }));
      this.listCon.add(this.add.text(cx + 16, cy + 34, q.body, {
        fontSize: '10px', fontFamily: 'monospace', color: '#8888aa',
        wordWrap: { width: cardW - 32 }, lineSpacing: 2,
      }));

      if (mastered) {
        this.listCon.add(this.add.text(cx + cardW / 2, cy + cardH - 20, 'MASTERED', {
          fontSize: '12px', fontFamily: 'monospace', fontStyle: 'bold', color: '#66aacc',
        }).setOrigin(0.5));
        return;
      }

      if (accepted) {
        this.listCon.add(this.add.text(cx + cardW / 2, cy + cardH - 20, 'ACCEPTED — head to the map!', {
          fontSize: '11px', fontFamily: 'monospace', fontStyle: 'bold', color: '#66cc88',
        }).setOrigin(0.5));
        return;
      }

      const label = everCompleted ? 'RE-ACCEPT' : 'ACCEPT';
      const btn = drawButton(this, {
        x: cx + cardW / 2, y: cy + cardH - 20, w: cardW - 32, h: 30, label,
        fontSize: '12px', radius: 6,
        bg: 0x180d06, bgHover: 0x251408, border: 0x7a3c15, accent: 0xffaa44,
        textColor: '#ffaa44', textHoverColor: '#ffffff',
        onClick: () => { state.questAccepted[q.id] = true; this.build(); },
      });
      this.listCon.add(btn.container);
    });
  }
}
