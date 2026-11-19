# Sauvegarde et restauration de la base (SCRUM-78)

La base PostgreSQL de production vit dans le volume Docker `db-data` du VPS. Un volume protège d'un
redémarrage, pas d'une erreur (suppression, migration ratée, `docker compose down -v`) ni d'une panne
du disque. D'où une sauvegarde **planifiée** et une restauration **testée**.

| Élément       | Choix                                                                 |
| ------------- | --------------------------------------------------------------------- |
| Outil         | `pg_dump -Fc` (format « custom » compressé, restaurable par table)    |
| Fréquence     | tous les jours à 3 h 15 (heure du VPS), par `cron`                    |
| Emplacement   | `~/sauvegardes/memequizz/memequizz-AAAAMMJJ-HHMMSS.dump` (droits 600) |
| Conservation  | 14 jours (`SAUVEGARDE_JOURS`), rotation après chaque sauvegarde       |
| Vérification  | chaque archive est relue par `pg_restore --list` avant d'être gardée  |
| Test restaur. | `scripts/tester-restauration.sh` dans un PostgreSQL jetable           |

## Les scripts

- [scripts/sauvegarder-base.sh](../scripts/sauvegarder-base.sh) lance `pg_dump` **dans** le conteneur
  `db` (identifiants lus dans son environnement, aucun mot de passe sur la ligne de commande), écrit
  d'abord un fichier `.partiel`, le vérifie, puis le renomme. Une sauvegarde ratée ne remplace rien et
  la rotation n'a lieu qu'après un succès : une panne prolongée ne vide jamais le dossier.
- [scripts/tester-restauration.sh](../scripts/tester-restauration.sh) restaure une archive (la plus
  récente par défaut) dans un conteneur `postgres:17-alpine` **sans réseau**, affiche le nombre de
  lignes par table, puis supprime le conteneur. La base de production n'est jamais touchée.

Testés en local le 19/11/2026 sur la base de développement : archive de 32 Ko, restauration complète
(5 tables : `meme` 221 lignes, `partie_question` 150, `joueur` 15, `partie` 15, `abonnement_push` 0),
rotation qui ne supprime que les `memequizz-*.dump` de plus de 14 jours.

## Mise en place sur le VPS (une seule fois)

```bash
cd ~/memequizz && git pull                       # récupère les scripts (ou attendre le déploiement)
mkdir -p ~/sauvegardes/memequizz && chmod 700 ~/sauvegardes ~/sauvegardes/memequizz
bash scripts/sauvegarder-base.sh                 # première sauvegarde, à la main
bash scripts/tester-restauration.sh              # critère du ticket : restauration testée
```

Comparer les nombres de lignes affichés avec la prod :

```bash
docker compose -f compose.prod.yaml exec db sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT count(*) FROM meme;"'
```

Puis planifier la sauvegarde. Debian 13 minimal (le VPS) n'installe pas `cron` : l'ajouter d'abord.

```bash
apt install -y cron && systemctl enable --now cron
crontab -e                                       # ajouter la ligne ci-dessous, enregistrer
```

Ligne à ajouter :

```
15 3 * * * bash "$HOME/memequizz/scripts/sauvegarder-base.sh" >> "$HOME/sauvegardes/memequizz.log" 2>&1
```

Le lendemain : `tail ~/sauvegardes/memequizz.log` et `ls -lh ~/sauvegardes/memequizz/`.

Les scripts sont mis à jour par le déploiement (`git merge --ff-only`) : cron lance toujours la version
de `main`.

## Restaurer la production (en cas d'incident)

À faire seulement après un incident avéré, dans cet ordre :

```bash
cd ~/memequizz
bash scripts/sauvegarder-base.sh                          # 1. garder l'état actuel, même abîmé
bash scripts/tester-restauration.sh ~/sauvegardes/memequizz/memequizz-<date>.dump   # 2. archive saine ?
docker compose -f compose.prod.yaml stop app              # 3. plus d'écriture pendant la restauration
docker compose -f compose.prod.yaml exec -T db sh -c \
  'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists --no-owner --single-transaction --exit-on-error' \
  < ~/sauvegardes/memequizz/memequizz-<date>.dump         # 4. tout ou rien (une seule transaction)
docker compose -f compose.prod.yaml start app             # 5. relancer, puis vérifier le site
```

Une archive antérieure à une migration remet l'ancien schéma : vérifier `drizzle/` avant de relancer
une version de l'app qui attend des colonnes plus récentes.

## Limites

- **Même machine** : si le VPS est perdu, les sauvegardes aussi. Copie hors site à la main depuis le
  PC, de temps en temps : `scp root@memequizz.duckdns.org:sauvegardes/memequizz/memequizz-*.dump .`
  Piste : envoi automatique vers un stockage externe (rclone, stockage objet).
- **Images du backoffice** : le volume `memes-data` n'est pas couvert par `pg_dump`. Les mèmes de base
  sont dans l'image Docker ; seuls ceux ajoutés depuis le backoffice manqueraient. Piste :
  `docker run --rm -v memequizz_memes-data:/d:ro alpine tar -czf - -C /d . > memes.tar.gz`.
- Granularité d'un jour : on peut perdre jusqu'à 24 h de parties. Suffisant pour un quiz ; un
  archivage continu des WAL serait disproportionné ici.
