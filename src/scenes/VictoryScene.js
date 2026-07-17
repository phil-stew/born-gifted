import Phaser from 'phaser';
import { state, addXP, xpToNext, completeMission, gearLayoutForUnit, roleDisplayLabel, TRIAL_CLASS, sportById, currentSport } from '../data/gameState.js';
import { getMissionMaterials, getKillDrops, rollHealHerbDrop, rollBracketedDrop, rollGodTierClassItem } from '../data/items.js';
import { BACKDROPS } from '../data/storyBackdrops.js';
import { drawButton } from '../ui/canvasButton.js';

const XP_PER_ENEMY = 40;

// M1/M2/M3 no longer get a post-battle cutscene here — the M0-M4 redesign
// (July 2026) moves those story beats to their own click-time triggers
// instead (M1's "news" turn-in happens back at M0, M3's academy-arrival/
// test-turn-in/craft/recruit dialogue all plays when M3 itself is clicked —
// see WorldMapScene's onCapitalClick). M4 is the one exception: it still
// wins its cutscene here, right after the exam battle. Drace/Sela/Zora no
// longer auto-join at M2/M3/M4 either; they're recruited by player choice at
// Ester/Hilbert Academy instead (see RECRUITS_AFTER below). M5 "Ember
// Hollow" (2026-07-11) and M6-M11 + their M13/M14 side battles
// (2026-07-11, "going to rewrite") were removed entirely, along with
// Kael's (M5) and Trice's (M6) tag-along cutscenes/auto-joins — neither
// has a recruit path left; nothing currently wires them into the
// newRecruit/RecruitClassScene flow the way Drace is, so they're
// effectively cut from the game until/unless that's added back some other
// way (presumably as part of the M6-M11 rewrite).
const CUTSCENE_AFTER = {
  M4: {
    location: 'ARENA ATLROS',
    backdrop: BACKDROPS.school,
    lines: [
      { speaker:'Instructor', color:'#ddcc88', text:'...Well fought. You\'ve more than earned your place.' },
      { speaker:'Reno',       color:'#4488ff', text:'...Didn\'t think I\'d be fighting our own instructor.' },
      { speaker:'Instructor', color:'#ddcc88', text:'Welcome to the Academy. Meet me back at the Capital.' },
    ],
  },
  // Gale Tournament (2026-07-17, "after GT there are given instructions to
  // go to lametus can complete there trail") — bridges the arc's ending
  // straight into M6 ("Lametus's trial"), same "instructions handed down,
  // then the next area's node unlocks" beat M0/M1's news-turn-in already
  // uses. Plays once, on GT's first clear.
  GT: {
    location: 'GALE  ·  The Tournament',
    backdrop: BACKDROPS.school,
    lines: [
      { speaker:'Official',  color:'#ddcc88', text:'...That\'s the most decisive final this arena has seen in years. Well fought.' },
      { speaker:'Reno',      color:'#4488ff', text:'...Thanks. So what now?' },
      { speaker:'Narrator',  color:'#888899', text:'A rider arrives from the Capital before anyone can answer, out of breath, carrying a sealed letter.' },
      { speaker:'Messenger', color:'#cc9955', text:'By the King\'s word — Lametus, east of here, has agreed to test you. Complete their trial and every kingdom will know your names.' },
      { speaker:'Reno',      color:'#4488ff', text:'...Lametus. Guess our work in Gale is done. Let\'s go.' },
    ],
  },
};

const MISSION_NAMES = {
  M1:'Sirblanc Outskirts', M2:'Thunder Plains',   M4:'Arena Atlros',
  M0a:'Hidden Cave', M0b:"Wolf's Den",
  M3a:'Northern Cave',     M3b:'Hilbert Low Lands',
  // AT1's enemies are a real tournament team in epic gear now (2026-07-11
  // third follow-up) — its own M5a battle slot was removed and folded in.
  AT1:'Altroes Trials I', AT2:'Altroes Trials II',
  DK: 'The Frozen Peaks', MH: 'Monster Hunt', GT: 'Gale Tournament',
  M6: 'Blightreach',
  // M7 never reaches VictoryScene (see MISSION_CONFIGS.M7's scriptedDefeat
  // in BattleScene.js — it always ends in triggerScriptedDefeat, never
  // isVictory()), so it gets no entry here on purpose.
  T1: 'Trial of Athletics', T2: 'Trial of Martial Arts', T3: 'Trial of Performance',
  T4: 'Trial of Target',    T5: 'Trial of Ball',          T6: 'Trial of Bat & Ball',
  T7: 'Trial of Racquet',
};

