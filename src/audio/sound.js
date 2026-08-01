// Shared SFX system. All clips are CC0 (Kenney UI Audio / RPG Audio / Impact
// Sounds packs), sourced 2026-08-01 — no attribution required.
//
// Loaded once via preloadSfx() in GameScene (the game's always-first scene),
// since Phaser's audio cache persists for the life of the Game instance —
// same reasoning as the `if (!this.textures.exists(...))` guards already
// used for images elsewhere in this codebase. playSfx() no-ops quietly if a
// scene calls it before that load has happened.

import { getSfxVolume } from './settings.js';

const BASE = 'audio/sfx/';

const FILES = {
  'ui-click':   'ui-click.ogg',
  'battle-click': 'battle-click.ogg',
  'attack-swing': 'attack-swing.ogg',
  'hit-1': 'hit-1.ogg', 'hit-2': 'hit-2.ogg', 'hit-3': 'hit-3.ogg',
  'death': 'death.ogg',
  'coin': 'coin.ogg',
  'craft': 'craft.ogg',
  'victory-1': 'victory-1.ogg', 'victory-2': 'victory-2.ogg', 'victory-3': 'victory-3.ogg',
  'levelup-1': 'levelup-1.ogg', 'levelup-2': 'levelup-2.ogg',
  'defeat': 'defeat.ogg',
};

export const SFX = {
  click: 'ui-click',
  battleClick: 'battle-click',
  attackSwing: 'attack-swing',
  hit: ['hit-1', 'hit-2', 'hit-3'],
  death: 'death',
  coin: 'coin',
  craft: 'craft',
  victory: ['victory-1', 'victory-2', 'victory-3'],
  levelup: ['levelup-1', 'levelup-2'],
  defeat: 'defeat',
};

export function preloadSfx(scene) {
  for (const [key, file] of Object.entries(FILES)) {
    if (!scene.cache.audio.exists(key)) scene.load.audio(key, BASE + file);
  }
}

// Plays a single clip (or, given an array, a random one from it — used for
// hit variety so repeated attacks don't sound identical).
export function playSfx(scene, keyOrList, opts = {}) {
  if (!scene?.sound) return;
  const key = Array.isArray(keyOrList) ? keyOrList[Math.floor(Math.random() * keyOrList.length)] : keyOrList;
  if (!scene.cache.audio.exists(key)) return;
  const baseVolume = opts.volume ?? 0.5;
  scene.sound.play(key, { ...opts, volume: baseVolume * getSfxVolume() });
}

// Plays a short ascending run of clips back to back — used for victory /
// level-up stingers, built from plain UI tones since neither source pack
// includes a musical fanfare.
export function playStinger(scene, keys, { gap = 130, rateStep = 0.08, volume = 0.55 } = {}) {
  if (!scene?.sound) return;
  keys.forEach((key, i) => {
    scene.time.delayedCall(i * gap, () => {
      if (scene.cache.audio.exists(key)) scene.sound.play(key, { volume: volume * getSfxVolume(), rate: 1 + i * rateStep });
    });
  });
}
