import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { and, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

import * as schema from "@/db/schema";
import { semer } from "@/db/seed";
import { servirQuestion, trouverImageQuestion } from "@/lib/questions";
import { genererJeton, hasherJeton } from "@/lib/session";

import { BASE_TEST_ACTIVE, URL_BASE_TEST } from "./base-test";

const CODE_CHECK = "23514";

describe.skipIf(!BASE_TEST_ACTIVE)("servir une question (SCRUM-39)", () => {
  const client = postgres(URL_BASE_TEST, { max: 10, onnotice: () => {} });
  const db = drizzle(client, { schema });
  let compteur = 0;

  beforeAll(async () => {
    await client`DROP SCHEMA IF EXISTS public CASCADE`;
    await client`DROP SCHEMA IF EXISTS drizzle CASCADE`;
    await client`CREATE SCHEMA public`;
    await migrate(db, { migrationsFolder: "./drizzle" });
    await semer(db);
  });

  afterAll(async () => {
    await client.end();
  });

  // Partie de 10 questions, comme celle que créera SCRUM-42 : mème fixé par rang,
  // mais ni choix ni heure d'envoi (le serveur les fixe au premier accès).
  async function creerPartie(statut: "en_cours" | "terminee" = "en_cours") {
    const jeton = genererJeton();
    compteur += 1;
    const [joueur] = await db
      .insert(schema.joueur)
      .values({ pseudo: `Joueur${compteur}`, token_session_hash: hasherJeton(jeton) })
      .returning({ id: schema.joueur.id_joueur });
    if (!joueur) throw new Error("joueur non créé");
    const [partie] = await db
      .insert(schema.partie)
      .values({ id_joueur: joueur.id, statut })
      .returning({ id: schema.partie.id_partie });
    if (!partie) throw new Error("partie non créée");
    const memes = await db
      .select({ id: schema.meme.id_meme })
      .from(schema.meme)
      .orderBy(schema.meme.id_meme)
      .limit(10);
    await db
      .insert(schema.partieQuestion)
      .values(memes.map((m, i) => ({ id_partie: partie.id, rang: i + 1, id_meme: m.id })));
    return { id_partie: partie.id, jetonHash: hasherJeton(jeton), memes: memes.map((m) => m.id) };
  }

  const demande = (p: { id_partie: number; jetonHash: string }, rang: number) => ({
    id_partie: p.id_partie,
    rang,
    jetonHash: p.jetonHash,
  });

  test("sert 4 choix distincts dont la bonne, sans jamais la désigner", async () => {
    const p = await creerPartie();
    const bonne = p.memes[0] as number;
    const [fiche] = await db.select().from(schema.meme).where(eq(schema.meme.id_meme, bonne));
    const resultat = await servirQuestion(db, demande(p, 1));
    expect(resultat.statut).toBe("ok");
    if (resultat.statut !== "ok") return;
    const q = resultat.question;

    expect(q.choix).toHaveLength(4);
    expect(new Set(q.choix.map((c) => c.id_meme)).size).toBe(4);
    expect(q.choix.map((c) => c.id_meme)).toContain(bonne);

    // Whitelist stricte : aucun champ ne peut désigner la bonne réponse.
    expect(Object.keys(q).sort()).toEqual(
      ["choix", "duree_s", "id_partie", "image_url", "rang", "restant_ms", "total"].sort(),
    );
    for (const c of q.choix) expect(Object.keys(c).sort()).toEqual(["id_meme", "nom"]);

    // Ni le slug, ni le chemin de l'image (qui contient le slug) ne sortent de la charge utile.
    const json = JSON.stringify(q);
    expect(fiche).toBeDefined();
    expect(json).not.toContain(fiche?.slug ?? "?");
    expect(json).not.toContain("/memes/");
    expect(json).not.toContain("slug");
    expect(q.image_url).toBe(`/api/parties/${p.id_partie}/questions/1/image`);
    expect(q.total).toBe(10);
  });

  test("un deuxième appel renvoie les mêmes choix, sans nouveau tirage", async () => {
    const p = await creerPartie();
    const a = await servirQuestion(db, demande(p, 1));
    const b = await servirQuestion(db, demande(p, 1));
    const c = await servirQuestion(db, demande(p, 1));
    if (a.statut !== "ok" || b.statut !== "ok" || c.statut !== "ok") throw new Error("attendu ok");
    expect(b.question.choix).toEqual(a.question.choix);
    expect(c.question.choix).toEqual(a.question.choix);
    expect(c.question.restant_ms).toBeLessThanOrEqual(a.question.restant_ms);
  });

  test("des appels simultanés ne tirent qu'un seul jeu de choix", async () => {
    const p = await creerPartie();
    const resultats = await Promise.all(
      Array.from({ length: 8 }, () => servirQuestion(db, demande(p, 1))),
    );
    const jeux = new Set(
      resultats.map((r) => (r.statut === "ok" ? JSON.stringify(r.question.choix) : r.statut)),
    );
    expect(jeux.size).toBe(1);
    expect([...jeux][0]).not.toBe("introuvable");
  });

  test("plusieurs tirages en concurrence : le premier enregistrement gagne", async () => {
    const p = await creerPartie();
    // On verrouille la ligne : les appels lisent tous « pas encore envoyée », tirent chacun leurs
    // choix, puis leur UPDATE attend. À la libération, ils s'enchaînent : sans le garde
    // `envoye_le IS NULL`, chacun écraserait le précédent.
    let relacher: () => void = () => {};
    const attente = new Promise<void>((resolve) => {
      relacher = resolve;
    });
    const transaction = client.begin(async (tx) => {
      await tx`select 1 from partie_question where id_partie = ${p.id_partie} and rang = 1 for update`;
      await attente;
    });
    await new Promise((resolve) => setTimeout(resolve, 100));

    const appels = Array.from({ length: 12 }, () => servirQuestion(db, demande(p, 1)));
    await new Promise((resolve) => setTimeout(resolve, 300));
    relacher();
    await transaction;
    const resultats = await Promise.all(appels);

    const [stocke] = await db
      .select({ choix_ids: schema.partieQuestion.choix_ids })
      .from(schema.partieQuestion)
      .where(
        and(eq(schema.partieQuestion.id_partie, p.id_partie), eq(schema.partieQuestion.rang, 1)),
      );
    for (const r of resultats) {
      if (r.statut !== "ok") throw new Error(`attendu ok, reçu ${r.statut}`);
      expect(r.question.choix.map((c) => c.id_meme)).toEqual(stocke?.choix_ids ?? []);
    }
  });

  test("la position de la bonne réponse varie d'une question à l'autre", async () => {
    const positions = new Set<number>();
    for (let i = 0; i < 40; i += 1) {
      const p = await creerPartie();
      const r = await servirQuestion(db, demande(p, 1));
      if (r.statut !== "ok") throw new Error("attendu ok");
      positions.add(r.question.choix.findIndex((c) => c.id_meme === p.memes[0]));
    }
    expect(positions.size).toBeGreaterThanOrEqual(3);
  });

  test("session absente, fausse, ou d'un autre joueur : aucune fuite", async () => {
    const p = await creerPartie();
    const autre = await creerPartie();
    expect(await servirQuestion(db, { id_partie: p.id_partie, rang: 1, jetonHash: null })).toEqual({
      statut: "session_absente",
    });
    expect(
      await servirQuestion(db, { id_partie: p.id_partie, rang: 1, jetonHash: hasherJeton("faux") }),
    ).toEqual({ statut: "introuvable" });
    expect(
      await servirQuestion(db, { id_partie: p.id_partie, rang: 1, jetonHash: autre.jetonHash }),
    ).toEqual({ statut: "introuvable" });
    // Et la question n'a pas été envoyée par ces tentatives : le chrono n'a pas démarré.
    const [ligne] = await db
      .select({ envoye_le: schema.partieQuestion.envoye_le })
      .from(schema.partieQuestion)
      .where(eq(schema.partieQuestion.id_partie, p.id_partie));
    expect(ligne?.envoye_le).toBeNull();
  });

  test("rang inexistant : introuvable", async () => {
    const p = await creerPartie();
    expect(await servirQuestion(db, demande(p, 11))).toEqual({ statut: "introuvable" });
  });

  test("pas de question en avance : la précédente doit être répondue ou expirée", async () => {
    const p = await creerPartie();
    expect((await servirQuestion(db, demande(p, 1))).statut).toBe("ok");
    expect(await servirQuestion(db, demande(p, 2))).toEqual({
      statut: "conflit",
      raison: "question_precedente_ouverte",
    });
    // La question 3 n'est pas accessible non plus : on ne saute pas de rang.
    expect(await servirQuestion(db, demande(p, 3))).toEqual({
      statut: "conflit",
      raison: "question_precedente_ouverte",
    });

    await db
      .update(schema.partieQuestion)
      .set({ repondu_le: sql`now()` })
      .where(eq(schema.partieQuestion.id_partie, p.id_partie));
    // Toutes marquées répondues : la 2 est servie ; la 1 est désormais « déjà répondue ».
    expect((await servirQuestion(db, demande(p, 1))).statut).toBe("conflit");
  });

  test("une question précédente expirée sans réponse ne bloque pas la suivante", async () => {
    const p = await creerPartie();
    await servirQuestion(db, demande(p, 1));
    await db
      .update(schema.partieQuestion)
      .set({ envoye_le: sql`now() - interval '30 seconds'` })
      .where(
        and(eq(schema.partieQuestion.id_partie, p.id_partie), eq(schema.partieQuestion.rang, 1)),
      );
    expect((await servirQuestion(db, demande(p, 2))).statut).toBe("ok");
  });

  test("question déjà répondue ou partie terminée : conflit", async () => {
    const p = await creerPartie();
    await servirQuestion(db, demande(p, 1));
    await db
      .update(schema.partieQuestion)
      .set({ repondu_le: sql`now()` })
      .where(eq(schema.partieQuestion.id_partie, p.id_partie));
    expect(await servirQuestion(db, demande(p, 1))).toEqual({
      statut: "conflit",
      raison: "question_deja_repondue",
    });

    const finie = await creerPartie("terminee");
    expect(await servirQuestion(db, demande(finie, 1))).toEqual({
      statut: "conflit",
      raison: "partie_terminee",
    });
  });

  test("le temps restant suit l'horloge de la base", async () => {
    const p = await creerPartie();
    await servirQuestion(db, demande(p, 1));
    await db
      .update(schema.partieQuestion)
      .set({ envoye_le: sql`now() - interval '5 seconds'` })
      .where(
        and(eq(schema.partieQuestion.id_partie, p.id_partie), eq(schema.partieQuestion.rang, 1)),
      );
    const r = await servirQuestion(db, demande(p, 1));
    if (r.statut !== "ok") throw new Error("attendu ok");
    expect(r.question.restant_ms).toBeGreaterThan(9_000);
    expect(r.question.restant_ms).toBeLessThanOrEqual(10_000);
  });

  test("moins de 4 mèmes actifs : erreur claire, sans chrono démarré", async () => {
    const p = await creerPartie();
    await db
      .update(schema.meme)
      .set({ actif: false })
      .where(sql`${schema.meme.id_meme} > 3`);
    try {
      expect(await servirQuestion(db, demande(p, 1))).toEqual({ statut: "pas_assez_de_memes" });
      const [ligne] = await db
        .select({ envoye_le: schema.partieQuestion.envoye_le })
        .from(schema.partieQuestion)
        .where(eq(schema.partieQuestion.id_partie, p.id_partie));
      expect(ligne?.envoye_le).toBeNull();
    } finally {
      await db.update(schema.meme).set({ actif: true });
    }
  });

  test("l'image n'est donnée qu'après l'envoi de la question et au bon joueur", async () => {
    const p = await creerPartie();
    const avant = await trouverImageQuestion(db, demande(p, 1));
    expect(avant).toEqual({ statut: "introuvable" });

    await servirQuestion(db, demande(p, 1));
    const apres = await trouverImageQuestion(db, demande(p, 1));
    const [bonne] = await db
      .select({ image_chemin: schema.meme.image_chemin })
      .from(schema.meme)
      .where(eq(schema.meme.id_meme, p.memes[0] as number));
    expect(apres).toEqual({ statut: "ok", chemin: bonne?.image_chemin as string });

    expect(
      await trouverImageQuestion(db, {
        id_partie: p.id_partie,
        rang: 1,
        jetonHash: hasherJeton("x"),
      }),
    ).toEqual({ statut: "introuvable" });
    expect(
      await trouverImageQuestion(db, { id_partie: p.id_partie, rang: 1, jetonHash: null }),
    ).toEqual({ statut: "session_absente" });
  });

  test("la base refuse des choix incohérents (3 choix, ou choix sans heure d'envoi)", async () => {
    const p = await creerPartie();
    await expect(
      Promise.resolve(
        db
          .update(schema.partieQuestion)
          .set({ choix_ids: [1, 2, 3], envoye_le: sql`now()` })
          .where(eq(schema.partieQuestion.id_partie, p.id_partie)),
      ),
    ).rejects.toMatchObject({ cause: { code: CODE_CHECK } });
    await expect(
      Promise.resolve(
        db
          .update(schema.partieQuestion)
          .set({ choix_ids: [1, 2, 3, 4] })
          .where(eq(schema.partieQuestion.id_partie, p.id_partie)),
      ),
    ).rejects.toMatchObject({ cause: { code: CODE_CHECK } });
  });
});
