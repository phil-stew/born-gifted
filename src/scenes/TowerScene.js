import Phaser from 'phaser';
import { state } from '../data/gameState.js';
import { mount, unmount, onClick, esc } from '../ui/domUI.js';
import {
  TOWER_TRACKS, RANDOM_CLIMBS, towerFloorCount, towerFloorId, towerFloorsCleared, towerFloorLevel, towerFloorPlace,
  towerFloorSummary, towerReward, isTowerBossFloor, startTowerClimb, abandonTowerClimb, settleTowerClimb,
} from '../data/tower.js';
import { prepareRandomTowerFloor } from './BattleScene.js';

// Pick a challenge and a floor of the Tower of Trials. Beasts and Humans climb
// floor by floor, and cleared floors can be fought again with no reward. Random
// is one climb of 30 or 60 floors that saves every 10.
export class TowerScene extends Phaser.Scene {
  constructor() { super({ key: 'TowerScene' }); }

  init() {
    this.track = TOWER_TRACKS[0].key;
  }

  create() {
    this.notice = settleTowerClimb() ? `You fell. Back to floor ${state.towerRun.floor}.` : '';
    if (this.notice) this.track = 'random';
    if (state.towerFinished) {
      this.notice = `You cleared all ${state.towerFinished} floors!`;
      state.towerFinished = null;
      this.track = 'random';
    }
    this.openTrack(this.track);
    this.events.once('shutdown', unmount);
  }

  openTrack(track) {
    this.track = track;
    this.floors = towerFloorCount(track);
    this.cleared = towerFloorsCleared(state, track);
    this.next = Math.min(this.floors, this.cleared + 1);
    this.selected = this.next;
    this.render();
  }

  // Only Beasts floors have a named boss; Humans come as five equals.
  bossLabel(floor) {
    return isTowerBossFloor(floor) && this.track === 'beast' ? ' · Boss' : '';
  }

  detailHTML(floor) {
    const place = towerFloorPlace(floor);
    const done = floor <= this.cleared;
    const rows = [
      ['Enemies', towerFloorSummary(this.track, floor)],
      ['Place', place.name],
      ['Weather', place.weatherName],
      ['Level', `${towerFloorLevel(floor)}${this.bossLabel(floor) ? ' + boss' : ''}`],
      ['Reward', done ? 'Already claimed' : `${towerReward(floor)} Tytrate`],
    ];
    return `
      <div class="ui-item-name">Floor ${floor}${this.bossLabel(floor)}</div>
      ${rows.map(([k, v]) => `<div class="ui-tower-row"><b>${k}:</b> ${esc(v)}</div>`).join('')}
      <button class="ui-action-btn" data-enter="${floor}">${done ? 'Fight Again' : 'Enter Floor'}</button>`;
  }

  floorListHTML() {
    const floors = Array.from({ length: this.floors }, (_, i) => this.floors - i);
    return floors.map(f => {
      const open = f <= this.next;
      return `
        <div class="ui-row ui-skillbook-row ${f === this.selected ? 'active' : ''} ${open ? '' : 'disabled'}" ${open ? `data-floor="${f}"` : ''}>
          <span class="ui-row-name">Floor ${f}${this.bossLabel(f)}</span>
          ${f <= this.cleared ? '<span class="ui-skillbook-known">✓</span>' : ''}
          ${open ? '' : '<span>🔒</span>'}
        </div>`;
    }).join('');
  }

  // Random has no floor list: the floors are unknown until you reach them.
  randomHTML() {
    const run = state.towerRun;
    const note = this.notice ? `<div class="ui-tower-row"><b>${esc(this.notice)}</b></div>` : '';
    if (!run) {
      return `
        <div class="ui-item-name">Random Climb</div>
        ${note}
        <div class="ui-item-desc">Monsters, humans, affinity, weather and maps are all random. Saves every 10 floors: a defeat sends you back to your last save.</div>
        ${RANDOM_CLIMBS.map(n => `<button class="ui-action-btn ui-tower-climb" data-climb="${n}">Climb ${n} Floors</button>`).join('')}`;
    }
    const first = !state.completedMissions.includes(towerFloorId('random', run.floor));
    return `
      <div class="ui-item-name">Floor ${run.floor} of ${run.target}</div>
      ${note}
      <div class="ui-tower-row"><b>Last save:</b> ${run.saved ? `Floor ${run.saved}` : 'Start'}</div>
      <div class="ui-tower-row"><b>Level:</b> ${towerFloorLevel(run.floor)}</div>
      <div class="ui-tower-row"><b>Reward:</b> ${first ? `${towerReward(run.floor)} Tytrate` : 'Already claimed'}</div>
      <button class="ui-action-btn" data-climb-enter="1">Enter Floor</button>
      <button class="ui-action-btn ui-tower-abandon" data-abandon="1">Abandon Climb</button>`;
  }

  render() {
    const isRandom = this.track === 'random';
    const progress = (t) => (t.key === 'random' ? (state.towerRun ? `${state.towerRun.floor}F` : '') : towerFloorsCleared(state, t.key));
    mount(`
      <div class="ui-screen ui-index">
        <div class="ui-topbar">
          <button class="ui-navbtn" data-nav="back">◀ World Map</button>
          <div class="ui-title">TOWER OF TRIALS</div>
          <div class="ui-skillbook-modes">
            ${TOWER_TRACKS.map(t => `<button class="ui-navbtn ${t.key === this.track ? 'accent' : ''}" data-track="${t.key}">${t.label} ${progress(t)}</button>`).join('')}
          </div>
        </div>
        ${isRandom
          ? `<div class="ui-body ui-tower-single"><div class="ui-panel ui-detail-panel" data-scroll-id="tower-random">${this.randomHTML()}</div></div>`
          : `<div class="ui-body">
              <div class="ui-panel ui-list-panel" data-scroll-id="tower-${this.track}">${this.floorListHTML()}</div>
              <div class="ui-panel ui-detail-panel" data-scroll-id="tower-detail">${this.detailHTML(this.selected)}</div>
            </div>`}
      </div>
    `);

    onClick('[data-nav="back"]', () => this.scene.start('WorldMapScene'));
    onClick('[data-track]', (e, node) => { this.notice = ''; this.openTrack(node.dataset.track); });
    onClick('[data-floor]', (e, node) => { this.selected = Number(node.dataset.floor); this.render(); });
    onClick('[data-enter]', (e, node) => {
      state.currentMission = towerFloorId(this.track, Number(node.dataset.enter));
      this.scene.start('BattleScene');
    });
    onClick('[data-climb]', (e, node) => { startTowerClimb(Number(node.dataset.climb)); this.notice = ''; this.render(); });
    onClick('[data-abandon]', () => { abandonTowerClimb(); this.notice = ''; this.render(); });
    onClick('[data-climb-enter]', () => {
      state.towerRun.fighting = true;
      state.currentMission = prepareRandomTowerFloor(state.towerRun.floor);
      this.scene.start('BattleScene');
    });
  }
}
