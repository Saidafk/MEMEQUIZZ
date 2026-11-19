# Temps réel : salles multijoueur, SSE et choix contre WebSocket

SCRUM-83 (salles), SCRUM-84 (temps réel par SSE), SCRUM-85 (option WebSocket : décision).

## Fonctionnement

```
Hôte ─ POST /api/salles ─────────────► salle (code K7M2QX, 10 mèmes communs) + sa partie
Ami  ─ POST /api/salles/K7M2QX/joueurs ► sa partie, mêmes mèmes, même ordre
Hôte ─ POST /api/salles/K7M2QX/lancement ► question 1 ouverte
Tous ─ GET  /api/salles/K7M2QX/flux (SSE) ◄── état poussé dès qu'il change
Tous ─ GET question / POST /api/reponses ── inchangés (chrono, score, anti-triche du solo)
```

- **Chaque joueur garde sa propre partie** : le moteur solo (choix tirés par le serveur, délai mesuré
  par la base, score jamais reçu du client) sert tel quel. La salle ne fait que **donner le rythme** :
  `salle.rang_courant` est la dernière question ouverte, et une question au-delà est refusée
  (`409 question_pas_encore_ouverte`).
- **Question suivante** : la salle avance quand tous les joueurs ont répondu à la question ouverte, ou
  au plus tard après `DELAI_QUESTION_SALLE_S` (15 s de chrono + 2 s de marge réseau + 3 s de
  lecture) : un joueur parti ne bloque pas les autres. L'avancée est un `UPDATE … WHERE` atomique : deux
  flux qui la tentent en même temps n'ouvrent qu'une question.
- **Fin** : après la 10e question, la salle passe `terminee` et clôt les parties encore ouvertes.
- **Hors du classement général** : les parties jouées en salle ne sont classées que dans leur salle.
  Les mèmes y sont communs : une deuxième session (fenêtre privée) pourrait répondre en connaissant
  la correction reçue par la première (constat de l'audit v0.9).
- **Pas de rattrapage** : une question passée pour la salle sans avoir été demandée par un joueur
  est refusée (`409 question_manquee`) ; le navigateur passe à la suivante.
- **Flux SSE** : la route relit l'état en base chaque seconde et n'envoie un événement que s'il a
  changé (plus un commentaire `: ping` toutes les 15 s). Le navigateur utilise `EventSource`, qui se
  reconnecte seul (`retry: 3000`), et ferme le flux à la fin de la salle.

## Sécurité

- Membres seulement : l'état d'une salle n'est lu (route d'état et flux) qu'avec le cookie de session
  d'un de ses joueurs ; sinon `404`, comme une salle inexistante. Aucun identifiant de joueur ou de
  partie d'un autre n'est envoyé.
- Seul l'hôte lance (`403 pas_hote`) ; plus d'arrivée après le lancement ; 20 joueurs au plus (verrou
  `FOR UPDATE` sur la salle pendant une arrivée).
- Code : 6 caractères tirés avec `crypto.randomInt` dans 32 symboles (sans I, O, 0, 1), soit environ
  1 milliard de codes ; la limitation de débit (60 écritures par minute et par IP) rend la recherche
  au hasard inutile.
- Routes POST sous `/api/*` : jeton CSRF du proxy, `Content-Type: application/json`, corps validé par
  `strictObject`. Le flux est un GET sans effet de bord autre que l'avancée de la salle.
- Connexions longues : la limitation de débit compte des requêtes, pas des connexions qui durent. Le
  flux est donc plafonné à 3 par session, 30 par adresse IP (une salle pleine derrière une même box)
  et 300 au total (`creerCompteurFlux`), et à 30 minutes. Rapport :
  [audit v0.9](audit-securite/2026-11-19-rapport-v0.9.md).
- CSP : `connect-src 'self'` autorise déjà `EventSource` vers le site (vérifié par l'E2E, qui échoue
  sur toute violation CSP).
