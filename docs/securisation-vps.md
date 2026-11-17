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
conservé : uniquement le dépôt sécurité, **pas de redémarrage automatique** (le site ne coupe pas
sans qu'on le décide).

## Décision — connexion SSH par mot de passe conservée

La connexion de l'administrateur par mot de passe est **gardée pour l'instant** (choix de Saïd, 17/11).
Désactiver les mots de passe demande d'abord une clé SSH sur chaque poste d'administration ; sans
elle, on s'enferme dehors (seule la console de secours de l'hébergeur LWS permettrait de revenir).

Conséquence : SSH reste exposé aux attaques par force brute sur root. Ce qui compense en attendant :
un mot de passe root long et unique, et `fail2ban` (étape suivante) qui bannit les IP après quelques
échecs. Passer aux clés seules reste la prochaine étape recommandée.
