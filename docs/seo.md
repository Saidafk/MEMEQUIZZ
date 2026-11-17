# SEO (SCRUM-55)

Tout est dans `src/lib/seo.ts`, branché sur `src/app/layout.tsx`, `robots.ts` et `sitemap.ts`.

## Adresse du site

`URL_SITE` vaut `SITE_URL` ou, par défaut, `https://memequizz.duckdns.org`. Elle sert aux liens absolus : canonical, Open Graph, sitemap. Elle est figée **au build** dans les pages pré-rendues et `robots.txt`, mais lue **à l'exécution** par le sitemap et les fiches de mèmes générées à la demande. Pour changer de domaine, il faudrait donc la passer aux deux moments : `ARG` dans le `Dockerfile` et variable dans `compose.prod.yaml`. Ce n'est pas fait aujourd'hui, la valeur par défaut suffit.

Le layout ne pose **ni canonical ni `og:url`** : ils seraient hérités par les pages `noindex`, qui se déclareraient alors copies de l'accueil. Seules les pages publiques les posent, accueil compris (`src/app/page.tsx`).

## Métadonnées par page

`metadonneesPage({ titre, description, chemin, image? })` produit titre, description, lien canonical, Open Graph (`fr_FR`, `website`) et carte Twitter. Next remplace `openGraph` en entier quand une page le redéfinit : la fonction le reconstruit donc complet. Image de partage : l'icône du site, ou l'image du mème sur `/meme/[slug]`.

| Page                                       | Indexée | Métadonnées                       |
| ------------------------------------------ | ------- | --------------------------------- |
| `/`, `/classement`, `/credits`, `/stats/*` | oui     | `metadonneesPage`                 |
| `/meme/[slug]`                             | oui     | `metadonneesPage` + image du mème |
| `/jeu/*`, `/resultat/*`, `/entrainement`   | non     | `robots: { index: false }`        |
| `/hors-ligne`, `/admin/*`, `/composants`   | non     | `robots: { index: false }`        |
| mème inconnu ou désactivé (404)            | non     | `robots: { index: false }`        |

## robots.txt

Autorise tout sauf `/admin`, `/api/`, `/jeu/`, `/resultat/` et `/composants`, et annonce le sitemap. Le `noindex` des pages reste la vraie protection : `robots.txt` n'empêche pas l'indexation d'une adresse connue, et il est public. Choix assumé : pour `/jeu/` et `/resultat/`, interdire l'exploration empêche aussi les robots de lire leur `noindex`. Une adresse de partie partagée publiquement pourrait apparaître sans contenu dans un moteur ; c'est jugé préférable à laisser explorer des pages propres à un joueur.

## sitemap.xml

Pages publiques de `PAGES_PUBLIQUES` + une entrée par mème actif. Généré à chaque requête (`connection()`), donc à jour sans rebuild, et sans base au build de l'image Docker. Limite du protocole : 50 000 adresses par fichier (aujourd'hui 228).

## Vérification

Première version vérifiée le 23/10/2026 avec `bun run build` (avec et sans base) puis `bun run start` : `/robots.txt` et `/sitemap.xml` répondaient, le sitemap était du XML bien formé, et `/`, `/classement` et `/meme/doge` contenaient title, description, canonical, `og:*` et `twitter:card`. Test unitaire : `tests/unit/seo.test.ts`. Validateurs externes (Search Console, partage réel) non joués.
