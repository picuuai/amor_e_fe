// Cache do app para funcionar offline. Aumente a versão ao publicar mudanças.
const CACHE = 'tercos-v22';
const FILES = ['./', 'index.html', 'style.css', 'app.js', 'galeria.js', 'studio.js', 'sync.js', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png'];
// Só guarda os arquivos do próprio app e as fontes. Nunca o GitHub (dados) nem o postador.
const CACHEAVEL = [self.location.origin, 'https://fonts.googleapis.com', 'https://fonts.gstatic.com', 'https://cdnjs.cloudflare.com'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// Rede primeiro (pega atualizações), cache se estiver offline.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || !CACHEAVEL.includes(new URL(e.request.url).origin)) return;
  e.respondWith(
    fetch(e.request, { cache: 'no-cache' }).then(r => {
      const copy = r.clone();
      caches.open(CACHE).then(c => c.put(e.request, copy));
      return r;
    }).catch(() => caches.match(e.request, { ignoreSearch: true }))
  );
});
