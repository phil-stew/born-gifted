import Phaser from 'phaser';
import { state } from '../data/gameState.js';
import { HUB_CONFIGS } from '../data/hubConfigs.js';
import { NODES, isNodeOpen } from './WorldMapScene.js';
import { mount, unmount, onClick, esc } from '../ui/domUI.js';

// The side battles a hub currently offers. They replace the old map markers,
// so this follows the same unlock and quest-accepted rules those had.
export function hubBattles(nodeId) {
  return (HUB_CONFIGS[nodeId]?.battles ?? []).filter(isNodeOpen);
}

export class HubBattlesScene extends Phaser.Scene {
  constructor() { super({ key: 'HubBattlesScene' }); }

  init(data) {
    this.nodeId = data?.nodeId;
  }

  create() {
    const name = HUB_CONFIGS[this.nodeId]?.battlesTitle ?? `${HUB_CONFIGS[this.nodeId]?.name} Battles`;
    const cards = hubBattles(this.nodeId).map(id => {
      const node = NODES.find(n => n.id === id);
      const done = state.completedMissions.includes(id);
      return `
        <button class="ui-quest-card ${done ? 'ready' : ''}" data-battle="${id}">
          <div class="ui-quest-name">${esc(node.name)}</div>
          <div class="ui-quest-status ${done ? 'ok' : ''}">${done ? 'Cleared — tap to replay' : 'Tap to begin'}</div>
        </button>`;
    }).join('');
    mount(`
      <div class="ui-screen ui-index">
        <div class="ui-topbar">
          <button class="ui-navbtn" data-nav="back">◀ Back</button>
          <div class="ui-title">${esc(name)}</div>
          <div style="width:90px;"></div>
        </div>
        <div class="ui-quest-list" data-scroll-id="hub-battles">
          ${cards || '<div class="ui-empty-note">No battles here yet.</div>'}
        </div>
      </div>
    `);
    onClick('[data-nav="back"]', () => {
      if (HUB_CONFIGS[this.nodeId]?.services) this.scene.start('HubScene', { nodeId: this.nodeId });
      else this.scene.start('WorldMapScene');
    });
    onClick('[data-battle]', (e, el) => this.scene.start('WorldMapScene', { enterNode: el.dataset.battle }));
    this.events.once('shutdown', unmount);
  }
}
