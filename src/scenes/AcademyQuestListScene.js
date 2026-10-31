import Phaser from 'phaser';
import { state, getAcademyQuests } from '../data/gameState.js';
import { mount, unmount, onClick, esc } from '../ui/domUI.js';

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
    this.render();
    this.events.once('shutdown', unmount);
  }

  cardHTML(q) {
    let status;
    if (q.done) status = '<div class="ui-quest-status ok">Complete</div>';
    else if (!q.missionId) status = '<div class="ui-quest-status">In Progress</div>';
    else if (q.accepted) status = '<div class="ui-quest-status ok">Accepted — head to the map!</div>';
    else status = `<button class="ui-action-btn" data-accept="${esc(q.missionId)}">Accept</button>`;
    return `
      <div class="ui-quest-card ${q.done ? 'ready' : ''}">
        <div class="ui-quest-name">${q.done ? '✔' : '○'} ${esc(q.text)}</div>
        ${status}
      </div>`;
  }

  render() {
    const quests = getAcademyQuests(this.nodeId);
    mount(`
      <div class="ui-screen">
        <div class="ui-topbar">
          <button class="ui-navbtn" data-nav="back">◀ Back</button>
          <div class="ui-title">Quest List</div>
          <div style="width:90px;"></div>
        </div>
        <div class="ui-quest-list" data-scroll-id="quests">
          ${quests.length ? quests.map(q => this.cardHTML(q)).join('') : '<div class="ui-empty-note">No quests posted yet.</div>'}
        </div>
      </div>
    `);
    onClick('[data-nav="back"]', () => this.scene.start('HubScene', this.hubData));
    onClick('[data-accept]', (e, node) => { state.questAccepted[node.dataset.accept] = true; this.render(); });
  }
}
