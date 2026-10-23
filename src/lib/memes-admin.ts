import { access, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { and, asc, count, eq, ne } from "drizzle-orm";
import { z } from "zod";

import { LICENCES_LIBRES, meme } from "@/db/schema";
import { convertirEnWebp } from "@/lib/image-meme";
import type { BaseDonnees } from "@/lib/questions";

// Gestion des mèmes depuis le backoffice (SCRUM-96). Les règles de validation sont celles du
// skill meme-data : licence libre obligatoire, slug unique, image WebP ≤ 800 px
// et ≤ 100 Ko (convertie à l'envoi).
export const IMAGE_ENVOI_MAX_OCTETS = 8 * 1024 * 1024;
export const MIN_MEMES_ACTIFS = 4;

// Champ absent (null dans un FormData) ou vide : traité comme non renseigné.
const vide = (v: unknown) =>
  v === null || (typeof v === "string" && v.trim() === "") ? undefined : v;
const texteFacultatif = (max: number) =>
  z.preprocess(vide, z.string().trim().max(max).optional()).transform((v) => v ?? null);

const urlHttps = (message: string, hoteWikipedia = false) =>
  z
    .string()
    .trim()
    .max(500)
    .refine((valeur) => {
      if (!URL.canParse(valeur)) return false;
      const { protocol, hostname } = new URL(valeur);
      return protocol === "https:" && (!hoteWikipedia || hostname.endsWith(".wikipedia.org"));
    }, message);

export const ficheMemeSchema = z.strictObject({
  nom: z.string().trim().min(1, "Le nom est obligatoire.").max(120),
  annee_origine: z
    .preprocess(
      vide,
      z.coerce.number().int("L'année doit être un entier.").min(1800).max(2100).optional(),
    )
    .transform((v) => v ?? null),
  origine: texteFacultatif(500),
  // Facultatif : sans auteur, « Auteur inconnu » (la colonne est obligatoire, voir meme-data).
  auteur: z
    .preprocess(vide, z.string().trim().max(200).optional())
    .transform((v) => v ?? "Auteur inconnu"),
  licence: z.enum(LICENCES_LIBRES, {
    error: "Choisis une licence libre : domaine public, CC0, CC BY ou CC BY-SA.",
  }),
  // Facultative : sans source, chaîne vide (l'affichage indique « source non disponible »).
  source_url: z
    .preprocess(
      vide,
      urlHttps("La source doit être une adresse https (page Commons de l'image).").optional(),
    )
    .transform((v) => v ?? ""),
  article_url: z
    .preprocess(
      vide,
      urlHttps("L'article doit être une adresse https de wikipedia.org.", true).optional(),
    )
    .transform((v) => v ?? null),
});
export type FicheMeme = z.output<typeof ficheMemeSchema>;

// Slug : minuscules, sans accents, tirets ; ne change jamais une fois le mème créé.
export function creerSlug(nom: string): string {
  return nom
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
}

export type ResultatMeme = { ok: true; id_meme: number } | { ok: false; erreurs: string[] };

export function lireFiche(
  formData: FormData,
): { ok: true; fiche: FicheMeme } | { ok: false; erreurs: string[] } {
  const brut: Record<string, FormDataEntryValue | null> = {};
  for (const champ of Object.keys(ficheMemeSchema.shape)) brut[champ] = formData.get(champ);
  const resultat = ficheMemeSchema.safeParse(brut);
  if (resultat.success) return { ok: true, fiche: resultat.data };
  return { ok: false, erreurs: resultat.error.issues.map((i) => i.message) };
}

// MEMES_DIR n'existe que pour les tests (dossier temporaire) ; en production : public/memes.
const dossierImages = () => process.env.MEMES_DIR ?? join(process.cwd(), "public", "memes");
const cheminFichier = (slug: string) => join(dossierImages(), `${slug}.webp`);

async function lireImage(
  fichier: FormDataEntryValue | null,
): Promise<{ ok: true; webp: Buffer | null } | { ok: false; erreur: string }> {
  if (!(fichier instanceof File) || fichier.size === 0) return { ok: true, webp: null };
  if (fichier.size > IMAGE_ENVOI_MAX_OCTETS) {
    return { ok: false, erreur: "L'image dépasse 8 Mo." };
  }
  try {
    return { ok: true, webp: await convertirEnWebp(Buffer.from(await fichier.arrayBuffer())) };
  } catch {
    return { ok: false, erreur: "Image illisible ou trop lourde : envoie un JPEG, PNG ou WebP." };
  }
}

export async function creerMeme(db: BaseDonnees, formData: FormData): Promise<ResultatMeme> {
  const lue = lireFiche(formData);
  if (!lue.ok) return lue;
  const { fiche } = lue;

  const slug = creerSlug(fiche.nom);
  if (!slug) return { ok: false, erreurs: ["Le nom doit contenir des lettres ou des chiffres."] };
  const [existant] = await db.select({ id: meme.id_meme }).from(meme).where(eq(meme.slug, slug));
  if (existant) {
    return { ok: false, erreurs: [`Un mème « ${slug} » existe déjà : change le nom.`] };
  }

  const image = await lireImage(formData.get("image"));
  if (!image.ok) return { ok: false, erreurs: [image.erreur] };
  if (!image.webp) return { ok: false, erreurs: ["L'image est obligatoire."] };

  await writeFile(cheminFichier(slug), image.webp);
  try {
    const [cree] = await db
      .insert(meme)
      .values({
        ...fiche,
        slug,
        image_chemin: `/memes/${slug}.webp`,
        actif: true,
        via_backoffice: true,
      })
      .returning({ id: meme.id_meme });
    return { ok: true, id_meme: cree!.id };
  } catch (erreur) {
    await unlink(cheminFichier(slug)).catch(() => {});
    throw erreur;
  }
}

export async function modifierMeme(
  db: BaseDonnees,
  id: number,
  formData: FormData,
): Promise<ResultatMeme> {
  const lue = lireFiche(formData);
  if (!lue.ok) return lue;
  const [actuel] = await db.select().from(meme).where(eq(meme.id_meme, id));
  if (!actuel) return { ok: false, erreurs: ["Mème introuvable."] };

  const image = await lireImage(formData.get("image"));
  if (!image.ok) return { ok: false, erreurs: [image.erreur] };
  // Le fichier garde le même nom : l'ancienne image est remplacée (le slug ne change jamais).
  if (image.webp) await writeFile(cheminFichier(actuel.slug), image.webp);

  await db.update(meme).set(lue.fiche).where(eq(meme.id_meme, id));
  return { ok: true, id_meme: id };
}

// Désactiver plutôt que supprimer : des parties peuvent référencer le mème. Le jeu a besoin d'au
// moins 4 mèmes actifs pour composer les choix.
export async function changerActivation(
  db: BaseDonnees,
  id: number,
  actif: boolean,
): Promise<{ ok: true } | { ok: false; erreur: string }> {
  if (!actif) {
    const [{ total } = { total: 0 }] = await db
      .select({ total: count() })
      .from(meme)
      .where(and(eq(meme.actif, true), ne(meme.id_meme, id)));
    if (total < MIN_MEMES_ACTIFS) {
      return {
        ok: false,
        erreur: `Il faut au moins ${MIN_MEMES_ACTIFS} mèmes actifs pour que le jeu fonctionne.`,
      };
    }
  }
  await db.update(meme).set({ actif }).where(eq(meme.id_meme, id));
  return { ok: true };
}

export function listerMemes(db: BaseDonnees) {
  return db.select().from(meme).orderBy(asc(meme.nom));
}

export async function lireMeme(db: BaseDonnees, id: number) {
  const [ligne] = await db.select().from(meme).where(eq(meme.id_meme, id));
  return ligne;
}

export async function imagePresente(slug: string): Promise<boolean> {
  return access(cheminFichier(slug)).then(
    () => true,
    () => false,
  );
}
