"use strict";

const CACHE_NAMESPACE = "sam-mate:";
const CACHE_NAME = "sam-mate:app-shell:public-entry-v2";
// This cache contains site-neutral application files only. Site configuration is
// selected at runtime and employee/Admin data remains in site-scoped localStorage.
// The versioned shell is written only during install so query-bearing responses
// cannot replace canonical offline resources at runtime.
const APP_FILES = [
  "./",
  "./index.html",
  "./tools.html",
  "./room-extractor.html",
  "./LICENSE",
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
      .then((keys) => Promise.all(keys.filter((key) => (key.startsWith(CACHE_NAMESPACE) || key === "sam-mate-github-v18-public-without-vision") && key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET" || new URL(event.request.url).origin !== self.location.origin) return;

  event.respondWith(
    fetch(event.request)
      .catch(async (networkError) => {
        const cache = await openAppShellCache();
        const cacheUrl = appShellUrl(event.request);
        const cached = cacheUrl ? await cache.match(cacheUrl) : undefined;
        if (cached) return cached;

        if (event.request.mode === "navigate") {
          const fallback = await cache.match(INDEX_URL);
          if (fallback) return fallback;
        }

        throw networkError;
      })
  );
});
