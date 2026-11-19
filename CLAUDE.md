# MEMEQUIZZ — instructions pour Claude

Quiz de mèmes (Next.js + TypeScript strict + Bun, PostgreSQL/Drizzle). Voir [README.md](README.md) et [docs/](docs/).

## Workflow obligatoire

Pour toute tâche : suivre le skill [git-workflow](.claude/skills/git-workflow/SKILL.md).

- Jamais de commit direct sur `main` : branche `<type>/SCRUM-<n>-<slug>`, puis PR.
- Commits au format `<type>(<scope>): <description> (SCRUM-<n>)`.
- Jira mis à jour **une fois par version**, à la fin (statuts « Terminé » et liens des PR) ; entre-temps, seule [docs/feuille-de-route.md](docs/feuille-de-route.md) est cochée au fil des merges.
- Une session Claude par version : on en ouvre une nouvelle dès qu'une version est finie.
- Saïd relit et merge toutes les PR. Ne jamais merger soi-même.

## Tests

Conventions (bun test, Playwright, axe, sécurité de la base de test) : skill [testing](.claude/skills/testing/SKILL.md). Pour lancer les tests et analyser un échec : agent [test-runner](.claude/agents/test-runner.md).

- N'écrire que des **tests utiles** : chacun vérifie une règle métier (score, chrono, anti-triche…), un cas d'erreur ou un bug déjà rencontré. Jamais de test écrit pour faire monter le pourcentage.
- La **couverture est un indicateur, pas un objectif** : 60 % est le repère minimal acceptable du projet. Une baisse se regarde (code nouveau non testé ?), mais on ne la corrige pas avec des tests sans vérification réelle.
- C'est le seuil bloquant de la CI, 80 % ([scripts/verifier-couverture.ts](scripts/verifier-couverture.ts), étape « Seuil de couverture » de [ci.yml](.github/workflows/ci.yml)), qui fait foi : un filet de sécurité, pas un chiffre à viser.

## Avant chaque PR

1. Relire soi-même le diff (`git diff main...HEAD`). L'agent [code-reviewer](.claude/agents/code-reviewer.md) n'est plus lancé systématiquement, seulement si Saïd le demande.
2. Vérifications en une seule passe groupée par ticket (lint, types, tests sur ce qui change) ; pas de build local quand la CI le fait déjà.
3. Passer la [checklist de posture critique](docs/checklist-posture-critique.md) (comprendre, relire, tester) et la résumer dans la section « Utilisation de l'IA » de la PR.
