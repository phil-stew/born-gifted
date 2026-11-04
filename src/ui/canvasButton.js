// Shared "modern button" look for Phaser-canvas UI (rounded corners, a soft
// drop shadow, and a colored accent stripe on hover/active) — the shape
// language established for BattleScene's action menu and ShopScene's panels
// (July 2026), generalized here so every canvas scene's buttons share one
// implementation instead of each hand-rolling flat, square fillRect buttons.
// Not used by PartyScene — those are DOM/CSS UI with their own
// already-modern (rounded/shadowed) styling, a separate system entirely.

import { playSfx, SFX } from '../audio/sound.js';

// Minimum comfortable touch target (Apple HIG / Android Material both land
// around 44-48px) — the visual button can be smaller than this (a lot of
// this game's UI was originally sized for mouse-precision hover states), but
// the tap ZONE is padded up to at least this size so it stays easy to hit
// with a finger on a real phone screen.
const MIN_TOUCH = 44;

// Places a picture cropped to fill a w×h box centred at (x,y) — the art
// behind picture buttons (2026-11-03). Returns null if the texture isn't loaded.
export function addButtonArt(scene, key, x, y, w, h) {
  if (!key || !scene.textures.exists(key)) return null;
  const img = scene.add.image(x, y, key);
  const s = Math.max(w / img.width, h / img.height);
  const cw = w / s, ch = h / s;
  img.setCrop((img.width - cw) / 2, (img.height - ch) / 2, cw, ch).setScale(s);
  return img;
}

// Gives every top-level text in the scene a black outline, including text
// added later, so labels stay readable over a picture background.
export function outlineSceneText(scene) {
  scene.events.on('update', () => {
    for (const t of scene.children.list) {
      if (t.type === 'Text' && t.style.strokeThickness < 3) t.setStroke('#000000', 4);
    }
  });
}

// Draws a single rounded, shadowed, accent-striped button centered at (x,y).
// With `image` (a loaded texture key) the picture fills the button under a
// dark wash, and the label turns white with an outline.
// Returns { container, redraw, setActive } so callers can restyle it (e.g.
// toggle `active` for a selected tab) without rebuilding from scratch.
export function drawButton(scene, {
  x, y, w, h,
  label,
  fontSize = '14px',
  radius = 8,
  bg = 0x161630,
  bgHover = 0x223060,
  border = 0x334477,
  accent = 0x4488ff,
  textColor = '#aaaaff',
  textHoverColor = '#ffffff',
  active = false,
  depth = 0,
  onClick = null,
  image = null,
}) {
  const con = scene.add.container(0, 0).setDepth(depth);

  const shadow = scene.add.graphics();
  shadow.fillStyle(0x000000, 0.3);
  shadow.fillRoundedRect(x - w / 2 + 2, y - h / 2 + 3, w, h, radius);
  con.add(shadow);

  const art = addButtonArt(scene, image, x, y, w, h);
  if (art) {
    con.add(art);
    textColor = '#ffffff';
    textHoverColor = '#ffffff';
  }

  const g = scene.add.graphics();
  let isActive = active;
  const draw = (hover) => {
    g.clear();
    if (art) g.fillStyle(0x000000, isActive || hover ? 0.2 : 0.45);
    else g.fillStyle(isActive || hover ? bgHover : bg, 1);
    g.fillRoundedRect(x - w / 2, y - h / 2, w, h, radius);
    g.lineStyle(1.5, border, isActive ? 1 : 0.7);
    g.strokeRoundedRect(x - w / 2, y - h / 2, w, h, radius);
    if (isActive || hover) {
      g.fillStyle(accent, isActive ? 0.9 : 0.55);
      g.fillRoundedRect(x - w / 2, y - h / 2, 3, h, 2);
    }
  };
  draw(false);
  con.add(g);

  const txt = scene.add.text(x, y, label, {
    fontSize, fontFamily: 'monospace', fontStyle: 'bold',
    color: isActive ? textHoverColor : textColor,
    ...(art ? { stroke: '#000000', strokeThickness: 4 } : {}),
  }).setOrigin(0.5);
  con.add(txt);

  const zone = scene.add.zone(x, y, Math.max(w, MIN_TOUCH), Math.max(h, MIN_TOUCH)).setInteractive({ useHandCursor: !!onClick });
  zone.on('pointerover', () => { draw(true); txt.setColor(textHoverColor); });
  zone.on('pointerout',  () => { draw(false); txt.setColor(isActive ? textHoverColor : textColor); });
  if (onClick) zone.on('pointerdown', () => { playSfx(scene, SFX.click); onClick(); });
  con.add(zone);

  return {
    container: con,
    redraw: draw,
    setActive(v) { isActive = v; draw(false); txt.setColor(isActive ? textHoverColor : textColor); },
  };
}

// Top-left back button shared by every canvas menu. Sized for a phone, where
// the 600px-tall canvas renders at roughly 60% scale.
export function drawBackButton(scene, { label = 'BACK', onClick, depth = 20 }) {
  const text = `◀ ${label}`;
  const w = text.length * 13 + 36;
  return drawButton(scene, {
    x: 8 + w / 2, y: 21, w, h: 38, label: text,
    fontSize: '20px', radius: 8,
    bg: 0x223060, bgHover: 0x304a90, border: 0x6688dd, accent: 0xffffff,
    textColor: '#ffffff', depth, onClick,
  });
}

export function currencyLabel(amount) {
  return `Tytrate: ${amount}`;
}

export function drawCurrency(scene, amount, x, y, originY = 0.5) {
  return scene.add.text(x, y, currencyLabel(amount), {
    fontSize: '21px', fontFamily: 'monospace', fontStyle: 'bold', color: '#ffdd66',
    stroke: '#000000', strokeThickness: 4,
  }).setOrigin(1, originY).setDepth(20);
}
