import "server-only";

import webpush from "web-push";

import type { Envoi } from "@/lib/push";

// Configuration VAPID lue à l'usage (pas à l'import) : `next build` n'a pas ces variables.
export function clePubliqueVapid(): string | null {
  return process.env.VAPID_PUBLIC_KEY || null;
}

export function envoyerAvecWebPush(): Envoi | null {
  const publique = process.env.VAPID_PUBLIC_KEY;
  const privee = process.env.VAPID_PRIVATE_KEY;
  const sujet = process.env.VAPID_SUBJECT;
  if (!publique || !privee || !sujet) return null;
  webpush.setVapidDetails(sujet, publique, privee);
  return async (abonnement, charge) => {
    await webpush.sendNotification(abonnement, charge, { TTL: 60 * 60 * 12 });
  };
}
