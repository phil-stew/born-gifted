import Phaser from 'phaser';
import {
  ELEMENT_CYCLE, ELEMENT_BEATS, elementIcon,
  DESIGNATION_CYCLE, DESIGNATION_NAMES, DESIGNATION_BEATS, DESIGNATION_ICONS,
} from '../data/gameState.js';
import { mount, unmount, onClick, esc } from '../ui/domUI.js';

const GLOSSARY = [
  { term: 'Tier',        def: 'A monster or unit\'s power band (T1/T2/T3). Higher-tier monsters hit harder and have more HP.' },
  { term: 'Boss',        def: 'A mission-ending monster with sharply boosted stats and a name of its own.' },
  { term: 'Unique',      def: 'A rarer, mid-boosted monster with a randomly rolled name, met outside a mission\'s final fight.' },
  { term: 'Designation', def: 'A unit or monster\'s combat role (Combat/Ranged/Defender/Support), see the triangle above.' },
  { term: 'Talent',      def: 'One of 2 stat-growth picks made at character creation. Picking the same talent twice quadruples that stat\'s growth per level.' },
  { term: 'Class Skill', def: 'A permanent passive buff, equipped into one of up to 3 slots unlocked at levels 5/10/20.' },
];

// Element weakness cycle + designation triangle + a short glossary — opened
// from the Capital hub once capitalQuest reaches 'exam_ready'. DOM page in the
// Index's see-through style (2026-11-03: the old canvas layout was built for a
// taller screen and overlapped itself on phones).
export class HandbookScene extends Phaser.Scene {
  constructor() { super({ key: 'HandbookScene' }); }

  init(data) {
    this.hubData = data?.hubData ?? { nodeId: 'M3' };
  }

  create() {
    const elements = ELEMENT_CYCLE.map(el =>
      `<li>${elementIcon(el)} <b>${esc(el)}</b> beats ${elementIcon(ELEMENT_BEATS[el])} ${esc(ELEMENT_BEATS[el])}</li>`).join('');
    const types = DESIGNATION_CYCLE.map(d =>
      `<li>${DESIGNATION_ICONS[d]} <b>${esc(DESIGNATION_NAMES[d])}</b> beats ${DESIGNATION_ICONS[DESIGNATION_BEATS[d]]} ${esc(DESIGNATION_NAMES[DESIGNATION_BEATS[d]])}</li>`).join('');
    const glossary = GLOSSARY.map(g => `
      <div class="ui-index-ability">
        <div class="ui-card-name">${esc(g.term)}</div>
        <div class="ui-card-sub">${esc(g.def)}</div>
      </div>`).join('');

    mount(`
      <div class="ui-screen ui-index">
        <div class="ui-topbar">
          <button class="ui-navbtn" data-nav="back">◀ Back</button>
          <div class="ui-title">HANDBOOK</div>
          <div style="width:110px"></div>
        </div>
        <div class="ui-body ui-index-body">
          <div class="ui-panel ui-index-panel" data-scroll-id="handbook">
            <div class="ui-section">
              <div class="ui-section-label">Element Weaknesses</div>
              <ul class="ui-index-list">${elements}</ul>
              <div class="ui-card-sub">An element deals 1.5× damage to the one it beats, and takes 0.8× from it.</div>
            </div>
            <div class="ui-section">
              <div class="ui-section-label">Designation Triangle</div>
              <ul class="ui-index-list">${types}</ul>
              <div class="ui-card-sub">${DESIGNATION_ICONS.S} Support sits outside the triangle: it boosts and heals allies instead.</div>
            </div>
            <div class="ui-section">
              <div class="ui-section-label">Glossary</div>
              ${glossary}
            </div>
          </div>
        </div>
      </div>
    `);
    onClick('[data-nav="back"]', () => this.scene.start('HubScene', this.hubData));
    this.events.once('shutdown', unmount);
  }
}
