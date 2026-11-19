# Stratégies de rendu des pages (v0.5)

Next.js 16 avec Cache Components : une page est préparée au build (coquille statique), et tout ce qui dépend de la requête (cookies, paramètres d'URL, base de données non mise en cache) est rendu sous `<Suspense>` à chaque requête.

| Page           | Stratégie                                 | Ticket   |
| -------------- | ----------------------------------------- | -------- |
| `/meme/[slug]` | SSG : une page par mème, générée au build | SCRUM-51 |
| `/classement`  | SSR : lue en base à chaque requête        | SCRUM-52 |
| `/stats/csr`   | CSR : chiffres chargés par le navigateur  | SCRUM-53 |
| `/stats/ssr`   | SSR : chiffres lus à chaque requête       | SCRUM-53 |
| `/stats/ssg`   | SSG : chiffres du build, régénérés à 1 h  | SCRUM-53 |

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

## Statistiques en trois rendus (`/stats`)

Une même présentation (`BlocStats`) et les mêmes chiffres (`lireStats` : parties terminées, joueurs, meilleur score, score moyen, mèmes actifs) servis de trois façons, pour comparer le rendu et mesurer (Web Vitals, Lighthouse) :

| Route        | Ce que livre le serveur                 | Où les chiffres sont lus                                                                |
| ------------ | --------------------------------------- | --------------------------------------------------------------------------------------- |
| `/stats/csr` | Une page vide (« Chargement… »)         | Le navigateur appelle `GET /api/stats`                                                  |
| `/stats/ssr` | Le HTML complet, construit à la requête | La base, à chaque requête (`connection()`)                                              |
| `/stats/ssg` | Le HTML complet, préparé au build       | La base au build, puis au plus une fois par heure (`"use cache"`, `cacheLife("hours")`) |

Chaque page affiche l'instant où les chiffres ont été lus : recharger `/stats/ssr` le change à chaque fois, `/stats/ssg` non. Sans `DATABASE_URL` au build (image Docker), la version SSG part de zéros jusqu'à sa première régénération. Vérifié avec `next start` : `/stats/ssr` et `/stats/ssg` contiennent « Parties terminées » dans le HTML, pas `/stats/csr`.

## Web Vitals des trois rendus (SCRUM-54)

Mesure du 2026-11-19 sur la production (`https://memequizz.duckdns.org/stats/<mode>`), Lighthouse 12.8.2, catégorie performance, profil mobile (4G lente simulée : 150 ms de RTT, ~1,6 Mbit/s, CPU ralenti ×4). Trois passes par page, valeur médiane.

| Mode | Score perf | LCP   | CLS   | TBT (≈ INP) | FCP   | TTFB   | Élément LCP  |
| ---- | ---------- | ----- | ----- | ----------- | ----- | ------ | ------------ |
| CSR  | 62         | 8,1 s | 0,041 | 451 ms      | 1,8 s | 108 ms | `<p>` (note) |
| SSR  | 70         | 7,8 s | 0     | 261 ms      | 1,7 s | 97 ms  | `<h1>`       |
| SSG  | 74         | 7,6 s | 0     | 128 ms      | 1,7 s | 49 ms  | `<h1>`       |

Seuils « bon » de Google : LCP ≤ 2,5 s, INP ≤ 200 ms, CLS ≤ 0,1.

### Lecture

- **SSG est le plus rapide sur tous les indicateurs.** Le HTML est déjà prêt : le serveur répond en ~50 ms (TTFB), et le navigateur n'a presque rien à exécuter (TBT 128 ms).
- **SSR paie la lecture en base à chaque requête** : TTFB doublé (~100 ms), et l'hydratation pèse un peu plus (TBT 261 ms). Le contenu reste visible dès le HTML, donc aucun décalage (CLS 0).
- **CSR est le moins bon** : le serveur livre « Chargement… », puis le navigateur exécute le JavaScript, appelle `/api/stats` et construit le tableau. C'est le seul mode avec un décalage de mise en page (CLS 0,041, encore « bon ») et le TBT le plus élevé (451 ms). Le plus grand élément affiché n'est même plus le titre mais la note, rendue après coup.
- **Le LCP (~8 s) est mauvais dans les trois modes, et ce n'est pas le rendu qui l'explique** : 90 % du LCP est du « retard de rendu ». La page télécharge **92 fichiers de police (701 Kio, plus de la moitié de son poids)**, dont 44 préchargés dans le `<head>` : la police Gaegu, d'origine coréenne, est découpée par Google en dizaines de tranches et `next/font` les précharge toutes. Sur une 4G lente, ces polices passent avant le reste. À corriger dans SCRUM-57 (limiter le préchargement de Gaegu), puis remesurer : l'écart entre les modes devrait alors ressortir davantage sur le LCP.

### Limite : INP

L'INP mesure la réactivité à une interaction réelle (clic, frappe) : Lighthouse, qui ne fait que charger la page, ne peut pas le calculer. Le TBT (temps où le fil principal est bloqué pendant le chargement) sert ici d'indicateur de laboratoire : plus il est haut, plus un clic précoce risque d'attendre. Un vrai INP demanderait une mesure terrain (`useReportWebVitals` de Next.js envoyé vers un collecteur), piste notée pour une supervision future.

### Reproduire

```
npx lighthouse@12 https://memequizz.duckdns.org/stats/ssg --only-categories=performance --output=json --output-path=ssg-1.json --chrome-flags="--headless=new"
```

Trois passes par mode (`csr`, `ssr`, `ssg`), puis médiane de `largest-contentful-paint`, `cumulative-layout-shift`, `total-blocking-time`, `first-contentful-paint` et `server-response-time` dans les rapports JSON.
