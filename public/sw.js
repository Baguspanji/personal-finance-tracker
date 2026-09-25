// Finance Tracker service worker.
// Strategies:
// - Navigations: network-first, fallback to cached app shell (offline support).
// - Hashed build assets (/assets/) + icons: cache-first.
// - API (/api/): network-only, never cached (auth'd dynamic data).
// - Everything else same-origin GET: network-first with runtime fallback.

const VERSION = 'finance-v2';
const STATIC_CACHE = `finance-static-${VERSION}`;
const RUNTIME_CACHE = `finance-runtime-${VERSION}`;

const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon.svg',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith('finance-') && k !== STATIC_CACHE && k !== RUNTIME_CACHE)
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

async function networkFirstWithFallback(request, fallbackUrl) {
  const runtime = await caches.open(RUNTIME_CACHE);
  try {
    const response = await fetch(request);
    if (response && response.status === 200 && response.type === 'basic') {
      runtime.put(request, response.clone());
    }
    return response;
  } catch (err) {
    const cached = await caches.match(request, { ignoreSearch: false });
    if (cached) return cached;
    if (fallbackUrl) {
      const fallback = await caches.match(fallbackUrl);
      if (fallback) return fallback;
    }
    throw err;
  }
}

async function cacheFirstWithFill(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response && response.status === 200 && response.type === 'basic') {
    const runtime = await caches.open(RUNTIME_CACHE);
    runtime.put(request, response.clone());
  }
  return response;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Dynamic API data must never be served from cache.
  if (url.pathname.startsWith('/api/')) return;

  // App shell / navigations work offline.
  if (request.mode === 'navigate') {
    event.respondWith(networkFirstWithFallback(request, '/index.html'));
    return;
  }

  // Versioned build output and icons are immutable-ish: cache-first.
  if (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/icons/')) {
    event.respondWith(cacheFirstWithFill(request));
    return;
  }

  event.respondWith(networkFirstWithFallback(request, null));
});
