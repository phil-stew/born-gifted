import { state } from './gameState.js';

// Element hints on the Pre-Battle screen. 'auto' shows them for a new
// player's first HINT_MISSIONS missions; Settings can force them on or off.
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

export function battleHintsOn() {
  const mode = getHintMode();
  if (mode !== 'auto') return mode === 'on';
  // M0 is the home hub, which lands in this list without being a battle.
  return state.completedMissions.filter(id => id !== 'M0').length < HINT_MISSIONS;
}
