# SEO (SCRUM-55)

Tout est dans `src/lib/seo.ts`, branché sur `src/app/layout.tsx`, `robots.ts` et `sitemap.ts`.

## Adresse du site

`URL_SITE` vaut `SITE_URL` (variable d'environnement, lue **au build**) ou, par défaut, `https://memequizz.duckdns.org`. Elle sert aux liens absolus : canonical, Open Graph, sitemap. Changer de domaine impose de reconstruire l'image.

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

Autorise tout sauf `/admin`, `/api/`, `/jeu/`, `/resultat/` et `/composants`, et annonce le sitemap. Le `noindex` des pages reste la vraie protection : `robots.txt` n'empêche pas l'indexation d'une adresse connue, et il est public.

## sitemap.xml

Pages publiques de `PAGES_PUBLIQUES` + une entrée par mème actif. Généré à chaque requête (`connection()`), donc à jour sans rebuild, et sans base au build de l'image Docker. Limite du protocole : 50 000 adresses par fichier (aujourd'hui 228).

## Vérification

Première version vérifiée le 23/10/2026 avec `bun run build` (avec et sans base) puis `bun run start` : `/robots.txt` et `/sitemap.xml` répondaient, le sitemap était du XML bien formé, et `/`, `/classement` et `/meme/doge` contenaient title, description, canonical, `og:*` et `twitter:card`. Test unitaire : `tests/unit/seo.test.ts`. Validateurs externes (Search Console, partage réel) non joués.
