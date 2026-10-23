---
name: meme-data
description: Données de mèmes MEMEQUIZZ — critères de sélection, vérification des licences d'images, format des fiches et règles de rédaction. À charger avant de choisir, ajouter ou modifier un mème (script de sélection, fiches, seed, fichiers de public/memes/).
---

# Données de mèmes — MEMEQUIZZ

Un mème n'entre dans le jeu que s'il est **reconnaissable**, **juridiquement utilisable** et **bien documenté**. La décision de droits est dans [docs/droits-images.md](../../../docs/droits-images.md) ; le schéma est dans [src/db/schema.ts](../../../src/db/schema.ts) (table `meme`) ; le seed dans [src/db/seed.ts](../../../src/db/seed.ts).

## 1. Critères de sélection (dans cet ordre)

1. **Licence libre vérifiée** : domaine public, CC0, CC BY ou CC BY-SA. Une licence floue, « usage éditorial », « fair use » ou introuvable = **rejet**, sans exception.
2. **Source documentée** : une page Wikimedia Commons ou Wikipédia FR existe pour l'image et le mème.
3. **Reconnaissable** par un public francophone large : le mème a une page Wikipédia FR ou une notoriété durable, pas une blague de quelques semaines.
4. **Nom sans ambiguïté** : un seul nom d'usage, assez différent des autres mèmes du jeu pour fabriquer 3 mauvais choix crédibles.
5. **Image lisible** : le sujet se reconnaît sans texte incrustant le nom du mème ; pas de contenu choquant, haineux, ni de personne privée identifiable.

Cible : environ 40 mèmes actifs (SCRUM-37). Mieux vaut 30 mèmes sûrs que 40 dont 5 douteux.

## 2. Vérifier la licence d'une image

Pour chaque image, sur sa page Wikimedia Commons :

- relever la **licence** exacte (modèle `{{PD-…}}`, `CC0`, `CC BY x.y`, `CC BY-SA x.y`) et la mapper sur l'enum `licence` : `domaine_public`, `cc0`, `cc_by`, `cc_by_sa` ;
- relever l'**auteur** tel qu'affiché (obligatoire pour CC BY et CC BY-SA) ; la colonne est `NOT NULL` : pour une image du domaine public dont l'auteur est inconnu, saisir « Auteur inconnu » ;
- copier l'URL **de la page du fichier** (pas du fichier brut) dans `source_url` ;
- refuser si la page porte un bandeau de suppression ou de doute sur la licence ;
- refuser si la page indique un élément protégé (film, personnage, texte, œuvre d'un tiers), même si le fichier affiche une licence libre : seule compte la licence de l'image elle-même, pas la célébrité du mème.

Pour une **page Wikipédia FR** (texte de `origine`), la source se cite via `source_url` ou dans la PR ; ses images se vérifient quand même sur leur page Commons.

Ne jamais déduire une licence de « ça circule partout sur Internet » ni la compléter de mémoire. En cas de doute : rejet et note dans la PR.

## 3. Format d'une fiche

Chaque fiche remplit les colonnes de `meme` :

| Champ           | Règle                                                                                                              |
| --------------- | ------------------------------------------------------------------------------------------------------------------ |
| `slug`          | minuscules, sans accents, tirets, unique, 80 caractères max (`gars-qui-hesite`) ; ne change jamais une fois publié |
| `nom`           | nom d'usage en français, tel qu'affiché comme bonne réponse (120 caractères max)                                   |
| `annee_origine` | entier, ou vide si inconnu ; jamais une estimation non sourcée                                                     |
| `origine`       | 1 à 2 phrases (500 caractères max) : d'où vient le mème, **reformulées** depuis Wikipédia FR                       |
| `source_url`    | page Commons du fichier (voir §2), 500 caractères max                                                              |
| `image_chemin`  | `/memes/<slug>.webp`, 200 caractères max                                                                           |
| `auteur`        | auteur de l'image, 200 caractères max, jamais vide (« Auteur inconnu » si besoin)                                  |
| `licence`       | valeur de l'enum, jamais vide                                                                                      |
| `actif`         | `true` seulement quand tout ce qui précède est vérifié                                                             |

Rédaction de `origine` : reformuler avec ses propres mots plutôt que copier (le texte Wikipédia est en CC BY-SA ; la reformulation ne remplace pas la citation de la source, déjà affichée via `source_url`), rester factuel, sans date ni détail non confirmé par la source. Pas de spoiler : le texte ne doit pas être affiché avant la réponse (voir §5).

## 4. Fichiers image

- Format **WebP**, côté le plus long **800 px max**, **100 Ko max** (PWA et chargement rapide) ; dossier `public/memes/`, nom = `<slug>.webp`.
- L'image est une **copie locale** de l'original libre ; ne jamais hotlinker.
- Un recadrage, une réduction ou la conversion en WebP sont des **adaptations** : pour une image CC BY-SA, elle reste sous CC BY-SA et la modification doit être indiquée (mention « image recadrée / convertie » dans la page Crédits). Pas d'autre retouche.
- Le seed est rejouable (upsert sur `slug`), mais il ne met à jour aujourd'hui que `nom`, `source_url`, `image_chemin`, `auteur` et `licence`. `annee_origine`, `origine` et `actif` ne sont pas encore portés par le seed : l'étendre dans SCRUM-37/38 avant d'y mettre les vraies fiches.

## 5. Accessibilité et affichage

- Avant la réponse, le texte alternatif est **générique** (« Image d'un mème à identifier ») : un alt qui nomme le mème donnerait la bonne réponse aux lecteurs d'écran.
- Après la réponse, afficher le nom, l'origine, l'**auteur**, la **licence** et le lien `source_url`, et lister tous les mèmes sur la page « Crédits ».
- Voir aussi le skill [a11y-wcag22](../a11y-wcag22/SKILL.md).

## 6. Avant de commiter un lot de mèmes

- [ ] Chaque mème : licence libre vérifiée sur Commons, auteur, `source_url` et `origine` renseignés.
- [ ] Aucun mème sans `source_url` ni licence ; les placeholders du seed initial sont remplacés (`bun run db:reset` passe).
- [ ] Images en WebP, ≤ 100 Ko, nommées `<slug>.webp`.
- [ ] Les noms de mèmes restent distinguables entre eux (aucun doublon de `nom`).
- [ ] Les rejets et leur motif sont notés dans la PR (traçabilité de la curation).
