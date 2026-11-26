// Triples sin internet: guarda la página, los scripts y las librerías.
const C = 'triples-v3';
const CORE = ['/', '/js/data.js', '/js/avatar.js', '/js/court.js', '/js/sensors.js', '/js/arcade.js', '/js/app.js', '/manifest.webmanifest', '/icon.svg',
  '/assets/arcade/meta.json', '/assets/arcade/cancha.webp', '/assets/arcade/red.webp', '/assets/arcade/bird/1.webp', '/assets/arcade/bird/2.webp', '/assets/arcade/bird/3.webp', '/assets/arcade/bird/4.webp', '/assets/arcade/bird/5.webp', '/assets/arcade/bird/6.webp', '/assets/arcade/jordan/1.webp', '/assets/arcade/jordan/2.webp', '/assets/arcade/jordan/3.webp', '/assets/arcade/jordan/4.webp', '/assets/arcade/jordan/5.webp', '/assets/arcade/jordan/6.webp', '/assets/arcade/kobe/1.webp', '/assets/arcade/kobe/2.webp', '/assets/arcade/kobe/3.webp', '/assets/arcade/kobe/4.webp', '/assets/arcade/kobe/5.webp', '/assets/arcade/kobe/6.webp', '/assets/arcade/lebron/1.webp', '/assets/arcade/lebron/2.webp', '/assets/arcade/lebron/3.webp', '/assets/arcade/lebron/4.webp', '/assets/arcade/lebron/5.webp', '/assets/arcade/lebron/6.webp', '/assets/arcade/manu/1.webp', '/assets/arcade/manu/2.webp', '/assets/arcade/manu/3.webp', '/assets/arcade/manu/4.webp', '/assets/arcade/manu/5.webp', '/assets/arcade/manu/6.webp', '/assets/arcade/shaq/1.webp', '/assets/arcade/shaq/2.webp', '/assets/arcade/shaq/3.webp', '/assets/arcade/shaq/4.webp', '/assets/arcade/shaq/5.webp', '/assets/arcade/shaq/6.webp',
  'https://cdn.jsdelivr.net/npm/peerjs@1.5.5/dist/peerjs.min.js', 'https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js'];

self.addEventListener('install', (e) => { self.skipWaiting(); e.waitUntil(caches.open(C).then((c) => Promise.all(CORE.map((u) => c.add(u).catch(() => {}))))); });
self.addEventListener('activate', (e) => e.waitUntil((async () => {
  for (const k of await caches.keys()) if (k !== C) await caches.delete(k);
  await self.clients.claim();
})()));
const save = (key, r) => { if (r && (r.ok || r.type === 'opaque')) { const cp = r.clone(); caches.open(C).then((c) => c.put(key, cp)); } return r; };
self.addEventListener('fetch', (e) => {
  const req = e.request; if (req.method !== 'GET') return;
  const u = new URL(req.url);
  if (u.origin !== location.origin) {
    if (!/cdn\.jsdelivr\.net/.test(u.host)) return;
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((r) => save(req, r))));
    return;
  }
  const key = req.mode === 'navigate' ? '/' : req;
  e.respondWith(fetch(req).then((r) => save(key, r)).catch(async () => (await caches.match(key, { ignoreSearch: true })) || Response.error()));
});
