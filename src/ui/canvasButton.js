// Shared "modern button" look for Phaser-canvas UI (rounded corners, a soft
// drop shadow, and a colored accent stripe on hover/active) — the shape
// language established for BattleScene's action menu and ShopScene's panels
// (July 2026), generalized here so every canvas scene's buttons share one
// implementation instead of each hand-rolling flat, square fillRect buttons.
// Not used by PartyScene/LoadoutScene — those are DOM/CSS UI with their own
// already-modern (rounded/shadowed) styling, a separate system entirely.

import { playSfx, SFX } from '../audio/sound.js';

// Minimum comfortable touch target (Apple HIG / Android Material both land
// around 44-48px) — the visual button can be smaller than this (a lot of
// this game's UI was originally sized for mouse-precision hover states), but
// the tap ZONE is padded up to at least this size so it stays easy to hit
// with a finger on a real phone screen.
const MIN_TOUCH = 44;

// Draws a single rounded, shadowed, accent-striped button centered at (x,y).
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
}) {
  const con = scene.add.container(0, 0).setDepth(depth);

  const shadow = scene.add.graphics();
  shadow.fillStyle(0x000000, 0.3);
  shadow.fillRoundedRect(x - w / 2 + 2, y - h / 2 + 3, w, h, radius);
  con.add(shadow);

  const g = scene.add.graphics();
  let isActive = active;
  const draw = (hover) => {
    g.clear();
    g.fillStyle(isActive || hover ? bgHover : bg, 1);
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
