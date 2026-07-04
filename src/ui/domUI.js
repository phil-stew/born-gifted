// Modern UI layer shared helpers — DOM overlay mounted into #ui-root,
// used by menu/story scenes per the 2026-07-04 visual style guide.
// Battle stays pure Phaser/pixel-art; this never touches BattleScene.

const root = document.getElementById('ui-root');

// Renders `html` into #ui-root and shows it. Call once per scene render;
// safe to call repeatedly (e.g. on every rebuild()).
export function mount(html) {
  root.innerHTML = html;
  root.classList.add('is-active');
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

// Basic HTML-escaping for any user-facing string interpolated into markup
// (unit names are hardcoded data today, but this is cheap insurance).
export function esc(str) {
  return String(str ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}
