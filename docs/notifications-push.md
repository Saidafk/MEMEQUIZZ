# Notifications push du quiz du jour (SCRUM-49)

## Fonctionnement

1. Le joueur clique sur « Me rappeler le quiz du jour » (accueil). Le navigateur demande la permission, puis s'abonne avec la clé VAPID publique (`GET /api/push/cle`).
2. L'abonnement (adresse du service push + clés de chiffrement) est enregistré par `POST /api/push/abonnements`, table `abonnement_push`. Aucun lien avec un joueur : pas de compte.
3. Une tâche planifiée du serveur appelle chaque jour `POST /api/push/quiz-du-jour` avec le secret d'envoi. L'application envoie la notification à chaque abonné ; un appareil désinscrit (réponse 404 ou 410) est supprimé de la base.
4. Le service worker (`public/sw.js`) affiche la notification ; un clic ouvre le site.

## Secrets

Les variables suivantes vivent dans le `.env` du serveur (jamais dans le dépôt, voir `.env.example`) :

| Variable            | Rôle                                                           |
| ------------------- | -------------------------------------------------------------- |
| `VAPID_PUBLIC_KEY`  | Clé publique, donnée au navigateur                             |
| `VAPID_PRIVATE_KEY` | Clé privée, signe les envois — **secrète**                     |
| `VAPID_SUBJECT`     | `mailto:` ou URL du site, exigé par les services push          |
| `CRON_SECRET`       | Protège `POST /api/push/quiz-du-jour` (`openssl rand -hex 32`) |

Générer les clés : `bun run vapid` (affiche les deux lignes à copier dans `.env`). Changer la clé VAPID invalide tous les abonnements existants.

## Planification quotidienne (VPS)

Exemple de crontab de l'hôte (tous les jours à 18 h) ; le conteneur `memequizz-app` écoute sur le réseau Docker `proxy`, on passe donc par l'adresse publique :

```
0 18 * * * curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" https://<domaine>/api/push/quiz-du-jour
```

La réponse indique le bilan : `{ "envoyes": n, "supprimes": n, "echecs": n }`.

## Limites

- Le contenu est le même pour tous (« le quiz du jour est prêt ») : il n'y a pas encore de quiz du jour distinct des parties normales.
- iOS ne délivre les notifications push qu'aux sites ajoutés à l'écran d'accueil.
- Pas de limitation du nombre d'abonnements par client (voir limites connues, v0.7).
