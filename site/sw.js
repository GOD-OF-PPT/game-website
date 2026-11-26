// Serve as /sw.js on the catalogue origin during the Cloud Mail cutover.
self.addEventListener('install', event => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const legacyPrecache = `workbox-precache-v2-${self.registration.scope}`;
    await caches.delete(legacyPrecache);
    await self.registration.unregister();
  })());
});
