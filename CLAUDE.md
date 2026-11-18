# MEMEQUIZZ — instructions pour Claude

Quiz de mèmes (Next.js + TypeScript strict + Bun, PostgreSQL/Drizzle). Voir [README.md](README.md) et [docs/](docs/).

## Workflow obligatoire

Pour toute tâche : suivre le skill [git-workflow](.claude/skills/git-workflow/SKILL.md).

- Jamais de commit direct sur `main` : branche `<type>/SCRUM-<n>-<slug>`, puis PR.
- Commits au format `<type>(<scope>): <description> (SCRUM-<n>)`.
- Ticket Jira en « En cours » au démarrage, lien de la PR en commentaire, « Terminé » après le merge.
- Saïd relit et merge toutes les PR. Ne jamais merger soi-même.

## Tests

- N'écrire que des **tests utiles** : chacun vérifie une règle métier (score, chrono, anti-triche…), un cas d'erreur ou un bug déjà rencontré. Jamais de test écrit pour faire monter le pourcentage.
- La **couverture est un indicateur, pas un objectif** : repère à 60 %. Une baisse se regarde (code nouveau non testé ?), mais on ne la corrige pas avec des tests sans vérification réelle.
- Le seuil bloquant de la CI reste à 80 % ([scripts/verifier-couverture.ts](scripts/verifier-couverture.ts)) : c'est un filet de sécurité, pas un chiffre à viser.

## Avant chaque PR

1. Lancer l'agent [code-reviewer](.claude/agents/code-reviewer.md) sur la branche et corriger ce qu'il remonte de bloquant.
2. Passer la [checklist de posture critique](docs/checklist-posture-critique.md) (comprendre, relire, tester) et la résumer, avec le verdict du code-reviewer, dans la section « Utilisation de l'IA » de la PR.
