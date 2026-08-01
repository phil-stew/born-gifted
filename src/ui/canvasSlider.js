// Draggable horizontal slider for Phaser-canvas scenes — same "shared
// helper" role as canvasButton.js's drawButton, for the one settings-screen
// use case (music/SFX volume) that a button/zone can't express on its own.

const clamp01 = (v) => Math.max(0, Math.min(1, v));

// Returns { container, setValue }. `onChange` fires continuously while
// dragging (and once immediately on a click-to-jump); `onRelease` fires
// once when the drag ends, both with the 0..1 value.
export function drawSlider(scene, {
  x, y, w = 260, h = 6,
  value = 1,
  color = 0x4488ff,
  track = 0x223355,
  handleRadius = 9,
  onChange = null,
  onRelease = null,
}) {
  const con = scene.add.container(0, 0);
  let v = clamp01(value);

  const trackG = scene.add.graphics();
  const fillG  = scene.add.graphics();
  const handle = scene.add.circle(0, 0, handleRadius, color).setStrokeStyle(2, 0xffffff, 0.9);

  const redraw = () => {
    trackG.clear();
    trackG.fillStyle(track, 1);
    trackG.fillRoundedRect(x - w / 2, y - h / 2, w, h, h / 2);
    fillG.clear();
    fillG.fillStyle(color, 0.9);
    fillG.fillRoundedRect(x - w / 2, y - h / 2, Math.max(h, w * v), h, h / 2);
    handle.setPosition(x - w / 2 + w * v, y);
  };
  redraw();
  con.add([trackG, fillG, handle]);

  const setFromPointerX = (px) => {
    v = clamp01((px - (x - w / 2)) / w);
    redraw();
    onChange?.(v);
  };

  const zone = scene.add
    .zone(x, y, w + handleRadius * 2, Math.max(h, handleRadius * 2) + 10)
    .setInteractive({ useHandCursor: true, draggable: true });
  con.add(zone);

  let dragging = false;
  zone.on('pointerdown', (ptr) => { dragging = true; setFromPointerX(ptr.x); });
  const onMove = (ptr) => { if (dragging) setFromPointerX(ptr.x); };
  const onUp   = () => { if (dragging) { dragging = false; onRelease?.(v); } };
  scene.input.on('pointermove', onMove);
  scene.input.on('pointerup', onUp);
  scene.events.once('shutdown', () => {
    scene.input.off('pointermove', onMove);
    scene.input.off('pointerup', onUp);
  });

  return {
    container: con,
    setValue(nv) { v = clamp01(nv); redraw(); },
  };
}
