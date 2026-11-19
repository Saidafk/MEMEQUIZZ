# MEMEQUIZZ v1.0.0 — notes de version

Date : novembre 2026 · Site : <https://memequizz.duckdns.org>

Quiz de mèmes : on reconnaît un mème à partir de son image, en 10 questions chronométrées, seul ou à
plusieurs dans une salle. Next.js 16 (App Router, Cache Components), React 19, TypeScript strict, Bun,
PostgreSQL et Drizzle, déployé en Docker derrière Caddy sur un VPS.

## Fonctionnalités

- **Partie solo** : 10 mèmes, 4 choix, chrono de 15 s, points selon la rapidité. Score, chrono et bonne
  réponse calculés et gardés côté serveur (anti-triche).
- **Multijoueur** : salle avec un code à 6 caractères, arrivée des joueurs et classement en direct
  (Server-Sent Events), question suivante ouverte pour tous. Une salle jamais lancée n'accepte plus d'arrivée après 1 h.
- **Classement** général (rendu serveur), **fiche de chaque mème** (générée au build), **statistiques**
  servies en CSR, SSR et SSG pour comparer les trois rendus.
- **PWA** : installable, mode entraînement hors ligne, page de secours, notification du quiz du jour.
- **Backoffice** protégé : ajouter, modifier et désactiver des mèmes, avec licence et crédits d'image.

## Qualité

- **Tests** : unitaires et d'intégration PostgreSQL (`bun test`), parcours E2E Playwright (solo et
  salle à deux), contrôles d'accessibilité axe bloquants. Seuil de couverture global en CI.
- **Accessibilité** : WCAG 2.2 AA visée ; audits Lighthouse et axe dans [audit-a11y/](audit-a11y/).
- **Performance** : police servie en local en sous-ensemble, images optimisées ; bilans dans
  [audit-lighthouse.md](audit-lighthouse.md) et [audit-lighthouse-v1.0.md](audit-lighthouse-v1.0.md).
- **Sécurité** : CSP, en-têtes de sécurité, protection CSRF, validation Zod, limitation de débit,
  plafonds de connexions SSE ; audits dans [audit-securite/](audit-securite/).

## Production

- Image Docker multi-étapes non root avec healthcheck, compose de production, Caddy partagé (HTTPS).
- CI (lint, types, tests, couverture, E2E) puis CD automatique vers le VPS après chaque merge sur `main`.
- Sauvegarde quotidienne de la base (`pg_dump`), restauration testée ; VPS durci (pare-feu,
  fail2ban, mises à jour automatiques) ; disponibilité surveillée par UptimeRobot.

## Versions

| Version | Contenu                                                                  |
| ------- | ------------------------------------------------------------------------ |
| v0.1    | Dépôt, Next.js + TypeScript strict avec Bun, CI, Docker                  |
| v0.2    | Maquette, design tokens, composants, accessibilité clavier               |
| v0.3    | Modèle de données, API de jeu, partie, classement                        |
| v0.4    | PWA, hors ligne, notifications push, backoffice                          |
| v0.5    | Rendus SSG/SSR/CSR, Web Vitals, SEO, images, Lighthouse                  |
| v0.6    | Tests E2E Playwright, axe, couverture                                    |
| v0.7    | Sécurité : CSP, XSS, CSRF, en-têtes, limitation de débit                 |
| v0.8    | Production : compose, Caddy, sauvegardes, CD, Bun vs Node                |
| v0.9    | Multijoueur : salles, temps réel SSE, E2E à deux                         |
| v1.0    | Audit final, nettoyage, expiration des salles, usage des IA, démo, notes |

Détail ticket par ticket : [feuille-de-route.md](feuille-de-route.md).

## Limites connues

- Limitation de débit et compteurs de flux SSE en mémoire : valables pour une seule instance.
- Le flux SSE relit la base chaque seconde par connexion ; une relecture partagée par salle est
  envisagée dans [temps-reel.md](temps-reel.md).
- Les mèmes importés de memegen.link ont une licence non vérifiée (signalée dans les crédits).
- Non faits : SSH par clé uniquement et utilisateur non root pour le CD (SCRUM-110), métriques
  serveur (SCRUM-106), mode solo hors ligne complet (SCRUM-95).

## Usage de l'IA

Développé avec Claude Code, chaque PR relue et testée : voir [usage-ia.md](usage-ia.md).
