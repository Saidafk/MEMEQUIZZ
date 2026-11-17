import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { getDb } from "@/db";
import { listerSlugsMemesActifs } from "@/lib/fiche-meme";
import { construireSitemap } from "@/lib/seo";

// Lu à chaque requête : les mèmes ajoutés depuis le backoffice ou importés doivent y figurer sans
// rebuild, et `next build` (image Docker) n'a pas de base de données.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connection();
  return construireSitemap(await listerSlugsMemesActifs(getDb()));
}
