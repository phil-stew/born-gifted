import { stripBackgroundByKey } from './heroSprites.js';

// tiles/mapasset/projecttiles.png: an irregular icon sheet on solid black, so
// each frame is an [x, y, w, h] crop measured off the art.
export const PROJECTILE_SHEET = { key: 'projectiles', path: 'tiles/mapasset/projecttiles.png' };

const FRAMES = {
  arrow: [52, 49, 116, 117],     dart: [1139, 49, 104, 108],
  rock: [159, 234, 68, 71],      boulder: [278, 221, 79, 89],  shuriken: [50, 929, 72, 69],
  soccer: [69, 801, 84, 81],     basketball: [232, 801, 85, 80], baseball: [396, 803, 80, 77],
  football: [553, 803, 79, 76],  volleyball: [709, 803, 80, 77], tennis: [867, 805, 76, 73],
  golf: [1021, 803, 79, 77],     puck: [1178, 809, 85, 67],    softball: [1336, 806, 75, 73],
  orbFire: [719, 522, 91, 92],   orbWater: [890, 530, 79, 81], orbWind: [1048, 532, 82, 90],
  orbEarth: [566, 536, 72, 74],  orbLightning: [1204, 532, 83, 84],
  cometFire: [332, 666, 151, 112],  cometWater: [518, 675, 131, 100], cometWind: [1018, 682, 135, 92],
  cometEarth: [687, 204, 113, 111], cometLightning: [1185, 671, 138, 111],
};

// Which way the art points, in degrees. Anything not listed spins in flight.
const HEADING = {
  arrow: -45, dart: -45, cometWater: -45,
  cometFire: 135, cometWind: 135, cometEarth: 135, cometLightning: 135,
};

const DISPLAY_SIZE = { arrow: 38, dart: 30, comet: 48 };
const displaySize = (name) => DISPLAY_SIZE[name] ?? (name.startsWith('comet') ? DISPLAY_SIZE.comet : 22);

const SPORT_PROJECTILE = {
  running: 'rock', sprinting: 'rock', jumping: 'rock', ice_skating: 'rock', speed_skating: 'rock',
  boxing: 'shuriken', karate: 'shuriken', mma: 'shuriken', kendo: 'shuriken',
  football_soccer: 'soccer', basketball: 'basketball', baseball: 'baseball', cricket: 'baseball',
  softball: 'softball', am_football: 'football', rugby: 'football', volleyball: 'volleyball',
  netball: 'volleyball', tennis: 'tennis', golf: 'golf', lacrosse: 'golf', hockey: 'puck',
  archery: 'arrow', darts: 'dart',
};

// Strips the sheet once and names its frames. The texture outlives the scene.
export function registerProjectileFrames(scene) {
  if (!scene.textures.exists(PROJECTILE_SHEET.key)) return;
  const tex = scene.textures.get(PROJECTILE_SHEET.key);
  if (tex.has('arrow')) return;
  stripBackgroundByKey(scene, PROJECTILE_SHEET.key, { tol: 14 });
  for (const [name, frame] of Object.entries(FRAMES)) tex.add(name, 0, ...frame);
}

// Fixed-element moves and monsters throw an elemental comet; otherwise a hero
// throws their sport's item, with an orb for classes that don't have one.
export function projectileFor(attacker, ability) {
  const element = ability.fixedElement ?? attacker.element ?? 'Fire';
  if (attacker.team === 'enemy') return ability.id === 'power_shot' ? 'boulder' : `comet${element}`;
  if (ability.fixedElement) return `comet${element}`;
  return SPORT_PROJECTILE[attacker.sportId] ?? `orb${element}`;
}

export const projectileDisplaySize = displaySize;
export const projectileHeading = (name) => HEADING[name];
