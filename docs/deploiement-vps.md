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
| Mettre à jour l'app                          | `cd ~/memequizz && git pull && docker compose -f compose.prod.yaml up -d --build`    |
| Logs de l'app                                | `cd ~/memequizz && docker compose -f compose.prod.yaml logs -f app`                  |
| Logs de Caddy                                | `cd ~/proxy && docker compose logs -f`                                               |
| Recharger Caddy après une modif du Caddyfile | `cd ~/proxy && docker compose exec caddy caddy reload --config /etc/caddy/Caddyfile` |
| Arrêter l'app                                | `cd ~/memequizz && docker compose -f compose.prod.yaml down`                         |
| État des conteneurs                          | `docker ps`                                                                          |

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
- Déployer automatiquement depuis la CI après chaque merge sur `main`.
