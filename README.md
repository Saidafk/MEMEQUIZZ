# MEMEQUIZZ

Quiz de mèmes façon Kahoot : une image de mème s'affiche, le joueur choisit parmi 4 noms avant la fin d'un chrono de 15 secondes, et gagne plus de points s'il répond vite.

TP Fullstack (35 h) — M1, MyDigitalSchool.

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

## Documentation

- [Fiche de présentation](docs/fiche-presentation-memequizz.md)
- [Stack et cartographies](docs/memequizz-stack-et-cartographies.md)

## Statut

v0.1 — mise en place (backlog Jira, projet SCRUM).
