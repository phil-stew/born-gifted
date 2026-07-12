import Phaser from 'phaser';
import {
  SPORT_CHAINS, sportById, roleById, elementIcon,
  ELEMENT_CYCLE, ELEMENT_BEATS, DESIGNATION_CYCLE, DESIGNATION_NAMES, DESIGNATION_ICONS,
} from '../data/gameState.js';
import { ABILITIES } from '../data/abilities.js';
import {
  BASE_MONSTERS, MONSTER_DESIGNATION, MONSTER_BASE_STATS, MONSTER_TIERS,
  TIER_STAT_MULT, BOSS_STAT_MULT, UNIQUE_STAT_MULT, buildMonsterKit, BOSS_PREFIX,
} from '../data/monsters.js';
import { mount, unmount, onClick, esc } from '../ui/domUI.js';

// A few story characters (Drace/Sela/Trice) use one fixed, single-tier class
// instead of a promotion chain — see FULL_ROSTER's chainId:null entries in
// gameState.js. Named here just for the reference note in the Classes tab.
const STANDALONE_CLASSES = [
  { sport: 'am_football',     role: 'defender_amfb' },
  { sport: 'football_soccer', role: 'goalkeeper_soccer' },
  { sport: 'basketball',      role: 'ace_defence_bball' },
];

const CATEGORY_LABELS = { special: 'Specials (SP cost)', skill: 'Skills (cooldown)', passive: 'Passives (Class Skills)' };
const CATEGORY_ORDER = ['special', 'skill', 'passive'];

const GLOSSARY = [
  { term: 'Tier',        def: 'A monster or unit\'s power band (T1/T2/T3). Higher-tier monsters hit harder and have more HP.' },
  { term: 'Boss',        def: 'A mission-ending monster with sharply boosted stats and a name of its own.' },
  { term: 'Unique',      def: 'A rarer, mid-boosted monster with a randomly rolled name — encountered outside of a mission\'s final fight.' },
  { term: 'Designation', def: 'A unit or monster\'s combat role (Combat/Ranged/Defender/Support) — see the triangle below.' },
  { term: 'Talent',      def: 'One of 2 stat-growth picks made at character creation. Picking the same talent twice quadruples that stat\'s growth per level.' },
  { term: 'Class Skill', def: 'A permanent passive buff, equipped into one of up to 3 slots unlocked at levels 5/10/20.' },
];

const TABS = [
  { id: 'classes',   label: 'Classes & Promotion' },
  { id: 'abilities', label: 'Abilities & Skills' },
  { id: 'monsters',  label: 'Monsters' },
  { id: 'weaknesses',label: 'Weaknesses' },
];

// Browsable reference for everything a player might want to look up mid-run
// (2026-07-08 feedback) — classes/promotion chains, the full ability/skill
// list, monster stat blocks + kits, and the element/designation weakness
// cycles + glossary (this last section reuses HandbookScene's content, just
// as plain readable text instead of the canvas-drawn wheel/triangle, since
// this scene is a DOM-overlay content browser, not a canvas scene).
// Opened directly from WorldMapScene's bottom bar — always available, no
// story gate, unlike HandbookScene (which stays untouched, still reachable
// from the Capital hub once the exam questline unlocks it).
export class IndexScene extends Phaser.Scene {
  constructor() { super({ key: 'IndexScene' }); }

  init() {
    this.activeTab = 'classes';
  }

  create() {
    this.render();
    this.events.once('shutdown', unmount);
  }

  render() {
    mount(`
      <div class="ui-screen">
        <div class="ui-topbar">
          <button class="ui-navbtn" data-nav="back">◀ World Map</button>
          <div class="ui-title">INDEX</div>
          <div style="width:110px"></div>
        </div>
        <div class="ui-index-tabbar">
          ${TABS.map(t => `<button class="ui-navbtn ${t.id === this.activeTab ? 'accent' : ''}" data-tab="${t.id}">${esc(t.label)}</button>`).join('')}
        </div>
        <div class="ui-body ui-index-body">
          <div class="ui-panel ui-index-panel" data-scroll-id="index-${this.activeTab}">
            ${this.renderTab()}
          </div>
        </div>
      </div>
    `);
    this.wireEvents();
  }

