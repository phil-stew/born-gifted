// Global default difficulty preference — separate from any one save slot
// (like the audio settings), since it's a player preference about how the
// game should play, not game state. Applied as BattleScene's fallback
// (see `this.difficulty = data?.difficulty ?? getDifficultyMult()`) for any
// battle that doesn't explicitly pass its own `difficulty` — i.e. every
// first-time mission play, which previously had no way to start on
// anything but Normal. The existing per-replay Normal/Hard/Elite picker
// (WorldMapScene.showDifficultyPicker) still overrides this on top, same
// "layered on, not replaced" relationship it already had.
const KEY = 'born-gifted-difficulty';
const DEFAULT_KEY = 'normal';

export const DIFFICULTIES = [
  { key: 'normal', label: 'Normal', mult: 1.0, color: '#44cc77', bdr: 0x1e6630, bg0: 0x090e0a },
  { key: 'hard',   label: 'Hard',   mult: 1.2, color: '#ffaa33', bdr: 0x7a4410, bg0: 0x110a04 },
  { key: 'elite',  label: 'Elite',  mult: 1.5, color: '#ff4444', bdr: 0x7a1a1a, bg0: 0x110404 },
];

export function getDifficultyKey() {
  try { return localStorage.getItem(KEY) ?? DEFAULT_KEY; } catch { return DEFAULT_KEY; }
}

export function setDifficultyKey(key) {
  if (!DIFFICULTIES.some(d => d.key === key)) return;
  try { localStorage.setItem(KEY, key); } catch { /* private mode etc — just don't persist */ }
}

export function getDifficultyMult() {
  return DIFFICULTIES.find(d => d.key === getDifficultyKey())?.mult ?? 1.0;
}
