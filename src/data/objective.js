import { state, allAcademyQuestsDone, allGaleQuestsDone, QUEST_DEFS } from './gameState.js';

// The next required story step, for the world map's Main Mission line.
// Follows the unlock rules in WorldMapScene (capitalQuest stages, the live
// checks in create()) and VictoryScene's MISSION_NEXT; update it alongside
// them when a story beat moves.
export function currentObjective() {
  const done = (id) => state.completedMissions.includes(id);
  const unlocked = (id) => state.unlockedMissions.includes(id);

  if (!unlocked('M1')) return 'Visit the Hidden Village';
  if (!done('M1')) return 'Clear Sirblanc Outskirts';
  if (!state.m1TurnedIn) return 'Return to the Hidden Village';
  if (!done('M2')) return 'Clear Thunder Plains';

  switch (state.capitalQuest) {
    case 'not_started':
    case 'intro':
      return 'Travel to The Capital';
    case 'test1_active':
      return done('M3a') ? 'Report back to The Capital' : 'Clear Northern Cave from The Capital';
    case 'test2_active':
      return done('M3b') ? 'Report back to The Capital' : 'Clear Hilbert Low Lands from The Capital';
    case 'craft_pending':
      return state.capitalCraftCount < 2
        ? `Craft 2 items at the Forge (${state.capitalCraftCount}/2)`
        : 'Report back to The Capital';
    case 'recruit_pending':
      return state.party.length < 2 ? 'Recruit a teammate at an Academy' : 'Report back to The Capital';
    case 'exam_ready':
      return 'Win your exam at Arena Atlros';
  }

  if (!unlocked('AT1')) {
    return allAcademyQuestsDone(state)
      ? 'Return to The Capital for the Tournament'
      : 'Finish the Ester and Hilbert Academy quests';
  }
  if (!done('AT1') || !done('AT2')) return 'Win both Trials at Arena Atlros';
  if (!done('FP') && !unlocked('M5')) return 'Cross Frostbite Pass to Gale';
  if (!done('GT')) return allGaleQuestsDone(state) ? 'Win the Gale Tournament at Artfall' : "Finish Gale's quests";
  if (!done('M6')) return 'Clear Blightreach';
  if (!done('M7')) return 'Head to The Grand Arena';
  if (!state.missionIntroShown.includes('M8')) return 'Travel to Lametus Capital';
  if (!done('TG')) return 'Clear Stonewake Pass';
  if (!done('FT')) return 'Win The Final Tournament at The Grand Arena';
  return 'Story complete! Keep exploring';
}

// Step-by-step directions for the current objective, shown when the world
// map's Main Mission button is tapped (2026-11-09). Same branches as
// currentObjective(); keep the two in step.
export function objectiveHint() {
  const done = (id) => state.completedMissions.includes(id);
  const unlocked = (id) => state.unlockedMissions.includes(id);
  const quest = (id, where) => ({ text: `${QUEST_DEFS[id].text} (${where})`, done: QUEST_DEFS[id].check(state) });
  const mission = (id, text) => ({ text, done: done(id) });
  const goal = currentObjective();
  const hint = (steps, checklist = []) => ({ goal, steps, checklist });

  if (!unlocked('M1')) return hint(['Tap the Hidden Village on the left of the map to begin.']);
  if (!done('M1')) return hint(['Sirblanc Outskirts is just east of the Hidden Village. Tap it to fight.']);
  if (!state.m1TurnedIn) return hint(['Go back to the Hidden Village and report what you found.']);
  if (!done('M2')) return hint(['Thunder Plains is east of Sirblanc Outskirts, on the road to The Capital. Tap it to fight.']);

  const report = 'When it\'s done, tap The Capital again to report back.';
  switch (state.capitalQuest) {
    case 'not_started':
    case 'intro':
      return hint(['The Capital is east of Thunder Plains. Tap it to enter.']);
    case 'test1_active':
      return hint(done('M3a') ? ['Tap The Capital to report back.']
        : ['Go into The Capital, open Battles and clear the Northern Cave.', report]);
    case 'test2_active':
      return hint(done('M3b') ? ['Tap The Capital to report back.']
        : ['Go into The Capital, open Battles and clear Hilbert Low Lands.', report]);
    case 'craft_pending':
      return hint(state.capitalCraftCount < 2
        ? ['Open the Forge in any town (The Capital has one) and craft 2 items. Materials drop from battles and sell in shops.', report]
        : ['Tap The Capital to report back.']);
    case 'recruit_pending':
      return hint(state.party.length < 2
        ? ['Go to Ester Academy (north-east of The Capital) or Hilbert Academy (south-east) and use Recruit to add a teammate.', report]
        : ['Tap The Capital to report back.']);
    case 'exam_ready':
      return hint(['Arena Atlros is east of The Capital. Tap it to take your exam.']);
  }

  if (!unlocked('AT1')) {
    return allAcademyQuestsDone(state)
      ? hint(['All six academy quests are done. Tap The Capital to start the Altroes Trials.'])
      : hint(['Each academy has its own quests. Go in and open Quests to accept them, then fight them from Battles.',
          'When all six are done, tap The Capital to start the Altroes Trials.'], [
          quest('defeat_dragon_wyverns', 'Ester Academy'),
          quest('rock_damage_race', 'Ester Academy'),
          quest('grow_the_party', 'recruit at any academy'),
          quest('defeat_king_lion', 'Hilbert Academy'),
          quest('goblin_king', 'Hilbert Academy'),
          quest('clear_northern_cave', 'Hilbert Academy'),
        ]);
  }
  if (!done('AT1') || !done('AT2')) {
    return hint(['Tap Arena Atlros, east of The Capital, and pick a Trial. Win both, in any order.'], [
      mission('AT1', 'Altroes Trials I'), mission('AT2', 'Altroes Trials II'),
    ]);
  }
  if (!done('FP') && !unlocked('M5')) return hint(['Frostbite Pass is south-east of Arena Atlros. Clear it to reach Gale.']);
  if (!done('GT')) {
    return allGaleQuestsDone(state)
      ? hint(['Go into Artfall Academy, north of Gale, open Battles and take on the Gale Tournament.'])
      : hint(['Finish Gale\'s three quests. Then go to Artfall Academy, north of Gale, for the Gale Tournament.'], [
          quest('kill_alpha_king_dragon', 'Battles at Artfall Academy, north of Gale'),
          quest('gale_monster_hunt', 'Battles at Zester, east of Gale'),
          quest('gale_legendary_gear', 'buy Epic gear at Gale\'s shop, equip it in Party'),
        ]);
  }
  if (!done('M6')) return hint(['Blightreach is south-east of Gale. Tap it to fight.']);
  if (!done('M7')) return hint(['The Grand Arena is south of Blightreach. Tap it to go in.']);
  const godTrials = 'Side goal: the Noble Deity\'s God Trials (bottom middle of the map) give God Tier weapons. Only those can hurt The Corrupted One.';
  if (!state.missionIntroShown.includes('M8')) return hint(['Lametus Capital is south of The Grand Arena. Tap it to enter.', godTrials]);
  if (!done('TG')) return hint(['Stonewake Pass is north of Wrenfield Academy, west of Lametus Capital. Clear it to enter the Final Tournament.', godTrials]);
  if (!done('FT')) {
    return hint(['Tap The Grand Arena (or The Final Tournament north of Stonewake Pass) to fight.',
      'Only heroes holding a God Tier weapon can damage The Corrupted One. Win the God Trials (bottom middle of the map) to earn them.']);
  }
  return hint(['The main story is done. The Tower of Trials and the God Trials are still open.']);
}
