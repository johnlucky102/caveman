/**
 * KidGarden Service Worker
 * 
 * Strategy:
 * - App Shell (HTML, JS, CSS): Cache-First → instant load on repeat visits
 * - Static assets (fonts, icons): Cache-First với 30 ngày TTL
 * - Supabase API calls: Network-First với cache fallback 5 phút
 * - Offline: Trả về cached version hoặc offline page nếu không có cache
 */

const CACHE_VERSION = 'kidgarden-v1';
const STATIC_CACHE  = `${CACHE_VERSION}-static`;
const API_CACHE     = `${CACHE_VERSION}-api`;

// Assets to pre-cache on SW install (app shell)
const PRECACHE_URLS = [
  '/',
  '/index.html',
];

// ─── Install: pre-cache app shell ─────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(PRECACHE_URLS);
    }).then(() => {
      // Activate immediately without waiting for old SW to be replaced
      return self.skipWaiting();
    })
  );
});

// ─── Activate: clean up old caches ────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name.startsWith('kidgarden-') && name !== STATIC_CACHE && name !== API_CACHE)
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => {
      // Take control of all pages immediately
      return self.clients.claim();
    })
  );
});

// ─── Fetch: routing logic ─────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests and browser extension requests
  if (request.method !== 'GET') return;
  if (!url.protocol.startsWith('http')) return;

  // ── Supabase API: Network-First, cache fallback 5 minutes ─────────────────
  if (url.hostname.includes('supabase.co')) {
    event.respondWith(networkFirstWithCache(request, API_CACHE, 300));
    return;
  }

  // ── Same-origin JS/CSS/fonts: Cache-First (Vite hashes ensure freshness) ───
  if (url.origin === self.location.origin) {
    // Vite-built assets have content hashes in filename → safe to cache forever
    if (url.pathname.startsWith('/assets/')) {
      event.respondWith(cacheFirst(request, STATIC_CACHE));
      return;
    }

    // HTML navigation requests: Network-First, fallback to cached index.html
    if (request.mode === 'navigate') {
      event.respondWith(navigationHandler(request));
      return;
    }
  }

  // ── Google Fonts: Cache-First ──────────────────────────────────────────────
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }
});

// ─── Strategy: Cache-First ────────────────────────────────────────────────────
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('Offline', { status: 503 });
  }
}

// ─── Strategy: Network-First with TTL cache fallback ─────────────────────────
async function networkFirstWithCache(request, cacheName, maxAgeSeconds) {
  const cache = await caches.open(cacheName);

  try {
    const response = await fetch(request.clone());
    if (response.ok) {
      // Store with timestamp header for TTL checking
      const responseToCache = new Response(response.clone().body, {
        status: response.status,
        statusText: response.statusText,
        headers: {
          ...Object.fromEntries(response.headers.entries()),
          'sw-cached-at': Date.now().toString(),
        },
      });
      cache.put(request, responseToCache);
    }
    return response;
  } catch {
    // Network failed — try cache
    const cached = await cache.match(request);
    if (cached) {
      const cachedAt = parseInt(cached.headers.get('sw-cached-at') || '0');
      const age = (Date.now() - cachedAt) / 1000;
      if (age < maxAgeSeconds) {
        return cached;
      }
    }
    return new Response(JSON.stringify({ error: 'Offline', cached: false }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// ─── Strategy: SPA navigation (always serve index.html) ───────────────────────
async function navigationHandler(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Offline: serve cached index.html for SPA routing
    const cache = await caches.open(STATIC_CACHE);
    const cached = await cache.match('/index.html') || await cache.match('/');
    return cached || new Response('<h1>KidGarden đang offline</h1>', {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }
}
