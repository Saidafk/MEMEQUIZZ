import { describe, expect, test } from "bun:test";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

import { semer } from "@/db/seed";

import { BASE_TEST_ACTIVE, URL_BASE_TEST } from "./base-test";

describe.skipIf(!BASE_TEST_ACTIVE)("seed", () => {
  test("remplit les mèmes avec une licence libre et se rejoue sans doublon", async () => {
    const client = postgres(URL_BASE_TEST, { max: 1, onnotice: () => {} });
    try {
      await client`DROP SCHEMA IF EXISTS public CASCADE`;
      await client`DROP SCHEMA IF EXISTS drizzle CASCADE`;
      await client`CREATE SCHEMA public`;
      const db = drizzle(client);
      await migrate(db, { migrationsFolder: "./drizzle" });

      const premier = await semer(db);
      await semer(db);

      const [compte] = await client<{ n: number }[]>`SELECT count(*)::int AS n FROM meme`;
      expect(compte?.n).toBe(premier);
      expect(premier).toBeGreaterThanOrEqual(4);

      const [sansLicence] = await client<{ n: number }[]>`
        SELECT count(*)::int AS n FROM meme
        WHERE licence IS NULL OR auteur = '' OR image_chemin = ''`;
      expect(sansLicence?.n).toBe(0);
    } finally {
      await client.end();
    }
  });
});
