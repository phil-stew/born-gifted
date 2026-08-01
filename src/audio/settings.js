// Persisted player audio preferences — music/SFX volume, 0..1 each,
// independent of any one track's own mix level. sound.js/music.js read
// these as a multiplier on every play call; SettingsScene is the only
// writer. Defaults to full volume so a first-time player hears everything
// exactly as shipped until they choose to turn something down.
const KEY = 'born-gifted-audio-settings';
const DEFAULTS = { music: 1, sfx: 1 };

let cached = null;

function state() {
  if (cached) return cached;
  try {
    const raw = localStorage.getItem(KEY);
    cached = raw ? { ...DEFAULTS, ...JSON.parse(raw) } : { ...DEFAULTS };
  } catch {
    cached = { ...DEFAULTS };
  }
  return cached;
}

function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(state())); } catch { /* private mode etc — just don't persist */ }
}

const clamp01 = (v) => Math.max(0, Math.min(1, v));

export function getMusicVolume() { return state().music; }
export function getSfxVolume()   { return state().sfx; }
export function setMusicVolume(v) { state().music = clamp01(v); persist(); }
export function setSfxVolume(v)   { state().sfx = clamp01(v); persist(); }
