---
name: nextjs-bun-conventions
description: Conventions de code MEMEQUIZZ — structure des dossiers, Next.js 16 (App Router, Cache Components, proxy), TypeScript strict, nommage et commandes Bun. À charger avant d'écrire ou de modifier du code applicatif (src/, tests/, config Next ou TypeScript).
---

# Conventions Next.js + Bun — MEMEQUIZZ

Versions du projet : **Next.js 16** (App Router, Turbopack), **React 19**, **TypeScript 5 strict**, **Bun 1.4**.

## 0. Avant d'écrire du code Next

Next 16 diffère de ce que l'on trouve souvent en exemple (Next 13 à 15). Avant d'utiliser une API Next,
vérifier son usage dans la doc fournie avec le paquet : `node_modules/next/dist/docs/`
(`01-app/01-getting-started/`, `01-app/03-api-reference/`, `01-app/02-guides/upgrading/version-16.md`).

Points qui piègent le plus :

- **Cache Components est activé** (`cacheComponents: true` dans `next.config.ts`). Pas de `export const dynamic`,
  `revalidate` ni `fetch(..., { next: { revalidate } })` : on met en cache avec la directive `"use cache"`
  accompagnée de `cacheLife(...)`, et les données toujours fraîches sont rendues dans un `<Suspense>`.
- **API de requête asynchrones** : `params`, `searchParams`, `cookies()`, `headers()` se lisent avec `await`.
- **`middleware.ts` s'appelle maintenant `proxy.ts`.**
- **Types globaux générés** : `PageProps<"/route">`, `LayoutProps<"/route">`, `RouteContext<"/route">`
  (générés par `next typegen`, aucun import nécessaire).
- ESLint se lance avec `bun run lint` (la commande `next lint` n'existe plus).

## 1. Structure des dossiers

```
src/
  app/                 routes (App Router) : page.tsx, layout.tsx, loading.tsx, error.tsx
    api/<ressource>/route.ts   route handlers (API intégrée)
  components/          composants React réutilisables (un composant par fichier)
  lib/                 logique métier et utilitaires (score, tirage des questions…)
  db/                  Drizzle : schema.ts, client, seed
tests/
  unit/                tests des fonctions de src/lib
  e2e/                 parcours utilisateur (Playwright)
public/                fichiers statiques (icônes, manifest PWA)
```

- Imports internes avec l'alias `@/` (ex. `import { calculerScore } from "@/lib/score"`), jamais de `../../..`.
- Un fichier propre à une seule route peut rester à côté d'elle dans `src/app/<route>/` ; dès qu'il sert
  à deux endroits, il passe dans `components/` ou `lib/`.

## 2. Server et Client Components

- **Server Component par défaut.** `"use client"` uniquement pour l'interactivité (état, effets, événements,
  chrono), et le plus bas possible dans l'arbre.
- La **bonne réponse et le calcul du score restent côté serveur** (route handler ou Server Action).
  Un Client Component ne reçoit jamais la bonne réponse avant que le joueur ait répondu.
- Les variables d'environnement secrètes (`DATABASE_URL`…) ne sont lues que côté serveur. Seules les variables
  préfixées `NEXT_PUBLIC_` arrivent au navigateur : n'y mettre aucun secret.
- Le code purement serveur (`src/db`, accès aux secrets) commence par `import "server-only"`
  (paquet à ajouter avec `bun add server-only` la première fois).

## 3. TypeScript strict

Le `tsconfig.json` active `strict` et `noUncheckedIndexedAccess` :

- Pas de `any`. Pour une donnée externe (corps de requête, API memegen.link), typer en `unknown` puis valider.
- Un accès `tableau[i]` est de type `T | undefined` : le traiter, ne pas le masquer avec `!`.
- Pas de `@ts-ignore` ; un `@ts-expect-error` doit être justifié par un commentaire.
- Types et interfaces exportés à côté du code qui les utilise ; types partagés dans `src/lib/types.ts`.

## 4. Nommage

| Élément                        | Convention                             | Exemple                     |
| ------------------------------ | -------------------------------------- | --------------------------- |
| Composant React et son fichier | PascalCase                             | `CarteQuestion.tsx`         |
| Autres fichiers                | kebab-case                             | `tirage-questions.ts`       |
| Fonctions, variables           | camelCase                              | `calculerScore`             |
| Constantes de config           | SCREAMING_SNAKE_CASE                   | `DUREE_QUESTION_MS`         |
| Types, interfaces              | PascalCase, sans préfixe `I`           | `Question`, `ReponseJoueur` |
| Segments de route              | kebab-case, en français                | `/partie`, `/classement`    |
| Tables et colonnes Drizzle     | snake_case (comme le MLD dans `docs/`) | `score_total`               |

- Le **vocabulaire métier est en français** (mème, partie, question, score), comme dans `docs/`.
- Le texte affiché à l'utilisateur est en français ; `<html lang="fr">`.

## 5. Style

- Le formatage est géré par Prettier (`bun run format`) : ne pas aligner à la main.
- CSS Modules (`*.module.css`) par composant, variables globales (design tokens) dans `src/app/globals.css`.
- Accessibilité dès l'écriture : éléments HTML sémantiques (`<button>`, `<main>`, `<h1>`…), `alt` sur
  chaque image, focus visible, contrastes WCAG 2.2.
- Commentaires uniquement pour le **pourquoi** (règle métier, contrainte non évidente).

## 6. Commandes Bun

| Besoin                        | Commande                                                                    |
| ----------------------------- | --------------------------------------------------------------------------- |
| Installer les dépendances     | `bun install`                                                               |
| Ajouter une dépendance (dev)  | `bun add <pkg>` (`bun add -d <pkg>`)                                        |
| Serveur de dev                | `bun run dev`                                                               |
| Dev avec PostgreSQL           | `docker compose up`                                                         |
| Lint / types / format / tests | `bun run lint`, `bun run typecheck`, `bun run format:check`, `bun run test` |
| Build de production           | `bun run build`                                                             |

- Toujours **Bun**, jamais `npm`, `yarn` ni `pnpm` : le verrou est `bun.lock`.
- Avant chaque commit : `bun run lint`, `bun run typecheck` et `bun run test` passent (la CI les relance).
- Tout code généré par l'IA passe par la [checklist de posture critique](../../../docs/checklist-posture-critique.md).
