---
name: security-checklist
description: Sécurité MEMEQUIZZ — checklist de revue (CSP, XSS, CSRF, secrets, en-têtes, limitation de débit, entrées) et commandes de vérification. À charger avant de créer ou modifier une route API, une action serveur, un formulaire, un cookie, un en-tête ou une variable d'environnement, et pour toute revue de sécurité.
---

# Checklist de sécurité — MEMEQUIZZ

L'état actuel et les choix (CSP sans nonce, jeton CSRF, seuils) sont décrits dans
[docs/securite.md](../../../docs/securite.md) : le lire avant de proposer de changer une protection.
L'agent `security-auditor` applique cette checklist aux routes API et produit un rapport.

## 1. Entrées (toute route API, toute action serveur)

- [ ] Le corps est lu avec `validerCorpsJson(requete, schema)` (`src/lib/validation-http.ts`) : JSON exigé,
      2 000 octets au plus, schéma Zod `strictObject`. Pour les paramètres d'URL, `valider(schema, params)`.
- [ ] L'erreur rendue est générique (`{ erreur: "..." }`) : jamais de message d'exception, de pile ni de SQL.
- [ ] Les requêtes SQL passent par Drizzle (paramétrées) ; aucun `sql.raw` avec une donnée du client.
- [ ] Une action serveur appelle `exigerAdmin()` en première ligne : c'est un point d'entrée public.

## 2. XSS

- [ ] Aucune donnée utilisateur rendue en HTML brut : `dangerouslySetInnerHTML` est interdit (lint `react/no-danger`).
- [ ] Les pseudos passent par `pseudoSchema` (liste blanche lettres, chiffres, `_ . -`, NFC, 3 à 20 caractères)
      côté client **et** côté serveur.
- [ ] Un lien construit à partir d'une donnée vérifie le schéma (`https://` seulement, comme `FicheMeme`).
- [ ] Test de non-régression : un pseudo piégé (`<script>`, `<img onerror>`) est refusé par le schéma
      et affiché comme du texte (`tests/unit/validation.test.ts`, `tests/unit/classement.test.ts`).

## 3. CSRF

- [ ] Tout `fetch` mutant du client utilise `headers: entetesJsonCsrf()` (`src/lib/csrf.ts`).
- [ ] Une nouvelle route POST/DELETE est couverte par le proxy (`/api/*`). Une exception (`SANS_JETON_CSRF`)
      n'est admise que pour un appel serveur à serveur protégé par un secret.
- [ ] Cookies de session : `HttpOnly`, `SameSite=Strict`, `Secure` en production.

## 4. CSP et en-têtes

- [ ] Aucune ressource externe (script, image, police, `fetch`) : la CSP n'autorise que `'self'`. En ajouter une
      impose de modifier `politiqueCsp` et de le justifier dans docs/securite.md.
- [ ] Pas de `'unsafe-eval'` en production ; pas de nouveau relâchement sans décision écrite.
- [ ] Les en-têtes de `src/lib/entetes-securite.ts` restent posés par `next.config.ts` sur `/:path*`.

## 5. Limitation de débit

- [ ] Une route coûteuse (base, image, envoi push) est sous `/api/*`, donc limitée par le proxy.
- [ ] Un changement de seuil reste compatible avec une partie complète (~30 requêtes dont 11 écritures)
      et avec les E2E (même IP pour tous les tests).

## 6. Secrets (SCRUM-71)

- [ ] Aucun secret dans le dépôt, l'image Docker ou une variable `NEXT_PUBLIC_*` (exposée au navigateur).
- [ ] Toute nouvelle variable est ajoutée à `.env.example` sans valeur réelle.
- [ ] Comparaison de secret en temps constant (`timingSafeEqual`, comme `secretValide` et `jetonAdminValide`).

## Commandes de vérification

```bash
bun test tests/unit/securite.test.ts tests/unit/validation.test.ts tests/unit/classement.test.ts
bun run lint                                  # inclut react/no-danger
bun audit                                     # dépendances (SCRUM-73)
git grep -n -E "dangerouslySetInnerHTML|sql\.raw|NEXT_PUBLIC_.*(SECRET|PASSWORD|KEY)"
curl -sI https://<domaine>/ | grep -i -E "content-security|strict-transport|x-frame|x-content"
```
