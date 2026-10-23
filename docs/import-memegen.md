# Import des modèles memegen.link (SCRUM-97)

Charge **tous** les modèles de [memegen.link](https://api.memegen.link/templates/) dans le jeu, sans filtre, pour avoir rapidement un catalogue jouable.

## Attention aux droits

Ces images sont des œuvres protégées (films, séries, photos) : leurs droits **ne sont pas vérifiés**. Elles ont donc la licence `non_verifiee`, qui n'est jamais utilisée pour déclarer une image libre. Cela fait une **exception volontaire** à la règle de `docs/droits-images.md` (licences libres uniquement), décidée par Saïd le 2026-10-23, pour un usage de développement et de test.

- Les images (`public/memes/memegen-*.webp`) et le SQL (`memegen-import.sql`) sont ignorés par git : ils ne doivent jamais être poussés dans le dépôt public.
- Pour une mise en production publique, retirer ces mèmes (les désactiver depuis `/admin`) ou vérifier leurs droits un par un.
- La page Crédits affiche « licence non vérifiée » pour chacun. Le backoffice ne permet pas de choisir cette licence : elle n'est donnée que par ce script.

## Sur ta machine

```
bun run db:migrate         # ajoute la valeur « non_verifiee » (migration 0005)
bun run import:memegen     # télécharge, convertit (WebP 800 px / 100 Ko), insère en base
```

Options : `--force` retélécharge les images déjà présentes ; `--sql-seulement` ne touche pas à la base (écrit seulement les images et `memegen-import.sql`). Rejouable : upsert sur le slug (`memegen-<id>`), un mème désactivé depuis `/admin` reste désactivé.

## Sur le VPS (sans bun)

1. Sur ta machine : `bun run import:memegen -- --sql-seulement` (ou le script complet, qui écrit aussi le SQL).
2. Copier les images dans le volume du conteneur :
   ```
   scp public/memes/memegen-*.webp <vps>:/tmp/memegen/
   # sur le VPS :
   docker cp /tmp/memegen/. memequizz-app:/app/public/memes/
   ```
3. Appliquer la migration 0005 puis le SQL :
   ```
   cd ~/memequizz && set -a; . ./.env; set +a
   docker compose -f compose.prod.yaml exec -T db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 < drizzle/0005_*.sql
   scp memegen-import.sql <vps>:~/memequizz/   # depuis ta machine
   docker compose -f compose.prod.yaml exec -T db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 < memegen-import.sql
   ```
   Les images copiées avec `docker cp` appartiennent à root mais sont lisibles par l'application, qui ne fait que les lire.

## Limites

- Les noms sont en anglais, certains sont ambigus ou très proches : le quiz peut proposer des choix difficiles à départager.
- Les modèles sont des images vierges (sans texte), parfois peu reconnaissables seules.
- 210 mèmes : la page Crédits est longue.
