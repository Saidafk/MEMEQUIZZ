import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { and, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

import * as schema from "@/db/schema";
import { semer } from "@/db/seed";
import { lireClassement } from "@/lib/classement";
import { lireResultat } from "@/lib/parties";
import { servirQuestion } from "@/lib/questions";
import { enregistrerReponse } from "@/lib/reponses";
import {
  ATTENTE_MAX_SALLE_MIN,
  DELAI_QUESTION_SALLE_S,
  JOUEURS_MAX_SALLE,
  avancerSalle,
  creerSalle,
  lancerSalle,
  lireEtatSalle,
  rejoindreSalle,
} from "@/lib/salles";
import { genererJeton, hasherJeton } from "@/lib/session";

import { BASE_TEST_ACTIVE, URL_BASE_TEST } from "./base-test";

describe.skipIf(!BASE_TEST_ACTIVE)("salles multijoueur (SCRUM-83/84)", () => {
  const client = postgres(URL_BASE_TEST, { max: 10, onnotice: () => {} });
  const db = drizzle(client, { schema });

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

  const session = () => hasherJeton(genererJeton());

  async function salleADeux() {
    const hote = session();
    const invite = session();
    const creee = await creerSalle(db, { pseudo: "Hote", jetonHash: hote });
    if (creee.statut !== "ok") throw new Error(creee.statut);
    const rejointe = await rejoindreSalle(db, {
      code: creee.code,
      pseudo: "Invite",
      jetonHash: invite,
    });
    if (rejointe.statut !== "ok") throw new Error(rejointe.statut);
    const [ligne] = await db
      .select({ id: schema.salle.id_salle })
      .from(schema.salle)
      .where(eq(schema.salle.code, creee.code));
    return {
      code: creee.code,
      id_salle: ligne?.id ?? 0,
      hote: { jetonHash: hote, id_partie: creee.id_partie },
      invite: { jetonHash: invite, id_partie: rejointe.id_partie },
    };
  }
  type Joueur = Awaited<ReturnType<typeof salleADeux>>["hote"];

  async function memes(id_partie: number) {
    const lignes = await db
      .select({ id: schema.partieQuestion.id_meme })
      .from(schema.partieQuestion)
      .where(eq(schema.partieQuestion.id_partie, id_partie))
      .orderBy(schema.partieQuestion.rang);
    return lignes.map((l) => l.id);
  }

  const demande = (j: Joueur, rang: number) => ({ ...j, rang });

  test("deux joueurs dans la même salle, avec les mêmes mèmes dans le même ordre", async () => {
    const s = await salleADeux();
    expect(await memes(s.invite.id_partie)).toEqual(await memes(s.hote.id_partie));

    const vu = await lireEtatSalle(db, { code: s.code, jetonHash: s.invite.jetonHash });
    if (vu.statut !== "ok") throw new Error(vu.statut);
    expect(vu.etat.statut).toBe("attente");
    expect(vu.etat.id_partie).toBe(s.invite.id_partie);
    expect(vu.etat.hote).toBe(false);
    expect(vu.etat.joueurs.map((j) => [j.pseudo, j.hote, j.moi]).sort()).toEqual([
      ["Hote", true, false],
      ["Invite", false, true],
    ]);
  });

  test("seul un membre lit l'état ; seul l'hôte lance, une seule fois", async () => {
    const s = await salleADeux();
    const curieux = await lireEtatSalle(db, { code: s.code, jetonHash: session() });
    expect(curieux.statut).toBe("introuvable");
    expect(await lancerSalle(db, { code: s.code, jetonHash: s.invite.jetonHash })).toEqual({
      statut: "interdit",
      raison: "pas_hote",
    });
    expect(await lancerSalle(db, { code: s.code, jetonHash: s.hote.jetonHash })).toEqual({
      statut: "ok",
    });
    expect(await lancerSalle(db, { code: s.code, jetonHash: s.hote.jetonHash })).toEqual({
      statut: "conflit",
      raison: "salle_commencee",
    });
    // Plus d'arrivée une fois la partie lancée.
    const tard = await rejoindreSalle(db, { code: s.code, pseudo: "Tard", jetonHash: session() });
    expect(tard).toEqual({ statut: "conflit", raison: "salle_commencee" });
  });

  test("code inconnu et salle pleine sont refusés", async () => {
    const perdu = await rejoindreSalle(db, {
      code: "ZZZZZZ",
      pseudo: "Perdu",
      jetonHash: session(),
    });
    expect(perdu).toEqual({ statut: "introuvable" });

    const s = await salleADeux();
    for (let i = 2; i < JOUEURS_MAX_SALLE; i += 1) {
      const r = await rejoindreSalle(db, {
        code: s.code,
        pseudo: `Joueur${i}`,
        jetonHash: session(),
      });
      expect(r.statut).toBe("ok");
    }
    const deTrop = await rejoindreSalle(db, {
      code: s.code,
      pseudo: "DeTrop",
      jetonHash: session(),
    });
    expect(deTrop).toEqual({ statut: "conflit", raison: "salle_pleine" });
  });

  test("une salle en attente depuis trop longtemps n'accepte plus d'arrivée", async () => {
    const s = await salleADeux();
    await db
      .update(schema.salle)
      .set({ cree_le: sql`now() - make_interval(mins => ${ATTENTE_MAX_SALLE_MIN + 1})` })
      .where(eq(schema.salle.code, s.code));
    const tard = await rejoindreSalle(db, { code: s.code, pseudo: "Tard", jetonHash: session() });
    expect(tard).toEqual({ statut: "introuvable" });
  });

  test("la salle donne le rythme : question suivante quand tous ont répondu", async () => {
    const s = await salleADeux();

    // Avant le lancement, aucune question n'est servie.
    expect(await servirQuestion(db, demande(s.hote, 1))).toEqual({
      statut: "conflit",
      raison: "question_pas_encore_ouverte",
    });
    await lancerSalle(db, { code: s.code, jetonHash: s.hote.jetonHash });

    const q1 = await servirQuestion(db, demande(s.hote, 1));
    if (q1.statut !== "ok") throw new Error(q1.statut);
    const [bonne] = await memes(s.hote.id_partie);
    await enregistrerReponse(db, { ...demande(s.hote, 1), id_meme: bonne ?? null });
    await avancerSalle(db, s.id_salle);
    // L'invité n'a pas répondu : pas de question 2, même pour qui a déjà répondu.
    expect(await servirQuestion(db, demande(s.hote, 2))).toEqual({
      statut: "conflit",
      raison: "question_pas_encore_ouverte",
    });

    // Le classement montre déjà le score de l'hôte et qui a répondu.
    const pendant = await lireEtatSalle(db, { code: s.code, jetonHash: s.invite.jetonHash });
    if (pendant.statut !== "ok") throw new Error(pendant.statut);
    const hoteVu = pendant.etat.joueurs.find((j) => j.pseudo === "Hote");
    expect(hoteVu?.score).toBeGreaterThan(0);
    expect(hoteVu?.a_repondu).toBe(true);
    expect(pendant.etat.joueurs[0]?.pseudo).toBe("Hote");

    // L'invité signale le temps écoulé : tout le monde a répondu, la question 2 s'ouvre.
    await servirQuestion(db, demande(s.invite, 1));
    await enregistrerReponse(db, { ...demande(s.invite, 1), id_meme: null });
    await avancerSalle(db, s.id_salle);
    // Deux flux qui avancent en même temps n'ouvrent pas la 3 : la 2 n'est pas close.
    await avancerSalle(db, s.id_salle);
    const apres = await lireEtatSalle(db, { code: s.code, jetonHash: s.hote.jetonHash });
    expect(apres.statut === "ok" && apres.etat.rang_courant).toBe(2);
    expect((await servirQuestion(db, demande(s.hote, 2))).statut).toBe("ok");
  });

  test("un joueur absent ne bloque pas : délai écoulé, fin de salle, parties closes", async () => {
    const s = await salleADeux();
    await lancerSalle(db, { code: s.code, jetonHash: s.hote.jetonHash });
    // Personne ne répond : on simule l'écoulement du délai sur chaque question.
    for (let rang = 1; rang <= 10; rang += 1) {
      await db
        .update(schema.salle)
        .set({
          question_ouverte_le: sql`now() - make_interval(secs => ${DELAI_QUESTION_SALLE_S + 1})`,
        })
        .where(eq(schema.salle.id_salle, s.id_salle));
      await avancerSalle(db, s.id_salle);
    }
    const fin = await lireEtatSalle(db, { code: s.code, jetonHash: s.hote.jetonHash });
    expect(fin.statut === "ok" && fin.etat.statut).toBe("terminee");
    // Une question passée sans avoir été envoyée ne se rattrape pas avec un chrono neuf (audit v0.9).
    expect(await servirQuestion(db, demande(s.hote, 1))).toEqual({
      statut: "conflit",
      raison: "partie_terminee",
    });
    const ouvertes = await db
      .select({ id: schema.partie.id_partie })
      .from(schema.partie)
      .where(and(eq(schema.partie.id_salle, s.id_salle), eq(schema.partie.statut, "en_cours")));
    expect(ouvertes).toEqual([]);
  });

  test("une question manquée en salle ne se rattrape pas", async () => {
    const s = await salleADeux();
    await lancerSalle(db, { code: s.code, jetonHash: s.hote.jetonHash });
    // La question 1 passe par délai sans que l'invité l'ait demandée.
    await db
      .update(schema.salle)
      .set({
        question_ouverte_le: sql`now() - make_interval(secs => ${DELAI_QUESTION_SALLE_S + 1})`,
      })
      .where(eq(schema.salle.id_salle, s.id_salle));
    await avancerSalle(db, s.id_salle);
    expect(await servirQuestion(db, demande(s.invite, 1))).toEqual({
      statut: "conflit",
      raison: "question_manquee",
    });
    expect((await servirQuestion(db, demande(s.invite, 2))).statut).toBe("ok");
  });

  test("les parties jouées en salle ne comptent pas au classement général", async () => {
    const s = await salleADeux();
    await lancerSalle(db, { code: s.code, jetonHash: s.hote.jetonHash });
    for (let rang = 1; rang <= 10; rang += 1) {
      await db
        .update(schema.salle)
        .set({
          question_ouverte_le: sql`now() - make_interval(secs => ${DELAI_QUESTION_SALLE_S + 1})`,
        })
        .where(eq(schema.salle.id_salle, s.id_salle));
      await avancerSalle(db, s.id_salle);
    }
    // Mèmes communs : une deuxième session pourrait répondre en connaissant la correction de la
    // première. Ces parties ne sont donc pas classées (audit v0.9).
    const classement = await lireClassement(db, {
      periode: "toujours",
      jetonHash: s.hote.jetonHash,
      limite: 1000,
    });
    expect(classement.some((l) => l.moi)).toBe(false);
    const resultat = await lireResultat(db, s.hote);
    expect(resultat.statut === "ok" && resultat.resultat.rang).toBeNull();
  });
});
