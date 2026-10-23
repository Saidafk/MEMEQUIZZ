import { count, countDistinct, eq, max, sql } from "drizzle-orm";

import { meme, partie } from "@/db/schema";
import type { BaseDonnees } from "@/lib/questions";

export type Stats = {
  parties_terminees: number;
  joueurs: number;
  meilleur_score: number;
  score_moyen: number;
  memes_actifs: number;
  // Instant où ces chiffres ont été lus : rend visible la différence entre CSR, SSR et SSG.
  produit_le: string;
};

// Mêmes chiffres pour les trois pages de comparaison (SCRUM-53) : seul le moment du calcul change.
export async function lireStats(db: BaseDonnees): Promise<Stats> {
  const [[parties], [memes]] = await Promise.all([
    db
      .select({
        total: count(),
        joueurs: countDistinct(partie.id_joueur),
        meilleur: max(partie.score_total),
        moyen: sql<string | null>`round(avg(${partie.score_total}))`,
      })
      .from(partie)
      .where(eq(partie.statut, "terminee")),
    db.select({ total: count() }).from(meme).where(eq(meme.actif, true)),
  ]);
  return {
    parties_terminees: parties?.total ?? 0,
    joueurs: parties?.joueurs ?? 0,
    meilleur_score: parties?.meilleur ?? 0,
    score_moyen: Number(parties?.moyen ?? 0),
    memes_actifs: memes?.total ?? 0,
    produit_le: new Date().toISOString(),
  };
}
