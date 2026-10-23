import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { and, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

import * as schema from "@/db/schema";
import { semer } from "@/db/seed";
import { servirQuestion } from "@/lib/questions";
import { enregistrerReponse } from "@/lib/reponses";
import { genererJeton, hasherJeton } from "@/lib/session";

import { BASE_TEST_ACTIVE, URL_BASE_TEST } from "./base-test";

describe.skipIf(!BASE_TEST_ACTIVE)("enregistrer une réponse (SCRUM-40)", () => {
  const client = postgres(URL_BASE_TEST, { max: 12, onnotice: () => {} });
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

  type Partie = Awaited<ReturnType<typeof creerPartie>>;

  // Démarre la question (le serveur tire les choix et pose l'heure d'envoi), renvoie ses choix.
  async function envoyer(p: Partie, rang: number) {
    const r = await servirQuestion(db, { id_partie: p.id_partie, rang, jetonHash: p.jetonHash });
    if (r.statut !== "ok") throw new Error(`question non servie : ${r.statut}`);
    return r.question.choix.map((c) => c.id_meme);
  }

  const repondre = (p: Partie, rang: number, id_meme: number | null) =>
    enregistrerReponse(db, { id_partie: p.id_partie, rang, id_meme, jetonHash: p.jetonHash });

  // Recule l'heure d'envoi : simule un joueur qui a mis `secondes` secondes à répondre.
  async function vieillir(p: Partie, rang: number, secondes: number) {
    await db
      .update(schema.partieQuestion)
      .set({ envoye_le: sql`now() - make_interval(secs => ${sql.raw(String(secondes))})` })
      .where(
        and(eq(schema.partieQuestion.id_partie, p.id_partie), eq(schema.partieQuestion.rang, rang)),
      );
  }

  async function etat(p: Partie, rang: number) {
    const [ligne] = await db
      .select({
        repondu_le: schema.partieQuestion.repondu_le,
        points: schema.partieQuestion.points,
        reponse: schema.partieQuestion.reponse_id_meme,
        score: schema.partie.score_total,
      })
      .from(schema.partieQuestion)
      .innerJoin(schema.partie, eq(schema.partie.id_partie, schema.partieQuestion.id_partie))
      .where(
        and(eq(schema.partieQuestion.id_partie, p.id_partie), eq(schema.partieQuestion.rang, rang)),
      );
    if (!ligne) throw new Error("ligne absente");
    return ligne;
  }

  test("bonne réponse immédiate : presque le maximum, correction et fiche révélées", async () => {
    const p = await creerPartie();
    await envoyer(p, 1);
    const r = await repondre(p, 1, p.memes[0] as number);
    if (r.statut !== "ok") throw new Error(`attendu ok, reçu ${r.statut}`);
    const c = r.correction;

    expect(c.juste).toBe(true);
    expect(c.en_retard).toBe(false);
    expect(c.points).toBeGreaterThan(900);
    expect(c.points).toBeLessThanOrEqual(1000);
    expect(c.score_total).toBe(c.points);
    expect(c.bonne_reponse.id_meme).toBe(p.memes[0] as number);
    // Les crédits de l'image s'affichent à la correction (droits-images.md).
    expect(Object.keys(c.bonne_reponse).sort()).toEqual(
      ["annee_origine", "auteur", "id_meme", "licence", "nom", "origine", "source_url"].sort(),
    );
    expect(c.bonne_reponse.source_url).toStartWith("https://commons.wikimedia.org/wiki/File:");

    const e = await etat(p, 1);
    expect(e.repondu_le).not.toBeNull();
    expect(e.points).toBe(c.points);
    expect(e.reponse).toBe(p.memes[0] as number);
    expect(e.score).toBe(c.points);
  });

  test("les points décroissent avec le temps mis, de 1000 à 100 minimum", async () => {
    const mesures: Record<number, number> = {};
    for (const secondes of [5, 10, 15.5]) {
      const p = await creerPartie();
      await envoyer(p, 1);
      await vieillir(p, 1, secondes);
      const r = await repondre(p, 1, p.memes[0] as number);
      if (r.statut !== "ok") throw new Error(`attendu ok, reçu ${r.statut}`);
      mesures[secondes] = r.correction.points;
      // Dans la marge de latence (15 s + 2 s) : encore comptée, au minimum.
      if (secondes === 15.5) expect(r.correction.en_retard).toBe(false);
    }
    expect(mesures[5]).toBeGreaterThan(655);
    expect(mesures[5]).toBeLessThanOrEqual(667);
    expect(mesures[10]).toBeGreaterThan(322);
    expect(mesures[10]).toBeLessThanOrEqual(334);
    expect(mesures[15.5]).toBe(100);
  });

  test("mauvaise réponse : zéro point, mais la correction est donnée", async () => {
    const p = await creerPartie();
    const choix = await envoyer(p, 1);
    const faux = choix.find((id) => id !== p.memes[0]) as number;
    const r = await repondre(p, 1, faux);
    if (r.statut !== "ok") throw new Error(`attendu ok, reçu ${r.statut}`);
    expect(r.correction.juste).toBe(false);
    expect(r.correction.points).toBe(0);
    expect(r.correction.score_total).toBe(0);
    expect(r.correction.bonne_reponse.id_meme).toBe(p.memes[0] as number);
    expect((await etat(p, 1)).reponse).toBe(faux);
  });

  test("temps écoulé (aucun mème choisi) : zéro point, réponse enregistrée vide", async () => {
    const p = await creerPartie();
    await envoyer(p, 1);
    await vieillir(p, 1, 16);
    const r = await repondre(p, 1, null);
    if (r.statut !== "ok") throw new Error(`attendu ok, reçu ${r.statut}`);
    expect(r.correction.juste).toBe(false);
    expect(r.correction.points).toBe(0);
    const e = await etat(p, 1);
    expect(e.reponse).toBeNull();
    expect(e.repondu_le).not.toBeNull();
  });

  test("réponse trop tardive (au-delà de la marge) : zéro point même si juste", async () => {
    const p = await creerPartie();
    await envoyer(p, 1);
    await vieillir(p, 1, 20);
    const r = await repondre(p, 1, p.memes[0] as number);
    if (r.statut !== "ok") throw new Error(`attendu ok, reçu ${r.statut}`);
    expect(r.correction.en_retard).toBe(true);
    expect(r.correction.juste).toBe(true);
    expect(r.correction.points).toBe(0);
    expect(r.correction.score_total).toBe(0);
  });

  test("un mème qui n'est pas dans les 4 choix est refusé, la question reste ouverte", async () => {
    const p = await creerPartie();
    const choix = await envoyer(p, 1);
    const horsChoix = p.memes.find((id) => !choix.includes(id)) as number;
    expect(await repondre(p, 1, horsChoix)).toEqual({ statut: "choix_invalide" });
    expect((await etat(p, 1)).repondu_le).toBeNull();
    expect((await repondre(p, 1, p.memes[0] as number)).statut).toBe("ok");
  });

  test("une question ne se répond qu'une fois, le score n'est pas doublé", async () => {
    const p = await creerPartie();
    await envoyer(p, 1);
    const premiere = await repondre(p, 1, p.memes[0] as number);
    if (premiere.statut !== "ok") throw new Error("attendu ok");
    expect(await repondre(p, 1, p.memes[0] as number)).toEqual({
      statut: "conflit",
      raison: "question_deja_repondue",
    });
    expect((await etat(p, 1)).score).toBe(premiere.correction.points);
  });

  test("des réponses simultanées : une seule est comptée", async () => {
    const p = await creerPartie();
    await envoyer(p, 1);
    // On verrouille la ligne : toutes les réponses lisent « pas encore répondue », puis leur UPDATE
    // attend. À la libération elles s'enchaînent : sans le garde `repondu_le IS NULL`, chacune serait
    // comptée et le score ajouté autant de fois (les appels en phase masqueraient ce défaut).
    let relacher: () => void = () => {};
    const attente = new Promise<void>((resolve) => {
      relacher = resolve;
    });
    const verrou = client.begin(async (tx) => {
      await tx`select 1 from partie_question where id_partie = ${p.id_partie} and rang = 1 for update`;
      await attente;
    });
    await new Promise((resolve) => setTimeout(resolve, 100));
    const appels = Array.from({ length: 8 }, () => repondre(p, 1, p.memes[0] as number));
    await new Promise((resolve) => setTimeout(resolve, 300));
    relacher();
    await verrou;
    const resultats = await Promise.all(appels);
    const ok = resultats.filter((r) => r.statut === "ok");
    expect(ok).toHaveLength(1);
    for (const r of resultats.filter((r) => r.statut !== "ok")) {
      expect(r).toEqual({ statut: "conflit", raison: "question_deja_repondue" });
    }
    const gagnante = ok[0];
    if (gagnante?.statut !== "ok") throw new Error("attendu ok");
    expect((await etat(p, 1)).score).toBe(gagnante.correction.points);
  });

  test("le score s'additionne d'une question à l'autre", async () => {
    const p = await creerPartie();
    await envoyer(p, 1);
    const a = await repondre(p, 1, p.memes[0] as number);
    await envoyer(p, 2);
    await vieillir(p, 2, 5);
    const b = await repondre(p, 2, p.memes[1] as number);
    if (a.statut !== "ok" || b.statut !== "ok") throw new Error("attendu ok");
    expect(b.correction.score_total).toBe(a.correction.points + b.correction.points);
    expect((await etat(p, 2)).score).toBe(b.correction.score_total);
  });

  test("on ne répond pas à une question non envoyée", async () => {
    const p = await creerPartie();
    expect(await repondre(p, 3, p.memes[2] as number)).toEqual({
      statut: "conflit",
      raison: "question_non_envoyee",
    });
    expect((await etat(p, 3)).repondu_le).toBeNull();
  });

  test("session absente, fausse ou d'un autre joueur : rien n'est enregistré", async () => {
    const p = await creerPartie();
    const autre = await creerPartie();
    await envoyer(p, 1);
    const demande = { id_partie: p.id_partie, rang: 1, id_meme: p.memes[0] as number };
    expect(await enregistrerReponse(db, { ...demande, jetonHash: null })).toEqual({
      statut: "session_absente",
    });
    expect(await enregistrerReponse(db, { ...demande, jetonHash: hasherJeton("faux") })).toEqual({
      statut: "introuvable",
    });
    expect(await enregistrerReponse(db, { ...demande, jetonHash: autre.jetonHash })).toEqual({
      statut: "introuvable",
    });
    const e = await etat(p, 1);
    expect(e.repondu_le).toBeNull();
    expect(e.score).toBe(0);
  });

  test("partie terminée : conflit", async () => {
    const p = await creerPartie("terminee");
    expect(await repondre(p, 1, p.memes[0] as number)).toEqual({
      statut: "conflit",
      raison: "partie_terminee",
    });
  });
});
