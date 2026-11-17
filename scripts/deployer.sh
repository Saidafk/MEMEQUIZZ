#!/usr/bin/env bash
# Déploie MEMEQUIZZ sur le VPS : met le code à jour, reconstruit l'image, attend que l'app soit saine.
# Usage, sur le VPS :           bash scripts/deployer.sh [sha]
# Depuis GitHub Actions (SSH) : bash -s -- <sha> < scripts/deployer.sh   (voir .github/workflows/deploy.yml)
# Sans `sha`, déploie le dernier commit de origin/main.
#
# Variables : MEMEQUIZZ_DIR (dossier du dépôt, défaut ~/memequizz), MIGRATIONS_OK=1 (voir plus bas).
set -euo pipefail

DOSSIER="${MEMEQUIZZ_DIR:-$HOME/memequizz}"
CIBLE="${1:-origin/main}"
COMPOSE=(docker compose -f compose.prod.yaml)

cd "$DOSSIER"

# Le déploiement n'accepte qu'un commit hexadécimal ou origin/main : rien d'autre n'est passé à git.
if [[ "$CIBLE" != "origin/main" && ! "$CIBLE" =~ ^[0-9a-f]{7,40}$ ]]; then
  echo "Cible invalide : « $CIBLE » (attendu : origin/main ou un SHA)." >&2
  exit 2
fi

AVANT="$(git rev-parse HEAD)"
echo "==> Version actuelle : ${AVANT:0:7}"

git fetch --quiet origin main
APRES="$(git rev-parse --verify "$CIBLE^{commit}")"

# Les migrations s'appliquent à la main avec psql (le journal Drizzle du serveur est vide : ne jamais
# lancer db:migrate ici). Le code neuf attend peut-être une colonne qui n'existe pas encore : on
# s'arrête AVANT de toucher au code, le site continue de tourner avec la version précédente. La
# vérification précède la mise à jour pour qu'un nouveau lancement donne le même résultat.
if [[ "$AVANT" != "$APRES" ]] && [[ -n "$(git diff --name-only "$AVANT" "$APRES" -- drizzle)" ]]; then
  if [[ "${MIGRATIONS_OK:-}" != "1" ]]; then
    echo "!! De nouvelles migrations sont à appliquer avant le déploiement :" >&2
    git diff --name-only "$AVANT" "$APRES" -- 'drizzle/*.sql' >&2
    echo "   Applique-les avec psql (docs/deploiement-vps.md), puis relance avec MIGRATIONS_OK=1." >&2
    echo "   Rien n'a été modifié sur le serveur." >&2
    exit 3
  fi
  echo "==> Nouvelles migrations signalées comme appliquées (MIGRATIONS_OK=1)."
fi

# --ff-only : jamais de fusion ni d'écrasement sur le serveur. Un historique qui diverge fait échouer le déploiement.
git switch --quiet main
git merge --ff-only --quiet "$APRES"
echo "==> Version à déployer : ${APRES:0:7}"

echo "==> Reconstruction et redémarrage"
"${COMPOSE[@]}" up -d --build

echo "==> Attente de l'état « healthy » (5 minutes au plus)"
for _ in $(seq 1 60); do
  etat="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}sans-healthcheck{{end}}' memequizz-app 2>/dev/null || echo absent)"
  if [[ "$etat" == "healthy" ]]; then
    echo "==> Déployé : ${APRES:0:7} (précédent : ${AVANT:0:7})"
    # Supprime seulement les images orphelines laissées par les reconstructions, pour ne pas remplir le disque.
    docker image prune --force >/dev/null
    exit 0
  fi
  sleep 5
done

echo "!! L'application n'est pas saine après 5 minutes (état : $etat). Dernières lignes du journal :" >&2
"${COMPOSE[@]}" logs --tail 40 app >&2
echo "   Pour revenir en arrière : git switch --detach ${AVANT:0:7} && ${COMPOSE[*]} up -d --build" >&2
exit 1
