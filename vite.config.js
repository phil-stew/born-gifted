import { defineConfig } from 'vite';

// Relative base (2026-08-04, itch.io upload showed a blank page) — the
// default absolute base ('/assets/...') only works when the built site is
// served from its host's domain root, which Vercel does but itch.io
// doesn't (HTML5 uploads there are served from a nested per-game path).
// An absolute reference resolved against itch's own domain root 404'd,
// so the main JS bundle never loaded and nothing — not even an error —
// ever rendered. Relative paths ('./assets/...') resolve correctly
// under either hosting scheme, so this is a strict fix with no downside
// for the existing Vercel deploy.
export default defineConfig({
  base: './',
});
