# Récapitulatif : CI/CD, pull requests et sécurité

Vue d'ensemble simple de ce qui est en place au 17/11/2026, pour préparer le support de l'oral
« mise en prod et monitoring ». Détails : [deploiement-vps.md](deploiement-vps.md),
[securisation-vps.md](securisation-vps.md).

## 1. Comment on travaille : du ticket à la prod

| Étape | Ce qui se passe                                                                                | Outil          |
| ----- | ---------------------------------------------------------------------------------------------- | -------------- |
| 1     | Un ticket Jira `SCRUM-<n>` passe en « En cours »                                               | Jira           |
| 2     | Une branche par ticket : `<type>/SCRUM-<n>-<slug>`, jamais de commit direct sur `main`         | Git            |
| 3     | Commits au format `<type>(<scope>): <description> (SCRUM-<n>)`                                 | Git            |
| 4     | Relecture par l'agent code-reviewer, puis ouverture de la PR (section « Utilisation de l'IA ») | Claude, GitHub |
| 5     | La CI tourne sur la PR ; le bouton « Merge » reste bloqué tant qu'elle n'est pas verte         | GitHub Actions |
| 6     | Saïd relit et merge (personne d'autre ne merge)                                                | GitHub         |
| 7     | La CI repasse sur `main`, puis le CD déploie automatiquement sur le VPS                        | GitHub Actions |
| 8     | Le ticket passe en « Terminé » avec le lien de la PR en commentaire                            | Jira           |

Exemple réel : SCRUM-107 (faille Next.js), PR #48, mergée puis déployée par le run « CD » n°8 en
3 min 46, sans aucune action manuelle.

## 2. CI : ce qui est vérifié à chaque push et chaque PR (`ci.yml`)

| Job                  | Vérifications                                                                                       |
| -------------------- | --------------------------------------------------------------------------------------------------- |
| Lint, types et tests | format, lint, types TypeScript, tests unitaires et d'intégration sur un vrai PostgreSQL, couverture |
| Seuil de couverture  | la CI échoue si la couverture globale passe sous 80 % (mesurée ≈ 95 %)                              |
| Image Docker         | construit l'image de prod, vérifie qu'elle répond sur le port 3000 et qu'elle ne tourne pas en root |
| docker compose (dev) | démarre l'environnement complet (app + base) et vérifie que les deux répondent                      |

| Protection de `main` (ruleset « protect main »)                                      |
| ------------------------------------------------------------------------------------ |
| PR obligatoire, 3 contrôles CI requis, force push et suppression de `main` interdits |

## 3. CD : comment le code arrive en production (`deploy.yml` + `scripts/deployer.sh`)

| Élément              | Fonctionnement                                                                                       |
| -------------------- | ---------------------------------------------------------------------------------------------------- |
| Déclenchement auto   | après une CI verte sur `main` (variable `DEPLOY_AUTO=true`)                                          |
| Déclenchement manuel | Actions → CD → Run workflow ; refusé si la CI du commit n'est pas verte (SCRUM-99, run n°7)          |
| Sur le VPS           | mise à jour `--ff-only`, `docker compose up -d --build`, attente de l'état `healthy`                 |
| Migrations de base   | le script s'arrête avant de toucher au code ; migration appliquée à la main avec `psql`              |
| Garde-fous           | un seul déploiement à la fois, pas de retour à un commit plus ancien, empreinte SSH du serveur fixée |
| Vérification finale  | le workflow échoue si https://memequizz.duckdns.org ne répond pas                                    |

## 4. Supervision

| Niveau               | Outil                | Ce qu'il détecte                                |
| -------------------- | -------------------- | ----------------------------------------------- |
| Dans le serveur      | `HEALTHCHECK` Docker | l'application ne répond plus dans son conteneur |
| À chaque déploiement | fin du workflow CD   | le site ne répond pas après la mise en ligne    |
| En permanence        | UptimeRobot (5 min)  | site inaccessible : alerte e-mail (testée)      |
| Côté visiteurs       | Web Vitals           | lenteurs réelles                                |

## 5. Sécurité

| Mesure                                   | État                                                         | Pourquoi                                                                                                    |
| ---------------------------------------- | ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| Pare-feu `ufw` : ports 22, 80, 443       | En place                                                     | rien d'autre n'est joignable depuis Internet                                                                |
| HTTPS automatique (Caddy, Let's Encrypt) | En place                                                     | trafic chiffré, certificats renouvelés seuls                                                                |
| Base de données sans port publié         | En place                                                     | joignable seulement par l'app, sur un réseau Docker privé                                                   |
| Conteneur de l'app sans root             | En place (vérifié en CI)                                     | limite les dégâts si l'app est compromise                                                                   |
| Clé GitHub du VPS en lecture seule       | En place                                                     | le serveur ne peut pas modifier le dépôt                                                                    |
| Secrets hors du code                     | En place                                                     | `.env` sur le serveur, secrets GitHub pour le CD                                                            |
| Clé SSH de déploiement dédiée            | En place (révoquée et remplacée après exposition, SCRUM-102) | une clé par usage, révocable seule                                                                          |
| Dépendances surveillées (`bun audit`)    | En place                                                     | Next.js mis à jour en 16.4.6 pour une faille (SCRUM-107)                                                    |
| Mises à jour de sécurité automatiques    | **Ajouté le 17/11**                                          | correctifs Debian installés sans y penser, sans redémarrage auto                                            |
| fail2ban sur SSH                         | **Ajouté le 17/11**                                          | bannit 1 h une IP après 5 échecs en 10 min ; 5 675 tentatives ratées en 24 h, 8 IP bannies dès l'activation |
| SSH par clé uniquement                   | Choisi de reporter                                           | il faut d'abord une clé sur chaque poste d'administration                                                   |
| Utilisateur non root pour le CD          | Étape suivante                                               | gain limité (groupe docker ≈ root) et risque de casser le CD                                                |
| Sauvegardes régulières (`pg_dump`)       | Étape suivante                                               | pouvoir restaurer la base après un incident                                                                 |
