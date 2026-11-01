import { BACKDROPS } from './storyBackdrops.js';
import { buildMonster } from './monsters.js';

// Tower of Trials: endgame floors climbed in order. Each floor is an ordinary
// mission (TT1, TT2...) with its own map, so battles, rewards and saving all
// work as usual; floors cleared are read from completedMissions.
export const TOWER_FLOORS = 30;

// Opens the Tower before the Final Tournament is beaten, for testing.
// Set to false for release.
export const TOWER_OPEN_FOR_TESTING = true;

const FIRST_FLOOR_LEVEL = 30;
const BOSS_EVERY = 5;
const BASE_REWARD = 300, REWARD_PER_FLOOR = 100, BOSS_REWARD_MULT = 3;

export const towerFloorId = (floor) => `TT${floor}`;
export const isTowerFloor = (id) => /^TT\d+$/.test(id ?? '');
export const towerFloorOf = (id) => Number(id.slice(2));
export const isTowerBossFloor = (floor) => floor % BOSS_EVERY === 0;
export const towerFloorLevel = (floor) => FIRST_FLOOR_LEVEL + floor - 1;

export function towerUnlocked(state) {
  return TOWER_OPEN_FOR_TESTING || state.completedMissions.includes('FT');
}
export function towerFloorsCleared(state) {
  return state.completedMissions.filter(isTowerFloor).length;
}
export function towerReward(floor) {
  const base = BASE_REWARD + floor * REWARD_PER_FLOOR;
  return isTowerBossFloor(floor) ? base * BOSS_REWARD_MULT : base;
}

// The floors repeat this cycle of places. Every place has weather: either a
// falling hazard (`hazard`) or a standing weather from Weather Dance (`weather`).
const CYCLE = [
  { name: 'Open Plains',   theme: 'plains',   backdrop: 'wilds',          bgColor: 0x10100a, region: 'Altroes', hazard: 'thunderStorm', weatherName: 'Lightning storm' },
  { name: 'Deep Caves',    theme: 'deepCave', backdrop: 'cave',           bgColor: 0x100a04, region: 'Altroes', weather: 'wind', weatherName: 'Wind: Fire +50%' },
  { name: 'Frozen Wastes', theme: 'snow',     backdrop: 'galeWilds',      bgColor: 0x0a1018, region: 'Gale',    hazard: 'blizzard', weatherName: 'Blizzard' },
  { name: 'Burning Peak',  theme: 'volcanic', backdrop: 'altroesVolcano', bgColor: 0x180a04, region: 'Altroes', hazard: 'eruption', weatherName: 'Eruption' },
  { name: 'Wild Forest',   theme: 'forest',   backdrop: 'wilds',          bgColor: 0x081208, region: 'Lametus', weather: 'rain', weatherName: 'Rain: soaks everyone' },
  { name: 'The Blight',    theme: 'blight',   backdrop: 'galeWilds',      bgColor: 0x140a14, region: 'Gale',    weather: 'snow', weatherName: 'Snow: ranged attacks miss 20%' },
];
export const towerFloorPlace = (floor) => CYCLE[(floor - 1) % CYCLE.length];

export function towerStage(floor) {
  const place = towerFloorPlace(floor);
  return { label: `TOWER OF TRIALS  ${floor}F`, bgColor: place.bgColor, backdrop: BACKDROPS[place.backdrop] };
}

const POOL = ['Wolf', 'Boar', 'Deer', 'Goblin', 'Lion', 'Bear', 'Hawk', 'Golem', 'Wyvern', 'Dragon'];
const SPOTS = [[6, 4], [7, 2], [7, 7], [8, 4], [8, 6], [6, 7]];

// Fixed for each floor: BattleScene reads a roster once to load its art and
// again to spawn it, and both must match. More monsters as the climb goes on,
// and a boss leading every fifth floor.
export function towerEnemies(floor) {
  const count = Math.min(SPOTS.length, 3 + Math.floor(floor / 10));
  const boss = isTowerBossFloor(floor);
  return SPOTS.slice(0, count).map(([col, row], i) => {
    const base = POOL[(floor * 7 + i * 3) % POOL.length];
    const leader = boss && i === 0;
    return { col, row, ...buildMonster(leader ? { base, kind: 'boss' } : { base, tier: Math.min(3, 1 + Math.floor(floor / 10)) }) };
  });
}
