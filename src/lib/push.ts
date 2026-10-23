import { timingSafeEqual } from "node:crypto";

import { eq } from "drizzle-orm";
import { z } from "zod";

import { abonnementPush } from "@/db/schema";
import type { BaseDonnees } from "@/lib/questions";

// Notifications push du quiz du jour (SCRUM-49). Les clés VAPID et le secret d'envoi viennent de
// l'environnement (.env en production, jamais dans le dépôt).

// Forme renvoyée par `PushSubscription.toJSON()` dans le navigateur.
export const abonnementSchema = z.strictObject({
  endpoint: z
    .string()
    .max(1000)
    .refine((valeur) => URL.canParse(valeur) && new URL(valeur).protocol === "https:", {
      message: "L'adresse d'abonnement doit être en https.",
    }),
  keys: z.strictObject({
    p256dh: z.string().min(1).max(200),
    auth: z.string().min(1).max(100),
  }),
});
export const desabonnementSchema = z.strictObject({ endpoint: abonnementSchema.shape.endpoint });

export type Abonnement = z.output<typeof abonnementSchema>;

export const MESSAGE_QUIZ_DU_JOUR = {
  titre: "Le quiz du jour est prêt !",
  corps: "10 mèmes, 15 secondes chacun. À toi de jouer.",
  url: "/",
};

export async function enregistrerAbonnement(db: BaseDonnees, abonnement: Abonnement) {
  const valeurs = {
    endpoint: abonnement.endpoint,
    cle_p256dh: abonnement.keys.p256dh,
    cle_auth: abonnement.keys.auth,
  };
  // Un même appareil qui se réabonne met à jour ses clés au lieu de créer un doublon.
  await db
    .insert(abonnementPush)
    .values(valeurs)
    .onConflictDoUpdate({ target: abonnementPush.endpoint, set: valeurs });
}

export async function supprimerAbonnement(db: BaseDonnees, endpoint: string) {
  await db.delete(abonnementPush).where(eq(abonnementPush.endpoint, endpoint));
}

export type Envoi = (abonnement: Abonnement, charge: string) => Promise<void>;
export type BilanEnvoi = { envoyes: number; supprimes: number; echecs: number };

// `envoyer` est injecté : web-push en production (voir envoyerAvecWebPush), un faux en test.
// Un abonnement refusé par le service (404 ou 410 : appareil désinscrit) est supprimé ; les autres
// échecs sont comptés mais l'abonnement est gardé, car ils peuvent être passagers.
export async function envoyerQuizDuJour(db: BaseDonnees, envoyer: Envoi): Promise<BilanEnvoi> {
  const abonnements = await db.select().from(abonnementPush);
  const charge = JSON.stringify(MESSAGE_QUIZ_DU_JOUR);
  const bilan: BilanEnvoi = { envoyes: 0, supprimes: 0, echecs: 0 };

  for (const ligne of abonnements) {
    try {
      await envoyer(
        { endpoint: ligne.endpoint, keys: { p256dh: ligne.cle_p256dh, auth: ligne.cle_auth } },
        charge,
      );
      bilan.envoyes += 1;
    } catch (erreur) {
      const statut = (erreur as { statusCode?: number }).statusCode;
      if (statut === 404 || statut === 410) {
        await supprimerAbonnement(db, ligne.endpoint);
        bilan.supprimes += 1;
      } else {
        bilan.echecs += 1;
      }
    }
  }
  return bilan;
}

// Comparaison à temps constant du secret d'envoi (en-tête `Authorization: Bearer <secret>`).
export function secretValide(enTete: string | null, secret: string | undefined): boolean {
  if (!secret || !enTete?.startsWith("Bearer ")) return false;
  const fourni = Buffer.from(enTete.slice("Bearer ".length));
  const attendu = Buffer.from(secret);
  return fourni.length === attendu.length && timingSafeEqual(fourni, attendu);
}
