import { getDb } from "@/db";
import { envoyerQuizDuJour, secretValide } from "@/lib/push";
import { envoyerAvecWebPush } from "@/lib/web-push";

// Déclenché une fois par jour par une tâche planifiée du serveur (docs/notifications-push.md).
// Protégé par un secret : sans lui, n'importe qui pourrait notifier tous les abonnés.
export async function POST(requete: Request) {
  if (!secretValide(requete.headers.get("authorization"), process.env.CRON_SECRET)) {
    return Response.json({ erreur: "non_autorise" }, { status: 401 });
  }
  const envoyer = envoyerAvecWebPush();
  if (!envoyer) return Response.json({ erreur: "push_indisponible" }, { status: 503 });
  const bilan = await envoyerQuizDuJour(getDb(), envoyer);
  return Response.json(bilan, { headers: { "Cache-Control": "no-store" } });
}
