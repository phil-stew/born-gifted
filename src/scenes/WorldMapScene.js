import Phaser from 'phaser';
import { state, saveGame, allAcademyQuestsDone, allGaleQuestsDone } from '../data/gameState.js';
import { stripBackgroundByKey } from '../data/heroSprites.js';
import { BACKDROPS } from '../data/storyBackdrops.js';
import { drawButton } from '../ui/canvasButton.js';
import { HUB_CONFIGS } from '../data/hubConfigs.js';
import { getItem } from '../data/items.js';
import { playMusic } from '../audio/music.js';

// `connectsFrom` replaces the old implicit "connect to NODES[i-1]" ordering
// so the map graph can branch — every node names its own parent explicitly,
// and a node with `side:true` is an optional bonus battle off the main
// chain rather than a required step in it (see drawConnections/drawNodes).
//
// M0-M4 layout (July 2026 redesign) — replaces the old Sirblanc/Hilbert
// Forest/Outskirts/Borders/Field tutorial chain. M0 is now the home hub
// (was M1); M0a/M0b are side nodes off the village gated by mission-complete
// and character-level respectively (see onMissionClick). M3 becomes a hub
// (The Capital) instead of a battle, running its own multi-stage questline
// (state.capitalQuest — see Phase 3 of the redesign plan) that unlocks
// M3a/M3b/A1/A2 in turn; M4 becomes the (non-repeatable) exam boss fight.
// M5 "Ember Hollow" (2026-07-11) and M6-M11 + their M13/M14 side battles
// (2026-07-11, "going to rewrite") were removed entirely. M12 ("Earthscar
// Basin") and its M15 side battle briefly replaced them as the post-exam
// content, then were removed too the same day ("remove m12") once the
// Altroes Trials/Gale content took shape — the main chain now ends at M5
// (Gale), reached via onCapitalClick's Tournament option once M4's exam
// and all 6 academy quests are done. See the note on Trice's dropped
// auto-join in VictoryScene.js (same treatment as Kael's, tied to the
// removed M5/M6 — unrelated to the CURRENT M5, which reuses that id). The
// main chain has since grown past Gale again: M6 (2026-07-17, "The
// Corrupted One") reuses that same freed-up id for a brand-new required
// battle south-east of Gale, unlocked once the Gale Tournament (GT) is
// cleared — see the id's own comment further down and the live check in
// create(). Unrelated to the M6 described in this paragraph, which no
// longer exists.
const NODES = [
  { id:'M0',  x:100, y:180, arc:'Home',    name:'Hidden Village' },
  { id:'M0a', x:40,  y:120, arc:'Home',    name:'Hidden Cave',    connectsFrom:'M0', side:true },
  { id:'M0b', x:40,  y:240, arc:'Home',    name:"Wolf's Den",     connectsFrom:'M0', side:true },
  { id:'M1',  x:175, y:230, arc:'Tutorial',name:'Sirblanc Outskirts', connectsFrom:'M0' },
  { id:'M2',  x:255, y:185, arc:'Tutorial',name:'Thunder Plains',     connectsFrom:'M1' },
  { id:'M3',  x:370, y:158, arc:'Capital', name:'The Capital',        connectsFrom:'M2' },
  { id:'M3a', x:370, y:70,  arc:'Capital', name:'Northern Cave',      connectsFrom:'M3', side:true },
  { id:'M3b', x:370, y:246, arc:'Capital', name:'Hilbert Low Lands',  connectsFrom:'M3', side:true },
  { id:'A1',  x:460, y:95,  arc:'Capital', name:'Ester Academy',      connectsFrom:'M3' },
  { id:'A2',  x:460, y:225, arc:'Capital', name:'Hilbert Academy',    connectsFrom:'M3' },
  // Ester Academy's 3 quests (2026-07-11) — own nodes off A1, same
  // "distinct from M3a/M3b" treatment Hilbert's A2a/A2b/A2c got. Only 2 get
  // map nodes (Quest 3, "5 party members," is a pure roster-size check with
  // no battle — see QUEST_DEFS.grow_the_party in gameState.js).
  // Pulled in from x:610 to x:540 (2026-07-11 follow-up, "closer to a1 n
  // a2") — side nodes draw a 25px-radius diamond outline on top of their
  // base circle (see drawNodes), so they need more clearance around M4's
  // node at (540,158) than two plain circles would — kept at least ~50px
  // from any neighboring node center to avoid the diamond outlines touching.
  { id:'A1a', x:540, y:25,  arc:'Capital', name:"Dragon's Roost",     connectsFrom:'A1', side:true },
  { id:'A1b', x:540, y:105, arc:'Capital', name:'The Great Boulder',  connectsFrom:'A1', side:true },
  // Hilbert Academy's 3 quests (2026-07-11) — own nodes off A2, distinct
  // from M3a/M3b's Capital-trial fights above (see BattleScene.js's
  // MISSION_CONFIGS comment on the same date).
  { id:'A2a', x:540, y:210, arc:'Capital', name:"Lion's Pride",       connectsFrom:'A2', side:true },
  { id:'A2b', x:540, y:265, arc:'Capital', name:'Goblin Warcamp',     connectsFrom:'A2', side:true },
  { id:'A2c', x:540, y:330, arc:'Capital', name:'Cave Depths',        connectsFrom:'A2', side:true },
  { id:'M4',  x:540, y:158, arc:'Academy', name:'Arena Atlros',       connectsFrom:'M3' },
  // Altroes Trials + the next school's tournament (2026-07-11) — becomes
  // visible once M4's cleared AND all 6 academy quests are done (see the
  // live check in create() above). Required main-chain steps now, not side
  // battles. See MISSION_NEXT in VictoryScene.js for the matching chain fix.
  // Battle 1/2 (2026-07-11 follow-up) — repositioned to branch directly off
  // their own academy (AT1 north of A1, AT2 south of A2) with a short
  // connector line, rather than trailing off M4/each other. Both unlock
  // together off the same 6-quests-done gate now (order-independent), not
  // sequentially.
  { id:'AT1', x:460, y:30,  arc:'Tournament', name:'Altroes Trials I',   connectsFrom:'A1' },
  { id:'AT2', x:460, y:300, arc:'Tournament', name:'Altroes Trials II',  connectsFrom:'A2' },
  // M5 (2026-07-11 follow-up, "connect m5 to m4... Gale unlocked after
  // beat both trails") — connects straight from M4 instead of AT2, moved
  // toward the Gale side of the map, and gated by a live "AT1 AND AT2 both
  // completed" check (see create()) instead of a single MISSION_NEXT
  // trigger — order-independent, same reasoning as AT1/AT2 themselves.
  // Second follow-up, same day: "M5 will be redone as Gale, the next
  // kingdom city, not a battle scene" — M5 is now a HUB (see HubScene
  // handling in onMissionClick, same treatment as A1/A2/M3), same unlock
  // gate as before.
  // Third follow-up, same day: "the m5a should be one of the At1 battles...
  // remove m5a" — M5a's epic-gear content moved into AT1 (see
  // BattleScene.js's MISSION_CONFIGS), and the node itself is gone.
  // Fourth follow-up, same day: "need to remove m5b" — no merge target
  // given this time (unlike M5a→AT1), so it's just deleted outright. Gale
  // (M5) is now a pure hub with no battle attached to it at all.
  // Fifth follow-up, same day: "remove m12" — M12 (Earthscar Basin) is
  // gone too, no merge target given again. M15 (Sunken Quarry) removed
  // alongside it — it had zero standalone identity, always described as
  // "off M12"/"off the edge of Earthscar Basin" and mechanically 100%
  // dependent on M12 (connectsFrom + SIDE_MISSION_UNLOCK), so keeping a
  // dangling side-battle whose entire premise no longer exists didn't
  // seem worth asking about — flagged in this session's memory in case
  // that reads as the wrong call. The main chain now ends at M5 (Gale).
  { id:'M5',  x:610, y:190, arc:'Tournament', name:'Gale',               connectsFrom:'M4' },
  // Two more hub cities branching off Gale (2026-07-11 sixth follow-up) —
  // "north of m5... Artfall academy... recruit martial arts units" and
  // "zester to the east... recruit performance class." Same plain-hub
  // treatment as Gale itself (see onMissionClick's node.id==='M5' branch,
  // generalized to cover these two as well) — bare shop+recruit services,
  // no quest board/task list invented for either (wasn't asked for, same
  // "minimum viable hub" call Gale got). Both unlock alongside Gale itself
  // (same live "AT1 AND AT2 both completed" check in create()).
  { id:'AF',  x:670, y:80,  arc:'Tournament', name:'Artfall Academy',    connectsFrom:'M5' },
  { id:'ZE',  x:700, y:190, arc:'Tournament', name:'Zester',             connectsFrom:'M5' },
  // Alpha King Dragon (2026-07-11) — boss node NE of Artfall Academy,
  // "3 times hp and 3 times attack" reads as the game's existing
  // kind:'boss' BOSS_STAT_MULT=3.0 treatment (see buildMonster() in
  // monsters.js) — no new multiplier mechanic needed, just the standard
  // boss-tier ladder with a custom name, same as King Wolf/King Lion/
  // Goblin King. Unlocks alongside AF/ZE/M5 (same live check).
  { id:'DK',  x:740, y:30,  arc:'Tournament', name:'Alpha King Dragon',  connectsFrom:'AF', side:true },
  // Monster Hunt (2026-07-11) — repeatable score-attack quest NE of Zester,
  // "gale gives out 3 quest[s]... kill as many monster as you can in 6
  // turn[s]." Unlocks alongside AF/ZE/DK/M5 (same live check).
  { id:'MH',  x:750, y:130, arc:'Tournament', name:'Monster Hunt',       connectsFrom:'ZE', side:true },
  // Gale Tournament (2026-07-12, "after clearing the 3 quest[s] the
  // tournament opens North west of Artfall facing other units with epic
  // gears") — capstone battle, unlocked only once ALL 3 of Gale's own
  // quests are done (separate live check from the AF/ZE/DK/M5/MH one,
  // which only needs AT1+AT2 — see allGaleQuestsDone in gameState.js).
  { id:'GT',  x:590, y:20,  arc:'Tournament', name:'Gale Tournament',    connectsFrom:'AF', side:true },
  // M6 — The Corrupted One's monsters (2026-07-17, "south east of m5...
  // moving towards new area... it will branch down"). Required main-chain
  // step (not side:true) so it draws a solid connector rather than dashed,
  // reusing Gale as the visual parent even though the unlock GATE is GT's
  // completion (see the live check in create()) — same "connectsFrom is
  // just the line, the real gate is a separate check" pattern M5/AT1/AT2
  // already use. Placed in the empty space south-east of Gale/Zester with
  // room below it for whatever the new area turns into.
  { id:'M6',  x:680, y:290, arc:'Blight', name:'Blightreach',        connectsFrom:'M5' },
  // M7 — the villain's reveal (2026-07-17, "M7 south of m6 the villian
  // will show himself... taking there spot in the tournemnt... the hero
  // should lose them fight no matter what"). Required main-chain step,
  // south of M6, unlocked the normal way (MISSION_NEXT.M6:'M7' in
  // VictoryScene.js) since M6 IS a normal winnable battle. M7 itself is a
  // scripted, unwinnable loss (see MISSION_CONFIGS.M7's `scriptedDefeat`
  // in BattleScene.js) — the defeat itself is what chains into M7a/the
  // Noble Deity, not a WorldMapScene unlock check.
  { id:'M7',  x:680, y:370, arc:'Blight', name:'The Grand Arena',    connectsFrom:'M6' },
  // M7a — the Noble Deity's rescue (2026-07-17, "after the defeat the
  // hero will wake up to the east of M7... encounter the Noble Daity").
  // Not a battle or a real multi-service hub — a landmark for where the
  // scripted-defeat cutscene chain (in BattleScene's checkEndConditions)
  // lands the party, and the visual `connectsFrom` parent for the 7
  // trial nodes below. completedMissions/unlockedMissions gain 'M7a' and
  // 'T1'-'T7' all at once as part of THAT cutscene chain, not through any
  // click-time or live-check logic here — see onMissionClick's plain
  // toast-only handling for it (there's nothing to "enter"). Deliberately
  // has no HUB_CONFIGS entry, so [[feedback_forge_every_hub]]'s "every hub
  // gets forge" rule doesn't apply to it — it was never made a real hub.
  { id:'M7a', x:755, y:370, arc:'Trial', name:"The Noble Deity",     connectsFrom:'M7' },
  // The 7 Trials (2026-07-17, "7 trail... 1 trial for each weapon class")
  // — one per CLASS_GEAR_LAYOUT/classGrouping key (gameState.js), the same
  // 7 groupings GEAR_CLASS_COL/items.js already treats as authoritative.
  // Laid out in a row along the bottom of the map (empty space, per
  // drawScenery's own margin comment) — side:true (diamond marker) since
  // clearing all 7 isn't gated behind each other or required to keep
  // playing, just to fully gear up before whatever the eventual Corrupted
  // One rematch turns out to be. TRIAL_CLASS in BattleScene.js maps each
  // id to its classGrouping string for both the battle's enemy flavor and
  // VictoryScene's reward wiring (rollGodTierClassItem per matching-class
  // party member).
  { id:'T1',  x:90,  y:510, arc:'Trial', name:'Trial of Athletics',     connectsFrom:'M7a', side:true },
  { id:'T2',  x:193, y:510, arc:'Trial', name:'Trial of Martial Arts',  connectsFrom:'M7a', side:true },
  { id:'T3',  x:297, y:510, arc:'Trial', name:'Trial of Performance',   connectsFrom:'M7a', side:true },
  { id:'T4',  x:400, y:510, arc:'Trial', name:'Trial of Target',        connectsFrom:'M7a', side:true },
  { id:'T5',  x:503, y:510, arc:'Trial', name:'Trial of Ball',          connectsFrom:'M7a', side:true },
  { id:'T6',  x:607, y:510, arc:'Trial', name:'Trial of Bat & Ball',    connectsFrom:'M7a', side:true },
  { id:'T7',  x:710, y:510, arc:'Trial', name:'Trial of Racquet',       connectsFrom:'M7a', side:true },
  // Lametus Capital + its 2 academies (2026-07-17, "after m7a is
  // completed the m8 apears which becomes the lametus capital... one
  // school in the east of M8 and the other west"). Unlocked all at once
  // alongside M7a/T1-T7 in BattleScene.js's triggerScriptedDefeat (not a
  // live check here) — plain hubs (see HUB_CONFIGS.M8/A3/A4), so only
  // ever added to unlockedMissions, never completedMissions, same as
  // M5/AF/ZE. Sits between M7 and the trial row — checked clearance
  // against T6/T7's diamond markers below it.
  { id:'M8',  x:680, y:450, arc:'Lametus', name:'Lametus Capital',  connectsFrom:'M7' },
  { id:'A3',  x:610, y:450, arc:'Lametus', name:'Wrenfield Academy', connectsFrom:'M8' },
  { id:'A4',  x:750, y:450, arc:'Lametus', name:'Calder Academy',    connectsFrom:'M8' },
  // The Golem Trial (2026-07-18, "North of A3 they will fight the
  // Golems as there last trial") — required (not side:true): it's the
  // Final Tournament's entry requirement, not an optional God Tier grind
  // like T1-T7. Unlocked the moment M8's first-visit story plays (see
  // onMissionClick's M8 handler), not a live check.
  { id:'TG',  x:610, y:385, arc:'Lametus', name:'Stonewake Pass',    connectsFrom:'A3' },
  // The Final Tournament (2026-08-03) — the story's finale, back at the
  // Grand Arena (same landmark as M7/M7a, arc:'Blight' to match its color
  // there) now that the tournament is actually happening instead of
  // cancelled. Unlocked by MISSION_NEXT.TG:'FT' in VictoryScene.js like
  // any other main-chain step, even though first entry normally happens
  // automatically through TG's own cutscene rather than a click here — see
  // NEW_AREA_INTRO.FT above.
  { id:'FT',  x:680, y:320, arc:'Blight', name:'The Final Tournament', connectsFrom:'TG' },
];

