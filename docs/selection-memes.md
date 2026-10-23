# Sélection des mèmes (SCRUM-37)

Règles : [skill meme-data](../.claude/skills/meme-data/SKILL.md) et [droits des images](droits-images.md). La liste figée est dans [src/db/data/memes.ts](../src/db/data/memes.ts) ; elle alimente le seed (`bun run db:seed`) et l'import des images (`bun run db:images`).

Vérification faite le 2026-10-23 : licence, auteur et avertissements lus sur la page Commons de chaque fichier (API), puis image regardée.

## Mèmes retenus (10, lot de test)

| Mème                                | Fichier Commons                       | Licence        | Auteur                        | Remarque                                                                     |
| ----------------------------------- | ------------------------------------- | -------------- | ----------------------------- | ---------------------------------------------------------------------------- |
| Awesome Face                        | Awesome Face.svg                      | CC BY-SA 3.0   | East718, Holly Cheng, Giro720 | SVG converti en WebP                                                         |
| Doge                                | Doge homemade meme.jpg                | CC0            | Euterpia                      | Dérivé d'une photo du domaine public (Roberto Vasarri), vérifiée             |
| Grumpy Cat                          | Grumpy Cat meme example.jpg           | CC BY-SA 4.0   | Gage Skidmore                 | Extrait d'une autre photo du même auteur                                     |
| Lolcat                              | Lolcat in folder.jpg                  | CC BY-SA 2.0   | Clancy Ratliff                |                                                                              |
| L'Ecce Homo de Borja                | Elias Garcia Martinez - Ecce Homo.jpg | Domaine public | Elías García Martínez         | Montre la restauration de 2012. **Risque résiduel** : droits du restaurateur |
| Illuminati confirmed                | Illuminati triangle eye.png           | Domaine public | Gouvernement des États-Unis   | Sceau du billet de un dollar                                                 |
| Touch grass                         | Touch Grass.jpg                       | CC BY 4.0      | MiracleMiles                  |                                                                              |
| Rage comics                         | Rage comics on t-shirts, 2013.jpg     | CC0            | VarunRajendran                | **Risque résiduel** : les dessins des T-shirts peuvent être protégés         |
| Y U NO                              | LEGO "Y U NO " meme (Free to use).jpg | Domaine public | Ochre Jelly                   | Marqué libre par l'auteur sur Flickr                                         |
| It ain't much, but it's honest work | Ohio farmer David Brandt.jpg          | Domaine public | Dianne Johnson, USDA          | Photo source du mème, sans la légende                                        |

Les images CC BY et CC BY-SA sont des **adaptations** (réduites et converties en WebP) : la page Crédits devra citer l'auteur, la licence, le lien source et indiquer la modification.

## Rejetés, avec le motif

| Candidat                               | Motif                                                                         |
| -------------------------------------- | ----------------------------------------------------------------------------- |
| modèles memegen.link (210)             | aucune licence indiquée, images souvent protégées, pas de copie locale propre |
| Squidward Future                       | personnage protégé, licence affichée suspecte                                 |
| Morgan Freeman « true »                | licence contradictoire (domaine public affiché, catégorie CC BY 2.0 présente) |
| I hear Cheh in my oreillette           | œuvre dérivée dont la source est ambiguë, personne réelle moquée              |
| Selfie du singe (Macaca nigra)         | bandeau « Copyright claims » sur la page                                      |
| How do I exit Vim                      | le titre de la capture donne la réponse                                       |
| Trollface (masque)                     | reproduit un dessin dont l'auteur détient les droits                          |
| Nyan Cat (cosplay), planking en classe | personnes identifiables, dont des enfants ou élèves                           |
| La robe (3 fichiers)                   | simples aplats de couleur, pancarte qui nomme le mème, ou personne privée     |
| Xzibit « Yo dawg »                     | le texte de l'image contient « Yo Dawg » (donne la réponse)                   |
| Panda headgear                         | auteur inconnu, restrictions possibles                                        |
| Harlem Shake, DOOT banner              | capture avec personnes ; image trop obscure                                   |

## Réserves possibles pour la suite

Einstein « exploitable » (domaine public, AP 1931), Xzibit (CC BY-SA 3.0 de, texte à écarter), photos de Grumpy Cat de Gage Skidmore (CC BY-SA 2.0).

## Limite connue

Les mèmes iconiques sont rarement libres. Atteindre environ 40 demandera soit des illustrations originales, soit le futur backoffice (SCRUM-96) pour qu'un administrateur ajoute des images dont il maîtrise les droits.
