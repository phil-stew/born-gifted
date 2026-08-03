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
import { DIFFICULTIES } from '../data/difficulty.js';

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
  { term: 'Buff icon (⬆)',   def: 'Shown above a unit\'s head in battle whenever it has an active attack/move buff, an armed dodge/endure, or a ticking overdrive/damage-reduction effect.' },
  { term: 'Debuff icon (⬇)', def: 'Shown above a unit\'s head in battle whenever it\'s currently slowed or has a stat lowered by an enemy ability.' },
  { term: 'Damage number color', def: 'White = no bonus, orange = 1 stacking, dark orange (bigger) = 2, rainbow (biggest) = 3+ — see Damage Number Colors below.' },
  { term: 'Difficulty',  def: 'Set in Settings (Newbie/Veteran/Perilous) — governs every first-time mission. Separate from the Normal/Hard/Elite picker shown when replaying an already-cleared mission.' },
];

const TABS = [
  { id: 'guide',     label: 'New Player Guide' },
  { id: 'classes',   label: 'Classes & Promotion' },
  { id: 'abilities', label: 'Abilities & Skills' },
  { id: 'monsters',  label: 'Monsters' },
  { id: 'weaknesses',label: 'Combat & Weaknesses' },
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
    this.activeTab = 'guide';
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
    if (this.activeTab === 'classes')    return this.classesHTML();
    return this.guideHTML();
  }

  // ── New Player Guide ─────────────────────────────────────────────────────
  guideHTML() {
    const diffRows = DIFFICULTIES.map(d => {
      const floor = d.levelFloorOffset == null ? 'Enemy level never scales up to yours'
        : d.levelFloorOffset === 0 ? 'Enemy level floors to match your own'
        : `Enemy level floors to yours +${d.levelFloorOffset}`;
      const dmg = [];
      if (d.enemyDamageMult !== 1.0) dmg.push(`enemies deal ${d.enemyDamageMult < 1 ? '-' : '+'}${Math.abs(Math.round((d.enemyDamageMult - 1) * 100))}% damage`);
      if (d.playerDamageMult !== 1.0) dmg.push(`you deal ${d.playerDamageMult < 1 ? '-' : '+'}${Math.abs(Math.round((d.playerDamageMult - 1) * 100))}% damage`);
      if (d.disableRepeatScaling) dmg.push('repeat-battle escalation disabled');
      return `<div class="ui-index-ability">
        <div class="ui-card-name" style="color:${d.color};">${esc(d.label)}</div>
        <div class="ui-card-sub">${esc(floor)}${dmg.length ? ' · ' + esc(dmg.join(', ')) : ''}</div>
      </div>`;
    }).join('');

    return `
      <div class="ui-section-label">Welcome, Gifted</div>
      <div class="ui-card-sub" style="line-height:1.6;">
        Every child is born with a Gift tied to a sport. Build a party of Gifted athletes, promote them
        through 3 class tiers as they level (T1 → T2 @ Lv.10 → T3 @ Lv.20), and fight your way across
        three kingdoms toward the Grand Tournament.
      </div>

      <div class="ui-section">
        <div class="ui-section-label">Recommended First Class</div>
        <div class="ui-index-ability">
          <div class="ui-card-name">🏃 Running → ⚽ Football (Striker) → 🏉 Rugby / 🏈 Am. Football</div>
          <div class="ui-card-sub">
            A pure Combat (${DESIGNATION_ICONS.C}) chain start to finish, no branching role choice at T1 —
            simple to play and it fully benefits from Combat's ×2 adjacent-attack bonus (see Combat &amp; Weaknesses).
            For talents, Speed and Strength both feed directly into attack power — picking one twice
            (×4 growth) or one of each (×2/×2) both work well on a melee starter.
          </div>
        </div>
        <div class="ui-card-sub" style="margin-top:6px;">
          Element choice has no single "best" pick — the Fire→Wind→Earth→Lightning→Water cycle is
          symmetric and monster elements roll semi-randomly per region, so pick whichever fits your character.
        </div>
      </div>

      <div class="ui-section">
        <div class="ui-section-label">Battle Basics</div>
        <ul class="ui-index-list">
          <li>Each unit gets one Move and one Action (Attack/Throw/a Special/a Class Skill) per turn, via the Playbook menu.</li>
          <li>Combat-designated units deal <b>×2 damage on adjacent (melee-range) hits</b> — close the distance when you can.</li>
          <li>Watch for buff (⬆ gold) and debuff (⬇ pink) icons above a unit's head in battle.</li>
          <li>🛒 Shop and ⚒ Forge are available at every hub on the world map (badges shown right on the node).</li>
          <li>Your first extra recruit joins at the Capital (M3) — the opening few missions are fought solo on purpose.</li>
        </ul>
      </div>

      <div class="ui-section">
        <div class="ui-section-label">Difficulty (Settings)</div>
        <div class="ui-card-sub" style="margin-bottom:6px;">
          Governs every first-time mission (separate from the Normal/Hard/Elite picker shown when
          replaying an already-cleared one). <b>Newbie is recommended for your first playthrough.</b>
        </div>
        <div class="ui-index-ability-grid">${diffRows}</div>
      </div>
    `;
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
        <div class="ui-card-sub">Beats the next designation clockwise — 1.25× damage dealt, 0.8× damage taken when beaten.</div>
        <div class="ui-card-sub">${DESIGNATION_ICONS.S} Support sits outside the triangle — boosts/heals allies instead of fighting the cycle.</div>
      </div>

      <div class="ui-section">
        <div class="ui-section-label">${DESIGNATION_ICONS.C} Combat Adjacency Bonus</div>
        <div class="ui-card-sub">
          Any unit — player or monster — with a live Combat designation deals <b>×2 damage</b> on a
          melee-range (adjacent-tile) hit. This stacks multiplicatively with the triangle bonus above,
          so a Combat attacker that ALSO has type advantage hits for ×2.5 total. Doesn't apply to a
          ranged attack (e.g. Throw), even from a unit that has Combat as one of its designations.
        </div>
      </div>

      <div class="ui-section">
        <div class="ui-section-label">Damage Number Colors</div>
        <div class="ui-card-sub" style="margin-bottom:8px;">
          A hit's damage number is colored/sized by how many of the 4 bonus sources above are
          stacking on it at once — Combat adjacency, designation-triangle advantage, elemental
          affinity, and a sports-partner damage passive (2 for 2/Doubles/Lock-On). Difficulty tier
          and attack-buff bonuses don't count toward this — only per-hit tactical bonuses do.
        </div>
        <div class="ui-index-ability-grid">
          <div class="ui-index-ability">
            <div class="ui-card-name" style="color:#ffffff;">-42 · Plain</div>
            <div class="ui-card-sub">No bonus active — white, normal size.</div>
          </div>
          <div class="ui-index-ability">
            <div class="ui-card-name" style="color:#ff8800;">-55 · One bonus</div>
            <div class="ui-card-sub">Exactly one of the 4 sources — orange, normal size.</div>
          </div>
          <div class="ui-index-ability">
            <div class="ui-card-name" style="color:#cc5500; font-size:18px;">-88 · Two bonuses</div>
            <div class="ui-card-sub">Any two stacking — dark orange, bigger font.</div>
          </div>
          <div class="ui-index-ability">
            <div class="ui-card-name" style="font-size:18px;"><span style="color:#ff3b3b;">-</span><span style="color:#ff9c33;">1</span><span style="color:#ffe135;">3</span><span style="color:#4ade80;">0</span> · Three or more</div>
            <div class="ui-card-sub">E.g. affinity + designation advantage + Combat adjacency — rainbow, biggest font.</div>
          </div>
        </div>
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