const ARC_COLORS = {
  Home:       0xffcc66,
  Tutorial:   0x44cc88,
  Capital:    0xcc88ff,
  Academy:    0x4488ff,
  Selection:  0xffaa44,
  Tournament: 0xff4444,
  // The Corrupted One's arc (2026-07-17) — dark purple instead of
  // Tournament's red so the map reads a new, more ominous story beat
  // starting here, distinct from Gale's tournament-and-trials content.
  Blight:     0x8822cc,
  // The Noble Deity's arc (2026-07-17) — warm gold, deliberately the
  // opposite end of the palette from Blight's corruption-purple so the
  // "ally/hope" beat reads as visually distinct from the "villain" one.
  Trial:      0xffcc33,
  // Lametus Capital + its 2 academies (2026-07-17) — soft green, matching
  // the LAMETUS kingdom label's own color (#aaffbb) rather than either of
  // the story-beat colors above (Blight/Trial) since this is just "the
  // kingdom itself," not tied to the villain or the Deity specifically.
  Lametus:    0x66dd88,
};

// One-time story beat shown the first time each region cave/unique-area
// mission is entered — mirrors the M2/M4 pattern. Reuses the existing
// cave/wilds backdrops (no new art) since none of these areas have
// dedicated painterly art yet. M6-M11 and their M13/M14 side battles were
// removed 2026-07-11 ("going to rewrite"); M12/M15 (Lametus) were removed
// the same day too ("remove m12") — the main chain now ends at M5 (Gale).
const NEW_AREA_INTRO = {
  // Dragon's Roost (Ester Academy's "defeat 1 dragon and two wyverns"
  // quest, A1a) — never had an intro cutscene at all until this pass
  // (2026-07-18, "use these in the Altroes region" — volcano.png existed
  // on disk with no caller). A1a/A1b's own onMissionClick branch skips
  // this table entirely by default (straight to BattleScene) — updated
  // that branch to check NEW_AREA_INTRO first, same first-visit-only gate
  // every other mission's intro uses, so A1b (no entry here) is unaffected.
  A1a: {
    location: "ALTROES  ·  Dragon's Roost",
    backdrop: BACKDROPS.altroesVolcano,
    lines: [
      { speaker: 'Narrator', color: '#888899', text: 'The roost sits high on a volcanic ridge overlooking Ester Academy — the air shimmers with heat, and something large is circling above.' },
      { speaker: 'Reno',     color: '#4488ff', text: '...A dragon. And it brought company.' },
    ],
  },
  // Altroes Trials + the next school's tournament (2026-07-11) — same
  // intro-then-battle flow, gated by the live "all 6 quests done" check
  // instead of a MISSION_NEXT completion hook (see WorldMapScene's
  // create()).
  // AT1's opponents are now a real tournament team in epic gear (2026-07-11
  // third follow-up, "the m5a should be one of the At1 battles" — folded
  // M5a's content into AT1, see BattleScene.js) — text updated to match.
  // 2026-07-18 — swapped from BACKDROPS.wilds to altroesArena (grandarena.png,
  // previously unused) since these are real tournament trials, not a wilds
  // encounter.
  AT1: {
    location: 'ALTROES  ·  The Trials',
    backdrop: BACKDROPS.altroesArena,
    lines: [
      { speaker: 'Narrator', color: '#888899', text: 'Word reaches the Capital: both academies have vouched for you. Altroes itself wants to see what you\'ve learned — and they\'re sending a real tournament team, decked out in gear far better than anything you\'ve faced yet.' },
      { speaker: 'Reno',     color: '#4488ff', text: '...The Trials. Let\'s show them.' },
    ],
  },
  AT2: {
    location: 'ALTROES  ·  The Trials',
    backdrop: BACKDROPS.altroesArena,
    lines: [
      { speaker: 'Narrator', color: '#888899', text: 'One trial down. The second is harder — Altroes doesn\'t make this easy.' },
    ],
  },
  // Alpha King Dragon (2026-07-11) — boss node NE of Artfall Academy.
  DK: {
    location: 'GALE  ·  The Frozen Peaks',
    backdrop: BACKDROPS.galeWilds,
    lines: [
      { speaker: 'Narrator', color: '#888899', text: 'Past Artfall, the mountains sharpen into jagged peaks — locals call it the Alpha King\'s hunting ground.' },
      { speaker: 'Reno',     color: '#4488ff', text: '...Let\'s see if the stories are true.' },
    ],
  },
  // Monster Hunt (2026-07-11) — repeatable score-attack quest NE of Zester.
  MH: {
    location: 'GALE  ·  Monster Hunt',
    backdrop: BACKDROPS.galeWilds,
    lines: [
      { speaker: 'Narrator', color: '#888899', text: 'East of Zester, the wilds are thick with monsters — the local hunters have a standing bounty for anyone who can thin them out.' },
      { speaker: 'Reno',     color: '#4488ff', text: '...Six turns, as many as we can. Let\'s go.' },
    ],
  },
  // Gale Tournament (2026-07-12) — capstone battle NW of Artfall.
  // Backdrop swapped 2026-07-18 from BACKDROPS.school (a cross-region reuse
  // of Altroes' castle1.png) to Gale's own galeArena (Snowarena.png).
  GT: {
    location: 'GALE  ·  The Tournament',
    backdrop: BACKDROPS.galeArena,
    lines: [
      { speaker: 'Narrator', color: '#888899', text: 'Word gets around fast in Gale. Having proven yourself three times over, the region\'s best team wants a real match — full gear, no excuses.' },
      { speaker: 'Reno',     color: '#4488ff', text: '...Let\'s show them what we\'ve learned.' },
    ],
  },
  // M6 — Lametus's trial, ambushed by The Corrupted One's monsters
  // (2026-07-17, "when they encounter the monster they sense something is
  // not right with these monster as they discuss the monsters attack") —
  // the party's mid-conversation when the fight actually starts, matching
  // MISSION_CONFIGS.M6's enemyFirst flag (the monsters get the opening
  // move, not the player).
  M6: {
    location: 'LAMETUS  ·  The Trial Grounds',
    // Was BACKDROPS.galeWilds (placeholder — no dedicated Lametus art was
    // registered yet when M6 first shipped). Swapped to the real thing
    // once lametusWilds got added (2026-07-17, same pass as M7/M7a).
    backdrop: BACKDROPS.lametusWilds,
    lines: [
      { speaker: 'Narrator', color: '#888899', text: 'Lametus\'s trial grounds sit past a stretch of wilds gone strangely quiet — no birds, no wind through the grass, just a sour taste in the air.' },
      { speaker: 'Drace',    color: '#88cc66', text: '...This is where we\'re supposed to prove ourselves?' },
      { speaker: 'Reno',     color: '#4488ff', text: 'Something\'s not right with those monsters up ahead. Look how still they\'re standing. That glow around them isn\'t natural.' },
      { speaker: 'Kael',     color: '#ffaa44', text: 'You think someone\'s controll—' },
      { speaker: 'Narrator', color: '#888899', text: 'Before he can finish, the monsters move as one — and the trial begins without them.' },
    ],
  },
  // M7 — the villain's reveal (2026-07-17, "the villian will show himself
  // and the the heroes he is taking there spot in the tournemnt"). First
  // time The Corrupted One gets dialogue lines of his own rather than
  // being talked about secondhand. Ends on the same "battle starts
  // without further input" beat M6 used, since MISSION_CONFIGS.M7 is a
  // scripted, unwinnable loss (see BattleScene.js) — no "let's go"
  // closing line from Reno here on purpose, there's no brave send-off to
  // give before getting curb-stomped.
  M7: {
    location: 'LAMETUS  ·  The Grand Arena',
    backdrop: BACKDROPS.lametusArena,
    lines: [
      { speaker: 'Narrator',          color: '#888899', text: 'The Grand Arena should be packed for the trial match. Instead it\'s dead silent — torn banners, empty seats, not a soul in sight.' },
      { speaker: 'The Corrupted One', color: '#aa44ff', text: 'Looking for someone? Your little tournament has been... cancelled. I\'m taking your spot.' },
      { speaker: 'Reno',              color: '#4488ff', text: '...So you finally show yourself.' },
      { speaker: 'The Corrupted One', color: '#aa44ff', text: 'You\'ve survived my monsters twice now. Let\'s see how you fare against my strongest.' },
      { speaker: 'Narrator',          color: '#888899', text: 'This is unlike anything they\'ve faced before.' },
    ],
  },
  // The Noble Deity's 7 Trials (2026-07-17) — brief, mostly-interchangeable
  // intro beats (same shared backdrop, same "prove yourself" framing) since
  // nothing about their individual challenge was specified beyond the
  // class each one tests — see TRIAL_CLASS in gameState.js. Only the
  // opening line varies per class to avoid all 7 reading as copy-paste.
  T1: {
    location: 'LAMETUS  ·  Trial of Athletics',
    backdrop: BACKDROPS.lametusTrainingField,
    lines: [
      { speaker: 'Narrator', color: '#888899', text: 'The Deity\'s first trial tests raw speed and endurance — no shortcuts, no tricks, just outlasting whoever she sends.' },
      { speaker: 'Reno',     color: '#4488ff', text: '...One down, six to go. Let\'s move.' },
    ],
  },
  T2: {
    location: 'LAMETUS  ·  Trial of Martial Arts',
    backdrop: BACKDROPS.lametusTrainingField,
    lines: [
      { speaker: 'Narrator', color: '#888899', text: 'This trial wants discipline as much as strength — a fighter who\'s trained for this far longer than you have.' },
    ],
  },
  T3: {
    location: 'LAMETUS  ·  Trial of Performance',
    backdrop: BACKDROPS.lametusTrainingField,
    lines: [
      { speaker: 'Narrator', color: '#888899', text: 'Grace under pressure — the Deity\'s performers make it look effortless. It isn\'t.' },
    ],
  },
  T4: {
    location: 'LAMETUS  ·  Trial of Target',
    backdrop: BACKDROPS.lametusTrainingField,
    lines: [
      { speaker: 'Narrator', color: '#888899', text: 'One shot, one chance — this trial doesn\'t forgive a shaky aim.' },
    ],
  },
  T5: {
    location: 'LAMETUS  ·  Trial of Ball',
    backdrop: BACKDROPS.lametusTrainingField,
    lines: [
      { speaker: 'Narrator', color: '#888899', text: 'Fast hands, faster feet — the Deity\'s ball players don\'t give you a second to think.' },
    ],
  },
  T6: {
    location: 'LAMETUS  ·  Trial of Bat & Ball',
    backdrop: BACKDROPS.lametusTrainingField,
    lines: [
      { speaker: 'Narrator', color: '#888899', text: 'Timing over power — swing early or late here and you\'ll pay for it.' },
    ],
  },
  T7: {
    location: 'LAMETUS  ·  Trial of Racquet',
    backdrop: BACKDROPS.lametusTrainingField,
    lines: [
      { speaker: 'Narrator', color: '#888899', text: 'The last of the seven — reflexes sharp enough to return anything thrown back at you.' },
    ],
  },
  // The Golem Trial (2026-07-18) — north of Wrenfield, the party's
  // entry-requirement fight for the Final Tournament.
  TG: {
    location: 'LAMETUS  ·  Stonewake Pass',
    backdrop: BACKDROPS.lametusTrainingField,
    lines: [
      { speaker: 'Narrator', color: '#888899', text: 'North of Wrenfield, the road narrows into a boulder-strewn pass — and the boulders are moving.' },
      { speaker: 'Reno',     color: '#4488ff', text: '...Golems. Guess this is our proof.' },
    ],
  },
  // The Final Tournament (2026-08-03) — TG's own victory cutscene routes
  // straight into this battle on FIRST clear (see VictoryScene.js's
  // CUTSCENE_AFTER.TG / postCutsceneScene override), bypassing this table
  // and missionIntroShown entirely that time — the imposter-reveal beat
  // already played there. This entry only fires if the fight is lost and
  // the party re-enters through the map afterward, so it's a short
  // "back in" line rather than a rerun of the reveal.
  FT: {
    location: 'LAMETUS  ·  The Grand Arena',
    backdrop: BACKDROPS.lametusArena,
    lines: [
      { speaker: 'Narrator', color: '#888899', text: 'The Grand Arena, sand still scorched from last time. The Corrupted One and his strongest are waiting exactly where you left them.' },
      { speaker: 'Reno',     color: '#4488ff', text: '...Round two. Let\'s finish it.' },
    ],
  },
};

