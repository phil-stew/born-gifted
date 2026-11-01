import { BACKDROPS } from './storyBackdrops.js';
import { buildMonster } from './monsters.js';
import { state, saveGame, sportById, SPORTS, ELEMENT_CYCLE } from './gameState.js';
import { spriteKeyForRole } from './heroSprites.js';

// Tower of Trials: three endgame challenges. Each floor is an ordinary mission
// (TB1, TH1, TT1...) with its own map, so battles, rewards and saving all work
// as usual. Beasts and Humans are climbed in order, with progress read from
// completedMissions. Random is a climb tracked in state.towerRun.
const BEASTS = ['Wolf', 'Boar', 'Deer', 'Goblin', 'Lion', 'Bear', 'Hawk', 'Golem', 'Wyvern', 'Dragon'];
const SPORT_IDS = Object.keys(SPORTS);
export const RANDOM_CLIMBS = [30, 60];
const RANDOM_SAVE_EVERY = 10;

export const TOWER_TRACKS = [
  { key: 'beast',  prefix: 'TB', label: 'Beasts', floors: BEASTS.length },
  { key: 'human',  prefix: 'TH', label: 'Humans', floors: SPORT_IDS.length },
  { key: 'random', prefix: 'TT', label: 'Random', floors: Math.max(...RANDOM_CLIMBS) },
];

// Opens the Tower before the Final Tournament is beaten, for testing.
// Set to false for release.
export const TOWER_OPEN_FOR_TESTING = true;

const FIRST_FLOOR_LEVEL = 30;
const BOSS_EVERY = 5;
const BASE_REWARD = 300, REWARD_PER_FLOOR = 100, BOSS_REWARD_MULT = 3;

const trackOf = (key) => TOWER_TRACKS.find(t => t.key === key);
export const towerFloorId = (track, floor) => `${trackOf(track).prefix}${floor}`;
export const isRandomTowerFloor = (id) => /^TT\d+$/.test(id ?? '');
export const isTowerFloor = (id) => /^T[BHT]\d+$/.test(id ?? '');
export const towerFloorOf = (id) => Number(id.slice(2));
export const isTowerBossFloor = (floor) => floor % BOSS_EVERY === 0;
export const towerFloorLevel = (floor) => FIRST_FLOOR_LEVEL + floor - 1;

export function towerUnlocked(state) {
  return TOWER_OPEN_FOR_TESTING || state.completedMissions.includes('FT');
}
export const towerFloorCount = (track) => trackOf(track).floors;
export function towerFloorsCleared(state, track) {
  const prefix = trackOf(track).prefix;
  return state.completedMissions.filter(id => isTowerFloor(id) && id.startsWith(prefix)).length;
}
export function towerReward(floor) {
  const base = BASE_REWARD + floor * REWARD_PER_FLOOR;
  return isTowerBossFloor(floor) ? base * BOSS_REWARD_MULT : base;
}

// Beast and Human floors repeat this cycle of places. Every place has weather:
// either a falling hazard (`hazard`) or a standing weather (`weather`).
const CYCLE = [
  { name: 'Open Plains',   theme: 'plains',   backdrop: 'wilds',          bgColor: 0x10100a, region: 'Altroes', hazard: 'thunderStorm', weatherName: 'Lightning storm' },
  { name: 'Deep Caves',    theme: 'deepCave', backdrop: 'cave',           bgColor: 0x100a04, region: 'Altroes', weather: 'wind', weatherName: 'Wind: Fire +50%' },
  { name: 'Frozen Wastes', theme: 'snow',     backdrop: 'galeWilds',      bgColor: 0x0a1018, region: 'Gale',    hazard: 'blizzard', weatherName: 'Blizzard' },
  { name: 'Burning Peak',  theme: 'volcanic', backdrop: 'altroesVolcano', bgColor: 0x180a04, region: 'Altroes', hazard: 'eruption', weatherName: 'Eruption' },
  { name: 'Wild Forest',   theme: 'forest',   backdrop: 'wilds',          bgColor: 0x081208, region: 'Lametus', weather: 'rain', weatherName: 'Rain: soaks everyone' },
  { name: 'The Blight',    theme: 'blight',   backdrop: 'galeWilds',      bgColor: 0x140a14, region: 'Gale',    weather: 'snow', weatherName: 'Snow: ranged attacks miss 20%' },
];
export const towerFloorPlace = (floor) => CYCLE[(floor - 1) % CYCLE.length];

export function towerStage(place, floor) {
  return { label: `TOWER OF TRIALS  ${floor}F`, bgColor: place.bgColor, backdrop: BACKDROPS[place.backdrop] };
}

