// Service worker MEMEQUIZZ. Stratégie de cache : docs/strategie-cache.md.
const VERSION = "v1";
const CACHE_STATIQUE = `memequizz-statique-${VERSION}`;
const CACHE_PAGES = `memequizz-pages-${VERSION}`;
const CACHES = [CACHE_STATIQUE, CACHE_PAGES];

// Ressources immuables ou quasi : cache d'abord.
const estStatique = (url) =>
  url.pathname.startsWith("/_next/static/") ||
  url.pathname.startsWith("/icons/") ||
  url.pathname.startsWith("/memes/");

// Page de secours précachée à l'installation (SCRUM-50).
const PAGE_SECOURS = "/hors-ligne";

// Précache la page de secours et les CSS/JS qu'elle référence, pour qu'elle
// s'affiche avec son style dès un premier passage hors ligne.
async function precacherPageSecours() {
  const pages = await caches.open(CACHE_PAGES);
  await pages.add(PAGE_SECOURS);
  const html = await (await pages.match(PAGE_SECOURS)).text();
  const ressources = new Set(html.match(/\/_next\/static\/[^"'\\\s)]+/g) ?? []);
  const statique = await caches.open(CACHE_STATIQUE);
  await Promise.all([...ressources].map((url) => statique.add(url).catch(() => {})));
}
self.addEventListener("install", (event) => {
  event.waitUntil(precacherPageSecours());
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((noms) =>
        Promise.all(noms.filter((n) => !CACHES.includes(n)).map((n) => caches.delete(n))),
      )
      .then(() => self.clients.claim()),
  );
});

async function cacheDabord(event, requete) {
  const cache = await caches.open(CACHE_STATIQUE);
  const enCache = await cache.match(requete);
  if (enCache) return enCache;
  const reponse = await fetch(requete);
  if (reponse.ok) event.waitUntil(cache.put(requete, reponse.clone()));
  return reponse;
}

async function reseauDabord(event, requete, avecSecours = true) {
  const cache = await caches.open(CACHE_PAGES);
  try {
    const reponse = await fetch(requete);
    if (reponse.ok) event.waitUntil(cache.put(requete, reponse.clone()));
    return reponse;
  } catch (erreur) {
    const enCache = await cache.match(requete);
    if (enCache) return enCache;
    const secours = avecSecours ? await cache.match(PAGE_SECOURS) : undefined;
    if (secours) return secours;
    throw erreur;
  }
}

self.addEventListener("fetch", (event) => {
  const requete = event.request;
  if (requete.method !== "GET") return; // jamais de cache des envois (réponses, parties)
  const url = new URL(requete.url);
  if (url.origin !== self.location.origin) return;
  // Seul le lot d'entraînement est gardé : il ne contient aucune donnée de partie (SCRUM-48).
  if (url.pathname === "/api/entrainement") {
    event.respondWith(reseauDabord(event, requete, false));
    return;
  }
  if (url.pathname.startsWith("/api/")) return; // données de jeu : toujours le réseau

  if (estStatique(url)) {
    event.respondWith(cacheDabord(event, requete));
  } else if (requete.mode === "navigate") {
    event.respondWith(reseauDabord(event, requete));
  }
});
