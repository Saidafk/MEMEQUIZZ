import { describe, expect, test } from "bun:test";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

// Rejoue les migrations sur une base vide. Il faut une base dédiée, dont le nom
// finit par « _test » : le schéma public y est supprimé avant chaque exécution.
const url = process.env.TEST_DATABASE_URL;
const nomBase = url ? new URL(url).pathname.slice(1) : "";
const actif = Boolean(url) && nomBase.endsWith("_test");

describe.skipIf(!actif)("migrations sur base vide", () => {
  test("créent les 4 tables, les enums et les index attendus", async () => {
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
    } finally {
      await sql.end();
    }
  });

  test("refuse un mème sans licence libre", async () => {
    const sql = postgres(url as string, { max: 1 });
    try {
      const insertion = sql`
        INSERT INTO meme (slug, nom, source_url, image_chemin, auteur, licence)
        VALUES ('x', 'X', 'https://exemple.fr', '/x.webp', 'A', 'tous_droits_reserves')`;
      await expect(insertion).rejects.toThrow();
    } finally {
      await sql.end();
    }
  });
});
