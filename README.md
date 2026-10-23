# MEMEQUIZZ

Quiz de mèmes façon Kahoot : une image de mème s'affiche, le joueur choisit parmi 4 noms avant la fin d'un chrono de 15 secondes, et gagne plus de points s'il répond vite.

TP Fullstack (35 h) — M1, MyDigitalSchool.

**Site en ligne : https://memequizz.duckdns.org**

## Stack

- Next.js (App Router, API intégrée) + TypeScript strict
- Bun (runtime et gestionnaire de paquets)
- PostgreSQL + Drizzle ORM
- Vitest et Playwright
- Docker (multi-stage) + Caddy sur VPS

## Structure

```
docs/     fiche de présentation, stack et cartographies
src/      code de l'application
tests/    tests unitaires, d'intégration et E2E
.claude/  skills et agents IA du projet
Dockerfile, compose.yaml   image de production et environnement de dev
```

## Démarrer

Avec Docker (app + PostgreSQL) :

```
cp .env.example .env
docker compose up
```

Sans Docker : `bun install` puis `bun run dev`. L'app est sur http://localhost:3000.

## Base de données locale

PostgreSQL tourne dans Docker (service `db`), l'app hors Docker lit `DATABASE_URL` dans `.env`.

```
bun run db:up      # démarre PostgreSQL et attend qu'il soit prêt
bun run db:reset   # recrée la base vide : migrations + jeu de données initial
bun run db:seed    # rejoue seulement le seed (sans doublon)
```

- Après un changement de `src/db/schema.ts` : `bun run db:generate`, puis relire et committer le SQL dans `drizzle/`.
- `db:reset` supprime les données et refuse toute base qui n'est pas locale.
- Test de migration et de seed : créer la base `memequizz_test` une fois
  (`docker compose exec db createdb -U memequizz memequizz_test`), décommenter `TEST_DATABASE_URL` dans `.env`, puis `bun run db:test`.

## Documentation

- [Fiche de présentation](docs/fiche-presentation-memequizz.md)
- [Stack et cartographies](docs/memequizz-stack-et-cartographies.md)
- [Déploiement sur le VPS](docs/deploiement-vps.md)
- [Checklist de posture critique (code généré par IA)](docs/checklist-posture-critique.md)

## Statut

v0.1 — mise en place (backlog Jira, projet SCRUM).
