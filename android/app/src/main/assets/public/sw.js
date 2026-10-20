/**
 * Haryana Medical Store — PWA Service Worker
 * Robust offline caching strategy for pharmacy POS and inventory management.
 * Offline-first design: Ensures uninterrupted billing and stock operations during network outages,
 * while strictly bypassing authentication, cloud database, and live API endpoints.
 */

const CACHE_PREFIX = 'haryana-medical-store';
const SW_VERSION = 'v2.9.0';
const PRECACHE_NAME = `${CACHE_PREFIX}-precache-${SW_VERSION}`;
const STATIC_CACHE_NAME = `${CACHE_PREFIX}-static-${SW_VERSION}`;
const FONT_CACHE_NAME = `${CACHE_PREFIX}-fonts-${SW_VERSION}`;
const DYNAMIC_CACHE_NAME = `${CACHE_PREFIX}-dynamic-${SW_VERSION}`;

// Essential static shell assets to precache on install
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.svg',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/pwa-maskable-512x512.png',
  '/apple-touch-icon.png',
  '/screenshot-wide.png',
  '/screenshot-narrow.png',
];

// Install Event: Pre-cache core application shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(PRECACHE_NAME)
      .then((cache) => {
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => {
        return self.skipWaiting();
      })
      .catch((err) => {
        console.warn('[SW] Pre-caching failed during install:', err);
      })
  );
});

// Activate Event: Purge old cache versions and claim all open clients immediately
self.addEventListener('activate', (event) => {
  const currentCaches = [
    PRECACHE_NAME,
    STATIC_CACHE_NAME,
    FONT_CACHE_NAME,
    DYNAMIC_CACHE_NAME,
  ];

  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (
              cacheName.startsWith(CACHE_PREFIX) &&
              !currentCaches.includes(cacheName)
            ) {
              return caches.delete(cacheName);
            }
            return Promise.resolve();
          })
        );
      })
      .then(() => {
        return self.clients.claim();
      })
  );
});

// Message Event: Allow in-app manual updates and cache management
self.addEventListener('message', (event) => {
  if (!event.data) return;

  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  } else if (event.data.type === 'GET_VERSION') {
    event.ports[0]?.postMessage({ version: SW_VERSION });
  } else if (event.data.type === 'CLEAR_CACHES') {
    event.waitUntil(
      caches.keys().then((keys) => {
        return Promise.all(
          keys
            .filter((k) => k.startsWith(CACHE_PREFIX))
            .map((k) => caches.delete(k))
        );
      })
    );
  }
});

// Fetch Event: Intelligent multi-tier caching strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only handle GET requests
  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);

  // Ignore non-HTTP/HTTPS schemes (e.g. chrome-extension://, data:, blob:)
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return;
  }

  // Strictly bypass API routes, Firebase Auth/Firestore, GitHub API, and large APK binaries
  const isSensitiveOrLiveApi =
    url.pathname.startsWith('/api/') ||
    url.pathname.endsWith('.apk') ||
    url.hostname.includes('firestore.googleapis.com') ||
    url.hostname.includes('identitytoolkit.googleapis.com') ||
    url.hostname.includes('securetoken.googleapis.com') ||
    url.hostname.includes('api.github.com') ||
    url.hostname.includes('github.com');

  if (isSensitiveOrLiveApi) {
    return;
  }

  // Strategy 1: Google Fonts (Cache-First with persistence)
  if (
    url.hostname === 'fonts.googleapis.com' ||
    url.hostname === 'fonts.gstatic.com'
  ) {
    event.respondWith(
      caches.open(FONT_CACHE_NAME).then((cache) => {
        return cache.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          return fetch(request)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                cache.put(request, networkResponse.clone());
              }
              return networkResponse;
            })
            .catch(() => {
              return new Response('', { status: 503, statusText: 'Offline' });
            });
        });
      })
    );
    return;
  }

  // Strategy 2: Navigation requests (HTML documents, including ?tab=..., ?share_text=..., ?lookup=...)
  // Network-First with quick timeout (1.5s) falling back to cached /index.html
  if (request.mode === 'navigate') {
    event.respondWith(
      fetchWithTimeout(request, 1500)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(PRECACHE_NAME).then((cache) => {
              cache.put('/index.html', responseClone);
            });
            return networkResponse;
          }
          return caches
            .match('/index.html')
            .then((res) => res || caches.match('/'))
            .then(
              (res) =>
                res ||
                new Response('Offline — Haryana Medical Store POS', {
                  status: 503,
                  headers: { 'Content-Type': 'text/plain; charset=utf-8' },
                })
            );
        })
        .catch(() => {
          return caches
            .match(request)
            .then((res) => res || caches.match('/index.html'))
            .then((res) => res || caches.match('/'))
            .then(
              (res) =>
                res ||
                new Response('Offline — Haryana Medical Store POS', {
                  status: 503,
                  headers: { 'Content-Type': 'text/plain; charset=utf-8' },
                })
            );
        })
    );
    return;
  }

  // Strategy 2b: Vite source modules (/src/, /node_modules/) - Network-First with cache fallback
  if (
    url.origin === self.location.origin &&
    (url.pathname.startsWith('/src/') || url.pathname.startsWith('/node_modules/'))
  ) {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(STATIC_CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match(request).then(
            (res) => res || new Response('', { status: 503, statusText: 'Offline' })
          );
        })
    );
    return;
  }

  // Strategy 3: Same-origin Static Assets (Production hashed JS/CSS, Images, Icons, Manifest)
  // Stale-While-Revalidate: serve from cache immediately, update in background
  const isStaticAsset =
    url.origin === self.location.origin &&
    (url.pathname.startsWith('/assets/') ||
      url.pathname.endsWith('.js') ||
      url.pathname.endsWith('.css') ||
      url.pathname.endsWith('.svg') ||
      url.pathname.endsWith('.png') ||
      url.pathname.endsWith('.jpg') ||
      url.pathname.endsWith('.jpeg') ||
      url.pathname.endsWith('.webp') ||
      url.pathname.endsWith('.ico') ||
      url.pathname.endsWith('.json') ||
      url.pathname.endsWith('.woff') ||
      url.pathname.endsWith('.woff2'));

  if (isStaticAsset) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const responseClone = networkResponse.clone();
              caches.open(STATIC_CACHE_NAME).then((cache) => {
                cache.put(request, responseClone);
              });
            }
            return networkResponse;
          })
          .catch(() => {
            return (
              cachedResponse ||
              new Response('', { status: 503, statusText: 'Offline' })
            );
          });

        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // Strategy 4: Same-origin other GET requests
  if (url.origin === self.location.origin) {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (
            networkResponse &&
            networkResponse.status === 200 &&
            networkResponse.type === 'basic'
          ) {
            const responseClone = networkResponse.clone();
            caches.open(DYNAMIC_CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match(request).then(
            (res) =>
              res || new Response('', { status: 503, statusText: 'Offline' })
          );
        })
    );
  }
});

/**
 * Helper to race fetch against a timeout (ms)
 */
function fetchWithTimeout(request, timeoutMs) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('Fetch timed out'));
    }, timeoutMs);

    fetch(request)
      .then((response) => {
        clearTimeout(timer);
        resolve(response);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}
