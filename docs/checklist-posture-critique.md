# Checklist de posture critique face au code généré par une IA

À appliquer à **tout** code, configuration ou commande produit ou assisté par une IA
(Claude ou autre), avant de le commiter. Rien n'entre dans `main` sans être passé par ces trois étapes.

Le résultat se résume dans la section « Utilisation de l'IA » de la PR : ce qui a été généré,
ce qui a été relu, ce qui a été testé.

## 1. Comprendre

- [ ] Je peux expliquer avec mes mots ce que fait chaque fichier modifié, sans relire la réponse de l'IA.
- [ ] Je sais **pourquoi** cette solution a été choisie, et quelle alternative a été écartée.
- [ ] Chaque dépendance ajoutée est connue, maintenue et réellement nécessaire (pas de paquet au nom approchant d'un paquet connu).
- [ ] Les API utilisées existent dans **nos** versions (Next.js 16, React 19, Bun 1.4) : vérifiées dans la doc officielle ou dans `node_modules/next/dist/docs/`, pas seulement « de mémoire ».
- [ ] Je saurais défendre ce code à l'oral si on m'interroge dessus.

## 2. Relire

- [ ] J'ai lu le diff complet (`git diff main...HEAD`), pas seulement le résumé de l'IA.
- [ ] Le code correspond au ticket, sans fonctionnalité en plus ni fichier hors sujet.
- [ ] Pas de code mort, de `console.log`, de `TODO` oublié ni de commentaire qui décrit l'évidence.
- [ ] Le style suit le reste du projet (nommage, structure, conventions du dossier).
- [ ] **Sécurité** :
  - [ ] aucun secret, mot de passe ou jeton dans le code ou les commits (tout passe par `.env`) ;
  - [ ] les entrées utilisateur sont validées côté serveur ;
  - [ ] le score et la bonne réponse sont calculés et gardés **côté serveur**, jamais confiés au client ;
  - [ ] pas de HTML injecté sans échappement (XSS), pas de requête SQL construite à la main.
- [ ] **Accessibilité** (pour l'UI) : navigation clavier, focus visible, textes alternatifs, contrastes (WCAG 2.2).
- [ ] Les commandes proposées (shell, SSH, Docker) ont été lues avant d'être lancées, en particulier celles qui suppriment, écrasent ou ouvrent un accès.

## 3. Tester

- [ ] `bun run lint`, `bun run typecheck` et `bun run test` passent en local.
- [ ] J'ai lancé l'application et vérifié le comportement à la main (`bun run dev` ou `docker compose up`).
- [ ] J'ai essayé au moins un cas limite ou une erreur (champ vide, mauvaise réponse, chrono écoulé, réseau coupé…).
- [ ] Quand c'est pertinent, un test automatisé couvre le comportement ajouté ou corrigé.
- [ ] La CI est verte sur la PR avant le merge.

## En cas de doute

- Demander à l'IA d'**expliquer** son code ou de citer la doc, plutôt que de le régénérer.
- Réduire la demande : une petite modification bien comprise vaut mieux qu'un gros bloc accepté en confiance.
- Si un point reste flou, ne pas merger : le noter dans la PR et le vérifier d'abord.
