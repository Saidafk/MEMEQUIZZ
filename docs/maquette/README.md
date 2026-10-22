# Wireframes et maquette — MEMEQUIZZ (SCRUM-27)

Direction retenue : **« Cahier d'écolier gribouillé »** — papier ligné, encre de stylo bille bleue,
surligneur jaune, dessins au trait faits maison. Simple, drôle, et **sans aucune image ni personnage
protégé par le droit d'auteur** (illustrations originales, noms de mèmes inventés, emplacement
`[IMAGE DU MÈME]` en attendant la décision sur les images, SCRUM-34).

Exploration des directions (Claude Design) : https://claude.ai/artifact/LPnfYm7D3PuMMpi3MsedfQ

## Contenu

| Fichiers                    | Contenu                                                                       |
| --------------------------- | ----------------------------------------------------------------------------- |
| `maquette-mobile-01` à `05` | Maquette mobile (375 × 812) : accueil, question, retour, résultat, classement |
| `maquette-bureau-01` à `05` | Maquette bureau (1440 × 900), mêmes écrans                                    |
| `maquette-composants.svg`   | États du bouton de réponse, boutons, champ, chrono, score, couleurs           |

Polices : **Gaegu** (titres) et **Patrick Hand** (texte), deux Google Fonts disponibles dans Figma.

## Importer dans Figma (navigateur)

Fichier Figma : **MEMEQUIZZ — Wireframes & Maquette** (https://www.figma.com/design/pRoEuml3S0P9ihgZ3pjVCC).

Être **connecté** à son compte Figma (sinon le fichier s'ouvre en lecture seule et refuse l'import).

1. Page **2 · Maquette** : glisser-déposer les `maquette-mobile-*` puis les `maquette-bureau-*`.
2. Page **3 · Composants** : glisser-déposer `maquette-composants.svg`.
3. Ranger les écrans : tout sélectionner puis _Tidy up_ (`Ctrl + Alt + T`).

Chaque SVG devient un groupe de calques modifiables, avec des noms lisibles
(« Réponse B (focus) », « Chrono », « Bouton Jouer », « Papier ligné »…).

> Les Variables déjà présentes dans le fichier Figma correspondent à une première piste abandonnée
> (style « Kahoot ») : les remplacer par les couleurs de la planche `maquette-composants.svg`.

## Choix de design et accessibilité (WCAG 2.2)

- **Mobile d'abord** : les 4 réponses sont en bas, à portée de pouce ; le bureau passe sur deux
  colonnes (image à gauche, question et réponses à droite).
- **Couleur jamais seule** (1.4.1) : chaque réponse a une lettre ; bonne/mauvaise réponse est indiquée
  par ✓/✗, un texte et une rature, pas seulement par le vert ou le rouge.
- **Contrastes** (1.4.3) : encre bleu foncé `#1E3A8A` sur papier blanc et sur surligneur jaune ≥ 7:1.
- **Cibles tactiles** (2.5.8) : réponses de 92 px de haut en mobile, boutons principaux de 58 px.
- **Focus visible** (2.4.7) : contour orange autour de la réponse sélectionnée au clavier.
- **Chrono** lisible en chiffres et en barre hachurée ; il passe au rouge sous 5 s.
- **Clavier** : sur bureau, touches 1 à 4 pour répondre.

## À faire dans Figma

- Créer les Variables de couleur à partir de la planche des composants.
- Transformer le bouton de réponse en composant avec variantes (normal, focus, correct, faux, désactivé) — SCRUM-29.
- Relier les écrans en mode _Prototype_ pour tester le parcours.
