# MEMEQUIZZ — instructions pour Claude

Quiz de mèmes (Next.js + TypeScript strict + Bun, PostgreSQL/Drizzle). Voir [README.md](README.md) et [docs/](docs/).

## Workflow obligatoire

Pour toute tâche : suivre le skill [git-workflow](.claude/skills/git-workflow/SKILL.md).

- Jamais de commit direct sur `main` : branche `<type>/SCRUM-<n>-<slug>`, puis PR.
- Commits au format `<type>(<scope>): <description> (SCRUM-<n>)`.
- Ticket Jira en « En cours » au démarrage, lien de la PR en commentaire, « Terminé » après le merge.
- Saïd relit et merge toutes les PR. Ne jamais merger soi-même.
