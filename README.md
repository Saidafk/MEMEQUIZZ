# MEMEQUIZZ

> Reconnais le mème ! Un quiz façon Kahoot : une image de mème, 4 noms, 15 secondes. Plus on répond vite, plus on marque.

**Site en ligne : [memequizz.duckdns.org](https://memequizz.duckdns.org)**

Projet du TP Fullstack (M1, MyDigitalSchool), réalisé par Saïd.

![CI](https://github.com/Saidafk/MEMEQUIZZ/actions/workflows/ci.yml/badge.svg)
![CD](https://github.com/Saidafk/MEMEQUIZZ/actions/workflows/deploy.yml/badge.svg)

---

## Sommaire

- [Fonctionnalités](#fonctionnalités)
- [Stack technique](#stack-technique)
- [Démarrer en local](#démarrer-en-local)
- [Commandes utiles](#commandes-utiles)
- [Tests et qualité](#tests-et-qualité)
- [Mise en production](#mise-en-production)
- [Structure du projet](#structure-du-projet)
- [Organisation du travail](#organisation-du-travail)
- [Documentation](#documentation)

## Fonctionnalités

- **Partie de 10 questions** avec chrono de 15 secondes ; jusqu'à 1 000 points par réponse selon la rapidité.
- **Anti-triche** : chrono et score calculés par le serveur, image anonymisée par l'API.
- **Classement**, **mode entraînement** et **fiche de chaque mème** (origine, auteur, licence).
- **Application installable (PWA)** : service worker, page hors ligne, notifications push du quiz du jour.
- **Backoffice** protégé par mot de passe pour ajouter et gérer les mèmes.
- **Accessibilité** (WCAG 2.2) : jouable au clavier (touches A à D), contrastes vérifiés, couleur jamais seule.

## Stack technique

| Domaine           | Choix                                                        |
| ----------------- | ------------------------------------------------------------ |
| Framework         | Next.js 16 (App Router, API intégrée), React 19              |
| Langage           | TypeScript en mode strict                                    |
| Runtime et outils | Bun (paquets, scripts, tests) ; Node.js en production        |
| Base de données   | PostgreSQL 17, Drizzle ORM, validation des entrées avec Zod  |
| Qualité           | Prettier, ESLint, Bun test                                   |
| Déploiement       | Docker (image multi-stage, sans root), Caddy (HTTPS) sur VPS |
| CI/CD             | GitHub Actions                                               |
| Supervision       | Healthchecks Docker, UptimeRobot                             |

## Démarrer en local

### Prérequis

- [Docker](https://www.docker.com/) et Docker Compose
- [Bun](https://bun.sh/) 1.4 ou plus récent

### 1. Récupérer le projet et le configurer

```bash
git clone https://github.com/Saidafk/MEMEQUIZZ.git
cd MEMEQUIZZ
cp .env.example .env
bun install
```

### 2. Préparer la base de données (une seule fois)

La base PostgreSQL tourne dans Docker ; elle démarre vide.

```bash
bun run db:up      # démarre PostgreSQL et attend qu'il soit prêt
bun run db:reset   # crée les tables et insère les mèmes
bun run db:images  # télécharge les images des mèmes (WebP, dans public/memes/)
```

`db:reset` refuse de s'exécuter sur une base qui n'est pas locale : il efface tout avant de recréer.

### 3. Lancer l'application

Au choix :

```bash
bun run dev          # l'application tourne sur la machine
# ou
docker compose up    # l'application tourne aussi dans Docker
```

L'application est disponible sur **http://localhost:3000**.

### Variables d'environnement

Toutes sont décrites dans [`.env.example`](.env.example). Les principales :

| Variable                                            | Rôle                                               |
| --------------------------------------------------- | -------------------------------------------------- |
| `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` | identifiants de la base                            |
| `DATABASE_URL`                                      | adresse de la base, quand l'app tourne hors Docker |
| `ADMIN_PASSWORD`                                    | mot de passe de `/admin` (12 caractères minimum)   |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`             | clés des notifications push (`bun run vapid`)      |

Ne jamais commiter le fichier `.env`.

## Commandes utiles

| Commande              | Effet                                                                                                  |
| --------------------- | ------------------------------------------------------------------------------------------------------ |
| `bun run dev`         | serveur de développement                                                                               |
| `bun run build`       | build de production                                                                                    |
| `bun run lint`        | ESLint                                                                                                 |
| `bun run typecheck`   | vérification des types TypeScript                                                                      |
| `bun run format`      | formate le code avec Prettier                                                                          |
| `bun run test`        | tous les tests ; ceux d'intégration seulement si `TEST_DATABASE_URL` est définie                       |
| `bun run db:generate` | génère une migration SQL après un changement de schéma ; relire puis commiter le fichier de `drizzle/` |
| `bun run db:reset`    | recrée la base locale (refuse toute base non locale)                                                   |
| `bun run db:seed`     | rejoue le jeu de données initial                                                                       |

## Tests et qualité

- **Tests unitaires** (`tests/unit/`) : score, chrono, validation, service worker, SEO…
- **Tests d'intégration** (`tests/integration/`) : API, anti-triche, migrations et backoffice, sur une vraie base PostgreSQL.
- On n'écrit que des **tests utiles** : chacun vérifie une règle, un cas d'erreur ou un bug déjà rencontré. La couverture est un indicateur ; la CI bloque sous 80 %.

Lancer les tests d'intégration en local demande une base de test dédiée :

```bash
docker compose exec db createdb -U memequizz memequizz_test
# puis décommenter TEST_DATABASE_URL dans .env
bun run db:test
```

> ⚠️ Ne définir `TEST_DATABASE_URL` que lorsque la base de test répond : le schéma de cette base est supprimé à chaque exécution.

## Mise en production

Chaque modification suit le même chemin :

```
ticket Jira → branche → pull request → CI verte → merge → CD → site en ligne
```

- **CI** ([`ci.yml`](.github/workflows/ci.yml)) : à chaque push, trois jobs en parallèle vérifient le code (Prettier, ESLint, TypeScript, tests), l'image Docker de production et l'environnement de développement.
- **Protection de `main`** : PR obligatoire, les trois contrôles doivent être verts.
- **CD** ([`deploy.yml`](.github/workflows/deploy.yml) et [`scripts/deployer.sh`](scripts/deployer.sh)) : après une CI verte sur `main`, connexion SSH au VPS, reconstruction de l'image, attente de l'état « healthy », puis vérification du site public.
- **Production** : Caddy (HTTPS automatique) → application Next.js → PostgreSQL, sur un VPS Debian ; seul Caddy est exposé à Internet.
- **Supervision** : healthchecks Docker et sonde externe UptimeRobot.

Détails : [déploiement](docs/deploiement-vps.md), [sécurisation du VPS](docs/securisation-vps.md), [récapitulatif](docs/recap-mise-en-prod.md).

## Structure du projet

```
src/
  app/          pages (App Router) et routes API (app/api)
  components/   composants React
  db/           schéma Drizzle, jeu de données, scripts de base
  lib/          logique métier : score, parties, réponses, sécurité
tests/
  unit/         tests unitaires
  integration/  tests sur une vraie base PostgreSQL
drizzle/        migrations SQL versionnées
scripts/        déploiement, couverture, outils
public/         images des mèmes, icônes, service worker
docs/           documentation du projet
```

## Organisation du travail

- Backlog dans **Jira** (projet SCRUM), découpé en épopées et en versions (v0.1 à v1.0).
- Une branche par ticket, `<type>/SCRUM-<n>-<slug>`, et des commits `<type>(<scope>): <description> (SCRUM-<n>)`.
- Toute modification passe par une PR, relue puis mergée par Saïd.
- Le code est écrit avec l'aide de Claude (Anthropic) : chaque PR documente l'usage de l'IA dans une section dédiée et suit la [checklist de posture critique](docs/checklist-posture-critique.md). Bilan détaillé : [usage des IA](docs/usage-ia.md).
- Avancement des tâches : [feuille de route](docs/feuille-de-route.md).

## Documentation

| Sujet                     | Document                                                                           |
| ------------------------- | ---------------------------------------------------------------------------------- |
| Présentation du projet    | [fiche de présentation](docs/fiche-presentation-memequizz.md)                      |
| Stack et cartographies    | [stack et cartographies](docs/memequizz-stack-et-cartographies.md)                 |
| Maquette et accessibilité | [maquette](docs/maquette/README.md)                                                |
| Rendu des pages           | [CSR, SSR, SSG](docs/strategies-de-rendu.md)                                       |
| PWA                       | [cache](docs/strategie-cache.md), [notifications](docs/notifications-push.md)      |
| Contenu                   | [droits des images](docs/droits-images.md), [backoffice](docs/backoffice-memes.md) |
| SEO                       | [SEO](docs/seo.md)                                                                 |
| Multijoueur               | [salles et temps réel (SSE)](docs/temps-reel.md)                                   |
| Production                | [déploiement](docs/deploiement-vps.md), [sécurité](docs/securisation-vps.md)       |
