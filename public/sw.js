// Service worker MEMEQUIZZ. Stratégie de cache : docs/strategie-cache.md.
// v2 : le changement de version supprime les anciens caches, qui contenaient des pages /admin.
const VERSION = "v2";
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
  // L'administration n'est jamais mise en cache : une page affichée une fois connecté ne doit pas
  // rester lisible hors ligne ou sur un appareil partagé (SCRUM-98).
  if (url.pathname === "/admin" || url.pathname.startsWith("/admin/")) return;

  if (estStatique(url)) {
    event.respondWith(cacheDabord(event, requete));
  } else if (requete.mode === "navigate") {
    event.respondWith(reseauDabord(event, requete));
  }
});

// Notifications push du quiz du jour (SCRUM-49). La charge est un JSON { titre, corps, url }
// envoyé par le serveur ; une charge illisible donne un message par défaut.
self.addEventListener("push", (event) => {
  let message = {};
  try {
    message = event.data ? event.data.json() : {};
  } catch {
    // Charge non JSON : message par défaut ci-dessous.
  }
  const { titre = "MEMEQUIZZ", corps = "Le quiz du jour est prêt !", url = "/" } = message;
  event.waitUntil(
    self.registration.showNotification(titre, {
      body: corps,
      icon: "/icons/icon-192.png",
      data: { url },
    }),
  );
});

// Un clic ramène sur une fenêtre ouverte du site, sinon en ouvre une.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url ?? "/", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((fenetres) => {
      const ouverte = fenetres.find((f) => new URL(f.url).origin === self.location.origin);
      return ouverte ? ouverte.focus() : self.clients.openWindow(url);
    }),
  );
});