const ARC_LABEL_POS = {
  Home:       { x: 60,  y: 300 },
  Tutorial:   { x: 240, y: 130 },
  Capital:    { x: 460, y: 40 },
  Academy:    { x: 365, y: 305 },
  Selection:  { x: 690, y: 130 },
  Tournament: { x: 600, y: 518 },
  Blight:     { x: 680, y: 335 },
  // Placed off to the side (not centered over the 7-node row) to dodge
  // both the LAMETUS kingdom label (x:330-480, y:416-458) and the trial
  // nodes' own side:true diamond markers (25px radius around each).
  Trial:      { x: 150, y: 400 },
  // Shifted from (610,400) to dodge TG's new node at (610,385) — see NODES.
  Lametus:    { x: 545, y: 465 },
};

// tiles/mapasset/treesrock.png — 7 cols × 4 rows of decorative scenery icons
// (trees / rock & ore piles / volcanoes / mountains). Only used here as
// ambient corner dressing for the world map — named cells are just the
// handful actually placed by drawScenery(), not the full sheet.
const MAP_ASSET_SHEET = { cols: 7, rows: 4, cellW: 1536 / 7, cellH: 1024 / 4 };
const MAP_ASSET_CELL = {
  oak_tree:     [0, 0], pine_tree:   [0, 1], willow_tree: [0, 5],
  mountain_snow:[3, 4], mountain_sand:[3, 5], pond:        [3, 6],
};