  renderTab() {
    if (this.activeTab === 'abilities')  return this.abilitiesHTML();
    if (this.activeTab === 'monsters')   return this.monstersHTML();
    if (this.activeTab === 'weaknesses') return this.weaknessesHTML();
    return this.classesHTML();
  }

  // ── Classes & Promotion ──────────────────────────────────────────────────
  classesHTML() {
    const chainRow = (chain) => {
      const t1 = sportById(chain.t1);
      const t2 = chain.t2 ? sportById(chain.t2) : null;
      const t3s = chain.t3.map(id => sportById(id));
      const roleNames = (sport) => sport.roles.map(r => `${esc(r.name)} <span class="ui-btn-sub" style="display:inline">(${r.designations.join('/')})</span>`).join(', ');
      const step = (label, sport) => sport ? `
        <div class="ui-index-step">
          <div class="ui-card-sub">${label}</div>
          <div class="ui-card-name">${esc(sport.name)}</div>
          <div class="ui-card-sub">${roleNames(sport)}</div>
        </div>` : '';
      return `
        <div class="ui-index-chain">
          <div class="ui-section-label" style="border:none;padding-bottom:2px;">${chain.primary} + ${chain.secondary}</div>
          <div class="ui-index-chain-row">
            ${step('T1', t1)}
            <span class="ui-index-arrow">→</span>
            ${t2 ? step('T2', t2) : '<div class="ui-card-sub">(no T2)</div>'}
            <span class="ui-index-arrow">→</span>
            <div class="ui-index-step">
              <div class="ui-card-sub">T3${t3s.length > 1 ? ' (choose one)' : ''}</div>
              ${t3s.map(s => `<div class="ui-card-name">${esc(s.name)}</div><div class="ui-card-sub">${roleNames(s)}</div>`).join('')}
            </div>
          </div>
        </div>`;
    };

    const standaloneHTML = STANDALONE_CLASSES.map(({ sport, role }) => {
      const s = sportById(sport), r = roleById(role);
      return `<li><b>${esc(s.name)}</b> — ${esc(r.name)} (${r.designations.join('/')})</li>`;
    }).join('');

    return `
      <div class="ui-section-label">Promotion Chains — Talent pair picked at creation decides the chain</div>
      ${SPORT_CHAINS.map(chainRow).join('')}
      <div class="ui-section">
        <div class="ui-section-label">Standalone Classes</div>
        <div class="ui-card-sub">A few story recruits use one fixed class with no further promotion:</div>
        <ul class="ui-index-list">${standaloneHTML}</ul>
      </div>
    `;
  }

