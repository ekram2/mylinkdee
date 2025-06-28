const CORE_CACHE = "link-manager-core-v3";
const API_CACHE = "link-manager-api-v1";
const OFFLINE_PAGE = "/offline.html";

const coreAssets = [
  "/",
  "/index.html",
  "/css/style.css",
  "/js/app.js",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/manifest.json"
];

// Install - Cache core assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CORE_CACHE)
      .then(cache => cache.addAll(coreAssets))
      .then(() => self.skipWaiting())
  );
});

// Activate - Clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CORE_CACHE && key !== API_CACHE)
          .map(key => caches.delete(key))
      );
    })
  );
});

// Fetch - Network first, cache fallback
self.addEventListener("fetch", (event) => {
  // API calls
  if (event.request.url.includes("firestore.googleapis.com")) {
    event.respondWith(
      networkFirstThenCache(event.request)
    );
  } 
  // Static assets
  else {
    event.respondWith(
      cacheFirst(event.request)
    );
  }
});

async function networkFirstThenCache(request) {
  try {
    const networkResponse = await fetch(request);
    const cache = await caches.open(API_CACHE);
    cache.put(request, networkResponse.clone());
    return networkResponse;
  } catch (err) {
    const cachedResponse = await caches.match(request);
    return cachedResponse || Response.error();
  }
}

async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);
  return cachedResponse || fetch(request);
}