// Tytrate rewards on mission clear (2026-07-11, "all the mission should
// give you some tytrate i keep forget[ting] to code it in") — no mission
// has ever paid Tytrate through VictoryScene before this (only the
// separate capitalQuest/RewardPopupScene stages at M3 do). Scoped to the
// Gale missions actually in front of us, not a retroactive pass over
// every existing mission — that's a bigger ask than what was on the
// table here. DK (300) matches the "Ready For The Exam" tier, the biggest
// one-off reward already in the game; MH (150) is lower since it's meant
// to be run repeatedly (avoids runaway currency farming); GT (400,
// 2026-07-12) tops DK slightly as the actual capstone of the arc. M6 (500,
// 2026-07-17) tops GT again now that the story's moved past it. T1-T7 (250
// each, same day) sit between MH and DK — their real reward is the God
// Tier weapon (see the TRIAL_CLASS drop wiring above), Tytrate is just the
// standard per-mission stipend every Gale/Lametus battle already gets.
const MISSION_TYTRATE = { DK: 300, MH: 150, GT: 400, M6: 500, T1: 250, T2: 250, T3: 250, T4: 250, T5: 250, T6: 250, T7: 250 };

// M12/M15 removed 2026-07-11 ("remove m12", fifth follow-up — M15 went
// with it, see WorldMapScene.js's NODES comment) — the main chain now ends
// at M5 (Gale), a pure hub with nothing to clear past it.
//
// M1 has no entry here on purpose — winning it doesn't unlock M2 by itself;
// the player has to return to M0 (Hidden Village) to turn the mission in,
// which is what actually unlocks M2 (see WorldMapScene's M0 click handler).
// M3 is a hub now (The Capital), not a battle, so it never completes through
// VictoryScene either — M2 still unlocks it via this table, but there's no
// 'M3:...' entry here since nothing ever looks it up that way. M4 used to
// unlock M5, then M6, next; both were removed (2026-07-11, "going to
// rewrite"). M4 no longer unlocks anything directly here — neither does
// AT1 or AT2. Altroes Trials (AT1+AT2) are offered as a "Tournament" choice
// at M3 once all 6 academy quests are done (see onCapitalClick in
// WorldMapScene.js) — a deliberate player action, not an auto-unlock. M5 is
// now a HUB (Gale, the next kingdom city — see HUB_CONFIGS) with no battle
// attached to it at all, reached via the same live "AT1 AND AT2 both
// completed" check (see WorldMapScene's create()), not through this table.
// M6 (2026-07-17) unlocks M7 the normal way, straight through this table —
// unlike M5/GT/DK/MH, M6 IS a real winnable battle with a normal
// VictoryScene flow, so it doesn't need a live-check/HubScene-style
// mechanism. M7 itself has no entry here — it never unlocks anything
// through this table since it never reaches VictoryScene at all (see
// MISSION_NAMES.M7's comment above).
const MISSION_NEXT = {
  M2:'M3',
  M6:'M7',
};

// Side battles unlock alongside their region's final mission, independent
// of the main chain's own next-unlock above — one per region. M2:'M0a' is
// the M0-M4 redesign's Phase 5 addition — the Hidden Cave ore mission
// unlocks the moment M3 does (both fire off M2's completion), even though
// M0a branches off M0, not M2 — this mechanism never required the unlock
// source and the branch parent to match (same trick M3:'M0a' would have
// used, but M3 never completes through VictoryScene since it's a hub).
// M6:'M13'/M9:'M14' removed 2026-07-11 along with M6/M9/M13/M14 themselves;
// M12:'M15' removed the same day too, along with M12/M15 themselves.
const SIDE_MISSION_UNLOCK = { M2:'M0a' };

