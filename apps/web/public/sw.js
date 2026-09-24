const CACHE_NAME = "smartbiz-v5";
const PRECACHE = [
  "/",
  "/fr",
  "/en",
  "/manifest.webmanifest",
  "/icon.svg",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-180.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.status === 200 && request.method === "GET") {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (err) {
    const cached = await caches.match(request);
    if (cached) return cached;
    throw err;
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const networkResponse = await fetch(request);
  if (networkResponse && networkResponse.status === 200 && request.method === "GET") {
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, networkResponse.clone());
  }
  return networkResponse;
}

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // Never cache API calls.
  if (url.pathname.startsWith("/api/")) return;

  // Next.js static assets can be cached for a long time.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(event.request));
    return;
  }

  // HTML navigations and other pages : prefer network for updates, fallback on cache.
  event.respondWith(networkFirst(event.request));
});

// --- Notifications push -------------------------------------------------------

self.addEventListener("push", (event) => {
  let data = { title: "SmartBiz", body: "", url: "/" };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch {
    // Corps non-JSON : on garde les valeurs par défaut.
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon || "/icons/icon-192.png",
      badge: data.badge || "/icons/icon-192.png",
      data: { url: data.url || "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = event.notification.data?.url || "/";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ("focus" in client) {
          client.navigate(target);
          return client.focus();
        }
      }
      return clients.openWindow(target);
    }),
  );
});
