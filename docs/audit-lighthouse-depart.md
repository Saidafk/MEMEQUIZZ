# Audit Lighthouse de départ — accessibilité

Date : 2026-10-23 · Version : v0.2 (après SCRUM-30) · Outil : Lighthouse 12, catégorie accessibilité, build de production (`bun run build` puis `bun run start`), Chrome headless.

| Page            | Route            | Score |
| --------------- | ---------------- | ----- |
| Accueil         | `/`              | 100   |
| Jeu             | `/jeu`           | 100   |
| Résultat (démo) | `/resultat/demo` | 100   |
| Classement      | `/classement`    | 100   |
| Composants      | `/composants`    | 100   |

Captures : rapports HTML complets dans [audit-a11y/](audit-a11y/) (`depart-<page>.report.html`, à ouvrir dans un navigateur).

## Lecture

- Aucun échec automatique : contrastes, noms accessibles, langue, titres et landmarks sont conformes selon Lighthouse.
- **Un 100 ne prouve pas l'accessibilité** : Lighthouse n'automatise qu'une part des critères WCAG. Restent à vérifier à la main (SCRUM-33) : jouabilité au clavier seul, ordre de tabulation, focus visible, annonces `aria-live` (chrono, résultat), lecture au lecteur d'écran.
- Ce score sert de base : il ne doit pas baisser lors des prochaines versions.

## Reproduire

```
bun run build
bun run start -- -p 3100
npx lighthouse@12 http://localhost:3100/ --only-categories=accessibility --output=html --chrome-flags="--headless=new"
```
