// Global default difficulty preference (Settings menu) — a SEPARATE system
// from WorldMapScene's per-replay Normal/Hard/Elite picker (that one still
// keeps its own local table and its own flat ×1.0/1.2/1.5 raw-stat-mult
// behavior, untouched by this file). This one governs every battle that
// isn't an explicit replay-picker choice — i.e. every first-time mission —
// via two independent levers instead of a single stat multiplier:
//   - levelFloorOffset: how far enemy level gets floored relative to the
//     party's own level (null = no floor at all, ever)
//   - enemyDamageMult / playerDamageMult: flat damage-DEALT multipliers,
//     applied at the final hit calculation (BattleScene.difficultyDamageMult)
//   - disableRepeatScaling: also turns off M0a/M0b's separate repeat-count
//     escalation (repeatLevelBonus/repeatHpMult/repeatAtkMult)
const KEY = 'born-gifted-difficulty';
const DEFAULT_KEY = 'newbie';

export const DIFFICULTIES = [
  {
    key: 'newbie', label: 'Newbie',
    levelFloorOffset: null, disableRepeatScaling: true,
    enemyDamageMult: 0.8, playerDamageMult: 1.2,
    color: '#44cc77', bdr: 0x1e6630, bg0: 0x090e0a,
  },
  {
    key: 'veteran', label: 'Veteran',
    levelFloorOffset: 0, disableRepeatScaling: false,
    enemyDamageMult: 1.10, playerDamageMult: 1.0,
    color: '#ffaa33', bdr: 0x7a4410, bg0: 0x110a04,
  },
  {
    key: 'perilous', label: 'Perilous',
    levelFloorOffset: 2, disableRepeatScaling: false,
    enemyDamageMult: 1.0, playerDamageMult: 1.0,
    color: '#ff4444', bdr: 0x7a1a1a, bg0: 0x110404,
  },
];

export function getDifficultyKey() {
  try { return localStorage.getItem(KEY) ?? DEFAULT_KEY; } catch { return DEFAULT_KEY; }
}

export function setDifficultyKey(key) {
  if (!DIFFICULTIES.some(d => d.key === key)) return;
  try { localStorage.setItem(KEY, key); } catch { /* private mode etc — just don't persist */ }
}

export function getDifficultyConfig() {
  return DIFFICULTIES.find(d => d.key === getDifficultyKey()) ?? DIFFICULTIES[0];
}
