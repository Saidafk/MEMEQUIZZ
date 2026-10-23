export type LettreReponse = "A" | "B" | "C" | "D";

export type Choix = { lettre: LettreReponse; libelle: string };

export type FicheMemeDonnees = {
  nom: string;
  origine: string;
  description: string;
  source: string;
};

export type Question = {
  id: number;
  choix: Choix[];
  bonneReponse: LettreReponse;
  fiche: FicheMemeDonnees;
};

export type Joueur = { pseudo: string; score: number };

export type ResultatPartie = {
  pseudo: string;
  score: number;
  bonnes: number;
  total: number;
  rang: number;
  nombreJoueurs: number;
  reponses: boolean[];
};
