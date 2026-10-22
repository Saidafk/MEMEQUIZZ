# Wireframes et maquette — MEMEQUIZZ (SCRUM-27)

Fichiers SVG à importer dans Figma : fichier **MEMEQUIZZ — Wireframes & Maquette**
(https://www.figma.com/design/pRoEuml3S0P9ihgZ3pjVCC), qui contient déjà les **Variables** (design tokens).

## Contenu

| Fichier                           | Écran                                                 |
| --------------------------------- | ----------------------------------------------------- |
| `wireframe-01` à `05`             | Wireframes basse fidélité mobile (gris, structure)    |
| `maquette-01-accueil.svg`         | Accueil + saisie du pseudo                            |
| `maquette-02-question.svg`        | Question : image, chrono, 4 réponses                  |
| `maquette-03-retour.svg`          | Retour de réponse + fiche du mème                     |
| `maquette-04-resultat.svg`        | Résultat de la partie                                 |
| `maquette-05-classement.svg`      | Classement (podium + ma ligne)                        |
| `maquette-06-question-bureau.svg` | Question en version bureau (1440 px)                  |
| `maquette-07-composants.svg`      | États du bouton de réponse, boutons, chrono, couleurs |

Mobile : 375 × 812 px. Bureau : 1440 × 900 px. Police : Geist (celle du projet Next.js).

## Importer dans Figma (navigateur)

1. Ouvrir le fichier Figma, page **1 · Wireframes**.
2. Glisser-déposer les 5 fichiers `wireframe-*.svg` sur le canevas.
3. Aller sur la page **2 · Maquette** et glisser-déposer les fichiers `maquette-01` à `06`.
4. Aller sur la page **3 · Composants** et glisser-déposer `maquette-07-composants.svg`.
5. Ranger les écrans côte à côte (sélection puis _Tidy up_, raccourci `Ctrl + Alt + T`).

Chaque SVG devient un groupe de calques modifiables (formes, textes, couleurs), avec des noms
lisibles (« Réponse B (focus) », « Chrono », « Bouton Jouer »…).

## Choix de design et accessibilité (WCAG 2.2)

- **Mobile d'abord** : on joue surtout sur téléphone ; les 4 réponses sont en bas, à portée de pouce.
- **Couleur jamais seule** (1.4.1) : chaque réponse a une forme (▲ ◆ ● ■) et une lettre ; bon/faux
  est indiqué par ✓/✗ et un texte, pas seulement par le vert/rouge.
- **Contrastes** (1.4.3) : texte blanc sur le violet principal et sur les 4 couleurs de réponse ≥ 4,5:1.
- **Cibles tactiles** (2.5.8) : boutons de réponse de 88 px de haut, boutons principaux de 56 px.
- **Focus visible** (2.4.7) : contour orange de 3 px, montré sur la réponse B.
- **Chrono** lisible en chiffres et en barre ; il passe au rouge sous 5 s, avec le nombre de secondes.
- **Clavier** : sur bureau, touches 1 à 4 pour répondre.

## À faire dans Figma

- Relier les couleurs des calques aux Variables du fichier (sélection → panneau _Fill_ → icône Variables).
- Transformer le bouton de réponse en composant avec variantes (normal, focus, correct, faux, estompé) — SCRUM-29.
- Relier les écrans en mode _Prototype_ pour tester le parcours.
