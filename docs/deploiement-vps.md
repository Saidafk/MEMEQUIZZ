# Déploiement de MEMEQUIZZ sur le VPS

Premier déploiement réalisé le 22/10/2026 (ticket SCRUM-23).
Résultat : **https://memequizz.duckdns.org** accessible depuis Internet, en HTTPS.

> L'adresse IP du VPS n'apparaît pas dans ce document : elle est notée `<IP>`.

## Architecture

```
Internet ──► Caddy (ports 80/443, HTTPS Let's Encrypt)       ~/proxy
               │  réseau Docker "proxy" (partagé entre projets)
               ▼
             memequizz-app (Next.js standalone, port 3000)     ~/memequizz
               │  réseau Docker "internal" (privé au projet)
               ▼
             db (PostgreSQL 17, volume db-data)
```

- **Caddy** est un reverse proxy partagé, installé à part dans `~/proxy`. Il obtient et renouvelle seul
  les certificats HTTPS, et redirige chaque nom de domaine vers le bon conteneur.
- **Chaque projet** a son propre dossier et son propre compose. Il rejoint le réseau `proxy`
  et ne publie aucun port : seul Caddy est exposé à Internet.
- **La base** n'est joignable que par l'app (réseau `internal`).

| Élément              | Choix                                      | Pourquoi                                                                 |
| -------------------- | ------------------------------------------ | ------------------------------------------------------------------------ |
| Système              | Debian 12 (bookworm)                       | système du VPS                                                           |
| Nom de domaine       | `memequizz.duckdns.org` (DuckDNS, gratuit) | projet école, sans budget ; HTTPS nécessaire pour la PWA                 |
| Reverse proxy        | Caddy                                      | HTTPS automatique, configuration courte ; Traefik écarté (plus complexe) |
| Accès au dépôt privé | clé de déploiement SSH en lecture seule    | le VPS ne peut que lire ce dépôt                                         |
| Pare-feu             | ufw : 22, 80 et 443 uniquement             | surface d'attaque minimale                                               |

## 1. Préparer le VPS

Connexion : `ssh root@<IP>`

```bash
# Mises à jour et outils
apt update && apt upgrade -y
apt install -y ca-certificates curl git ufw

# Docker (dépôt officiel Debian)
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/debian/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/debian $(. /etc/os-release && echo $VERSION_CODENAME) stable" > /etc/apt/sources.list.d/docker.list
apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Pare-feu : autoriser SSH AVANT d'activer
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# Vérification
docker --version
docker compose version
ufw status
```

## 2. Nom de domaine (DuckDNS)

1. Se connecter sur https://www.duckdns.org (avec GitHub).
2. Ajouter le sous-domaine `memequizz`.
3. Remplacer l'IP pré-remplie (celle du PC qui navigue) par **l'IP du VPS**, puis cliquer sur _update ip_.
4. Vérifier depuis le PC : `nslookup memequizz.duckdns.org` doit renvoyer l'IP du VPS.

## 3. Proxy Caddy partagé (`~/proxy`)

```bash
docker network create proxy
mkdir -p ~/proxy && cd ~/proxy
```

`~/proxy/compose.yaml` :

```yaml
services:
  caddy:
    image: caddy:2-alpine
    container_name: caddy
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
      - "443:443/udp"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy-data:/data
      - caddy-config:/config
    networks:
      - proxy

networks:
  proxy:
    external: true

volumes:
  caddy-data:
  caddy-config:
```

`~/proxy/Caddyfile` :

```
memequizz.duckdns.org {
	encode zstd gzip
	reverse_proxy memequizz-app:3000
}
```

```bash
docker compose up -d
docker compose logs --tail 30   # chercher "certificate obtained successfully"
```

## 4. Application (`~/memequizz`)

### Accès au dépôt privé (clé de déploiement)

```bash
ssh-keygen -t ed25519 -f ~/.ssh/memequizz_deploy -N "" -C "vps-memequizz"
cat ~/.ssh/memequizz_deploy.pub
```

Sur GitHub : _Settings → Deploy keys → Add deploy key_, titre `VPS`, coller la clé publique,
**sans** cocher _Allow write access_.

