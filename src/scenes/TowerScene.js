import Phaser from 'phaser';
import { state } from '../data/gameState.js';
import { mount, unmount, onClick, esc } from '../ui/domUI.js';
import {
  TOWER_FLOORS, towerFloorId, towerFloorsCleared, towerFloorLevel, towerFloorPlace, towerReward, isTowerBossFloor,
} from '../data/tower.js';

// Pick a floor of the Tower of Trials. Floors are climbed in order; cleared
// floors can be fought again, with no reward.
export class TowerScene extends Phaser.Scene {
  constructor() { super({ key: 'TowerScene' }); }

  create() {
    this.cleared = towerFloorsCleared(state);
    this.next = Math.min(TOWER_FLOORS, this.cleared + 1);
    this.selected = this.next;
    this.render();
    this.events.once('shutdown', unmount);
  }

  detailHTML(floor) {
    const place = towerFloorPlace(floor);
    const done = floor <= this.cleared;
    const rows = [
      ['Place', place.name],
      ['Weather', place.weatherName],
      ['Monster level', `${towerFloorLevel(floor)}${isTowerBossFloor(floor) ? ' + boss' : ''}`],
      ['Reward', done ? 'Already claimed' : `${towerReward(floor)} Tytrate`],
    ];
    return `
      <div class="ui-item-name">Floor ${floor}${isTowerBossFloor(floor) ? ' · Boss' : ''}</div>
      <div class="ui-item-desc">${done ? 'Cleared. You can fight it again for practice.' : 'Clear this floor to climb higher.'}</div>
      ${rows.map(([k, v]) => `<div class="ui-item-desc"><b>${k}:</b> ${esc(v)}</div>`).join('')}
      <button class="ui-action-btn" data-enter="${floor}">${done ? 'Fight Again' : 'Enter Floor'}</button>`;
  }

  render() {
    const floors = Array.from({ length: TOWER_FLOORS }, (_, i) => TOWER_FLOORS - i);
    mount(`
      <div class="ui-screen ui-index">
        <div class="ui-topbar">
          <button class="ui-navbtn" data-nav="back">◀ World Map</button>
          <div class="ui-title">TOWER OF TRIALS</div>
          <div class="ui-currency">${this.cleared} / ${TOWER_FLOORS}</div>
        </div>
        <div class="ui-body">
          <div class="ui-panel ui-list-panel" data-scroll-id="tower-floors">
            ${floors.map(f => {
              const open = f <= this.next;
              return `
                <div class="ui-row ui-skillbook-row ${f === this.selected ? 'active' : ''} ${open ? '' : 'disabled'}" ${open ? `data-floor="${f}"` : ''}>
                  <span class="ui-row-name">Floor ${f}${isTowerBossFloor(f) ? ' · Boss' : ''}</span>
                  ${f <= this.cleared ? '<span class="ui-skillbook-known">✓</span>' : ''}
                  ${open ? '' : '<span>🔒</span>'}
                </div>`;
            }).join('')}
          </div>
          <div class="ui-panel ui-detail-panel" data-scroll-id="tower-detail">${this.detailHTML(this.selected)}</div>
        </div>
      </div>
    `);

    onClick('[data-nav="back"]', () => this.scene.start('WorldMapScene'));
    onClick('[data-floor]', (e, node) => { this.selected = Number(node.dataset.floor); this.render(); });
    onClick('[data-enter]', (e, node) => {
      state.currentMission = towerFloorId(Number(node.dataset.enter));
      this.scene.start('BattleScene');
    });
  }
}
