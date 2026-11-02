import Phaser from 'phaser';
import { state, refreshAcademyTasks, turnInAcademyTask } from '../data/gameState.js';
import { getItem } from '../data/items.js';
import { mount, unmount, onClick, esc } from '../ui/domUI.js';

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
    refreshAcademyTasks(this.nodeId);
    this.render();
    this.events.once('shutdown', unmount);
  }

  cardHTML(task, i) {
    if (!task) return '<div class="ui-quest-card"><div class="ui-empty-note">No task available</div></div>';
    const item = getItem(task.itemId);
    const have = state.inventory.filter(it => it.id === task.itemId).length;
    const ready = have >= task.qty;
    return `
      <div class="ui-quest-card ${ready ? 'ready' : ''}">
        <div class="ui-quest-name">${esc(task.targetName)}</div>
        <div class="ui-quest-text">Bring ${task.qty}× ${esc(item?.name ?? task.itemId)}</div>
        <div class="ui-quest-text ${ready ? 'ok' : ''}">You have: ${have} / ${task.qty}</div>
        <div class="ui-quest-reward">Reward: +${task.reward} Tytrate</div>
        <button class="ui-action-btn" data-turn-in="${i}" ${ready ? '' : 'disabled'}>${ready ? 'Turn In' : 'Not Enough Yet'}</button>
      </div>`;
  }

  render() {
    const board = state.academyTasks[this.nodeId] ?? [];
    mount(`
      <div class="ui-screen ui-index">
        <div class="ui-topbar">
          <button class="ui-navbtn" data-nav="back">◀ Back</button>
          <div class="ui-title">Task Board</div>
          <div style="width:90px;"></div>
        </div>
        <div class="ui-quest-list" data-scroll-id="tasks">${board.map((t, i) => this.cardHTML(t, i)).join('')}</div>
      </div>
    `);
    onClick('[data-nav="back"]', () => this.scene.start('HubScene', this.hubData));
    onClick('[data-turn-in]', (e, node) => { turnInAcademyTask(this.nodeId, Number(node.dataset.turnIn)); this.render(); });
  }
}
