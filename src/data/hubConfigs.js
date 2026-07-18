// Per-node hub configuration — replaces the old per-id/per-arc special
// casing in WorldMapScene.onMissionClick() for hub-type nodes (M0, M3, A1,
// A2). Each entry names which services HubScene should offer and which
// shop/recruit data those services should read from, so distinct hubs
// (e.g. the two academies) can diverge without new special-case branches.
//
// `services` lists are the *default* set for that hub; HubScene may still
// gate an individual service further (e.g. Forge only after M3 is reached,
// Handbook only once the Capital questline grants it) — this table just
// says what a hub is capable of showing, not always-on.
//
// `recruitPool` is a Sport `class` filter (see SPORTS in gameState.js) that
// narrows which starting sports RecruitClassScene offers when recruiting
// through that academy — it does not restrict which named character can be
// recruited there. Can be a single class string or an array of classes
// (Hilbert offers both Bat & Ball and Ball T1 sports, 2026-07-08 feedback).
// The one-time story recruit (Drace) during capitalQuest === 'recruit_pending'
// is still a special-case bypass in WorldMapScene's A1/A2 click handler (see
// Phase 3), not a HubScene button. 'recruit' below is the SEPARATE, repeatable
// recruit option added post-exam (2026-07-08 feedback) — gated in HubScene to
// only show once capitalQuest reaches 'done', same "always listed, gated at
// render time" pattern 'handbook' already uses for M3.
// 'handbook' is further gated at render time in HubScene (only shown once
// capitalQuest reaches 'exam_ready', see Phase 7) even though it's always
// listed here for M3.
// 'forge' (2026-07-11, "remember to have a forge at all the main
// cities") — added to every hub's services below, not just M3. It's a
// single GLOBAL gate in HubScene (`state.unlockedMissions.includes('M3')`,
// not per-hub), and ForgeScene itself only reads `hubData` to know which
// hub to return to on "back" — nothing hardcodes it to M3 specifically —
// so listing it everywhere is safe: it just stays locked ("Visit the
// Capital to unlock") at any hub reached before M3, and opens the exact
// same crafting screen everywhere once unlocked.
export const HUB_CONFIGS = {
  M0: {
    type: 'village', name: 'Hidden Village', shopId: 'town_sirblanc',
    services: ['shop', 'forge', 'villageQuests'],
  },
  M3: {
    type: 'capital', name: 'The Capital', shopId: 'generic',
    services: ['shop', 'forge', 'handbook'],
  },
  A1: {
    type: 'academy', name: 'Ester Academy', shopId: 'generic',
    recruitPool: 'Athletics',
    services: ['shop', 'forge', 'taskList', 'questList', 'recruit'],
  },
  A2: {
    type: 'academy', name: 'Hilbert Academy', shopId: 'academy_hilbert',
    recruitPool: ['Bat & Ball', 'Ball'],
    services: ['shop', 'forge', 'taskList', 'questList', 'recruit'],
  },
  // Gale (2026-07-11, "M5 will be redone as Gale, the next kingdom city,
  // not a battle scene") — first hub outside the Capital/academies. No
  // battle attached at all (M5a folded into AT1, M5b removed outright,
  // same day) — purely a city to pass through. 'questList' added later
  // the same day ("gale gives out 3 quest[s]") — the Alpha King Dragon
  // quest moved here from Artfall's list, plus a new Monster Hunt quest
  // (see state.academyQuests.M5 in gameState.js). Still no taskList — no
  // random task board was ever asked for here.
  M5: {
    type: 'kingdom', name: 'Gale', shopId: 'generic',
    services: ['shop', 'forge', 'questList'],
  },
  // Artfall Academy + Zester (2026-07-11 sixth follow-up, "north of m5...
  // Artfall academy... recruit martial arts units and zester to the
  // east... recruit performance class") — same minimum-viable treatment
  // (bare shop, generic item pool), plus 'recruit' since that's the whole
  // point of these two. No taskList — no random task board was asked for.
  // The 'recruit' service itself is fully generic (gated on
  // capitalQuest==='done'/roster cap in HubScene, reads recruitPool by
  // nodeId) — confirmed it needs no HubScene.js change to work for a
  // brand new node id, same as it already works for A1/A2.
  // Artfall briefly had 'questList' too (seventh follow-up, "add it to
  // Artfall's quest list") — removed again once the Alpha King Dragon
  // quest moved to Gale's list instead (eighth follow-up); would have
  // rendered permanently empty otherwise.
  AF: {
    type: 'academy', name: 'Artfall Academy', shopId: 'generic',
    recruitPool: 'Martial Arts',
    services: ['shop', 'forge', 'recruit'],
  },
  ZE: {
    type: 'city', name: 'Zester', shopId: 'generic',
    recruitPool: 'Performance',
    services: ['shop', 'forge', 'recruit'],
  },
  // Lametus Capital (2026-07-17, "after m7a is completed the m8 apears
  // which becomes the lametus capital") — same minimum-viable "kingdom
  // city" treatment M5 (Gale) got: bare shop+forge, no quest board (none
  // asked for here), unlocked alongside M7a/A3/A4/T1-T7 as part of M7's
  // scriptedDefeat chain (see BattleScene.js's triggerScriptedDefeat).
  M8: {
    type: 'kingdom', name: 'Lametus Capital', shopId: 'generic',
    services: ['shop', 'forge'],
  },
  // The two schools flanking the Capital (2026-07-17, "one school in the
  // east of M8 and the other west") — recruitPool picks up the only 2
  // classGroupings none of the other 4 academies/cities cover yet
  // (Athletics: A1, Bat & Ball/Ball: A2, Martial Arts: AF, Performance: ZE
  // — see the rest of this table), so every classGrouping now has exactly
  // one recruit source. Same minimal academy treatment as AF/ZE (no
  // taskList/questList — none asked for here either). Names invented
  // (not specified) — same "pick something, document it" call as M6's
  // Blightreach/M7's Grand Arena naming.
  A3: {
    type: 'academy', name: 'Wrenfield Academy', shopId: 'generic',
    recruitPool: 'Target',
    services: ['shop', 'forge', 'recruit'],
  },
  A4: {
    type: 'academy', name: 'Calder Academy', shopId: 'generic',
    recruitPool: 'Racquet',
    services: ['shop', 'forge', 'recruit'],
  },
};
