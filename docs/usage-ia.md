# Usage des IA dans MEMEQUIZZ

État au 19/11/2026, à la sortie de la v1.0. Ce document résume **comment** l'IA a été utilisée sur le
projet, **ce qu'elle a produit**, **ce qui a été relu et corrigé**, et les règles qui en sont nées. Il
sert de support à la partie « IA » de l'oral.

## Outil et cadre

- **Claude Code** (Anthropic), dans VS Code, sur tout le projet : code, tests, CI/CD, documentation,
  audits. Aucune autre IA générative dans le code livré.
- **Le développeur décide, l'IA propose.** Saïd relit et merge chaque PR ; Claude ne merge jamais et
  ne lance aucune commande sur le VPS ni sur la base de production : il prépare les commandes, Saïd
  les lit et les exécute.
- **Traçabilité** : chaque PR (67 mergées) contient une section « Utilisation de l'IA » qui dit ce
  qui a été généré, relu et testé, selon la [checklist de posture critique](checklist-posture-critique.md).

## Le contexte donné à l'IA (plutôt que de longs prompts)

Les consignes durables ne sont pas répétées à chaque demande : elles vivent dans le dépôt, versionnées
et relues comme du code.

| Élément                      | Rôle                                                                                                                                |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| [CLAUDE.md](../CLAUDE.md)    | Règles du projet : workflow Git, tests utiles, vérifications avant PR.                                                              |
| 7 skills (`.claude/skills/`) | Savoir-faire chargé à la demande : conventions Next/Bun, tests, sécurité, WCAG 2.2, déploiement, données de mèmes, workflow Git.    |
| 6 agents (`.claude/agents/`) | Sous-agents spécialisés, en lecture seule sauf le refactorer : relecture, tests, accessibilité, performance, sécurité, refactoring. |
| Connecteur Jira (MCP)        | Lire les critères d'acceptation des tickets SCRUM et les clore en fin de version.                                                   |
| Mémoire de session           | Avancement, incidents et préférences repris d'une session à l'autre.                                                                |

### Forme des prompts

Un prompt de travail tient en quelques lignes, car le reste est dans le contexte ci-dessus. Il donne :

1. **le périmètre** : les tickets à faire, ce qui est déjà fait (« la v0.9 est close, rien à reprendre ») ;
2. **les points de vigilance** propres à la version (par exemple : « aucune commande sur la base de
   prod : prépare-moi les requêtes SQL exactes, SELECT d'abord puis DELETE ») ;
3. **les règles de sortie** : une PR basée sur `main`, pas de PR empilées, résumé court à la fin.

Une version entière se fait dans **une session**, ouverte par un prompt de ce type ; on en ouvre une
nouvelle à la version suivante, pour limiter la taille du contexte et la consommation de jetons.

## Ce que l'IA a produit

- **Code applicatif** : moteur de partie (score et chrono côté serveur, anti-triche), backoffice, PWA,
  notifications push, salles multijoueur en SSE, en-têtes de sécurité, CSRF, limitation de débit.
- **Tests** : unitaires et d'intégration (`bun test`), parcours E2E Playwright avec contrôles axe.
- **Outillage** : CI, CD vers le VPS, Dockerfile, compose de production, scripts de sauvegarde et de
  restauration, seuil de couverture.
- **Diagnostics** : bugs de production analysés à partir de `curl` et de l'historique Git.
- **Documentation et audits** : README, docs/, rapports Lighthouse, accessibilité et sécurité.

## Ce qui a été relu, corrigé ou refusé

Exemples concrets où la relecture a changé le résultat :

| Situation                                                                                                    | Ce qui a été fait                                                                                                                                                                      |
| ------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **CSP avec nonce** proposée (v0.7) : elle cassait le rendu statique (Cache Components / SSG).                | Compromis présenté avant le code, vérifié dans la doc de Next 16 ; Saïd a tranché pour une CSP **sans nonce**, justifiée dans [securite.md](securite.md).                              |
| **Relecture code-reviewer** du CD (SCRUM-81).                                                                | Trois défauts corrigés avant merge (script SSH mal enveloppé, refus d'un commit plus ancien, nom d'hôte).                                                                              |
| **Audit de sécurité des salles** (v0.9) : une 2ᵉ session pouvait obtenir la bonne réponse avant de répondre. | Faille trouvée par l'agent security-auditor sur du code écrit par Claude ; neutralisée avant merge (parties de salle exclues du classement général, question manquée non rattrapable). |
| **Régression d'image** en production (SCRUM-112), passée à travers les tests.                                | Trouvée par Saïd en jouant ; corrigée, et un contrôle E2E ajouté pour fermer le trou.                                                                                                  |
| **Bun ou Node en production** (v0.8) : Bun mesuré 1,8× plus rapide.                                          | Node conservé : choix humain (runtime pris en charge officiellement par Next, trafic trop faible pour que le gain serve) ; l'IA a fourni les mesures.                                  |
| **Paquets** : chaque dépendance proposée vérifiée (nom, maintenance, besoin réel).                           | 8 dépendances d'exécution seulement.                                                                                                                                                   |

## Incidents et règles qui en sont nées

| Incident                                                                                                                                               | Règle                                                                                                                                |
| ------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| 17/11 : Claude lance les tests d'intégration sans base démarrée ; un test fait `rm("")` et **efface le dossier du projet** (travail non poussé perdu). | Garde-fou `dossierTemporaireSur` (SCRUM-100) ; jamais de test d'intégration sans vérifier Docker et la base ; pousser chaque commit. |
| 19/11 : PR empilées mergées en quelques secondes : leur contenu est resté hors de `main`.                                                              | Une PR basée sur `main` par version ; vérifier `origin/main` avant de clore Jira.                                                    |
| Sessions très longues : trois relectures par agent, builds locaux répétés, Jira mis à jour à chaque étape.                                             | Workflow allégé : relecture du diff par soi-même, vérifications groupées, Jira en fin de version, une session par version.           |
| Tests écrits « pour la couverture ».                                                                                                                   | Seuls les tests utiles (règle métier, erreur, bug déjà vu) ; couverture = indicateur (repère 60 %, seuil CI 80 %).                   |

## Limites constatées

- L'IA écrit avec assurance du code qui compile mais **viole une règle métier** (anti-triche des
  salles) : seuls la relecture et un audit ciblé l'ont vu.
- Elle **ne voit pas l'application** : la régression d'image a été trouvée par un humain qui jouait.
- Elle **agit vite** : une commande destructrice lancée sans vérifier l'environnement a coûté le dossier
  du projet. D'où les garde-fous dans le code **et** dans les consignes.
- Les connaissances de l'IA sur les versions récentes (Next 16, React 19) ne suffisent pas : les API
  sont vérifiées dans `node_modules/next/dist/docs/`.

## À retenir pour l'oral

1. L'IA a écrit l'essentiel du code ; **chaque ligne est passée par une PR relue** et une CI bloquante.
2. Le contexte (CLAUDE.md, skills, agents) remplace les longs prompts et rend le travail reproductible.
3. Les décisions d'architecture et de production restent humaines (CSP, Node, merges, commandes VPS).
4. Les erreurs de l'IA ont produit des **règles écrites**, pas seulement des correctifs.
