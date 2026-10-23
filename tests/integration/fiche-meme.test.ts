import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

import * as schema from "@/db/schema";
import { lireMemeParSlug, listerSlugsMemesActifs } from "@/lib/fiche-meme";

import { BASE_TEST_ACTIVE, URL_BASE_TEST } from "./base-test";

describe.skipIf(!BASE_TEST_ACTIVE)("page d'un mème (SCRUM-51)", () => {
  const client = postgres(URL_BASE_TEST, { max: 2, onnotice: () => {} });
  const db = drizzle(client, { schema });

  const base = {
    source_url: "https://commons.wikimedia.org/wiki/File:x.jpg",
    auteur: "Auteur",
    licence: "cc0" as const,
  };

  beforeAll(async () => {
    await client`DROP SCHEMA IF EXISTS public CASCADE`;
    await client`DROP SCHEMA IF EXISTS drizzle CASCADE`;
    await client`CREATE SCHEMA public`;
    await migrate(db, { migrationsFolder: "./drizzle" });
    await db.insert(schema.meme).values([
      { ...base, slug: "beta", nom: "Beta", image_chemin: "/memes/beta.webp" },
      { ...base, slug: "alpha", nom: "Alpha", image_chemin: "/memes/alpha.webp" },
      { ...base, slug: "retire", nom: "Retiré", image_chemin: "/memes/retire.webp", actif: false },
    ]);
  });

  afterAll(async () => {
    await client.end();
  });

  test("liste seulement les slugs des mèmes actifs, triés", async () => {
    expect(await listerSlugsMemesActifs(db)).toEqual(["alpha", "beta"]);
  });

  test("lit la fiche d'un mème actif", async () => {
    expect((await lireMemeParSlug(db, "alpha"))?.nom).toBe("Alpha");
  });

  test("n'a pas de page pour un mème désactivé, inconnu ou au slug invalide", async () => {
    expect(await lireMemeParSlug(db, "retire")).toBeNull();
    expect(await lireMemeParSlug(db, "inconnu")).toBeNull();
    expect(await lireMemeParSlug(db, "../etc")).toBeNull();
  });
});
