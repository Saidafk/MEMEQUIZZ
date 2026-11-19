# Feuille de route — MEMEQUIZZ

État au 19/11/2026, repris du backlog Jira (projet SCRUM) après le tri du 19/11. **84 tâches faites sur 96, 12 restantes.**

Légende : `[x]` fait · `[ ]` à faire · _(en cours)_ commencé. Cocher la case quand le ticket passe en « Terminé » dans Jira.

## Version v0.1 (11/11)

- [x] SCRUM-16 — Rédiger la fiche de présentation du projet
- [x] SCRUM-17 — Créer le dépôt Git et la structure du projet
- [x] SCRUM-18 — Initialiser Next.js + TypeScript strict avec Bun
- [x] SCRUM-19 — Configurer ESLint, Prettier et vérification de types
- [x] SCRUM-20 — Mettre en place la CI (lint, types, tests)
- [x] SCRUM-21 — Dockerfile multi-stage avec sortie standalone
- [x] SCRUM-22 — docker-compose de développement (app + PostgreSQL)
- [x] SCRUM-23 — Premier déploiement de test sur le VPS
- [x] SCRUM-24 — Créer la checklist de posture critique (comprendre, relire, tester)
- [x] SCRUM-25 — Skill nextjs-bun-conventions
- [x] SCRUM-26 — Agent code-reviewer

## Version v0.2 (7/7)

- [x] SCRUM-27 — Maquette Figma des parcours (accueil, question, résultat, classement)
- [x] SCRUM-28 — Définir les design tokens (couleurs, typographie, espacements)
- [x] SCRUM-29 — Composants UI : bouton de réponse, carte question, chrono, barre de score
- [x] SCRUM-30 — Intégrer les écrans fidèlement à la maquette
- [x] SCRUM-31 — Audit Lighthouse de départ (accessibilité)
- [x] SCRUM-32 — Skill a11y-wcag22
- [x] SCRUM-33 — Accessibilité clavier et lecteurs d'écran

## Version v0.3 (13/13)

- [x] SCRUM-34 — Décider du traitement des droits des images de mèmes
- [x] SCRUM-35 — Modèle de données Drizzle : memes, games, players, scores
- [x] SCRUM-36 — Migrations PostgreSQL et jeu de données initial
- [x] SCRUM-37 — Script de sélection d'environ 40 mèmes reconnaissables
- [x] SCRUM-38 — Compléter les fiches mèmes (année, origine, source Wikipédia FR)
- [x] SCRUM-39 — API GET question : image et 4 choix sans la bonne réponse
- [x] SCRUM-40 — API POST réponse : vérification serveur et points selon la rapidité
- [x] SCRUM-41 — Validation des entrées avec Zod (pseudo, identifiants, réponses)
- [x] SCRUM-42 — Logique de partie (10 questions, score, fin de partie)
- [x] SCRUM-43 — Page de jeu (chrono 15 s, 4 réponses, retour immédiat)
- [x] SCRUM-44 — Page de classement
- [x] SCRUM-45 — Skill meme-data
- [x] SCRUM-94 — CI : exécuter les tests d'intégration sur un service PostgreSQL

## Version v0.4 (8/8)

- [x] SCRUM-46 — Manifest et icônes, application installable
- [x] SCRUM-47 — Service worker : cache des ressources et mode hors-ligne
- [x] SCRUM-48 — Mode entraînement hors-ligne avec questions mises en cache
- [x] SCRUM-49 — Notifications push du quiz du jour
- [x] SCRUM-50 — Page de secours hors-ligne
- [x] SCRUM-96 — Backoffice : ajouter et gérer les mèmes depuis l'application
- [x] SCRUM-97 — Import des modèles memegen.link (licence non vérifiée)
- [x] SCRUM-98 — Sécurité v0.4 : ne pas mettre /admin en cache, audit de sécurité et des dépendances

## Version v0.5 (4/9)

- [x] SCRUM-51 — Page fiche mème en SSG
- [x] SCRUM-52 — Page classement en SSR
- [x] SCRUM-53 — Même page de statistiques en CSR, SSR et SSG
- [x] SCRUM-54 — Mesurer les Web Vitals des trois modes et comparer
- [x] SCRUM-55 — SEO : balises meta, Open Graph, sitemap.xml, robots.txt
- [x] SCRUM-56 — Optimisation des images (next/image, tailles, chargement différé)
- [x] SCRUM-57 — Améliorer le score Lighthouse (perf, accessibilité, SEO) selon WCAG 2.2
- [x] SCRUM-58 — Agent a11y-auditor
- [x] SCRUM-59 — Agent perf-analyst

