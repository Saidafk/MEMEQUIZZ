# Droits des images de mèmes (SCRUM-34)

Décision prise par Saïd le 2026-10-23.

## Décision

**Copie locale, licences libres uniquement, source et licence toujours affichées.**

- Les images sont téléchargées et servies par MEMEQUIZZ (pas de hotlink vers Wikimedia).
- Seules les images sous licence libre sont retenues : domaine public, CC0, CC BY, CC BY-SA.
- Un mème dont la licence n'est pas claire n'entre pas dans le jeu de données.

## Pourquoi

- **PWA hors ligne** : une image hébergée ailleurs n'est pas fiablement mise en cache par le service worker (réponses cross-origin opaques). Une image servie par notre domaine l'est.
- **Fiabilité** : pas de dépendance à un service externe (liens cassés, limitation de débit).
- **Respect des licences** : CC BY et CC BY-SA imposent de citer l'auteur et la licence ; la copie locale n'enlève pas cette obligation.

## Ce que ça impose

- Chaque fiche mème (SCRUM-35) stocke : auteur, licence, URL de la page source (Wikimedia Commons ou Wikipédia FR).
- La source et la licence s'affichent à la correction de chaque question et sur une page « Crédits ».
- Le script de sélection (SCRUM-37) et la complétion des fiches (SCRUM-38) rejettent tout mème sans licence libre vérifiée.
- Une image retirée à la demande d'un ayant droit = suppression de la fiche et du fichier.

## À prévoir : mode solo hors ligne

Le jeu en ligne passe par le serveur (question en SCRUM-39, vérification de la réponse en SCRUM-40), donc il ne peut pas fonctionner hors ligne tel quel. Un **mode solo hors ligne** est voulu pour la PWA :

- un lot de questions embarqué (images locales mises en cache par le service worker) ;
- vérification des réponses et score calculés côté client, sans classement partagé ;
- à traiter dans un ticket dédié, après la v0.3. La copie locale des images en est la condition.
