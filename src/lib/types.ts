export type LettreReponse = "A" | "B" | "C" | "D";

export type FicheMemeDonnees = {
  nom: string;
  origine: string;
  description: string;
  source: string;
};

// `rang` : position réelle au classement (égalités au même rang), sinon l'ordre d'affichage.
export type Joueur = { pseudo: string; score: number; rang?: number; moi?: boolean };