```bash
cat >> ~/.ssh/config <<'EOF'
Host github-memequizz
  HostName github.com
  User git
  IdentityFile ~/.ssh/memequizz_deploy
  IdentitiesOnly yes
EOF
ssh-keyscan github.com >> ~/.ssh/known_hosts
```

### Clone, configuration et lancement

```bash
cd ~
git clone git@github-memequizz:Saidafk/MEMEQUIZZ.git memequizz
cd memequizz

# .env de production avec un mot de passe aléatoire pour la base
cp .env.example .env
sed -i "s/^POSTGRES_PASSWORD=.*/POSTGRES_PASSWORD=$(openssl rand -hex 24)/" .env
chmod 600 .env

docker compose -f compose.prod.yaml up -d --build
docker compose -f compose.prod.yaml ps
```

Le fichier [compose.prod.yaml](../compose.prod.yaml) est versionné dans le dépôt.

> Lors du premier déploiement, le clone a été fait sur la branche `chore/SCRUM-23-deploiement-vps`
> (`git clone -b …`) avant le merge. Pour revenir sur `main` : `git switch main && git pull`.

## Vérification

- Navigateur : https://memequizz.duckdns.org affiche la page d'accueil, avec le cadenas HTTPS.
- Depuis le PC : `curl -I https://memequizz.duckdns.org` renvoie `HTTP/2 200`.
- Sur le VPS : `docker compose -f compose.prod.yaml ps` montre `memequizz-app` en `healthy`.

## Opérations courantes

| Action                                       | Commande (sur le VPS)                                                                |
| -------------------------------------------- | ------------------------------------------------------------------------------------ |
| Mettre à jour l'app                          | `cd ~/memequizz && bash scripts/deployer.sh` (voir « Déploiement automatique »)      |
| Logs de l'app                                | `cd ~/memequizz && docker compose -f compose.prod.yaml logs -f app`                  |
| Logs de Caddy                                | `cd ~/proxy && docker compose logs -f`                                               |
| Recharger Caddy après une modif du Caddyfile | `cd ~/proxy && docker compose exec caddy caddy reload --config /etc/caddy/Caddyfile` |
| Arrêter l'app                                | `cd ~/memequizz && docker compose -f compose.prod.yaml down`                         |
| État des conteneurs                          | `docker ps`                                                                          |

## Déploiement automatique (SCRUM-81)

Après un merge sur `main`, GitHub Actions déploie sur le VPS sans intervention.

```
merge sur main ─► CI (ci.yml) verte ─► deploy.yml ─► SSH ─► scripts/deployer.sh ─► site à jour
```

