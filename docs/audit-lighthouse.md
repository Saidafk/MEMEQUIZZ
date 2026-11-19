# Audit Lighthouse avant / après (SCRUM-57)

Objectif du ticket : score de 90 ou plus, avec captures avant/après. Production (`https://memequizz.duckdns.org`), Lighthouse 12.8.2, médiane de 3 passes en mobile (4G lente simulée, CPU ×4), une passe en ordinateur.

## Ce qui a changé

1. **SCRUM-56** (PR #53) : images des mèmes optimisées par `next/image` (voir [performance-images.md](performance-images.md)).
2. **Polices, 1re étape** (PR #55) : plus de préchargement de Gaegu. Google découpe cette police coréenne en ~90 tranches par graisse ; `next/font` en préchargeait 44, soit 92 fichiers et 701 Kio de polices par page.
3. **Polices, 2e étape** (PR #56) : Gaegu servie en local, réduite aux caractères latins (2 fichiers, 17 et 23 Ko, licence OFL dans `src/app/polices/`). Les 180 `@font-face` des tranches faisaient 86 Ko des 90 Ko du CSS bloquant.

## Résultats mobile

| Page         | Perf avant | Perf après | LCP avant | LCP après | Accessibilité | SEO | Bonnes pratiques |
| ------------ | ---------- | ---------- | --------- | --------- | ------------- | --- | ---------------- |
| `/stats/ssg` | 74         | 88         | 7,6 s     | 3,7 s     | 100           | 100 | 100              |
| `/stats/ssr` | 70         | 92         | 7,8 s     | 2,9 s     | 100           | 100 | 100              |
| `/stats/csr` | 62         | 86         | 8,1 s     | 3,9 s     | 100           | 100 | 100              |
| `/meme/doge` | 59         | 86         | 8,17 s    | 4,0 s     | 100           | 100 | 100              |

## Résultats ordinateur (après)

| Page         | Perf | LCP    | TBT   | Accessibilité | SEO | Bonnes pratiques |
| ------------ | ---- | ------ | ----- | ------------- | --- | ---------------- |
| `/stats/ssg` | 100  | 0,75 s | 23 ms | 100           | 100 | 100              |
| `/meme/doge` | 99   | 0,84 s | 15 ms | 100           | 100 | 100              |

## Lecture

- **Objectif atteint en ordinateur (99-100) et pour l'accessibilité, le SEO et les bonnes pratiques (100 partout).** En mobile, la performance passe de 59-74 à 86-92.
- **Le reste du LCP mobile (~3,7 s) est en partie un effet de la simulation** : dans la trace réellement observée, le titre est affiché à 368 ms, en même temps que le premier rendu. La méthode simulée de Lighthouse compte tout le JavaScript chargé avant comme bloquant. Avec un vrai ralentissement (`--throttling-method=devtools`), LCP = FCP = 2,6 s.
- **Le dernier frein mobile est le JavaScript** : ~390 Ko (non compressés) de React et du moteur de Next.js, socle du framework, et un TBT de 125 à 245 ms (simulé). Le réduire demanderait de revoir les composants client, hors du périmètre de ce ticket.
- **Un 100 en accessibilité ne prouve pas la conformité WCAG 2.2** : Lighthouse n'automatise qu'une partie des critères (voir [audit-lighthouse-depart.md](audit-lighthouse-depart.md) et le skill a11y-wcag22).

## Captures

Rapports HTML complets dans [audit-lighthouse/](audit-lighthouse/), à ouvrir dans un navigateur :

- avant : `avant-stats-ssg-mobile.html`, `avant-meme-doge-mobile.html` (catégorie performance seule) ;
- après : `apres-stats-ssg-mobile.html`, `apres-meme-doge-mobile.html`, `apres-stats-ssg-ordinateur.html`, `apres-meme-doge-ordinateur.html`.

## Reproduire

```
npx lighthouse@12 https://memequizz.duckdns.org/stats/ssg --only-categories=performance,accessibility,seo,best-practices --output=html --chrome-flags="--headless=new"
npx lighthouse@12 https://memequizz.duckdns.org/stats/ssg --preset=desktop --output=html --chrome-flags="--headless=new"
```
