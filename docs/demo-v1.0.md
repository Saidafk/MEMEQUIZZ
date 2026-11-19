# Démo en ligne v1.0 : jeu de données propre et vérification

Site : <https://memequizz.duckdns.org>. Toutes les commandes ci-dessous se lancent **à la main sur le
VPS**, par Saïd, une par une (coller une ligne à la fois : un collage de plusieurs lignes a déjà lancé
des commandes d'un coup).

## 1. Nettoyer les données de test

Données à retirer : la partie de diagnostic « diagzz » (n° 37, SCRUM-112) et les salles, joueurs et
parties créés pendant les essais du multijoueur (v0.9).

Supprimer un `joueur` supprime en cascade ses parties, leurs questions et les salles dont il est
l'hôte (`onDelete: "cascade"` dans [schema.ts](../src/db/schema.ts)). Les mèmes ne sont pas touchés.

### 1.1 Sauvegarder

```sh
cd ~/memequizz
bash scripts/sauvegarder-base.sh
```

Continuer seulement si la dernière ligne est `==> Sauvegarde terminée : …` (aucune ligne `!!`).

### 1.2 Ouvrir psql

```sh
docker compose -f compose.prod.yaml exec db sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
```

### 1.3 Voir avant de supprimer (lecture seule)

La partie de diagnostic :

```sql
SELECT p.id_partie, j.id_joueur, j.pseudo, p.statut, p.score_total, p.id_salle, p.commence_le FROM partie p JOIN joueur j USING (id_joueur) WHERE p.id_partie = 37 OR j.pseudo ILIKE 'diag%';
```

Les salles, avec leur hôte et leur nombre de joueurs :

```sql
SELECT s.id_salle, s.code, s.statut, s.cree_le, h.pseudo AS hote, count(p.id_partie) AS joueurs FROM salle s JOIN joueur h ON h.id_joueur = s.id_hote LEFT JOIN partie p ON p.id_salle = s.id_salle GROUP BY s.id_salle, h.pseudo ORDER BY s.cree_le;
```

Les joueurs qui seront supprimés, et toutes leurs parties :

```sql
SELECT j.id_joueur, j.pseudo, j.cree_le, p.id_partie, p.id_salle, p.statut, p.score_total FROM joueur j JOIN partie p USING (id_joueur) WHERE j.id_joueur IN (SELECT id_joueur FROM partie WHERE id_salle IS NOT NULL OR id_partie = 37) ORDER BY j.id_joueur;
```

Les 30 dernières parties solo, pour repérer d'autres essais à retirer (pseudo de test, partie
abandonnée) :

```sql
SELECT p.id_partie, j.pseudo, p.statut, p.score_total, p.commence_le FROM partie p JOIN joueur j USING (id_joueur) WHERE p.id_salle IS NULL ORDER BY p.commence_le DESC LIMIT 30;
```

**Si une salle listée a été jouée par de vrais joueurs**, ne pas lancer la suppression telle quelle :
remplacer `id_salle IS NOT NULL` par `id_salle IN (<ids des salles de test>)` dans les requêtes 1.3 et
1.4. Pour ajouter d'autres parties solo de test : `OR id_partie IN (<ids>)`.

### 1.4 Supprimer, dans une transaction

```sql
BEGIN;
```

```sql
DELETE FROM joueur WHERE id_joueur IN (SELECT id_joueur FROM partie WHERE id_salle IS NOT NULL OR id_partie = 37);
```

Le nombre affiché (`DELETE n`) doit être égal au nombre de **joueurs distincts** de la troisième requête
de 1.3. Contrôle :

```sql
SELECT (SELECT count(*) FROM salle) AS salles, (SELECT count(*) FROM partie WHERE id_partie = 37) AS partie_37;
```

Attendu : `0 | 0`. Si tout est conforme :

```sql
COMMIT;
```

Sinon : `ROLLBACK;` (rien n'est modifié). Quitter psql avec `\q`.

En cas d'erreur après le `COMMIT`, restaurer la sauvegarde de l'étape 1.1 (voir
[sauvegarde-base.md](sauvegarde-base.md)).

## 2. Vérifier la démo (la veille de l'oral)

À faire dans un navigateur, sur le site en production. Critère de SCRUM-90 : démo testée la veille.

- [ ] `curl -sI https://memequizz.duckdns.org/` répond `200` avec les en-têtes de sécurité (CSP, HSTS).
- [ ] Accueil : la page s'affiche, la police et les images se chargent.
- [ ] Partie solo complète (10 questions) : images visibles, chrono, correction, résultat.
- [ ] Le score apparaît dans `/classement` (puis supprimer cette partie avec la requête 1.4 et son
      numéro si on veut un classement vierge).
- [ ] Salle à deux (ordinateur + téléphone) : code, arrivée en direct, lancement, classement final.
- [ ] `/entrainement`, `/meme/doge`, `/stats/ssg`, `/credits` s'affichent.
- [ ] Mode hors ligne : couper le réseau sur le téléphone, la page `/hors-ligne` s'affiche.
- [ ] UptimeRobot : sonde verte.
- [ ] Plan B si le réseau de la salle d'oral tombe : partage de connexion du téléphone, et captures du
      parcours prêtes dans le diaporama.
