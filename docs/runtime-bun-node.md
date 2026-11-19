# Bun ou Node comme runtime de production (SCRUM-80)

Aujourd'hui, Bun installe les dépendances, construit l'app et lance les tests ; l'image de prod
exécute le serveur standalone de Next avec **Node 22** ([Dockerfile](../Dockerfile), étape `runner`).
Question du ticket : faut-il aussi exécuter la prod avec Bun ?

## Protocole (mesure légère)

- **Même image, deux interpréteurs** : une seule build Next. L'image `memequizz:node` est celle du
  Dockerfile ; la variante Bun copie son dossier `/app` tel quel dans `oven/bun:1.4.4-alpine` (même
  utilisateur non-root) et lance `bun server.js` au lieu de `node server.js`.
- Base PostgreSQL 17 de développement (221 mèmes, 15 parties), même réseau Docker que l'app.
- Poste de développement (Windows 11, Docker Desktop/WSL2), 19/11/2026. Charge générée sur la même
  machine par un script de 20 lignes (`fetch` en boucle, 20 clients simultanés, 15 s par page).
- Démarrage : de `docker run` à la première réponse 200 sur `/`, 3 fois par runtime.
- Pages : `/` (rendue à l'avance, servie depuis le cache) et `/classement` (rendue à chaque requête,
  lit la base).

## Résultats

| Mesure                                | Node 22        | Bun 1.4.4      | Écart (Bun)    |
| ------------------------------------- | -------------- | -------------- | -------------- |
| Taille de l'image                     | 330 Mo         | 250 Mo         | −24 %          |
| Démarrage jusqu'au 1er 200 (3 essais) | 2,69 à 2,75 s  | 2,89 à 3,01 s  | +0,25 s (+9 %) |
| Mémoire au repos                      | 51 Mio         | 57 Mio         | +6 Mio         |
| `/` : requêtes par seconde            | 195 (203\*)    | 367 (360\*)    | ×1,8           |
| `/` : latence médiane / 99e centile   | 95 / 198 ms    | 49 / 128 ms    | −48 % / −35 %  |
| `/classement` : requêtes par seconde  | 35             | 45             | +29 %          |
| `/classement` : médiane / 99e centile | 534 / 1 413 ms | 399 / 1 231 ms | −25 % / −13 %  |
| Mémoire après les deux charges        | 235 Mio        | 173 Mio        | −26 %          |
| Erreurs (statuts ≠ 200, journaux)     | aucune         | aucune         |                |

\* Deuxième passe sur `/`, dans l'ordre inverse (Bun d'abord) : même écart, ce n'est pas un effet
d'ordre.

## Lecture

- **Bun est nettement plus rapide sous charge** et consomme moins de mémoire une fois chargé. L'image
  est plus petite, car l'image Bun Alpine pèse moins que l'image Node.
- **Node démarre un peu plus vite** et consomme un peu moins au repos : négligeable pour un serveur qui
  tourne en continu.
- `/classement` reste lent avec les deux runtimes (≈ 0,4 à 0,5 s en médiane sous charge) : le goulot est
  le rendu et la requête SQL, pas l'interpréteur. C'est là qu'il faudrait agir si la charge augmentait.

## Choix : Node conservé

| Pour Bun                                                           | Pour Node                                                                                                                                                                                   |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ×1,8 de débit sur les pages en cache, −26 % de mémoire sous charge | runtime **pris en charge officiellement** par Next.js pour `next start` et le mode standalone                                                                                               |
| image 80 Mo plus légère                                            | Bun réimplémente les API de Node : un écart reste possible dans un recoin non mesuré ici (Web Push, actions serveur, envoi d'images du backoffice, `AsyncLocalStorage` de Cache Components) |
| un seul outil du développement à la prod                           | le trafic réel est très faible (quelques joueurs, sonde UptimeRobot) : le gain de débit ne sert pas aujourd'hui                                                                             |
|                                                                    | aucun changement en prod, rien à revalider                                                                                                                                                  |

Le gain de Bun est réel mais **sans utilité au trafic actuel**, alors que le risque (runtime non pris
en charge officiellement par Next, chemins non couverts par la mesure) toucherait la prod. On garde
**Bun pour installer, construire et tester, Node pour exécuter** : chaque outil là où il est le plus
sûr.

À revoir si la charge augmente nettement (salles en temps réel de la v0.9, par exemple) : il faudrait
alors relancer la suite E2E contre l'image Bun et surveiller la prod quelques jours.

## Passer à Bun si la décision change

Dans l'étape `runner` du Dockerfile : `FROM oven/bun:1.4.4-alpine` au lieu de `node:22-alpine`, et
`CMD ["bun", "server.js"]`. L'utilisateur non-root, le `HEALTHCHECK` (`wget` est fourni par BusyBox)
et le compose ne changent pas. Vérifier ensuite le job « image Docker » de la CI, puis une partie
complète, une notification push et un ajout de mème dans le backoffice.

## Limites de la mesure

Une seule machine (pas le VPS), charge générée en local, une passe de 15 s par page (deux pour `/`).
Les ordres de grandeur sont fiables, pas les pourcentages exacts.
