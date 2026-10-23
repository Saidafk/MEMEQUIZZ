import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

import * as schema from "@/db/schema";
import { enregistrerAbonnement, envoyerQuizDuJour, type Abonnement } from "@/lib/push";

import { BASE_TEST_ACTIVE, URL_BASE_TEST } from "./base-test";

const abo = (nom: string): Abonnement => ({
  endpoint: `https://push.example.com/${nom}`,
  keys: { p256dh: "cle", auth: "auth" },
});

describe.skipIf(!BASE_TEST_ACTIVE)("notifications push (SCRUM-49)", () => {
  const client = postgres(URL_BASE_TEST, { max: 5, onnotice: () => {} });
  const db = drizzle(client, { schema });

  beforeAll(async () => {
    await client`DROP SCHEMA IF EXISTS public CASCADE`;
    await client`DROP SCHEMA IF EXISTS drizzle CASCADE`;
    await client`CREATE SCHEMA public`;
    await migrate(db, { migrationsFolder: "./drizzle" });
  });

  beforeEach(async () => {
    await db.delete(schema.abonnementPush);
  });

  afterAll(async () => {
    await client.end();
  });

  test("un même appareil qui se réabonne ne crée pas de doublon", async () => {
    await enregistrerAbonnement(db, abo("a"));
    await enregistrerAbonnement(db, { ...abo("a"), keys: { p256dh: "autre", auth: "autre" } });
    const lignes = await db.select().from(schema.abonnementPush);
    expect(lignes).toHaveLength(1);
    expect(lignes[0]?.cle_p256dh).toBe("autre");
  });

  test("envoie à tous, supprime les appareils désinscrits (410) et garde les échecs passagers", async () => {
    for (const nom of ["ok", "parti", "panne"]) await enregistrerAbonnement(db, abo(nom));
    const bilan = await envoyerQuizDuJour(db, async (a) => {
      if (a.endpoint.endsWith("/parti"))
        throw Object.assign(new Error("gone"), { statusCode: 410 });
      if (a.endpoint.endsWith("/panne"))
        throw Object.assign(new Error("boom"), { statusCode: 500 });
    });
    expect(bilan).toEqual({ envoyes: 1, supprimes: 1, echecs: 1 });
    const restants = (await db.select().from(schema.abonnementPush)).map((l) =>
      l.endpoint.split("/").pop(),
    );
    expect(restants.sort()).toEqual(["ok", "panne"]);
  });
});
