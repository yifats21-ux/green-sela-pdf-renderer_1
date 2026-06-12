/* ===========================================================
   וינה לשלומי — Service Worker
   מאחסן את "מעטפת" האפליקציה כך שאחרי ביקור ראשון היא נפתחת
   גם בלי אינטרנט (אריחי המפה עצמם דורשים רשת).
   בכל עדכון לאפליקציה — להעלות את מספר הגרסה כאן.
   =========================================================== */
const VERSION = "vie-v3";
const SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./app/app.css",
  "./app/native.css",
  "./app/native.js",
  "./app/image-slot.js",
  "./app/data.js",
  "./app/app.js",
  "./app/app-plan.js",
  "./vendor/leaflet/leaflet.css",
  "./vendor/leaflet/leaflet.js",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET") return;
  // קבצי האפליקציה: רשת קודם (כדי לקבל עדכונים), נפילה לקאש כשאין רשת
  if (url.origin === location.origin) {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(e.request, copy));
          return res;
        })
        .catch(() => caches.match(e.request, { ignoreSearch: true }))
    );
  }
  // משאבים חיצוניים (אריחי מפה, גופנים): קאש קודם, אחרת רשת
  else {
    e.respondWith(
      caches.match(e.request).then((hit) => hit ||
        fetch(e.request).then((res) => {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(e.request, copy));
          return res;
        })
      )
    );
  }
});