export class WorldMapScene extends Phaser.Scene {
  constructor() { super({ key: 'WorldMapScene' }); }

  preload() {
    // hero sprites loaded in BattleScene; WorldMap needs none
    if (!this.textures.exists('mapscenery')) this.load.image('mapscenery', 'tiles/mapasset/treesrock.png');
    if (!this.textures.exists('mapbackg'))   this.load.image('mapbackg', 'world/title/mapbackg.png');
  }

  _registerSceneryFrames() {
    if (!this.textures.exists('mapscenery')) return;
    stripBackgroundByKey(this, 'mapscenery', { cols: MAP_ASSET_SHEET.cols, rows: MAP_ASSET_SHEET.rows });
    const tex = this.textures.get('mapscenery');
    const { cellW, cellH } = MAP_ASSET_SHEET;
    for (const [id, [row, col]] of Object.entries(MAP_ASSET_CELL)) {
      const name = `scenery_${id}`;
      if (!tex.has(name)) tex.add(name, 0, col * cellW, row * cellH, cellW, cellH);
    }
  }

  create() {
    const { width, height } = this.scale;

    playMusic(this, 'world');

    // M0b (Wolf's Den) becomes KNOWN once any party unit hits level 8 — this
    // only makes the node/quest-menu entry visible; actually entering the
    // battle still requires accepting it at the Hidden Village's Quest Menu
    // (see onMissionClick's M0a/M0b gating on state.questAccepted).
    if (!state.unlockedMissions.includes('M0b') && state.party.some(u => u.level >= 8)) {
      state.unlockedMissions.push('M0b');
    }

    // Altroes Trials (2026-07-11, "after all 6 questions are done player
    // can take the Altroes trials") — NOT an automatic live check anymore
    // (2026-07-11 second follow-up, "after finishing the 6 quest play will
    // need to go back to M3 and a tournament option will appear") — the
    // player has to return to M3 and pick the Tournament option for AT1/AT2
    // to actually unlock; see the capitalQuest==='done' branch in
    // onCapitalClick() below. allAcademyQuestsDone(state) still gates
    // whether that option is offered.

    // The next school's tournament (2026-07-11 follow-up, "Gale unlocked
    // after beat both trails") — the Gale hub (M5) needs BOTH AT1 and AT2
    // completed, not just whichever one the player happens to finish last,
    // so this is a live "both done" check rather than a single MISSION_NEXT
    // trigger off either one alone. Gale has no battle attached to it (or
    // anything past it — M12/M15 removed 2026-07-11, "remove m12") — this
    // is now the map's endpoint. Artfall Academy (AF), Zester (ZE), the
    // Alpha King Dragon boss node (DK), and the Monster Hunt node (MH,
    // 2026-07-11 follow-up) all unlock alongside it — same "pushed
    // together" treatment A1a/A1b get alongside A1.
    if (!state.unlockedMissions.includes('M5')
      && state.completedMissions.includes('AT1') && state.completedMissions.includes('AT2')) {
      state.unlockedMissions.push('M5', 'AF', 'ZE', 'DK', 'MH');
    }

    // Gale Tournament (2026-07-12, "after clearing the 3 quest[s] the
    // tournament opens") — separate live check, needs all 3 of Gale's OWN
    // quests done (not just AT1/AT2), same "live check, not a completion
    // hook" reasoning as every other quest-gated unlock this arc.
    if (!state.unlockedMissions.includes('GT') && allGaleQuestsDone(state)) {
      state.unlockedMissions.push('GT');
    }

    // M6 — The Corrupted One's monsters (2026-07-17, "M6 will be moving the
    // story forward after GT") — live check off GT's OWN completion, not a
    // MISSION_NEXT hook, since GT (like DK/MH) is fought straight from
    // Gale's node rather than through a chained VictoryScene "next mission."
    if (!state.unlockedMissions.includes('M6') && state.completedMissions.includes('GT')) {
      state.unlockedMissions.push('M6');
    }

    saveGame();

    this.tooltipText = null;
    this._registerSceneryFrames();
    this.bg = this.add.graphics();
    this.drawBackground(width, height);
    this.drawScenery();
    this.drawConnections();
    this.drawArcLabels();
    this.drawNodes();
    this.drawUI(width, height);
    this.drawHeroMarker();
  }

  // Ambient corner dressing, tucked into the empty margins around the node
  // cluster (nodes span roughly x:120-700, y:158-498) so nothing overlaps a
  // mission node, arc label, or kingdom name.
  drawScenery() {
    if (!this.textures.exists('mapscenery')) return;
    const placements = [
      { id: 'oak_tree',      x: 46,  y: 540, scale: 0.16 },
      { id: 'pine_tree',     x: 86,  y: 555, scale: 0.14 },
      { id: 'willow_tree',   x: 754, y: 545, scale: 0.15 },
      { id: 'mountain_snow', x: 748, y: 60,  scale: 0.16 },
      { id: 'pond',          x: 60,  y: 60,  scale: 0.13 },
    ];
    for (const { id, x, y, scale } of placements) {
      const frame = `scenery_${id}`;
      if (!this.textures.get('mapscenery').has(frame)) continue;
      this.add.image(x, y, 'mapscenery', frame).setScale(scale).setAlpha(0.8).setDepth(1);
    }
  }

  drawBackground(width, height) {
    this.bg.fillStyle(0x0a0a18, 1);
    this.bg.fillRect(0, 0, width, height);

    if (this.textures.exists('mapbackg')) {
      const img = this.add.image(width / 2, height / 2, 'mapbackg').setDepth(0);
      const scale = Math.max(width / img.width, height / img.height);
      img.setScale(scale);
      // Scrim keeps the painterly art from fighting the node graph/labels on top
      this.add.rectangle(width / 2, height / 2, width, height, 0x05050a, 0.45).setDepth(0);
    }

    // Kingdom label text — stroked for legibility over the busier art
    this.add.text(70, 100, 'ALTROES', {
      fontSize: '28px', fontFamily: 'Georgia, serif', color: '#ffddaa',
      stroke: '#000000', strokeThickness: 4,
    }).setAlpha(0.55).setDepth(1);
    this.add.text(580, 92, 'GALE', {
      fontSize: '22px', fontFamily: 'Georgia, serif', color: '#bbddff',
      stroke: '#000000', strokeThickness: 4,
    }).setAlpha(0.55).setDepth(1);
    this.add.text(330, 430, 'LAMETUS', {
      fontSize: '28px', fontFamily: 'Georgia, serif', color: '#aaffbb',
      stroke: '#000000', strokeThickness: 4,
    }).setAlpha(0.55).setDepth(1);
  }

  drawConnections() {
    const gfx = this.add.graphics();
    for (const b of NODES) {
      if (!b.connectsFrom) continue;
      const a = NODES.find(n => n.id === b.connectsFrom);
      if (!a) continue;
      // Matches drawNodes()' skip: a line into a still-locked node would
      // point at empty space and hint a future node is there, so it's
      // withheld until that node actually unlocks.
      const isUnlocked = state.unlockedMissions.includes(b.id) || state.completedMissions.includes(b.id);
      if (!isUnlocked) continue;
      const color = ARC_COLORS[a.arc];
      if (b.side) {
        this.drawDashedLine(gfx, a.x, a.y, b.x, b.y, color, 0.55);
      } else {
        gfx.lineStyle(2, color, 0.55);
        gfx.lineBetween(a.x, a.y, b.x, b.y);
      }
    }
  }

  // Side-branch connectors are dashed so the main chain reads as the
  // required path at a glance, with optional detours visually distinct.
  drawDashedLine(gfx, x1, y1, x2, y2, color, alpha, dashLen = 6, gapLen = 5) {
    const dx = x2 - x1, dy = y2 - y1;
    const dist = Math.hypot(dx, dy);
    if (!dist) return;
    const ux = dx / dist, uy = dy / dist;
    gfx.lineStyle(2, color, alpha);
    for (let pos = 0; pos < dist; pos += dashLen + gapLen) {
      const ex = Math.min(pos + dashLen, dist);
      gfx.lineBetween(x1 + ux * pos, y1 + uy * pos, x1 + ux * ex, y1 + uy * ex);
    }
  }

  drawArcLabels() {
    for (const [arc, pos] of Object.entries(ARC_LABEL_POS)) {
      const hex = '#' + ARC_COLORS[arc].toString(16).padStart(6, '0');
      this.add.text(pos.x, pos.y, arc.toUpperCase(), {
        fontSize: '9px', fontFamily: 'monospace', color: hex,
      }).setOrigin(0.5).setAlpha(0.5);
    }
  }