## Version v0.6 (8/8)

- [x] SCRUM-60 — Tests unitaires Vitest (score, tirage de questions, validation)
- [x] SCRUM-61 — Tests d'intégration des routes API
- [x] SCRUM-62 — Tests end-to-end Playwright : partie complète
- [x] SCRUM-63 — Tests d'accessibilité automatisés (axe)
- [x] SCRUM-64 — Rapport de couverture et seuil en CI
- [x] SCRUM-65 — Skill testing
- [x] SCRUM-66 — Agent test-runner
- [x] SCRUM-67 — Agent refactorer (refactoring assisté)

## Version v0.7 (9/9)

- [x] SCRUM-68 — Content Security Policy avec nonce
- [x] SCRUM-69 — Protection XSS (échappement, pseudos nettoyés)
- [x] SCRUM-70 — Protection CSRF sur les requêtes POST
- [x] SCRUM-71 — Gestion des secrets (pas de secret dans l'image ni le dépôt)
- [x] SCRUM-72 — En-têtes de sécurité et limitation de débit de l'API
- [x] SCRUM-73 — Audit des dépendances
- [x] SCRUM-74 — Skill security-checklist
- [x] SCRUM-75 — Agent security-auditor
- [x] SCRUM-112 — Image de question cassée en partie (régression SCRUM-56) et message si le jeton CSRF manque

## Version v0.8 (8/8)

- [x] SCRUM-76 — docker-compose de production (app + PostgreSQL + volume)
- [x] SCRUM-77 — Caddy : reverse proxy et HTTPS automatique
- [x] SCRUM-78 — Sauvegarde planifiée de la base (pg_dump)
- [x] SCRUM-79 — Image non-root avec healthcheck
- [x] SCRUM-80 — Comparer Bun et Node comme runtime final
- [x] SCRUM-81 — Automatiser le déploiement (script ou CI)
- [x] SCRUM-82 — Skill docker-deploy
- [x] SCRUM-99 — CD : renommer le workflow et vérifier la CI avant un déploiement manuel

## Version v0.9 (0/4)

- [ ] SCRUM-83 — Salles avec code : créer et rejoindre
- [ ] SCRUM-84 — Temps réel via SSE (question suivante, classement en direct)
- [ ] SCRUM-85 — Option : service Bun WebSocket séparé dans docker-compose
- [ ] SCRUM-86 — Tests end-to-end multijoueur

## Version v1.0 (1/7)

- [ ] SCRUM-87 — Audit final Lighthouse et WCAG 2.2
- [x] SCRUM-88 — README et documentation d'installation
- [x] SCRUM-89 — Support de présentation orale
- [ ] SCRUM-90 — Démo en ligne vérifiée et jeu de données propre
- [ ] SCRUM-91 — Relecture finale du code et nettoyage
- [ ] SCRUM-92 — Documenter les prompts et l'usage des IA
- [ ] SCRUM-93 — Tag v1.0.0 et notes de version

## Hors version (oral, production, suivi) (8/11)

- [ ] SCRUM-95 — PWA : mode solo hors ligne
- [x] SCRUM-100 — Bug critique : un test d'intégration peut supprimer le dossier du projet
- [x] SCRUM-102 — Révoquer la clé SSH de déploiement exposée et la remplacer
- [x] SCRUM-103 — Activer le déploiement automatique (variable DEPLOY_AUTO)
- [x] SCRUM-104 — Surveillance de disponibilité avec UptimeRobot
- [x] SCRUM-105 — Sécuriser le VPS : utilisateur non root, SSH par clé uniquement, fail2ban, mises à jour automatiques
- [ ] SCRUM-106 — Métriques du serveur (processeur, mémoire, conteneurs)
- [x] SCRUM-107 — Mettre à jour Next.js en 16.4.6 (faille modérée GHSA-mfr8-8qww-v76h)
- [x] SCRUM-108 — Mettre à jour la fiche de l'oral et préparer la présentation (20 min)
- [x] SCRUM-109 — Règle de tests dans CLAUDE.md : tests utiles uniquement, couverture comme indicateur (repère 60 %)
- [ ] SCRUM-110 — Sécuriser le VPS (suite) : SSH par clé uniquement et utilisateur non root pour le CD
- [x] SCRUM-111 — Ignorer les dossiers locaux de captures dans lint et format
