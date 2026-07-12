import Phaser from 'phaser';
import { state, getAcademyQuests } from '../data/gameState.js';
import { drawButton } from '../ui/canvasButton.js';

// Academy quest list (Phase 7, M0-M4 redesign) — hand-authored story quests,
// as opposed to the randomly generated task board (AcademyTaskListScene).
// Built generically off getAcademyQuests(nodeId) so future quests just need
// a new QUEST_DEFS entry in gameState.js, not a new scene.
//
// Accept button (2026-07-11, Hilbert Academy's 3 quests) — a quest with a
// `missionId` needs an explicit accept before its map node will start a
// battle (state.questAccepted gate, same one M0a/M0b use via
// VillageQuestListScene). kill_king_wolf has no missionId and keeps its
// original plain IN PROGRESS/COMPLETE look, unaffected.
export class AcademyQuestListScene extends Phaser.Scene {
  constructor() { super({ key: 'AcademyQuestListScene' }); }

  init(data) {
    this.nodeId  = data.nodeId;
    this.hubData = data.hubData ?? { nodeId: this.nodeId };
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

    this.add.text(width / 2, 20, 'QUEST LIST', {
      fontSize: '16px', fontFamily: 'monospace', fontStyle: 'bold', color: '#aaaacc',
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

    const quests = getAcademyQuests(this.nodeId);
    const lw = 420, lx = (width - lw) / 2, startY = 70;

    if (!quests.length) {
      this.listCon.add(this.add.text(width / 2, startY + 40, 'No quests posted yet.', {
        fontSize: '12px', fontFamily: 'monospace', color: '#2a2a3a',
      }).setOrigin(0.5));
      return;
    }

    quests.forEach((q, i) => {
      const qy = startY + i * 56;
      const needsAccept = !!q.missionId;

      const shadow = this.add.graphics();
      shadow.fillStyle(0x000000, 0.3);
      shadow.fillRoundedRect(lx + 2, qy + 3, lw, 46, 8);
      this.listCon.add(shadow);

      const panel = this.add.graphics();
      panel.fillStyle(0x0b0b18, 1);
      panel.fillRoundedRect(lx, qy, lw, 46, 8);
      panel.lineStyle(1.5, q.done ? 0x44aa66 : 0x1e1e33, 1);
      panel.strokeRoundedRect(lx, qy, lw, 46, 8);
      this.listCon.add(panel);

      this.listCon.add(this.add.text(lx + 16, qy + 23, q.done ? '✔' : '○', {
        fontSize: '16px', fontFamily: 'monospace', color: q.done ? '#44aa66' : '#445566',
      }).setOrigin(0, 0.5));
      this.listCon.add(this.add.text(lx + 44, qy + 23, q.text, {
        fontSize: '13px', fontFamily: 'monospace', fontStyle: 'bold',
        color: q.done ? '#88dd99' : '#ccccdd',
      }).setOrigin(0, 0.5));

      if (q.done) {
        this.listCon.add(this.add.text(lx + lw - 16, qy + 23, 'COMPLETE', {
          fontSize: '10px', fontFamily: 'monospace', color: '#44aa66',
        }).setOrigin(1, 0.5));
      } else if (!needsAccept) {
        this.listCon.add(this.add.text(lx + lw - 16, qy + 23, 'IN PROGRESS', {
          fontSize: '10px', fontFamily: 'monospace', color: '#556677',
        }).setOrigin(1, 0.5));
      } else if (q.accepted) {
        this.listCon.add(this.add.text(lx + lw - 16, qy + 23, 'ACCEPTED — head to the map!', {
          fontSize: '10px', fontFamily: 'monospace', fontStyle: 'bold', color: '#66cc88',
        }).setOrigin(1, 0.5));
      } else {
        const btn = drawButton(this, {
          x: lx + lw - 64, y: qy + 23, w: 92, h: 28, label: 'ACCEPT',
          fontSize: '11px', radius: 6,
          bg: 0x180d06, bgHover: 0x251408, border: 0x7a3c15, accent: 0xffaa44,
          textColor: '#ffaa44', textHoverColor: '#ffffff',
          onClick: () => { state.questAccepted[q.missionId] = true; this.build(); },
        });
        this.listCon.add(btn.container);
      }
    });
  }
}