  drawNodes() {
    this.nodeObjects = [];

    for (let i = 0; i < NODES.length; i++) {
      const node = NODES[i];
      const { id, x, y, arc } = node;
      const color = ARC_COLORS[arc];
      const isCompleted = state.completedMissions.includes(id);
      const isUnlocked  = state.unlockedMissions.includes(id);

      // Future levels stay fully unrendered until unlocked — no circle, no
      // label, no diamond outline, nothing at (x, y) to spoil what's ahead
      // or even that a node exists there. drawConnections() has its own
      // matching skip for the line leading into it.
      if (!isUnlocked && !isCompleted) continue;

      const gfx = this.add.graphics();

      if (isCompleted) {
        // Completed: muted fill + check
        gfx.fillStyle(color, 0.35);
        gfx.fillCircle(x, y, 18);
        gfx.lineStyle(2, color, 0.6);
        gfx.strokeCircle(x, y, 18);
        this.add.text(x, y, '✓', {
          fontSize: '14px', fontFamily: 'monospace', color: '#ffffff',
        }).setOrigin(0.5).setAlpha(0.7);

      } else {
        // Active: bright fill + pulse ring
        gfx.fillStyle(color, 1);
        gfx.fillCircle(x, y, 18);
        gfx.lineStyle(3, 0xffffff, 0.6);
        gfx.strokeCircle(x, y, 18);

        const pulse = this.add.arc(x, y, 24, 0, 360);
        pulse.setStrokeStyle(2, color, 0.9);
        pulse.isFilled = false;
        this.tweens.add({
          targets: pulse, scaleX: 1.8, scaleY: 1.8, alpha: 0,
          duration: 1500, ease: 'Sine.easeOut', repeat: -1, delay: i * 80,
        });
      }

      // Side battles get a diamond outline so they read as optional/bonus
      // at a glance, distinct from the required main-chain circles.
      if (node.side) {
        const r = 25;
        gfx.lineStyle(1.5, 0xffffff, 0.5);
        gfx.strokePoints(
          [{ x, y: y - r }, { x: x + r, y }, { x, y: y + r }, { x: x - r, y }],
          true,
        );
      }

      // Mission label
      this.add.text(x, y, id, {
        fontSize: '9px', fontFamily: 'monospace', fontStyle: 'bold',
        color: '#ffffff',
      }).setOrigin(0.5);

      // Shop/Forge badges — same 🛒/⚒ glyphs HubScene's own service tiles
      // use, so a hub's map marker previews what's inside it, for nodes
      // HUB_CONFIGS actually lists as having that service (every hub does
      // today, but this stays correct if a future hub doesn't).
      const services = HUB_CONFIGS[id]?.services ?? [];
      const hasShop  = services.includes('shop');
      const hasForge = services.includes('forge');
      if (hasShop || hasForge) {
        const by = y + 26;
        const bx0 = hasShop && hasForge ? x - 8 : x;
        if (hasShop) {
          this.add.circle(bx0, by, 7, 0x0d0d20, 0.85).setStrokeStyle(1, color, 0.7);
          this.add.text(bx0, by, '🛒', { fontSize: '8px' }).setOrigin(0.5);
        }
        if (hasForge) {
          const bx1 = hasShop ? x + 8 : x;
          this.add.circle(bx1, by, 7, 0x0d0d20, 0.85).setStrokeStyle(1, color, 0.7);
          this.add.text(bx1, by, '⚒', { fontSize: '8px' }).setOrigin(0.5);
        }
      }

      // Hit zone — use Zone (Phaser's invisible interactive object)
      const hit = this.add.zone(x, y, 52, 52).setInteractive({ useHandCursor: true });
      hit.on('pointerover', () => this.showTooltip(node, x, y));
      hit.on('pointerout',  () => this.hideTooltip());
      hit.on('pointerdown', () => this.onMissionClick(node));
    }
  }

  drawUI(width, height) {
    // Title
    this.add.text(width / 2, 16, 'WORLD MAP', {
      fontSize: '14px', fontFamily: 'monospace', fontStyle: 'bold', color: '#888899',
    }).setOrigin(0.5, 0);

    // Bottom bar background
    const barGfx = this.add.graphics();
    barGfx.fillStyle(0x0d0d20, 1);
    barGfx.fillRect(0, height - 48, width, 48);
    barGfx.lineStyle(1, 0x333355, 1);
    barGfx.lineBetween(0, height - 48, width, height - 48);

    // PARTY / INVENTORY / SAVE / EXIT — modern rounded/shadowed/accent-bar
    // buttons (shared with BattleScene's action menu / ShopScene's panels).
    drawButton(this, {
      x: 60, y: height - 24, w: 92, h: 32, label: 'PARTY',
      bg: 0x161630, bgHover: 0x223060, border: 0x3344aa, accent: 0xaaaaff,
      textColor: '#aaaaff', depth: 20,
      onClick: () => this.scene.start('PartyScene'),
    });
    drawButton(this, {
      x: 180, y: height - 24, w: 110, h: 32, label: 'INVENTORY',
      bg: 0x221a0e, bgHover: 0x332510, border: 0xaa7733, accent: 0xffaa44,
      textColor: '#ffaa44', depth: 20,
      onClick: () => this.scene.start('InventoryScene'),
    });
    drawButton(this, {
      x: 310, y: height - 24, w: 84, h: 32, label: 'SAVE',
      bg: 0x132213, bgHover: 0x1c331c, border: 0x338833, accent: 0x88cc88,
      textColor: '#88cc88', depth: 20,
      onClick: () => { saveGame(); this.showToast('Game saved'); },
    });
    drawButton(this, {
      x: 420, y: height - 24, w: 84, h: 32, label: 'EXIT',
      bg: 0x0e1a22, bgHover: 0x152733, border: 0x336688, accent: 0x88aacc,
      textColor: '#88aacc', depth: 20,
      onClick: () => {
        saveGame();
        this.cameras.main.fadeOut(400, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () =>
          this.scene.start('GameScene', { skipCrawl: true }));
      },
    });
    // Browsable classes/promotion/abilities/monsters/weaknesses reference
    // (2026-07-08 feedback) — always available, unlike HandbookScene which
    // stays gated behind the Capital's exam questline.
    drawButton(this, {
      x: 530, y: height - 24, w: 84, h: 32, label: 'INDEX',
      bg: 0x1a0e22, bgHover: 0x271533, border: 0x774499, accent: 0xcc99ee,
      textColor: '#cc99ee', depth: 20,
      onClick: () => this.scene.start('IndexScene'),
    });
    // Settings (2026-08-03 — previously title-screen-only). Icon-only to
    // fit the remaining gap before the Tytrate/mission-count text.
    drawButton(this, {
      x: 606, y: height - 24, w: 40, h: 32, label: '⚙',
      fontSize: '16px', radius: 6,
      bg: 0x14142a, bgHover: 0x1e1e3a, border: 0x334477, accent: 0xaaaaff,
      textColor: '#8899cc', depth: 20,
      onClick: () => this.scene.start('SettingsScene', { returnScene: 'WorldMapScene', returnData: {} }),
    });

    // Tytrate
    this.add.text(width - 16, height - 24, `T: ${state.tytrate}`, {
      fontSize: '14px', fontFamily: 'monospace', color: '#ddcc44',
    }).setOrigin(1, 0.5);

    // Mission count
    const done = state.completedMissions.length;
    this.add.text(width - 100, height - 24, `${done} / 18`, {
      fontSize: '12px', fontFamily: 'monospace', color: '#555566',
    }).setOrigin(1, 0.5);
  }

  drawHeroMarker() {
    if (!this.textures.exists('hero-Striker')) return;
    const home = NODES.find(n => n.id === 'M0');
    if (!home) return;
    // Small circular portrait clipped above the node
    const size = 28;
    this.add.image(home.x, home.y - 28, 'hero-Striker', 0)
      .setDisplaySize(38, 38)
      .setDepth(50);
  }

  showTooltip(node, nx, ny) {
    if (this.tooltipText) this.tooltipText.destroy();
    const isCompleted = state.completedMissions.includes(node.id);
    const status = isCompleted ? 'Completed' : 'Active';
    const kind = node.side ? 'Side Battle' : node.arc;
    const label = `${node.id}: ${node.name}\n${kind}  ·  ${status}`;
    const tx = Math.min(Math.max(nx, 100), 700);
    const ty = ny > 300 ? ny - 58 : ny + 30;
    this.tooltipText = this.add.text(tx, ty, label, {
      fontSize: '11px', fontFamily: 'monospace', color: '#ffffff',
      backgroundColor: '#111122', padding: { x: 10, y: 6 },
      align: 'center',
    }).setOrigin(0.5).setDepth(100);
  }

  hideTooltip() {
    if (this.tooltipText) { this.tooltipText.destroy(); this.tooltipText = null; }
  }

