import type { LICENCES_IMAGE } from "../schema";

// Liste figée des mèmes du jeu (SCRUM-37). Chaque entrée a été vérifiée sur sa page
// Wikimedia Commons le 2026-10-23 (voir le skill meme-data et docs/selection-memes.md).
// Pour en ajouter un : renseigner la fiche, `bun run db:images`, puis `bun run db:seed`.
export type FicheMeme = {
  slug: string;
  nom: string;
  annee_origine: number | null;
  origine: string | null;
  fichier_commons: string; // titre du fichier, sans le préfixe « File: »
  source_url: string; // page du fichier sur Commons
  auteur: string;
  licence: (typeof LICENCES_IMAGE)[number];
};

const page = (fichier: string) =>
  `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(fichier.replaceAll(" ", "_"))
    .replaceAll("%2C", ",")
    .replaceAll("%3F", "?")}`;

const fiche = (
  slug: string,
  nom: string,
  fichier_commons: string,
  auteur: string,
  licence: FicheMeme["licence"],
): FicheMeme => ({
  slug,
  nom,
  annee_origine: null, // complétés avec des sources en SCRUM-38
  origine: null,
  fichier_commons,
  source_url: page(fichier_commons),
  auteur,
  licence,
});

export const MEMES: readonly FicheMeme[] = [
  fiche(
    "awesome-face",
    "Awesome Face",
    "Awesome Face.svg",
    "East718 (original) ; Holly Cheng, Giro720 (version vectorielle)",
    "cc_by_sa",
  ),
  fiche(
    "doge",
    "Doge",
    "Doge homemade meme.jpg",
    "Euterpia, d'après une photo de Roberto Vasarri",
    "cc0",
  ),
  fiche("grumpy-cat", "Grumpy Cat", "Grumpy Cat meme example.jpg", "Gage Skidmore", "cc_by_sa"),
  fiche("lolcat", "Lolcat", "Lolcat in folder.jpg", "Clancy Ratliff", "cc_by_sa"),
  fiche(
    "ecce-homo-borja",
    "L'Ecce Homo de Borja",
    "Elias Garcia Martinez - Ecce Homo.jpg",
    "Elías García Martínez (fresque de 1930, restaurée en 2012)",
    "domaine_public",
  ),
  fiche(
    "illuminati-confirmed",
    "Illuminati confirmed",
    "Illuminati triangle eye.png",
    "Gouvernement des États-Unis (sceau du billet de un dollar)",
    "domaine_public",
  ),
  fiche("touch-grass", "Touch grass", "Touch Grass.jpg", "MiracleMiles", "cc_by"),
  fiche("rage-comics", "Rage comics", "Rage comics on t-shirts, 2013.jpg", "VarunRajendran", "cc0"),
  fiche(
    "y-u-no",
    "Y U NO",
    'LEGO "Y U NO " meme (Free to use).jpg',
    "Ochre Jelly",
    "domaine_public",
  ),
  fiche(
    "honest-work",
    "It ain't much, but it's honest work",
    "Ohio farmer David Brandt.jpg",
    "Dianne Johnson, United States Department of Agriculture",
    "domaine_public",
  ),
];
