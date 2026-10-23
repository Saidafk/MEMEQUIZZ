import { and, asc, eq } from "drizzle-orm";

import type { getDb } from "@/db";
import { meme } from "@/db/schema";

type Db = ReturnType<typeof getDb>;

// Forme d'un slug de mème (même règle que le nom des images, voir /memes/[fichier]).
export const SLUG_MEME = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export type PageMeme = {
  slug: string;
  nom: string;
  annee_origine: number | null;
  origine: string | null;
  article_url: string | null;
  image_chemin: string;
  auteur: string;
  licence: string;
  source_url: string;
};

export async function listerSlugsMemesActifs(db: Db): Promise<string[]> {
  const lignes = await db
    .select({ slug: meme.slug })
    .from(meme)
    .where(eq(meme.actif, true))
    .orderBy(asc(meme.slug));
  return lignes.map((l) => l.slug);
}

// Un mème désactivé n'a pas de page : il a été retiré du jeu (droits, erreur).
export async function lireMemeParSlug(db: Db, slug: string): Promise<PageMeme | null> {
  if (!SLUG_MEME.test(slug)) return null;
  const [ligne] = await db
    .select({
      slug: meme.slug,
      nom: meme.nom,
      annee_origine: meme.annee_origine,
      origine: meme.origine,
      article_url: meme.article_url,
      image_chemin: meme.image_chemin,
      auteur: meme.auteur,
      licence: meme.licence,
      source_url: meme.source_url,
    })
    .from(meme)
    .where(and(eq(meme.slug, slug), eq(meme.actif, true)))
    .limit(1);
  return ligne ?? null;
}