  onMissionClick(node) {
    this.hideTooltip();
    const isCompleted = state.completedMissions.includes(node.id);

    // ── M0: Hidden Village (home hub) ────────────────────────────────────
    // First visit plays the father's-request intro and unlocks M1. Once M1
    // is won, the NEXT visit to M0 turns it in (herbs + Tytrate reward
    // popup), then delivers the Academy-selection news and unlocks M2 —
    // this is what actually gates M2, not an automatic post-battle unlock
    // (see MISSION_NEXT in VictoryScene.js, which has no M1 entry on
    // purpose). Every other visit just opens the village hub.
    if (node.id === 'M0') {
      const storyDone = state.unlockedMissions.includes('M1');
      if (!storyDone) {
        state.unlockedMissions.push('M1');
        this.scene.start('StoryScene', {
          lines: [
            { speaker: 'Father', color: '#cc9955', text: 'Reno. The village healer is running low on supplies. We need Heal Herbs from the outskirts.' },
            { speaker: 'Father', color: '#cc9955', text: 'The wolves have been restless lately. Don\'t let your guard down.' },
            { speaker: 'Mother', color: '#88aacc', text: 'There\'s a good patch near the north clearing. You\'ll know them by the silver leaves.' },
            { speaker: 'Mother', color: '#88aacc', text: 'If you bring back some wolf pelts we can trade them in town. Stay safe.' },
            { speaker: 'Reno',   color: '#4488ff', text: '...' },
            { speaker: 'Reno',   color: '#4488ff', text: 'I\'ll be back before sundown.' },
          ],
          backdrop: BACKDROPS.village,
          nextScene: 'WorldMapScene', nextSceneData: {},
        });
        return;
      }

      if (state.completedMissions.includes('M1') && !state.m1TurnedIn) {
        state.m1TurnedIn = true;
        const herb = getItem('heal_herb');
        for (let i = 0; i < 10; i++) if (herb) state.inventory.push({ ...herb });
        state.tytrate += 200;
        this.scene.launch('RewardPopupScene', {
          title: 'Mission Complete',
          lines: [
            { label: 'Heal Herb', amount: 10, rarity: 'common' },
            { label: 'Tytrate', amount: 200, currency: true },
          ],
          onClose: () => {
            state.unlockedMissions.push('M2');
            this.scene.start('StoryScene', {
              location: 'SIRBLANC  ·  Reno\'s Home',
              backdrop: BACKDROPS.village,
              lines: [
                { speaker: 'Father',   color: '#cc9955', text: 'Good work, Reno. This should keep the healer stocked for weeks.' },
                { speaker: 'Mother',   color: '#88aacc', text: 'There\'s news from the Capital — the King wants every talented youth in the region to sit the Academy selection exam.' },
                { speaker: 'Father',   color: '#cc9955', text: 'Thunder Plains lies between here and the Capital. Storms roll through — and worse things with them.' },
                { speaker: 'Reno',     color: '#4488ff', text: '...The Academy. Guess it\'s time.' },
              ],
              nextScene: 'WorldMapScene', nextSceneData: {},
            });
          },
        });
        return;
      }

      // M0a (Hidden Cave) first-clear reward — same turn-in-at-M0 pattern
      // as M1, since the spec calls for "return to Hidden Village" before
      // the 500T is actually granted (M0-M4 redesign, Phase 5).
      if (state.completedMissions.includes('M0a') && !state.m0aTurnedIn) {
        state.m0aTurnedIn = true;
        state.tytrate += 500;
        this.scene.launch('RewardPopupScene', {
          title: 'Mission Complete',
          lines: [
            { label: 'Tytrate', amount: 500, currency: true },
          ],
        });
        return;
      }

      this.scene.start('HubScene', { nodeId: 'M0' });
      return;
    }

    // M0a: Hidden Cave (ore mission, M0-M4 redesign Phase 5) — repeatable,
    // each replay escalating (see BattleScene's repeatCount handling), until
    // the protagonist (state.party[0]) hits level 30, after which it's
    // retired rather than kept scaling forever ("repeatable UNTIL level 30"
    // read literally). The first-clear 500T reward is collected back at M0,
    // same turn-in pattern as M1 — see the M0 handler above.
    // Both M0a and M0b now require accepting the quest at the Hidden
    // Village's Quest Menu before the node will actually start a battle
    // (2026-07-07 feedback) — VictoryScene resets questAccepted back to
    // false after every completion, so replays need re-accepting too.
    if (node.id === 'M0a') {
      if (!state.questAccepted.M0a) {
        this.showToast(`${node.id} — ${node.name}\nAccept this quest at the Hidden Village first.`);
        return;
      }
      if (isCompleted) {
        if ((state.party[0]?.level ?? 1) >= 30) {
          this.showToast(`${node.id} — ${node.name}\nYou've mastered this trial.`);
        } else {
          state.repeatCounts.M0a = (state.repeatCounts.M0a ?? 0) + 1;
          state.currentMission = 'M0a';
          this.scene.start('BattleScene');
        }
      } else {
        state.currentMission = 'M0a';
        this.scene.start('BattleScene');
      }
      return;
    }

    if (node.id === 'M0b') {
      if (!state.questAccepted.M0b) {
        this.showToast(`${node.id} — ${node.name}\nAccept this quest at the Hidden Village first.`);
        return;
      }
      if (isCompleted) {
        // Same repeat-scaling as M0a (level +2, HP +25%, attack +10% per
        // repeat — see BattleScene's repeatCount handling), incremented at
        // the moment the replay is entered so the very next fight is
        // already escalated. Layered on top of (not instead of) the
        // existing Normal/Hard/Elite difficulty picker.
        state.repeatCounts.M0b = (state.repeatCounts.M0b ?? 0) + 1;
        this.showDifficultyPicker(node);
      } else {
        state.currentMission = 'M0b';
        this.scene.start('BattleScene');
      }
      return;
    }

    if (node.id === 'M1') {
      if (isCompleted) {
        this.showDifficultyPicker(node);
      } else {
        state.currentMission = 'M1';
        this.scene.start('BattleScene');
      }
      return;
    }

    if (node.id === 'M2') {
      if (isCompleted) {
        this.showDifficultyPicker(node);
      } else if (!state.wildsEntryShown) {
        state.wildsEntryShown = true;
        state.currentMission = 'M2';
        this.scene.start('StoryScene', {
          location: 'THUNDER PLAINS  ·  The Open Road',
          backdrop: BACKDROPS.wilds,
          lines: [
            { speaker: 'Narrator', color: '#888899', text: 'Storm clouds roll low over the plains — the road to the Capital cuts straight through open, exposed ground.' },
            { speaker: 'Reno',     color: '#4488ff', text: '...Something\'s stirred these boars up.' },
          ],
          nextScene: 'BattleScene', nextSceneData: {},
        });
      } else {
        state.currentMission = 'M2';
        this.scene.start('BattleScene');
      }
      return;
    }

    // ── M3: The Capital (hub) — quest-stage machine ───────────────────────
    // See state.capitalQuest in gameState.js for the stage list. Every
    // click on M3 checks the current stage and either advances it (turn-in
    // a completed test, confirm a completed craft/recruit step) or just
    // opens the hub if there's nothing to turn in yet.
    if (node.id === 'M3') {
      this.onCapitalClick();
      return;
    }

    if (node.id === 'M3a' || node.id === 'M3b') {
      if (isCompleted) {
        this.showDifficultyPicker(node);
      } else {
        state.currentMission = node.id;
        this.scene.start('BattleScene');
      }
      return;
    }

    // Hilbert Academy's 3 quests (2026-07-11) — same accept-gate pattern
    // as M0a/M0b, just accepted at AcademyQuestListScene instead of the
    // Hidden Village's Quest Menu. Unlike M0a/M0b, these don't reset their
    // acceptance flag on completion (see VictoryScene) — accept once, then
    // replay freely via the difficulty picker like any other mission.
    if (node.id === 'A1a' || node.id === 'A1b') {
      if (!state.questAccepted[node.id]) {
        this.showToast(`${node.id} — ${node.name}\nAccept this quest at Ester Academy first.`);
        return;
      }
      if (isCompleted) {
        this.showDifficultyPicker(node);
        return;
      }
      // A1a's Dragon's Roost intro (2026-07-18) — same first-visit-only
      // gate the generic NEW_AREA_INTRO branch further down uses. A1b has
      // no entry in that table, so it falls straight to the `else` below
      // unchanged, exactly as before this branch was touched.
      const intro = NEW_AREA_INTRO[node.id];
      if (intro && !state.missionIntroShown.includes(node.id)) {
        state.missionIntroShown.push(node.id);
        state.currentMission = node.id;
        this.scene.start('StoryScene', {
          location: intro.location, backdrop: intro.backdrop, lines: intro.lines,
          nextScene: 'BattleScene', nextSceneData: {},
        });
      } else {
        state.currentMission = node.id;
        this.scene.start('BattleScene');
      }
      return;
    }

    if (node.id === 'A2a' || node.id === 'A2b' || node.id === 'A2c') {
      if (!state.questAccepted[node.id]) {
        this.showToast(`${node.id} — ${node.name}\nAccept this quest at Hilbert Academy first.`);
        return;
      }
      if (isCompleted) {
        this.showDifficultyPicker(node);
      } else {
        state.currentMission = node.id;
        this.scene.start('BattleScene');
      }
      return;
    }

    // M4: Arena Atlros — the exam boss, non-repeatable (per spec), so no
    // showDifficultyPicker() replay once it's won.
    if (node.id === 'M4') {
      if (isCompleted) {
        this.showToast(`${node.id} — ${node.name}\nYour exam is behind you now.`);
      } else if (!state.caveEntryShown) {
        state.caveEntryShown = true;
        state.currentMission = 'M4';
        this.scene.start('StoryScene', {
          location: 'ARENA ATLROS',
          // Swapped 2026-07-18 from BACKDROPS.school (Ester's shared castle
          // shot) to altroesArena (grandarena.png) — a real arena backdrop
          // for a mission literally named "Arena Atlros."
          backdrop: BACKDROPS.altroesArena,
          lines: [
            { speaker: 'Reno', color: '#4488ff', text: '...Never thought I\'d have to fight our own instructor.' },
          ],
          nextScene: 'BattleScene', nextSceneData: {},
        });
      } else {
        state.currentMission = 'M4';
        this.scene.start('BattleScene');
      }
      return;
    }

    if (node.id === 'A1' || node.id === 'A2') {
      // A single recruit (Drace) is available during 'recruit_pending' —
      // the fuller "pick who to recruit" academy roster is Phase 7 work.
      // sportClass narrows RecruitClassScene's sport picker per HUB_CONFIGS.
      if (state.capitalQuest === 'recruit_pending' && state.party.length < 2) {
        this.scene.start('RecruitClassScene', {
          recruitIds: ['drace'],
          sportClass: HUB_CONFIGS[node.id]?.recruitPool,
          nextScene: 'WorldMapScene', nextSceneData: {},
        });
      } else {
        this.scene.start('HubScene', { nodeId: node.id });
      }
      return;
    }

    // Gale + Artfall Academy + Zester (2026-07-11 follow-ups), plus
    // Lametus's 2 academies (2026-07-17) — all plain hub entries, same
    // treatment as A1/A2 above minus the one-time story recruit
    // special-case (none of these have one). No battle attached to any
    // of them — all pure city/recruit stops. M8 (Lametus Capital) gets
    // its OWN branch below since it has a one-time story beat first.
    if (['M5', 'AF', 'ZE', 'A3', 'A4'].includes(node.id)) {
      this.scene.start('HubScene', { nodeId: node.id });
      return;
    }

    // Lametus Capital's first-visit story (2026-07-18, "after entering
    // the Lametus city our heroes realized that they have missing for a
    // few weeks and it['s] the day of the Final tournament... they juse
    // need proof of finishing One trail... quickly go and do the
    // trial"). Plays once (reuses missionIntroShown as the guard even
    // though M8 isn't a battle/NEW_AREA_INTRO entry — same "shown once"
    // array, different kind of content), unlocks TG (Stonewake Pass, the
    // tournament's entry-requirement Golem fight) at the end, then always
    // opens the hub normally on every later visit.
    if (node.id === 'M8') {
      if (!state.missionIntroShown.includes('M8')) {
        state.missionIntroShown.push('M8');
        if (!state.unlockedMissions.includes('TG')) state.unlockedMissions.push('TG');
        this.scene.start('StoryScene', {
          location: 'LAMETUS CAPITAL',
          backdrop: BACKDROPS.lametusTown,
          lines: [
            { speaker: 'Narrator', color: '#888899', text: 'The capital gates open onto a city buzzing with banners and crowds — something big is happening today.' },
            { speaker: 'Drace',    color: '#88cc66', text: '...Reno, what\'s the date?' },
            { speaker: 'Reno',     color: '#4488ff', text: '...I don\'t— wait.' },
            { speaker: 'Narrator', color: '#888899', text: 'It\'s been almost three weeks since the arena. A passing official confirms it: today is the day of the Final Tournament — entry requires proof of clearing at least one trial.' },
            { speaker: 'Kael',     color: '#ffaa44', text: '...Then we don\'t have time to waste. There\'s one just north of here. Let\'s go.' },
          ],
          nextScene: 'WorldMapScene', nextSceneData: {},
        });
        return;
      }
      this.scene.start('HubScene', { nodeId: node.id });
      return;
    }

    // M7a (2026-07-17) — a landmark, not a battle or a real hub. By the
    // time this node is even clickable, the Noble Deity reveal already
    // played out as part of M7's scripted-defeat cutscene chain (see
    // BattleScene.js's checkEndConditions) — there's nothing left to
    // "enter" here, just a short idle line.
    if (node.id === 'M7a') {
      this.showToast(`${node.id} — ${node.name}\n"Seek out the seven trials when you're ready."`);
      return;
    }

    if (NEW_AREA_INTRO[node.id]) {
      if (isCompleted) {
        this.showDifficultyPicker(node);
        return;
      }
      const intro = NEW_AREA_INTRO[node.id];
      if (!state.missionIntroShown.includes(node.id)) {
        state.missionIntroShown.push(node.id);
        state.currentMission = node.id;
        this.scene.start('StoryScene', {
          location: intro.location,
          backdrop: intro.backdrop,
          lines: intro.lines,
          nextScene: 'BattleScene', nextSceneData: {},
        });
      } else {
        state.currentMission = node.id;
        this.scene.start('BattleScene');
      }
      return;
    }

    if (isCompleted) {
      this.showDifficultyPicker(node);
      return;
    }

    this.showToast(`${node.id} — ${node.name}\nComing soon`);
  }