// Roster characters who join the party right after a given mission's
// cutscene. Drace/Sela/Zora were cut from the old M2/M3/M4 auto-join beats
// (July 2026 redesign) and are recruited by player choice at Ester/Hilbert
// Academy instead (RecruitClassScene, triggered from the Capital
// questline). Kael's M5 and Trice's M6 entries were removed 2026-07-11
// along with M5/M6 themselves — see the note on CUTSCENE_AFTER above.
// Empty for now; kept as a const (not deleted) since VictoryScene still
// reads RECRUITS_AFTER[missionId] generically for every mission.
const RECRUITS_AFTER = {};

export class VictoryScene extends Phaser.Scene {
  constructor() { super({ key: 'VictoryScene' }); }

  init(data) {
    this.missionId     = data.mission       ?? 'M1';
    this.enemiesKilled = data.enemiesKilled ?? 0;
    this.killsByType   = data.killsByType   ?? {};
    this.xpEarned      = data.xpEarned     ?? this.enemiesKilled * XP_PER_ENEMY;
    // Capture first-clear BEFORE completeMission is called in create()
    this.isFirstClear  = !state.completedMissions.includes(this.missionId);
  }

  create() {
    const { width, height } = this.scale;
    const totalXP = this.xpEarned;

    // Apply XP and collect level-up results
    this.levelUps = [];
    for (const unit of state.party) {
      const result = addXP(unit, totalXP);
      if (result) this.levelUps.push({ unit, gains: result });
    }

    // Drop loot: per-kill drops → guaranteed materials → herb chance → level-bracketed equipment
    const killDrops = getKillDrops(this.killsByType);
    for (const item of killDrops) state.inventory.push(item);
    const materials = getMissionMaterials(this.missionId);
    for (const mat of materials) state.inventory.push(mat);
    const tytrateReward = MISSION_TYTRATE[this.missionId] ?? 0;
    if (tytrateReward) state.tytrate += tytrateReward;
    // Heal Herb: 25% chance per battle, independent of the guaranteed
    // MISSION_MATERIALS table above (which still separately guarantees one on M1).
    const herbDrop = rollHealHerbDrop();
    if (herbDrop) state.inventory.push(herbDrop);

    // Level-bracketed equipment drop, rolled against the protagonist's
    // level (2026-07-08 feedback: a level 20 party was still getting common
    // gear off Wolf kills). Used to be the M0a-only "Hidden Cave" bonus roll
    // (M0-M4 redesign, Phase 5) layered on top of every OTHER mission's own
    // flat, level-blind MISSION_LOOT pool — but that pool only ever listed
    // common/uncommon static items (no rare+ gear exists as a static item at
    // all, see project_items_cleanup memory), so no amount of leveling could
    // ever improve a normal mission's drop. Now every mission uses this same
    // bracketed roll instead of a fixed pool — same fix ShopScene already
    // applied to its own gear list (see SHOP_RARITY_UNLOCKS), just via the
    // "single roll" shape this system already had rather than the shop's
    // "additive tiers" shape.
    const leader = state.party[0];
    const leaderClassMult = leader ? gearLayoutForUnit(leader).classItemMultiplier : 1;
    const bracketDrops = rollBracketedDrop(leader?.level ?? 1, leader?.talents ?? [], leaderClassMult, leader ? roleDisplayLabel(leader) : undefined);
    if (bracketDrops) for (const item of bracketDrops) state.inventory.push(item);
    // Grouped for display same as killDropSummary — the ore outcome returns
    // the same material twice (its "×2" flavor) rather than one item with a
    // count field, so it needs the same id-grouping treatment.
    const bracketDropSummary = [];
    if (bracketDrops) {
      const counts = new Map();
      for (const item of bracketDrops) counts.set(item.id, (counts.get(item.id) ?? 0) + 1);
      for (const [id, count] of counts) bracketDropSummary.push({ item: bracketDrops.find(i => i.id === id), count });
    }

    // The Noble Deity's 7 Trials (2026-07-17) — clearing a trial grants
    // every CURRENT party member of that trial's classGrouping their own
    // God Tier Class Item (rollGodTierClassItem() — items.js already had
    // this function, just flagged "drop source... TBD" until now). Gated
    // on isFirstClear so replaying a trial doesn't farm duplicates for the
    // same hero — matches "must do to obtain" reading as a one-time
    // reward, same gate the cutscene/recruit hooks elsewhere use.
    const trialClass = TRIAL_CLASS[this.missionId];
    const godTierDrops = (trialClass && this.isFirstClear)
      ? state.party.filter(u => sportById(currentSport(u))?.class === trialClass).map(u => rollGodTierClassItem(u))
      : [];
    for (const item of godTierDrops) state.inventory.push(item);

    // Group kill drops by item id for display (e.g. Bone × 3) — kills no
    // longer map to a fixed material per enemy name (see getKillDrops:
    // every kill rolls randomly from the generic Skin/Fur/Bone pool), so
    // grouping happens on whatever actually dropped instead.
    const killDropCounts = new Map();
    for (const item of killDrops) killDropCounts.set(item.id, (killDropCounts.get(item.id) ?? 0) + 1);
    const killDropSummary = [...killDropCounts.entries()].map(([id, count]) => ({
      item: killDrops.find(i => i.id === id), count,
    }));
    this.allDrops = [
      ...killDropSummary,
      ...materials.map(item => ({ item, count: 1 })),
      ...(herbDrop ? [{ item: herbDrop, count: 1 }] : []),
      ...bracketDropSummary,
      ...godTierDrops.map(item => ({ item, count: 1 })),
    ];

    // Complete mission and unlock next (main chain + any side-battle branch)
    const nextMission = MISSION_NEXT[this.missionId];
    completeMission(this.missionId, nextMission);
    const sideUnlock = SIDE_MISSION_UNLOCK[this.missionId];
    if (sideUnlock) completeMission(this.missionId, sideUnlock);

    // Winning the exam retires the Capital questline (M0-M4 redesign,
    // Phase 4) — nothing left to turn in at M3 after this.
    if (this.missionId === 'M4') state.capitalQuest = 'done';

    // M0a/M0b require re-accepting at the Hidden Village's Quest Menu
    // before every attempt, including replays (2026-07-07 feedback) — reset
    // the acceptance flag on every completion, not just the first.
    if (this.missionId === 'M0a' || this.missionId === 'M0b') {
      state.questAccepted[this.missionId] = false;
    }

    // ── Background ────────────────────────────────────────────────────────
    const bg = this.add.graphics();
    bg.fillStyle(0x0a0a18, 1);
    bg.fillRect(0, 0, width, height);

    // Gold accent line
    bg.fillStyle(0xddaa00, 1);
    bg.fillRect(width * 0.15, 90, width * 0.7, 2);
    bg.fillRect(width * 0.15, height - 70, width * 0.7, 2);

    // ── Header ────────────────────────────────────────────────────────────
    this.add.text(width / 2, 40, 'VICTORY!', {
      fontSize: '42px', fontFamily: 'Georgia, serif', fontStyle: 'bold',
      color: '#ffdd44', stroke: '#000000', strokeThickness: 5,
    }).setOrigin(0.5);

    this.add.text(width / 2, 78, `${this.missionId} — ${MISSION_NAMES[this.missionId]}`, {
      fontSize: '13px', fontFamily: 'monospace', color: '#888888',
    }).setOrigin(0.5);

    this.add.text(width / 2, 104,
      `+${totalXP} XP  ·  ${this.enemiesKilled} enemies defeated` + (tytrateReward ? `  ·  +${tytrateReward} T` : ''), {
      fontSize: '14px', fontFamily: 'monospace', color: '#aaaacc',
    }).setOrigin(0.5);

    // ── Party XP rows ─────────────────────────────────────────────────────
    let y = 138;
    for (const unit of state.party) {
      this.drawUnitRow(unit, y, width, totalXP);
      y += 54;
    }

    // ── Level up notice ───────────────────────────────────────────────────
    if (this.levelUps.length > 0) {
      this.add.text(width / 2, height - 90, '★  LEVEL UP! ★', {
        fontSize: '17px', fontFamily: 'Georgia, serif', color: '#ffdd44',
      }).setOrigin(0.5);
      this.add.text(width / 2, height - 70, this.levelUps.map(lu => lu.unit.name).join('  ·  '), {
        fontSize: '12px', fontFamily: 'monospace', color: '#aaaaff',
      }).setOrigin(0.5);
    }

    // ── Continue button ───────────────────────────────────────────────────
    // Recruits join AFTER their introduction cutscene plays (not immediately
    // on victory) — the cutscene's own nextScene/nextSceneData chain is
    // redirected through RecruitClassScene so the class-choice + "joined
    // the team" announcement happens right where the story introduces them.
    const cutscene = this.isFirstClear ? CUTSCENE_AFTER[this.missionId] : null;
    const recruits = this.isFirstClear ? RECRUITS_AFTER[this.missionId] : null;
    const postCutsceneScene = recruits ? 'RecruitClassScene' : 'WorldMapScene';
    const postCutsceneData  = recruits ? { recruitIds: recruits, nextScene: 'WorldMapScene', nextSceneData: {} } : {};
    const afterScene     = cutscene ? 'StoryScene' : postCutsceneScene;
    const afterSceneData = cutscene
      ? { lines: cutscene.lines, location: cutscene.location, backdrop: cutscene.backdrop, nextScene: postCutsceneScene, nextSceneData: postCutsceneData }
      : postCutsceneData;

    // Loot now gets its own screen (2026-07-08 feedback: the inline grid
    // used to share this screen with the level-up notice/button below it,
    // both at fixed height-anchored positions, so a big haul routinely ran
    // underneath them and was unreadable) — build the handoff chain
    // backwards from the original destination: afterScene, wrapped by
    // LevelUpScene if anyone leveled, wrapped by LootScene if anything dropped.
    const afterLevelUp = { scene: afterScene, data: afterSceneData };
    const afterLoot = this.levelUps.length > 0
      ? { scene: 'LevelUpScene', data: { levelUps: this.levelUps, nextScene: afterLevelUp.scene, nextSceneData: afterLevelUp.data } }
      : afterLevelUp;
    const firstStep = this.allDrops.length > 0
      ? { scene: 'LootScene', data: { allDrops: this.allDrops, nextScene: afterLoot.scene, nextSceneData: afterLoot.data } }
      : afterLoot;

    const btnLabel = this.allDrops.length > 0 ? 'LOOT  ▶'
      : this.levelUps.length > 0 ? 'LEVEL UP  ▶'
      : (cutscene ? 'CONTINUE  ▶' : 'WORLD MAP  ▶');
    drawButton(this, {
      x: width / 2, y: height - 30, w: 200, h: 40, label: btnLabel,
      fontSize: '16px', bg: 0x224422, bgHover: 0x2e582e, border: 0x44aa44, accent: 0xffff88,
      textColor: '#ffffff', textHoverColor: '#ffff88',
      onClick: () => this.scene.start(firstStep.scene, firstStep.data),
    });
  }

