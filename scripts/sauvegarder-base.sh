#!/usr/bin/env bash
# Sauvegarde la base de production (SCRUM-78) : pg_dump au format « custom » (compressé), horodaté,
# vérifié, puis rotation des anciennes sauvegardes. Planifié par cron : voir docs/sauvegarde-base.md.
# Usage, sur le VPS : bash scripts/sauvegarder-base.sh
#
# Variables (toutes facultatives) :
#   MEMEQUIZZ_DIR     dossier du dépôt                     (défaut ~/memequizz)
#   SAUVEGARDE_DIR    dossier des sauvegardes              (défaut ~/sauvegardes/memequizz)
#   SAUVEGARDE_JOURS  durée de conservation, en jours      (défaut 14)
#   COMPOSE_FICHIER   fichier compose qui contient « db »  (défaut compose.prod.yaml)
set -euo pipefail

main() {
  local dossier="${MEMEQUIZZ_DIR:-$HOME/memequizz}"
  local cible="${SAUVEGARDE_DIR:-$HOME/sauvegardes/memequizz}"
  local jours="${SAUVEGARDE_JOURS:-14}"
  local compose=(docker compose -f "${COMPOSE_FICHIER:-compose.prod.yaml}")

  if [[ ! "$jours" =~ ^[0-9]+$ ]] || ((jours < 1)); then
    echo "!! SAUVEGARDE_JOURS doit être un entier positif (reçu : « $jours »)." >&2
    return 2
  fi

  cd "$dossier"
  # Les sauvegardes contiennent toutes les données (comptes admin compris) : lisibles par leur seul propriétaire.
  umask 077
  mkdir -p "$cible"

  local fichier partiel
  fichier="$cible/memequizz-$(date -u +%Y%m%d-%H%M%S).dump"
  partiel="$fichier.partiel"

  # pg_dump tourne DANS le conteneur db : utilisateur et base viennent de son environnement, aucun mot
  # de passe ne passe sur la ligne de commande. Lecture seule : la base n'est pas modifiée.
  # --no-owner : la sauvegarde se restaure aussi avec un autre utilisateur (test de restauration).
  echo "==> pg_dump vers $fichier"
  if ! "${compose[@]}" exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc --no-owner' >"$partiel"; then
    rm -f -- "$partiel"
    echo "!! pg_dump a échoué : aucune sauvegarde écrite, les anciennes sont conservées." >&2
    return 1
  fi

  # Une archive tronquée ne se lit pas : pg_restore --list le détecte sans rien restaurer.
  if ! "${compose[@]}" exec -T db pg_restore --list <"$partiel" >/dev/null; then
    rm -f -- "$partiel"
    echo "!! L'archive produite est illisible : supprimée, les anciennes sont conservées." >&2
    return 1
  fi
  mv -- "$partiel" "$fichier"

  # Rotation seulement après une sauvegarde réussie : une panne prolongée ne vide jamais le dossier.
  find "$cible" -maxdepth 1 -type f -name 'memequizz-*.dump' -mtime "+$jours" -print -delete |
    sed 's/^/==> Ancienne sauvegarde supprimée : /'

  echo "==> Sauvegarde terminée : $fichier ($(du -h "$fichier" | cut -f1))"
}

main "$@"
