import Phaser from 'phaser';

// Player's text size from Settings. DOM menus read --font-scale in style.css;
// canvas text is scaled as it's created by the wrapper below.
const KEY = 'born-gifted-text-size';

export const TEXT_SIZES = [
  { key: 'small',  label: 'Small',  scale: 0.9 },
  { key: 'normal', label: 'Normal', scale: 1 },
  { key: 'large',  label: 'Large',  scale: 1.15 },
];

export function getTextSizeKey() {
  try {
    const saved = localStorage.getItem(KEY);
    return TEXT_SIZES.some(s => s.key === saved) ? saved : 'normal';
  } catch {
    return 'normal';
  }
}

function textScale() {
  return TEXT_SIZES.find(s => s.key === getTextSizeKey()).scale;
}

function applyDomScale() {
  document.documentElement.style.setProperty('--font-scale', textScale());
}

export function setTextSizeKey(key) {
  try { localStorage.setItem(KEY, key); } catch { /* setting just won't persist */ }
  applyDomScale();
}

export function installTextScaling() {
  applyDomScale();
  const factory = Phaser.GameObjects.GameObjectFactory.prototype;
  const addText = factory.text;
  factory.text = function (x, y, text, style) {
    const px = parseFloat(style?.fontSize);
    if (!px) return addText.call(this, x, y, text, style);
    return addText.call(this, x, y, text, { ...style, fontSize: `${Math.round(px * textScale())}px` });
  };
}
