import { state, allAcademyQuestsDone, allGaleQuestsDone } from './gameState.js';

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
  if (!done('GT')) return allGaleQuestsDone(state) ? 'Win the Gale Tournament at Artfall' : "Finish Gale's quests";
  if (!done('M6')) return 'Clear Blightreach';
  if (!done('M7')) return 'Head to The Grand Arena';
  if (!state.missionIntroShown.includes('M8')) return 'Travel to Lametus Capital';
  if (!done('TG')) return 'Clear Stonewake Pass';
  if (!done('FT')) return 'Win The Final Tournament at The Grand Arena';
  return 'Story complete! Keep exploring';
}
