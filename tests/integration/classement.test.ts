import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

import * as schema from "@/db/schema";
import { lireClassement } from "@/lib/classement";
import { genererJeton, hasherJeton } from "@/lib/session";

import { BASE_TEST_ACTIVE, URL_BASE_TEST } from "./base-test";

describe.skipIf(!BASE_TEST_ACTIVE)("classement (SCRUM-44)", () => {
  const client = postgres(URL_BASE_TEST, { max: 5, onnotice: () => {} });
  const db = drizzle(client, { schema });

  beforeAll(async () => {
    await client`DROP SCHEMA IF EXISTS public CASCADE`;
    await client`DROP SCHEMA IF EXISTS drizzle CASCADE`;
    await client`CREATE SCHEMA public`;
    await migrate(db, { migrationsFolder: "./drizzle" });
  });

  beforeEach(async () => {
    await db.delete(schema.partie);
    await db.delete(schema.joueur);
  });

  afterAll(async () => {
    await client.end();
  });

  async function jouee(
    pseudo: string,
    score: number,
    options: {
      statut?: "en_cours" | "terminee" | "abandonnee";
      // Intervalle SQL avant maintenant, ex. « 2 days » : termine_le = now() - intervalle.
      il_y_a?: string;
      jeton?: string;
    } = {},
  ) {
    const jeton = options.jeton ?? genererJeton();
    const [j] = await db
      .insert(schema.joueur)
      .values({ pseudo, token_session_hash: hasherJeton(jeton) })
      .returning({ id: schema.joueur.id_joueur });
    if (!j) throw new Error("joueur non créé");
    const statut = options.statut ?? "terminee";
    await db.insert(schema.partie).values({
      id_joueur: j.id,
      statut,
      score_total: score,
      termine_le:
        statut === "terminee"
          ? sql`now() - ${sql.raw(`interval '${options.il_y_a ?? "0 seconds"}'`)}`
          : null,
    });
    return jeton;
  }

  const toujours = (jetonHash: string | null = null, limite?: number) =>
    lireClassement(db, { periode: "toujours", jetonHash, limite });
  const aujourdhui = (jetonHash: string | null = null) =>
    lireClassement(db, { periode: "aujourdhui", jetonHash });

  test("trié par score, égalités au même rang, la plus ancienne d'abord", async () => {
    await jouee("Moyen", 700, { il_y_a: "1 hour" });
    await jouee("Premier", 900);
    await jouee("MoyenBis", 700, { il_y_a: "2 hours" }); // même score, plus ancienne : devant
    await jouee("Dernier", 500);

    const lignes = await toujours();
    expect(lignes.map((l) => [l.pseudo, l.rang])).toEqual([
      ["Premier", 1],
      ["MoyenBis", 2],
      ["Moyen", 2],
      ["Dernier", 4],
    ]);
  });

  test("seules les parties terminées comptent", async () => {
    await jouee("Fini", 100);
    await jouee("EnCours", 9999, { statut: "en_cours" });
    await jouee("Abandon", 9998, { statut: "abandonnee" });
    expect((await toujours()).map((l) => l.pseudo)).toEqual(["Fini"]);
  });

  test("« aujourd'hui » exclut les parties des jours précédents, « depuis toujours » les garde", async () => {
    await jouee("Aujourdhui", 400);
    await jouee("Hier", 800, { il_y_a: "2 days" });

    expect((await aujourdhui()).map((l) => l.pseudo)).toEqual(["Aujourdhui"]);
    expect((await toujours()).map((l) => l.pseudo)).toEqual(["Hier", "Aujourdhui"]);
  });

  test("« moi » est vrai uniquement pour le joueur dont le jeton correspond, sans fuite du hash", async () => {
    const monJeton = await jouee("Moi", 600);
    await jouee("Autre", 800);

    const avec = await toujours(hasherJeton(monJeton));
    expect(avec.map((l) => [l.pseudo, l.moi])).toEqual([
      ["Autre", false],
      ["Moi", true],
    ]);
    for (const l of avec) expect(Object.keys(l).sort()).toEqual(["moi", "pseudo", "rang", "score"]);

    expect((await toujours(null)).every((l) => l.moi === false)).toBe(true);
    expect((await toujours(hasherJeton("inconnu"))).every((l) => l.moi === false)).toBe(true);
  });

  test("une même personne qui rejoue apparaît pour chaque partie terminée", async () => {
    const jeton = genererJeton();
    await jouee("Rejoue", 300, { jeton: `${jeton}-a` });
    await jouee("Rejoue", 500, { jeton: `${jeton}-b` });
    expect((await toujours()).map((l) => [l.pseudo, l.score])).toEqual([
      ["Rejoue", 500],
      ["Rejoue", 300],
    ]);
  });

  test("la limite est respectée et la base vide donne une liste vide", async () => {
    expect(await toujours()).toEqual([]);
    expect(await aujourdhui()).toEqual([]);
    for (let i = 1; i <= 5; i += 1) await jouee(`Joueur${i}`, i * 100);
    const trois = await toujours(null, 3);
    expect(trois.map((l) => l.score)).toEqual([500, 400, 300]);
  });

  test("un pseudo avec du HTML est renvoyé tel quel : l'échappement est fait par l'affichage", async () => {
    await jouee("<b>x</b>", 10);
    expect((await toujours())[0]?.pseudo).toBe("<b>x</b>");
  });
});
