import { TransactionRollbackError, and, eq, isNull, sql } from "drizzle-orm";

import { partie, partieQuestion } from "@/db/schema";
import {
  GRACE_REPONSE_S,
  type BaseDonnees,
  type Demande,
  type ErreurQuestion,
  lireLigne,
} from "@/lib/questions";
import { DUREE_QUESTION_S, calculerPoints } from "@/lib/score";
import { QUESTIONS_PAR_PARTIE } from "@/lib/validation";

// Enregistrer une réponse (SCRUM-40). Tout est décidé ici, côté serveur : ni le délai, ni le score,
// ni la justesse ne viennent du client, qui n'envoie que le mème choisi.
export type Correction = {
  id_partie: number;
  rang: number;
  juste: boolean;
  en_retard: boolean;
  points: number;
  score_total: number;
  delai_ms: number;
  partie_terminee: boolean;
  // La bonne réponse n'est révélée qu'ici, une fois la question close (répondue ou expirée).
  bonne_reponse: {
    id_meme: number;
    nom: string;
    annee_origine: number | null;
    origine: string | null;
    auteur: string;
    licence: string;
    source_url: string;
    article_url: string | null;
  };
};

export type ResultatReponse = { statut: "ok"; correction: Correction } | ErreurQuestion;

export async function enregistrerReponse(
  db: BaseDonnees,
  demande: Demande & { id_meme: number | null },
): Promise<ResultatReponse> {
  if (demande.jetonHash === null) return { statut: "session_absente" };
  const { id_partie, rang, id_meme, jetonHash } = demande;

  const ligne = await lireLigne(db, { id_partie, rang, jetonHash });
  if (!ligne) return { statut: "introuvable" };
  if (ligne.statut_partie !== "en_cours") return { statut: "conflit", raison: "partie_terminee" };
  // Pas de réponse à une question que le serveur n'a pas envoyée : sinon pas de chrono, donc pas de
  // délai à mesurer, et on pourrait répondre « à l'avance ».
  if (ligne.envoye_le === null || ligne.choix_ids === null) {
    return { statut: "conflit", raison: "question_non_envoyee" };
  }
  if (ligne.repondu_le !== null) return { statut: "conflit", raison: "question_deja_repondue" };
  // Seuls les 4 mèmes proposés sont une réponse valide.
  if (id_meme !== null && !ligne.choix_ids.includes(id_meme)) return { statut: "choix_invalide" };

  // Délai mesuré par la base entre l'envoi de la question et maintenant. Au-delà de la durée plus la
  // marge de latence, la réponse arrive trop tard : zéro point, mais la correction est donnée.
  // Le délai est lu avec la ligne, quelques millisecondes avant l'UPDATE : écart négligeable.
  const delaiMs = Math.round(ligne.ecoule_ms ?? 0);
  const enRetard = delaiMs > (DUREE_QUESTION_S + GRACE_REPONSE_S) * 1000;
  const juste = id_meme !== null && id_meme === ligne.id_meme;
  const points = enRetard ? 0 : calculerPoints(juste, DUREE_QUESTION_S - delaiMs / 1000);

  // `repondu_le IS NULL` rend l'enregistrement atomique : si deux réponses arrivent ensemble, une
  // seule est comptée, et le score n'est ajouté qu'une fois (même transaction).
  const scoreTotal = await db
    .transaction(async (tx) => {
      const enregistree = await tx
        .update(partieQuestion)
        .set({ reponse_id_meme: id_meme, repondu_le: sql`now()`, points })
        .where(
          and(
            eq(partieQuestion.id_partie, id_partie),
            eq(partieQuestion.rang, rang),
            isNull(partieQuestion.repondu_le),
          ),
        )
        .returning({ rang: partieQuestion.rang });
      if (enregistree.length === 0) return null;

      // Pas de point ajouté à une partie close entre la lecture et ici (fin de partie, SCRUM-42) :
      // dans ce cas on annule aussi la réponse, pour qu'elle ne soit pas enregistrée sans son score.
      const [maj] = await tx
        .update(partie)
        .set({ score_total: sql`${partie.score_total} + ${points}` })
        .where(and(eq(partie.id_partie, id_partie), eq(partie.statut, "en_cours")))
        .returning({ score_total: partie.score_total });
      if (!maj) return tx.rollback();

      // La réponse à la dernière question clôt la partie, dans la même transaction que son score :
      // une partie terminée a toujours son score final, et n'accepte plus aucune réponse.
      if (rang === QUESTIONS_PAR_PARTIE) {
        await tx
          .update(partie)
          .set({ statut: "terminee", termine_le: sql`now()` })
          .where(eq(partie.id_partie, id_partie));
      }
      return maj.score_total;
    })
    .catch((erreur: unknown) => {
      if (erreur instanceof TransactionRollbackError) return "partie_close" as const;
      throw erreur;
    });
  if (scoreTotal === "partie_close") return { statut: "conflit", raison: "partie_terminee" };
  if (scoreTotal === null) return { statut: "conflit", raison: "question_deja_repondue" };

  return {
    statut: "ok",
    correction: {
      id_partie,
      rang,
      juste,
      en_retard: enRetard,
      points,
      score_total: scoreTotal,
      delai_ms: delaiMs,
      partie_terminee: rang === QUESTIONS_PAR_PARTIE,
      bonne_reponse: { id_meme: ligne.id_meme, ...ligne.bonne },
    },
  };
}
