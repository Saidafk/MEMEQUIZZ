---
name: testing
description: Conventions de tests MEMEQUIZZ — bun test (unitaires et intégration PostgreSQL), Playwright (parcours E2E) et axe (accessibilité), règles de sécurité de la base de test, couverture. À charger avant d'écrire, modifier ou lancer un test (tests/, e2e/, playwright.config.ts).
---

# Tests — MEMEQUIZZ

Trois niveaux, trois outils. Le projet n'utilise **pas Vitest** : `bun test` en tient lieu (même API
`describe`/`test`/`expect`, importée de `bun:test`).

| Niveau      | Dossier              | Outil            | Lancement                                     |
| ----------- | -------------------- | ---------------- | --------------------------------------------- |
| Unitaire    | `tests/unit/`        | `bun test`       | `bun run test`                                |
| Intégration | `tests/integration/` | `bun test` + Pg  | `TEST_DATABASE_URL=… bun run test:couverture` |
| E2E + axe   | `e2e/`               | Playwright + axe | `bun run build` puis `bun run test:e2e`       |

## 1. Quel test écrire ?

Règle du projet (CLAUDE.md) : **seulement des tests utiles**. Chacun vérifie une règle métier (score,
chrono, anti-triche, classement…), un cas d'erreur ou un bug déjà rencontré. Jamais pour faire monter la
couverture.

- Une règle de calcul pure (`src/lib/score.ts`, `chrono.ts`, `validation.ts`) → **unitaire**.
- Une règle qui dépend de la base (partie, réponse, classement, admin) → **intégration**.
- Un parcours utilisateur ou un écran (navigation, focus, messages) → **E2E**, avec axe.
- Un bug corrigé → un test qui échouait avant le correctif, nommé d'après le comportement attendu.

## 2. Conventions communes

- Fichiers : `<module>.test.ts` (bun) ; `<parcours>.e2e.ts` (Playwright). **Jamais `.spec.ts`** :
  `bun test` ramasse les `*.spec.ts` et lancerait les tests Playwright sans Playwright.
- Intitulés en français, qui décrivent le comportement : `"une réponse fausse ne rapporte rien, même rapide"`,
  pas `"test calculerPoints 2"`.
- `describe` au nom de la fonction ou du ticket : `describe("partie complète (SCRUM-42)", …)`.
- Constantes du code plutôt que valeurs recopiées : `POINTS_MAX`, `DUREE_QUESTION_S`, `QUESTIONS_PAR_PARTIE`.
- Import par l'alias `@/` (`@/lib/score`), comme le code applicatif.

## 3. Unitaires (`tests/unit/`)

```ts
import { describe, expect, test } from "bun:test";
import { POINTS_MAX, calculerPoints } from "@/lib/score";

describe("calculerPoints", () => {
  test("une réponse immédiate rapporte le maximum", () => {
    expect(calculerPoints(true, 15)).toBe(POINTS_MAX);
  });
});
```

Pas de base, pas de réseau, pas d'horloge réelle : passer le temps en paramètre (`Date.now()` injecté).

## 4. Intégration PostgreSQL (`tests/integration/`) — règles de sécurité

Incident du 17/11/2026 : une suite lancée sans base démarrée a fait `rm("", { recursive: true })` et
**effacé le projet**. D'où ces règles, non négociables :

1. **Avant de définir `TEST_DATABASE_URL`**, vérifier que Docker tourne (`docker info`) et que la base
   répond (`docker compose exec -T db pg_isready`). Sinon, ne pas la définir : les suites sont sautées.
2. `TEST_DATABASE_URL` vise `localhost` et une base dont le nom finit par `_test` ; `base-test.ts` le
   contrôle (`BASE_TEST_ACTIVE`). Chaque suite commence par
   `describe.skipIf(!BASE_TEST_ACTIVE)(…)`.
3. Le `beforeAll` vide le schéma `public`, migre (`migrate(db, { migrationsFolder: "./drizzle" })`) et
   sème (`semer(db)`). Jamais sur une base de valeur.
4. Toute suppression de fichier passe par `dossierTemporaireSur(chemin, prefixe)` (`base-test.ts`).
5. `afterAll` ferme le client (`await client.end()`).
6. En CI, un test sauté fait échouer le job : une suite qui se saute ne vérifie rien.

## 5. E2E Playwright (`e2e/`)

- Config : `playwright.config.ts`. Par défaut, Playwright démarre `bun run start` (build de production :
  `bun run build` avant) sur `http://localhost:3000`. `E2E_BASE_URL=http://localhost:3000` vise un
  serveur déjà lancé (`bun run dev`). **Jamais la production** : une partie écrit en base.
- Base : la même que l'app (`DATABASE_URL`), migrée et semée (`bun run db:migrate`, `bun run db:seed`).
  En CI, job « Tests E2E et accessibilité », base `memequizz_e2e` dédiée.
- Sélecteurs **par rôle et nom accessible** (`getByRole("button", { name: "C'est parti →" })`,
  `getByLabel("Ton pseudo")`) : ils testent aussi l'accessibilité. Pas de classes CSS (modules hachés),
  pas de `data-testid` sauf impossibilité.
- Attentes avec `await expect(…).toBeVisible()` / `toHaveURL()` (réessai automatique) ; jamais de
  `page.waitForTimeout`.
- Données uniques par test (pseudo `e2e-<horodatage>`) pour ne pas dépendre de l'ordre ni des autres
  tests (`fullyParallel`).
- Le chrono (15 s) n'est pas attendu : on répond tout de suite.

## 6. Accessibilité avec axe

Appeler `verifierAccessibilite(page, "<étape>")` (`e2e/axe.ts`) à chaque nouvel écran ou état (question,
correction, résultat…). Règles WCAG 2.2 AA ; les violations `critical` et `serious` font échouer le test,
les autres sont journalisées. Une nouvelle page publique s'ajoute à la liste de `e2e/accessibilite.e2e.ts`.
axe ne remplace pas les contrôles manuels du skill `a11y-wcag22`.

## 7. Couverture

`bun run test:couverture` (avec la base) puis `bun run couverture:seuil` : seuil global bloquant de 80 %
en CI (`scripts/verifier-couverture.ts`), 60 % comme repère minimal. Un indicateur, pas un objectif : une
baisse se regarde (code nouveau non testé ?), elle ne se corrige pas par des tests sans vérification.
Les pages et routes Next ne sont pas comptées (non importées par `bun test`) : elles relèvent des E2E.

## 8. Lancer et diagnostiquer

- Vérification groupée avant PR : `bun run lint`, `bun run typecheck`, `bun run test`.
- Les E2E et l'intégration tournent en CI ; en local seulement si la base répond (§ 4.1).
- `bun test` écrit sur stderr : rediriger `2>&1` pour lire la sortie.
- Échec E2E en CI : télécharger l'artefact `playwright-report` (trace, capture), ou
  `bunx playwright show-trace <trace.zip>`.
- Pour analyser des échecs : agent `test-runner`.
