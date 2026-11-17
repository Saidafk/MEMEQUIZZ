import type { Metadata, MetadataRoute } from "next";

// Adresse publique du site : sert aux liens absolus (canonical, Open Graph, sitemap). Figée au build
// pour les pages pré-rendues, lue à l'exécution pour le sitemap ; par défaut, celle du VPS.
export const URL_SITE = (process.env.SITE_URL ?? "https://memequizz.duckdns.org").replace(
  /\/+$/,
  "",
);

export const NOM_SITE = "MEMEQUIZZ";
export const DESCRIPTION_SITE =
  "Quiz de mèmes : reconnais le mème parmi 4 propositions avant la fin du chrono de 15 secondes.";
export const IMAGE_PARTAGE = "/icons/icon-512.png";

// Pages publiques et stables, dans l'ordre du sitemap. Les parties (`/jeu`, `/resultat`), le
// backoffice et l'API n'y figurent pas : elles ne sont pas faites pour être indexées.
export const PAGES_PUBLIQUES = [
  "/",
  "/classement",
  "/stats",
  "/stats/csr",
  "/stats/ssr",
  "/stats/ssg",
  "/credits",
] as const;

// Chemins que les robots ne doivent pas explorer (en plus du `noindex` des pages concernées).
export const CHEMINS_INTERDITS = ["/admin", "/api/", "/jeu/", "/resultat/", "/composants"];

type Options = {
  titre: string;
  description: string;
  chemin: string;
  // Chemin de l'image utilisée pour le partage (par défaut, l'icône du site).
  image?: string;
};

// Un `openGraph` défini dans une page remplace celui du layout en entier : on le reconstruit donc
// complet ici plutôt que de compter sur l'héritage.
export function metadonneesPage({ titre, description, chemin, image }: Options): Metadata {
  const images = [{ url: image ?? IMAGE_PARTAGE }];
  return {
    title: titre,
    description,
    alternates: { canonical: chemin },
    openGraph: {
      type: "website",
      siteName: NOM_SITE,
      locale: "fr_FR",
      title: titre,
      description,
      url: chemin,
      images,
    },
    twitter: { card: "summary", title: titre, description, images },
  };
}

export function construireRobots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: CHEMINS_INTERDITS },
    sitemap: `${URL_SITE}/sitemap.xml`,
  };
}

export function construireSitemap(slugsMemes: readonly string[]): MetadataRoute.Sitemap {
  const chemins = [...PAGES_PUBLIQUES, ...slugsMemes.map((slug) => `/meme/${slug}`)];
  return chemins.map((chemin) => ({ url: `${URL_SITE}${chemin === "/" ? "" : chemin}` }));
}
