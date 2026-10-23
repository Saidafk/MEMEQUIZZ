import { notInArray, sql } from "drizzle-orm";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { MEMES } from "./data/memes";
import { meme } from "./schema";

// Rejouable : upsert sur le slug. Les mèmes absents de la liste sont désactivés
// plutôt que supprimés (des parties peuvent y faire référence).
export async function semer(db: PostgresJsDatabase): Promise<number> {
  const lignes = MEMES.map((m) => ({
    slug: m.slug,
    nom: m.nom,
    annee_origine: m.annee_origine,
    origine: m.origine,
    source_url: m.source_url,
    image_chemin: `/memes/${m.slug}.webp`,
    auteur: m.auteur,
    licence: m.licence,
    actif: true,
  }));

  await db
    .insert(meme)
    .values(lignes)
    .onConflictDoUpdate({
      target: meme.slug,
      set: {
        nom: sql`excluded.nom`,
        annee_origine: sql`excluded.annee_origine`,
        origine: sql`excluded.origine`,
        source_url: sql`excluded.source_url`,
        image_chemin: sql`excluded.image_chemin`,
        auteur: sql`excluded.auteur`,
        licence: sql`excluded.licence`,
        actif: sql`excluded.actif`,
      },
    });

  await db
    .update(meme)
    .set({ actif: false })
    .where(
      notInArray(
        meme.slug,
        lignes.map((l) => l.slug),
      ),
    );

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
