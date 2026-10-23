import { connection } from "next/server";

import { getDb } from "@/db";
import { lireStats } from "@/lib/stats";

// Alimente la version CSR de la page de statistiques (/stats/csr). Chiffres agrégés, sans donnée
// personnelle. Lu à chaque requête : sans cela Next préparerait la réponse au build, sans base.
export async function GET() {
  await connection();
  return Response.json(await lireStats(getDb()), { headers: { "Cache-Control": "no-store" } });
}
