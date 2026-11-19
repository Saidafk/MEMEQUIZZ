export type LettreReponse = "A" | "B" | "C" | "D";

// État d'un bouton de réponse (voir etatReponse dans affichage-reponse.ts).
export type EtatReponse = "normal" | "correct" | "faux" | "desactive";

export type FicheMemeDonnees = {
  nom: string;
  origine: string;
  description: string;
  source: string;
};

// `rang` : position réelle au classement (égalités au même rang), sinon l'ordre d'affichage.
export type Joueur = { pseudo: string; score: number; rang?: number; moi?: boolean };
