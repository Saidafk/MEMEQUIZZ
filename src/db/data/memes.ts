import type { LICENCES_LIBRES } from "../schema";

// Liste figée des mèmes du jeu (SCRUM-37). Chaque image a été vérifiée sur sa page Wikimedia
// Commons le 2026-10-23 ; chaque texte (SCRUM-38) est une reformulation de l'article Wikipédia
// indiqué (voir le skill meme-data et docs/selection-memes.md).
// Pour en ajouter un : renseigner la fiche, `bun run db:images`, puis `bun run db:seed`.
export type FicheMeme = {
  slug: string;
  nom: string;
  annee_origine: number | null;
  origine: string | null;
  article_url: string | null; // article Wikipédia qui documente le mème
  fichier_commons: string; // titre du fichier, sans le préfixe « File: »
  source_url: string; // page du fichier sur Commons
  auteur: string;
  licence: (typeof LICENCES_LIBRES)[number];
};

type Texte = { annee?: number; origine: string; article: string };

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
  texte?: Texte,
): FicheMeme => ({
  slug,
  nom,
  annee_origine: texte?.annee ?? null,
  origine: texte?.origine ?? null,
  article_url: texte?.article ?? null,
  fichier_commons,
  source_url: page(fichier_commons),
  auteur,
  licence,
});

export const MEMES: readonly FicheMeme[] = [
  // Aucun article Wikipédia (FR ni EN) ne documente ce mème : origine, année et lien restent vides.
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
    {
      annee: 2013,
      origine:
        "Doge est un mème né sur Internet et devenu populaire en 2013. Il met en scène un chien de race shiba inu dont les pensées, naïves, s'affichent en petites phrases colorées écrites en Comic Sans.",
      article: "https://fr.wikipedia.org/wiki/Doge_(m%C3%A8me)",
    },
  ),
  fiche("grumpy-cat", "Grumpy Cat", "Grumpy Cat meme example.jpg", "Gage Skidmore", "cc_by_sa", {
    annee: 2012,
    origine:
      "Grumpy Cat est une chatte née en 2012 en Arizona et morte en 2019. Elle est devenue un mème pour sa mine renfrognée, que sa propriétaire attribue à un nanisme et à un défaut de mâchoire.",
    article: "https://fr.wikipedia.org/wiki/Grumpy_Cat",
  }),
  fiche("lolcat", "Lolcat", "Lolcat in folder.jpg", "Clancy Ratliff", "cc_by_sa", {
    origine:
      "Le lolcat est un genre d'image où un chat « parle » dans un anglais volontairement fautif, le « lolspeak ». Son nom vient de « LOL » (rire) et de « cat » (chat). Il s'est diffusé d'abord sur des forums et des imageboards, 4chan en tête.",
    article: "https://fr.wikipedia.org/wiki/Lolcat",
  }),
  fiche(
    "ecce-homo-borja",
    "L'Ecce Homo de Borja",
    "Elias Garcia Martinez - Ecce Homo.jpg",
    "Elías García Martínez (fresque restaurée en 2012)",
    "domaine_public",
    {
      annee: 2012,
      origine:
        "Fresque d'Elías García Martínez dans l'église du sanctuaire de la Miséricorde, à Borja (Aragon). Restaurée maladroitement en 2012 par une habitante octogénaire, Cecilia Giménez, elle a fait le tour des médias, et l'afflux de touristes a conduit l'église à faire payer l'entrée.",
      article: "https://fr.wikipedia.org/wiki/Ecce_homo_(El%C3%ADas_Garc%C3%ADa_Mart%C3%ADnez)",
    },
  ),
  // L'article décrit le symbole (l'œil de la Providence), pas le mème « Illuminati confirmed ».
  fiche(
    "illuminati-confirmed",
    "Illuminati confirmed",
    "Illuminati triangle eye.png",
    "Gouvernement des États-Unis (sceau du billet de un dollar)",
    "domaine_public",
    {
      origine:
        "L'image représente l'œil de la Providence, un symbole très répandu : un œil placé dans un triangle d'où partent des rayons. Religions, courants philosophiques et sociétés mystiques l'ont adopté ; on y voit généralement l'œil de Dieu veillant sur les humains. L'article lié présente ce symbole, pas le mème.",
      article: "https://fr.wikipedia.org/wiki/%C5%92il_de_la_Providence",
    },
  ),
  fiche("touch-grass", "Touch grass", "Touch Grass.jpg", "MiracleMiles", "cc_by", {
    origine:
      "Expression d'argot de la génération Z : « touch grass » (« va toucher de l'herbe ») sert à dire à quelqu'un d'aller dehors.",
    article: "https://en.wikipedia.org/wiki/Glossary_of_2020s_slang",
  }),
  fiche(
    "rage-comics",
    "Rage comics",
    "Rage comics on t-shirts, 2013.jpg",
    "VarunRajendran",
    "cc0",
    {
      origine:
        "Les rage comics sont de courtes bandes dessinées qui racontent avec humour les tracas du quotidien, avec des visages dessinés grossièrement, souvent faits avec un logiciel simple comme Paint. Le nom vient du « rage guy », le personnage furieux qui conclut en général la bande.",
      article: "https://fr.wikipedia.org/wiki/Rage_comic",
    },
  ),
  // Source : l'article « Rage comic » (FR), qui mentionne le Y U NO guy.
  fiche(
    "y-u-no",
    "Y U NO",
    'LEGO "Y U NO " meme (Free to use).jpg',
    "Ochre Jelly",
    "domaine_public",
    {
      origine:
        "Le visage du « Y U NO guy » est tiré du manga Gantz. Il n'a pas les rage comics pour origine, mais il a fini par leur être associé : ces courtes bandes dessinées aux visages dessinés grossièrement l'utilisent souvent.",
      article: "https://fr.wikipedia.org/wiki/Rage_comic",
    },
  ),
  fiche(
    "honest-work",
    "It ain't much, but it's honest work",
    "Ohio farmer David Brandt.jpg",
    "Dianne Johnson, United States Department of Agriculture",
    "domaine_public",
    {
      origine:
        "David Brandt (1946-2023) était un fermier américain connu pour une agriculture durable, notamment le semis direct et les couverts végétaux. Une photo de lui, accompagnée de la légende « It ain't much, but it's honest work », est devenue un mème.",
      article: "https://en.wikipedia.org/wiki/David_Brandt_(farmer)",
    },
  ),
];
