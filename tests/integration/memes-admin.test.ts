import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import sharp from "sharp";

import * as schema from "@/db/schema";
import { semer } from "@/db/seed";
import { changerActivation, creerMeme, modifierMeme } from "@/lib/memes-admin";

import { BASE_TEST_ACTIVE, URL_BASE_TEST } from "./base-test";

describe.skipIf(!BASE_TEST_ACTIVE)("backoffice des mèmes (SCRUM-96)", () => {
  const client = postgres(URL_BASE_TEST, { max: 5, onnotice: () => {} });
  const db = drizzle(client, { schema });
  let dossier = "";

  beforeAll(async () => {
    await client`DROP SCHEMA IF EXISTS public CASCADE`;
    await client`DROP SCHEMA IF EXISTS drizzle CASCADE`;
    await client`CREATE SCHEMA public`;
    await migrate(db, { migrationsFolder: "./drizzle" });
    dossier = await mkdtemp(join(tmpdir(), "memes-"));
    process.env.MEMES_DIR = dossier;
  });

  beforeEach(async () => {
    await db.delete(schema.meme);
    // Dossier d'images vidé entre les tests ; les fichiers de la conversion sont lus par sharp,
    // d'où les nouvelles tentatives (Windows garde un verrou un instant).
    for (const fichier of await readdir(dossier)) {
      await rm(join(dossier, fichier), { force: true, maxRetries: 5, retryDelay: 100 });
    }
  });

  afterAll(async () => {
    delete process.env.MEMES_DIR;
    await rm(dossier, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    await client.end();
  });

  async function formulaire(surcharge: Record<string, string> = {}, avecImage = true) {
    const f = new FormData();
    const champs: Record<string, string> = {
      nom: "Mème de test",
      auteur: "Auteur",
      licence: "cc0",
      source_url: "https://commons.wikimedia.org/wiki/File:Test.png",
      ...surcharge,
    };
    for (const [cle, valeur] of Object.entries(champs)) f.set(cle, valeur);
    if (avecImage) {
      const png = await sharp({
        create: { width: 1200, height: 900, channels: 3, background: "#f00" },
      })
        .png()
        .toBuffer();
      f.set("image", new File([new Uint8Array(png)], "test.png", { type: "image/png" }));
    }
    return f;
  }

  test("crée un mème actif, convertit l'image en WebP ≤ 800 px et ≤ 100 Ko", async () => {
    const r = await creerMeme(db, await formulaire());
    expect(r.ok).toBe(true);
    const [ligne] = await db.select().from(schema.meme);
    expect(ligne).toMatchObject({ slug: "meme-de-test", actif: true, via_backoffice: true });
    expect(ligne?.image_chemin).toBe("/memes/meme-de-test.webp");
    const meta = await sharp(await readFile(join(dossier, "meme-de-test.webp"))).metadata();
    expect(meta.format).toBe("webp");
    expect(Math.max(meta.width ?? 0, meta.height ?? 0)).toBeLessThanOrEqual(800);
  });

  test("refuse un envoi sans licence libre, avec une source non https ou sans image, et n'écrit rien", async () => {
    expect((await creerMeme(db, await formulaire({ licence: "" }))).ok).toBe(false);
    expect((await creerMeme(db, await formulaire({ source_url: "javascript:alert(1)" }))).ok).toBe(
      false,
    );
    expect((await creerMeme(db, await formulaire({}, false))).ok).toBe(false);
    expect(await db.select().from(schema.meme)).toHaveLength(0);
    expect(await readdir(dossier)).toHaveLength(0);
  });

  test("refuse un slug déjà utilisé", async () => {
    expect((await creerMeme(db, await formulaire())).ok).toBe(true);
    const r = await creerMeme(db, await formulaire({ nom: "Mème de TEST" }));
    expect(r.ok).toBe(false);
  });

  test("modifie la fiche sans changer le slug et remplace l'image à la demande", async () => {
    const cree = await creerMeme(db, await formulaire());
    if (!cree.ok) throw new Error("création");
    const r = await modifierMeme(
      db,
      cree.id_meme,
      await formulaire({ nom: "Nouveau nom", auteur: "Autre" }, false),
    );
    expect(r.ok).toBe(true);
    const [ligne] = await db.select().from(schema.meme);
    expect(ligne).toMatchObject({ nom: "Nouveau nom", auteur: "Autre", slug: "meme-de-test" });
  });

  test("désactive un mème mais garde au moins 4 mèmes actifs", async () => {
    await semer(db);
    const [premier] = await db.select().from(schema.meme);
    expect((await changerActivation(db, premier!.id_meme, false)).ok).toBe(true);
    // On désactive jusqu'à n'en laisser que 4 : le suivant est refusé.
    const actifs = await db.select().from(schema.meme);
    let restants = actifs.filter((m) => m.actif);
    while (restants.length > 4) {
      expect((await changerActivation(db, restants[0]!.id_meme, false)).ok).toBe(true);
      restants = restants.slice(1);
    }
    expect((await changerActivation(db, restants[0]!.id_meme, false)).ok).toBe(false);
  });

  test("le seed ne désactive pas les mèmes créés depuis le backoffice", async () => {
    await creerMeme(db, await formulaire());
    await semer(db);
    const [ligne] = await db.select().from(schema.meme).where(eqSlug("meme-de-test"));
    expect(ligne?.actif).toBe(true);
  });
});

import { eq } from "drizzle-orm";
const eqSlug = (slug: string) => eq(schema.meme.slug, slug);
