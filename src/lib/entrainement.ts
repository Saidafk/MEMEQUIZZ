import { eq } from "drizzle-orm";

import { meme } from "@/db/schema";
import type { BaseDonnees } from "@/lib/questions";
import { melanger } from "@/lib/questions";
import { QUESTIONS_PAR_PARTIE } from "@/lib/validation";

// Mode entraînement (SCRUM-48) : un lot de questions envoyé d'un coup pour être joué sans réseau.
// Exception assumée à la règle « la bonne réponse ne sort jamais » (voir questions.ts) : ici la
// correction est dans la charge utile, mais l'entraînement n'a ni score serveur ni classement,
// donc rien n'est à gagner à lire la réponse. Le jeu classé reste servi question par question.

const NOMBRE_CHOIX = 4;

export type MemeEntrainement = {
  id_meme: number;
  nom: string;
  image_chemin: string;
  annee_origine: number | null;
  origine: string | null;
  auteur: string;
  licence: string;
  source_url: string;
  article_url: string | null;
};

export type QuestionEntrainement = {
  image_url: string;
  choix: { id_meme: number; nom: string }[];
  bonne: Omit<MemeEntrainement, "image_chemin">;
};

// Pure (testable sans base) : tire `nombre` bonnes réponses, chacune avec 3 fausses distinctes.
export function composerQuestions(
  memes: readonly MemeEntrainement[],
  nombre: number = QUESTIONS_PAR_PARTIE,
): QuestionEntrainement[] {
  if (memes.length < NOMBRE_CHOIX) return [];
  return melanger(memes)
    .slice(0, nombre)
    .map((bon) => {
      const { image_chemin, ...bonne } = bon;
      const faux = melanger(memes.filter((m) => m.id_meme !== bon.id_meme)).slice(
        0,
        NOMBRE_CHOIX - 1,
      );
      return {
        image_url: image_chemin,
        choix: melanger([bon, ...faux]).map((m) => ({ id_meme: m.id_meme, nom: m.nom })),
        bonne,
      };
    });
}

export async function lotEntrainement(db: BaseDonnees): Promise<QuestionEntrainement[]> {
  const memes = await db
    .select({
      id_meme: meme.id_meme,
      nom: meme.nom,
      image_chemin: meme.image_chemin,
      annee_origine: meme.annee_origine,
      origine: meme.origine,
      auteur: meme.auteur,
      licence: meme.licence,
      source_url: meme.source_url,
      article_url: meme.article_url,
    })
    .from(meme)
    .where(eq(meme.actif, true));
  return composerQuestions(memes);
}
