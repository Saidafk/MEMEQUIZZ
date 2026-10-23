import { describe, expect, test } from "bun:test";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

// Rejoue les migrations sur une base vide. Le schéma public y est supprimé :
// le test ne tourne que sur une base locale dont le nom finit par « _test ».
const url = process.env.TEST_DATABASE_URL;
const cible = url ? new URL(url) : null;
const actif =
  cible !== null &&
  ["localhost", "127.0.0.1"].includes(cible.hostname) &&
  cible.pathname.slice(1).endsWith("_test");

const CODE_VALEUR_ENUM_INVALIDE = "22P02";
const CODE_CONTRAINTE_CHECK = "23514";

describe.skipIf(!actif)("migrations sur base vide", () => {
  test("créent les tables, enums et index, et appliquent les contraintes", async () => {
    const sql = postgres(url as string, { max: 1, onnotice: () => {} });
    try {
      await sql`DROP SCHEMA IF EXISTS public CASCADE`;
      await sql`DROP SCHEMA IF EXISTS drizzle CASCADE`;
      await sql`CREATE SCHEMA public`;

      await migrate(drizzle(sql), { migrationsFolder: "./drizzle" });

      const tables = await sql<{ table_name: string }[]>`
        SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'public' ORDER BY table_name`;
      expect(tables.map((t) => t.table_name)).toEqual([
        "joueur",
        "meme",
        "partie",
        "partie_question",
      ]);

      const enums = await sql<{ typname: string }[]>`
        SELECT typname FROM pg_type WHERE typtype = 'e' ORDER BY typname`;
      expect(enums.map((e) => e.typname)).toEqual(["licence_image", "statut_partie"]);

      const index = await sql<{ indexname: string }[]>`
        SELECT indexname FROM pg_indexes
        WHERE schemaname = 'public' AND indexname = 'partie_score_total_idx'`;
      expect(index).toHaveLength(1);

      // Les tables existent : une erreur ici vient bien de la contrainte testée.
      await expect(
        sql`INSERT INTO meme (slug, nom, source_url, image_chemin, auteur, licence)
            VALUES ('x', 'X', 'https://exemple.fr', '/x.webp', 'A', 'tous_droits_reserves')`,
      ).rejects.toMatchObject({ code: CODE_VALEUR_ENUM_INVALIDE });

      await expect(
        sql`INSERT INTO joueur (pseudo, token_session_hash) VALUES ('ab', 'hash')`,
      ).rejects.toMatchObject({ code: CODE_CONTRAINTE_CHECK });
    } finally {
      await sql.end();
    }
  });
});
