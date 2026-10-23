# Écarts maquette ↔ intégration (SCRUM-30)

Méthode : chaque route est capturée dans Edge (mobile : cadre de 375 px ; bureau : 1440 × 900) puis
comparée au SVG correspondant de ce dossier. Données fictives (`src/lib/donnees-demo.ts`) en attendant l'API.

| Écran             | Route                  | Maquettes                                  |
| ----------------- | ---------------------- | ------------------------------------------ |
| Accueil           | `/`                    | `maquette-mobile-01`, `maquette-bureau-01` |
| Question          | `/jeu`                 | `maquette-mobile-02`, `maquette-bureau-02` |
| Retour de réponse | `/jeu` (après réponse) | `maquette-mobile-03`, `maquette-bureau-03` |
| Résultat          | `/resultat/[partieId]` | `maquette-mobile-04`, `maquette-bureau-04` |
| Classement        | `/classement`          | `maquette-mobile-05`, `maquette-bureau-05` |

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
- **Accueil** : le champ pseudo n'est pas encore transmis à la partie (aucune base ni session avant la v0.3).

## À vérifier à la main

- **Retour de réponse** (`maquette-*-03`) : l'état s'obtient en jouant (clic ou touche A à D), il n'a pas
  été capturé automatiquement. Parcours à tester : répondre juste, répondre faux, laisser le chrono expirer,
  puis « Question suivante » jusqu'au résultat.
- Navigation au clavier : Tab sur les boutons (contour orange), touches A à D, focus sur « Question suivante ».
