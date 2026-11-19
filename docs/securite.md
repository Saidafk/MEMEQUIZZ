# Sécurité de l'application (v0.7)

Ce document décrit les protections côté application (SCRUM-68, 69, 70 et 72). Le serveur lui-même
(SSH, pare-feu) est traité dans [securisation-vps.md](securisation-vps.md), et les secrets dans
SCRUM-71. Pour une revue, utiliser le skill `security-checklist`. L'agent `security-auditor` en
applique la méthode.

| Menace                                        | Protection                                                                                                                  | Où                                              |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| Script injecté (XSS)                          | Pseudo en liste blanche (Zod), rendu échappé par React, `dangerouslySetInnerHTML` interdit par le lint, CSP                 | `src/lib/validation.ts`, `eslint.config.mjs`    |
| Requête forgée depuis un autre site (CSRF)    | Jeton à double soumission + vérification de l'`Origin` + cookies `SameSite=Strict` + `Content-Type: application/json` exigé | `src/proxy.ts`, `src/lib/csrf.ts`               |
| Abus de l'API                                 | Limitation de débit par IP : 300 requêtes/min, dont 60 écritures/min ; actions serveur (admin) 20/min → `429`               | `src/proxy.ts`, `src/lib/limite-debit.ts`       |
| Clickjacking, sniffing MIME, fuite du Referer | En-têtes de sécurité sur toutes les réponses                                                                                | `src/lib/entetes-securite.ts`, `next.config.ts` |

## Content Security Policy : pourquoi sans nonce

Le ticket demandait une CSP avec nonce. Next 16 n'applique un nonce que pendant un **rendu
dynamique**, et le pré-rendu partiel (Cache Components, activé ici) y est incompatible : la coque
statique est produite au build, sans requête, donc sans nonce. Garder le nonce aurait obligé à
désactiver Cache Components et à rendre toutes les pages dynamiques. `/meme/[slug]` et `/stats/ssg`
auraient perdu le SSG, la comparaison CSR/SSR/SSG de `/stats` serait devenue fausse et la
performance aurait baissé (TTFB, Lighthouse).

**Choix retenu** (validé par Saïd le 19/11/2026) : une CSP stricte sans nonce.

```
default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';
img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; worker-src 'self';
manifest-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'
```

- Le seul relâchement est `'unsafe-inline'` sur les scripts : Next insère ses données RSC dans des
  scripts inline. Le risque reste limité parce qu'aucune entrée utilisateur n'est rendue en HTML brut
  (React échappe tout, le lint interdit `dangerouslySetInnerHTML`). Même en cas de XSS, un script ne
  peut joindre aucun autre domaine (`connect-src 'self'`) ni lire les cookies de session (`HttpOnly`).
- `'unsafe-eval'` n'est ajouté qu'en développement (React s'en sert pour les piles d'erreurs).
- L'option SRI de Next (empreintes des fichiers JS) n'est pas activée : elle est expérimentale,
  seulement prise en charge par le build webpack (pas par Turbopack), et sans CDN elle apporte peu.
- Vérification : l'E2E `partie.e2e.ts` échoue si la console signale une violation de CSP pendant une
  partie complète.

## CSRF : jeton à double soumission

1. À la première page visitée, le proxy pose le cookie `memequizz_csrf` : 256 bits aléatoires,
   `SameSite=Strict`, lisible par le script de la page.
2. Les appels `fetch` mutants le recopient dans l'en-tête `x-csrf-token` (`entetesJsonCsrf()`).
3. Le proxy refuse en `403` toute requête POST/DELETE vers `/api/*` sans en-tête, ou avec un
   en-tête différent du cookie (comparaison en temps constant).

Un autre site ne peut ni lire le cookie ni poser l'en-tête. Exception : `/api/push/quiz-du-jour`,
appelée par la tâche planifiée et protégée par un secret Bearer. Les actions serveur de l'admin
sont protégées par Next (identifiant d'action et contrôle `Origin`/`Host`), et le proxy refuse en
plus toute requête mutante dont l'`Origin` n'est pas le site.

## Limitation de débit

Les requêtes mutantes hors API (actions serveur du backoffice, dont la connexion admin) sont limitées
à 20 par minute et par IP : cela freine la recherche du mot de passe par force brute.

Le compteur est en mémoire, par fenêtre fixe d'une minute et par IP (l'entrée la plus à droite de
`X-Forwarded-For`, celle ajoutée par Caddy). C'est suffisant pour une seule instance. Avec
plusieurs instances, il faudrait un stockage partagé (Redis). La table est bornée à 10 000
adresses. Une partie complète fait environ 30 requêtes, dont 11 écritures, donc les seuils laissent
jouer normalement.

Le flux temps réel des salles (SSE, SCRUM-84) garde une connexion ouverte : il est plafonné à part
(3 flux par session, 30 par IP, 300 au total, 30 minutes). Voir [temps-reel.md](temps-reel.md).

## En-têtes posés sur toutes les réponses

`Content-Security-Policy`, `Strict-Transport-Security` (1 an), `X-Content-Type-Options: nosniff`,
`X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`
(caméra, micro, géolocalisation et paiement coupés), `Cross-Origin-Opener-Policy: same-origin`.
`X-Powered-By` est supprimé.

Contrôle en production : `curl -sI https://<domaine>/ | grep -i -E "content-security|strict-transport|x-frame"`.
