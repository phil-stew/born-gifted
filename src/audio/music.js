// Looping background music. Tracks are CC0 (Juhani Junkala's JRPG Music
// Packs #1/#2/#4/#5 on OpenGameArt.org, verified CC0 per-submission — not
// the site's "CC0 Fantasy Music & Sounds" collection page, which turned out
// to bundle other artists' CC-BY tracks under a misleading title), sourced
// 2026-08-01 — no attribution required.
//
// Playback is deliberately NOT scene-owned: Phaser's SoundManager/CacheManager
// live on the Game instance and outlive any one scene, so a track started in
// WorldMapScene keeps playing straight through a `scene.start()` into
// HubScene. Fades run on requestAnimationFrame rather than a Scene's
// TweenManager for the same reason — a fade tied to the outgoing scene's
// tweens would get killed by that scene's own shutdown mid-fade.

import { getMusicVolume, setMusicVolume as persistMusicVolume } from './settings.js';

const BASE = 'audio/music/';

const TRACKS = {
  title:  'title.ogg',
  hub:    'hub.ogg',
  world:  'world.ogg',
  battle: 'battle.ogg',
};

const VOLUME = 0.35;

export function preloadMusic(scene) {
  for (const [key, file] of Object.entries(TRACKS)) {
    const soundKey = 'music-' + key;
    if (!scene.cache.audio.exists(soundKey)) scene.load.audio(soundKey, BASE + file);
  }
}

function fade(sound, from, to, ms, onDone) {
  if (!sound) return;
  const start = performance.now();
  sound.setVolume(from);
  const step = (now) => {
    if (!sound.manager) return; // sound was destroyed mid-fade
    const t = Math.min(1, (now - start) / ms);
    sound.setVolume(from + (to - from) * t);
    if (t < 1) requestAnimationFrame(step);
    else onDone?.();
  };
  requestAnimationFrame(step);
}

let current = null; // { key, sound }

// `gameOrScene` accepts either a Scene (uses .sys.game) or the Game
// instance directly, matching playSfx's convention in sound.js.
export function playMusic(gameOrScene, key, { fadeMs = 900, volume = VOLUME } = {}) {
  const game = gameOrScene?.sys?.game ?? gameOrScene;
  if (!game?.sound || !game?.cache) return;
  if (current?.key === key) return; // already playing (or fading into) this track

  const soundKey = 'music-' + key;
  if (!game.cache.audio.exists(soundKey)) return;

  const prev = current;
  const next = game.sound.add(soundKey, { loop: true, volume: 0 });
  next.play();
  current = { key, sound: next, baseVolume: volume };

  fade(next, 0, volume * getMusicVolume(), fadeMs);
  if (prev?.sound) fade(prev.sound, prev.sound.volume ?? volume, 0, fadeMs, () => prev.sound.stop());
}

export function stopMusic(gameOrScene, { fadeMs = 900 } = {}) {
  if (!current) return;
  const entry = current;
  current = null;
  fade(entry.sound, entry.sound.volume ?? VOLUME, 0, fadeMs, () => entry.sound.stop());
}

// Persists the player's music volume preference and, if a track is
// currently playing (or mid-fade), applies it immediately — otherwise
// turning the slider in SettingsScene wouldn't be heard until the next
// scene.start() picks a new track.
export function setMusicVolume(v) {
  persistMusicVolume(v);
  if (current?.sound) current.sound.setVolume((current.baseVolume ?? VOLUME) * getMusicVolume());
}
