// Triples sin internet: guarda la página, los scripts y las librerías.
const C = 'triples-v2';
const CORE = ['/', '/js/data.js', '/js/avatar.js', '/js/court.js', '/js/sensors.js', '/js/app.js', '/js/t3/scene.js', '/js/t3/player.js', '/vendor/three.js', '/assets/models/esqueleto.glb', '/assets/models/samba.glb', '/manifest.webmanifest', '/icon.svg',
  '/assets/voz/adentro.mp3', '/assets/voz/adentro2.mp3', '/assets/voz/adentro3.mp3', '/assets/voz/bailo.mp3', '/assets/voz/bienvenida.mp3', '/assets/voz/bird.mp3', '/assets/voz/casi.mp3', '/assets/voz/corta.mp3', '/assets/voz/curry.mp3', '/assets/voz/diez.mp3', '/assets/voz/doncic.mp3', '/assets/voz/fuego.mp3', '/assets/voz/gano.mp3', '/assets/voz/genia.mp3', '/assets/voz/jordan.mp3', '/assets/voz/kobe.mp3', '/assets/voz/larga.mp3', '/assets/voz/lebron.mp3', '/assets/voz/limpita.mp3', '/assets/voz/manu.mp3', '/assets/voz/money.mp3', '/assets/voz/moneyrack.mp3', '/assets/voz/muybien.mp3', '/assets/voz/nombre_emi.mp3', '/assets/voz/nombre_mama.mp3', '/assets/voz/nombre_papa.mp3', '/assets/voz/otra.mp3', '/assets/voz/racha.mp3', '/assets/voz/rack.mp3', '/assets/voz/record.mp3', '/assets/voz/shaq.mp3', '/assets/voz/siguiente.mp3', '/assets/voz/tablero.mp3', '/assets/voz/tiempo.mp3', '/assets/voz/turno.mp3', '/assets/voz/ya.mp3',
  'https://cdn.jsdelivr.net/npm/peerjs@1.5.5/dist/peerjs.min.js',
  'https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js'];
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
