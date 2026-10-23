import { z } from "zod";

// Schémas partagés client / serveur (SCRUM-41). Le serveur les rejoue toujours :
// une validation côté client n'est qu'un confort, jamais une garantie.
export const QUESTIONS_PAR_PARTIE = 10;
const ID_MAX = 2_147_483_647; // plafond d'un `serial` PostgreSQL (integer)

const PSEUDO_MIN = 3;
const PSEUDO_MAX = 20;

// Le pseudo est nettoyé (NFC, espaces rognés et réduits) avant d'être contrôlé. Lettres, chiffres,
// espace, « _ », « . » et « - » seulement : pas de « < » ni de caractère de contrôle, et pas de
// marques combinantes (elles permettent les textes « zalgo »). L'échappement à l'affichage reste
// assuré par React ; cette liste est une défense de plus, pas la seule.
export const pseudoSchema = z
  .string({ error: "Le pseudo est obligatoire." })
  .transform((valeur) => valeur.normalize("NFC").trim().replace(/\s+/gu, " "))
  .pipe(
    z
      .string()
      // On compte les caractères comme PostgreSQL (`char_length`), pas les unités UTF-16.
      .refine(
        (valeur) => {
          const longueur = [...valeur].length;
          return longueur >= PSEUDO_MIN && longueur <= PSEUDO_MAX;
        },
        { error: `Le pseudo doit faire entre ${PSEUDO_MIN} et ${PSEUDO_MAX} caractères.` },
      )
      .regex(/^[\p{L}\p{N}_. -]+$/u, {
        error: "Le pseudo ne peut contenir que des lettres, des chiffres, « _ », « . » et « - ».",
      }),
  );

// Identifiant en corps JSON (nombre) ou dans l'URL (chaîne de chiffres, sans « 1e3 » ni « 0x10 »).
export const identifiantSchema = z
  .number({ error: "L'identifiant doit être un nombre." })
  .int({ error: "L'identifiant doit être un entier." })
  .positive({ error: "L'identifiant doit être positif." })
  .max(ID_MAX, { error: "L'identifiant est trop grand." });

export const identifiantUrlSchema = z
  .string({ error: "L'identifiant est obligatoire." })
  .regex(/^[1-9]\d{0,9}$/, { error: "L'identifiant doit être un entier positif." })
  .transform(Number)
  .pipe(identifiantSchema);

const rangMessage = `Le rang doit être un entier de 1 à ${QUESTIONS_PAR_PARTIE}.`;

export const rangSchema = z
  .number({ error: rangMessage })
  .int({ error: rangMessage })
  .min(1, { error: rangMessage })
  .max(QUESTIONS_PAR_PARTIE, { error: rangMessage });

export const rangUrlSchema = z
  .string({ error: "Le rang est obligatoire." })
  .regex(/^\d{1,2}$/, { error: rangMessage })
  .transform(Number)
  .pipe(rangSchema);

// POST /api/parties : démarrer une partie.
export const nouvellePartieSchema = z.strictObject({ pseudo: pseudoSchema });

// GET /api/parties/[id_partie]/questions/[rang] : paramètres d'URL.
export const questionParamsSchema = z.strictObject({
  id_partie: identifiantUrlSchema,
  rang: rangUrlSchema,
});

// POST réponse : `id_meme` est le mème choisi par le joueur. Que ce mème fasse bien partie des 4
// choix servis pour cette question, et la bonne réponse, se vérifient côté serveur (SCRUM-40) ;
// aucun score ni délai n'est jamais accepté du client.
export const reponseSchema = z.strictObject({
  id_partie: identifiantSchema,
  rang: rangSchema,
  id_meme: identifiantSchema,
});

export type NouvellePartie = z.output<typeof nouvellePartieSchema>;
export type QuestionParams = z.output<typeof questionParamsSchema>;
export type ReponseJoueur = z.output<typeof reponseSchema>;
