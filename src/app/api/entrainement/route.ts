import { getDb } from "@/db";
import { lotEntrainement } from "@/lib/entrainement";

// Lot de questions pour le mode entraînement hors ligne. Le service worker en garde la dernière
// copie (public/sw.js, docs/strategie-cache.md).
export async function GET() {
  const questions = await lotEntrainement(getDb());
  if (questions.length === 0) {
    return Response.json({ erreur: "pas_assez_de_memes" }, { status: 503 });
  }
  return Response.json({ questions }, { headers: { "Cache-Control": "no-store" } });
}
