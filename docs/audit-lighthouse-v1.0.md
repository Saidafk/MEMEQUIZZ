# Audit Lighthouse final de la v1.0 (SCRUM-87)

Mesure du 2026-11-19 sur la production (`https://memequizz.duckdns.org`), en lecture seule. Lighthouse 12.8.2, catégories performance, bonnes pratiques et SEO (l'accessibilité est auditée à part). **Une passe par page et par profil** : mobile (4G lente simulée, CPU ×4) et ordinateur (`--preset=desktop`). Point de comparaison : [audit-lighthouse.md](audit-lighthouse.md) (v0.5, SCRUM-57).

## Scores

| Page          | Perf mobile | LCP mobile | CLS   | TBT mobile | Perf ordinateur | LCP ordinateur | TBT ordinateur | Bonnes pratiques | SEO | v0.5 (mobile / ordinateur) |
| ------------- | ----------- | ---------- | ----- | ---------- | --------------- | -------------- | -------------- | ---------------- | --- | -------------------------- |
| `/`           | 70          | 4,4 s      | 0,002 | 590 ms     | 99              | 0,90 s         | 59 ms          | 96               | 100 | non mesurée                |
| `/jeu`        | 74          | 4,5 s      | 0,002 | 416 ms     | 99              | 0,91 s         | 59 ms          | 96               | 100 | non mesurée                |
| `/salle`      | 76          | 4,4 s      | 0     | 366 ms     | 99              | 0,84 s         | 21 ms          | 96               | 100 | non mesurée (page v0.9)    |
| `/classement` | 80          | 4,0 s      | 0,031 | 310 ms     | 100             | 0,75 s         | 0 ms           | 100              | 100 | non mesurée                |
| `/meme/doge`  | 85          | 4,0 s      | 0     | 159 ms     | 100             | 0,81 s         | 12 ms          | 100              | 100 | 86 / 99                    |
| `/stats/ssg`  | 86          | 3,7 s      | 0     | 195 ms     | 100             | 0,71 s         | 0 ms           | 100              | 100 | 88 / 100                   |

CLS : valeur mobile (ordinateur : 0,033 au plus, sur `/meme/doge`). TTFB entre 32 et 68 ms partout.

`/jeu` répond 307 vers `/` : sa ligne mesure en fait l'accueil (seconde passe sur la même page).

Bruit : une 2e passe mobile donne 78 pour `/` (TBT 298 ms) et 79 pour `/jeu` (TBT 261 ms). Les scores mobiles de ces pages varient donc de 5 à 8 points d'une passe à l'autre, surtout à cause du TBT.

## Écarts expliqués

- **Pages déjà mesurées en v0.5 : pas de régression.** `/stats/ssg` (88 → 86) et `/meme/doge` (86 → 85) restent dans le bruit d'une passe ; en ordinateur, 99-100 comme avant. Polices : toujours 4 fichiers (64 Ko), aucun `<link rel="preload" as="font">` dans le HTML servi. CSS bloquant : 2 fichiers, 20 Ko.
- **Les pages ajoutées depuis (`/`, `/jeu`, `/salle`, `/classement`) ont un score mobile plus bas (70-80) à cause du JavaScript** (mesuré) : de 575 à 618 Ko décompressés, contre 457 Ko pour `/stats/ssg`. Le TBT monte à 310-590 ms. L'élément LCP est du texte (`h1` ou `p`), pas une image.
- **Cause probable sur `/` et `/jeu`** (interprétation, à confirmer) : `FormulairePartie.tsx`, un composant client, importe `pseudoSchema` depuis `src/lib/validation.ts`, ce qui charge **zod dans le navigateur**. On le voit dans un chunk de 107 Ko décompressés, présent sur ces deux pages seulement. `/jeu/Partie.tsx` importe aussi une constante de ce même module.
- **Le LCP mobile (~4 s) vient en grande partie de la simulation** : dans la trace réellement observée, le LCP arrive entre 0,4 et 0,8 s. Une passe `--throttling-method=devtools` sur `/` donne LCP = FCP = 3,1 s : le texte s'affiche dès le premier rendu, mais la simulation compte comme bloquant le JavaScript qui s'exécute avant.
- **Bonnes pratiques à 96 sur `/`, `/jeu` et `/salle`** : un seul audit échoue, `inspector-issues`, avec un problème de type « Content security policy » signalé par Chrome. La console ne montre aucune erreur, et le rapport n'indique pas la ressource en cause. Ce sont les trois pages qui ont un formulaire : c'est la piste à vérifier dans les DevTools (onglet Issues).
- **INP non mesuré** : Lighthouse ne le mesure pas sur un chargement, le TBT en est l'indicateur.

## Objectifs

| Objectif                                   | Résultat                                                                                                                                                 |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Performance ≥ 90 en ordinateur             | **Atteint** : 99-100 sur les 6 pages.                                                                                                                    |
| SEO 100                                    | **Atteint** sur les 6 pages.                                                                                                                             |
| Bonnes pratiques 100                       | **Écart** : 96 sur 3 pages (`inspector-issues`, CSP), cause à identifier.                                                                                |
| Performance ≥ 90 en mobile                 | **Non atteint**, comme en v0.5 (86-92) : 70-86. Le frein est le JavaScript du framework et des composants client, pas les polices, les images ou le CSS. |
| Pas de régression sur les pages de la v0.5 | **Atteint** : écarts de 1 à 2 points, dans le bruit.                                                                                                     |

Prochaine action utile : ne plus charger zod côté client sur `/` et `/jeu` (déplacer les constantes et la validation du pseudo dans un module sans zod), puis remesurer ces deux pages avec la médiane de 3 passes.

## Rapports

La page la moins bonne en mobile, dans [audit-lighthouse/](audit-lighthouse/) : `v1.0-accueil-mobile.html` (`/`, qui couvre aussi `/jeu`). Les autres rapports bruts n'ont pas été versionnés.

```
npx -y lighthouse@12 https://memequizz.duckdns.org/<page> --only-categories=performance,best-practices,seo --output=html --chrome-flags="--headless=new"
npx -y lighthouse@12 https://memequizz.duckdns.org/<page> --preset=desktop --only-categories=performance,best-practices,seo --output=html --chrome-flags="--headless=new"
```
