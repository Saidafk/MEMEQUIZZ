// Données fictives de la v0.2, remplacées par la base et l'API en v0.3.
// La bonne réponse est ici visible côté client UNIQUEMENT pour la démo :
// dès la v0.3, elle reste sur le serveur et le score y est calculé.
import type { Joueur, Question, ResultatPartie } from "./types";

const ficheProvisoire = (nom: string, description: string) => ({
  nom,
  origine: "Origine : [à compléter]",
  description,
  source: "Source : [à définir]",
});

const LIBELLES = [
  "Le chat surpris",
  "Le gars qui hésite",
  "Tout va bien",
  "Le pouce levé",
  "Le chien perplexe",
  "La foule en délire",
  "Le bébé victorieux",
  "Le cerveau qui grossit",
  "La dame qui calcule",
  "Le panda qui roule",
] as const;

const LETTRES = ["A", "B", "C", "D"] as const;

// 10 questions : on fait tourner les libellés pour varier les choix.
export const QUESTIONS_DEMO: Question[] = LIBELLES.map((nom, i) => {
  const choix = LETTRES.map((lettre, j) => ({
    lettre,
    libelle: LIBELLES[(i + j) % LIBELLES.length] ?? nom,
  }));
  const bonne = LETTRES[i % 4] ?? "A";
  const libelleBon = choix.find((c) => c.lettre === bonne)?.libelle ?? nom;
  return {
    id: i + 1,
    choix,
    bonneReponse: bonne,
    fiche: ficheProvisoire(
      libelleBon,
      "Description du mème à rédiger à partir d'une source libre, en attendant SCRUM-34.",
    ),
  };
});

export const CLASSEMENT_DEMO: Joueur[] = [
  { pseudo: "Gribouille42", score: 9420 },
  { pseudo: "Crayon_Fou", score: 9100 },
  { pseudo: "Taille-crayon", score: 8870 },
  { pseudo: "Saïd", score: 7850 },
  { pseudo: "Gomme2000", score: 7400 },
  { pseudo: "Règle_Plate", score: 6990 },
  { pseudo: "Trousse", score: 6500 },
];

export const PSEUDO_DEMO = "Saïd";

export const RESULTAT_DEMO: ResultatPartie = {
  pseudo: PSEUDO_DEMO,
  score: 7850,
  bonnes: 7,
  total: 10,
  rang: 4,
  nombreJoueurs: 128,
  reponses: [true, true, true, false, true, true, false, true, false, true],
};
