# Écarts maquette ↔ intégration (SCRUM-30)

Méthode : chaque route est capturée dans Edge (mobile : cadre de 375 px ; bureau : 1440 × 900) puis
comparée au SVG correspondant de ce dossier. Depuis SCRUM-43, l'accueil, le jeu et le résultat utilisent l'API ;
seul le classement reste sur des données fictives (`src/lib/donnees-demo.ts`, SCRUM-44).

| Écran             | Route                             | Maquettes                                  |
| ----------------- | --------------------------------- | ------------------------------------------ |
| Accueil           | `/`                               | `maquette-mobile-01`, `maquette-bureau-01` |
| Question          | `/jeu/[partieId]`                 | `maquette-mobile-02`, `maquette-bureau-02` |
| Retour de réponse | `/jeu/[partieId]` (après réponse) | `maquette-mobile-03`, `maquette-bureau-03` |
| Résultat          | `/resultat/[partieId]`            | `maquette-mobile-04`, `maquette-bureau-04` |
| Classement        | `/classement`                     | `maquette-mobile-05`, `maquette-bureau-05` |

## Écarts relevés et corrigés

| Écran      | Format | Écart constaté                                                          | Correction                                                              |
| ---------- | ------ | ----------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Question   | Bureau | « C'est quel mème ? » restait sous l'image, la maquette le met à droite | Intitulé sorti de `CarteQuestion` (`intitule={null}`), grille à 5 zones |
| Résultat   | Mobile | « Partie terminée ! » passait sur 2 lignes                              | Titre à 32 px sur mobile, 44 px sur bureau                              |
| Résultat   | Mobile | Les 10 pastilles ✓/✗ débordaient sur une 2ᵉ ligne                       | Pastilles de 25 px, écart de 3 px                                       |
| Classement | Mobile | Le « 3 » du podium touchait le bord de son bloc                         | Chiffre à 28 px, bloc du 3ᵉ à 56 px                                     |
| Classement | Bureau | La marge rouge suivait la colonne centrée au lieu de rester à gauche    | `Feuille` pleine largeur, contenu centré dans la colonne                |
| Résultat   | Bureau | Bloc centré dans la maquette, collé à gauche dans l'intégration         | Page en colonne étroite centrée                                         |

## Écarts assumés

- **Coins et traits « dessinés à la main »** : la maquette utilise des tracés SVG irréguliers ; l'intégration
  utilise des `border-radius` asymétriques et une ombre pleine. Rendu proche, pas identique au pixel.
- **Couronne du podium** : absente (la maquette dessine une couronne sur le 1er). Le rang est déjà écrit en
  chiffre ; à reprendre si l'on ajoute des illustrations.
- **Mini-bonhomme du résultat (bureau)** : placé en bas à droite de la page (position libre dans la maquette).
- **Textes de démonstration** : noms de mèmes, fiche (`Origine : [à compléter]`, `Source : [à définir]`) et
  classement sont fictifs jusqu'à la v0.3 et SCRUM-34.
- **Accueil** (SCRUM-43) : le champ pseudo est dans un `<form>` ; il est contrôlé avec le schéma du serveur,
  puis la partie démarre. Le bouton reste inactif tant que la page n'est pas interactive.
- **Résultat** (SCRUM-43) : `/resultat/[partieId]` lit la vraie partie en base, pour son propriétaire seulement.
- **Classement** : toujours des données de démonstration (SCRUM-44). L'onglet « Depuis toujours » est un lien vers
  la même page, conservé pour fidélité à la maquette.
- **Chrono** (SCRUM-43) : décompte calculé depuis une échéance (plus de dérive en arrière-plan) ; le temps et les
  points font foi côté serveur. À zéro, la correction est demandée une seule fois ; en cas d'échec réseau,
  bouton « Réessayer ».
- **Fiche de correction** (SCRUM-43) : nom, année et origine quand elles existent, crédits de l'image (auteur,
  licence, lien source). Le texte « description » de la maquette n'a pas d'équivalent en base avant SCRUM-38.

## Corrections après relecture (code-reviewer)

- Podium : ordre de lecture 1er, 2e, 3e dans le DOM (disposition visuelle 2-1-3 faite en CSS), rang annoncé en texte masqué.
- `/jeu` : `<h1>` masqué ajouté (h1 → h2 → h3), focus rendu à l'intitulé à la question suivante.
- Zone `role="status"` toujours montée pour annoncer le résultat de façon fiable ; « 1 seconde / 2 secondes » accordé.
- Calcul du score extrait dans `src/lib/score.ts` et couvert par `tests/unit/score.test.ts`.

## À vérifier à la main

**SCRUM-43 : le parcours branché sur l'API n'a pas été testé dans un navigateur** (seuls lint, types, tests
des API et build de production ont tourné). À jouer une fois, sur mobile (375 px) et bureau (1440 px) :

- Accueil : pseudo trop court → message d'erreur annoncé et focus sur le champ ; pseudo valide → arrivée sur la question 1.
- Question : l'image s'affiche, le chrono descend, touches A à D et clic répondent ; après la réponse, le focus
  est sur « Question suivante » et le bandeau est annoncé ; la fiche montre les crédits de l'image.
- Chrono expiré : « temps écoulé », 0 point, la correction s'affiche.
- Recharger la page en pleine partie : on reprend à la bonne question ; après la 10ᵉ, on arrive au résultat.
- Écrans à comparer aux maquettes `maquette-*-02` et `maquette-*-03` (question et retour de réponse).

Points hérités de SCRUM-30 :

- **Retour de réponse** (`maquette-*-03`) : l'état s'obtient en jouant (clic ou touche A à D), il n'a pas
  été capturé automatiquement. Parcours à tester : répondre juste, répondre faux, laisser le chrono expirer,
  puis « Question suivante » jusqu'au résultat.
- Navigation au clavier : Tab sur les boutons (contour orange), touches A à D, focus sur « Question suivante ».
