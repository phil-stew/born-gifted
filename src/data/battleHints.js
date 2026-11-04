import { state } from './gameState.js';
import { getDifficultyKey } from './difficulty.js';

// Hints on the Pre-Battle screen. 'auto' shows them for a new player's first
// HINT_MISSIONS missions on Newbie, never on a harder difficulty or a Hard or
// Elite replay. Settings can force them on or off.
const KEY = 'born-gifted-battle-hints';
const HINT_MISSIONS = 5;

export const HINT_MODES = [
  { key: 'auto', label: 'First 5' },
  { key: 'on',   label: 'Always' },
  { key: 'off',  label: 'Off' },
];

export function getHintMode() {
  try {
    const saved = localStorage.getItem(KEY);
    return HINT_MODES.some(m => m.key === saved) ? saved : 'auto';
  } catch {
    return 'auto';
  }
}

export function setHintMode(key) {
  try { localStorage.setItem(KEY, key); } catch { /* setting just won't persist */ }
}

export function battleHintsOn(replayDifficulty = 1) {
  const mode = getHintMode();
  if (mode !== 'auto') return mode === 'on';
  if (getDifficultyKey() !== 'newbie' || replayDifficulty > 1) return false;
  // M0 is the home hub, which lands in this list without being a battle.
  return state.completedMissions.filter(id => id !== 'M0').length < HINT_MISSIONS;
}

// The battle log and info panels. On unless turned off in Settings.
const INFO_KEY = 'born-gifted-battle-info';

export function battleInfoOn() {
  try { return localStorage.getItem(INFO_KEY) !== 'off'; } catch { return true; }
}

export function setBattleInfoOn(on) {
  try { localStorage.setItem(INFO_KEY, on ? 'on' : 'off'); } catch { /* setting just won't persist */ }
}

// Battle speed: ×1, ×2 or ×3, picked from the button in battle.
const SPEED_KEY = 'born-gifted-battle-speed';
export const BATTLE_SPEEDS = [1, 2, 3];

export function getBattleSpeed() {
  try { const s = Number(localStorage.getItem(SPEED_KEY)); return BATTLE_SPEEDS.includes(s) ? s : 1; } catch { return 1; }
}

export function setBattleSpeed(speed) {
  try { localStorage.setItem(SPEED_KEY, String(speed)); } catch { /* setting just won't persist */ }
}

// Battle zoom, kept between battles.
const ZOOM_KEY = 'born-gifted-battle-zoom';
export const BATTLE_ZOOMS = [0.8, 1, 1.25, 1.5, 1.75, 2];

export function getBattleZoom() {
  try { const z = Number(localStorage.getItem(ZOOM_KEY)); return BATTLE_ZOOMS.includes(z) ? z : 1; } catch { return 1; }
}

export function setBattleZoom(zoom) {
  try { localStorage.setItem(ZOOM_KEY, String(zoom)); } catch { /* setting just won't persist */ }
}

// Fast Play: drag heroes to move or attack, double-tap an enemy, triple-tap
// open ground to end the turn. Off unless turned on in Settings.
const FAST_PLAY_KEY = 'born-gifted-fast-play';

export function fastPlayOn() {
  try { return localStorage.getItem(FAST_PLAY_KEY) === 'on'; } catch { return false; }
}

export function setFastPlayOn(on) {
  try { localStorage.setItem(FAST_PLAY_KEY, on ? 'on' : 'off'); } catch { /* setting just won't persist */ }
}
