import type { LICENCES_IMAGE } from "../schema";

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
  licence: (typeof LICENCES_IMAGE)[number];
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
        "Mème Internet popularisé en 2013 : une photo de chien shiba inu accompagnée de textes en Comic Sans multicolores, censés exprimer les pensées naïves de l'animal.",
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
      "Un lolcat associe une photo de chat à une légende drôle en anglais volontairement déformé (le « lolspeak »). Le nom mêle « LOL » et « cat ». Ces images se sont répandues sur des forums et des imageboards comme 4chan.",
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
        "L'image montre l'œil de la Providence : un œil dans un triangle entouré de rayons de lumière. Ce symbole universel, repris par des religions et des sociétés ésotériques, se lit en général comme l'œil de Dieu qui veille sur l'humanité.",
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
  // Source indirecte : l'article « Rage comic » cite Y U NO parmi les mèmes qui en dérivent.
  fiche(
    "y-u-no",
    "Y U NO",
    'LEGO "Y U NO " meme (Free to use).jpg',
    "Ochre Jelly",
    "domaine_public",
    {
      origine:
        "Mème de la famille des rage comics, ces courtes bandes dessinées aux visages dessinés grossièrement : un personnage furieux interpelle son interlocuteur avec la formule « Y U NO… ? ».",
      article: "https://en.wikipedia.org/wiki/Rage_comic",
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