  // ── Capital (M3) quest-stage machine (M0-M4 redesign, Phase 3) ──────────
  onCapitalClick() {
    const stage = state.capitalQuest;

    if (stage === 'not_started') state.capitalQuest = 'intro';

    if (state.capitalQuest === 'intro') {
      this.showChoicePrompt({
        title: 'THE CAPITAL',
        body: 'Two academies train here — Ester and Hilbert. Before either will see you, you must prove yourself.\n\nFirst trial: travel to the Northern Cave and bring back ore. Ready?',
        onYes: () => {
          state.unlockedMissions.push('M3a');
          state.capitalQuest = 'test1_active';
          this.scene.start('StoryScene', {
            location: 'THE CAPITAL  ·  Gates',
            lines: [
              { speaker: 'Narrator', color: '#888899', text: 'The Northern Cave sits a short march past the Capital gates — the wardens say goblins have been nesting there.' },
              { speaker: 'Reno',     color: '#4488ff', text: '...Ore run. Simple enough.' },
            ],
            nextScene: 'WorldMapScene', nextSceneData: {},
          });
        },
        onNo: () => this.scene.start('WorldMapScene'),
      });
      return;
    }

    if (state.capitalQuest === 'test1_active') {
      if (!state.completedMissions.includes('M3a')) { this.scene.start('HubScene', { nodeId: 'M3' }); return; }
      state.tytrate += 100;
      const iron = getItem('iron_ore'), silver = getItem('silver_ore');
      for (let i = 0; i < 10; i++) if (iron)   state.inventory.push({ ...iron });
      for (let i = 0; i < 5;  i++) if (silver) state.inventory.push({ ...silver });
      this.scene.launch('RewardPopupScene', {
        title: 'Trial Complete',
        lines: [
          { label: 'Tytrate', amount: 100, currency: true },
          { label: 'Iron Ore', amount: 10, rarity: 'uncommon' },
          { label: 'Silver Ore', amount: 5, rarity: 'rare' },
        ],
        onClose: () => {
          state.unlockedMissions.push('M3b');
          state.capitalQuest = 'test2_active';
          this.scene.start('StoryScene', {
            location: 'THE CAPITAL  ·  Gates',
            lines: [
              { speaker: 'Narrator', color: '#888899', text: 'Well done. One more trial — the Hilbert Low Lands to the south have lions prowling the tall grass.' },
              { speaker: 'Reno',     color: '#4488ff', text: '...Lions. Noted.' },
            ],
            nextScene: 'WorldMapScene', nextSceneData: {},
          });
        },
      });
      return;
    }

    if (state.capitalQuest === 'test2_active') {
      if (!state.completedMissions.includes('M3b')) { this.scene.start('HubScene', { nodeId: 'M3' }); return; }
      state.tytrate += 100;
      const skin = getItem('skin'), bone = getItem('bone');
      for (let i = 0; i < 10; i++) if (skin) state.inventory.push({ ...skin });
      for (let i = 0; i < 10; i++) if (bone) state.inventory.push({ ...bone });
      this.scene.launch('RewardPopupScene', {
        title: 'Trial Complete',
        lines: [
          { label: 'Tytrate', amount: 100, currency: true },
          { label: 'Skin', amount: 10, rarity: 'common' },
          { label: 'Bone', amount: 10, rarity: 'common' },
        ],
        onClose: () => {
          state.capitalQuest = 'craft_pending';
          this.scene.start('StoryScene', {
            location: 'THE CAPITAL  ·  Gates',
            lines: [
              { speaker: 'Narrator', color: '#888899', text: 'Both trials cleared. Now go craft some armor — see the forger here in the Capital.' },
              { speaker: 'Reno',     color: '#4488ff', text: '...The forge. Let\'s see what we can make.' },
            ],
            nextScene: 'WorldMapScene', nextSceneData: {},
          });
        },
      });
      return;
    }

    if (state.capitalQuest === 'craft_pending') {
      if (state.capitalCraftCount < 2) { this.scene.start('HubScene', { nodeId: 'M3' }); return; }
      state.capitalQuest = 'recruit_pending';
      // A1a/A1b and A2a/A2b/A2c (2026-07-11) become visible on the map the
      // same moment their Academy does — each still needs its own accept
      // step at the Academy's quest list before it'll actually start a
      // battle (see onMissionClick below, same gate M0a/M0b use).
      state.unlockedMissions.push('A1', 'A2', 'A1a', 'A1b', 'A2a', 'A2b', 'A2c');
      this.scene.start('StoryScene', {
        location: 'THE CAPITAL  ·  Gates',
        lines: [
          { speaker: 'Narrator', color: '#888899', text: 'The gear is solid work. You\'re almost ready for the exam.' },
          { speaker: 'Reno',     color: '#4488ff', text: '...One more thing, I take it.' },
          { speaker: 'Narrator', color: '#888899', text: 'Visit Ester or Hilbert Academy and make a team to accompany you for the trial.' },
        ],
        nextScene: 'WorldMapScene', nextSceneData: {},
      });
      return;
    }

    if (state.capitalQuest === 'recruit_pending') {
      if (state.party.length < 2) { this.scene.start('HubScene', { nodeId: 'M3' }); return; }
      state.tytrate += 300;
      state.capitalQuest = 'exam_ready';
      state.unlockedMissions.push('M4');
      this.scene.launch('RewardPopupScene', {
        title: 'Ready For The Exam',
        lines: [
          { label: 'Handbook Unlocked', amount: 1 },
          { label: 'Tytrate', amount: 300, currency: true },
        ],
        onClose: () => {
          this.scene.start('StoryScene', {
            location: 'THE CAPITAL  ·  Gates',
            lines: [
              { speaker: 'Narrator', color: '#888899', text: 'Your team is set. Now for your exam — meet the instructor at Arena Atlros, east of the Capital.' },
              { speaker: 'Reno',     color: '#4488ff', text: '...Let\'s go.' },
            ],
            nextScene: 'WorldMapScene', nextSceneData: {},
          });
        },
      });
      return;
    }

    // Tournament option (2026-07-11 follow-up, "after finishing the 6
    // quest play will need to go back to M3 and a tournament option will
    // appear... picking this will active at1 and at2") — offered once the
    // exam's done (capitalQuest reaches 'done' after M4 clear) AND all 6
    // academy quests are finished. Replaces the earlier version of this
    // feature, which unlocked AT1/AT2 automatically the moment the
    // condition became true — now it's a deliberate M3 visit + choice,
    // same "stage machine" pattern as every other capitalQuest step above.
    if (state.capitalQuest === 'done' && !state.unlockedMissions.includes('AT1') && allAcademyQuestsDone(state)) {
      this.showChoicePrompt({
        title: 'THE CAPITAL',
        body: 'A Tournament option has opened: Altroes itself wants to test what you\'ve learned, now that both academies have.\n\nBegin the Trials?',
        onYes: () => {
          state.unlockedMissions.push('AT1', 'AT2');
          this.scene.start('StoryScene', {
            location: 'THE CAPITAL  ·  Gates',
            lines: [
              { speaker: 'Narrator', color: '#888899', text: 'Word spreads fast. Two Trials await — Altroes doesn\'t care which you take first.' },
              { speaker: 'Reno',     color: '#4488ff', text: '...Let\'s find out what we\'re really made of.' },
            ],
            nextScene: 'WorldMapScene', nextSceneData: {},
          });
        },
        onNo: () => this.scene.start('WorldMapScene'),
      });
      return;
    }

    // 'exam_ready' / 'done' — nothing left to turn in, just open the hub.
    this.scene.start('HubScene', { nodeId: 'M3' });
  }

