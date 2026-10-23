import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

import * as schema from "@/db/schema";
import { lireStats } from "@/lib/stats";

import { BASE_TEST_ACTIVE, URL_BASE_TEST } from "./base-test";

describe.skipIf(!BASE_TEST_ACTIVE)("statistiques (SCRUM-53)", () => {
  const client = postgres(URL_BASE_TEST, { max: 2, onnotice: () => {} });
  const db = drizzle(client, { schema });

  beforeAll(async () => {
    await client`DROP SCHEMA IF EXISTS public CASCADE`;
    await client`DROP SCHEMA IF EXISTS drizzle CASCADE`;
    await client`CREATE SCHEMA public`;
    await migrate(db, { migrationsFolder: "./drizzle" });
  });

  afterAll(async () => {
    await client.end();
  });

  test("renvoie des zéros sur une base vide", async () => {
    const s = await lireStats(db);
    expect(s).toMatchObject({
      parties_terminees: 0,
      joueurs: 0,
      meilleur_score: 0,
      score_moyen: 0,
      memes_actifs: 0,
    });
  });

  test("ne compte que les parties terminées et les mèmes actifs", async () => {
    const [a, b] = await db
      .insert(schema.joueur)
      .values([
        { pseudo: "alice", token_session_hash: "h1" },
        { pseudo: "bruno", token_session_hash: "h2" },
      ])
      .returning();
    await db.insert(schema.partie).values([
      { id_joueur: a!.id_joueur, statut: "terminee", score_total: 100 },
      { id_joueur: a!.id_joueur, statut: "terminee", score_total: 201 },
      { id_joueur: b!.id_joueur, statut: "terminee", score_total: 50 },
      { id_joueur: b!.id_joueur, statut: "en_cours", score_total: 9999 },
    ]);
    const m = { source_url: "https://exemple.org", auteur: "x", licence: "cc0" as const };
    await db.insert(schema.meme).values([
      { ...m, slug: "un", nom: "Un", image_chemin: "/memes/un.webp" },
      { ...m, slug: "deux", nom: "Deux", image_chemin: "/memes/deux.webp", actif: false },
    ]);

    const s = await lireStats(db);
    expect(s.parties_terminees).toBe(3);
    expect(s.joueurs).toBe(2);
    expect(s.meilleur_score).toBe(201);
    expect(s.score_moyen).toBe(117); // (100 + 201 + 50) / 3 = 117
    expect(s.memes_actifs).toBe(1);
    expect(Number.isNaN(Date.parse(s.produit_le))).toBe(false);
  });
});
