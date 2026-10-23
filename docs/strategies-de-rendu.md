# Stratégies de rendu des pages (v0.5)

Next.js 16 avec Cache Components : une page est préparée au build (coquille statique), et tout ce qui dépend de la requête (cookies, paramètres d'URL, base de données non mise en cache) est rendu sous `<Suspense>` à chaque requête.

| Page           | Stratégie                                 | Ticket   |
| -------------- | ----------------------------------------- | -------- |
| `/meme/[slug]` | SSG : une page par mème, générée au build | SCRUM-51 |
| `/classement`  | SSR : lue en base à chaque requête        | SCRUM-52 |

## `/meme/[slug]` (SSG)

`generateStaticParams` liste les mèmes actifs. Sans `DATABASE_URL` au build (image Docker), il part de la liste curée `src/db/data/memes.ts`, car Cache Components exige au moins une page. Les autres mèmes sont générés à la première visite. Les données sont en cache une heure (`cacheLife("hours")`).

## `/classement` (SSR)

Le classement change à chaque partie terminée et dépend du cookie de session (ligne « moi ») et du paramètre `periode`. La page lit donc `searchParams` et `cookies()` sous `<Suspense>` : rien n'est mis en cache, la coquille (titre, fallback) est statique et le contenu est rendu par le serveur à chaque requête. Au build, `next build` l'affiche en `◐` (pré-rendu partiel). Le service worker garde les pages en « réseau d'abord » (voir `strategie-cache.md`).

### Vérification du rendu serveur (2026-10-23)

1. `bun run build`, puis `bun run start -p 3123`.
2. `curl` de `/classement?periode=toujours` : le HTML contient la liste, sans exécuter de JavaScript.
3. Insertion en base d'un joueur « TesteurSSR » avec une partie terminée à 999 points.
4. Nouveau `curl`, sans rebuild ni redémarrage : « TesteurSSR » est dans le HTML. Les données sont donc fraîches à chaque requête.
5. Joueur de test supprimé.