  drawUnitRow(unit, y, width, xpGained) {
    const lx = 60, barW = 480, barH = 10;
    const level   = unit.level;
    const xpPrev  = unit.xp;                // already updated by addXP
    const needed  = xpToNext(level);
    const pct     = Math.min(xpPrev / needed, 1);

    // Color badge
    const gfx = this.add.graphics();
    gfx.fillStyle(unit.color, 1);
    gfx.fillCircle(lx, y + 14, 10);

    // Name + level
    this.add.text(lx + 18, y + 4, `${unit.name}`, {
      fontSize: '13px', fontFamily: 'monospace', color: '#dddddd',
    });
    this.add.text(lx + 18, y + 20, `Lv.${level}`, {
      fontSize: '11px', fontFamily: 'monospace', color: '#888888',
    });

    // XP bar background
    gfx.fillStyle(0x222233, 1);
    gfx.fillRect(lx + 70, y + 18, barW, barH);
    // XP fill
    gfx.fillStyle(0x44aaff, 1);
    gfx.fillRect(lx + 70, y + 18, barW * pct, barH);

    // XP label
    this.add.text(lx + 70 + barW + 8, y + 16, `${xpPrev}/${needed}`, {
      fontSize: '10px', fontFamily: 'monospace', color: '#666688',
    });

    // LEVEL UP badge
    const wasLevelUp = this.levelUps?.some(lu => lu.unit === unit);
    if (wasLevelUp) {
      this.add.text(lx + 70 + barW + 55, y + 6, 'LEVEL UP!', {
        fontSize: '11px', fontFamily: 'monospace', fontStyle: 'bold', color: '#ffdd44',
      });
    }
  }
}
