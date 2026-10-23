---
name: a11y-wcag22
description: Accessibilité MEMEQUIZZ — checklist WCAG 2.2 niveau AA et procédure d'audit Lighthouse/axe. À charger avant de créer ou modifier une page, un composant interactif, des couleurs, ou pour auditer l'accessibilité d'une version.
---

# Accessibilité WCAG 2.2 AA — MEMEQUIZZ

Objectif : une partie jouable au clavier seul et au lecteur d'écran, avec un score Lighthouse accessibilité = 100 (base : [audit de départ](../../../docs/audit-lighthouse-depart.md)). Un score automatique ne suffit jamais : il couvre une part des critères, le reste se vérifie à la main.

## 1. Checklist à passer sur tout écran ou composant

**Structure et sémantique**

- [ ] `<html lang="fr">`, un seul `<h1>` par page, titres hiérarchisés sans saut.
- [ ] Landmarks : `<header>`, `<main>` (un seul), `<nav>`, `<footer>`.
- [ ] Éléments natifs d'abord (`button`, `a`, `label`, `ul`) ; ARIA seulement si le natif ne suffit pas.
- [ ] Un `<title>` par page, distinct et parlant.

**Clavier (2.1.1, 2.4.3, 2.4.7, 2.4.11)**

- [ ] Tout est atteignable et actionnable au clavier ; ordre de tabulation = ordre visuel.
- [ ] Focus visible sur chaque élément interactif, contraste d'au moins 3:1 (1.4.11), jamais masqué par un en-tête collant (2.4.11).
- [ ] Pas de piège au clavier ; pas de `tabindex` positif.
- [ ] Le focus ne se perd pas quand un élément disparaît ou change d'état (ex. après une réponse) : le déplacer volontairement.

**Perceptible (1.1.1, 1.4.1, 1.4.3, 1.4.4, 1.4.10)**

- [ ] Contraste texte ≥ 4,5:1 (3:1 pour le gros texte et les composants d'interface).
- [ ] Information jamais portée par la couleur seule (bonne/mauvaise réponse : icône ou texte en plus).
- [ ] Images : `alt` utile, ou `alt=""` si décorative ; les mèmes ont un texte alternatif générique avant la réponse (un alt qui nomme le mème donnerait la solution), puis descriptif après (voir le skill [meme-data](../meme-data/SKILL.md)).
- [ ] Texte agrandi à 200 % et reflow à 320 px de large sans perte ni défilement horizontal.

**Cibles et interactions (2.5.7, 2.5.8, 3.3.1, 3.3.2)**

- [ ] Cibles tactiles ≥ 24×24 px (viser 44×44 px pour les boutons de réponse : confort, AAA 2.5.5, pas une exigence AA).
- [ ] Pas d'action qui exige un geste complexe ou un glisser-déposer sans alternative (2.5.7).
- [ ] Champs avec `label` associé, erreurs décrites en texte et reliées au champ (`aria-describedby`).

**Dynamique et annonces (2.2.1, 4.1.3)**

- [ ] Changement d'état important annoncé : `aria-live="polite"` pour le résultat d'une réponse et le score ; `assertive` seulement pour une urgence réelle.
- [ ] Le chrono n'est pas annoncé à chaque seconde : annoncer les paliers (ex. 10 s, 5 s) et la fin.
- [ ] `prefers-reduced-motion` respecté pour toute animation.
- [ ] Limite de temps : prévenir, et ne pas dépendre d'un chrono sans alternative lorsque c'est possible.

## 2. Procédure d'audit automatique

Toujours sur le **build de production**, pas `next dev`.

```
bun run build
bun run start -- -p 3100
npx lighthouse@12 http://localhost:3100/<route> --only-categories=accessibility --output=html --output=json --output-path=docs/audit-a11y/<version>-<page> --chrome-flags="--headless=new"
```

Pour chaque route : `/`, `/jeu`, `/resultat/demo`, `/classement`, `/composants` (et les nouvelles).

- Lire les audits en échec dans le JSON (`audits.*.score < 1`), pas seulement le score global.
- Compléter avec axe si besoin : `npx @axe-core/cli http://localhost:3100/<route>`.
- Garder les rapports HTML dans `docs/audit-a11y/` et résumer les scores dans `docs/` (voir l'audit de départ). Le score ne doit jamais baisser d'une version à l'autre.
- Les rapports générés sont ignorés par Prettier (`.prettierignore`).

## 3. Contrôle manuel (obligatoire, Lighthouse ne le fait pas)

1. **Clavier seul** : débrancher la souris, jouer une partie complète (accueil → jeu → résultat → classement) avec Tab, Maj+Tab, Entrée, Espace.
2. **Lecteur d'écran** : NVDA (Windows, gratuit) avec Firefox ou Chrome ; vérifier que la question, les choix, le résultat et le score sont lus dans le bon ordre.
3. **Zoom 200 %** et fenêtre de 320 px.
4. **Contraste** du focus et des états (survol, désactivé, erreur).

## 4. Rendu

Dans la PR : citer les scores avant/après, les points corrigés, et ce qui a été vérifié à la main (clavier, NVDA). Si un point n'a pas pu être testé, le dire.
