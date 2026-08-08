// Minimal service worker (2026-08-08, PWA-packaging pass) — enables real
// offline replay after a first load (worth having on an ~83MB game) and is
// what most install-prompt/TWA tooling checks for before treating this as
// a "real" PWA.
//
// Deliberately NOT a precache-everything-on-install setup, and deliberately
// NOT cache-first for anything: this project routinely edits static assets
// in place under the SAME filename across deploys (background art, sprite
// fixes, etc. — see git history), unlike the hashed /assets/*.js|css Vite
// itself generates. A pure cache-first strategy here would reproduce the
// exact "why isn't my update showing" confusion from the itch.io/Vercel
// caching investigation earlier this project, just harder to diagnose.
// So: the HTML shell (network-first, so a new deploy's new asset hashes
// are always picked up immediately) and everything else (stale-while-
// revalidate — served from cache instantly if present, but always
// refetched in the background so any staleness self-corrects on the very
// next load, never lingers).
const CACHE = 'fst-cache-v1';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  const isShell = req.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname.endsWith('manifest.json');
  if (isShell) {
    event.respondWith(fetch(req).catch(() => caches.match(req)));
    return;
  }

  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(req);
      const network = fetch(req).then((res) => {
        if (res.ok) cache.put(req, res.clone());
        return res;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
