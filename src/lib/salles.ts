import { randomInt } from "node:crypto";

import { and, eq, sql } from "drizzle-orm";

import { joueur, partie, partieQuestion, salle } from "@/db/schema";
import { insererJoueurEtPartie, tirerMemes } from "@/lib/parties";
import { type BaseDonnees, GRACE_REPONSE_S } from "@/lib/questions";
import { DUREE_QUESTION_S } from "@/lib/score";
import { QUESTIONS_PAR_PARTIE } from "@/lib/validation";

// Salles multijoueur (SCRUM-83) et leur rythme (SCRUM-84). Chaque joueur a sa propre partie (même
// moteur que le solo : chrono, score et anti-triche côté serveur) ; la salle fixe les 10 mèmes
// communs et ouvre les questions une à une, pour tout le monde.

// Sans I, O, 0 ni 1 : un code se dicte ou se recopie sans confusion.
export const ALPHABET_CODE = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const LONGUEUR_CODE = 6;
export const JOUEURS_MAX_SALLE = 20;
// Une question ouverte se ferme quand tout le monde a répondu, ou au plus tard après la durée du
// chrono, la marge réseau et quelques secondes pour lire la correction.
export const DELAI_QUESTION_SALLE_S = DUREE_QUESTION_S + GRACE_REPONSE_S + 3;

export type ErreurSalle =
  | { statut: "session_absente" }
  | { statut: "introuvable" }
  | { statut: "interdit"; raison: "pas_hote" }
  | { statut: "conflit"; raison: "salle_commencee" | "salle_pleine" }
  | { statut: "pas_assez_de_memes" };

export type SalleRejointe = { statut: "ok"; code: string; id_partie: number };

export type JoueurSalle = {
  rang: number;
  pseudo: string;
  score: number;
  // A répondu à la question ouverte (ou y a renoncé, temps écoulé).
  a_repondu: boolean;
  hote: boolean;
  moi: boolean;
};

export type EtatSalle = {
  code: string;
  statut: "attente" | "en_cours" | "terminee";
  rang_courant: number;
  total: number;
  // Partie du joueur qui lit l'état : jamais celle d'un autre.
  id_partie: number;
  hote: boolean;
  joueurs: JoueurSalle[];
};

// Tirage cryptographique : 32^6 ≈ 1 milliard de codes, impossibles à deviner en série avec la
// limitation de débit de l'API.
export function genererCode(): string {
  let code = "";
  for (let i = 0; i < LONGUEUR_CODE; i += 1) code += ALPHABET_CODE[randomInt(ALPHABET_CODE.length)];
  return code;
}

export async function creerSalle(
  db: BaseDonnees,
  { pseudo, jetonHash }: { pseudo: string; jetonHash: string },
): Promise<SalleRejointe | Extract<ErreurSalle, { statut: "pas_assez_de_memes" }>> {
  return db.transaction(async (tx) => {
    const memes = await tirerMemes(tx);
    if (!memes) return { statut: "pas_assez_de_memes" } as const;

    // Collision quasi impossible ; on réessaie quand même avant de laisser la contrainte UNIQUE trancher.
    let code = genererCode();
    for (let essai = 0; essai < 5; essai += 1) {
      const [pris] = await tx
        .select({ id: salle.id_salle })
        .from(salle)
        .where(eq(salle.code, code));
      if (!pris) break;
      code = genererCode();
    }

    // L'hôte est créé d'abord (la salle le référence), puis sa partie est rattachée à la salle.
    const { id_joueur, id_partie } = await insererJoueurEtPartie(tx, {
      pseudo,
      jetonHash,
      memes,
      id_salle: null,
    });
    const [nouvelle] = await tx
      .insert(salle)
      .values({ code, id_hote: id_joueur, memes_ids: memes })
      .returning({ id: salle.id_salle });
    if (!nouvelle) throw new Error("salle non créée");
    await tx.update(partie).set({ id_salle: nouvelle.id }).where(eq(partie.id_partie, id_partie));
    return { statut: "ok", code, id_partie } as const;
  });
}

