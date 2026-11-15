// Cache dell'app: si apre subito e funziona anche senza rete (con l'ultimo stato salvato dal browser).
const V = 'stuoiedex-v4';
const SHELL = ['./', 'index.html', 'banco.html', 'css/style.css', 'js/app.js', 'js/banco.js', 'js/api.js', 'js/config.js',
  'js/catalog.js', 'js/sprites.js', 'js/ui.js', 'js/scanner.js', 'manifest.webmanifest', 'icons/icon-192.png'];

self.addEventListener('install', (e) => { e.waitUntil(caches.open(V).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== V).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.hostname.endsWith('supabase.co')) return;
  // file dell'app: prima la rete (per avere sempre l'ultima versione), poi la cache
  e.respondWith(fetch(e.request).then((r) => {
    if (r.ok && (url.origin === location.origin || /esm\.sh|fonts\.(googleapis|gstatic)\.com/.test(url.hostname))) {
      const copy = r.clone(); caches.open(V).then((c) => c.put(e.request, copy));
    }
    return r;
  }).catch(() => caches.match(e.request)));
});
