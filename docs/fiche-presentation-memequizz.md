# Fiche de présentation du projet — MEMEQUIZZ

**TP Fullstack (35 h) — M1, MyDigitalSchool**
**Auteur :** Saïd

---

## Le projet en une phrase

MEMEQUIZZ est un quiz de mèmes façon Kahoot : une image de mème s'affiche, le joueur choisit parmi 4 noms avant la fin d'un chrono de 15 secondes, et gagne plus de points s'il répond vite.

## Thématique

Culture internet et mèmes. Le jeu est sur le principe « reconnais le mème » : image, 4 propositions, score selon la rapidité, classement des meilleurs joueurs. Chaque mème a une fiche (nom, année, origine, lien vers la source) pour apprendre quelque chose après la réponse.

## Choix techniques

| Élément                                | Choix                                               |
| -------------------------------------- | --------------------------------------------------- |
| Méta-framework                         | **Next.js** (App Router, API intégrée)              |
| Langage                                | **TypeScript** en mode strict                       |
| Interpréteur / gestionnaire de paquets | **Bun**                                             |
| Base de données                        | PostgreSQL avec Drizzle ORM                         |
| Tests                                  | Vitest (unitaires, intégration) et Playwright (E2E) |
| Déploiement                            | Docker (multi-stage) + Caddy (HTTPS) sur mon VPS    |

## IA utilisées

- **Claude (Anthropic)** : aide à la conception, à la planification du backlog, à la rédaction et à la génération de code.
- _À compléter si d'autres IA sont utilisées (nom, usage)._

Toute sortie d'IA est relue, comprise et testée avant d'être intégrée. Une checklist de posture critique et un agent de relecture sont prévus dans le backlog.

## Données

Les images et noms viennent de l'API publique **memegen.link**. Environ 40 mèmes reconnaissables sont sélectionnés à la main et leurs fiches sont complétées à partir de **Wikipédia FR** (texte reformulé, source citée, licence CC BY-SA).

## Fonctionnalités principales

- Partie de 10 questions avec chrono et score côté serveur (anti-triche)
- Classement des meilleurs scores
- Fiche détaillée par mème
- Application installable (PWA) avec mode entraînement hors-ligne et notification du quiz du jour
- Bonus si le temps le permet : salles multijoueurs en temps réel

## Ce que le projet démontre (exigences du TP)

Intégration d'une maquette Figma accessible (WCAG 2.2), API intégrée, PWA hors-ligne et notifications, comparaison CSR / SSR / SSG avec mesure des Web Vitals, audit Lighthouse, tests unitaires, d'intégration et E2E, sécurité (CSP, XSS, CSRF, secrets), déploiement Docker en production et présentation orale.

## Organisation

Backlog suivi dans Jira (projet MEMEQUIZZ) : 11 epics et 78 tickets répartis en 10 versions, de v0.1 (mise en place) à v1.0 (livraison).