export async function rejoindreSalle(
  db: BaseDonnees,
  { code, pseudo, jetonHash }: { code: string; pseudo: string; jetonHash: string },
): Promise<SalleRejointe | ErreurSalle> {
  return db.transaction(async (tx) => {
    // Verrou sur la salle : deux arrivées simultanées ne dépassent pas le nombre maximal de joueurs,
    // et personne n'entre pendant le lancement.
    const [cible] = await tx
      .select({ id: salle.id_salle, statut: salle.statut, memes: salle.memes_ids })
      .from(salle)
      .where(eq(salle.code, code))
      .for("update");
    if (!cible) return { statut: "introuvable" } as const;
    if (cible.statut !== "attente")
      return { statut: "conflit", raison: "salle_commencee" } as const;

    const [presents] = await tx
      .select({ n: sql<number>`count(*)::int`.mapWith(Number) })
      .from(partie)
      .where(eq(partie.id_salle, cible.id));
    if ((presents?.n ?? 0) >= JOUEURS_MAX_SALLE) {
      return { statut: "conflit", raison: "salle_pleine" } as const;
    }

    const { id_partie } = await insererJoueurEtPartie(tx, {
      pseudo,
      jetonHash,
      memes: cible.memes,
      id_salle: cible.id,
    });
    return { statut: "ok", code, id_partie } as const;
  });
}

export async function lancerSalle(
  db: BaseDonnees,
  { code, jetonHash }: { code: string; jetonHash: string | null },
): Promise<{ statut: "ok" } | ErreurSalle> {
  if (jetonHash === null) return { statut: "session_absente" };
  const membre = await lireMembre(db, { code, jetonHash });
  if (!membre) return { statut: "introuvable" };
  if (!membre.hote) return { statut: "interdit", raison: "pas_hote" };

  const lancee = await db
    .update(salle)
    .set({ statut: "en_cours", rang_courant: 1, question_ouverte_le: sql`now()` })
    .where(and(eq(salle.id_salle, membre.id_salle), eq(salle.statut, "attente")))
    .returning({ id: salle.id_salle });
  if (lancee.length === 0) return { statut: "conflit", raison: "salle_commencee" };
  return { statut: "ok" };
}

// Le joueur de cette session fait-il partie de la salle ? Une salle dont on n'est pas membre est
// « introuvable », comme une salle qui n'existe pas : le flux ne fuite rien à un curieux.
async function lireMembre(
  db: BaseDonnees,
  { code, jetonHash }: { code: string; jetonHash: string },
) {
  const [membre] = await db
    .select({
      id_salle: salle.id_salle,
      id_partie: partie.id_partie,
      hote: sql<boolean>`${salle.id_hote} = ${joueur.id_joueur}`,
    })
    .from(salle)
    .innerJoin(partie, eq(partie.id_salle, salle.id_salle))
    .innerJoin(joueur, eq(joueur.id_joueur, partie.id_joueur))
    .where(and(eq(salle.code, code), eq(joueur.token_session_hash, jetonHash)));
  return membre;
}

// La question ouverte est close quand tous les joueurs y ont répondu (ou ont signalé le temps
// écoulé), ou quand le délai de la salle est passé : un joueur parti ne bloque pas les autres.
const questionClose = sql`(
  ${salle.question_ouverte_le} <= now() - make_interval(secs => ${sql.raw(String(DELAI_QUESTION_SALLE_S))})
  or not exists (
    select 1 from ${partie}
    inner join ${partieQuestion} on ${partieQuestion.id_partie} = ${partie.id_partie}
      and ${partieQuestion.rang} = ${salle.rang_courant}
    where ${partie.id_salle} = ${salle.id_salle} and ${partieQuestion.repondu_le} is null
  )
)`;

