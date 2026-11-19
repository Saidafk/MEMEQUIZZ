#!/usr/bin/env bash
# Teste qu'une sauvegarde se restaure (SCRUM-78), SANS toucher à la base de production : l'archive est
# restaurée dans un PostgreSQL jetable (conteneur sans réseau, supprimé à la fin), puis le nombre de
# lignes de chaque table est affiché pour comparaison avec la prod.
# Usage, sur le VPS : bash scripts/tester-restauration.sh [fichier.dump]
# Sans argument : la sauvegarde la plus récente de SAUVEGARDE_DIR (défaut ~/sauvegardes/memequizz).
set -euo pipefail

readonly CONTENEUR="memequizz-test-restauration"
readonly IMAGE="postgres:17-alpine" # même version majeure que la prod (compose.prod.yaml)

nettoyer() { docker rm -f "$CONTENEUR" >/dev/null 2>&1 || true; }

main() {
  local archive="${1:-}"
  if [[ -z "$archive" ]]; then
    archive="$(ls -1t "${SAUVEGARDE_DIR:-$HOME/sauvegardes/memequizz}"/memequizz-*.dump 2>/dev/null | head -n 1 || true)"
  fi
  if [[ -z "$archive" || ! -f "$archive" ]]; then
    echo "!! Aucune sauvegarde trouvée (argument ou SAUVEGARDE_DIR)." >&2
    return 2
  fi
  echo "==> Archive testée : $archive"

  nettoyer
  trap nettoyer EXIT
  # --network none : le conteneur jetable ne peut joindre ni la prod ni Internet.
  docker run -d --rm --name "$CONTENEUR" --network none \
    -e POSTGRES_PASSWORD=test-restauration -e POSTGRES_DB=restauration "$IMAGE" >/dev/null

  echo "==> Attente du PostgreSQL jetable"
  local pret=0
  for _ in $(seq 1 30); do
    # -h 127.0.0.1 : on attend le vrai serveur, pas celui, temporaire, de l'initialisation.
    if docker exec "$CONTENEUR" pg_isready -q -h 127.0.0.1 -U postgres -d restauration; then
      pret=1
      break
    fi
    sleep 1
  done
  if ((pret == 0)); then
    echo "!! Le PostgreSQL jetable n'a pas démarré." >&2
    return 1
  fi

  echo "==> Restauration"
  docker exec -i "$CONTENEUR" pg_restore -U postgres -d restauration --no-owner --exit-on-error <"$archive"

  echo "==> Lignes par table dans la copie restaurée"
  docker exec "$CONTENEUR" psql -U postgres -d restauration -v ON_ERROR_STOP=1 -c "
    SELECT table_name AS table,
           (xpath('/row/n/text()', query_to_xml(format('SELECT count(*) AS n FROM %I.%I', table_schema, table_name), false, true, '')))[1]::text::bigint AS lignes
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name;"

  echo "==> Restauration réussie. Le conteneur jetable va être supprimé."
}

main "$@"
