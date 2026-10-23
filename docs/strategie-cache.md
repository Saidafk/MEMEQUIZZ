# Stratégie de cache (service worker)

Fichier : [public/sw.js](../public/sw.js), enregistré en production par `EnregistrementServiceWorker` (layout racine).

| Requête                                   | Stratégie                                    | Cache                          |
| ----------------------------------------- | -------------------------------------------- | ------------------------------ |
| `/_next/static/*`, `/icons/*`, `/memes/*` | Cache d'abord, réseau si absent              | `memequizz-statique-<version>` |
| Navigations (pages HTML)                  | Réseau d'abord, copie en cache si hors ligne | `memequizz-pages-<version>`    |
| `/api/*` et toute requête non GET         | Jamais interceptée                           | aucun                          |
| Autres origines                           | Jamais interceptée                           | aucun                          |

## Pourquoi

- Les fichiers `/_next/static/` portent un hash dans leur nom : le cache d'abord est sûr. `/memes/*` et `/icons/*` changent rarement.
- Les pages restent « réseau d'abord » pour ne jamais servir un classement ou un score périmé quand le réseau fonctionne.
- Les réponses et les parties ne passent jamais par le cache : le score est calculé côté serveur, une réponse ne doit pas être rejouée ni mise en cache.

## Mise à jour

Changer `VERSION` dans `sw.js` pour invalider les caches ; l'activation supprime les anciens (`skipWaiting` + `clients.claim`).

## Limites

Une image de `/memes/` remplacée sous le même nom reste périmée tant que `VERSION` n'est pas incrémentée : changer `VERSION` à chaque modification du catalogue.

Une page jamais visitée en ligne n'est pas disponible hors ligne : le service worker sert alors la page de secours `/hors-ligne`, précachée à l'installation (SCRUM-50). Questions d'entraînement hors ligne : SCRUM-48.