  // Generic yes/no modal — same visual language as showDifficultyPicker.
  showChoicePrompt({ title, body, onYes, onNo, yesLabel = 'YES', noLabel = 'NOT YET' }) {
    const { width, height } = this.scale;
    const PW = 380, PH = 260;
    const px = (width - PW) / 2, py = (height - PH) / 2;

    const con = this.add.container(0, 0).setDepth(300);

    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.55);
    bg.fillRect(0, 0, width, height);
    con.add(bg);

    const shadow = this.add.graphics();
    shadow.fillStyle(0x000000, 0.35);
    shadow.fillRoundedRect(px + 3, py + 5, PW, PH, 10);
    con.add(shadow);

    const panG = this.add.graphics();
    panG.fillStyle(0x0c0c1e, 1);
    panG.fillRoundedRect(px, py, PW, PH, 10);
    panG.lineStyle(1.5, 0x886644, 1);
    panG.strokeRoundedRect(px, py, PW, PH, 10);
    panG.fillStyle(0xffdd88, 0.5);
    panG.fillRoundedRect(px, py, PW, 3, { tl: 10, tr: 10, bl: 0, br: 0 });
    con.add(panG);

    con.add(this.add.text(px + PW / 2, py + 24, title.toUpperCase(), {
      fontSize: '15px', fontFamily: 'Georgia, serif', fontStyle: 'bold', color: '#ffdd88',
    }).setOrigin(0.5));
    con.add(this.add.text(px + PW / 2, py + 100, body, {
      fontSize: '11px', fontFamily: 'monospace', color: '#ccccdd', align: 'center',
      wordWrap: { width: PW - 40 },
    }).setOrigin(0.5, 0.5));

    const yesBtn = drawButton(this, {
      x: px + PW / 2 - 90, y: py + PH - 34, w: 140, h: 38, label: yesLabel,
      bg: 0x223344, bgHover: 0x2e4458, border: 0x4477aa, accent: 0xffff88,
      textColor: '#ffffff', textHoverColor: '#ffff88',
      onClick: () => { con.destroy(true); onYes?.(); },
    });
    con.add(yesBtn.container);

    const noBtn = drawButton(this, {
      x: px + PW / 2 + 90, y: py + PH - 34, w: 140, h: 38, label: noLabel,
      bg: 0x0c0c1a, bgHover: 0x161628, border: 0x334466, accent: 0x556688,
      textColor: '#556688',
      onClick: () => { con.destroy(true); onNo?.(); },
    });
    con.add(noBtn.container);
  }

  showDifficultyPicker(node) {
    if (this.diffPicker) { this.diffPicker.destroy(true); this.diffPicker = null; }
    const { width, height } = this.scale;
    const PW = 340, PH = 220;
    const px = (width - PW) / 2, py = (height - PH) / 2;

    const con = this.add.container(0, 0).setDepth(300);
    this.diffPicker = con;

    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.55);
    bg.fillRect(0, 0, width, height);
    con.add(bg);

    const shadow = this.add.graphics();
    shadow.fillStyle(0x000000, 0.35);
    shadow.fillRoundedRect(px + 3, py + 5, PW, PH, 10);
    con.add(shadow);

    const panG = this.add.graphics();
    panG.fillStyle(0x0c0c1e, 1);
    panG.fillRoundedRect(px, py, PW, PH, 10);
    panG.lineStyle(1.5, 0x334466, 1);
    panG.strokeRoundedRect(px, py, PW, PH, 10);
    panG.fillStyle(0x5577cc, 0.5);
    panG.fillRoundedRect(px, py, PW, 3, { tl: 10, tr: 10, bl: 0, br: 0 });
    con.add(panG);

    con.add(this.add.text(px + PW / 2, py + 16, `${node.name}  ·  REPLAY`, {
      fontSize: '13px', fontFamily: 'monospace', fontStyle: 'bold', color: '#aaaacc',
    }).setOrigin(0.5));
    con.add(this.add.text(px + PW / 2, py + 34, 'Choose difficulty', {
      fontSize: '10px', fontFamily: 'monospace', color: '#445566',
    }).setOrigin(0.5));

    // Own independent table (2026-08-03, "the replay difficulty is a
    // separate system compared to the one available in settings") — this
    // picker keeps the original flat raw-stat-mult behavior untouched;
    // src/data/difficulty.js's Newbie/Veteran/Perilous tiers are a
    // different mechanic entirely (level-floor toggle + damage%) and only
    // govern battles NOT started from this picker (see BattleScene.create()'s
    // data?.difficulty != null branch).
    const DIFFS = [
      { label: 'Normal',  mult: 1.0, color: '#44cc77', bdr: 0x1e6630, bg0: 0x090e0a },
      { label: 'Hard',    mult: 1.2, color: '#ffaa33', bdr: 0x7a4410, bg0: 0x110a04 },
      { label: 'Elite',   mult: 1.5, color: '#ff4444', bdr: 0x7a1a1a, bg0: 0x110404 },
    ];
    const bw = 88, bh = 70, gap = 10;
    let bx = px + (PW - DIFFS.length * (bw + gap) + gap) / 2;

    for (const d of DIFFS) {
      const myBx = bx; // capture this button's own x — `bx` mutates as the loop continues
      const by2 = py + 54;
      const g = this.add.graphics();
      const draw = (h) => {
        g.clear();
        g.fillStyle(h ? d.bg0 + 0x080808 : d.bg0, 1);
        g.fillRoundedRect(myBx, by2, bw, bh, 6);
        g.lineStyle(1.5, d.bdr, 1);
        g.strokeRoundedRect(myBx, by2, bw, bh, 6);
        if (h) { g.fillStyle(d.bdr, 0.9); g.fillRoundedRect(myBx, by2, bw, 3, { tl: 6, tr: 6, bl: 0, br: 0 }); }
      };
      draw(false);
      con.add(g);
      con.add(this.add.text(myBx + bw / 2, by2 + 16, d.label, {
        fontSize: '13px', fontFamily: 'monospace', fontStyle: 'bold', color: d.color,
      }).setOrigin(0.5));
      con.add(this.add.text(myBx + bw / 2, by2 + 34, `×${d.mult.toFixed(1)}`, {
        fontSize: '11px', fontFamily: 'monospace', color: '#445566',
      }).setOrigin(0.5));
      con.add(this.add.text(myBx + bw / 2, by2 + 50, 'enemy stats', {
        fontSize: '9px', fontFamily: 'monospace', color: '#333344',
      }).setOrigin(0.5));

      const z = this.add.zone(myBx + bw / 2, by2 + bh / 2, bw, bh).setInteractive({ useHandCursor: true });
      z.on('pointerover',  () => draw(true));
      z.on('pointerout',   () => draw(false));
      z.on('pointerdown',  () => {
        state.currentMission = node.id;
        this.diffPicker.destroy(true); this.diffPicker = null;
        this.scene.start('BattleScene', { difficulty: d.mult });
      });
      con.add(z);
      bx += bw + gap;
    }

    // Close
    const closeY = py + PH - 34;
    const cancelBtn = drawButton(this, {
      x: px + PW / 2, y: closeY + 13, w: 100, h: 26, label: 'CANCEL',
      fontSize: '11px', radius: 6,
      bg: 0x0c0c1a, bgHover: 0x161628, border: 0x334466, accent: 0x556688,
      textColor: '#556688',
      onClick: () => { this.diffPicker.destroy(true); this.diffPicker = null; },
    });
    con.add(cancelBtn.container);
  }

  showToast(msg) {
    const { width, height } = this.scale;
    const toast = this.add.text(width / 2, height / 2 - 40, msg, {
      fontSize: '14px', fontFamily: 'monospace', color: '#ffffff',
      backgroundColor: '#222233', padding: { x: 16, y: 10 },
      align: 'center',
    }).setOrigin(0.5).setDepth(200).setAlpha(0);

    this.tweens.add({ targets: toast, alpha: 1, duration: 200 });
    this.time.delayedCall(1800, () =>
      this.tweens.add({ targets: toast, alpha: 0, duration: 300,
        onComplete: () => toast.destroy() })
    );
  }
}
