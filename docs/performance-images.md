# Optimisation des images (SCRUM-56)

Les images des mèmes (`public/memes/*.webp`, 221 fichiers, jusqu'à 100 Ko) étaient toutes affichées avec `unoptimized` : le navigateur recevait le fichier d'origine, quelle que soit la taille d'affichage.

## Ce qui change

| Page            | Avant                                   | Après                                                                                 |
| --------------- | --------------------------------------- | ------------------------------------------------------------------------------------- |
| `/meme/[slug]`  | fichier d'origine, préchargé            | optimisée par `next/image`, `sizes` = largeur de la feuille, préchargée               |
| `/jeu`          | fichier d'origine, préchargé            | optimisée, `sizes` = colonne de gauche en grand écran, préchargée                     |
| `/admin`        | 221 fichiers d'origine (64 px affichés) | vignettes optimisées (64/128 px), chargement différé (`lazy`, défaut de `next/image`) |
| `/entrainement` | fichier d'origine                       | **inchangé**, voir ci-dessous                                                         |

`next/image` sert `/_next/image?url=…&w=…` : l'image est redimensionnée à la largeur demandée (choisie par le navigateur grâce à `srcset` et `sizes`) et réencodée en WebP par `sharp`, déjà présent pour le backoffice (`src/lib/image-meme.ts`).

Mesuré sur un build de production local (`doge.webp`, 64 Ko à l'origine) :

| Usage                                   | Largeur | Poids         |
| --------------------------------------- | ------- | ------------- |
| Mobile (largeur choisie par Lighthouse) | 750     | 46 Ko (−28 %) |
| Petit écran                             | 640     | 33 Ko (−48 %) |
| Vignette admin (écran haute densité)    | 128     | 3 Ko (−95 %)  |

## Exception : l'entraînement hors ligne

`/entrainement` garde `unoptimized`. Le service worker met en cache `/memes/*` (voir [strategie-cache.md](strategie-cache.md)) et le mode hors ligne rejoue ces fichiers : une URL `/_next/image` ne serait pas disponible hors ligne.

## Point de vigilance : image remplacée

Le backoffice remplace une image sous le même nom. `next/image` garde en cache la version optimisée (cache serveur `.next/cache/images`, 4 h par défaut dans Next 16) : après un remplacement, l'ancienne version peut rester servie quelques heures. Même comportement que le service worker pour `/memes/*`, déjà documenté.

## Mesures LCP

Production, Lighthouse 12.8.2, mobile (4G lente simulée, CPU ×4), médiane de 3 passes, page `/meme/doge` (l'image est l'élément LCP).

| Moment        | Score                       | LCP    | Image LCP reçue | Répartition du LCP (médiane)                                    |
| ------------- | --------------------------- | ------ | --------------- | --------------------------------------------------------------- |
| Avant (19/11) | 59                          | 8,17 s | 63 Kio          | TTFB 0,8 s · attente 2,3 s · téléchargement 1,9 s · rendu 3,2 s |
| Après         | à mesurer après déploiement |        |                 |                                                                 |

L'image ne pèse qu'une partie du LCP : l'attente avant téléchargement et le retard de rendu viennent surtout des 44 polices préchargées (voir [strategies-de-rendu.md](strategies-de-rendu.md#web-vitals-des-trois-rendus-scrum-54)), à traiter dans SCRUM-57. Le gain attendu ici porte sur la phase de téléchargement.
