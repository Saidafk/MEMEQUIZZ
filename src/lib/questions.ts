import { randomInt } from "node:crypto";
import { join } from "node:path";

import { and, eq, inArray, isNull, ne, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import type * as schema from "@/db/schema";
import { joueur, meme, partie, partieQuestion } from "@/db/schema";
import { DUREE_QUESTION_S } from "@/lib/score";
import { QUESTIONS_PAR_PARTIE } from "@/lib/validation";

// Servir une question (SCRUM-39). Règle d'or : la bonne réponse ne sort JAMAIS d'ici, ni dans la
// charge utile, ni dans l'URL de l'image (le slug du mème est le nom de la réponse).
export type BaseDonnees = PostgresJsDatabase<typeof schema>;

const NOMBRE_CHOIX = 4;
// Marge pour juger qu'une question est terminée même sans réponse reçue (latence réseau).
export const GRACE_REPONSE_S = 2;

export type QuestionServie = {
  id_partie: number;
  rang: number;
  total: number;
  image_url: string;
  choix: { id_meme: number; nom: string }[];
  duree_s: number;
  restant_ms: number;
};

export type ErreurQuestion =
  | { statut: "session_absente" }
  | { statut: "introuvable" }
  | {
      statut: "conflit";
      raison:
        | "partie_terminee"
        | "question_deja_repondue"
        | "question_precedente_ouverte"
        | "question_non_envoyee";
    }
  | { statut: "choix_invalide" }
  | { statut: "pas_assez_de_memes" };

export type ResultatQuestion = { statut: "ok"; question: QuestionServie } | ErreurQuestion;
export type ResultatImage = { statut: "ok"; chemin: string } | ErreurQuestion;

export type Demande = { id_partie: number; rang: number; jetonHash: string | null };

// Fisher-Yates avec un tirage cryptographique : la position de la bonne réponse doit rester
// imprévisible, sinon elle se déduirait de l'ordre des choix.
export function melanger<T>(valeurs: readonly T[]): T[] {
  const copie = [...valeurs];
  for (let i = copie.length - 1; i > 0; i -= 1) {
    const j = randomInt(i + 1);
    const a = copie[i] as T;
    copie[i] = copie[j] as T;
    copie[j] = a;
  }
  return copie;
}

// `image_chemin` vient de la base, mais on ne lit jamais un fichier hors de public/memes.
export function resoudreFichierImage(imageChemin: string): string | null {
  if (!/^\/memes\/[a-z0-9]+(-[a-z0-9]+)*\.webp$/.test(imageChemin)) return null;
  return join(process.cwd(), "public", imageChemin);
}

// La ligne n'est lue que si la session est bien celle du propriétaire de la partie : une partie
// d'un autre joueur est « introuvable » (pas de différence observable avec une partie inexistante).
export async function lireLigne(
  db: BaseDonnees,
  { id_partie, rang, jetonHash }: Demande & { jetonHash: string },
) {
  const [ligne] = await db
    .select({
      statut_partie: partie.statut,
      id_meme: partieQuestion.id_meme,
      choix_ids: partieQuestion.choix_ids,
      envoye_le: partieQuestion.envoye_le,
      repondu_le: partieQuestion.repondu_le,
      // Écart calculé par la base : pas de décalage d'horloge entre l'app et PostgreSQL.
      ecoule_ms:
        sql<number>`(extract(epoch from (now() - ${partieQuestion.envoye_le})) * 1000)::float8`.mapWith(
          Number,
        ),
      image_chemin: meme.image_chemin,
      // Fiche du bon mème : n'est révélée qu'à la correction (voir reponses.ts), jamais ici.
      bonne: {
        nom: meme.nom,
        annee_origine: meme.annee_origine,
        origine: meme.origine,
        auteur: meme.auteur,
        licence: meme.licence,
        source_url: meme.source_url,
        article_url: meme.article_url,
      },
    })
    .from(partieQuestion)
    .innerJoin(partie, eq(partie.id_partie, partieQuestion.id_partie))
    .innerJoin(joueur, eq(joueur.id_joueur, partie.id_joueur))
    .innerJoin(meme, eq(meme.id_meme, partieQuestion.id_meme))
    .where(
      and(
        eq(partieQuestion.id_partie, id_partie),
        eq(partieQuestion.rang, rang),
        eq(joueur.token_session_hash, jetonHash),
      ),
    );
  return ligne;
}

export async function servirQuestion(db: BaseDonnees, demande: Demande): Promise<ResultatQuestion> {
  if (demande.jetonHash === null) return { statut: "session_absente" };
  const { id_partie, rang, jetonHash } = demande;

  const ligne = await lireLigne(db, { id_partie, rang, jetonHash });
  if (!ligne) return { statut: "introuvable" };
  if (ligne.statut_partie !== "en_cours") return { statut: "conflit", raison: "partie_terminee" };
  if (ligne.repondu_le !== null) return { statut: "conflit", raison: "question_deja_repondue" };

  // Pas de question en avance : on ne reçoit la suivante qu'une fois la précédente répondue ou
  // expirée. Sinon un joueur pourrait demander les 10 d'un coup, ou lancer le chrono d'une autre.
  if (rang > 1) {
    const [precedente] = await db
      .select({
        fermee: sql<boolean>`(${partieQuestion.repondu_le} is not null or ${partieQuestion.envoye_le} <= now() - make_interval(secs => ${sql.raw(String(DUREE_QUESTION_S + GRACE_REPONSE_S))}))`,
      })
      .from(partieQuestion)
      .where(and(eq(partieQuestion.id_partie, id_partie), eq(partieQuestion.rang, rang - 1)));
    if (precedente?.fermee !== true) {
      return { statut: "conflit", raison: "question_precedente_ouverte" };
    }
  }

  let fiche = ligne;
  if (ligne.choix_ids === null) {
    const faux = await db
      .select({ id_meme: meme.id_meme })
      .from(meme)
      .where(and(eq(meme.actif, true), ne(meme.id_meme, ligne.id_meme)))
      .orderBy(sql`random()`)
      .limit(NOMBRE_CHOIX - 1);
    if (faux.length < NOMBRE_CHOIX - 1) return { statut: "pas_assez_de_memes" };

    // Tirés une seule fois et conservés : un nouveau tirage à chaque appel ferait ressortir la
    // bonne réponse comme seul mème présent dans tous les tirages. `envoye_le IS NULL` rend
    // l'enregistrement atomique : deux appels simultanés ne tirent pas deux jeux de choix.
    const choix = melanger([ligne.id_meme, ...faux.map((f) => f.id_meme)]);
    await db
      .update(partieQuestion)
      .set({ choix_ids: choix, envoye_le: sql`now()` })
      .where(
        and(
          eq(partieQuestion.id_partie, id_partie),
          eq(partieQuestion.rang, rang),
          isNull(partieQuestion.envoye_le),
        ),
      );
    const relue = await lireLigne(db, { id_partie, rang, jetonHash });
    if (!relue?.choix_ids) return { statut: "introuvable" };
    fiche = relue;
  }

  const ids = fiche.choix_ids ?? [];
  const noms = await db
    .select({ id_meme: meme.id_meme, nom: meme.nom })
    .from(meme)
    .where(inArray(meme.id_meme, ids));
  const nomParId = new Map(noms.map((m) => [m.id_meme, m.nom]));

  const restantMs = Math.max(0, DUREE_QUESTION_S * 1000 - (fiche.ecoule_ms ?? 0));
  return {
    statut: "ok",
    question: {
      id_partie,
      rang,
      total: QUESTIONS_PAR_PARTIE,
      image_url: `/api/parties/${id_partie}/questions/${rang}/image`,
      // Même ordre que celui stocké (déjà mélangé) ; rien n'indique laquelle est la bonne.
      choix: ids.map((id) => {
        const nom = nomParId.get(id);
        // Un mème supprimé alors que des choix le référencent est une incohérence : on échoue
        // plutôt que d'afficher un bouton sans nom.
        if (nom === undefined) throw new Error(`mème ${id} introuvable pour la question ${rang}`);
        return { id_meme: id, nom };
      }),
      duree_s: DUREE_QUESTION_S,
      restant_ms: Math.round(restantMs),
    },
  };
}

// L'image n'est servie qu'une fois la question envoyée (sinon on pourrait parcourir les images des
// parties à l'avance) et seulement au propriétaire de la partie.
export async function trouverImageQuestion(
  db: BaseDonnees,
  demande: Demande,
): Promise<ResultatImage> {
  if (demande.jetonHash === null) return { statut: "session_absente" };
  const ligne = await lireLigne(db, { ...demande, jetonHash: demande.jetonHash });
  if (!ligne || ligne.envoye_le === null) return { statut: "introuvable" };
  return { statut: "ok", chemin: ligne.image_chemin };
}

export function reponseErreurQuestion(erreur: ErreurQuestion): Response {
  switch (erreur.statut) {
    case "session_absente":
      return Response.json({ erreur: "session_absente" }, { status: 401 });
    case "introuvable":
      return Response.json({ erreur: "introuvable" }, { status: 404 });
    case "conflit":
      return Response.json({ erreur: erreur.raison }, { status: 409 });
    case "choix_invalide":
      return Response.json({ erreur: "choix_invalide" }, { status: 400 });
    case "pas_assez_de_memes":
      return Response.json({ erreur: "pas_assez_de_memes" }, { status: 503 });
  }
}
