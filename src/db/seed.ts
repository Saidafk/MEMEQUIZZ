import { sql } from "drizzle-orm";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { meme } from "./schema";

// Jeu de données initial : 10 mèmes provisoires avec une image générique créée
// pour le projet (CC0). Les vrais mèmes arrivent avec SCRUM-37 et SCRUM-38.
const MEMES_INITIAUX = [
  ["chat-surpris", "Le chat surpris"],
  ["gars-qui-hesite", "Le gars qui hésite"],
  ["tout-va-bien", "Tout va bien"],
  ["pouce-leve", "Le pouce levé"],
  ["chien-perplexe", "Le chien perplexe"],
  ["foule-en-delire", "La foule en délire"],
  ["bebe-victorieux", "Le bébé victorieux"],
  ["cerveau-qui-grossit", "Le cerveau qui grossit"],
  ["dame-qui-calcule", "La dame qui calcule"],
  ["panda-qui-roule", "Le panda qui roule"],
] as const;

export async function semer(db: PostgresJsDatabase): Promise<number> {
  const lignes = MEMES_INITIAUX.map(([slug, nom]) => ({
    slug,
    nom,
    source_url: "https://github.com/Saidafk/MEMEQUIZZ",
    image_chemin: "/memes/placeholder.svg",
    auteur: "MEMEQUIZZ (image provisoire)",
    licence: "cc0" as const,
  }));

  // Rejouable : un second passage met à jour les lignes existantes (clé : slug).
  await db
    .insert(meme)
    .values(lignes)
    .onConflictDoUpdate({
      target: meme.slug,
      set: {
        nom: sql`excluded.nom`,
        source_url: sql`excluded.source_url`,
        image_chemin: sql`excluded.image_chemin`,
        auteur: sql`excluded.auteur`,
        licence: sql`excluded.licence`,
      },
    });

  return lignes.length;
}

if (import.meta.main) {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL est manquante (voir .env.example)");
  }
  const client = postgres(url, { max: 1 });
  try {
    const total = await semer(drizzle(client));
    console.log(`Seed terminé : ${total} mèmes.`);
  } finally {
    await client.end();
  }
}
