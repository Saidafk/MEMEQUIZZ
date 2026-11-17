# Sécurisation du VPS (SCRUM-105)

Journal des actions faites le 17/11/2026 sur le VPS (Debian 12), dans l'ordre, avec le pourquoi.
Sert aussi de support pour l'oral « mise en prod et monitoring ».

## État de départ (diagnostic)

| Point                     | Constat                                                      | Risque                                                      |
| ------------------------- | ------------------------------------------------------------ | ----------------------------------------------------------- |
| Connexion root            | `PermitRootLogin yes`                                        | root est le compte visé par tous les robots                 |
| Mot de passe SSH          | `PasswordAuthentication` absent, donc autorisé par défaut    | attaques par force brute possibles sur root depuis Internet |
| Clés autorisées pour root | une seule : `github-actions-memequizz` (le CD)               | l'administrateur se connectait par mot de passe             |
| Mises à jour              | manuelles, 20 paquets en attente dont OpenSSL                | failles connues non corrigées tant qu'on n'y pense pas      |
| Déjà en place             | ufw (22, 80, 443), HTTPS Caddy, base sans port, app non root | —                                                           |

## Étape 1 — Mises à jour de sécurité automatiques

```bash
apt update && apt install -y unattended-upgrades
dpkg-reconfigure -f noninteractive unattended-upgrades
cat /etc/apt/apt.conf.d/20auto-upgrades     # Update-Package-Lists "1" et Unattended-Upgrade "1"
systemctl is-enabled unattended-upgrades    # enabled
unattended-upgrade --dry-run                # simulation sans erreur
```

Résultat : actif. La simulation a pris le correctif OpenSSL en attente (`libssl3 3.0.22-1~deb12u2`).

Pourquoi : Debian publie les correctifs de sécurité, mais rien ne les installait. Réglage par défaut
de Debian conservé : mises à jour venant des dépôts Debian (dont le dépôt sécurité), pas du dépôt Docker,
et **pas de redémarrage automatique** (le site ne coupe pas
sans qu'on le décide).

## Décision — connexion SSH par mot de passe conservée

La connexion de l'administrateur par mot de passe est **gardée pour l'instant** (choix de Saïd, 17/11).
Désactiver les mots de passe demande d'abord une clé SSH sur chaque poste d'administration ; sans
elle, on s'enferme dehors (seule la console de secours de l'hébergeur LWS permettrait de revenir).

Conséquence : SSH reste exposé aux attaques par force brute sur root. Ce qui compense en attendant :
un mot de passe root long et unique, et `fail2ban` (étape suivante) qui bannit les IP après quelques
échecs. Passer aux clés seules reste la prochaine étape recommandée.

## Étape 2 — fail2ban sur SSH

```bash
apt install -y fail2ban python3-systemd
cat > /etc/fail2ban/jail.local <<'CONF'
[DEFAULT]
bantime  = 1h
findtime = 10m
maxretry = 5

[sshd]
enabled = true
backend = systemd
journalmatch = _SYSTEMD_UNIT=ssh.service + _COMM=sshd
CONF
systemctl enable --now fail2ban
fail2ban-client status sshd
```

Règle : **5 échecs en 10 minutes, l'IP est bannie 1 heure**.

Piège rencontré : Debian 12 n'écrit plus `/var/log/auth.log`, d'où `backend = systemd` (lecture du
journal système). Mais le filtre `sshd` de fail2ban cherche par défaut le service `sshd.service`, alors
que sur Debian il s'appelle `ssh.service` : sans la ligne `journalmatch`, fail2ban tournait sans rien
voir (0 échec détecté). Corrigé en visant `ssh.service`.

Résultat après correction :

- `Journal matches: _SYSTEMD_UNIT=ssh.service + _COMM=sshd` ;
- **8 adresses IP bannies** immédiatement ;
- **5 675 lignes d'échec SSH sur les dernières 24 heures**, soit plusieurs milliers de tentatives
  (`journalctl _SYSTEMD_UNIT=ssh.service --since "24 hours ago" | grep -cE "Failed password|Invalid user"`).
  Ce compte surestime un peu le nombre de tentatives : pour un utilisateur inexistant, sshd écrit deux
  lignes (`Invalid user` puis `Failed password for invalid user`). Pour le nombre exact de tentatives :
  `grep -c "Failed password"`.

Ce chiffre montre que les robots attaquent en permanence tout serveur exposé : il justifie fail2ban, et
plus encore le passage aux clés SSH.

## Étape 3 — Déconnexion des sessions SSH inactives (10 minutes)

```bash
cat > /etc/profile.d/deconnexion-inactivite.sh <<'CONF'
# Ferme les sessions shell interactives après 10 minutes sans activité (SCRUM-105).
TMOUT=600
readonly TMOUT
export TMOUT
CONF
chmod 644 /etc/profile.d/deconnexion-inactivite.sh
```

Vérifié dans une nouvelle session SSH : `echo "TMOUT=$TMOUT"` affiche `TMOUT=600`.

Pourquoi `TMOUT` (bash) plutôt qu'un réglage de `sshd` :

- aucun risque de s'enfermer dehors : la configuration SSH n'est pas modifiée ;
- le déploiement continu n'est pas touché : le CD lance `bash -s` sans terminal interactif, et `TMOUT` ne
  s'applique qu'aux shells interactifs ;
- `readonly` empêche de désactiver la règle dans une session (`unset TMOUT` refusé) ;
- `ClientAliveInterval` ne conviendrait pas : il coupe les connexions mortes (réseau perdu), pas les
  sessions inactives dont le poste répond toujours.

Limite : une session où un programme tourne au premier plan (par exemple `docker logs -f`) n'est pas fermée.

## Bilan au 17/11

| Mesure                                | État    |
| ------------------------------------- | ------- |
| Mises à jour de sécurité automatiques | Fait    |
| fail2ban sur SSH                      | Fait    |
| Déconnexion après 10 min d'inactivité | Fait    |
| SSH par clé uniquement                | Reporté |
| Utilisateur non root pour le CD       | Reporté |

Les deux mesures reportées demandent de préparer des clés SSH sur chaque poste et de déplacer
`~/memequizz` et `~/proxy` hors de `/root` (puis changer le secret `VPS_USER`) : à faire hors période
de démonstration, avec une session de secours ouverte.
