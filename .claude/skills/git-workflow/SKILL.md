---
name: git-workflow
description: Workflow d'une tâche MEMEQUIZZ de bout en bout — ticket Jira, nommage de branche, messages de commit, pull request et mise à jour du statut Jira. À utiliser dès qu'on commence, commite, pousse ou termine une tâche SCRUM-XX.
---

# Workflow Git + Jira — MEMEQUIZZ

Jira : site `saidkh26.atlassian.net`, projet `SCRUM`, cloudId `935caa43-c6fd-4e2d-8790-af719eae5c80`.
Dépôt : `https://github.com/Saidafk/MEMEQUIZZ`, branche principale `main`.

**Règle d'or : on ne commite jamais directement sur `main`.** Tout passe par une branche et une PR que Saïd relit et merge lui-même.

## 1. Démarrer une tâche

1. Lire le ticket (`getJiraIssue`) : description et critère d'acceptation.
2. Passer le ticket en « En cours » (`transitionJiraIssue`, transitionName `En cours`).
3. Partir d'un `main` à jour :
   ```
   git switch main
   git pull
   git switch -c <type>/SCRUM-<n>-<slug>
   ```

## 2. Nommage des branches

Format : `<type>/SCRUM-<n>-<slug>`

- `type` : `feat`, `fix`, `chore`, `docs`, `test`, `refactor`, `perf`, `ci`, `style`
- `slug` : 2 à 5 mots en minuscules, sans accents, séparés par des tirets

Exemples : `feat/SCRUM-43-page-de-jeu`, `chore/SCRUM-21-dockerfile-multistage`, `test/SCRUM-60-tests-unitaires-score`.

Une branche = un ticket. Si un ticket est trop gros, le découper dans Jira plutôt que mélanger.

## 3. Messages de commit (Conventional Commits)

Format : `<type>(<scope>): <description> (SCRUM-<n>)`

- `type` : mêmes valeurs que les branches
- `scope` (optionnel) : zone touchée — `api`, `ui`, `db`, `pwa`, `docker`, `tests`, `docs`, `ci`…
- `description` : en français, à l'impératif, minuscule au début, sans point final, 72 caractères max pour la ligne entière
- corps (optionnel), après une ligne vide : le **pourquoi**, pas le quoi

Exemples :

```
feat(api): ajouter la route GET question sans la bonne réponse (SCRUM-39)
fix(ui): corriger le focus clavier sur les boutons de réponse (SCRUM-33)
chore(docker): ajouter le Dockerfile multi-stage (SCRUM-21)
```

Commits petits et cohérents : un commit = un changement compréhensible seul. Jamais de secret, de `.env` ni de `node_modules`.

## 4. Avant d'ouvrir la PR

- Lint, types et tests passent : `bun run lint`, `bun run typecheck`, `bun run test`.
- Relire son propre diff (`git diff main...HEAD`) : pas de code mort, de `console.log` ou de fichier hors sujet.
- Lancer l'agent `code-reviewer` sur la branche, corriger le bloquant, et reporter son verdict dans la section « Utilisation de l'IA » de la PR.

## 5. Pull request

```
git push -u origin <branche>
gh pr create --base main --title "<type>(<scope>): <description> (SCRUM-<n>)" --body-file <fichier>
```

Titre = même format que les commits. Corps :

```markdown
## Ticket

[SCRUM-<n>](https://saidkh26.atlassian.net/browse/SCRUM-<n>) — <titre du ticket>

## Ce qui change

- …

## Comment vérifier

- …

## Utilisation de l'IA

- Ce qui a été généré ou assisté par Claude, et ce qui a été relu/testé.

## Checklist

- [ ] Critère d'acceptation du ticket rempli
- [ ] Lint, types et tests OK
- [ ] Pas de secret ni de fichier hors sujet
```

Si `gh` n'est pas disponible : pousser la branche et donner à Saïd le lien
`https://github.com/Saidafk/MEMEQUIZZ/compare/main...<branche>?expand=1` avec le titre et le corps prêts à coller.

**Ne jamais merger soi-même.** C'est Saïd qui relit et merge.

## 6. Clôturer

- Après l'ouverture de la PR : commentaire sur le ticket Jira avec le lien de la PR (`addOrEditJiraIssueComment`).
- Après le merge par Saïd : passer le ticket en « Terminé » (`transitionJiraIssue`, transitionName `Terminé`), puis `git switch main; git pull; git branch -d <branche>`.
