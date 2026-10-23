import { and, asc, desc, eq, gte, sql } from "drizzle-orm";

import { joueur, partie } from "@/db/schema";
import type { BaseDonnees } from "@/lib/questions";

export type Periode = "aujourdhui" | "toujours";

export type LigneClassement = { pseudo: string; score: number; rang: number; moi: boolean };

const LIMITE_PAR_DEFAUT = 50;

// Égalité = même rang (1, 2, 2, 4) : un joueur n'est jamais classé derrière un autre qui a le même score.
export function attribuerRangs<T extends { score: number }>(
  lignes: readonly T[],
): (T & { rang: number })[] {
  return lignes.map((ligne, i) => {
    const premier = lignes.findIndex((autre) => autre.score === ligne.score);
    return { ...ligne, rang: (premier === -1 ? i : premier) + 1 };
  });
}

// Les meilleures parties terminées, de la plus haute à la plus basse ; à score égal, la plus
// ancienne d'abord. « Aujourd'hui » : depuis minuit, heure de Paris. `moi` est calculé par la base
// à partir du jeton de session : le hash n'est jamais renvoyé.
export async function lireClassement(
  db: BaseDonnees,
  {
    periode,
    jetonHash,
    limite = LIMITE_PAR_DEFAUT,
  }: { periode: Periode; jetonHash: string | null; limite?: number },
): Promise<LigneClassement[]> {
  const debutDuJour = sql`(date_trunc('day', now() at time zone 'Europe/Paris') at time zone 'Europe/Paris')`;
  const lignes = await db
    .select({
      pseudo: joueur.pseudo,
      score: partie.score_total,
      moi: (jetonHash === null
        ? sql<boolean>`false`
        : sql<boolean>`${joueur.token_session_hash} = ${jetonHash}`
      ).mapWith(Boolean),
    })
    .from(partie)
    .innerJoin(joueur, eq(joueur.id_joueur, partie.id_joueur))
    .where(
      and(
        eq(partie.statut, "terminee"),
        periode === "aujourdhui" ? gte(partie.termine_le, debutDuJour) : undefined,
      ),
    )
    .orderBy(desc(partie.score_total), asc(partie.termine_le), asc(partie.id_partie))
    .limit(limite);
  return attribuerRangs(lignes);
}