const BEAST_PLURAL = { Wolf: 'Wolves', Deer: 'Deer' };
const SPOTS = [[6, 4], [7, 2], [7, 7], [8, 4], [8, 6], [6, 7]];
const PACK_SIZE = 5;

const floorElement = (floor) => ELEMENT_CYCLE[floor % ELEMENT_CYCLE.length];
const pickOne = (list) => list[Math.floor(Math.random() * list.length)];
const monster = (floor, base, leader) => buildMonster(leader
  ? { base, kind: 'boss' }
  : { base, tier: Math.min(3, 1 + Math.floor(floor / 10)) });

// Beasts: one animal per floor, a pack of five sharing one element, led by a
// boss on boss floors.
const beastOf = (floor) => BEASTS[floor - 1];
export function towerBeasts(floor) {
  return SPOTS.slice(0, PACK_SIZE).map(([col, row], i) => ({
    col, row, ...monster(floor, beastOf(floor), isTowerBossFloor(floor) && i === 0), element: floorElement(floor),
  }));
}

// Humans: one sport per floor, its positions split evenly across five, all one
// element. Returns the sprite class for each of the five.
const sportOf = (floor) => sportById(SPORT_IDS[floor - 1]);
export const towerHumanTeam = (floor) => {
  const roles = sportOf(floor).roles;
  return SPOTS.slice(0, PACK_SIZE).map((_, i) => spriteKeyForRole(roles[i % roles.length].id));
};
export const towerHumanElement = floorElement;
export const towerHumanSpots = () => SPOTS.slice(0, PACK_SIZE);
export const towerHumanGear = (floor) => (floor < 10 ? 'rare' : floor < 20 ? 'epic' : 'legendary');
export const towerHumanStats = (floor) => ({
  speed: 20 + floor, strength: 30 + floor * 2, stamina: 25 + floor, endurance: 25 + floor,
});

// Random: everything is rolled fresh each time a floor is entered. Returns
// { place, team }; team mixes monsters with humans (classes) of any element.
const RANDOM_WEATHER = [
  { hazard: 'thunderStorm', weatherName: 'Lightning storm' }, { hazard: 'blizzard', weatherName: 'Blizzard' },
  { hazard: 'eruption', weatherName: 'Eruption' }, { weather: 'rain', weatherName: 'Rain' }, { weather: 'wind', weatherName: 'Wind' },
  { weather: 'snow', weatherName: 'Snow' }, { weather: 'sun', weatherName: 'Sun' },
];
const RANDOM_HUMAN_CHANCE = 0.3;
export function rollRandomFloor(floor, heroClasses) {
  const { name, theme, backdrop, bgColor, region } = pickOne(CYCLE);
  const place = { name, theme, backdrop, bgColor, region, ...pickOne(RANDOM_WEATHER) };
  const count = Math.min(SPOTS.length, 3 + Math.floor(floor / 10));
  const team = SPOTS.slice(0, count).map(([col, row], i) => {
    const element = pickOne(ELEMENT_CYCLE);
    if (Math.random() < RANDOM_HUMAN_CHANCE) return { col, row, element, heroClass: pickOne(heroClasses) };
    return { col, row, ...monster(floor, pickOne(BEASTS), isTowerBossFloor(floor) && i === 0), element };
  });
  return { place, team };
}

// The Random climb. `fighting` stays set while a floor is under way, so a loss,
// a retreat or closing the game all send the player back to the last save.
export function startTowerClimb(target) {
  state.towerRun = { target, floor: 1, saved: 0, fighting: false };
  saveGame();
}
export function abandonTowerClimb() {
  state.towerRun = null;
  saveGame();
}
export function settleTowerClimb() {
  const run = state.towerRun;
  if (!run?.fighting) return false;
  run.fighting = false;
  run.floor = run.saved + 1;
  return true;
}
export function winTowerFloor() {
  const run = state.towerRun;
  if (!run) return;
  run.fighting = false;
  if (run.floor >= run.target) {
    state.towerRun = null;
    state.towerFinished = run.target;
  } else {
    if (run.floor % RANDOM_SAVE_EVERY === 0) run.saved = run.floor;
    run.floor++;
  }
  saveGame();
}

// What's waiting on a floor, for the Tower menu.
export function towerFloorSummary(track, floor) {
  if (track === 'beast') return `5 ${BEAST_PLURAL[beastOf(floor)] ?? `${beastOf(floor)}s`}, all ${floorElement(floor)}`;
  if (track === 'human') return `${sportOf(floor).name} team, all ${floorElement(floor)}`;
  return 'Unknown until you enter';
}
