/* Trivial Quest — service worker : cache hors-ligne + mise à jour automatique */
const CACHE = "trivial-quest-v2026-11-01.47";
const ASSETS = [
  "./", "./index.html", "./style.css", "./game.js", "./config.js",
  "./data/age-4-5.js", "./data/age-6-8.js", "./data/age-9-11.js",
  "./data/age-12-15.js", "./data/age-16-30.js", "./data/age-31-plus.js",
  "./data/theme-disney.js", "./data/theme-musique.js",
  "./data/theme-starwars.js", "./data/theme-dragonball.js", "./data/theme-series.js",
  "./data/theme-musique70-90.js", "./data/theme-musique2000.js",
  "./data/theme-cinema.js", "./data/theme-superheroes.js",
  "./manifest.json", "./version.txt"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

/* Réseau d'abord pour version.txt : permet de détecter une mise à jour,
   puis cache pour tout le reste (fonctionne hors-ligne). */
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (url.pathname.endsWith("version.txt")) {
    e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
    return;
  }
  e.respondWith(
    caches.match(e.request).then(cached =>
      cached || fetch(e.request).then(resp => {
        if (resp.ok && url.origin === location.origin) {
          const copy = resp.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
        }
        return resp;
      }).catch(() => cached)
    )
  );
});
