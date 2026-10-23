import { and, eq, gt, sql } from "drizzle-orm";

import { joueur, meme, partie, partieQuestion } from "@/db/schema";
import type { BaseDonnees, ErreurQuestion } from "@/lib/questions";
import { QUESTIONS_PAR_PARTIE } from "@/lib/validation";

// Cycle d'une partie (SCRUM-42) : en_cours -> terminee, quand la dernière question reçoit sa
// réponse (voir reponses.ts). Le joueur anonyme et la partie sont créés ensemble, avec les 10
// questions déjà fixées : les mèmes sont tirés une fois pour toutes au démarrage.
export type PartieCreee = { statut: "ok"; id_partie: number; total: number };

export async function creerPartie(
  db: BaseDonnees,
  { pseudo, jetonHash }: { pseudo: string; jetonHash: string },
): Promise<PartieCreee | Extract<ErreurQuestion, { statut: "pas_assez_de_memes" }>> {
  return db.transaction(async (tx) => {
    // 10 mèmes différents tirés au hasard : aucun mème deux fois dans la même partie.
    const tires = await tx
      .select({ id_meme: meme.id_meme })
      .from(meme)
      .where(eq(meme.actif, true))
      .orderBy(sql`random()`)
      .limit(QUESTIONS_PAR_PARTIE);
    if (tires.length < QUESTIONS_PAR_PARTIE) return { statut: "pas_assez_de_memes" } as const;

    const [nouveauJoueur] = await tx
      .insert(joueur)
      .values({ pseudo, token_session_hash: jetonHash })
      .returning({ id: joueur.id_joueur });
    if (!nouveauJoueur) throw new Error("joueur non créé");

    const [nouvellePartie] = await tx
      .insert(partie)
      .values({ id_joueur: nouveauJoueur.id })
      .returning({ id: partie.id_partie });
    if (!nouvellePartie) throw new Error("partie non créée");

    await tx
      .insert(partieQuestion)
      .values(
        tires.map((t, i) => ({ id_partie: nouvellePartie.id, rang: i + 1, id_meme: t.id_meme })),
      );
    return { statut: "ok", id_partie: nouvellePartie.id, total: QUESTIONS_PAR_PARTIE } as const;
  });
}

export type ResultatPartie = {
  statut: "en_cours" | "terminee" | "abandonnee";
  pseudo: string;
  score: number;
  bonnes: number;
  total: number;
  // Une entrée par question ; fausse tant qu'il n'y a pas eu de bonne réponse.
  reponses: boolean[];
  // Nombre de questions closes (répondues ou temps écoulé signalé) : où reprendre la partie.
  repondues: number;
  // Position dans le classement des parties terminées (égalité = même rang) ; absent en cours de partie.
  rang: number | null;
  nombre_joueurs: number | null;
};

export type ResultatLecturePartie =
  | { statut: "ok"; resultat: ResultatPartie }
  | Extract<ErreurQuestion, { statut: "session_absente" | "introuvable" }>;

export async function lireResultat(
  db: BaseDonnees,
  { id_partie, jetonHash }: { id_partie: number; jetonHash: string | null },
): Promise<ResultatLecturePartie> {
  if (jetonHash === null) return { statut: "session_absente" };

  // Seul le propriétaire (jeton de session) lit sa partie ; une autre partie est « introuvable ».
  const [ligne] = await db
    .select({ statut: partie.statut, score: partie.score_total, pseudo: joueur.pseudo })
    .from(partie)
    .innerJoin(joueur, eq(joueur.id_joueur, partie.id_joueur))
    .where(and(eq(partie.id_partie, id_partie), eq(joueur.token_session_hash, jetonHash)));
  if (!ligne) return { statut: "introuvable" };

  const questions = await db
    .select({
      rang: partieQuestion.rang,
      id_meme: partieQuestion.id_meme,
      reponse: partieQuestion.reponse_id_meme,
      repondu_le: partieQuestion.repondu_le,
    })
    .from(partieQuestion)
    .where(eq(partieQuestion.id_partie, id_partie))
    .orderBy(partieQuestion.rang);
  // Une question sans réponse n'est jamais « juste » : on ne révèle rien sur celles à venir.
  const reponses = questions.map((q) => q.repondu_le !== null && q.reponse === q.id_meme);

  let rang: number | null = null;
  let nombreJoueurs: number | null = null;
  if (ligne.statut === "terminee") {
    const [mieux] = await db
      .select({ n: sql<number>`count(*)::int`.mapWith(Number) })
      .from(partie)
      .where(and(eq(partie.statut, "terminee"), gt(partie.score_total, ligne.score)));
    const [total] = await db
      .select({ n: sql<number>`count(*)::int`.mapWith(Number) })
      .from(partie)
      .where(eq(partie.statut, "terminee"));
    rang = (mieux?.n ?? 0) + 1;
    nombreJoueurs = total?.n ?? 1;
  }

  return {
    statut: "ok",
    resultat: {
      statut: ligne.statut,
      pseudo: ligne.pseudo,
      score: ligne.score,
      bonnes: reponses.filter(Boolean).length,
      total: QUESTIONS_PAR_PARTIE,
      reponses,
      // Permet de reprendre une partie après un rechargement : la prochaine question est repondues + 1.
      repondues: questions.filter((q) => q.repondu_le !== null).length,
      rang,
      nombre_joueurs: nombreJoueurs,
    },
  };
}