// Fait avancer la salle d'un cran si la question ouverte est close : question suivante, ou fin de
// la salle après la dernière. Appelée à chaque tour du flux SSE ; les conditions dans le WHERE
// rendent l'avancée atomique (deux flux simultanés n'ouvrent pas deux questions).
export async function avancerSalle(db: BaseDonnees, id_salle: number): Promise<void> {
  await db
    .update(salle)
    .set({ rang_courant: sql`${salle.rang_courant} + 1`, question_ouverte_le: sql`now()` })
    .where(
      and(
        eq(salle.id_salle, id_salle),
        eq(salle.statut, "en_cours"),
        sql`${salle.rang_courant} < ${QUESTIONS_PAR_PARTIE}`,
        questionClose,
      ),
    );

  await db.transaction(async (tx) => {
    const finie = await tx
      .update(salle)
      .set({ statut: "terminee", termine_le: sql`now()` })
      .where(
        and(
          eq(salle.id_salle, id_salle),
          eq(salle.statut, "en_cours"),
          eq(salle.rang_courant, QUESTIONS_PAR_PARTIE),
          questionClose,
        ),
      )
      .returning({ id: salle.id_salle });
    // Les parties restées ouvertes (joueur parti, dernière question manquée) sont closes avec la
    // salle : elles comptent au classement avec les points déjà gagnés.
    if (finie.length > 0) {
      await tx
        .update(partie)
        .set({ statut: "terminee", termine_le: sql`now()` })
        .where(and(eq(partie.id_salle, id_salle), eq(partie.statut, "en_cours")));
    }
  });
}

// Classement : meilleur score d'abord ; à égalité, même rang (comme le classement général).
export function classerJoueurs<T extends { score: number; pseudo: string }>(
  joueurs: T[],
): (T & { rang: number })[] {
  const tries = [...joueurs].sort(
    (a, b) => b.score - a.score || a.pseudo.localeCompare(b.pseudo, "fr"),
  );
  return tries.map((j) => ({
    ...j,
    rang: tries.findIndex((autre) => autre.score === j.score) + 1,
  }));
}

export type ResultatEtatSalle = { statut: "ok"; etat: EtatSalle; id_salle: number } | ErreurSalle;

export async function lireEtatSalle(
  db: BaseDonnees,
  { code, jetonHash }: { code: string; jetonHash: string | null },
): Promise<ResultatEtatSalle> {
  if (jetonHash === null) return { statut: "session_absente" };
  const [entete] = await db
    .select({
      id_salle: salle.id_salle,
      statut: salle.statut,
      rang_courant: salle.rang_courant,
      id_hote: salle.id_hote,
    })
    .from(salle)
    .where(eq(salle.code, code));
  if (!entete) return { statut: "introuvable" };

  const lignes = await db
    .select({
      id_joueur: joueur.id_joueur,
      id_partie: partie.id_partie,
      pseudo: joueur.pseudo,
      score: partie.score_total,
      moi: sql<boolean>`${joueur.token_session_hash} = ${jetonHash}`,
      a_repondu: sql<boolean>`${partieQuestion.repondu_le} is not null`,
    })
    .from(partie)
    .innerJoin(joueur, eq(joueur.id_joueur, partie.id_joueur))
    .leftJoin(
      partieQuestion,
      and(
        eq(partieQuestion.id_partie, partie.id_partie),
        eq(partieQuestion.rang, entete.rang_courant),
      ),
    )
    .where(eq(partie.id_salle, entete.id_salle));

  const moi = lignes.find((l) => l.moi);
  if (!moi) return { statut: "introuvable" };

  return {
    statut: "ok",
    id_salle: entete.id_salle,
    etat: {
      code,
      statut: entete.statut,
      rang_courant: entete.rang_courant,
      total: QUESTIONS_PAR_PARTIE,
      id_partie: moi.id_partie,
      hote: moi.id_joueur === entete.id_hote,
      // Ni identifiant de joueur ni de partie des autres : seulement ce qui s'affiche.
      joueurs: classerJoueurs(lignes).map((l) => ({
        rang: l.rang,
        pseudo: l.pseudo,
        score: l.score,
        a_repondu: l.a_repondu,
        hote: l.id_joueur === entete.id_hote,
        moi: l.moi,
      })),
    },
  };
}

export function reponseErreurSalle(erreur: ErreurSalle): Response {
  switch (erreur.statut) {
    case "session_absente":
      return Response.json({ erreur: "session_absente" }, { status: 401 });
    case "introuvable":
      return Response.json({ erreur: "introuvable" }, { status: 404 });
    case "interdit":
      return Response.json({ erreur: erreur.raison }, { status: 403 });
    case "conflit":
      return Response.json({ erreur: erreur.raison }, { status: 409 });
    case "pas_assez_de_memes":
      return Response.json({ erreur: "pas_assez_de_memes" }, { status: 503 });
  }
}
