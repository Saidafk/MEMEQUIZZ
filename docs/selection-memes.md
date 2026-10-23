# Sélection des mèmes (SCRUM-37)

Règles : [skill meme-data](../.claude/skills/meme-data/SKILL.md) et [droits des images](droits-images.md). La liste figée est dans [src/db/data/memes.ts](../src/db/data/memes.ts) ; elle alimente le seed (`bun run db:seed`) et l'import des images (`bun run db:images`).

Vérification faite le 2026-10-23 : licence, auteur et avertissements lus sur la page Commons de chaque fichier (API), puis image regardée.

## Mèmes retenus (10, lot de test)

| Mème                                | Fichier Commons                       | Licence        | Auteur                                                          | Remarque                                                                                                                                               |
| ----------------------------------- | ------------------------------------- | -------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Awesome Face                        | Awesome Face.svg                      | CC BY-SA 3.0   | East718 (original) ; Holly Cheng, Giro720 (version vectorielle) | SVG converti en WebP                                                                                                                                   |
| Doge                                | Doge homemade meme.jpg                | CC0            | Euterpia, d'après une photo de Roberto Vasarri                  | Photo source dans le domaine public, vérifiée                                                                                                          |
| Grumpy Cat                          | Grumpy Cat meme example.jpg           | CC BY-SA 4.0   | Gage Skidmore                                                   | Extrait d'une autre photo du même auteur                                                                                                               |
| Lolcat                              | Lolcat in folder.jpg                  | CC BY-SA 2.0   | Clancy Ratliff                                                  |                                                                                                                                                        |
| L'Ecce Homo de Borja                | Elias Garcia Martinez - Ecce Homo.jpg | Domaine public | Elías García Martínez (fresque de 1930, restaurée en 2012)      | Montre la restauration de 2012. **Risque résiduel** : droits du restaurateur                                                                           |
| Illuminati confirmed                | Illuminati triangle eye.png           | Domaine public | Gouvernement des États-Unis (sceau du billet de un dollar)      | Sceau du billet de un dollar                                                                                                                           |
| Touch grass                         | Touch Grass.jpg                       | CC BY 4.0      | MiracleMiles                                                    |                                                                                                                                                        |
| Rage comics                         | Rage comics on t-shirts, 2013.jpg     | CC0            | VarunRajendran                                                  | **Risque résiduel** : les dessins des T-shirts peuvent être protégés                                                                                   |
| Y U NO                              | LEGO "Y U NO " meme (Free to use).jpg | Domaine public | Ochre Jelly                                                     | Marqué libre par l'auteur sur Flickr. **Risque résiduel** : montage LEGO (marque et sets protégés), la licence repose sur le seul marquage de l'auteur |
| It ain't much, but it's honest work | Ohio farmer David Brandt.jpg          | Domaine public | Dianne Johnson, United States Department of Agriculture         | Photo source du mème, sans la légende                                                                                                                  |

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

## Fiches : année, origine et source (SCRUM-38)

Les textes (`origine`) sont des reformulations de l'article indiqué, rédigées le 2026-10-23. L'année n'est renseignée que si l'article la donne. `article_url` (lien « En savoir plus » à la correction) est distinct de `source_url`, qui est la page Commons de l'image.

| Mème                 | Année | Article                           | Langue | Remarque                                                                                 |
| -------------------- | ----- | --------------------------------- | ------ | ---------------------------------------------------------------------------------------- |
| Awesome Face         | —     | aucun                             | —      | Aucun article Wikipédia (FR ni EN) : origine, année et lien restent vides                |
| Doge                 | 2013  | Doge (mème)                       | FR     | année de popularité (« populaire en 2013 ») ; la photo d'origine est antérieure          |
| Grumpy Cat           | 2012  | Grumpy Cat                        | FR     | chatte née en 2012                                                                       |
| Lolcat               | —     | Lolcat                            | FR     |                                                                                          |
| L'Ecce Homo de Borja | 2012  | Ecce homo (Elías García Martínez) | FR     | restauration de 2012 ; pas de date de peinture (sources contradictoires)                 |
| Illuminati confirmed | —     | Œil de la Providence              | FR     | l'article décrit le symbole, pas le mème : la fiche le dit en toutes lettres             |
| Touch grass          | —     | Glossary of 2020s slang           | **EN** | argot de la génération Z                                                                 |
| Rage comics          | —     | Rage comic                        | FR     |                                                                                          |
| Y U NO               | —     | Rage comic                        | FR     | l'article dit que le visage est tiré du manga Gantz et associé aux rage comics (vérifié) |
| Honest work          | —     | David Brandt (farmer)             | **EN** | fermier (1946-2023) devenu mème                                                          |

Sept fiches sur dix s'appuient sur un article français, deux sur un article anglais (Touch grass et Honest work : choix de Saïd, signalé ici), une n'a aucune source (Awesome Face). `Ecce Homo` : l'année est celle de la restauration, pas de la peinture. Deux fiches reposent sur un article qui ne traite pas directement du mème (Illuminati confirmed : le symbole ; Touch grass : un glossaire d'argot).

## Réserves possibles pour la suite

Einstein « exploitable » (domaine public, AP 1931), Xzibit (CC BY-SA 3.0 de, texte à écarter), photos de Grumpy Cat de Gage Skidmore (CC BY-SA 2.0).

## Limite connue

Les mèmes iconiques sont rarement libres. Atteindre environ 40 demandera soit des illustrations originales, soit le futur backoffice (SCRUM-96) pour qu'un administrateur ajoute des images dont il maîtrise les droits.
