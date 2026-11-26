// Cache para funcionar offline. Aumente a versão ao publicar mudanças.
var CACHE = 'chaves-v3';
var FILES = [
  './', 'index.html', 'manifest.webmanifest',
  'css/tokens.css', 'css/base.css', 'css/layout.css', 'css/components.css',
  'js/core/dates.js', 'js/core/domain.js', 'js/core/storage.js', 'js/core/store.js',
  'js/ui/dom.js', 'js/ui/overlays.js', 'js/ui/components.js',
  'js/report/pdf-writer.js', 'js/report/daily-report.js', 'js/platform.js', 'js/actions.js',
  'js/sheets/checkout.js', 'js/sheets/movement.js', 'js/sheets/key.js',
  'js/screens/home.js', 'js/screens/board.js', 'js/screens/report.js', 'js/screens/settings.js',
  'js/main.js',
  'icons/icon.svg', 'icons/icon-180.png', 'icons/icon-192.png', 'icons/icon-512.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(FILES); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

// Rede primeiro (pega atualizações), cache se estiver offline
self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request).then(function (res) {
      var copy = res.clone();
      caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
      return res;
    }).catch(function () { return caches.match(e.request, { ignoreSearch: true }); })
  );
});
