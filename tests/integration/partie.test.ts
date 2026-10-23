import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { and, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

import * as schema from "@/db/schema";
import { semer } from "@/db/seed";
import { creerPartie, lireResultat } from "@/lib/parties";
import { servirQuestion } from "@/lib/questions";
import { enregistrerReponse } from "@/lib/reponses";
import { genererJeton, hasherJeton } from "@/lib/session";

import { BASE_TEST_ACTIVE, URL_BASE_TEST } from "./base-test";

describe.skipIf(!BASE_TEST_ACTIVE)("partie complète (SCRUM-42)", () => {
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

  async function demarrer() {
    compteur += 1;
    const jetonHash = hasherJeton(genererJeton());
    const r = await creerPartie(db, { pseudo: `Joueur${compteur}`, jetonHash });
    if (r.statut !== "ok") throw new Error(`partie non créée : ${r.statut}`);
    return { id_partie: r.id_partie, jetonHash };
  }
  type Partie = Awaited<ReturnType<typeof demarrer>>;

  async function bonneReponse(p: Partie, rang: number) {
    const [q] = await db
      .select({ id: schema.partieQuestion.id_meme })
      .from(schema.partieQuestion)
      .where(
        and(eq(schema.partieQuestion.id_partie, p.id_partie), eq(schema.partieQuestion.rang, rang)),
      );
    if (!q) throw new Error("question absente");
    return q.id;
  }

  // Joue une question comme le ferait le navigateur : GET la question, puis POST la réponse.
  async function jouer(p: Partie, rang: number, mode: "juste" | "faux") {
    const demande = { id_partie: p.id_partie, rang, jetonHash: p.jetonHash };
    const q = await servirQuestion(db, demande);
    if (q.statut !== "ok") throw new Error(`question ${rang} non servie : ${q.statut}`);
    const bonne = await bonneReponse(p, rang);
    const choisi =
      mode === "juste"
        ? bonne
        : (q.question.choix.find((c) => c.id_meme !== bonne)?.id_meme ?? null);
    const r = await enregistrerReponse(db, { ...demande, id_meme: choisi });
    if (r.statut !== "ok") throw new Error(`réponse ${rang} refusée : ${r.statut}`);
    return r.correction;
  }

  async function lire(p: Partie) {
    const r = await lireResultat(db, { id_partie: p.id_partie, jetonHash: p.jetonHash });
    if (r.statut !== "ok") throw new Error(`résultat non lu : ${r.statut}`);
    return r.resultat;
  }

  test("démarrer crée le joueur, la partie et 10 questions sur 10 mèmes différents", async () => {
    const p = await demarrer();
    const questions = await db
      .select()
      .from(schema.partieQuestion)
      .where(eq(schema.partieQuestion.id_partie, p.id_partie))
      .orderBy(schema.partieQuestion.rang);
    expect(questions.map((q) => q.rang)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(new Set(questions.map((q) => q.id_meme)).size).toBe(10);
    // Ni choix ni heure d'envoi : ils sont fixés au premier accès à chaque question (SCRUM-39).
    for (const q of questions) {
      expect(q.choix_ids).toBeNull();
      expect(q.envoye_le).toBeNull();
    }
    const [partie] = await db
      .select()
      .from(schema.partie)
      .where(eq(schema.partie.id_partie, p.id_partie));
    expect(partie?.statut).toBe("en_cours");
    expect(partie?.score_total).toBe(0);
    // Seule l'empreinte du jeton est en base.
    const [joueur] = await db
      .select()
      .from(schema.joueur)
      .where(eq(schema.joueur.id_joueur, partie?.id_joueur ?? 0));
    expect(joueur?.token_session_hash).toBe(p.jetonHash);
    expect(joueur?.token_session_hash).toMatch(/^[0-9a-f]{64}$/);
  });

  test("moins de 10 mèmes actifs : refusé, et rien n'est créé", async () => {
    const avant = await db.select({ n: sql<number>`count(*)::int` }).from(schema.joueur);
    await db
      .update(schema.meme)
      .set({ actif: false })
      .where(sql`${schema.meme.id_meme} > 8`);
    try {
      const r = await creerPartie(db, { pseudo: "Refuse", jetonHash: hasherJeton("x") });
      expect(r).toEqual({ statut: "pas_assez_de_memes" });
    } finally {
      await db.update(schema.meme).set({ actif: true });
    }
    const apres = await db.select({ n: sql<number>`count(*)::int` }).from(schema.joueur);
    expect(apres[0]?.n).toBe(avant[0]?.n);
  });

  test("une partie se joue de bout en bout, puis se clôt avec son score final", async () => {
    await db.delete(schema.partie); // classement isolé : les parties précédentes sont retirées
    const p = await demarrer();

    let somme = 0;
    for (let rang = 1; rang <= 10; rang += 1) {
      const c = await jouer(p, rang, rang % 2 === 1 ? "juste" : "faux");
      somme += c.points;
      expect(c.score_total).toBe(somme);
      // Seule la réponse à la dernière question clôt la partie.
      expect(c.partie_terminee).toBe(rang === 10);
      if (rang < 10) expect((await lire(p)).statut).toBe("en_cours");
    }

    const resultat = await lire(p);
    expect(resultat.statut).toBe("terminee");
    expect(resultat.score).toBe(somme);
    expect(resultat.bonnes).toBe(5);
    expect(resultat.total).toBe(10);
    expect(resultat.reponses).toEqual([
      true,
      false,
      true,
      false,
      true,
      false,
      true,
      false,
      true,
      false,
    ]);
    expect(resultat.rang).toBe(1);
    expect(resultat.nombre_joueurs).toBe(1);

    const [partie] = await db
      .select()
      .from(schema.partie)
      .where(eq(schema.partie.id_partie, p.id_partie));
    expect(partie?.statut).toBe("terminee");
    expect(partie?.termine_le).not.toBeNull();
    expect(partie?.score_total).toBe(somme);
  });

  test("une partie terminée n'accepte plus ni question ni réponse", async () => {
    const p = await demarrer();
    for (let rang = 1; rang <= 10; rang += 1) await jouer(p, rang, "juste");
    const demande = { id_partie: p.id_partie, rang: 1, jetonHash: p.jetonHash };
    expect(await servirQuestion(db, demande)).toEqual({
      statut: "conflit",
      raison: "partie_terminee",
    });
    expect(await enregistrerReponse(db, { ...demande, id_meme: 1 })).toEqual({
      statut: "conflit",
      raison: "partie_terminee",
    });
  });

  test("en cours de partie : pas de rang, et rien sur les questions à venir", async () => {
    const p = await demarrer();
    await jouer(p, 1, "juste");
    const r = await lire(p);
    expect(r.statut).toBe("en_cours");
    expect(r.rang).toBeNull();
    expect(r.nombre_joueurs).toBeNull();
    expect(r.reponses).toEqual([true, ...Array.from({ length: 9 }, () => false)]);
    expect(r.bonnes).toBe(1);
  });

  test("on ne peut pas terminer la partie en sautant des questions", async () => {
    const p = await demarrer();
    const demande = { id_partie: p.id_partie, rang: 10, jetonHash: p.jetonHash };
    expect(await servirQuestion(db, demande)).toEqual({
      statut: "conflit",
      raison: "question_precedente_ouverte",
    });
    expect(await enregistrerReponse(db, { ...demande, id_meme: 1 })).toEqual({
      statut: "conflit",
      raison: "question_non_envoyee",
    });
    expect((await lire(p)).statut).toBe("en_cours");
  });

  test("classement : égalités au même rang, nombre de joueurs = parties terminées", async () => {
    await db.delete(schema.partie);
    const scores = [300, 500, 500, 100];
    const parties: Partie[] = [];
    for (const score of scores) {
      const p = await demarrer();
      await db
        .update(schema.partie)
        .set({ statut: "terminee", score_total: score, termine_le: sql`now()` })
        .where(eq(schema.partie.id_partie, p.id_partie));
      parties.push(p);
    }
    const enCours = await demarrer(); // une partie en cours ne compte pas
    const rangs = await Promise.all(parties.map(async (p) => (await lire(p)).rang));
    expect(rangs).toEqual([3, 1, 1, 4]);
    expect((await lire(parties[0] as Partie)).nombre_joueurs).toBe(4);
    expect((await lire(enCours)).rang).toBeNull();
  });

  test("le résultat n'est lu que par son propriétaire", async () => {
    const p = await demarrer();
    const autre = await demarrer();
    expect(await lireResultat(db, { id_partie: p.id_partie, jetonHash: null })).toEqual({
      statut: "session_absente",
    });
    expect(
      await lireResultat(db, { id_partie: p.id_partie, jetonHash: hasherJeton("faux") }),
    ).toEqual({ statut: "introuvable" });
    expect(await lireResultat(db, { id_partie: p.id_partie, jetonHash: autre.jetonHash })).toEqual({
      statut: "introuvable",
    });
    expect(await lireResultat(db, { id_partie: 999_999, jetonHash: p.jetonHash })).toEqual({
      statut: "introuvable",
    });
  });
});
