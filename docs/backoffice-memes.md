# Backoffice des mèmes (SCRUM-96)

Permet d'ajouter, modifier et désactiver des mèmes depuis l'application, sans toucher au code ni au seed.

## Accès

- Adresse : `/admin`. Mot de passe unique dans la variable `ADMIN_PASSWORD` du `.env` (12 caractères minimum, `openssl rand -base64 24`). Sans elle, ou trop courte, l'accès reste fermé.
- Session : cookie signé (HMAC), `HttpOnly`, `SameSite=Strict`, 8 h. Changer le mot de passe invalide toutes les sessions.
- Chaque page et chaque action serveur revérifie la session ; les actions Next.js contrôlent aussi l'origine de la requête.
- Limite connue : pas de limitation des tentatives de connexion. À traiter en v0.7 avec les autres limitations ; en attendant, mot de passe long et aléatoire.

## Ajouter un mème

Formulaire : nom, image, année (facultative), origine (facultative, reformulée), auteur, licence libre, page Commons, article Wikipédia (facultatif). Règles du skill `meme-data` appliquées à l'envoi :

- licence obligatoire parmi `domaine_public`, `cc0`, `cc_by`, `cc_by_sa` ;
- auteur non vide (« Auteur inconnu » si besoin) ;
- `source_url` en https, `article_url` en https sur `wikipedia.org` ;
- slug dérivé du nom (minuscules, sans accents) et unique ; il ne change jamais ;
- image JPEG, PNG ou WebP de 8 Mo maximum, convertie en WebP, 800 px et 100 Ko maximum.

**La vérification de la licence reste manuelle** : l'application ne peut pas contrôler la page Commons. Vérifier avant d'ajouter (voir `docs/droits-images.md`).

## Désactiver

Un mème n'est jamais supprimé (des parties peuvent le référencer). Il est désactivé et disparaît du jeu et de la page Crédits. Le jeu exige au moins 4 mèmes actifs : une désactivation qui passerait sous ce seuil est refusée.

## Cohabitation avec le seed

Les mèmes créés ici portent `via_backoffice = true` : `bun run db:seed` ne les désactive pas. Les mèmes de `src/db/data/memes.ts` restent gérés par le seed.

## Images en production

- Elles sont écrites dans `public/memes/` du conteneur, montée sur le volume Docker `memes-data` (`compose.prod.yaml`) pour survivre aux redéploiements. Le volume est initialisé avec les images de l'image Docker lors de sa première création : **de nouvelles images ajoutées plus tard au dépôt n'apparaissent pas dans un volume existant**, elles se saisissent ici.
- Next ne publie que les fichiers présents au démarrage : la route `src/app/memes/[fichier]/route.ts` sert les images ajoutées ensuite.
- Une image remplacée garde le même nom : les navigateurs qui l'ont déjà en cache (service worker, `docs/strategie-cache.md`) la gardent jusqu'à changement de `VERSION` dans `public/sw.js`.
- Sauvegarde : le volume `memes-data` en plus de `db-data`.

## Crédits

`/credits` liste les mèmes actifs avec auteur, licence, mention d'adaptation et lien vers la source.
