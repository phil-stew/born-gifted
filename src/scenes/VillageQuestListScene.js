import Phaser from 'phaser';
import { state } from '../data/gameState.js';
import { mount, unmount, onClick, esc } from '../ui/domUI.js';

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
    this.render();
    this.events.once('shutdown', unmount);
  }

  cardHTML(q) {
    const mastered = q.id === 'M0a' && (state.party[0]?.level ?? 1) >= 30 && state.completedMissions.includes('M0a');
    const accepted = state.questAccepted[q.id];
    const everCompleted = state.completedMissions.includes(q.id);
    let action;
    if (mastered) action = '<div class="ui-quest-status ok">Mastered</div>';
    else if (accepted) action = '<div class="ui-quest-status ok">Accepted — head to the map!</div>';
    else action = `<button class="ui-action-btn" data-accept="${q.id}">${everCompleted ? 'Re-Accept' : 'Accept'}</button>`;
    return `
      <div class="ui-quest-card ${accepted || mastered ? 'ready' : ''}">
        <div class="ui-quest-name">${esc(q.name)}</div>
        <div class="ui-quest-text">${esc(q.body)}</div>
        ${action}
      </div>`;
  }

  render() {
    const known = VILLAGE_QUESTS.filter(q => state.unlockedMissions.includes(q.id));
    mount(`
      <div class="ui-screen">
        <div class="ui-topbar">
          <button class="ui-navbtn" data-nav="back">◀ Back</button>
          <div class="ui-title">Quest Menu</div>
          <div style="width:90px;"></div>
        </div>
        <div class="ui-quest-list" data-scroll-id="village-quests">
          ${known.length ? known.map(q => this.cardHTML(q)).join('') : '<div class="ui-empty-note">No quests posted yet.</div>'}
        </div>
      </div>
    `);
    onClick('[data-nav="back"]', () => this.scene.start('HubScene', this.hubData));
    onClick('[data-accept]', (e, node) => { state.questAccepted[node.dataset.accept] = true; this.render(); });
  }
}
