import Phaser from 'phaser';
import { state, refreshAcademyTasks, turnInAcademyTask } from '../data/gameState.js';
import { getItem } from '../data/items.js';
import { drawButton } from '../ui/canvasButton.js';

// Academy task board (Phase 7, M0-M4 redesign) — 2 rerolling fetch-quest
// slots per academy (A1/A2). Rerolls happen lazily, on open, rather than on
// a running timer — see refreshAcademyTasks() in gameState.js.
export class AcademyTaskListScene extends Phaser.Scene {
  constructor() { super({ key: 'AcademyTaskListScene' }); }

  init(data) {
    this.nodeId  = data.nodeId;
    this.hubData = data.hubData ?? { nodeId: this.nodeId };
  }

  create() {
    const { width, height } = this.scale;
    refreshAcademyTasks(this.nodeId);

    const bg = this.add.graphics();
    bg.fillStyle(0x07080f, 1);
    bg.fillRect(0, 0, width, height);
    bg.fillStyle(0x0c0c1a, 1);
    bg.fillRect(0, 0, width, 40);
    bg.lineStyle(1, 0x222244, 1);
    bg.lineBetween(0, 40, width, 40);

    this.add.text(width / 2, 20, 'TASK BOARD', {
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
    const board = state.academyTasks[this.nodeId] ?? [];

    const cardW = 320, cardH = 130, gap = 24;
    const totalW = board.length * cardW + (board.length - 1) * gap;
    let cx = (width - totalW) / 2;
    const cy = 70;

    board.forEach((task, i) => {
      const myCx = cx;
      const item = task ? getItem(task.itemId) : null;
      const have = task ? state.inventory.filter(it => it.id === task.itemId).length : 0;
      const ready = task && have >= task.qty;

      const shadow = this.add.graphics();
      shadow.fillStyle(0x000000, 0.3);
      shadow.fillRoundedRect(myCx + 2, cy + 3, cardW, cardH, 8);
      this.listCon.add(shadow);

      const panel = this.add.graphics();
      panel.fillStyle(0x0b0b18, 1);
      panel.fillRoundedRect(myCx, cy, cardW, cardH, 8);
      panel.lineStyle(1.5, ready ? 0x44aa66 : 0x1e1e33, 1);
      panel.strokeRoundedRect(myCx, cy, cardW, cardH, 8);
      panel.fillStyle(ready ? 0x44aa66 : 0x4455aa, 0.5);
      panel.fillRoundedRect(myCx, cy, cardW, 3, { tl: 8, tr: 8, bl: 0, br: 0 });
      this.listCon.add(panel);

      if (!task) {
        this.listCon.add(this.add.text(myCx + cardW / 2, cy + cardH / 2, 'No task available', {
          fontSize: '12px', fontFamily: 'monospace', color: '#2a2a3a',
        }).setOrigin(0.5));
        cx += cardW + gap;
        return;
      }

      this.listCon.add(this.add.text(myCx + 16, cy + 14, task.targetName, {
        fontSize: '13px', fontFamily: 'monospace', fontStyle: 'bold', color: '#ddddff',
      }));
      this.listCon.add(this.add.text(myCx + 16, cy + 36, `Bring ${task.qty}× ${item?.name ?? task.itemId}`, {
        fontSize: '12px', fontFamily: 'monospace', color: '#8888aa',
      }));
      this.listCon.add(this.add.text(myCx + 16, cy + 56, `You have: ${have} / ${task.qty}`, {
        fontSize: '11px', fontFamily: 'monospace', color: ready ? '#66cc88' : '#556677',
      }));
      this.listCon.add(this.add.text(myCx + 16, cy + 76, `Reward: +${task.reward} Tytrate`, {
        fontSize: '11px', fontFamily: 'monospace', color: '#ffdd66',
      }));

      const btn = drawButton(this, {
        x: myCx + cardW / 2, y: cy + cardH - 20, w: cardW - 32, h: 30, label: ready ? 'TURN IN' : 'NOT ENOUGH YET',
        fontSize: '12px', radius: 6,
        bg: ready ? 0x0b180d : 0x0a0a0a, bgHover: ready ? 0x112215 : 0x0a0a0a,
        border: ready ? 0x1e6630 : 0x222222, accent: 0x44bb66,
        textColor: ready ? '#44bb66' : '#333344', textHoverColor: '#ffffff',
        onClick: ready ? () => { turnInAcademyTask(this.nodeId, i); this.build(); } : null,
      });
      this.listCon.add(btn.container);

      cx += cardW + gap;
    });
  }
}
