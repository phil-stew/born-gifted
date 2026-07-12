// Modern UI layer shared helpers — DOM overlay mounted into #ui-root,
// used by menu/story scenes per the 2026-07-04 visual style guide.
// Battle stays pure Phaser/pixel-art; this never touches BattleScene.

const root = document.getElementById('ui-root');

// Renders `html` into #ui-root and shows it. Call once per scene render;
// safe to call repeatedly (e.g. on every rebuild()).
//
// Preserves scroll position across re-renders: any scrollable element
// tagged `data-scroll-id="foo"` keeps its scrollTop when the same id
// reappears in the new markup — without this, every click-driven re-render
// (expanding a row, equipping an item, ...) would snap long lists back to
// the top, which reads as broken rather than just "re-rendered."
export function mount(html) {
  const positions = {};
  root.querySelectorAll('[data-scroll-id]').forEach(node => {
    positions[node.dataset.scrollId] = node.scrollTop;
  });

  root.innerHTML = html;
  root.classList.add('is-active');

  root.querySelectorAll('[data-scroll-id]').forEach(node => {
    const y = positions[node.dataset.scrollId];
    if (y != null) node.scrollTop = y;
  });
}

// Hides and clears #ui-root. Call from the owning scene's 'shutdown' event
// so the overlay doesn't linger over the next (possibly pixel) scene.
export function unmount() {
  root.classList.remove('is-active');
  root.innerHTML = '';
}

// Convenience for wiring a scene's DOM lifecycle to Phaser's scene events —
// call once from create(). Renders on create and every time render() is
// called again, and unmounts automatically on shutdown.
export function bindScene(scene, render) {
  render();
  scene.events.once('shutdown', unmount);
}

// Attaches a click handler to every element matching `selector` inside
// #ui-root. Re-attach after every mount() since innerHTML replaces nodes.
export function onClick(selector, handler) {
  root.querySelectorAll(selector).forEach(node => {
    node.addEventListener('click', (e) => handler(e, node));
  });
}

// Snapshots one frame of an already-loaded Phaser spritesheet texture to a
// PNG data URL, for use as a plain <img> in the DOM overlay — the interim
// "keep pixel portraits, nicer modern frame" path from the style guide.
// Caches per (textureKey, frameIndex) since a unit's portrait doesn't change
// between rebuild() calls.
const portraitCache = new Map();
export function spriteFrameDataURL(scene, textureKey, frameIndex) {
  const cacheKey = `${textureKey}:${frameIndex}`;
  if (portraitCache.has(cacheKey)) return portraitCache.get(cacheKey);
  if (!scene.textures.exists(textureKey)) return null;

  const tex = scene.textures.get(textureKey);
  const frame = tex.get(frameIndex);
  if (!frame) return null;

  const canvas = document.createElement('canvas');
  canvas.width = frame.cutWidth;
  canvas.height = frame.cutHeight;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(
    frame.source.image,
    frame.cutX, frame.cutY, frame.cutWidth, frame.cutHeight,
    0, 0, frame.cutWidth, frame.cutHeight,
  );
  const url = canvas.toDataURL('image/png');
  portraitCache.set(cacheKey, url);
  return url;
}

// Same idea as spriteFrameDataURL, but for detailed (non-pixel-art-style)
// icon art — gear/item icons — that gets shown much smaller than its source
// resolution (e.g. a 220x205 sheet cell down to a 24px slot icon). Baking
// the downscale into the canvas with smoothing on, at the exact display
// size, avoids the noisy/"uncropped-looking" result of letting the browser
// nearest-neighbor-downscale a big detailed image via CSS (which is what
// `image-rendering: pixelated` does, great for blocky hero sprites scaled
// UP, bad for busy icon art scaled DOWN).
const iconCache = new Map();
export function iconDataURL(scene, textureKey, frameName, size) {
  const cacheKey = `${textureKey}:${frameName}:${size}`;
  if (iconCache.has(cacheKey)) return iconCache.get(cacheKey);
  if (!scene.textures.exists(textureKey)) return null;

  const tex = scene.textures.get(textureKey);
  const frame = tex.get(frameName);
  if (!frame) return null;

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  const scale = Math.min(size / frame.cutWidth, size / frame.cutHeight);
  const dw = frame.cutWidth * scale, dh = frame.cutHeight * scale;
  ctx.drawImage(
    frame.source.image,
    frame.cutX, frame.cutY, frame.cutWidth, frame.cutHeight,
    (size - dw) / 2, (size - dh) / 2, dw, dh,
  );
  const url = canvas.toDataURL('image/png');
  iconCache.set(cacheKey, url);
  return url;
}

// Basic HTML-escaping for any user-facing string interpolated into markup
// (unit names are hardcoded data today, but this is cheap insurance).
export function esc(str) {
  return String(str ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}
