#!/usr/bin/env bash
# Déploie MEMEQUIZZ sur le VPS : met le code à jour, reconstruit l'image, attend que l'app soit saine.
# Usage, sur le VPS :           bash scripts/deployer.sh [sha]
# Depuis GitHub Actions (SSH) : bash -s -- <sha> < scripts/deployer.sh   (voir .github/workflows/deploy.yml)
# Sans `sha`, déploie le dernier commit de origin/main. Ne déploie que vers l'avant : un commit plus
# ancien que la version en place est refusé.
#
# Variables : MEMEQUIZZ_DIR (dossier du dépôt, défaut ~/memequizz), MIGRATIONS_OK=1 (voir plus bas).
set -euo pipefail

# Tout est dans une fonction appelée à la dernière ligne : quand le script arrive par `bash -s`, bash
# le lit sur l'entrée standard au fil de l'exécution, et une commande qui lirait stdin (git, docker)
# pourrait en avaler la suite. Ainsi bash a tout lu avant d'exécuter quoi que ce soit.
main() {
  local dossier="${MEMEQUIZZ_DIR:-$HOME/memequizz}"
  local cible="${1:-origin/main}"
  local compose=(docker compose -f compose.prod.yaml)

  cd "$dossier"

  # Le déploiement n'accepte qu'un commit hexadécimal ou origin/main : rien d'autre n'est passé à git.
  if [[ "$cible" != "origin/main" && ! "$cible" =~ ^[0-9a-f]{7,40}$ ]]; then
    echo "Cible invalide : « $cible » (attendu : origin/main ou un SHA)." >&2
    return 2
  fi

  local avant apres
  avant="$(git rev-parse HEAD)"
  echo "==> Version actuelle : ${avant:0:7}"

  git fetch --quiet origin main
  apres="$(git rev-parse --verify "$cible^{commit}")"

  # Uniquement vers l'avant : sinon `merge --ff-only` d'un ancêtre « réussit » sans rien faire, le
  # script reconstruirait le code actuel en annonçant l'ancien SHA, et le contrôle des migrations
  # comparerait deux versions à l'envers.
  if [[ "$avant" != "$apres" ]] && ! git merge-base --is-ancestor "$avant" "$apres"; then
    echo "!! ${apres:0:7} n'est pas postérieur à la version en place (${avant:0:7}) : déploiement refusé." >&2
    echo "   Pour revenir en arrière volontairement : git switch --detach ${apres:0:7} puis docker compose up -d --build." >&2
    return 4
  fi

  # Les migrations s'appliquent à la main avec psql (le journal Drizzle du serveur est vide : ne jamais
  # lancer db:migrate ici). Le code neuf attend peut-être une colonne qui n'existe pas encore : on
  # s'arrête AVANT de toucher au code, le site continue de tourner avec la version précédente. La
  # vérification précède la mise à jour pour qu'un nouveau lancement donne le même résultat.
  local migrations
  migrations="$(git diff --name-only "$avant" "$apres" -- drizzle)"
  if [[ -n "$migrations" ]]; then
    if [[ "${MIGRATIONS_OK:-}" != "1" ]]; then
      echo "!! De nouvelles migrations sont à appliquer avant le déploiement :" >&2
      echo "$migrations" >&2
      echo "   Applique-les avec psql (docs/deploiement-vps.md), puis relance avec MIGRATIONS_OK=1." >&2
      echo "   Rien n'a été modifié sur le serveur." >&2
      return 3
    fi
    echo "==> Nouvelles migrations signalées comme appliquées (MIGRATIONS_OK=1)."
  fi

  # --ff-only : jamais de fusion ni d'écrasement sur le serveur.
  git switch --quiet main
  git merge --ff-only --quiet "$apres"
  echo "==> Version à déployer : ${apres:0:7}"

  echo "==> Reconstruction et redémarrage"
  "${compose[@]}" up -d --build

  echo "==> Attente de l'état « healthy » (5 minutes au plus)"
  local etat="absent"
  for _ in $(seq 1 60); do
    etat="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}sans-healthcheck{{end}}' memequizz-app 2>/dev/null || echo absent)"
    if [[ "$etat" == "healthy" ]]; then
      echo "==> Déployé : ${apres:0:7} (précédent : ${avant:0:7})"
      # Supprime seulement les images orphelines laissées par les reconstructions, pour ne pas remplir le disque.
      docker image prune --force >/dev/null
      return 0
    fi
    sleep 5
  done

  echo "!! L'application n'est pas saine après 5 minutes (état : $etat). Dernières lignes du journal :" >&2
  "${compose[@]}" logs --tail 40 app >&2
  echo "   Pour revenir en arrière : git switch --detach ${avant:0:7} && ${compose[*]} up -d --build" >&2
  return 1
}

main "$@"
exit $?
