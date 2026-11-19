import { libelleDelai } from "./chrono";
import type { EtatReponse } from "./types";

// Règles d'affichage d'une réponse, communes à la partie classée (/jeu) et à l'entraînement : elles
// étaient recopiées dans chaque composant (SCRUM-67).

export const MESSAGE_RESEAU = "Impossible de joindre le serveur. Vérifie ta connexion et réessaie.";

// Correction connue d'une question : le mème choisi (null si le temps est écoulé) et la bonne réponse.
export type CorrectionAffichee = { choisi: number | null; idBonne: number };

// État d'un bouton de réponse. Avant la correction, tous sont actifs. Après : la bonne réponse est
// signalée, le choix du joueur aussi s'il est faux, les autres sont désactivés.
export function etatReponse(idMeme: number, correction: CorrectionAffichee | null): EtatReponse {
  if (!correction) return "normal";
  if (idMeme === correction.idBonne) return "correct";
  if (idMeme === correction.choisi) return "faux";
  return "desactive";
}

// Précision affichée sous le résultat : pourquoi la question n'a rien rapporté, ou en combien de temps
// le joueur a répondu. `enRetard` vient du serveur (réponse arrivée après le délai, délai de grâce compris).
export function detailCorrection({
  choisi,
  enRetard = false,
  delaiMs,
}: {
  choisi: number | null;
  enRetard?: boolean;
  delaiMs: number;
}): string {
  if (choisi === null) return "temps écoulé";
  if (enRetard) return "trop tard";
  return libelleDelai(delaiMs);
}
