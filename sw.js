const CACHE = 'xiaoliao-puzi-shell-8303749fd497';
const PREFIX = 'xiaoliao-puzi-shell-';
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    const response = await fetch('/', {cache: 'reload'});
    if (!response.ok) throw new Error('App shell unavailable');
    const html = await response.clone().text();
    await cache.put('/', response);
    const paths = [...html.matchAll(/(?:src|href)="([^"#]+)"/g)].map(match => new URL(match[1], self.location.origin))
      .filter(url => url.origin === self.location.origin && /\.(?:js|css|png|svg|webmanifest)$/.test(url.pathname));
    await Promise.all(paths.map(async url => {
      try { const result = await fetch(url, {cache:'reload'}); if (result.ok) await cache.put(url, result); } catch {}
    }));
  })());
  self.skipWaiting();
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith(PREFIX) && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const request = event.request, url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || request.headers.has('range') || url.pathname.startsWith('/api/')) return;
  if (request.mode === 'navigate' && (url.pathname === '/' || url.pathname === '/index.html')) {
    event.respondWith(fetch(request).then(response => {if (response.ok) {const copy = response.clone(); event.waitUntil(caches.open(CACHE).then(cache => cache.put('/', copy)));} return response;}).catch(() => caches.match('/')));
    return;
  }
  if (!/\.(?:js|css|png|svg|webmanifest|woff2?)$/.test(url.pathname) || url.pathname === '/sw.js') return;
  event.respondWith(fetch(request).then(response => {
    if (response.ok && Number(response.headers.get('content-length') || 0) < 5 * 1024 * 1024) {
      const copy = response.clone(); event.waitUntil(caches.open(CACHE).then(async cache => {await cache.put(request, copy); const keys = await cache.keys(); const extra = keys.filter(key => new URL(key.url).pathname !== '/'); for (const key of extra.slice(0, Math.max(0, extra.length - 100))) await cache.delete(key);}));
    }
    return response;
  }).catch(() => caches.match(request)));
});
