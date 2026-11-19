---
name: docker-deploy
description: Déploiement MEMEQUIZZ — image Docker, compose de production, Caddy partagé, VPS, CD, migrations, sauvegardes et redémarrage. À charger avant de modifier Dockerfile, compose*.yaml, scripts/deployer.sh, scripts/sauvegarder-base.sh, .github/workflows/deploy.yml, ou pour préparer, vérifier ou dépanner un déploiement.
---

# Déploiement Docker — MEMEQUIZZ

Référence détaillée : [docs/deploiement-vps.md](../../../docs/deploiement-vps.md) (installation,
Caddy, CD, redémarrage) et [docs/sauvegarde-base.md](../../../docs/sauvegarde-base.md). Ce skill
résume les règles et les gestes ; il ne les remplace pas.

## 0. Règles absolues

1. **Claude ne lance aucune commande sur le VPS** et ne modifie jamais la base de production. Il
   prépare fichiers, scripts et doc, puis donne à Saïd les commandes exactes, dans l'ordre.
2. **Migrations à la main avec `psql`**, jamais `db:migrate` sur le VPS (journal Drizzle vide).
   `scripts/deployer.sh` s'arrête (code 3) si un `drizzle/*.sql` arrive.
3. **Jamais `docker compose down -v`** en prod : `-v` efface `db-data` et `memes-data`.
4. **Caddy est partagé** et vit hors du dépôt (`~/proxy`). Un projet ne publie **aucun** `ports:` ; il
   rejoint le réseau externe `proxy`. La base reste sur le réseau `internal`.
5. Une vérification qui exige le VPS (redémarrage, restauration, cron) n'est pas cochée tant que
   Saïd ne l'a pas faite : le dire dans la PR.

## 1. Les fichiers

| Fichier                          | Rôle                                                                              |
| -------------------------------- | --------------------------------------------------------------------------------- |
| `Dockerfile`                     | 3 étapes : deps (Bun) → build Next standalone (Bun) → runner Node non-root        |
| `compose.yaml`                   | développement local (hot reload, port 5432 publié)                                |
| `compose.prod.yaml`              | prod : app + PostgreSQL 17 + volumes, `restart: unless-stopped`, journaux limités |
| `scripts/deployer.sh`            | déploiement « en une commande » (ff-only, garde-fou migrations, santé)            |
| `.github/workflows/deploy.yml`   | CD : CI verte sur `main` → SSH → `deployer.sh` (si `DEPLOY_AUTO=true`)            |
| `scripts/sauvegarder-base.sh`    | `pg_dump -Fc` vérifié, rotation 14 jours (cron quotidien)                         |
| `scripts/tester-restauration.sh` | restauration dans un PostgreSQL jetable sans réseau                               |

## 2. Image Docker

- Runner **Node** (`node:22-alpine`) avec `server.js` du mode standalone ; Bun sert à installer et
  construire. Choix mesuré (SCRUM-80) : voir [docs/runtime-bun-node.md](../../../docs/runtime-bun-node.md).
- Utilisateur `nextjs` (uid 1001), `HEALTHCHECK` sur `/` : la CI vérifie les deux (job image Docker).
- La build se fait **sans `DATABASE_URL`** : une page qui lit la base doit appeler
  `await connection()` ; `generateStaticParams` doit renvoyer au moins un élément (Cache Components).
- Ne pas ajouter de secret dans l'image (`ENV`, `COPY .env`) : tout passe par l'environnement du compose.

## 3. Compose de production

- Chaque variable vient du `.env` du VPS (`chmod 600`), jamais du dépôt.
- `depends_on: condition: service_healthy` : l'app attend PostgreSQL.
- `stop_grace_period: 1m` sur `db` ; journaux `json-file` 3 × 10 Mo par conteneur.
- Ajouter un service : un `container_name`, `restart: unless-stopped`, `logging: *journaux`, les seuls
  réseaux utiles, aucun `ports:`. Ajouter un domaine : un bloc dans `~/proxy/Caddyfile` puis
  `caddy reload` (voir la doc).

## 4. Gestes courants (commandes à donner à Saïd)

| Besoin                  | Commande sur le VPS                                                                                                                            |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Déployer à la main      | `cd ~/memequizz && bash scripts/deployer.sh`                                                                                                   |
| Migration               | `docker compose -f compose.prod.yaml exec -T db psql -U <user> -d <base> < drizzle/000N_x.sql` puis `MIGRATIONS_OK=1 bash scripts/deployer.sh` |
| Retour arrière          | `git switch --detach <sha> && docker compose -f compose.prod.yaml up -d --build`                                                               |
| Journaux                | `docker compose -f compose.prod.yaml logs --tail 100 app`                                                                                      |
| Sauvegarde immédiate    | `bash scripts/sauvegarder-base.sh`                                                                                                             |
| Tester une sauvegarde   | `bash scripts/tester-restauration.sh [fichier.dump]`                                                                                           |
| Restaurer la prod       | procédure en 5 étapes de `docs/sauvegarde-base.md` (sauvegarde d'abord)                                                                        |
| Vérifier le redémarrage | `systemctl is-enabled docker`, `reboot`, puis `docker ps` (voir la doc)                                                                        |

## 5. Vérifier sans le VPS

- `curl -sI https://memequizz.duckdns.org/` depuis n'importe quel poste : `HTTP/2 200` et les en-têtes
  de la v0.7 (CSP, HSTS, X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy, COOP, pas de
  X-Powered-By). Caddy ne doit rien écraser.
- CI : job « image Docker » (build, non-root, healthy) et compose de dev qui démarre.
- En local, `docker compose -f compose.prod.yaml config -q` valide la syntaxe du compose de prod
  (avec un `.env` contenant les variables `POSTGRES_*`).

## 6. Pièges connus

- `restart: unless-stopped` ne relance pas un conteneur arrêté avec `stop` : finir une maintenance par
  `up -d`.
- Le volume `memes-data` est initialisé avec les images de l'image Docker au premier lancement
  seulement : une image ajoutée au dépôt ensuite doit aussi passer par le backoffice ou une copie.
- `bash -s` (CD par SSH) lit le script sur stdin : garder le corps dans une fonction `main` appelée à
  la fin (voir `deployer.sh`).
- PowerShell 5.1 abîme les accents (`Get-Content`/`Set-Content`) : éditer les scripts avec les outils
  de fichiers, en LF.
