"use strict";

const CACHE_PREFIX = "sam-mate:housekeeping-pilot";
const CACHE_NAME = `${CACHE_PREFIX}:v4-pwa-install`;
// This versioned cache is an install-time snapshot of the public application
// shell. Runtime responses are never written into it, so a URL carrying query
// parameters cannot replace the canonical offline resource.
const APP_FILES = [
  "./",
  "./index.html",
  "./tools.html",
  "./room-extractor.html",
  "./manifest.webmanifest",
  "./app-icon-180.png",
  "./app-icon-192.png",
  "./app-icon-512.png"
];
const APP_FILE_URLS = new Set(APP_FILES.map((file) => new URL(file, self.location.href).href));
const APP_FILE_REQUESTS = APP_FILES.map((file) => new Request(new URL(file, self.location.href), { cache: "reload" }));
const INDEX_URL = new URL("./index.html", self.location.href).href;

function appShellUrl(request) {
  const url = new URL(request.url);
  url.search = "";
  url.hash = "";
  return APP_FILE_URLS.has(url.href) ? url.href : "";
}

function openAppShellCache() {
  return caches.open(CACHE_NAME);
}

function matchAppShellCache(request) {
  return caches.match(request, { cacheName: CACHE_NAME });
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    openAppShellCache()
      .then((cache) => cache.addAll(APP_FILE_REQUESTS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith(`${CACHE_PREFIX}:`) && key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET" || new URL(event.request.url).origin !== self.location.origin) return;

  event.respondWith(
    fetch(event.request)
      .catch(async (networkError) => {
        const cacheUrl = appShellUrl(event.request);
        const cached = cacheUrl ? await matchAppShellCache(cacheUrl) : undefined;
        if (cached) return cached;

        if (event.request.mode === "navigate") {
          const fallback = await matchAppShellCache(INDEX_URL);
          if (fallback) return fallback;
        }

        throw networkError;
      })
  );
});
