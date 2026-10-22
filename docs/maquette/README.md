# Maquette — MEMEQUIZZ (SCRUM-27)

Direction retenue : **« Cahier d'écolier gribouillé »** — papier ligné, encre de stylo bille bleue,
surligneur jaune, dessins au trait faits maison. Simple, drôle, et **sans aucune image reprise** :
illustrations originales, noms de mèmes génériques en français, noms de joueurs inventés, emplacement
`[IMAGE DU MÈME]` et textes de fiche `[à compléter]` en attendant la décision sur les images et les
sources (SCRUM-34).

Exploration des directions (Claude Design) : https://claude.ai/artifact/LPnfYm7D3PuMMpi3MsedfQ

## Contenu

| Fichiers                    | Contenu                                                                       |
| --------------------------- | ----------------------------------------------------------------------------- |
| `maquette-mobile-01` à `05` | Maquette mobile (375 × 812) : accueil, question, retour, résultat, classement |
| `maquette-bureau-01` à `05` | Maquette bureau (1440 × 900), mêmes écrans                                    |
| `maquette-composants.svg`   | États du bouton de réponse, boutons, champ, chrono, score, couleurs           |

Polices : **Gaegu** (titres) et **Patrick Hand** (texte), deux Google Fonts (licence OFL) disponibles dans Figma.

## Figma

Fichier Figma de la maquette : https://www.figma.com/design/SN9rEVjppmEx5MehyEHmDH (page
« Maquette — Cahier d'écolier », avec les blocs Mobile, Bureau et Composants).

Pour réimporter après une modification des SVG : être **connecté** à Figma (sinon le fichier est en
lecture seule), supprimer les anciens écrans, glisser-déposer les nouveaux SVG sur le canevas, puis
tout sélectionner et _Tidy up_ (`Ctrl + Alt + T`). Chaque SVG devient un groupe de calques modifiables,
avec des noms lisibles (« Réponse B (focus clavier) », « Chrono (normal) », « Bouton Jouer », « Papier ligné »…).

## Choix de design et accessibilité (WCAG 2.2)

- **Mobile d'abord** : les 4 réponses sont en bas, à portée de pouce ; le bureau passe sur deux
  colonnes (image à gauche, question et réponses à droite).
- **Couleur jamais seule** (1.4.1) : chaque réponse a une lettre ; bonne/mauvaise réponse est indiquée
  par ✓/✗, un texte et une rature, pas seulement par le vert ou le rouge.
- **Contrastes du texte** (1.4.3) : encre `#1E3A8A` sur papier blanc (≈ 10:1) et sur surligneur
  jaune (≈ 9:1) ; texte d'exemple du champ en `#3F5496` (≥ 4,5:1).
- **Contrastes non textuels** (1.4.11) : contour de focus orange foncé `#C2410C` (≈ 5:1 sur blanc).
- **Cibles tactiles** (2.5.8) : réponses de 92 px de haut en mobile, boutons principaux de 58 px.
- **Focus visible** (2.4.7) : contour orange autour de la réponse sélectionnée au clavier.
- **Chrono** lisible en chiffres et en barre hachurée ; il passe au rouge sous 5 s.
- **Clavier** : touches A, B, C ou D pour répondre, comme les lettres affichées.

## À faire dans Figma

- Créer les Variables de couleur à partir de la planche des composants.
- Transformer le bouton de réponse en composant avec variantes (normal, focus clavier, bonne réponse,
  mauvaise réponse, désactivé) — SCRUM-29.
- Relier les écrans en mode _Prototype_ pour tester le parcours.