- Joueurs derrière la même IP (même box, même réseau d'école) : une salle de 10 joueurs fait environ
  10 écritures par question, soit moins de 40 par minute : sous le seuil de 60.

## Derrière Caddy : pas de mise en tampon

Un flux SSE ne sert à rien s'il est mis en tampon : les événements arriveraient par paquets.

- **Caddy** (`reverse_proxy`) transmet immédiatement les réponses `text/event-stream`, sans réglage.
- **Compression** : la route envoie `Cache-Control: no-cache, no-transform`. Next ne compresse pas une
  réponse `no-transform`, et `X-Accel-Buffering: no` couvre un éventuel nginx. Pour le Caddy partagé
  (`encode zstd gzip`), la vérification en production ci-dessous fait foi ; si les événements
  arrivent par paquets, exclure le flux de la compression dans `~/proxy/Caddyfile` :

  ```
  memequizz.duckdns.org {
  	@compressible not path /api/salles/*/flux
  	encode @compressible zstd gzip
  	reverse_proxy memequizz-app:3000
  }
  ```

- **Vérifier en production** : ouvrir une salle dans le navigateur, outils de développement → Réseau →
  requête `flux` → onglet « EventStream » : un événement par arrivée de joueur ou par réponse, au fil
  de l'eau. La réponse doit porter `content-type: text/event-stream` et **pas** de
  `content-encoding`.

## SCRUM-85 : SSE ou service WebSocket séparé ?

| Critère             | SSE dans Next (retenu)                                  | Service Bun WebSocket séparé                                          |
| ------------------- | ------------------------------------------------------- | --------------------------------------------------------------------- |
| Sens des messages   | Serveur → navigateur ; réponses en POST                 | Dans les deux sens                                                    |
| Besoin du jeu       | Suffit : le joueur n'envoie qu'une réponse par question | Bidirectionnel inutile ici                                            |
| Sécurité existante  | Réutilisée : cookie, CSRF, limitation, CSP `'self'`     | À refaire : auth du handshake, origine, débit par message, CSP `wss:` |
| Infra               | Rien à ajouter (même conteneur, même route Caddy)       | 2e conteneur dans `compose.prod.yaml`, route Caddy, CI, image         |
| Reconnexion         | Native (`EventSource`)                                  | À coder                                                               |
| Latence             | ≤ 1 s (relecture en base chaque seconde)                | Immédiate                                                             |
| Charge              | 1 lecture en base par seconde et par joueur connecté    | Faible (diffusion en mémoire)                                         |
| Plusieurs instances | Fonctionne (l'état est en base)                         | Demande un bus partagé (Redis, `LISTEN/NOTIFY`)                       |

**Décision (19/11/2026)** : on garde SSE et on ne crée pas de service WebSocket. Le critère du ticket
(« à faire seulement si SSE ne suffit pas ») n'est pas rempli : le scénario à deux joueurs passe
(E2E `e2e/salle.e2e.ts`), avec une seconde de latence au plus, invisible dans un quiz où chaque
question dure 15 s. Un service séparé doublerait la surface à sécuriser et à déployer pour un gain
que le jeu ne demande pas.

**Quand y revenir** : besoin de messages fréquents du joueur vers le serveur (réactions, chat), salles
beaucoup plus grandes (la relecture par seconde et par joueur deviendrait coûteuse : passer d'abord à
une lecture par salle partagée entre ses flux, ou à `LISTEN/NOTIFY` de PostgreSQL), ou plusieurs
instances de l'application. Le service irait alors dans son propre conteneur sur le réseau `proxy`,
avec un bloc `handle /ws/*` dans le Caddyfile partagé (voir le skill docker-deploy).

## Tests

- Intégration (`tests/integration/salles.test.ts`) : deux joueurs, mêmes mèmes ; membre seul ; hôte
  seul ; salle pleine ; question non ouverte refusée ; avancée atomique ; fin par délai.
- Unitaires (`tests/unit/salles.test.ts`) : code, classement à égalité, format SSE, plafond de flux.
- E2E (`e2e/salle.e2e.ts`) : deux contextes de navigateur jouent une salle complète, classement mis à
  jour sans recharger, axe bloquant à chaque écran, aucune violation CSP.