  // ── Abilities & Skills ───────────────────────────────────────────────────
  abilitiesHTML() {
    const byCategory = { special: [], skill: [], passive: [] };
    for (const ab of Object.values(ABILITIES)) {
      (byCategory[ab.category] ?? byCategory.special).push(ab);
    }
    return CATEGORY_ORDER.map(cat => `
      <div class="ui-section">
        <div class="ui-section-label">${CATEGORY_LABELS[cat]} — ${byCategory[cat].length}</div>
        <div class="ui-index-ability-grid">
          ${byCategory[cat].map(ab => `
            <div class="ui-index-ability">
              <div class="ui-card-name">${ab.icon ?? ''} ${esc(ab.name)}</div>
              <div class="ui-card-sub">${esc(ab.desc ?? '')}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `).join('');
  }

  // ── Monsters ──────────────────────────────────────────────────────────────
  monstersHTML() {
    const rows = BASE_MONSTERS.map(base => {
      const designation = MONSTER_DESIGNATION[base];
      const stats = MONSTER_BASE_STATS[base];
      // kind:'boss' gets the FULL designation ability pool (see
      // buildMonsterKit) with this species' own flavor names resolved in —
      // exactly the reference list a player would want, without the
      // randomized single-pick a 'regular' kit or the extra generated
      // signature move a 'unique' kit would add.
      const { skills } = buildMonsterKit(base, { kind: 'boss' });
      const skillNames = skills.map(s => s.name).join(', ');
      return `
        <div class="ui-index-monster">
          <div class="ui-card-name">${DESIGNATION_ICONS[designation] ?? ''} ${esc(base)}</div>
          <div class="ui-card-sub">${DESIGNATION_NAMES[designation]} · Speed ${stats.speed} · Strength ${stats.strength} · Stamina ${stats.stamina} · Endurance ${stats.endurance}</div>
          <div class="ui-card-sub">Skill pool: ${esc(skillNames)}</div>
        </div>`;
    }).join('');

    const tierRows = MONSTER_TIERS.map((t, i) => `
      <div class="ui-stat-row"><span>Tier ${t.tier}${t.prefix ? ` — "${t.prefix}"` : ''} (${t.label})</span><span class="ui-stat-val">×${TIER_STAT_MULT[i]} stats</span></div>
    `).join('');

    return `
      <div class="ui-section-label">Base Roster — ${BASE_MONSTERS.length} species</div>
      <div class="ui-index-monster-grid">${rows}</div>
      <div class="ui-section">
        <div class="ui-section-label">Tier Ladder (regular spawns)</div>
        <div class="ui-stat-grid" style="grid-template-columns:1fr;">${tierRows}</div>
        <div class="ui-card-sub" style="margin-top:10px;">Skill count scales with tier: 1 (T1) → 2 (T2/T3) → 3 (T4).</div>
      </div>
      <div class="ui-section">
        <div class="ui-section-label">Bosses &amp; Uniques</div>
        <div class="ui-card-sub">Bosses ("${BOSS_PREFIX} &lt;name&gt;") hit ×${BOSS_STAT_MULT} base stats and know their full designation kit.</div>
        <div class="ui-card-sub">Uniques (randomly-named rare spawns) hit ×${UNIQUE_STAT_MULT} base stats, know their full kit, plus one randomly generated signature move.</div>
      </div>
    `;
  }

  // ── Weaknesses ────────────────────────────────────────────────────────────
  weaknessesHTML() {
    const elementChain = ELEMENT_CYCLE.map(el => `${elementIcon(el)} ${el}`).join('  →  ') + `  →  ${elementIcon(ELEMENT_CYCLE[0])} ${ELEMENT_CYCLE[0]}`;
    const designationChain = DESIGNATION_CYCLE.map(d => `${DESIGNATION_ICONS[d]} ${DESIGNATION_NAMES[d]}`).join('  →  ') + `  →  ${DESIGNATION_ICONS[DESIGNATION_CYCLE[0]]} ${DESIGNATION_NAMES[DESIGNATION_CYCLE[0]]}`;

    const glossaryHTML = GLOSSARY.map(g => `
      <div class="ui-index-ability">
        <div class="ui-card-name">${esc(g.term)}</div>
        <div class="ui-card-sub">${esc(g.def)}</div>
      </div>
    `).join('');

    return `
      <div class="ui-section-label">Element Weaknesses</div>
      <div class="ui-card-name" style="line-height:2;">${elementChain}</div>
      <div class="ui-card-sub">Beats the next element clockwise — 1.5× damage dealt, 0.8× damage taken when beaten.</div>

      <div class="ui-section">
        <div class="ui-section-label">Designation Triangle</div>
        <div class="ui-card-name" style="line-height:2;">${designationChain}</div>
        <div class="ui-card-sub">${DESIGNATION_ICONS.S} Support sits outside the triangle — boosts/heals allies instead of fighting the cycle.</div>
      </div>

      <div class="ui-section">
        <div class="ui-section-label">Glossary</div>
        <div class="ui-index-ability-grid">${glossaryHTML}</div>
      </div>
    `;
  }

  wireEvents() {
    onClick('[data-nav="back"]', () => this.scene.start('WorldMapScene'));
    onClick('[data-tab]', (e, node) => {
      this.activeTab = node.dataset.tab;
      this.render();
    });
  }
}