- **`scripts/deployer.sh`** fait le travail sur le VPS : `git fetch`, mise à jour en `--ff-only` (jamais de fusion ni d'écrasement), `docker compose -f compose.prod.yaml up -d --build`, puis attente de l'état `healthy` du conteneur (5 minutes au plus) et nettoyage des images orphelines. Il se lance aussi à la main : `cd ~/memequizz && bash scripts/deployer.sh` (un SHA en argument déploie ce commit précis). C'est le déploiement « en une commande » du ticket.
- **`.github/workflows/deploy.yml`** se déclenche quand la CI réussit sur un push de `main`. Il déploie **le commit que la CI a validé**, envoie le script de ce commit par SSH (pas la copie du serveur, qui peut être périmée), puis vérifie que https://memequizz.duckdns.org répond. Un seul déploiement à la fois.
- **Désactivé par défaut** : tant que la variable de dépôt `DEPLOY_AUTO` ne vaut pas `true`, fusionner le fichier ne déploie rien. Le lancement manuel (Actions > CD > Run workflow, **depuis la branche `main`** uniquement) marche dès que les secrets sont posés.
- **Toujours après des tests verts** : en automatique, le déploiement ne part qu'après une CI réussie. En manuel, une première étape vérifie que la CI du commit est verte et refuse sinon, avant toute connexion au VPS (SCRUM-99). Avec la protection de `main` (PR et CI verte obligatoires), rien de non testé ne peut arriver en production.
- **Seulement vers l'avant** : le script refuse un commit plus ancien que la version en place (code retour 4), pour qu'une exécution en retard ne fasse pas reculer le site.

### Migrations : le garde-fou

Les migrations s'appliquent à la main avec `psql` (le journal Drizzle du serveur est vide : ne jamais lancer `db:migrate` sur le VPS). Si le déploiement apporte un nouveau fichier `drizzle/*.sql`, le script **s'arrête avant de toucher au code** (code retour 3, rien n'est modifié, le site continue de tourner). Marche à suivre :

1. Appliquer le fichier : `docker compose -f compose.prod.yaml exec -T db psql -U <utilisateur> -d <base> < drizzle/000N_nom.sql`.
2. Relancer avec `MIGRATIONS_OK=1 bash scripts/deployer.sh`, ou dans GitHub : Run workflow en cochant « migrations déjà appliquées ».

### Mise en place (une seule fois)

Sur le VPS, créer une clé réservée au déploiement et récupérer l'empreinte du serveur :

```bash
ssh-keygen -t ed25519 -f ~/.ssh/github_actions -N "" -C "github-actions-memequizz"
cat ~/.ssh/github_actions.pub >> ~/.ssh/authorized_keys
cat ~/.ssh/github_actions          # à copier dans le secret VPS_SSH_KEY, puis :
rm ~/.ssh/github_actions           # la clé privée ne reste pas sur le serveur
echo "memequizz.duckdns.org $(cut -d' ' -f1,2 /etc/ssh/ssh_host_ed25519_key.pub)"   # valeur de VPS_HOST_KEY
cd ~/memequizz && git pull         # une fois, pour que scripts/deployer.sh existe aussi sur le serveur
```

Sur GitHub (Settings > Secrets and variables > Actions) :

| Nom            | Type     | Valeur                                                                               |
| -------------- | -------- | ------------------------------------------------------------------------------------ |
| `VPS_HOST`     | secret   | `memequizz.duckdns.org` (le nom, pas l'IP : l'empreinte est enregistrée sous ce nom) |
| `VPS_USER`     | secret   | l'utilisateur SSH (aujourd'hui `root`, voir les pistes ci-dessous)                   |
| `VPS_SSH_KEY`  | secret   | contenu complet de la clé privée, lignes `BEGIN` et `END` comprises                  |
| `VPS_HOST_KEY` | secret   | la ligne affichée par la dernière commande `echo` (empreinte du serveur)             |
| `DEPLOY_AUTO`  | variable | `true` pour activer le déploiement automatique ; absente ou autre : coupé            |

Ordre conseillé : poser les quatre secrets, lancer **à la main** un premier déploiement (Run workflow) et le vérifier, puis seulement créer `DEPLOY_AUTO`.

### Retour arrière

En cas d'échec de santé, le script affiche les dernières lignes du journal et la commande pour revenir : `git switch --detach <ancien commit> && docker compose -f compose.prod.yaml up -d --build`. Il n'y a pas de retour arrière automatique : une migration déjà appliquée ne se défait pas toute seule.

### Limites

- La clé SSH de déploiement donne accès au serveur avec l'utilisateur choisi : avec `root`, c'est large. Un utilisateur dédié avec les seuls droits Docker est préférable (voir les pistes).
- Pas de déploiement automatique des migrations, ni de notification en cas d'échec autre que l'e-mail de GitHub Actions.

## Ajouter un autre projet sur le VPS

1. Créer un sous-domaine (DuckDNS en propose 5) pointant vers l'IP du VPS.
2. Dans le compose du projet : un `container_name`, le réseau externe `proxy`, **aucun** `ports:`.
3. Ajouter un bloc au `~/proxy/Caddyfile`, puis recharger Caddy :
   ```
   autre-projet.duckdns.org {
   	reverse_proxy autre-projet-app:PORT
   }
   ```

## Pistes pour la suite

- Créer un utilisateur non-root et se connecter par clé SSH plutôt que par mot de passe root (épopée Sécurité, E7).
- Sauvegarder la base régulièrement avec `pg_dump`.
- Appliquer automatiquement les migrations au déploiement (aujourd'hui : arrêt et application à la main).
